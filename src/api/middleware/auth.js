import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  // Sem JWT_SECRET configurado → modo dev, passa sem auth
  if (!JWT_SECRET) return next();

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação ausente." });
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }

  // Verifica se o usuário tem acesso ao servidor solicitado
  const guildId = req.params.guildId;
  if (guildId && req.user.guilds && !req.user.guilds.includes(guildId)) {
    return res.status(403).json({ error: "Sem permissão neste servidor." });
  }

  next();
}
