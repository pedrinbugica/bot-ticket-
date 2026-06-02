import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import overviewRouter from "./routes/overview.js";
import ticketsRouter from "./routes/tickets.js";
import moderationRouter from "./routes/moderation.js";
import levelingRouter from "./routes/leveling.js";
import modulesRouter from "./routes/modules.js";
import contentRouter from "./routes/content.js";

const PORT = Number(process.env.DASHBOARD_PORT ?? 3000);
const ORIGIN = process.env.DASHBOARD_ORIGIN ?? "*";

export function startApiServer(client) {
  const app = express();

  app.use(cors({ origin: ORIGIN, credentials: true }));
  app.use(express.json());

  // Injeta o client do Discord nas requests (para consultas de guild)
  app.use((req, _res, next) => {
    req.discordClient = client;
    next();
  });

  // Rotas de autenticação
  app.use("/auth", authRouter);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      botTag: client?.user?.tag ?? "desconectado",
      guilds: client?.guilds?.cache?.size ?? 0,
      uptime: Math.floor(process.uptime()),
    });
  });

  // Rota de guilds acessíveis (para o seletor de servidor no painel)
  app.get("/api/guilds", (req, res) => {
    const userGuilds = req.headers.authorization ? (() => {
      try {
        const jwt = req.headers.authorization.slice(7);
        const { guilds } = JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString());
        return guilds ?? [];
      } catch { return []; }
    })() : [];

    const botGuilds = [...(client?.guilds?.cache?.values() ?? [])].map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.iconURL({ size: 64 }) ?? null,
      memberCount: g.memberCount,
    }));

    // Se usuário está logado, filtra pelas guilds que ele tem acesso
    const result = userGuilds.length
      ? botGuilds.filter((g) => userGuilds.includes(g.id))
      : botGuilds;

    res.json({ guilds: result });
  });

  // Rotas de dados (por servidor)
  app.use("/api/guilds", overviewRouter);
  app.use("/api/guilds", ticketsRouter);
  app.use("/api/guilds", moderationRouter);
  app.use("/api/guilds", levelingRouter);
  app.use("/api/guilds", modulesRouter);
  app.use("/api/guilds", contentRouter);

  // 404
  app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));

  app.listen(PORT, () => {
    console.log(`[API] Painel rodando na porta ${PORT} — http://localhost:${PORT}`);
  });

  return app;
}
