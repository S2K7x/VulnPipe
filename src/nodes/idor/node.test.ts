/**
 * Tests du node IDOR.
 *
 * ============================================================================
 * SCORES RÉELS RELEVÉS SUR UN VRAI MODÈLE — `npm run bench`
 *
 *   Fournisseur : gemini | Modèle : gemini-3.5-flash | few-shot : DÉSACTIVÉ
 *   temperature 0 (sorties vérifiées reproductibles sur deux appels)
 *
 *   CAS 1 — vulnérable évident   attendu >= 0.8        obtenu 1.0   reason null           ✅
 *   CAS 2 — sain                 attendu <= 0.3        obtenu 0.1   reason null           ✅  (0 appel LLM)
 *   CAS 3 — zone grise           attendu 0.4–0.7       obtenu 0.6   reason missing_context ✅
 *   CAS 4 — pas de surface       attendu <= 0.3        obtenu 0.05  reason null           ✅  (0 appel LLM)
 *
 *   4/4 dans la plage attendue au PREMIER essai, sans réglage de prompt : les
 *   deux exemples few-shot prévus comme filet de sécurité n'ont pas été
 *   nécessaires (ils restent activables via `includeFewShot`).
 *
 *   Coût mesuré : 2 appels LLM pour 4 routes — 1460 tokens entrée,
 *   804 sortie, 571 de raisonnement. Les 2 routes tranchées sans LLM sont
 *   l'effet du scanner déterministe (CLAUDE.md §2), absent des livrables de
 *   PHASE_3 : sans lui, ces 4 routes auraient coûté 4 appels au lieu de 2.
 *
 * POURQUOI CES TESTS N'APPELLENT PAS LE VRAI MODÈLE
 * Un `npm test` qui tape une API réseau est lent, coûteux, échoue sans clé, et
 * teste le modèle plutôt que le node. La calibration du modèle vit dans
 * `npm run bench` (ci-dessus) ; ici on teste la logique : scanner, retry,
 * garde-fous, mapping des erreurs.
 * ============================================================================
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildRepoIndex } from '../../mcp-server/repo-index.ts';
import { createServer } from '../../mcp-server/server.ts';
import { resolveContext } from '../../mcp-server/resolver.ts';
import { connectInProcess, McpAccessError, type ContextProvider } from '../shared/mcp-client.ts';
import { FakeLlmClient } from '../shared/llm/fake.ts';
import { LlmError } from '../shared/llm/types.ts';
import { createLlmClient } from '../shared/llm/factory.ts';
import { analyzeRouteForIdor, couldDeepenHelp } from './node.ts';
import { scanForIdor } from './scanner.ts';
import { buildIdorPrompt } from './prompt.ts';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE_REPO = join(here, '__fixtures__', 'repo');
const index = buildRepoIndex(FIXTURE_REPO);

/** Verdict LLM bien formé, surchargeable champ par champ. */
function verdict(overrides: Record<string, unknown> = {}) {
  return {
    analysis: {
      resource_identifier: 'id',
      user_context: 'aucun',
      step_by_step_reasoning: 'La requête ne croise pas id et userId.',
      },
    findings: [{ vulnerability: 'IDOR', line: 3, proof_snippet: 'findOne({ id })' }],
    confidence_score: 0.9,
    reason: 'none',
    plain_language_summary:
      "N'importe qui peut lire les commandes des autres en changeant le numéro dans l'adresse.",
    ...overrides,
  };
}

