/**
 * Point d'entrée du service VulnPipe.
 *
 *   set -a; source .env; set +a
 *   npm run serve          # API seule
 *   npm run dev            # API + interface web
 *
 * Variables : PORT (défaut 4319), REDIS_URL (bascule sur BullMQ),
 *             VULNPIPE_LLM_PROVIDER / VULNPIPE_MASTER_PROVIDER.
 */

import { createQueue } from './queue.ts';
import { createVulnPipeServer } from './webhook.ts';
import { describeProviders } from '../nodes/shared/llm/factory.ts';
import type { ScanRequest } from './pipeline.ts';

// OpenRouter : les deux noms de variable sont acceptés.
process.env.OPENROUTER_API_KEY ??= process.env.OPEN_ROUTER_API_KEY;

const PORT = Number(process.env.PORT ?? 4319);

const queue = await createQueue<ScanRequest & { run_id: string }>('vulnpipe-scan');
const app = createVulnPipeServer({ queue });

app.server.listen(PORT, () => {
  console.log(`VulnPipe — service d'analyse sur http://localhost:${PORT}`);
  console.log(`File : ${process.env.REDIS_URL ? 'BullMQ (Redis)' : 'en mémoire'}`);
  console.log('\nFournisseurs :');
  for (const entry of describeProviders(process.env as never)) {
    console.log(`  ${entry.available ? '✅' : '❌'} ${entry.id}${entry.why ? ` — ${entry.why}` : ''}`);
  }
  console.log(
    `\nDétecteurs : ${app.settings.nodeProvider} | Arbitre : ${app.settings.masterProvider}`
  );
  console.log("Interface web : npm run web  (puis http://localhost:5173)\n");
});

const shutdown = async (): Promise<void> => {
  console.log('\nArrêt du service...');
  await queue.close();
  app.server.close(() => process.exit(0));
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
