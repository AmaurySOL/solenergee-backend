const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'analyse d'appels d'offres (AO) solaires/photovoltaïques pour une entreprise d'installation solaire française.

Analyse l'email fourni et extrais TOUS les appels d'offres pertinents (installations photovoltaïques, ombrières, centrales solaires).
Pour chaque AO, extrais ces informations :
- client : nom du maître d'ouvrage, de la commune ou du lieu du projet (obligatoire)
- dep : numéro de département sur 2 chiffres (ex: "44", "75", "01") - laisser vide si introuvable
- date_limite : date limite de remise des offres au format YYYY-MM-DD (laisser vide si introuvable)
- montant : estimation du montant HT en euros, entier (0 si non mentionné)
- visite : informations sur la visite de site (obligatoire, facultatif, date, etc.)
- commentaire : informations techniques utiles (puissance en kWc/MWc, type de toiture, nombre de panneaux, type de structure, etc.)
- ref : référence du marché si mentionnée (ex: "DCE-2025-123")

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans texte avant ou après :
{"projets":[{"client":"...","dep":"...","date_limite":"...","montant":0,"visite":"...","commentaire":"...","ref":""}]}

Si aucun AO solaire n'est trouvé dans l'email, réponds : {"projets":[]}`;

/**
 * Parse an email body and extract AO projects using Claude AI
 */
const parseEmailForProjects = async (emailContent) => {
  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: emailContent }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);

  if (!parsed.projets || !Array.isArray(parsed.projets)) {
    throw new Error("Format de réponse invalide de l'IA");
  }

  return parsed.projets.map((p) => ({
    client:       (p.client || "").trim(),
    dep:          (p.dep || "").replace(/^0/, "").trim(),
    date_limite:  p.date_limite || null,
    montant:      parseInt(p.montant) || 0,
    visite:       (p.visite || "").trim(),
    commentaire:  (p.commentaire || "").trim(),
    ref:          (p.ref || "").trim(),
  }));
};

module.exports = { parseEmailForProjects };