describe('Scanner déterministe (sans LLM)', () => {
  it('détecte une requête base sans filtre d appartenance', () => {
    const report = scanForIdor(resolveContext(index, { route: '/orders/:id', httpMethod: 'GET' }));
    expect(report.has_unscoped_data_access).toBe(true);
    expect(report.has_user_scoped_data_access).toBe(false);
    expect(report.resource_params).toEqual(['id']);
    expect(report.decisive_score).toBeNull(); // il laisse le LLM trancher
  });

  it('reconnaît une requête qui croise id et userId, et tranche sans LLM', () => {
    const report = scanForIdor(resolveContext(index, { route: '/invoices/:id', httpMethod: 'GET' }));
    expect(report.has_user_scoped_data_access).toBe(true);
    expect(report.has_unscoped_data_access).toBe(false);
    expect(report.decisive_score).toBe(0.1);
  });

  it('tranche une route sans identifiant de ressource sans LLM', () => {
    const report = scanForIdor(resolveContext(index, { route: '/health', httpMethod: 'GET' }));
    expect(report.has_no_attack_surface).toBe(true);
    expect(report.decisive_score).toBe(0.05);
  });

  it("ne conclut PAS quand un guard est déclaré mais introuvable", () => {
    const report = scanForIdor(resolveContext(index, { route: '/reports/:id', httpMethod: 'GET' }));
    expect(report.has_unresolved_guard).toBe(true);
    expect(report.decisive_score).toBeNull();
  });

  it("ne se laisse pas berner par un req.user.id utilisé seulement pour un log", () => {
    // Faux négatif classique : l'identité apparaît dans le handler, mais la
    // requête base ne filtre rien. Chercher le filtre dans tout le handler
    // ferait passer cette route vulnérable pour saine.
    const trap = buildRepoIndex(FIXTURE_REPO);
    const bundle = resolveContext(trap, { route: '/orders/:id', httpMethod: 'GET' });
    const piege = {
      ...bundle,
      endpoint: {
        ...bundle.endpoint,
        code_snapshot: `async getOrder(@Param('id') id: string, @Req() req: Request) {
          this.logger.log('acces par ' + req.user.id);
          return this.orderService.findById(id);
        }`,
      },
    };
    const report = scanForIdor(piege);
    expect(report.has_unscoped_data_access).toBe(true);
    expect(report.decisive_score).toBeNull();
  });
});

describe('Node IDOR — les 3 cas imposés par PHASE_3 (logique, LLM simulé)', () => {
  let provider: ContextProvider;

  beforeAll(async () => {
    provider = await connectInProcess(createServer(index));
  });
  afterAll(async () => {
    await provider.close();
  });

  it('CAS 1 — vulnérable évident : laisse passer un score >= 0.8', async () => {
    const llm = new FakeLlmClient([{ parsed: verdict({ confidence_score: 0.95 }) }]);
    const result = await analyzeRouteForIdor(
      { route: '/orders/:id', httpMethod: 'GET' },
      { contextProvider: provider, llm }
    );

    expect(result.confidence_score).toBe(0.95);
    expect(result.reason).toBeNull();
    expect(result.vulnerability).toBe('IDOR');
    expect(result.handler).toBe('getOrder');
    expect(llm.callCount).toBe(1);
  });

  it('CAS 2 — sain : tranché par le scanner, aucun appel LLM facturé', async () => {
    const llm = new FakeLlmClient([{ parsed: verdict({ confidence_score: 0.9 }) }]);
    const result = await analyzeRouteForIdor(
      { route: '/invoices/:id', httpMethod: 'GET' },
      { contextProvider: provider, llm }
    );

    expect(result.confidence_score).toBeLessThanOrEqual(0.3);
    expect(llm.callCount).toBe(0); // la promesse low-cost, vérifiée
    expect(result.technical_detail.llm).toBeNull();
  });

  it('CAS 3 — zone grise : guard déclaré mais code introuvable', async () => {
    const llm = new FakeLlmClient([
      { parsed: verdict({ confidence_score: 0.55, reason: 'missing_context' }) },
    ]);
    const result = await analyzeRouteForIdor(
      { route: '/reports/:id', httpMethod: 'GET' },
      { contextProvider: provider, llm }
    );

    expect(result.confidence_score).toBeGreaterThanOrEqual(0.4);
    expect(result.confidence_score).toBeLessThanOrEqual(0.7);
    expect(result.reason).toBe('missing_context');
    expect(result.technical_detail.scanner.has_unresolved_guard).toBe(true);
  });
});

