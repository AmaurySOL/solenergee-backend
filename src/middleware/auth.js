/**
 * Middleware d'authentification par API key
 * À utiliser sur toutes les routes sauf le webhook email (Mailgun signe ses propres requêtes)
 */
const requireApiKey = (req, res, next) => {
  // En développement, on peut désactiver l'auth
  if (process.env.NODE_ENV === "development" && !process.env.API_SECRET_KEY) {
    return next();
  }

  const key =
    req.headers["x-api-key"] ||
    req.headers["authorization"]?.replace("Bearer ", "") ||
    req.query.api_key;

  if (!key || key !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ success: false, error: "Clé API invalide ou manquante" });
  }

  next();
};

module.exports = { requireApiKey };
