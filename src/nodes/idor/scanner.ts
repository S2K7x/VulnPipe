/**
 * Scanner déterministe IDOR — pas de LLM.
 *
 * POURQUOI CE FICHIER EXISTE ALORS QUE PHASE_3 NE LE LISTE PAS
 *
 * `CLAUDE.md` §2 décrit chaque node comme « scanner déterministe
 * (pattern/Semgrep) + LLM local (verdict + confidence_score) ». Les livrables
 * de PHASE_3 ne listent que `prompt.ts` et `node.ts` : le scanner déterministe
 * a disparu entre l'architecture et le prompt de phase.
 *
 * Ce n'est pas cosmétique. Sans lui, CHAQUE route déclenche un appel LLM,
 * y compris les routes trivialement saines — ce qui contredit frontalement la
 * promesse n°1 (low-cost). Le scanner fait deux choses :
 *
 *  1. Il coupe court quand le verdict est déterministe (aucun identifiant de
 *     ressource dans la route => pas de surface IDOR). Aucun token dépensé.
 *  2. Il fournit au LLM des faits déjà établis (lignes des requêtes base,
 *     présence d'un filtre utilisateur) plutôt que de lui demander de les
 *     redécouvrir — et sert de garde-fou pour vérifier ses affirmations.
 */

import type { ContextBundle, ResolvedCall } from '../../mcp-server/resolver.ts';

/** Segments de route qui désignent une ressource adressable : /orders/:id */
const RESOURCE_PARAM = /:([A-Za-z_][A-Za-z0-9_]*)/g;

/** Noms de champs qui portent une identité utilisateur dans une requête. */
const USER_SCOPE_FIELDS = [
  'userid',
  'user_id',
  'ownerid',
  'owner_id',
  'accountid',
  'account_id',
  'tenantid',
  'tenant_id',
  'organizationid',
  'organization_id',
  'customerid',
  'customer_id',
];

/** Méthodes de persistance : le point où une lecture non filtrée devient une fuite. */
const DATA_ACCESS_METHODS = [
  'find',
  'findone',
  'findbyid',
  'findfirst',
  'findunique',
  'findall',
  'get',
  'getbyid',
  'query',
  'select',
  'fetch',
  'load',
  'update',
  'delete',
  'remove',
  'destroy',
  'save',
];

export interface ScannerFinding {
  kind: 'unscoped_data_access' | 'scoped_data_access' | 'no_resource_identifier';
  detail: string;
  line: number | null;
  file: string | null;
}

export interface ScannerReport {
  /** Paramètres de route désignant une ressource (`:id`, `:orderId`...). */
  resource_params: string[];
  /** true si la route ne cible aucune ressource identifiée : pas de surface IDOR. */
  has_no_attack_surface: boolean;
  /** true si un guard est déclaré ET son code résolu. */
  has_resolved_guard: boolean;
  /** true si un guard est déclaré mais son code introuvable. */
  has_unresolved_guard: boolean;
  /** true si au moins une requête base ne porte aucun champ d'identité. */
  has_unscoped_data_access: boolean;
  /** true si au moins une requête base croise explicitement l'utilisateur. */
  has_user_scoped_data_access: boolean;
  findings: ScannerFinding[];
  /**
   * Verdict déterministe quand il ne fait aucun doute, sinon null.
   * `null` = il faut demander son avis au LLM.
   */
  decisive_score: number | null;
  plain_language_summary: string;
}

interface DataAccessSite {
  call: ResolvedCall;
  file: string | null;
  /**
   * Corps de la MÉTHODE QUI CONTIENT cet appel — pas le handler entier.
   *
   * La nuance est un garde-fou anti-faux-négatif. En cherchant le filtre
   * utilisateur dans tout le handler, un `req.user.id` présent pour une simple
   * ligne de log suffirait à faire passer une route vulnérable pour saine.
   * Le filtre doit être là où la requête est écrite : `findOne({ id, userId })`
   * est protégé, `logger.log(req.user.id)` suivi de `findOne({ id })` ne l'est pas.
   */
  enclosingCode: string;
}

/** Parcourt l'arbre en gardant le corps englobant de chaque appel. */
function collectDataAccessSites(calls: ResolvedCall[], enclosingCode: string): DataAccessSite[] {
  const sites: DataAccessSite[] = [];
  for (const call of calls) {
    sites.push({
      call,
      file: call.candidates[0]?.file ?? null,
      enclosingCode,
    });
    // Les appels sortants d'une méthode résolue sont englobés par SON corps.
    for (const candidate of call.candidates) {
      sites.push(...collectDataAccessSites(call.resolved_calls, candidate.code_snapshot));
    }
    if (call.candidates.length === 0 && call.resolved_calls.length > 0) {
      sites.push(...collectDataAccessSites(call.resolved_calls, enclosingCode));
    }
  }
  return sites;
}

/**
 * Retire les commentaires avant toute analyse.
 *
 * Attrapé par un test : la fixture vulnérable portait le commentaire
 * `// aucun filtre userId -> IDOR`. Le mot « userId » y apparaissait, donc la
 * requête était classée « filtrée » — le commentaire qui DÉCRIT la faille la
 * masquait. Un `// TODO: ajouter le userId` dans du vrai code produirait
 * exactement le même faux négatif, et c'est une tournure très courante.
 */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** Normalise agressivement : `userId`, `user_id`, `req.user.id` doivent matcher. */
