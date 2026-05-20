import { getExpiredPolls } from "../db/polls.js";
import { finishPoll } from "../polls/polls.js";

export function startPollsJob(client) {
  const run = async () => {
    const expired = getExpiredPolls();
    for (const poll of expired) {
      await finishPoll(poll, client).catch((err) =>
        console.error(`Erro ao encerrar enquete #${poll.id}:`, err)
      );
    }
  };

  run().catch(console.error);
  setInterval(() => run().catch(console.error), 30_000);
  console.log("Job de enquetes ativo (verifica a cada 30s)");
}