describe('Prompt', () => {
  it("inclut le corps du guard — la section absente du template d'origine", () => {
    const guarded = resolveContext(buildRepoIndex(join(here, '..', '..', 'mcp-server', '__fixtures__', 'repo')), {
      route: '/orders/:id',
      httpMethod: 'GET',
    });
    const prompt = buildIdorPrompt(guarded);

    expect(prompt).toContain("[CONTRÔLE D'ACCÈS DÉCLARÉ]");
    // Sans cette ligne, le modèle ne peut pas distinguer protégé / non protégé.
    expect(prompt).toContain('order.userId === request.user.id');
  });

  it('signale explicitement une route sans aucun contrôle d accès', () => {
    const prompt = buildIdorPrompt(resolveContext(index, { route: '/orders/:id', httpMethod: 'GET' }));
    expect(prompt).toContain("Aucun contrôle d'accès déclaré");
  });

  it('conserve les sections imposées par la spec', () => {
    const prompt = buildIdorPrompt(resolveContext(index, { route: '/orders/:id', httpMethod: 'GET' }));
    for (const section of [
      '### CONTEXTE DU CODE À ANALYSER',
      '[ROUTE ET HANDLER]',
      '[CALL GRAPH RÉSOLU',
      "### DIRECTIVES D'ANALYSE (Chain-of-Thought obligatoire avant le score)",
      '### GRILLE DE CALIBRATION DU SCORE',
      '### FORMAT DE SORTIE — JSON STRICT, rien avant ni après',
    ]) {
      expect(prompt).toContain(section);
    }
  });

  it("n'inclut les exemples de calibration que sur demande", () => {
    const bundle = resolveContext(index, { route: '/orders/:id', httpMethod: 'GET' });
    expect(buildIdorPrompt(bundle)).not.toContain('EXEMPLES DE CALIBRATION');
    expect(buildIdorPrompt(bundle, { includeFewShot: true })).toContain('EXEMPLES DE CALIBRATION');
  });
});

describe('Retry sur missing_context', () => {
  let provider: ContextProvider;
  beforeAll(async () => {
    provider = await connectInProcess(createServer(index));
  });
  afterAll(async () => {
    await provider.close();
  });

  it('ne retente PAS quand un contexte plus profond ne peut rien apporter', async () => {
    // Le guard de /reports/:id est introuvable : descendre d'un niveau ne le
    // fera pas apparaître. La spec demande un retry systématique — ce serait
    // un appel LLM payé pour exactement le même contexte.
    const bundle = resolveContext(index, { route: '/reports/:id', httpMethod: 'GET', depth: 2 });
    expect(couldDeepenHelp(bundle)).toBe(false);

    const llm = new FakeLlmClient([
      { parsed: verdict({ confidence_score: 0.5, reason: 'missing_context' }) },
      { parsed: verdict({ confidence_score: 0.5, reason: 'missing_context' }) },
    ]);
    const result = await analyzeRouteForIdor(
      { route: '/reports/:id', httpMethod: 'GET' },
      { contextProvider: provider, llm }
    );

    expect(llm.callCount).toBe(1);
    expect(result.technical_detail.retried).toBe(false);
  });

  it('retente UNE fois avec un contexte plus profond quand cela peut aider', async () => {
    // Frontière non développée à depth=1 : un niveau de plus révèle du code neuf.
    const shallow = resolveContext(index, { route: '/orders/:id', httpMethod: 'GET', depth: 1 });
    expect(couldDeepenHelp(shallow)).toBe(true);

    const llm = new FakeLlmClient([
      { parsed: verdict({ confidence_score: 0.5, reason: 'missing_context' }) },
      { parsed: verdict({ confidence_score: 0.9, reason: 'none' }) },
    ]);
    const result = await analyzeRouteForIdor(
      { route: '/orders/:id', httpMethod: 'GET' },
      { contextProvider: provider, llm, initialDepth: 1 }
    );

    expect(llm.callCount).toBe(2);
    expect(result.technical_detail.retried).toBe(true);
    expect(result.technical_detail.depth_used).toBe(2);
    expect(result.confidence_score).toBe(0.9);
  });

  it('ne boucle jamais : un seul retry même si le doute persiste', async () => {
    const llm = new FakeLlmClient([
      { parsed: verdict({ confidence_score: 0.5, reason: 'missing_context' }) },
      { parsed: verdict({ confidence_score: 0.5, reason: 'missing_context' }) },
      { parsed: verdict({ confidence_score: 0.5, reason: 'missing_context' }) },
    ]);
    await analyzeRouteForIdor(
      { route: '/orders/:id', httpMethod: 'GET' },
      { contextProvider: provider, llm, initialDepth: 1 }
    );
    expect(llm.callCount).toBe(2);
  });

  it('ne retente pas sur ambiguous_logic : le contexte est déjà complet', async () => {
    const llm = new FakeLlmClient([
      { parsed: verdict({ confidence_score: 0.6, reason: 'ambiguous_logic' }) },
    ]);
    const result = await analyzeRouteForIdor(
      { route: '/orders/:id', httpMethod: 'GET' },
      { contextProvider: provider, llm, initialDepth: 1 }
    );
    expect(llm.callCount).toBe(1);
    expect(result.reason).toBe('ambiguous_logic');
  });
});

