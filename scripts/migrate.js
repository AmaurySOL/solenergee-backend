require("dotenv").config();
const { query, pool } = require("../src/db");

const migrate = async () => {
  console.log("🗄  Migration de la base de données...");

  await query(`
    CREATE TABLE IF NOT EXISTS projets (
      id            SERIAL PRIMARY KEY,
      tab           VARCHAR(10) NOT NULL DEFAULT 'Public' CHECK (tab IN ('Public', 'Privé')),
      ref           VARCHAR(50),
      statut        VARCHAR(30) NOT NULL DEFAULT '3. A étudier',
      dep           VARCHAR(3),
      client        TEXT NOT NULL DEFAULT '',
      date_limite   DATE,
      date_rendu    DATE,
      date_decision VARCHAR(50),
      montant       INTEGER DEFAULT 0,
      visite        TEXT,
      date_visite   VARCHAR(100),
      charge        VARCHAR(50),
      commentaire   TEXT,
      prix_note     VARCHAR(50),
      tech_note     VARCHAR(50),
      env_note      VARCHAR(50),
      source        VARCHAR(20) DEFAULT 'manual',
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("  ✅ Table projets créée");

  await query(`
    CREATE TABLE IF NOT EXISTS imports_email (
      id            SERIAL PRIMARY KEY,
      from_address  TEXT,
      subject       TEXT,
      body_text     TEXT,
      body_html     TEXT,
      projets_ids   INTEGER[],
      status        VARCHAR(20) DEFAULT 'processed',
      received_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("  ✅ Table imports_email créée");

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         VARCHAR(255) UNIQUE NOT NULL,
      name          VARCHAR(100),
      role          VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
      api_key       VARCHAR(64) UNIQUE,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("  ✅ Table users créée");

  // Index pour les performances
  await query(`CREATE INDEX IF NOT EXISTS idx_projets_tab ON projets(tab);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_projets_statut ON projets(statut);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_projets_date_limite ON projets(date_limite);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_projets_updated ON projets(updated_at DESC);`);
  console.log("  ✅ Index créés");

  // Trigger pour updated_at automatique
  await query(`
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ language 'plpgsql';
  `);
  await query(`
    DROP TRIGGER IF EXISTS set_updated_at ON projets;
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON projets
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
  `);
  console.log("  ✅ Triggers créés");

  console.log("\n🎉 Migration terminée avec succès !");
  await pool.end();
};

migrate().catch((err) => {
  console.error("❌ Erreur migration:", err);
  process.exit(1);
});
