/**
 * Catalogue des messages destinés à l'utilisateur, côté serveur.
 *
 * ============================================================================
 * POURQUOI UNE INTERFACE PLUTÔT QU'UN OBJET DE CHAÎNES
 *
 * Le catalogue est typé par `Messages`, et chaque langue doit satisfaire cette
 * interface. Ajouter une clé sans la traduire ne compile pas. C'est le seul
 * garde-fou qui tienne dans la durée : une table de traductions vérifiée à la
 * main dérive au troisième ajout, et l'utilisateur découvre le trou en
 * production, sous la forme d'une phrase anglaise au milieu d'un écran
 * français.
 *
 * Les messages à paramètres sont des FONCTIONS, pas des gabarits à trous. Le
 * français et l'anglais n'accordent pas au même endroit ni sur les mêmes
 * règles ; une fonction laisse chaque langue gérer ses pluriels sans imposer
 * la grammaire de l'autre.
 * ============================================================================
 */

import { plural, type Locale } from './locale.ts';

export interface Messages {
  /** Ce qu'on analyse : dossier, fichier, dépôt. */
  target: {
    empty: string;
    notFound: (raw: string) => string;
    directory: (label: string) => string;
    file: (file: string) => string;
    fileContextWarning: (root: string, file: string) => string;
    github: (label: string) => string;
    cloneFailed: (label: string) => string;
  };

  /** Progression de la pipeline. */
  scan: {
    received: string;
    indexingRunning: string;
    indexingFailed: string;
    indexingDone: (files: number, routes: number, target: string) => string;
    contextDone: string;
    detectionIntro: string;
    routeExamining: (method: string, route: string) => string;
    routeProgress: (done: number, total: number) => string;
    routeFailed: (method: string, route: string) => string;
    detectionDone: (routes: number) => string;
    detectionPartial: (failures: number) => string;
    aggregationRunning: string;
    aggregationDone: (rejected: number, candidates: number) => string;
    arbitrationNothing: string;
    arbitrationRunning: (candidates: number) => string;
    arbitrationDone: string;
    arbitrationPartial: (count: number) => string;
    reportRunning: string;
    interrupted: string;
    readFailed: string;
    usageCounter: (calls: number, thousandWords: number, costUsd: number | null) => string;
    noCommit: string;
    diffUnavailable: string;
    nothingChanged: string;
    changeNotAttributable: (examples: string[], total: number) => string;
  };

  /** Devis avant scan. */
  estimate: {
    nothingToScan: string;
    noRoutesFound: string;
    willCheck: (routes: number) => string;
    freeRoutes: (count: number) => string;
    billedRoutes: (count: number) => string;
    duration: (low: string, high: string) => string;
    isFree: string;
    costRange: (low: string, high: string) => string;
    costSingle: (value: string) => string;
    lessThanACent: string;
    costUnknown: string;
    priceMissing: (providers: string, envVar: string) => string;
    sampled: (probed: number, remaining: number) => string;
    arbitrationShare: (low: number, high: number) => string;
    latencyMeasured: (samples: number, seconds: number) => string;
    latencyEstimated: (seconds: number) => string;
    probeFailures: (count: number) => string;
    /** Unités de durée, pour composer « 3 minutes ». */
    seconds: (n: number) => string;
    minutes: (n: number) => string;
    hours: (n: number, minutes: number) => string;
    cents: (value: string) => string;
    dollars: (value: string) => string;
    zero: string;
  };

  /** Consommation réelle, après coup. */
  usage: {
    noLlm: string;
    calls: (calls: number, thousandWords: number) => string;
    costTotal: (amount: string) => string;
    costPartial: (amount: string) => string;
    costUnknown: string;
    free: string;
    thinkingHeavy: string;
    models: (list: string) => string;
  };

  /** Disponibilité des fournisseurs de modèles. */
  providers: {
    missingKey: (envVar: string) => string;
    missingAnthropic: string;
    missingBaseUrl: string;
    unusable: string;
    invalidSetting: string;
    unknownProvider: (id: string) => string;
    fallback: (role: 'detection' | 'arbitration', wanted: string, used: string) => string;
  };