describe('Garde-fous déterministes appliqués après le LLM', () => {
  let provider: ContextProvider;
  beforeAll(async () => {
    provider = await connectInProcess(createServer(index));
  });
  afterAll(async () => {
    await provider.close();
  });

  const run = async (parsed: unknown) =>
    analyzeRouteForIdor(
      { route: '/orders/:id', httpMethod: 'GET' },
      { contextProvider: provider, llm: new FakeLlmClient([{ parsed }]) }
    );

  it('corrige un score hors plage (100 au lieu de 1.0)', async () => {
    // Observé en conditions réelles sur un modèle local en mode json simple.
    const result = await run(verdict({ confidence_score: 100 }));
    expect(result.confidence_score).toBe(1);
    expect(result.technical_detail.adjustments.join(' ')).toContain('hors plage');
  });

  it('résout la contradiction score haut + reason missing_context', async () => {
    // Mesuré sur gemini-3.5-flash : score 0.9 avec reason "missing_context".
    // Le doute doit primer sur la certitude, sinon l'Agrégateur (Phase 4)
    // enverrait en alerte directe un cas qui mérite un arbitrage.
    const result = await run(verdict({ confidence_score: 0.9, reason: 'missing_context' }));
    expect(result.confidence_score).toBe(0.7);
    expect(result.reason).toBe('missing_context');
    expect(result.technical_detail.adjustments.join(' ')).toContain('incompatible');
  });

  it("remonte en zone grise un score « sain » accompagné d'un doute", async () => {
    const result = await run(verdict({ confidence_score: 0.2, reason: 'ambiguous_logic' }));
    expect(result.confidence_score).toBe(0.4);
    expect(result.reason).toBe('ambiguous_logic');
  });

  it('déduit la nature du doute quand le score est en zone grise sans reason', async () => {
    const result = await run(verdict({ confidence_score: 0.6, reason: 'none' }));
    expect(result.reason).not.toBeNull();
    expect(result.technical_detail.adjustments.join(' ')).toContain('déduit');
  });

  it('trace chaque correction plutôt que de la faire en silence', async () => {
    const result = await run(verdict({ confidence_score: 100 }));
    expect(result.technical_detail.adjustments.length).toBeGreaterThan(0);
  });
});

