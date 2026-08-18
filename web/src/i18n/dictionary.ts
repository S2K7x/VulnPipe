/**
 * Catalogue de l'interface, en anglais et en français.
 *
 * Même règle que côté serveur (`src/i18n/messages.ts`) : le catalogue est
 * typé, donc une clé ajoutée sans traduction ne compile pas. C'est le seul
 * garde-fou qui tienne dans la durée contre l'écran à moitié traduit.
 *
 * L'anglais est le défaut : c'est ce que voit quelqu'un qui n'a jamais touché
 * au sélecteur.
 */

export const LOCALES = ['en', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export type StepName =
  | 'received'
  | 'indexing'
  | 'context_server'
  | 'detection'
  | 'aggregation'
  | 'master_review'
  | 'report';

export interface StepTranslation {
  label: string;
  running: string;
  done: string;
  failed: string;
  icon: string;
  /** À quoi sert cette étape, pour quelqu'un qui ne code pas. */
  why: string;
  /** Une analogie du quotidien, pour ancrer l'idée sans vocabulaire technique. */
  analogy: string;
}

export interface Dictionary {
  localeName: string;
  app: {
    tagline: string;
    navAnalysis: string;
    navSettings: string;
    navProducts: string;
    navResources: string;
    footerNote: string;
    languageLabel: string;
    menu: string;
  };
  launcher: {
    title: string;
    kicker: string;
    tabs: Record<'directory' | 'file' | 'github', string>;
    question: Record<'directory' | 'file' | 'github', string>;
    help: Record<'directory' | 'file' | 'github', string>;
    placeholder: Record<'directory' | 'file' | 'github', string>;
    missingTarget: string;
    scopeLegend: string;
    fullTitle: string;
    fullHelp: string;
    incrementalTitle: string;
    incrementalHelp: string;
    commitLabel: string;
    commitHelp: string;
    commitPlaceholder: string;
    submit: string;
    submitBusy: string;
    reassurance: string;
  };
  estimate: {
    title: string;
    kicker: string;
    time: string;
    cost: string;
    routes: string;
    calls: string;
    routesHint: (free: number, billed: number) => string;
    callsHint: string;
    costFree: string;
    costUnknown: string;
    costUnknownHint: string;
    costHint: string;
    lessThanCent: string;
    targetKind: Record<'directory' | 'file' | 'github', string>;
    targetLine: (files: number, routes: number) => string;
    incrementalNote: string;
    detailShow: string;
    detailHide: string;
    detailIntro: string;
    detailSampled: (size: number) => string;
    volume: (thousands: number) => string;
    confirm: string;
    confirmBusy: string;
    nothingToScan: string;
    cancel: string;
    estimating: string;
  };
  live: {
    title: string;
    finished: string;
    examining: string;
    progress: (done: number, total: number) => string;
    countersAlerts: string;
    countersGrey: string;
    countersSafe: string;
    countersCalls: string;
    countersFree: (n: number) => string;
    countersSpent: string;
    countersNotReported: string;
    waiting: string;
    feedLabel: string;
    zoneSafe: string;
    zoneGrey: string;
    zoneAlert: string;
    zoneFailed: string;
  };
  timeline: {
    heading: string;
    headingDone: string;
    empty: string;
    showDetail: string;
    hideDetail: string;
    statusRunning: string;
    statusDone: string;
    statusFailed: string;
    statusSkipped: string;
    statusPending: string;
    of: (done: number, total: number) => string;
    fallback: string;
  };
  steps: Record<StepName, StepTranslation>;
  explainer: {
    title: string;
    intro: string;
    lede: string;
    now: string;
    show: string;
    hide: string;
    costTitle: string;
    costBody: string;
  };
  report: {
    heading: string;
    securityIssue: string;
    whatToDo: string;
    noticeNotArbitrated: string;
    noticeNeedsHuman: string;
    noticeSummaryOnly: string;
    showTechnical: string;
    hideTechnical: string;
    whyVerdict: string;
    referenceCategory: string;
  };
  usage: {
    heading: string;
    calls: string;
    cost: string;
    compute: string;
    showDetail: string;
    hideDetail: string;
    byStage: string;
    stage: string;
    callsColumn: string;
    input: string;
    output: string;
    thinking: string;
    costColumn: string;
    notReported: string;
    free: string;
    byModel: string;
    model: string;
    partial: string;
    stages: Record<string, string>;
  };
  providers: {
    heading: string;
    intro: string;
    detectionRole: string;
    detectionHelp: string;
    arbitrationRole: string;
    arbitrationHelp: string;
    model: string;
    modelPlaceholder: string;
    unavailable: string;
    keyMissing: string;
    cannotUse: (why: string) => string;
    apply: string;
    applying: string;
    lockedDuringScan: string;
    names: Record<string, string>;
    descriptions: Record<string, string>;
  };
  severity: Record<string, { label: string; explanation: string }>;
  glossary: Record<string, string>;
  errors: {
    unreachable: string;
    generic: string;
    streamLost: string;
    scanInterrupted: string;
  };
  restart: string;
}

const EN: Dictionary = {
  localeName: 'English',
  app: {
    tagline: "We check your code for security holes and explain what we find, without the jargon.",
    navAnalysis: 'Analysis',
    navSettings: 'Settings',
    navProducts: 'Pipeline',
    navResources: 'Docs',
    footerNote:
      'You do not need to understand the code to use VulnPipe. Every technical term is translated, and the details stay folded until you ask for them.',
    languageLabel: 'Language',
    menu: 'Menu',
  },
  launcher: {
    title: 'What do you want to check?',
    kicker: 'Start a scan',
    tabs: { directory: 'A folder', file: 'A single file', github: 'A GitHub repo' },
    question: {
      directory: 'Which folder do you want to check?',
      file: 'Which file do you want to check?',
      github: 'Which repository do you want to check?',
    },
    help: {
      directory:
        'Your project folder, on your computer. This is the common case: everything inside gets reviewed.',
      file: "Handy right after you write or change one file. The rest of your project is still read for context, but only this file is audited — faster and cheaper.",
      github:
        'Paste the address of a public repository. We fetch a temporary copy, analyze it, then delete it. Private repositories will not work: clone it locally first, then pick "A folder".',
    },
    placeholder: {
      directory: '/Users/me/my-project',
      file: '/Users/me/my-project/src/orders.controller.ts',
      github: 'https://github.com/user/project',
    },
    missingTarget: 'Tell us what to analyze to continue.',
    scopeLegend: 'How much of it?',
    fullTitle: 'The whole project',
    fullHelp: 'Slower and more expensive, but nothing is left out. Do this the first time.',
    incrementalTitle: 'Only what changed',
    incrementalHelp:
      'Much faster and cheaper: we only re-check the parts modified since a given version. This is the everyday mode.',
    commitLabel: 'Since which version?',
    commitHelp:
      'The reference of the save point to compare against. If you do not know it, leave it empty: the whole project will be analyzed, and we will tell you.',
    commitPlaceholder: 'leave empty if you are not sure',
    submit: 'Estimate, then analyze',
    submitBusy: 'One moment...',
    reassurance: 'Nothing starts yet: we show you the time and cost first.',
  },
  estimate: {
    title: 'Before we start: here is what this means',
    kicker: 'Estimate',
    time: 'Time',
    cost: 'Cost',
    routes: 'Addresses checked',
    calls: 'AI calls',
    routesHint: (free, billed) => `${free} without AI, ${billed} with`,
    callsHint: 'the only billed item',
    costFree: 'Free',
    costUnknown: 'Not priceable',
    costUnknownHint: 'rate not configured',
    costHint: 'an estimate, not an invoice',
    lessThanCent: 'less than a cent',
    targetKind: { directory: 'Folder', file: 'Single file', github: 'GitHub repo' },
    targetLine: (files, routes) => `${files} file(s) read, ${routes} address(es) found`,
    incrementalNote: 'only what changed',
    detailShow: 'What is this estimate based on?',
    detailHide: 'Hide',
    detailIntro:
      'This is not guesswork: we actually read your code, linked the pieces together and prepared the questions for the AI. The only thing we did not do is ask them — that is the only step that costs money.',
    detailSampled: (size) =>
      ` The first ${size} addresses were measured for real, the rest is extrapolated.`,
    volume: (thousands) => `Estimated volume: about ${thousands} thousand machine-words processed.`,
    confirm: 'Start the analysis',
    confirmBusy: 'Starting...',
    nothingToScan: 'Nothing to analyze',
    cancel: 'Change target',
    estimating: 'Reading your code to price the work. Nothing is spent during this step.',
  },
  live: {
    title: 'Analysis running',
    finished: 'Analysis complete',
    examining: 'Examining',
    progress: (done, total) => `${done} address(es) of ${total}`,
    countersAlerts: 'likely problem(s)',
    countersGrey: 'to double-check',
    countersSafe: 'all clear',
    countersCalls: 'AI call(s)',
    countersFree: (n) => ` · ${n} free verdict(s)`,
    countersSpent: 'spent',
    countersNotReported: ' (not reported)',
    waiting: 'The first verdicts will show up here, address by address.',
    feedLabel: 'Verdicts as they come in',
    zoneSafe: 'All clear',
    zoneGrey: 'To double-check',
    zoneAlert: 'Likely problem',
    zoneFailed: 'Could not be checked',
  },
  timeline: {
    heading: 'The main steps',
    headingDone: 'What happened',
    empty: 'The analysis is about to start. You will see here, step by step, what is being checked.',
    showDetail: 'Show technical detail',
    hideDetail: 'Hide technical detail',
    statusRunning: 'running',
    statusDone: 'done',
    statusFailed: 'problem encountered',
    statusSkipped: 'step skipped',
    statusPending: 'waiting',
    of: (done, total) => `${done} of ${total}`,
    fallback: 'A step of the analysis is running...',
  },
  steps: {
    received: {
      label: 'Request received',
      icon: '📥',
      running: 'Registering your request...',
      done: 'Request received. Here we go.',
      failed: 'We could not take your request into account.',
      why: 'We log your request and queue it. If several analyses run at once, each keeps its place in line.',
      analogy: 'Like taking a ticket when you walk into a waiting room.',
    },
    indexing: {
      label: 'Reading your code',
      icon: '📖',
      running: 'Reading your code structure to find every page and address in your application...',
      done: 'We covered your whole application.',
      failed: 'We could not read your code. The analysis stops here.',
      why: 'Before hunting for holes, you have to know what there is to protect. We list every address in your application: each page, each button that fetches data.',
      analogy: 'Like walking around a house counting doors and windows before checking the locks.',
    },
    context_server: {
      label: 'Connecting the dots',
      icon: '🔗',
      running: 'Linking the pieces of code together to understand what each page really does...',
      done: 'The links between the parts of your code are mapped.',
      failed: 'The links between the parts of your code could not be established.',
      why: 'An address on its own says nothing. You have to follow what it triggers: which data it fetches, and whether a protection runs first. We reconstruct that whole path.',
      analogy: 'Like following a wire from the switch to the bulb to see what it controls.',
    },
    detection: {
      label: 'Hunting for holes',
      icon: '🔍',
      running:
        "Checking that nobody can read another user's data just by changing a number in the address...",
      done: 'Every address in your application has been checked.',
      failed: 'Some addresses could not be checked: this scan is incomplete.',
      why: 'This is the core of the work. For each address, we look at whether somebody could reach data that is not theirs. The obvious cases are settled without any AI, so you are not billed for nothing.',
      analogy: 'Like trying the handles yourself to see which ones open without a key.',
    },
    aggregation: {
      label: 'Sorting the results',
      icon: '🧹',
      running: 'Grouping reports, dropping duplicates and obvious false leads...',
      done: 'Sorting done: only what deserves a look is left.',
      failed: 'Sorting the results failed.',
      why: 'Several checks can flag the same problem, and some reports point at test code that never actually runs. We clean all that up so only what matters is kept.',
      analogy: 'Like sorting your mail: you bin the flyers before reading the rest.',
    },
    master_review: {
      label: 'Second opinion',
      icon: '🧠',
      running:
        'A second, more capable intelligence is reviewing the remaining points to rule out false alarms...',
      done: 'The review is complete.',
      failed: 'The review could not finish: some points are shown without a second check.',
      why: 'Quick checks get it wrong sometimes. A more capable intelligence re-reads the doubtful cases against the real code and drops the false alarms. That is what keeps us from bothering you for nothing.',
      analogy: 'Like asking for a second opinion before an important decision.',
    },
    report: {
      label: 'Your report',
      icon: '📝',
      running: 'Writing your report in plain language...',
      done: 'Your report is ready.',
      failed: 'The analysis stopped before it could produce a complete report.',
      why: 'We translate everything into plain language: what an attacker could concretely do, and which direction to look for the fix.',
      analogy: 'Like a write-up meant for you, not for another specialist.',
    },
  },
  explainer: {
    title: 'How the analysis works',
    intro: 'How we go about it',
    lede: 'Seven steps, from reading your code to the report written for you. Open any of them to see what it is for.',
    now: 'running',
    show: 'What is this for?',
    hide: 'Hide',
    costTitle: 'Why this costs almost nothing',
    costBody:
      'Most addresses in your application are settled by free automatic checks. Only the genuinely doubtful cases go to an AI, and only the most ambiguous reach the second, pricier review. You get the exact breakdown of what was consumed at the end of every analysis.',
  },
  report: {
    heading: 'Your report',
    securityIssue: 'Security issue',
    whatToDo: 'What to do: ',
    noticeNotArbitrated:
      'This point could not be double-checked. It is shown as-is: have somebody confirm it before drawing conclusions.',
    noticeNeedsHuman:
      'The second review could not settle it: some elements are missing from your code to be sure. A human check is needed.',
    noticeSummaryOnly:
      'This point was re-checked without full access to the code: treat it with caution.',
    showTechnical: 'Show technical detail',
    hideTechnical: 'Hide technical detail',
    whyVerdict: 'Why this verdict',
    referenceCategory: 'Reference category',
  },
  usage: {
    heading: 'What this scan actually used',
    calls: 'AI analys(es)',
    cost: 'cost',
    compute: 'of compute',
    showDetail: 'Show usage detail',
    hideDetail: 'Hide usage detail',
    byStage: 'By step',
    stage: 'Step',
    callsColumn: 'Calls',
    input: 'Input',
    output: 'Output',
    thinking: 'Thinking',
    costColumn: 'Cost',
    notReported: 'not reported by the provider',
    free: 'free',
    byModel: 'By model',
    model: 'Model',
    partial: 'partial',
    stages: { detection: 'Hunting for holes', master_review: 'Second opinion' },
  },
  providers: {
    heading: 'Which AI engine?',
    intro:
      'Two roles, set separately. Detection does the bulk of the work; the second opinion only handles the doubtful cases.',
    detectionRole: 'Hunting for holes',
    detectionHelp: 'Runs on every address. This is where the volume — and the cost — is.',
    arbitrationRole: 'Second opinion',
    arbitrationHelp: 'Only sees the doubtful cases. Worth picking the most capable one here.',
    model: 'Model (optional)',
    modelPlaceholder: 'provider default',
    unavailable: 'access key missing',
    keyMissing: ' — key missing',
    cannotUse: (why) => `This provider cannot be used right now: ${why}`,
    apply: 'Apply',
    applying: 'Applying...',
    lockedDuringScan: 'A scan is running: the setting is frozen until it finishes.',
    names: {
      gemini: 'Google Gemini',
      ollama: 'Ollama (on your machine)',
      anthropic: 'Claude (Anthropic)',
      openai: 'OpenAI',
      openrouter: 'OpenRouter',
      custom: 'Custom server',
    },
    descriptions: {
      gemini: 'Fast and cheap. One key is enough.',
      ollama: 'Free and private: nothing leaves your computer.',
      anthropic: 'The most reliable for settling ambiguous cases.',
      openai: 'GPT models.',
      openrouter: 'Access to many models, including free ones.',
      custom: 'Any OpenAI-compatible server you host yourself.',
    },
  },
  severity: {
    critical: {
      label: 'Fix soon',
      explanation: 'If somebody notices, the damage can be immediate and significant.',
    },
    high: {
      label: 'Fix soon',
      explanation: 'If somebody notices, the damage can be immediate and significant.',
    },
    medium: { label: 'Keep an eye on it', explanation: 'Not urgent, but worth a look.' },
    low: { label: 'Minor', explanation: 'Limited impact, handle it when you have time.' },
    info: { label: 'For information', explanation: 'Nothing to fix, flagged so you know.' },
  },
  glossary: {
    IDOR: "A visitor can reach somebody else's data just by changing a number in the page address.",
    SQLI: "A visitor can make your application's database run their own commands.",
    XSS: "A visitor can slip in code that runs in other visitors' browsers.",
    SSRF: 'A visitor can force your server to fetch pages or data it should not reach.',
    SECURITY_MISCONFIGURATION: 'A security setting is missing or wrong, leaving a door open.',
    OWASP:
      'An organisation that publishes the reference list of the most common web security holes.',
    'A01:2021 – Broken Access Control':
      'Reference category: the controls deciding "who may see what" are not strong enough.',
  },
  errors: {
    unreachable: 'Cannot reach the analysis service. Check that it is running.',
    generic: 'That did not go through.',
    streamLost: 'The live feed dropped. The result is still available.',
    scanInterrupted: 'The analysis stopped before producing a report.',
  },
  restart: 'Run another analysis',
};

const FR: Dictionary = {
  localeName: 'Français',
  app: {
    tagline: "On vérifie la sécurité de ton code et on t'explique ce qu'on trouve, sans jargon.",
    navAnalysis: 'Analyse',
    navSettings: 'Réglages',
    navProducts: 'Pipeline',
    navResources: 'Docs',
    footerNote:
      "Tu n'as pas besoin de comprendre le code pour utiliser VulnPipe. Chaque terme technique est traduit, et le détail reste replié tant que tu ne le demandes pas.",
    languageLabel: 'Langue',
    menu: 'Menu',
  },
  launcher: {
    title: 'Que veux-tu vérifier ?',
    kicker: 'Lancer une analyse',
    tabs: { directory: 'Un dossier', file: 'Un fichier seul', github: 'Un dépôt GitHub' },
    question: {
      directory: 'Quel dossier veux-tu vérifier ?',
      file: 'Quel fichier veux-tu vérifier ?',
      github: 'Quel dépôt veux-tu vérifier ?',
    },
    help: {
      directory:
        "Le dossier de ton projet, sur ton ordinateur. C'est le cas le plus courant : tout ce qu'il contient sera passé en revue.",
      file: "Utile quand tu viens d'écrire ou de modifier un fichier précis. Le reste de ton projet sera quand même lu pour comprendre le contexte, mais seul ce fichier sera audité — c'est plus rapide et moins cher.",
      github:
        "Colle l'adresse d'un dépôt public. On en récupère une copie temporaire, on l'analyse, puis on la supprime. Un dépôt privé ne fonctionnera pas : récupère-le d'abord sur ton ordinateur, puis choisis « Un dossier ».",
    },
    placeholder: {
      directory: '/Users/moi/mon-projet',
      file: '/Users/moi/mon-projet/src/orders.controller.ts',
      github: 'https://github.com/utilisateur/projet',
    },
    missingTarget: 'Indique ce que tu veux analyser pour continuer.',
    scopeLegend: 'Quelle étendue ?',
    fullTitle: 'Tout le projet',
    fullHelp: "Plus long et plus coûteux, mais rien n'est laissé de côté. À faire la première fois.",
    incrementalTitle: 'Seulement ce qui a changé',
    incrementalHelp:
      "Beaucoup plus rapide et moins cher : on ne revérifie que les parties modifiées depuis une version donnée. C'est le mode du quotidien.",
    commitLabel: 'Depuis quelle version ?',
    commitHelp:
      "L'identifiant de l'enregistrement à partir duquel comparer. Si tu ne le connais pas, laisse vide : tout le projet sera analysé, et on te le dira.",
    commitPlaceholder: 'laisser vide si tu ne sais pas',
    submit: 'Estimer puis analyser',
    submitBusy: 'Un instant...',
    reassurance:
      "Rien n'est lancé tout de suite : on te montre d'abord le temps et le coût que ça représente.",
  },
  estimate: {
    title: 'Avant de lancer : voilà ce que ça représente',
    kicker: 'Estimation',
    time: 'Temps',
    cost: 'Coût',
    routes: 'Adresses vérifiées',
    calls: "Appels à l'IA",
    routesHint: (free, billed) => `${free} sans IA, ${billed} avec`,
    callsHint: "c'est le seul poste facturé",
    costFree: 'Gratuit',
    costUnknown: 'Non chiffrable',
    costUnknownHint: 'tarif non renseigné',
    costHint: 'une estimation, pas une facture',
    lessThanCent: "moins d'un centime",
    targetKind: { directory: 'Dossier', file: 'Fichier seul', github: 'Dépôt GitHub' },
    targetLine: (files, routes) => `${files} fichier(s) lu(s), ${routes} adresse(s) trouvée(s)`,
    incrementalNote: 'seulement ce qui a changé',
    detailShow: 'Sur quoi repose cette estimation ?',
    detailHide: 'Masquer',
    detailIntro:
      "Ce n'est pas une devinette : on a réellement lu ton code, relié les morceaux entre eux et préparé les questions à poser à l'IA. La seule chose qu'on n'a pas faite, c'est poser les questions — c'est la seule étape payante.",
    detailSampled: (size) =>
      ` Les ${size} premières adresses ont été mesurées en vrai, le reste est extrapolé.`,
    volume: (thousands) => `Volume estimé : environ ${thousands} millier(s) de mots-machine traités.`,
    confirm: "Lancer l'analyse",
    confirmBusy: 'Lancement...',
    nothingToScan: 'Rien à analyser',
    cancel: 'Changer de cible',
    estimating:
      "On lit ton code pour chiffrer le travail. Rien n'est dépensé pendant cette étape.",
  },
  live: {
    title: 'Analyse en cours',
    finished: 'Analyse terminée',
    examining: 'On examine',
    progress: (done, total) => `${done} adresse(s) sur ${total}`,
    countersAlerts: 'problème(s) probable(s)',
    countersGrey: 'à faire vérifier',
    countersSafe: 'sans souci',
    countersCalls: "appel(s) à l'IA",
    countersFree: (n) => ` · ${n} verdict(s) gratuit(s)`,
    countersSpent: 'dépensé',
    countersNotReported: ' (non communiqué)',
    waiting: 'Les premiers verdicts vont apparaître ici, adresse par adresse.',
    feedLabel: "Verdicts au fil de l'eau",
    zoneSafe: 'Rien à signaler',
    zoneGrey: 'À faire vérifier',
    zoneAlert: 'Problème probable',
    zoneFailed: 'Pas pu être vérifiée',
  },
  timeline: {
    heading: 'Les grandes étapes',
    headingDone: "Ce qui s'est passé",
    empty: "L'analyse va démarrer. Tu verras ici, étape par étape, ce qui est en train d'être vérifié.",
    showDetail: 'Voir le détail technique',
    hideDetail: 'Masquer le détail technique',
    statusRunning: 'en cours',
    statusDone: 'terminé',
    statusFailed: 'problème rencontré',
    statusSkipped: 'étape sautée',
    statusPending: 'en attente',
    of: (done, total) => `${done} sur ${total}`,
    fallback: "Une étape de l'analyse est en cours...",
  },
  steps: {
    received: {
      label: 'Demande reçue',
      icon: '📥',
      running: "On enregistre ta demande d'analyse...",
      done: "Demande bien reçue. C'est parti.",
      failed: "On n'a pas pu prendre en compte ta demande.",
      why: "On note ta demande et on la met dans la file. Si plusieurs analyses tournent en même temps, chacune garde sa place.",
      analogy: 'Comme prendre un ticket en arrivant chez le médecin.',
    },
    indexing: {
      label: 'Lecture de ton code',
      icon: '📖',
      running:
        'On lit la structure de ton code pour repérer toutes les pages et adresses de ton application...',
      done: 'On a fait le tour de ton application.',
      failed: "On n'a pas réussi à lire ton code. L'analyse s'arrête ici.",
      why: "Avant de chercher des failles, il faut savoir ce qu'il y a à protéger. On dresse la liste de toutes les adresses de ton application : chaque page, chaque bouton qui va chercher des données.",
      analogy:
        "Comme faire le tour d'une maison pour compter les portes et les fenêtres avant de vérifier les serrures.",
    },
    context_server: {
      label: 'Mise en relation',
      icon: '🔗',
      running:
        'On relie les morceaux de code entre eux pour comprendre ce que chaque page fait vraiment...',
      done: 'Les liens entre les différentes parties de ton code sont établis.',
      failed: "Les liens entre les parties de ton code n'ont pas pu être établis.",
      why: "Une adresse toute seule ne dit rien. Il faut suivre ce qu'elle déclenche : quelle donnée elle va chercher, et si une protection s'exécute avant. On reconstitue ce parcours complet.",
      analogy:
        "Comme suivre un fil électrique de l'interrupteur jusqu'à l'ampoule pour comprendre ce qu'il commande.",
    },
    detection: {
      label: 'Recherche de failles',
      icon: '🔍',
      running:
        "On vérifie que personne ne peut consulter les données d'un autre utilisateur en changeant un numéro dans l'adresse...",
      done: 'Toutes les adresses de ton application ont été vérifiées.',
      failed: "Certaines adresses n'ont pas pu être vérifiées : le scan est incomplet.",
      why: "C'est le cœur du travail. Pour chaque adresse, on regarde si quelqu'un pourrait accéder à des données qui ne lui appartiennent pas. Les cas évidents sont tranchés sans intelligence artificielle, pour ne rien te facturer inutilement.",
      analogy: "Comme essayer soi-même les poignées pour voir lesquelles s'ouvrent sans clé.",
    },
    aggregation: {
      label: 'Tri des résultats',
      icon: '🧹',
      running: 'On regroupe les signalements, on écarte les doublons et les fausses pistes évidentes...',
      done: 'Le tri est fait : il ne reste que ce qui mérite un examen.',
      failed: 'Le tri des résultats a échoué.',
      why: "Plusieurs vérifications peuvent signaler le même problème, et certains signalements portent sur du code de test qui ne tourne jamais en vrai. On nettoie tout ça pour ne garder que ce qui compte.",
      analogy: 'Comme trier son courrier : on jette les publicités avant de lire le reste.',
    },
    master_review: {
      label: 'Seconde relecture',
      icon: '🧠',
      running:
        'Une seconde intelligence, plus poussée, relit les points restants pour éliminer les fausses alertes...',
      done: 'La relecture est terminée.',
      failed:
        "La relecture n'a pas pu aller au bout : certains points sont affichés sans seconde vérification.",
      why: "Les vérifications rapides se trompent parfois. Une intelligence plus poussée relit les cas douteux en regardant le vrai code, et écarte les fausses alertes. C'est ce qui évite de te déranger pour rien.",
      analogy: 'Comme demander un second avis avant une décision importante.',
    },
    report: {
      label: 'Ton rapport',
      icon: '📝',
      running: 'On rédige ton rapport en français simple...',
      done: 'Ton rapport est prêt.',
      failed: "L'analyse s'est interrompue avant de produire un rapport complet.",
      why: "On traduit tout en français courant : ce qu'un attaquant pourrait faire concrètement, et dans quelle direction chercher la correction.",
      analogy: 'Comme un compte rendu écrit pour toi, pas pour un autre spécialiste.',
    },
  },
  explainer: {
    title: "Comment fonctionne l'analyse",
    intro: "Comment on s'y prend",
    lede: "Sept étapes, de la lecture de ton code au rapport rédigé pour toi. Ouvre celle que tu veux pour voir à quoi elle sert.",
    now: 'en cours',
    show: 'À quoi ça sert ?',
    hide: 'Masquer',
    costTitle: "Pourquoi ça ne coûte presque rien",
    costBody:
      "La plupart des adresses de ton application sont tranchées par des vérifications automatiques gratuites. Seuls les cas réellement douteux sont soumis à une intelligence artificielle, et seuls les plus ambigus vont jusqu'à la seconde relecture, plus coûteuse. Tu vois le détail exact de ce qui a été consommé à la fin de chaque analyse.",
  },
  report: {
    heading: 'Ton rapport',
    securityIssue: 'Problème de sécurité',
    whatToDo: "Ce qu'il faut faire : ",
    noticeNotArbitrated:
      "Ce point n'a pas pu être revérifié une seconde fois. Il est affiché tel quel : fais-le confirmer par quelqu'un avant de conclure.",
    noticeNeedsHuman:
      "La seconde relecture n'a pas pu trancher : il manque des éléments dans ton code pour être certain. Une vérification humaine est nécessaire.",
    noticeSummaryOnly:
      "Ce point a été revérifié sans accès complet au code : à prendre avec prudence.",
    showTechnical: 'Voir le détail technique',
    hideTechnical: 'Masquer le détail technique',
    whyVerdict: 'Pourquoi ce verdict',
    referenceCategory: 'Catégorie de référence',
  },
  usage: {
    heading: 'Ce que ce scan a consommé',
    calls: 'analyse(s) par IA',
    cost: 'coût',
    compute: 'de calcul',
    showDetail: 'Voir le détail de la consommation',
    hideDetail: 'Masquer le détail de la consommation',
    byStage: 'Par étape',
    stage: 'Étape',
    callsColumn: 'Appels',
    input: 'Entrée',
    output: 'Sortie',
    thinking: 'Réflexion',
    costColumn: 'Coût',
    notReported: 'non communiqué par le fournisseur',
    free: 'gratuit',
    byModel: 'Par modèle',
    model: 'Modèle',
    partial: 'partiel',
    stages: { detection: 'Recherche de failles', master_review: 'Seconde relecture' },
  },
  providers: {
    heading: "Quel moteur d'IA ?",
    intro:
      "Deux rôles, réglés séparément. La détection fait le gros du travail ; la seconde relecture ne voit que les cas douteux.",
    detectionRole: 'Recherche de failles',
    detectionHelp: "Tourne sur chaque adresse. C'est là qu'est le volume — et le coût.",
    arbitrationRole: 'Seconde relecture',
    arbitrationHelp: 'Ne voit que les cas douteux. Ça vaut le coup de mettre le plus capable ici.',
    model: 'Modèle (facultatif)',
    modelPlaceholder: 'modèle par défaut',
    unavailable: "clé d'accès absente",
    keyMissing: ' — clé manquante',
    cannotUse: (why) => `Ce fournisseur ne peut pas être utilisé pour l'instant : ${why}`,
    apply: 'Appliquer',
    applying: 'Application...',
    lockedDuringScan: "Un scan est en cours : le réglage est figé jusqu'à la fin.",
    names: {
      gemini: 'Google Gemini',
      ollama: 'Ollama (sur ta machine)',
      anthropic: 'Claude (Anthropic)',
      openai: 'OpenAI',
      openrouter: 'OpenRouter',
      custom: 'Serveur personnalisé',
    },
    descriptions: {
      gemini: 'Rapide et peu coûteux. Une clé suffit.',
      ollama: 'Gratuit et privé : rien ne sort de ton ordinateur.',
      anthropic: 'Le plus fiable pour trancher les cas ambigus.',
      openai: 'Modèles GPT.',
      openrouter: 'Accès à de nombreux modèles, dont des gratuits.',
      custom: 'Tout serveur compatible OpenAI que tu héberges.',
    },
  },
  severity: {
    critical: {
      label: 'À corriger vite',
      explanation: "Si quelqu'un s'en aperçoit, les dégâts peuvent être immédiats et importants.",
    },
    high: {
      label: 'À corriger vite',
      explanation: "Si quelqu'un s'en aperçoit, les dégâts peuvent être immédiats et importants.",
    },
    medium: {
      label: 'À surveiller',
      explanation: "Ce n'est pas une urgence, mais ça vaut le coup d'y jeter un œil.",
    },
    low: { label: 'Mineur', explanation: 'Impact limité, à traiter quand tu auras le temps.' },
    info: {
      label: 'Pour information',
      explanation: "Rien à corriger, c'est signalé pour ta connaissance.",
    },
  },
  glossary: {
    IDOR: "Un visiteur peut accéder aux données de quelqu'un d'autre simplement en changeant un numéro dans l'adresse de la page.",
    SQLI: "Un visiteur peut faire exécuter ses propres ordres à la base de données de ton application.",
    XSS: "Un visiteur peut glisser du code qui s'exécutera dans le navigateur des autres visiteurs.",
    SSRF: "Un visiteur peut forcer ton serveur à aller chercher des pages ou des données auxquelles il ne devrait pas accéder.",
    SECURITY_MISCONFIGURATION:
      'Un réglage de sécurité est absent ou mal posé, ce qui laisse une porte ouverte.',
    OWASP:
      'Une organisation qui publie la liste de référence des failles de sécurité les plus courantes sur le web.',
    'A01:2021 – Broken Access Control':
      "Catégorie de référence : les contrôles qui décident « qui a le droit de voir quoi » sont insuffisants.",
  },
  errors: {
    unreachable: "Impossible de joindre le service d'analyse. Vérifie qu'il est bien démarré.",
    generic: "L'opération n'a pas pu aboutir.",
    streamLost: "Le suivi en direct s'est interrompu. Le résultat reste consultable.",
    scanInterrupted: "L'analyse s'est interrompue avant d'avoir produit un rapport.",
  },
  restart: 'Lancer une autre analyse',
};

const CATALOG: Record<Locale, Dictionary> = { en: EN, fr: FR };

export function dictionary(locale: Locale): Dictionary {
  return CATALOG[locale];
}

export const STEP_ORDER: StepName[] = [
  'received',
  'indexing',
  'context_server',
  'detection',
  'aggregation',
  'master_review',
  'report',
];