  /** Réponses de l'API. */
  api: {
    targetMissing: string;
    unknownMode: string;
    estimateExpired: string;
    scanStarted: string;
    estimateFailed: string;
    targetUnreadable: string;
  };

  /** Verdicts du scanner déterministe. */
  scanner: {
    noAttackSurface: (route: string) => string;
    userScoped: (route: string) => string;
    unscopedNoGuard: (route: string) => string;
    needsReview: (route: string) => string;
  };

  /** Agrégation. */
  aggregator: {
    nothingReported: string;
    received: (total: number, retained: number) => string;
    excludedNonProduction: (count: number) => string;
    mergedDuplicates: (count: number) => string;
    rejectedLowConfidence: (count: number) => string;
    criticalCount: (count: number) => string;
    noCritical: string;
    multipleAtSameLocation: (location: string, count: number, names: string) => string;
    and: string;
  };

  /** Rapport final. */
  report: {
    allClear: string;
    foundWithCritical: (total: number, critical: number) => string;
    foundNonUrgent: (total: number) => string;
    dismissed: (count: number) => string;
    notArbitrated: (count: number) => string;
    routesFailed: (count: number) => string;
    coverage: (routes: number) => string;
    suspected: (vulnerability: string, method: string, route: string, score: number) => string;
    patchesDescribedInWords: string;
    patchStripped: (field: string) => string;
  };

  /** Contexte introuvable côté serveur MCP. */
  context: {
    routeUnknown: string;
    listFailed: string;
    refused: string;
  };

  /**
   * Consigne de langue ajoutée aux prompts.
   *
   * Traduire l'interface sans traduire ce que produit le modèle donnerait un
   * écran anglais dont chaque alerte serait rédigée en français : le pire des
   * deux mondes.
   */
  prompt: {
    answerLanguage: string;
  };
}

