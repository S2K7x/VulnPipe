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

import type { IconName } from '../components/Icon.tsx';

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
  /** Icône SVG de l'étape — un nom du jeu maison, jamais un emoji. */
  icon: IconName;
  /** À quoi sert cette étape, pour quelqu'un qui ne code pas. */
  why: string;
  /** Une analogie du quotidien, pour ancrer l'idée sans vocabulaire technique. */
  analogy: string;
}

export interface Dictionary {
  localeName: string;
  app: {
    tagline: string;
    navHome: string;
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
    problemType: string;
    whereLabel: string;
    codeHeading: string;
    codeUnavailable: string;
    codeTruncated: string;
    copyFixPrompt: string;
    copyFixPromptHelp: string;
    copied: string;
    copyFailed: string;
    openInEditor: (editor: string) => string;
    openInEditorHelp: string;
    copyReport: string;
    downloadReport: string;
    exportHelp: string;
    reportCopied: string;
  };
  status: {
    heading: string;
    labels: Record<'open' | 'fixed' | 'accepted' | 'false_positive', string>;
    noteLabel: (status: string) => string;
    notePlaceholder: string;
    noteRequired: string;
    confirm: string;
    cancel: string;
    staleWarning: string;
    summaryHeading: string;
    fixRate: (percent: number) => string;
    nothingToTreat: string;
    dismissedCount: (n: number) => string;
    excludedNote: string;
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
  landing: {
    kicker: string;
    title: string;
    titleEm: string;
    lede: string;
    ctaPrimary: string;
    ctaSecondary: string;
    stats: Array<{ value: string; label: string }>;
    problemKicker: string;
    problemTitle: string;
    problemLede: string;
    problems: Array<{ title: string; body: string }>;
    flowKicker: string;
    flowTitle: string;
    flowLede: string;
    flowCaption: string;
    diagram: {
      localLabel: string;
      cloudLabel: string;
      commit: string;
      commitNote: string;
      indexer: string;
      indexerNote: string;
      mcp: string;
      mcpNote: string;
      nodes: string;
      nodesNote: string;
      aggregator: string;
      aggregatorNote: string;
      master: string;
      masterNote: string;
      report: string;
      reportNote: string;
      free: string;
      billed: string;
      dropped: string;
    };
    stepsKicker: string;
    stepsTitle: string;
    stepsLede: string;
    zonesKicker: string;
    zonesTitle: string;
    zonesLede: string;
    zones: Array<{ range: string; title: string; body: string; tone: 'green' | 'orange' | 'red' }>;
    costKicker: string;
    costTitle: string;
    costLede: string;
    funnel: Array<{ label: string; note: string; share: number }>;
    costPoints: Array<{ title: string; body: string }>;
    coverageKicker: string;
    coverageTitle: string;
    coverageLede: string;
    coverageColumns: { name: string; what: string; status: string };
    coverage: Array<{ name: string; what: string; live: boolean }>;
    statusLive: string;
    statusPlanned: string;
    rulesKicker: string;
    rulesTitle: string;
    rules: Array<{ title: string; body: string }>;
    faqKicker: string;
    faqTitle: string;
    faq: Array<{ q: string; a: string }>;
    finalTitle: string;
    finalBody: string;
    finalCta: string;
  };
  settings: {
    heading: string;
    lede: string;
    savedLocally: string;
    savedOnServer: string;
    scanKicker: string;
    scanTitle: string;
    scanLede: string;
    defaultKindLabel: string;
    defaultKindHelp: string;
    defaultModeLabel: string;
    defaultModeHelp: string;
    rememberTargetLabel: string;
    rememberTargetHelp: string;
    rememberedTargetNone: string;
    forgetTarget: string;
    autoConfirmLabel: string;
    autoConfirmHelp: string;
    autoConfirmOff: string;
    autoConfirmOn: (amount: string) => string;
    arbitrationKicker: string;
    arbitrationTitle: string;
    arbitrationLede: string;
    bypassLabel: string;
    bypassHelp: string;
    bypassWarning: string;
    thresholdsTitle: string;
    thresholdsLede: string;
    displayKicker: string;
    displayTitle: string;
    displayLede: string;
    editorLabel: string;
    editorHelp: string;
    technicalByDefaultLabel: string;
    technicalByDefaultHelp: string;
    explanationsLabel: string;
    explanationsHelp: string;
    languageLabel: string;
    languageHelp: string;
    systemKicker: string;
    systemTitle: string;
    systemLede: string;
    serverLabel: string;
    serverOnline: string;
    serverOffline: string;
    serverChecking: string;
    recheck: string;
    keysTitle: string;
    keysLede: string;
    keyReady: string;
    keyMissing: string;
    resetTitle: string;
    resetHelp: string;
    reset: string;
    resetDone: string;
    on: string;
    off: string;
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
    navHome: 'Overview',
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
      icon: 'inbox',
      running: 'Registering your request...',
      done: 'Request received. Here we go.',
      failed: 'We could not take your request into account.',
      why: 'We log your request and queue it. If several analyses run at once, each keeps its place in line.',
      analogy: 'Like taking a ticket when you walk into a waiting room.',
    },
    indexing: {
      label: 'Reading your code',
      icon: 'book',
      running: 'Reading your code structure to find every page and address in your application...',
      done: 'We covered your whole application.',
      failed: 'We could not read your code. The analysis stops here.',
      why: 'Before hunting for holes, you have to know what there is to protect. We list every address in your application: each page, each button that fetches data.',
      analogy: 'Like walking around a house counting doors and windows before checking the locks.',
    },
    context_server: {
      label: 'Connecting the dots',
      icon: 'link',
      running: 'Linking the pieces of code together to understand what each page really does...',
      done: 'The links between the parts of your code are mapped.',
      failed: 'The links between the parts of your code could not be established.',
      why: 'An address on its own says nothing. You have to follow what it triggers: which data it fetches, and whether a protection runs first. We reconstruct that whole path.',
      analogy: 'Like following a wire from the switch to the bulb to see what it controls.',
    },
    detection: {
      label: 'Hunting for holes',
      icon: 'search',
      running:
        "Checking that nobody can read another user's data just by changing a number in the address...",
      done: 'Every address in your application has been checked.',
      failed: 'Some addresses could not be checked: this scan is incomplete.',
      why: 'This is the core of the work. For each address, we look at whether somebody could reach data that is not theirs. The obvious cases are settled without any AI, so you are not billed for nothing.',
      analogy: 'Like trying the handles yourself to see which ones open without a key.',
    },
    aggregation: {
      label: 'Sorting the results',
      icon: 'filter',
      running: 'Grouping reports, dropping duplicates and obvious false leads...',
      done: 'Sorting done: only what deserves a look is left.',
      failed: 'Sorting the results failed.',
      why: 'Several checks can flag the same problem, and some reports point at test code that never actually runs. We clean all that up so only what matters is kept.',
      analogy: 'Like sorting your mail: you bin the flyers before reading the rest.',
    },
    master_review: {
      label: 'Second opinion',
      icon: 'scale',
      running:
        'A second, more capable intelligence is reviewing the remaining points to rule out false alarms...',
      done: 'The review is complete.',
      failed: 'The review could not finish: some points are shown without a second check.',
      why: 'Quick checks get it wrong sometimes. A more capable intelligence re-reads the doubtful cases against the real code and drops the false alarms. That is what keeps us from bothering you for nothing.',
      analogy: 'Like asking for a second opinion before an important decision.',
    },
    report: {
      label: 'Your report',
      icon: 'document',
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
    problemType: 'Type of problem',
    whereLabel: 'Where',
    codeHeading: 'The code involved',
    codeUnavailable: 'We could not read the code at this spot.',
    codeTruncated: 'Some lines were shortened to stay readable.',
    copyFixPrompt: 'Copy a fix request',
    copyFixPromptHelp:
      'Copies a ready-made request — the code, the diagnosis and what to ask — to paste into the AI assistant you code with.',
    copied: 'Copied',
    copyFailed: 'Copy failed. Select the text and copy it by hand.',
    openInEditor: (editor) => `Open in ${editor}`,
    openInEditorHelp: 'Opens the file at the right line, if that editor is installed.',
    copyReport: 'Copy the report',
    downloadReport: 'Download',
    exportHelp:
      'To keep a record, attach it to a ticket, or show it to someone who can help you.',
    reportCopied: 'Report copied',
  },
  status: {
    heading: 'Status:',
    labels: {
      open: 'to handle',
      fixed: 'fixed',
      accepted: 'risk accepted',
      false_positive: 'false alarm',
    },
    noteLabel: (status) => `Why "${status}"?`,
    notePlaceholder: 'One sentence is enough. Your future self will thank you.',
    noteRequired: 'Say why before setting this status: in six months nobody will remember.',
    confirm: 'Save',
    cancel: 'Cancel',
    staleWarning:
      'You marked this as fixed, but this scan still finds it. Either the fix does not cover this spot, or it has not been applied here.',
    summaryHeading: 'Where you stand',
    fixRate: (percent) => `${percent}% of what needed handling is fixed`,
    nothingToTreat: 'Nothing left to handle.',
    dismissedCount: (n) => `${n} point(s) set aside by you (still shown below)`,
    excludedNote:
      'Points you set aside count neither as fixed nor as remaining: setting a problem aside never improves this figure.',
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
  landing: {
    kicker: 'Automated security pipeline',
    title: 'Ship code.',
    titleEm: 'Not holes.',
    lede:
      'VulnPipe reads the code you write — or the code an AI wrote for you — and tells you, in plain language, where somebody could get to data that is not theirs. No security background required, no raw report to decipher.',
    ctaPrimary: 'Analyze my project',
    ctaSecondary: 'See how it works',
    stats: [
      { value: '7', label: 'steps, all visible while they run' },
      { value: '10-15%', label: 'of findings ever reach the paid model' },
      { value: '0', label: 'lines of JSON you have to read' },
    ],
    problemKicker: 'The problem',
    problemTitle: 'Code ships faster than it gets checked',
    problemLede:
      'Generating a working feature now takes minutes. Reviewing whether it leaks other people’s data still takes a specialist. That gap is where VulnPipe lives.',
    problems: [
      {
        title: 'Working is not the same as safe',
        body: 'A route that returns an order by its number works perfectly in your tests — where you only ever ask for your own orders. Nothing in the tests tells you that number 1042 belongs to somebody else.',
      },
      {
        title: 'Classic tools speak to specialists',
        body: 'Standard scanners output rule identifiers, severity matrices and stack traces. They assume you already know what to do with them. If you do not, the output is noise.',
      },
      {
        title: 'And they cost a fortune to run on every commit',
        body: 'Running a large model over an entire codebase at every push is what makes AI security tools expensive. Most of that work is spent confirming code that was obviously fine.',
      },
    ],
    flowKicker: 'Architecture',
    flowTitle: 'What actually happens to your code',
    flowLede:
      'Your code is read locally, understood as a graph, examined by specialised detectors, then filtered. Only the genuinely ambiguous cases are sent to a paid model — and you see the whole path while it runs.',
    flowCaption:
      'Everything on the left of the filter runs on your machine or on free models. The paid step is the last one, and it only ever sees a shortlist.',
    diagram: {
      localLabel: 'Local — free',
      cloudLabel: 'Paid — shortlist only',
      commit: 'Your code',
      commitNote: 'a folder, a file, or a public repository',
      indexer: 'Indexer',
      indexerNote: 'lists every address, function and call',
      mcp: 'Context server',
      mcpNote: 'serves the surrounding code on demand',
      nodes: 'Detectors',
      nodesNote: 'one per hole type, run in parallel',
      aggregator: 'Filter',
      aggregatorNote: 'deduplicates, scores, routes by confidence',
      master: 'Second opinion',
      masterNote: 'settles the ambiguous cases against the real code',
      report: 'Your report',
      reportNote: 'plain language, technical detail folded',
      free: 'settled for free',
      billed: 'sent to the paid model',
      dropped: 'dropped as noise',
    },
    stepsKicker: 'Step by step',
    stepsTitle: 'The seven steps, explained',
    stepsLede:
      'Each one is announced on screen while it runs, with what it is for. Nothing happens behind a spinner.',
    zonesKicker: 'Confidence',
    zonesTitle: 'Three zones, not a yes/no',
    zonesLede:
      'Every detector returns a confidence score rather than a verdict. That single decision is what keeps the cost down and the false alarms out: certainty is free, doubt is what deserves a second look.',
    zones: [
      {
        range: '0.0 - 0.3',
        title: 'Clean',
        body: 'The check is conclusive on its own. The pipeline stops here, nothing is sent anywhere, nothing is billed.',
        tone: 'green',
      },
      {
        range: '0.4 - 0.7',
        title: 'Grey zone',
        body: 'Either context is missing, or the business logic is genuinely debatable. This is what the second opinion is for — and it is the only thing worth paying for.',
        tone: 'orange',
      },
      {
        range: '0.8 - 1.0',
        title: 'Near certain',
        body: 'The hole is plain in the code. It is reported directly, and can optionally skip the second opinion entirely to save time and money.',
        tone: 'red',
      },
    ],
    costKicker: 'Economics',
    costTitle: 'Why this costs almost nothing',
    costLede:
      'The expensive model is not a scanner, it is a referee. It is called once, at the end, on what survived every free filter before it.',
    funnel: [
      { label: 'Addresses found in your code', note: 'read locally, free', share: 100 },
      { label: 'Suspicious enough to look at', note: 'pattern checks, still free', share: 45 },
      { label: 'Examined by a local or cheap model', note: 'the bulk of the analysis', share: 25 },
      { label: 'Sent to the paid second opinion', note: 'the only billed step', share: 12 },
    ],
    costPoints: [
      {
        title: 'You see the bill before it exists',
        body: 'Every scan starts with an estimate: addresses to check, calls needed, time and cost. Nothing is spent until you accept it.',
      },
      {
        title: 'The obvious cases never reach a model',
        body: 'A route with no user input and no database access is settled by a deterministic check. Free, instant, and impossible to hallucinate.',
      },
      {
        title: 'Two engines, set separately',
        body: 'The detector that runs on every address and the referee that runs once are configured independently — put the cheap model where the volume is.',
      },
      {
        title: 'Everyday scans only look at what changed',
        body: 'After the first full pass, incremental mode re-checks only the routes touched since a given version. That is the mode you live in.',
      },
    ],
    coverageKicker: 'Coverage',
    coverageTitle: 'What we check today',
    coverageLede:
      'We would rather do four things properly than claim ten. Here is the honest state of the detectors — what runs now, and what is next.',
    coverageColumns: { name: 'Check', what: 'What it catches', status: 'Status' },
    coverage: [
      {
        name: 'IDOR',
        what: 'Someone reads or edits another user’s data by changing a number in the address.',
        live: true,
      },
      {
        name: 'SQL injection',
        what: 'Someone makes your database run their own commands through a form or a URL.',
        live: false,
      },
      {
        name: 'XSS',
        what: 'Someone injects code that runs in your other visitors’ browsers.',
        live: false,
      },
      {
        name: 'Security misconfiguration',
        what: 'A protection is missing or misconfigured, leaving a door open.',
        live: false,
      },
    ],
    statusLive: 'Available',
    statusPlanned: 'Planned',
    rulesKicker: 'Our rules',
    rulesTitle: 'Four commitments we design against',
    rules: [
      {
        title: 'Plain language first, always',
        body: 'Every finding carries a human summary: what somebody could actually do, and which direction to fix it. Technical detail exists, but it stays folded until you ask.',
      },
      {
        title: 'An unchecked address is never called safe',
        body: 'If a detector fails on a route, it is reported as a failure. A partial scan that looks complete is worse than no scan.',
      },
      {
        title: 'Your code stays where you put it',
        body: 'Indexing runs on your machine. Detection can run entirely on a local model. A public repository is cloned to a temporary copy and deleted afterwards.',
      },
      {
        title: 'Nothing is spent without your word',
        body: 'The estimate step reads your code and prices the work without calling a single paid model. You decide whether it happens.',
      },
    ],
    faqKicker: 'Questions',
    faqTitle: 'What people ask first',
    faq: [
      {
        q: 'Do I need to understand security to read the report?',
        a: 'No. Every finding is written for someone who does not code: what an attacker could do, and where to look for the fix. Technical terms never appear alone — each one is translated on the spot.',
      },
      {
        q: 'Does my code leave my machine?',
        a: 'Reading and indexing are always local. Whether anything leaves depends on the engine you pick in Settings: a local model keeps everything on your computer, a hosted one sends the relevant snippets of code. A public repository you point us at is cloned temporarily and deleted after the scan.',
      },
      {
        q: 'What does a scan actually cost?',
        a: 'You get the number before you commit to it. Only calls to hosted models are billed; the deterministic checks and any local model are free. Everyday incremental scans usually land in the fractions of a cent.',
      },
      {
        q: 'Will it flood me with false alarms?',
        a: 'That is what the filter and the second opinion exist for. Findings below the confidence floor are dropped, duplicates are merged, and the ambiguous ones are re-read against the real code before you ever see them.',
      },
      {
        q: 'Which languages does it support?',
        a: 'JavaScript and TypeScript today, including Express and NestJS style routes. The engine is language-agnostic by design, so other languages come without rewriting the pipeline.',
      },
    ],
    finalTitle: 'Point it at your project',
    finalBody:
      'You will get an estimate first, then a running commentary, then a report you can actually act on.',
    finalCta: 'Start an analysis',
  },
  settings: {
    heading: 'Settings',
    lede:
      'Everything here changes how the next scan behaves. Nothing is applied to a scan already running.',
    savedLocally: 'Kept in this browser',
    savedOnServer: 'Applied on the server',
    scanKicker: 'Defaults',
    scanTitle: 'How scans start',
    scanLede: 'Prefill the launcher so the everyday scan is one click away.',
    defaultKindLabel: 'What you usually analyze',
    defaultKindHelp: 'The tab preselected when you open the launcher.',
    defaultModeLabel: 'Default scope',
    defaultModeHelp:
      'Full is the right first pass. Once you have one, "only what changed" is faster and much cheaper.',
    rememberTargetLabel: 'Remember the last target',
    rememberTargetHelp:
      'Prefills the launcher with what you analyzed last time. Stored in this browser only.',
    rememberedTargetNone: 'nothing remembered yet',
    forgetTarget: 'Forget it',
    autoConfirmLabel: 'Skip the estimate under',
    autoConfirmHelp:
      'When the estimated cost is below this amount, the analysis starts without asking. Set it to 0 to always confirm by hand.',
    autoConfirmOff: 'Always ask before starting',
    autoConfirmOn: (amount) => `Starts on its own below ${amount}`,
    arbitrationKicker: 'Arbitration',
    arbitrationTitle: 'How findings are routed',
    arbitrationLede:
      'The filter sorts every finding by confidence before anything is billed. These are the thresholds it uses.',
    bypassLabel: 'Report near-certain holes without a second opinion',
    bypassHelp:
      'Findings above 0.7 go straight to your report instead of being re-read by the paid model. Faster and cheaper.',
    bypassWarning:
      'The second opinion is also what writes the plain-language summary. Skipping it gives you a rawer report.',
    thresholdsTitle: 'Confidence thresholds',
    thresholdsLede: 'Fixed by design, shown so you know what happens to a finding.',
    displayKicker: 'Display',
    displayTitle: 'What you see',
    displayLede: 'Reading preferences. They change nothing to what is analyzed.',
    editorLabel: 'My code editor',
    editorHelp:
      'Which editor the "open the file" link on a finding should launch. Nothing is installed or detected: pick the one you use.',
    technicalByDefaultLabel: 'Open technical detail by default',
    technicalByDefaultHelp:
      'Findings normally show the plain summary first. Turn this on if you read the code yourself.',
    explanationsLabel: 'Show "what is this for?" on every step',
    explanationsHelp: 'Keeps the per-step explanations unfolded during a scan.',
    languageLabel: 'Language',
    languageHelp: 'Applies to the interface and to everything the server writes for you.',
    systemKicker: 'System',
    systemTitle: 'Status',
    systemLede: 'What the interface can reach right now.',
    serverLabel: 'Analysis service',
    serverOnline: 'reachable',
    serverOffline: 'unreachable',
    serverChecking: 'checking...',
    recheck: 'Check again',
    keysTitle: 'Engine access',
    keysLede: 'An engine without a key cannot be selected. This is what is configured on the server.',
    keyReady: 'ready',
    keyMissing: 'no key',
    resetTitle: 'Reset',
    resetHelp: 'Clears every preference kept in this browser. Server settings are untouched.',
    reset: 'Reset my preferences',
    resetDone: 'Preferences cleared.',
    on: 'On',
    off: 'Off',
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
    navHome: 'Présentation',
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
      icon: 'inbox',
      running: "On enregistre ta demande d'analyse...",
      done: "Demande bien reçue. C'est parti.",
      failed: "On n'a pas pu prendre en compte ta demande.",
      why: "On note ta demande et on la met dans la file. Si plusieurs analyses tournent en même temps, chacune garde sa place.",
      analogy: 'Comme prendre un ticket en arrivant chez le médecin.',
    },
    indexing: {
      label: 'Lecture de ton code',
      icon: 'book',
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
      icon: 'link',
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
      icon: 'search',
      running:
        "On vérifie que personne ne peut consulter les données d'un autre utilisateur en changeant un numéro dans l'adresse...",
      done: 'Toutes les adresses de ton application ont été vérifiées.',
      failed: "Certaines adresses n'ont pas pu être vérifiées : le scan est incomplet.",
      why: "C'est le cœur du travail. Pour chaque adresse, on regarde si quelqu'un pourrait accéder à des données qui ne lui appartiennent pas. Les cas évidents sont tranchés sans intelligence artificielle, pour ne rien te facturer inutilement.",
      analogy: "Comme essayer soi-même les poignées pour voir lesquelles s'ouvrent sans clé.",
    },
    aggregation: {
      label: 'Tri des résultats',
      icon: 'filter',
      running: 'On regroupe les signalements, on écarte les doublons et les fausses pistes évidentes...',
      done: 'Le tri est fait : il ne reste que ce qui mérite un examen.',
      failed: 'Le tri des résultats a échoué.',
      why: "Plusieurs vérifications peuvent signaler le même problème, et certains signalements portent sur du code de test qui ne tourne jamais en vrai. On nettoie tout ça pour ne garder que ce qui compte.",
      analogy: 'Comme trier son courrier : on jette les publicités avant de lire le reste.',
    },
    master_review: {
      label: 'Seconde relecture',
      icon: 'scale',
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
      icon: 'document',
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
    problemType: 'Type de problème',
    whereLabel: 'Où',
    codeHeading: 'Le code concerné',
    codeUnavailable: "On n'a pas pu relire le code à cet endroit.",
    codeTruncated: 'Certaines lignes ont été raccourcies pour rester lisibles.',
    copyFixPrompt: 'Copier une demande de correction',
    copyFixPromptHelp:
      "Copie une demande toute prête — le code, le diagnostic et ce qu'il faut demander — à coller dans l'assistant IA avec lequel tu codes.",
    copied: 'Copié',
    copyFailed: "La copie n'a pas fonctionné. Sélectionne le texte et copie-le à la main.",
    openInEditor: (editor) => `Ouvrir dans ${editor}`,
    openInEditorHelp: "Ouvre le fichier à la bonne ligne, si cet éditeur est installé.",
    copyReport: 'Copier le rapport',
    downloadReport: 'Télécharger',
    exportHelp:
      "Pour en garder une trace, le joindre à un ticket, ou le montrer à quelqu'un qui peut t'aider.",
    reportCopied: 'Rapport copié',
  },
  status: {
    heading: 'Statut :',
    labels: {
      open: 'à traiter',
      fixed: 'corrigée',
      accepted: 'risque accepté',
      false_positive: 'fausse alerte',
    },
    noteLabel: (status) => `Pourquoi « ${status} » ?`,
    notePlaceholder: 'Une phrase suffit. Le toi de dans six mois te remerciera.',
    noteRequired:
      'Dis pourquoi avant de poser ce statut : dans six mois, personne ne s’en souviendra.',
    confirm: 'Enregistrer',
    cancel: 'Annuler',
    staleWarning:
      'Tu as marqué ce point comme corrigé, mais ce scan le détecte encore. Soit la correction ne couvre pas cet endroit, soit elle n’y a pas été appliquée.',
    summaryHeading: 'Où tu en es',
    fixRate: (percent) => `${percent} % de ce qu’il y avait à traiter est corrigé`,
    nothingToTreat: 'Plus rien à traiter.',
    dismissedCount: (n) => `${n} point(s) écarté(s) par toi (toujours affichés plus bas)`,
    excludedNote:
      'Les points que tu écartes ne comptent ni comme corrigés ni comme restants : écarter un problème ne fait jamais monter ce chiffre.',
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
  landing: {
    kicker: 'Pipeline de sécurité automatisée',
    title: 'Livre ton code.',
    titleEm: 'Pas des failles.',
    lede:
      "VulnPipe lit le code que tu écris — ou celui qu'une IA a écrit pour toi — et te dit, en français simple, où quelqu'un pourrait accéder à des données qui ne sont pas les siennes. Aucune compétence en sécurité requise, aucun rapport brut à déchiffrer.",
    ctaPrimary: 'Analyser mon projet',
    ctaSecondary: 'Voir comment ça marche',
    stats: [
      { value: '7', label: 'étapes, toutes visibles pendant le travail' },
      { value: '10-15 %', label: 'des cas atteignent le modèle payant' },
      { value: '0', label: 'ligne de JSON à lire' },
    ],
    problemKicker: 'Le problème',
    problemTitle: 'Le code sort plus vite qu’il n’est vérifié',
    problemLede:
      "Sortir une fonctionnalité qui marche prend maintenant quelques minutes. Vérifier qu'elle ne laisse pas fuiter les données des autres demande toujours un spécialiste. C'est exactement cet écart que VulnPipe comble.",
    problems: [
      {
        title: 'Ça marche ne veut pas dire c’est sûr',
        body: "Une route qui renvoie une commande par son numéro fonctionne parfaitement dans tes tests — où tu ne demandes jamais que tes propres commandes. Rien ne te dit que le numéro 1042 appartient à quelqu'un d'autre.",
      },
      {
        title: 'Les outils classiques parlent aux spécialistes',
        body: "Les scanners standards sortent des identifiants de règles, des matrices de gravité et des traces d'exécution. Ils supposent que tu sais déjà quoi en faire. Sinon, c'est du bruit.",
      },
      {
        title: 'Et ils coûtent cher à chaque commit',
        body: "Faire tourner un gros modèle sur tout un projet à chaque envoi, c'est ce qui rend les outils de sécurité IA hors de prix. L'essentiel de ce travail sert à confirmer du code manifestement sain.",
      },
    ],
    flowKicker: 'Architecture',
    flowTitle: 'Ce qui arrive réellement à ton code',
    flowLede:
      "Ton code est lu en local, compris comme un graphe, examiné par des détecteurs spécialisés, puis filtré. Seuls les cas réellement ambigus partent vers un modèle payant — et tu vois tout le trajet pendant qu'il se fait.",
    flowCaption:
      "Tout ce qui est à gauche du filtre tourne sur ta machine ou sur des modèles gratuits. L'étape payante est la dernière, et elle ne voit qu'une liste courte.",
    diagram: {
      localLabel: 'En local — gratuit',
      cloudLabel: 'Payant — liste courte',
      commit: 'Ton code',
      commitNote: 'un dossier, un fichier, ou un dépôt public',
      indexer: 'Indexeur',
      indexerNote: 'liste chaque adresse, fonction et appel',
      mcp: 'Serveur de contexte',
      mcpNote: 'sert le code alentour à la demande',
      nodes: 'Détecteurs',
      nodesNote: 'un par type de faille, en parallèle',
      aggregator: 'Filtre',
      aggregatorNote: 'dédoublonne, note, oriente selon la confiance',
      master: 'Second avis',
      masterNote: 'tranche les cas ambigus face au vrai code',
      report: 'Ton rapport',
      reportNote: 'langage clair, détail technique replié',
      free: 'réglé gratuitement',
      billed: 'envoyé au modèle payant',
      dropped: 'écarté comme bruit',
    },
    stepsKicker: 'Étape par étape',
    stepsTitle: 'Les sept étapes, expliquées',
    stepsLede:
      "Chacune est annoncée à l'écran pendant qu'elle tourne, avec ce à quoi elle sert. Rien ne se passe derrière un sablier.",
    zonesKicker: 'Confiance',
    zonesTitle: 'Trois zones, pas un oui/non',
    zonesLede:
      "Chaque détecteur rend un score de confiance plutôt qu'un verdict. C'est cette seule décision qui tient le coût bas et les fausses alertes dehors : la certitude est gratuite, c'est le doute qui mérite un second regard.",
    zones: [
      {
        range: '0.0 - 0.3',
        title: 'Sain',
        body: "La vérification se suffit à elle-même. La pipeline s'arrête là : rien n'est envoyé nulle part, rien n'est facturé.",
        tone: 'green',
      },
      {
        range: '0.4 - 0.7',
        title: 'Zone grise',
        body: "Soit il manque du contexte, soit la logique métier est réellement discutable. C'est à ça que sert le second avis — et c'est la seule chose qui mérite d'être payée.",
        tone: 'orange',
      },
      {
        range: '0.8 - 1.0',
        title: 'Quasi certain',
        body: "La faille est nette dans le code. Elle est remontée directement, et peut au choix sauter le second avis pour gagner du temps et de l'argent.",
        tone: 'red',
      },
    ],
    costKicker: 'Économie',
    costTitle: 'Pourquoi ça ne coûte presque rien',
    costLede:
      "Le modèle cher n'est pas un scanner, c'est un arbitre. Il est appelé une fois, à la fin, sur ce qui a survécu à tous les filtres gratuits.",
    funnel: [
      { label: 'Adresses trouvées dans ton code', note: 'lues en local, gratuit', share: 100 },
      { label: 'Assez suspectes pour être regardées', note: 'vérifications par motifs, gratuit', share: 45 },
      { label: 'Examinées par un modèle local ou bon marché', note: "le gros de l'analyse", share: 25 },
      { label: 'Envoyées au second avis payant', note: 'le seul poste facturé', share: 12 },
    ],
    costPoints: [
      {
        title: 'Tu vois la facture avant qu’elle existe',
        body: "Chaque analyse commence par un devis : adresses à vérifier, appels nécessaires, temps et coût. Rien n'est dépensé tant que tu n'as pas accepté.",
      },
      {
        title: 'Les cas évidents n’atteignent jamais un modèle',
        body: "Une route sans entrée utilisateur ni accès base de données est réglée par une vérification déterministe. Gratuite, immédiate, et impossible à halluciner.",
      },
      {
        title: 'Deux moteurs, réglés séparément',
        body: "Le détecteur qui tourne sur chaque adresse et l'arbitre appelé une fois se configurent indépendamment — mets le modèle bon marché là où il y a du volume.",
      },
      {
        title: 'Au quotidien, on ne regarde que ce qui a changé',
        body: "Après la première passe complète, le mode incrémental ne revérifie que les routes touchées depuis une version donnée. C'est le mode dans lequel tu vis.",
      },
    ],
    coverageKicker: 'Couverture',
    coverageTitle: 'Ce qu’on vérifie aujourd’hui',
    coverageLede:
      "On préfère faire quatre choses correctement que d'en annoncer dix. Voilà l'état honnête des détecteurs : ce qui tourne, et ce qui arrive.",
    coverageColumns: { name: 'Vérification', what: 'Ce que ça attrape', status: 'État' },
    coverage: [
      {
        name: 'IDOR',
        what: "Quelqu'un lit ou modifie les données d'un autre en changeant un numéro dans l'adresse.",
        live: true,
      },
      {
        name: 'Injection SQL',
        what: "Quelqu'un fait exécuter ses propres ordres à ta base de données via un formulaire ou une URL.",
        live: false,
      },
      {
        name: 'XSS',
        what: "Quelqu'un injecte du code qui s'exécute dans le navigateur de tes autres visiteurs.",
        live: false,
      },
      {
        name: 'Mauvaise configuration',
        what: 'Une protection est absente ou mal posée, ce qui laisse une porte ouverte.',
        live: false,
      },
    ],
    statusLive: 'Disponible',
    statusPlanned: 'Prévu',
    rulesKicker: 'Nos règles',
    rulesTitle: 'Quatre engagements qui guident tout le reste',
    rules: [
      {
        title: 'Le langage clair d’abord, toujours',
        body: "Chaque point remonté porte un résumé humain : ce que quelqu'un pourrait réellement faire, et dans quelle direction corriger. Le détail technique existe, mais il reste replié tant que tu ne le demandes pas.",
      },
      {
        title: 'Une adresse non vérifiée n’est jamais déclarée saine',
        body: "Si un détecteur échoue sur une route, c'est annoncé comme un échec. Une analyse partielle qui a l'air complète est pire que pas d'analyse du tout.",
      },
      {
        title: 'Ton code reste où tu l’as mis',
        body: "L'indexation tourne sur ta machine. La détection peut tourner entièrement sur un modèle local. Un dépôt public est cloné dans une copie temporaire, supprimée juste après.",
      },
      {
        title: 'Rien n’est dépensé sans ton accord',
        body: "L'étape de devis lit ton code et chiffre le travail sans appeler un seul modèle payant. C'est toi qui décides si ça a lieu.",
      },
    ],
    faqKicker: 'Questions',
    faqTitle: 'Ce qu’on nous demande en premier',
    faq: [
      {
        q: 'Faut-il s’y connaître en sécurité pour lire le rapport ?',
        a: "Non. Chaque point est écrit pour quelqu'un qui ne code pas : ce qu'un attaquant pourrait faire, et où chercher la correction. Un terme technique n'apparaît jamais seul — il est traduit sur place.",
      },
      {
        q: 'Est-ce que mon code quitte ma machine ?',
        a: "La lecture et l'indexation sont toujours locales. Ce qui sort dépend du moteur choisi dans les réglages : un modèle local garde tout sur ton ordinateur, un modèle hébergé reçoit les extraits de code concernés. Un dépôt public que tu nous indiques est cloné temporairement puis supprimé après l'analyse.",
      },
      {
        q: 'Combien coûte réellement une analyse ?',
        a: "Tu as le chiffre avant de t'engager. Seuls les appels aux modèles hébergés sont facturés ; les vérifications déterministes et un modèle local sont gratuits. Une analyse incrémentale du quotidien tombe généralement sous le centime.",
      },
      {
        q: 'Est-ce que je vais crouler sous les fausses alertes ?',
        a: "C'est précisément le rôle du filtre et du second avis. Ce qui passe sous le seuil de confiance est écarté, les doublons sont fusionnés, et les cas ambigus sont relus face au vrai code avant que tu ne les voies.",
      },
      {
        q: 'Quels langages sont pris en charge ?',
        a: "JavaScript et TypeScript aujourd'hui, routes Express et NestJS comprises. Le moteur est agnostique par conception : d'autres langages arriveront sans réécrire la pipeline.",
      },
    ],
    finalTitle: 'Pointe-le sur ton projet',
    finalBody:
      "Tu auras d'abord un devis, puis un commentaire en direct, puis un rapport sur lequel tu peux réellement agir.",
    finalCta: 'Lancer une analyse',
  },
  settings: {
    heading: 'Réglages',
    lede:
      "Tout ce qui est ici change le comportement de la prochaine analyse. Rien n'est appliqué à une analyse déjà en cours.",
    savedLocally: 'Gardé dans ce navigateur',
    savedOnServer: 'Appliqué sur le serveur',
    scanKicker: 'Valeurs par défaut',
    scanTitle: 'Comment démarrent les analyses',
    scanLede: "Pré-remplis le lanceur pour que l'analyse du quotidien soit à un clic.",
    defaultKindLabel: 'Ce que tu analyses le plus souvent',
    defaultKindHelp: "L'onglet présélectionné à l'ouverture du lanceur.",
    defaultModeLabel: 'Étendue par défaut',
    defaultModeHelp:
      "Le scan complet est la bonne première passe. Une fois qu'elle existe, « seulement ce qui a changé » est plus rapide et bien moins cher.",
    rememberTargetLabel: 'Retenir la dernière cible',
    rememberTargetHelp:
      'Pré-remplit le lanceur avec ce que tu as analysé la dernière fois. Stocké dans ce navigateur uniquement.',
    rememberedTargetNone: 'rien de mémorisé pour le moment',
    forgetTarget: 'Oublier',
    autoConfirmLabel: 'Sauter le devis en dessous de',
    autoConfirmHelp:
      "Quand le coût estimé est sous ce montant, l'analyse démarre sans rien demander. Mets 0 pour toujours confirmer à la main.",
    autoConfirmOff: 'Toujours demander avant de lancer',
    autoConfirmOn: (amount) => `Démarre tout seul en dessous de ${amount}`,
    arbitrationKicker: 'Arbitrage',
    arbitrationTitle: 'Comment les résultats sont orientés',
    arbitrationLede:
      "Le filtre trie chaque résultat par confiance avant que quoi que ce soit ne soit facturé. Voilà les seuils qu'il applique.",
    bypassLabel: 'Remonter les failles quasi certaines sans second avis',
    bypassHelp:
      'Les résultats au-dessus de 0.7 vont directement dans ton rapport au lieu d’être relus par le modèle payant. Plus rapide et moins cher.',
    bypassWarning:
      "Le second avis est aussi ce qui rédige le résumé en langage clair. S'en passer donne un rapport plus brut.",
    thresholdsTitle: 'Seuils de confiance',
    thresholdsLede: "Fixés par conception, affichés pour que tu saches ce qui arrive à un résultat.",
    displayKicker: 'Affichage',
    displayTitle: 'Ce que tu vois',
    displayLede: "Préférences de lecture. Elles ne changent rien à ce qui est analysé.",
    editorLabel: 'Mon éditeur de code',
    editorHelp:
      "Quel éditeur le lien « ouvrir le fichier » d'une faille doit lancer. Rien n'est installé ni détecté : choisis celui que tu utilises.",
    technicalByDefaultLabel: 'Ouvrir le détail technique par défaut',
    technicalByDefaultHelp:
      "Les résultats montrent normalement le résumé clair en premier. Active ceci si tu lis le code toi-même.",
    explanationsLabel: 'Afficher « à quoi ça sert ? » sur chaque étape',
    explanationsHelp: "Garde les explications d'étape dépliées pendant une analyse.",
    languageLabel: 'Langue',
    languageHelp: "S'applique à l'interface et à tout ce que le serveur rédige pour toi.",
    systemKicker: 'Système',
    systemTitle: 'État',
    systemLede: "Ce que l'interface arrive à joindre en ce moment.",
    serverLabel: "Service d'analyse",
    serverOnline: 'joignable',
    serverOffline: 'injoignable',
    serverChecking: 'vérification...',
    recheck: 'Revérifier',
    keysTitle: 'Accès aux moteurs',
    keysLede: "Un moteur sans clé ne peut pas être sélectionné. Voilà ce qui est configuré sur le serveur.",
    keyReady: 'prêt',
    keyMissing: 'pas de clé',
    resetTitle: 'Réinitialiser',
    resetHelp: "Efface toutes les préférences gardées dans ce navigateur. Les réglages serveur ne bougent pas.",
    reset: 'Réinitialiser mes préférences',
    resetDone: 'Préférences effacées.',
    on: 'Activé',
    off: 'Désactivé',
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
