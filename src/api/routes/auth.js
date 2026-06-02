import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "http://localhost:3000";
const DASHBOARD_ORIGIN = process.env.DASHBOARD_ORIGIN ?? "http://localhost:5500";

const REDIRECT_URI = `${DASHBOARD_URL}/auth/callback`;
const OAUTH_SCOPES = "identify guilds";

// GET /auth/login → redireciona para o Discord
router.get("/login", (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET || !JWT_SECRET) {
    return res.status(503).json({
      error: "OAuth2 não configurado. Adicione DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET e JWT_SECRET ao .env",
    });
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: OAUTH_SCOPES,
    state: req.query.redirect ?? "/",
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

// GET /auth/callback → troca o code por token e redireciona ao painel
router.get("/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code) return res.status(400).json({ error: "Código OAuth2 ausente." });
  if (!CLIENT_ID || !CLIENT_SECRET || !JWT_SECRET) {
    return res.status(503).json({ error: "OAuth2 não configurado." });
  }

  try {
    // Troca o code pelo access_token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error ?? "Falha ao obter token");

    const accessToken = tokenData.access_token;

    // Busca dados do usuário
    const [userRes, guildsRes] = await Promise.all([
      fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    const user = await userRes.json();
    const allGuilds = await guildsRes.json();

    // Só guilds onde o usuário é admin (ADMINISTRATOR = bit 3)
    const adminGuilds = allGuilds
      .filter((g) => (BigInt(g.permissions) & BigInt(0x8)) === BigInt(0x8))
      .map((g) => g.id);

    // Gera JWT com 30 dias de validade
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        guilds: adminGuilds,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Redireciona ao painel com o token na URL
    const redirectTo = state ?? "/";
    res.redirect(`${DASHBOARD_ORIGIN}/callback.html?token=${token}&redirect=${encodeURIComponent(redirectTo)}`);
  } catch (err) {
    console.error("[auth] Erro no callback OAuth2:", err);
    res.status(500).json({ error: "Falha na autenticação. Tente novamente." });
  }
});

// GET /auth/me → retorna dados do usuário logado (para o frontend verificar)
router.get("/me", (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Não autenticado." });

  const token = header.slice(7);
  try {
    const user = jwt.verify(token, JWT_SECRET ?? "dev");
    res.json({ userId: user.userId, username: user.username, avatar: user.avatar, guilds: user.guilds });
  } catch {
    res.status(401).json({ error: "Token inválido." });
  }
});

// POST /auth/logout → sem-op (token é descartado pelo cliente)
router.post("/logout", (_req, res) => res.json({ ok: true }));

export default router;