function mentionsUserScope(code: string): boolean {
  const normalized = stripComments(code).toLowerCase().replace(/[^a-z0-9]/g, '');
  return USER_SCOPE_FIELDS.some((field) => normalized.includes(field.replace(/_/g, '')));
}

function isDataAccess(methodName: string): boolean {
  return DATA_ACCESS_METHODS.includes(methodName.toLowerCase());
}

/** Analyse déterministe d'un bundle de contexte. Ne fait aucun appel réseau. */
export function scanForIdor(bundle: ContextBundle): ScannerReport {
  const endpoint = bundle.endpoint;

  const resourceParams = [...endpoint.route.matchAll(RESOURCE_PARAM)].map((m) => m[1]!);
  const findings: ScannerFinding[] = [];

  const guards = bundle.resolved_guards;
  const hasResolvedGuard = guards.some((g) => g.resolution_status === 'resolved');
  const hasUnresolvedGuard = guards.some((g) => g.resolution_status !== 'resolved');

  // Toutes les requêtes de persistance atteignables depuis ce handler.
  const sites = collectDataAccessSites(bundle.resolved_calls, endpoint.code_snapshot);
  let unscoped = false;
  let scoped = false;

  for (const entry of sites) {
    if (!isDataAccess(entry.call.call)) continue;

    // Le filtre se juge sur le corps qui ÉCRIT la requête, pas sur le handler
    // entier — sinon un `req.user.id` de log masquerait la vulnérabilité.
    const surroundings = entry.enclosingCode;
    if (mentionsUserScope(surroundings)) {
      scoped = true;
      findings.push({
        kind: 'scoped_data_access',
        detail: `L'appel "${entry.call.call}" croise un identifiant d'utilisateur.`,
        line: entry.call.line,
        file: entry.file,
      });
    } else {
      unscoped = true;
      findings.push({
        kind: 'unscoped_data_access',
        detail: `L'appel "${entry.call.call}" lit ou modifie des données sans aucun filtre d'appartenance à l'utilisateur.`,
        line: entry.call.line,
        file: entry.file,
      });
    }
  }

  const hasNoAttackSurface = resourceParams.length === 0;
  if (hasNoAttackSurface) {
    findings.push({
      kind: 'no_resource_identifier',
      detail: `La route ${endpoint.route} ne contient aucun identifiant de ressource dans son chemin.`,
      line: endpoint.source.start_line,
      file: endpoint.source.file,
    });
  }

  // ---------------------------------------------------------------------
  // Verdict déterministe : uniquement quand il n'y a rien à arbitrer.
  // Dans le doute, on renvoie null et le LLM tranche. Un faux négatif ici
  // masquerait une vraie vulnérabilité — on reste très conservateur.
  // ---------------------------------------------------------------------
  let decisiveScore: number | null = null;

  if (hasNoAttackSurface && !unscoped) {
    // Pas d'identifiant dans l'URL : rien à faire varier pour un attaquant.
    decisiveScore = 0.05;
  } else if (scoped && !unscoped && !hasUnresolvedGuard) {
    // Toutes les requêtes atteignables croisent l'utilisateur, rien d'inconnu.
    decisiveScore = 0.1;
  }

  return {
    resource_params: resourceParams,
    has_no_attack_surface: hasNoAttackSurface,
    has_resolved_guard: hasResolvedGuard,
    has_unresolved_guard: hasUnresolvedGuard,
    has_unscoped_data_access: unscoped,
    has_user_scoped_data_access: scoped,
    findings,
    decisive_score: decisiveScore,
    plain_language_summary: buildScannerSummary({
      route: `${endpoint.http_method.toUpperCase()} ${endpoint.route}`,
      hasNoAttackSurface,
      scoped,
      unscoped,
      hasResolvedGuard,
      hasUnresolvedGuard,
      decisiveScore,
    }),
  };
}

function buildScannerSummary(input: {
  route: string;
  hasNoAttackSurface: boolean;
  scoped: boolean;
  unscoped: boolean;
  hasResolvedGuard: boolean;
  hasUnresolvedGuard: boolean;
  decisiveScore: number | null;
}): string {
  if (input.decisiveScore !== null && input.hasNoAttackSurface) {
    return `La route ${input.route} ne prend aucun numéro de ressource dans son adresse : il n'y a rien qu'un visiteur puisse modifier pour accéder aux données de quelqu'un d'autre.`;
  }
  if (input.decisiveScore !== null) {
    return `Sur la route ${input.route}, chaque lecture en base vérifie que la donnée appartient bien à la personne connectée. Changer le numéro dans l'adresse ne donne donc accès à rien.`;
  }
  if (input.unscoped && !input.hasResolvedGuard && !input.hasUnresolvedGuard) {
    return `La route ${input.route} récupère des données à partir d'un numéro fourni dans l'adresse, sans vérifier à qui elles appartiennent et sans aucun contrôle d'accès déclaré. C'est le motif classique d'une fuite de données.`;
  }
  return `La route ${input.route} demande un examen plus poussé : le premier passage automatique n'a pas pu conclure seul.`;
}
