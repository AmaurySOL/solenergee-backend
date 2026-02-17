#!/bin/bash
set -e

echo "🗄️  Migration de la base de données..."
node scripts/migrate.js

echo "🌱 Import des données..."
node scripts/seed.js

echo "🚀 Démarrage du serveur..."
node src/index.js
