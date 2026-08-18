/**
 * Point d'entrée du service VulnPipe.
 *
 *   npm run serve          # API seule
 *   npm run dev            # API + interface web
 *
 * Le fichier `.env` est chargé automatiquement (voir `src/config/env.ts`) :
 * aucune incantation `source .env` n'est nécessaire.
 *
 * Variables : PORT (défaut 4319), REDIS_URL (bascule sur BullMQ),
 *             VULNPIPE_LLM_PROVIDER / VULNPIPE_MASTER_PROVIDER.
 */

// Import à effet de bord, EN PREMIER : les imports ES sont hissés, donc un
// `loadEnv()` écrit ici s'exécuterait après l'évaluation des modules ci-dessous.
import { dotenv } from '../config/load-env.ts';

import { createQueue } from './queue.ts';
import { createVulnPipeServer } from './webhook.ts';
import { describeProviders } from '../nodes/shared/llm/factory.ts';
import type { ScanRequest } from './pipeline.ts';

const PORT = Number(process.env.PORT ?? 4319);

const queue = await createQueue<ScanRequest & { run_id: string; estimate_id?: string }>('vulnpipe-scan');
const app = createVulnPipeServer({ queue });

app.server.listen(PORT, () => {
  console.log(`VulnPipe — service d'analyse sur http://localhost:${PORT}`);
  console.log(`File : ${process.env.REDIS_URL ? 'BullMQ (Redis)' : 'en mémoire'}`);

  // On dit d'où viennent les clés : sans ça, un « clé absente » alors que la
  // clé est dans `.env` est indébogable.
  if (dotenv.files.length > 0) {
    console.log(
      `Config : ${dotenv.files.join(', ')} — ${dotenv.applied.length} variable(s) chargée(s)` +
        (dotenv.skipped.length > 0
          ? `, ${dotenv.skipped.length} déjà définie(s) par le shell (le shell gagne)`
          : '')
    );
  } else {
    console.log('Config : aucun fichier .env trouvé (copie .env.example en .env).');
  }

  console.log('\nFournisseurs :');
  for (const entry of describeProviders(process.env as never)) {
    console.log(`  ${entry.available ? '[ok]  ' : '[--]  '}${entry.id}${entry.why ? ` — ${entry.why}` : ''}`);
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
