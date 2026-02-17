require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");

const projetsRouter = require("./routes/projets");
const emailRouter   = require("./routes/email");
const { requireApiKey } = require("./middleware/auth");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Sécurité ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim())
    : "*",
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","x-api-key"],
}));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Santé ─────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "solenergee-backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ── Webhook email Mailgun (pas d'auth API key — Mailgun signe ses requêtes)
app.use("/api/email", emailRouter);

// ── Routes protégées par API key ──────────────────────────────────────────────
app.use("/api/projets", requireApiKey, express.json({ limit: "5mb" }), projetsRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route non trouvée: ${req.method} ${req.path}` });
});

// ── Erreurs globales ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Erreur non gérée:", err);
  res.status(500).json({ success: false, error: "Erreur interne du serveur" });
});

// ── Démarrage ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌞 Solenergee Backend démarré`);
  console.log(`   Port    : ${PORT}`);
  console.log(`   Env     : ${process.env.NODE_ENV || "development"}`);
  console.log(`   DB      : ${process.env.DATABASE_URL ? "✅ connecté" : "⚠️  DATABASE_URL manquant"}`);
  console.log(`   Claude  : ${process.env.ANTHROPIC_API_KEY ? "✅ configuré" : "⚠️  ANTHROPIC_API_KEY manquant"}`);
  console.log(`   Auth    : ${process.env.API_SECRET_KEY ? "✅ activée" : "⚠️  désactivée"}\n`);
});

module.exports = app;
