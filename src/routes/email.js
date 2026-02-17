const express = require("express");
const crypto = require("crypto");
const { simpleParser } = require("mailparser");
const db = require("../db");
const { parseEmailForProjects } = require("../services/claude");

const router = express.Router();

// ── Vérifie la signature Mailgun ──────────────────────────────────────────────
const verifyMailgunSignature = (timestamp, token, signature) => {
  if (!process.env.MAILGUN_SIGNING_KEY) return true; // Skip en dev
  const value = timestamp + token;
  const hash = crypto
    .createHmac("sha256", process.env.MAILGUN_SIGNING_KEY)
    .update(value)
    .digest("hex");
  return hash === signature;
};

// ── POST /api/email/inbound  (Webhook Mailgun) ────────────────────────────────
router.post("/inbound", express.urlencoded({ extended: true }), async (req, res) => {
  try {
    // Vérification signature Mailgun
    const { timestamp, token, signature } = req.body;
    if (!verifyMailgunSignature(timestamp, token, signature)) {
      console.warn("⚠️  Signature Mailgun invalide");
      return res.status(403).json({ error: "Signature invalide" });
    }

    const fromAddress = req.body.from || req.body.sender || "";
    const subject     = req.body.subject || "";
    const bodyText    = req.body["body-plain"] || req.body.text || "";
    const bodyHtml    = req.body["body-html"] || req.body.html || "";

    console.log(`📧 Email reçu de: ${fromAddress} — Sujet: ${subject}`);

    // Combine sujet + corps pour le contexte complet
    const emailContent = `Objet: ${subject}\n\nDe: ${fromAddress}\n\n${bodyText || bodyHtml.replace(/<[^>]+>/g, " ")}`;

    // Enregistre l'email en base
    const { rows: emailRows } = await db.query(
      `INSERT INTO imports_email (from_address, subject, body_text, body_html, status)
       VALUES ($1, $2, $3, $4, 'processing') RETURNING id`,
      [fromAddress, subject, bodyText, bodyHtml]
    );
    const importId = emailRows[0].id;

    // Analyse par Claude
    let projets = [];
    try {
      projets = await parseEmailForProjects(emailContent);
      console.log(`  🤖 ${projets.length} AO détectés`);
    } catch (aiErr) {
      console.error("  ❌ Erreur analyse Claude:", aiErr);
      await db.query("UPDATE imports_email SET status='error' WHERE id=$1", [importId]);
      return res.status(200).json({ success: false, error: "Erreur analyse IA", importId });
    }

    if (projets.length === 0) {
      await db.query("UPDATE imports_email SET status='no_projects' WHERE id=$1", [importId]);
      return res.json({ success: true, message: "Aucun AO détecté", importId });
    }

    // Insertion en base en transaction
    const dbClient = await db.getClient();
    const insertedIds = [];
    try {
      await dbClient.query("BEGIN");
      for (const p of projets) {
        const { rows } = await dbClient.query(`
          INSERT INTO projets (tab, ref, statut, dep, client, date_limite, montant,
            visite, commentaire, source)
          VALUES ('Public', $1, '3. A étudier', $2, $3, $4, $5, $6, $7, 'email')
          RETURNING id
        `, [p.ref||null, p.dep||null, p.client, p.date_limite||null,
            p.montant||0, p.visite||null, p.commentaire||null]);
        insertedIds.push(rows[0].id);
      }
      await dbClient.query(
        "UPDATE imports_email SET status='processed', projets_ids=$1 WHERE id=$2",
        [insertedIds, importId]
      );
      await dbClient.query("COMMIT");
    } catch (dbErr) {
      await dbClient.query("ROLLBACK");
      throw dbErr;
    } finally {
      dbClient.release();
    }

    console.log(`  ✅ ${insertedIds.length} projets ajoutés (IDs: ${insertedIds.join(", ")})`);
    res.json({ success: true, projets_ajoutes: insertedIds.length, import_id: importId });

  } catch (err) {
    console.error("POST /email/inbound:", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/email/parse  (Appel depuis le frontend — colle-email) ───────────
router.post("/parse", express.json(), async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length < 10) {
      return res.status(400).json({ success: false, error: "Contenu trop court" });
    }

    const projets = await parseEmailForProjects(content);
    res.json({ success: true, projets });
  } catch (err) {
    console.error("POST /email/parse:", err);
    res.status(500).json({ success: false, error: "Erreur lors de l'analyse" });
  }
});

// ── GET /api/email/imports ────────────────────────────────────────────────────
router.get("/imports", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, from_address, subject, status, array_length(projets_ids,1) AS nb_projets, received_at FROM imports_email ORDER BY received_at DESC LIMIT 50"
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

module.exports = router;