const EN: Messages = {
  target: {
    empty: 'Tell us what to analyze: a folder, a file, or a GitHub repository URL.',
    notFound: (raw) =>
      `"${raw}" does not exist on your computer and does not look like a GitHub address. Check the path, or paste a link such as https://github.com/user/project.`,
    directory: (label) => `We will analyze everything inside the folder ${label}.`,
    file: (file) =>
      `We will analyze only the file ${file}. The rest of the project is read for context, but is not audited.`,
    fileContextWarning: (root, file) =>
      `The project around your file is read from ${root} to understand what your file calls, but only ${file} is audited.`,
    github: (label) =>
      `We fetched a copy of the ${label} repository to analyze it. That copy is deleted afterwards.`,
    cloneFailed: (label) =>
      `We could not fetch the ${label} repository. If it is private, VulnPipe has no access to it: clone it to your computer first, then point us at the folder.`,
  },

  scan: {
    received: 'We received your request. Here we go.',
    indexingRunning:
      'Fetching your code and reading its structure to find every address in your application...',
    indexingFailed: 'We could not read your code. The analysis stops here.',
    indexingDone: (files, routes, target) =>
      `We read ${files} file(s) and found ${routes} address(es) in ${target}.`,
    contextDone: 'The links between the different parts of your code are mapped.',
    detectionIntro:
      "We are checking that nobody can read another user's data just by changing a number in the address.",
    routeExamining: (method, route) => `Examining ${method} ${route}...`,
    routeProgress: (done, total) => `We checked ${done} address(es) out of ${total}.`,
    routeFailed: (method, route) => `One address could not be checked: ${method} ${route}.`,
    detectionDone: (routes) =>
      `All ${routes} address(es) in your application have been checked.`,
    detectionPartial: (failures) =>
      `Check complete, but ${failures} address(es) could not be analyzed.`,
    aggregationRunning:
      'Grouping the reports, dropping duplicates and obvious false leads...',
    aggregationDone: (rejected, candidates) =>
      `${rejected} harmless report(s) dropped, ${candidates} to review.`,
    arbitrationNothing: 'Nothing to review: no doubtful case came up.',
    arbitrationRunning: (candidates) =>
      `A second, more capable intelligence is reviewing the ${candidates} remaining point(s) to rule out false alarms...`,
    arbitrationDone: 'Review complete.',
    arbitrationPartial: (count) =>
      `Partial review: ${count} point(s) could not be double-checked.`,
    reportRunning: 'Writing your report in plain language...',
    interrupted: 'The analysis stopped before it could produce a report.',
    readFailed: 'We could not read your code. The analysis stops here.',
    usageCounter: (calls, thousandWords, costUsd) => {
      const cost =
        costUsd === null
          ? ''
          : costUsd === 0
            ? ' — free so far'
            : ` — $${costUsd.toFixed(4)} spent so far`;
      return `${calls} call(s) to the AI, about ${thousandWords} thousand words processed${cost}.`;
    },
    noCommit:
      'No commit reference given: we cannot tell what changed, so the whole project was analyzed.',
    diffUnavailable:
      'Changes could not be determined (project not under version control, or unknown commit): the whole project was analyzed.',
    nothingChanged: 'No address is affected by this commit: nothing to re-check.',
    changeNotAttributable: (examples, total) => {
      const list = examples.join(', ');
      const rest = total > examples.length ? ` and ${total - examples.length} other file(s)` : '';
      return `We could not tell which addresses depend on ${list}${rest}, so the whole project was analyzed rather than risk missing something.`;
    },
  },

  estimate: {
    nothingToScan:
      'Nothing to analyze: none of your application addresses are affected by what you changed. This scan will be instant and free.',
    noRoutesFound:
      'We found no address to analyze here. Check that you pointed at the right folder — VulnPipe looks for web routes (controllers, API entry points).',
    willCheck: (routes) =>
      `We are going to check ${routes} address${plural(routes, '', 'es')} in your application.`,
    freeRoutes: (count) =>
      count === 1
        ? 'One of them will be settled by the automatic checks, with no AI involved: it costs nothing.'
        : `${count} of them will be settled by the automatic checks, with no AI involved: those cost nothing.`,
    billedRoutes: (count) =>
      count === 1
        ? 'One needs an AI opinion, because the case is not clear-cut.'
        : `${count} need an AI opinion, because the cases are not clear-cut.`,
    duration: (low, high) => `Expect roughly ${low} to ${high}.`,
    isFree: 'This scan is free: the engine you picked does not charge anything.',
    costRange: (low, high) => `Estimated cost: between ${low} and ${high}.`,
    costSingle: (value) => `Estimated cost: about ${value}.`,
    lessThanACent: 'In other words, less than one cent.',
    costUnknown:
      'The price cannot be worked out: the rate for the engine you picked is not configured. The workload itself is measured above.',
    priceMissing: (providers, envVar) =>
      `The rate for ${providers} is not configured. Add it to .env (for example ${envVar}="0.30/2.50", in dollars per million input then output tokens) to see a priced estimate.`,
    sampled: (probed, remaining) =>
      `The first ${probed} addresses were measured for real; the other ${remaining} are extrapolated from that average.`,
    arbitrationShare: (low, high) =>
      `Between ${low}% and ${high}% of reports should need a second review — that is the range the design aims for, and it depends on what is actually found.`,
    latencyMeasured: (samples, seconds) =>
      `Engine speed measured over your last ${samples} calls (${seconds}s per address).`,
    latencyEstimated: (seconds) =>
      `Engine speed estimated at ${seconds}s per address: it will be measured for real on your first scan.`,
    probeFailures: (count) =>
      `${count} sampled address(es) could not be read. They will most likely stay unanalyzed: they will not be counted as safe.`,
    seconds: (n) => `${n} second${plural(n, '', 's')}`,
    minutes: (n) => `${n} minute${plural(n, '', 's')}`,
    hours: (n, minutes) => (minutes > 0 ? `${n}h ${minutes}` : `${n} hour${plural(n, '', 's')}`),
    cents: (value) => `${value} cents of a dollar`,
    dollars: (value) => `$${value}`,
    zero: '$0',
  },

  usage: {
    noLlm:
      'This scan used no artificial intelligence at all: everything was settled by the automatic checks, at no cost.',
    calls: (calls, thousandWords) =>
      `This scan needed ${calls} AI analys${plural(calls, 'is', 'es')}, for about ${thousandWords} thousand words processed.`,
    costTotal: (amount) => `Total cost: ${amount}.`,
    costPartial: (amount) =>
      `Cost known for part of the calls: ${amount} (some providers do not report their prices).`,
    costUnknown:
      'The provider used does not report cost: only the volume processed can be measured.',
    free: 'free',
    thinkingHeavy:
      "Most of what you paid for is the model's internal reasoning, not the text it produced: that is normal, but that is where the budget goes.",
    models: (list) => `Model(s) used: ${list}.`,
  },

  providers: {
    missingKey: (envVar) => `${envVar} is missing from your .env file.`,
    missingAnthropic:
      'ANTHROPIC_API_KEY is missing from your .env file (an `ant auth login` session also works, but cannot be detected here).',
    missingBaseUrl: 'VULNPIPE_LLM_BASE_URL is missing: point it at your server address.',
    unusable:
      'That provider cannot be used right now: its access key is missing. Your previous setting is kept.',
    invalidSetting: 'That setting cannot be used as it stands. Your previous setting is kept.',
    unknownProvider: (id) => `Unknown provider: ${id}`,
    fallback: (role, wanted, used) =>
      `${role === 'detection' ? 'Vulnerability detection' : 'The final review'} was set to use ${wanted}, whose access key is missing. We are using ${used} instead — you can change this in Settings.`,
  },

  api: {
    targetMissing:
      'Tell us what to analyze: a folder, a file, or a GitHub repository URL.',
    unknownMode: 'That kind of analysis does not exist.',
    estimateExpired:
      'Your estimate has expired. Run it again: the project may have changed since.',
    scanStarted: 'Analysis started. You can follow it live.',
    estimateFailed: 'We could not work out how much work this project needs.',
    targetUnreadable: 'We could not read what you asked us to analyze.',
  },

  scanner: {
    noAttackSurface: (route) =>
      `The ${route} route takes no resource number in its address: there is nothing a visitor could change to reach somebody else's data.`,
    userScoped: (route) =>
      `On the ${route} route, every database read checks that the data belongs to the signed-in person. Changing the number in the address gives access to nothing.`,
    unscopedNoGuard: (route) =>
      `The ${route} route fetches data from a number supplied in the address, without checking who it belongs to and without any declared access control. This is the classic data-leak pattern.`,
    needsReview: (route) =>
      `The ${route} route needs a closer look: the first automatic pass could not settle it alone.`,
  },

  aggregator: {
    nothingReported: 'The detectors reported no security issue on this scan.',
    received: (total, retained) =>
      `${total} report(s) received from the detectors, ${retained} kept after cleanup.`,
    excludedNonProduction: (count) =>
      `${count} concerned test or demo files rather than code that actually runs online: dropped.`,
    mergedDuplicates: (count) =>
      `${count} duplicated an identical report and were merged together.`,
    rejectedLowConfidence: (count) =>
      `${count} turned out to be harmless on inspection and do not appear in the report.`,
    criticalCount: (count) =>
      `${count} point(s) need your attention first: those are the ones that expose the most data if somebody exploits them.`,
    noCritical: 'Nothing critical: the items kept are of moderate severity.',
    multipleAtSameLocation: (location, count, names) =>
      `On ${location}, ${count} different problems were spotted in the same place in the code (${names}). Each is fixed separately: solving one does not solve the other.`,
    and: ' and ',
  },

  report: {
    allClear: 'Good news: nothing worth flagging was found in your code on this scan.',
    foundWithCritical: (total, critical) =>
      `We found ${total} point${plural(total, '', 's')} worth your attention in your code, ${critical} of which deserve${plural(critical, 's', '')} a quick fix.`,
    foundNonUrgent: (total) =>
      `We found ${total} point${plural(total, '', 's')} worth your attention in your code. Nothing urgent, but worth a look.`,
    dismissed: (count) =>
      `${count} other report${plural(count, '', 's')} ${plural(count, 'was', 'were')} examined and then dismissed: on review, ${plural(count, 'it is a false alarm', 'they are false alarms')}.`,
    notArbitrated: (count) =>
      `Careful: ${count} point${plural(count, '', 's')} could not be double-checked by the second review. ${plural(count, 'It is', 'They are')} shown as-is, and should be confirmed by a person.`,
    routesFailed: (count) =>
      `${count} address${plural(count, '', 'es')} in your application could not be analyzed: this scan is incomplete.`,
    coverage: (routes) =>
      `${routes} address${plural(routes, '', 'es')} in your application ${plural(routes, 'was', 'were')} checked.`,
    suspected: (vulnerability, method, route, score) =>
      `${vulnerability} suspected on ${method} ${route} (detector score: ${score}).`,
    patchesDescribedInWords:
      'Fixes are described in words, not in code: a patch applied without review is a risk in itself.',
    patchStripped: (field) =>
      `The fix has to be decided and written by a developer: this field (${field}) contained a code snippet, deliberately removed because a patch applied without review is a risk in itself.`,
  },

  context: {
    routeUnknown:
      'We could not find the code for this address. It was not analyzed — do not assume it is safe.',
    listFailed: 'We could not list the project routes. Did indexing actually run?',
    refused: 'The context server refused the request.',
  },

  prompt: {
    answerLanguage:
      'Write every human-readable field (plain_language_summary in particular) in clear English, aimed at somebody who does not write code.',
  },
};

