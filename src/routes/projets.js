const express = require("express");
const { body, query: vQuery, validationResult } = require("express-validator");
const db = require("../db");

const router = express.Router();

const VALID_STATUTS = [
  "1. Envoyés","1. Répondu","2. Montage","3. A étudier",
  "4. Perdu","5. No rep","6. StandBy",
];

// ── GET /api/projets ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { tab, statut, dep, charge, search, sort = "date_limite", order = "asc" } = req.query;

    const conditions = [];
    const params = [];

    if (tab) {
      params.push(tab);
      conditions.push(`tab = $${params.length}`);
    }
    if (statut) {
      params.push(statut);
      conditions.push(`statut = $${params.length}`);
    }
    if (dep) {
      params.push(dep);
      conditions.push(`dep = $${params.length}`);
    }
    if (charge) {
      params.push(charge);
      conditions.push(`charge = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(client ILIKE $${params.length} OR ref ILIKE $${params.length} OR commentaire ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const allowedSort = ["date_limite","date_rendu","montant","client","statut","created_at","updated_at"];
    const sortCol = allowedSort.includes(sort) ? sort : "date_limite";
    const sortOrder = order === "desc" ? "DESC" : "ASC";

    const { rows } = await db.query(
      `SELECT * FROM projets ${where}
       ORDER BY
         CASE WHEN ${sortCol === "date_limite" ? "date_limite" : "'x'"} IS NULL THEN 1 ELSE 0 END,
         ${sortCol} ${sortOrder} NULLS LAST,
         id ASC`,
      params
    );

    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    console.error("GET /projets:", err);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

// ── GET /api/projets/stats ────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const { tab } = req.query;
    const filter = tab ? "WHERE tab = $1" : "";
    const params = tab ? [tab] : [];

    const { rows } = await db.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE statut IN ('1. Envoyés','1. Répondu')) AS en_cours,
        COUNT(*) FILTER (WHERE statut = '3. A étudier') AS a_etudier,
        COUNT(*) FILTER (WHERE statut = '4. Perdu') AS perdus,
        COUNT(*) FILTER (WHERE statut = '5. No rep') AS no_rep,
        COUNT(*) FILTER (WHERE statut = '6. StandBy') AS standby,
        COALESCE(SUM(montant) FILTER (WHERE statut IN ('1. Envoyés','1. Répondu')), 0) AS ca_en_cours,
        COUNT(*) FILTER (
          WHERE date_limite IS NOT NULL
          AND date_limite >= CURRENT_DATE
          AND date_limite <= CURRENT_DATE + INTERVAL '14 days'
          AND statut NOT IN ('4. Perdu', '5. No rep')
        ) AS alertes_14j,
        COUNT(*) FILTER (
          WHERE date_limite IS NOT NULL
          AND date_limite >= CURRENT_DATE
          AND date_limite <= CURRENT_DATE + INTERVAL '3 days'
          AND statut NOT IN ('4. Perdu', '5. No rep')
        ) AS alertes_urgentes
      FROM projets ${filter}`,
      params
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("GET /projets/stats:", err);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

// ── GET /api/projets/alertes ──────────────────────────────────────────────────
router.get("/alertes", async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, tab, ref, client, statut, date_limite, dep, charge,
             CURRENT_DATE - date_limite AS days_overdue,
             date_limite - CURRENT_DATE AS days_remaining
      FROM projets
      WHERE date_limite IS NOT NULL
        AND date_limite >= CURRENT_DATE
        AND date_limite <= CURRENT_DATE + INTERVAL '14 days'
        AND statut NOT IN ('4. Perdu', '5. No rep')
      ORDER BY date_limite ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

// ── POST /api/projets ─────────────────────────────────────────────────────────
const projectValidation = [
  body("tab").isIn(["Public","Privé"]).withMessage("Tab invalide"),
  body("client").notEmpty().withMessage("Client requis"),
  body("statut").isIn(VALID_STATUTS).withMessage("Statut invalide"),
  body("montant").optional().isInt({ min: 0 }).withMessage("Montant invalide"),
];

router.post("/", projectValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { tab, ref, statut, dep, client, date_limite, date_rendu, date_decision,
            montant, visite, date_visite, charge, commentaire,
            prix_note, tech_note, env_note, source } = req.body;

    const { rows } = await db.query(`
      INSERT INTO projets (tab, ref, statut, dep, client, date_limite, date_rendu, date_decision,
        montant, visite, date_visite, charge, commentaire, prix_note, tech_note, env_note, source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *
    `, [tab, ref||null, statut, dep||null, client, date_limite||null, date_rendu||null,
        date_decision||null, parseInt(montant)||0, visite||null, date_visite||null,
        charge||null, commentaire||null, prix_note||null, tech_note||null, env_note||null,
        source||"manual"]);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("POST /projets:", err);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

// ── POST /api/projets/batch ───────────────────────────────────────────────────
// Import multiple projects at once (used by email parser)
router.post("/batch", async (req, res) => {
  const { tab, projets, import_id } = req.body;
  if (!Array.isArray(projets) || projets.length === 0) {
    return res.status(400).json({ success: false, error: "Liste de projets vide" });
  }

  const client_db = await db.getClient();
  try {
    await client_db.query("BEGIN");
    const inserted = [];

    for (const p of projets) {
      const { rows } = await client_db.query(`
        INSERT INTO projets (tab, ref, statut, dep, client, date_limite, montant,
          visite, commentaire, source)
        VALUES ($1,$2,'3. A étudier',$3,$4,$5,$6,$7,$8,'email')
        RETURNING *
      `, [tab||"Public", p.ref||null, p.dep||null, p.client,
          p.date_limite||null, parseInt(p.montant)||0,
          p.visite||null, p.commentaire||null]);
      inserted.push(rows[0]);
    }

    // Update import record with project IDs
    if (import_id) {
      await client_db.query(
        "UPDATE imports_email SET projets_ids = $1 WHERE id = $2",
        [inserted.map(p => p.id), import_id]
      );
    }

    await client_db.query("COMMIT");
    res.status(201).json({ success: true, data: inserted, count: inserted.length });
  } catch (err) {
    await client_db.query("ROLLBACK");
    console.error("POST /projets/batch:", err);
    res.status(500).json({ success: false, error: "Erreur lors de l'import" });
  } finally {
    client_db.release();
  }
});

// ── PUT /api/projets/:id ──────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { ref, statut, dep, client, date_limite, date_rendu, date_decision,
            montant, visite, date_visite, charge, commentaire,
            prix_note, tech_note, env_note } = req.body;

    const { rows } = await db.query(`
      UPDATE projets SET
        ref=$1, statut=$2, dep=$3, client=$4, date_limite=$5, date_rendu=$6,
        date_decision=$7, montant=$8, visite=$9, date_visite=$10, charge=$11,
        commentaire=$12, prix_note=$13, tech_note=$14, env_note=$15
      WHERE id=$16 RETURNING *
    `, [ref||null, statut, dep||null, client, date_limite||null, date_rendu||null,
        date_decision||null, parseInt(montant)||0, visite||null, date_visite||null,
        charge||null, commentaire||null, prix_note||null, tech_note||null, env_note||null, id]);

    if (rows.length === 0) return res.status(404).json({ success: false, error: "Projet non trouvé" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("PUT /projets/:id:", err);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

// ── DELETE /api/projets/:id ───────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { rows } = await db.query("DELETE FROM projets WHERE id=$1 RETURNING id", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Projet non trouvé" });
    res.json({ success: true, id: rows[0].id });
  } catch (err) {
    console.error("DELETE /projets/:id:", err);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

module.exports = router;