describe('Explicabilité (CLAUDE.md §4, non négociable)', () => {
  let provider: ContextProvider;
  beforeAll(async () => {
    provider = await connectInProcess(createServer(index));
  });
  afterAll(async () => {
    await provider.close();
  });

  it('produit un plain_language_summary lisible, sans jargon SAST', async () => {
    const result = await analyzeRouteForIdor(
      { route: '/orders/:id', httpMethod: 'GET' },
      { contextProvider: provider, llm: new FakeLlmClient([{ parsed: verdict() }]) }
    );

    expect(result.plain_language_summary.length).toBeGreaterThan(40);
    for (const jargon of ['taint', 'sink', 'sanitization', 'AST', 'JSON', 'confidence_score']) {
      expect(result.plain_language_summary.toLowerCase()).not.toContain(jargon.toLowerCase());
    }
  });

  it('accompagne aussi les verdicts rendus sans LLM', async () => {
    const result = await analyzeRouteForIdor(
      { route: '/health', httpMethod: 'GET' },
      { contextProvider: provider, llm: new FakeLlmClient([{ parsed: verdict() }]) }
    );
    expect(result.plain_language_summary).toContain('/health');
    expect(result.technical_detail.llm).toBeNull();
  });

  it('produit un JSON sérialisable au format attendu par l Agrégateur', async () => {
    const result = await analyzeRouteForIdor(
      { route: '/orders/:id', httpMethod: 'GET' },
      { contextProvider: provider, llm: new FakeLlmClient([{ parsed: verdict() }]) }
    );
    const roundTripped = JSON.parse(JSON.stringify(result));
    expect(roundTripped).toEqual(
      expect.objectContaining({
        vulnerability: 'IDOR',
        confidence_score: expect.any(Number),
        plain_language_summary: expect.any(String),
        technical_detail: expect.any(Object),
      })
    );
    expect(roundTripped).toHaveProperty('reason');
  });
});

describe('Robustesse : une panne n est jamais un verdict', () => {
  let provider: ContextProvider;
  beforeAll(async () => {
    provider = await connectInProcess(createServer(index));
  });
  afterAll(async () => {
    await provider.close();
  });

  it('propage une panne LLM au lieu de conclure « sain »', async () => {
    const llm = new FakeLlmClient([
      { error: new LlmError('ollama', 'unavailable', 'Serveur Ollama injoignable', true) },
    ]);
    await expect(
      analyzeRouteForIdor({ route: '/orders/:id', httpMethod: 'GET' }, { contextProvider: provider, llm })
    ).rejects.toThrow(LlmError);
  });

  it('remonte une erreur MCP lisible sur une route inconnue', async () => {
    const llm = new FakeLlmClient([{ parsed: verdict() }]);
    await expect(
      analyzeRouteForIdor({ route: '/inexistante', httpMethod: 'GET' }, { contextProvider: provider, llm })
    ).rejects.toThrow(McpAccessError);
    expect(llm.callCount).toBe(0);
  });
});

describe('Couche LLM enfichable', () => {
  it('sélectionne le fournisseur par variable d environnement', () => {
    expect(createLlmClient({ VULNPIPE_LLM_PROVIDER: 'gemini', GEMINI_API_KEY: 'x' }).provider).toBe('gemini');
    expect(createLlmClient({ VULNPIPE_LLM_PROVIDER: 'ollama' }).provider).toBe('ollama');
    expect(createLlmClient({ VULNPIPE_LLM_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'x' }).provider).toBe(
      'anthropic'
    );
    expect(createLlmClient({ VULNPIPE_LLM_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'x' }).provider).toBe(
      'openrouter'
    );
  });

  it('utilise Gemini par défaut', () => {
    expect(createLlmClient({ GEMINI_API_KEY: 'x' }).provider).toBe('gemini');
  });

  it('permet de surcharger le modèle sans toucher au code de détection', () => {
    expect(
      createLlmClient({ VULNPIPE_LLM_PROVIDER: 'gemini', GEMINI_API_KEY: 'x', VULNPIPE_LLM_MODEL: 'gemini-2.5-pro' })
        .model
    ).toBe('gemini-2.5-pro');
  });

  it('refuse clairement un fournisseur inconnu ou une clé absente', () => {
    expect(() => createLlmClient({ VULNPIPE_LLM_PROVIDER: 'chatgpt-maison' })).toThrow(/inconnu/);
    expect(() => createLlmClient({ VULNPIPE_LLM_PROVIDER: 'gemini', GEMINI_API_KEY: undefined })).toThrow(
      /GEMINI_API_KEY/
    );
  });
});