const FR: Messages = {
  target: {
    empty: "Indique ce que tu veux analyser : un dossier, un fichier, ou l'adresse d'un dépôt GitHub.",
    notFound: (raw) =>
      `« ${raw} » n'existe pas sur ton ordinateur et ne ressemble pas à une adresse GitHub. Vérifie le chemin, ou colle un lien du type https://github.com/utilisateur/projet.`,
    directory: (label) => `On va analyser tout le contenu du dossier ${label}.`,
    file: (file) =>
      `On va analyser uniquement le fichier ${file}. Le reste du projet est lu pour comprendre le contexte, mais n'est pas audité.`,
    fileContextWarning: (root, file) =>
      `Le projet autour du fichier est lu depuis ${root} pour comprendre ce que ton fichier appelle, mais seul ${file} est audité.`,
    github: (label) =>
      `On a récupéré une copie du dépôt ${label} pour l'analyser. Cette copie est supprimée à la fin.`,
    cloneFailed: (label) =>
      `On n'a pas réussi à récupérer le dépôt ${label}. S'il est privé, VulnPipe n'y a pas accès : clone-le d'abord sur ton ordinateur, puis indique le dossier.`,
  },

  scan: {
    received: "On a bien reçu ta demande d'analyse. C'est parti.",
    indexingRunning:
      "On récupère ton code et on lit sa structure pour repérer toutes les adresses de ton application...",
    indexingFailed: "On n'a pas réussi à lire ton code. L'analyse s'arrête ici.",
    indexingDone: (files, routes, target) =>
      `On a lu ${files} fichier(s) et trouvé ${routes} adresse(s) dans ${target}.`,
    contextDone: 'Les liens entre les différentes parties de ton code sont établis.',
    detectionIntro:
      "On vérifie que personne ne peut consulter les données d'un autre utilisateur en changeant un numéro dans l'adresse.",
    routeExamining: (method, route) => `On examine ${method} ${route}...`,
    routeProgress: (done, total) => `On a vérifié ${done} adresse(s) sur ${total}.`,
    routeFailed: (method, route) => `Une adresse n'a pas pu être vérifiée : ${method} ${route}.`,
    detectionDone: (routes) =>
      `Les ${routes} adresse(s) de ton application ont été vérifiées.`,
    detectionPartial: (failures) =>
      `Vérification terminée, mais ${failures} adresse(s) n'ont pas pu être analysées.`,
    aggregationRunning:
      'On regroupe les signalements, on écarte les doublons et les fausses pistes évidentes...',
    aggregationDone: (rejected, candidates) =>
      `${rejected} signalement(s) sans danger écarté(s), ${candidates} à faire relire.`,
    arbitrationNothing: "Rien à faire relire : aucun point douteux n'est ressorti.",
    arbitrationRunning: (candidates) =>
      `Une seconde intelligence, plus poussée, relit les ${candidates} point(s) restants pour éliminer les fausses alertes...`,
    arbitrationDone: 'Relecture terminée.',
    arbitrationPartial: (count) =>
      `Relecture partielle : ${count} point(s) n'ont pas pu être revérifiés.`,
    reportRunning: 'On rédige ton rapport en français simple...',
    interrupted: "L'analyse s'est interrompue avant de produire un rapport.",
    readFailed: "On n'a pas réussi à lire ton code. L'analyse s'arrête ici.",
    usageCounter: (calls, thousandWords, costUsd) => {
      const cout =
        costUsd === null
          ? ''
          : costUsd === 0
            ? " — gratuit jusqu'ici"
            : ` — ${costUsd.toFixed(4)} $ dépensés jusqu'ici`;
      return `${calls} appel(s) à l'intelligence artificielle, environ ${thousandWords} millier(s) de mots traités${cout}.`;
    },
    noCommit:
      "Aucun identifiant de commit fourni : impossible de savoir ce qui a changé, tout le projet a été réanalysé.",
    diffUnavailable:
      "Les modifications n'ont pas pu être déterminées (dépôt non versionné ou commit introuvable) : tout le projet a été réanalysé.",
    nothingChanged:
      "Aucune adresse concernée par les modifications de ce commit : rien à réanalyser.",
    changeNotAttributable: (examples, total) => {
      const liste = examples.join(', ');
      const reste = total > examples.length ? ` et ${total - examples.length} autre(s) fichier(s)` : '';
      return `On n'a pas su déterminer quelles adresses dépendent de ${liste}${reste} : tout le projet a été réanalysé plutôt que de risquer de passer à côté de quelque chose.`;
    },
  },

  estimate: {
    nothingToScan:
      "Rien à analyser : aucune adresse de ton application n'est concernée par ce que tu as modifié. Ce scan sera instantané et gratuit.",
    noRoutesFound:
      "On n'a trouvé aucune adresse à analyser ici. Vérifie que tu as bien indiqué le bon dossier — VulnPipe cherche des routes web (contrôleurs, points d'entrée d'API).",
    willCheck: (routes) =>
      `On va vérifier ${routes} adresse${plural(routes, '', 's')} de ton application.`,
    freeRoutes: (count) =>
      count === 1
        ? "L'une d'elles sera tranchée par les vérifications automatiques, sans faire appel à une intelligence artificielle : elle ne coûte rien."
        : `${count} d'entre elles seront tranchées par les vérifications automatiques, sans faire appel à une intelligence artificielle : celles-là ne coûtent rien.`,
    billedRoutes: (count) =>
      count === 1
        ? "Une seule demande l'avis d'une intelligence artificielle, parce que le cas n'est pas évident."
        : `${count} demandent l'avis d'une intelligence artificielle, parce que le cas n'est pas évident.`,
    duration: (low, high) => `Compte environ ${low} à ${high}.`,
    isFree: 'Ce scan est gratuit : le moteur choisi ne facture rien.',
    costRange: (low, high) => `Coût estimé : entre ${low} et ${high}.`,
    costSingle: (value) => `Coût estimé : environ ${value}.`,
    lessThanACent: "Autrement dit, moins d'un centime.",
    costUnknown:
      "Le prix ne peut pas être chiffré : le tarif du moteur choisi n'est pas renseigné. Le volume de travail, lui, est mesuré ci-dessus.",
    priceMissing: (providers, envVar) =>
      `Le tarif de ${providers} n'est pas renseigné. Ajoute-le dans .env (par exemple ${envVar}="0.30/2.50", en dollars par million de mots-machine en entrée puis en sortie) pour voir une estimation chiffrée.`,
    sampled: (probed, remaining) =>
      `Les ${probed} premières adresses ont été mesurées pour de vrai ; les ${remaining} autres sont estimées à partir de cette moyenne.`,
    arbitrationShare: (low, high) =>
      `Entre ${low} % et ${high} % des signalements devraient nécessiter une seconde relecture — c'est la fourchette visée par la conception, elle dépend de ce qui sera réellement trouvé.`,
    latencyMeasured: (samples, seconds) =>
      `Vitesse du moteur d'analyse mesurée sur tes ${samples} derniers appels (${seconds} s par adresse).`,
    latencyEstimated: (seconds) =>
      `Vitesse du moteur d'analyse estimée à ${seconds} s par adresse : elle sera mesurée pour de vrai dès ton premier scan.`,
    probeFailures: (count) =>
      `${count} adresse(s) sondée(s) n'ont pas pu être lues. Elles resteront probablement non analysées : elles ne seront pas comptées comme sûres.`,
    seconds: (n) => `${n} seconde${plural(n, '', 's')}`,
    minutes: (n) => `${n} minute${plural(n, '', 's')}`,
    hours: (n, minutes) => (minutes > 0 ? `${n} h ${minutes}` : `${n} heure${plural(n, '', 's')}`),
    cents: (value) => `${value} centime(s) de dollar`,
    dollars: (value) => `${value} $`,
    zero: '0 $',
  },

  usage: {
    noLlm:
      "Ce scan n'a fait appel à aucune intelligence artificielle : tout a été tranché par les vérifications automatiques, sans coût.",
    calls: (calls, thousandWords) =>
      `Ce scan a demandé ${calls} analyse${plural(calls, '', 's')} par intelligence artificielle, pour environ ${thousandWords} millier(s) de mots traités.`,
    costTotal: (amount) => `Coût total : ${amount}.`,
    costPartial: (amount) =>
      `Coût connu pour une partie des appels : ${amount} (certains fournisseurs ne communiquent pas leurs prix).`,
    costUnknown:
      "Le coût n'est pas communiqué par le fournisseur utilisé : seul le volume traité est mesurable.",
    free: 'gratuit',
    thinkingHeavy:
      "La majorité du travail facturé est de la réflexion interne du modèle, pas du texte produit : c'est normal, mais c'est là que part le budget.",
    models: (list) => `Modèle(s) utilisé(s) : ${list}.`,
  },

  providers: {
    missingKey: (envVar) => `${envVar} absente du fichier .env.`,
    missingAnthropic:
      "ANTHROPIC_API_KEY absente du fichier .env (une session `ant auth login` fonctionne aussi, mais n'est pas détectable ici).",
    missingBaseUrl: "VULNPIPE_LLM_BASE_URL absente : indique l'adresse de ton serveur.",
    unusable:
      "Ce fournisseur n'est pas utilisable pour l'instant : il lui manque sa clé d'accès. Le réglage précédent est conservé.",
    invalidSetting: "Ce réglage n'est pas utilisable en l'état. Le réglage précédent est conservé.",
    unknownProvider: (id) => `Fournisseur inconnu : ${id}`,
    fallback: (role, wanted, used) =>
      `${role === 'detection' ? 'La recherche de failles' : 'La relecture finale'} devait utiliser ${wanted}, dont la clé d'accès est absente. On utilise ${used} à la place — tu peux changer ça dans les réglages.`,
  },

  api: {
    targetMissing:
      "Il faut indiquer ce qu'on analyse : un dossier, un fichier, ou l'adresse d'un dépôt GitHub.",
    unknownMode: "Ce type d'analyse n'existe pas.",
    estimateExpired:
      "Ton estimation a expiré. Relance-la : le projet a peut-être changé depuis.",
    scanStarted: 'Analyse lancée. Tu peux suivre son avancement en direct.',
    estimateFailed: "On n'a pas réussi à évaluer le travail à faire sur ce projet.",
    targetUnreadable: "On n'a pas réussi à lire ce que tu veux analyser.",
  },

  scanner: {
    noAttackSurface: (route) =>
      `La route ${route} ne prend aucun numéro de ressource dans son adresse : il n'y a rien qu'un visiteur puisse modifier pour accéder aux données de quelqu'un d'autre.`,
    userScoped: (route) =>
      `Sur la route ${route}, chaque lecture en base vérifie que la donnée appartient bien à la personne connectée. Changer le numéro dans l'adresse ne donne donc accès à rien.`,
    unscopedNoGuard: (route) =>
      `La route ${route} récupère des données à partir d'un numéro fourni dans l'adresse, sans vérifier à qui elles appartiennent et sans aucun contrôle d'accès déclaré. C'est le motif classique d'une fuite de données.`,
    needsReview: (route) =>
      `La route ${route} demande un examen plus poussé : le premier passage automatique n'a pas pu conclure seul.`,
  },

  aggregator: {
    nothingReported: "Aucun problème de sécurité n'a été remonté par les détecteurs sur ce scan.",
    received: (total, retained) =>
      `${total} signalement(s) reçu(s) des détecteurs, ${retained} retenu(s) après nettoyage.`,
    excludedNonProduction: (count) =>
      `${count} concernaient des fichiers de test ou de démonstration, pas du code réellement en ligne : écartés.`,
    mergedDuplicates: (count) =>
      `${count} faisaient doublon avec un signalement identique et ont été regroupés.`,
    rejectedLowConfidence: (count) =>
      `${count} se sont révélés sans danger après vérification et n'apparaissent pas dans le rapport.`,
    criticalCount: (count) =>
      `${count} point(s) demandent votre attention en priorité : ce sont ceux qui exposent le plus de données si quelqu'un les exploite.`,
    noCritical: 'Aucun point critique : les éléments retenus sont de gravité modérée.',
    multipleAtSameLocation: (location, count, names) =>
      `Sur ${location}, ${count} problèmes différents ont été repérés au même endroit du code (${names}). Chacun se corrige séparément : régler l'un ne règle pas l'autre.`,
    and: ' et ',
  },

  report: {
    allClear: "Bonne nouvelle : aucun point d'attention n'a été retenu dans ton code sur ce scan.",
    foundWithCritical: (total, critical) =>
      `On a trouvé ${total} point${plural(total, '', 's')} d'attention dans ton code, dont ${critical} qui mérite${plural(critical, '', 'nt')} une correction rapide.`,
    foundNonUrgent: (total) =>
      `On a trouvé ${total} point${plural(total, '', 's')} d'attention dans ton code. Rien d'urgent, mais ça vaut le coup d'y jeter un œil.`,
    dismissed: (count) =>
      `${count} autre${plural(count, '', 's')} signalement${plural(count, ' a', 's ont')} été examiné${plural(count, '', 's')} puis écarté${plural(count, '', 's')} : après relecture, ${plural(count, "c'est une fausse alerte", 'ce sont de fausses alertes')}.`,
    notArbitrated: (count) =>
      `Attention : ${count} point${plural(count, " n'a", "s n'ont")} pas pu être revérifié${plural(count, '', 's')} par la seconde relecture. ${plural(count, 'Il est affiché tel quel', 'Ils sont affichés tels quels')}, à faire confirmer par une personne.`,
    routesFailed: (count) =>
      `${count} adresse${plural(count, '', 's')} de ton application n'${plural(count, 'a', 'ont')} pas pu être analysée${plural(count, '', 's')} : ce scan est incomplet.`,
    coverage: (routes) =>
      `${routes} adresse${plural(routes, '', 's')} de ton application ${plural(routes, 'a été vérifiée', 'ont été vérifiées')}.`,
    suspected: (vulnerability, method, route, score) =>
      `${vulnerability} suspecté sur ${method} ${route} (score du détecteur : ${score}).`,
    patchesDescribedInWords:
      "Les corrections sont décrites en mots, pas en code : un correctif appliqué sans relecture est un risque en soi.",
    patchStripped: (field) =>
      `La correction doit être décidée et écrite par un développeur : ce champ (${field}) contenait un extrait de code, retiré volontairement car un correctif appliqué sans relecture est un risque en soi.`,
  },

  context: {
    routeUnknown:
      "Impossible de récupérer le code de cette route. Elle n'a pas été analysée — ne la considère pas comme sûre.",
    listFailed: "Impossible de lister les routes du projet. L'indexation a-t-elle bien tourné ?",
    refused: 'Le serveur de contexte a refusé la demande.',
  },

  prompt: {
    answerLanguage:
      "Rédige tous les champs destinés à un humain (plain_language_summary en particulier) en français simple, pour quelqu'un qui n'écrit pas de code.",
  },
};

const CATALOG: Record<Locale, Messages> = { en: EN, fr: FR };

/** Messages de la langue demandée. */
export function messages(locale: Locale): Messages {
  return CATALOG[locale];
}
