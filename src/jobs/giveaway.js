import { getExpiredGiveaways } from "../db/giveaway.js";
import { finishGiveaway } from "../giveaway/giveaway.js";

export function startGiveawayJob(client) {
  const run = async () => {
    const expired = getExpiredGiveaways();
    for (const giveaway of expired) {
      await finishGiveaway(giveaway, client).catch((err) =>
        console.error(`Erro ao encerrar sorteio #${giveaway.id}:`, err)
      );
    }
  };

  run().catch(console.error);
  setInterval(() => run().catch(console.error), 30_000);
  console.log("Job de sorteios ativo (verifica a cada 30s)");
}
