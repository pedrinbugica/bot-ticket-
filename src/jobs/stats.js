import { updateAllStatsChannels } from "../stats/stats.js";

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutos (limite do Discord: ~2 renames por canal por 10min)

export function startStatsJob(client) {
  async function run() {
    await updateAllStatsChannels(client).catch((err) =>
      console.error("Erro no job de stats:", err)
    );
  }

  run();
  setInterval(run, INTERVAL_MS);
  console.log("Job de canais de estatísticas ativo (intervalo: 10min)");
}
