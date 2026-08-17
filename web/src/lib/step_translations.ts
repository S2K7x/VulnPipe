/**
 * Table de correspondance : étape technique -> langage courant.
 *
 * Exigence de PHASE_6 : « PAS "Node IDOR: running", mais "On vérifie que
 * personne ne peut voir les données des autres utilisateurs..." ». Table
 * séparée pour être enrichie sans toucher aux composants.
 *
 * AJOUT : la spec ne prévoit que `running | done`. Une étape peut échouer, et
 * l'utilisateur doit le lire — sinon un scan interrompu ressemble à un scan
 * propre. Chaque étape a donc aussi un texte d'échec.
 */

export type StepName =
  | 'received'
  | 'indexing'
  | 'context_server'
  | 'detection'
  | 'aggregation'
  | 'master_review'
  | 'report';

export type StepStatus = 'running' | 'done' | 'failed' | 'skipped';

export interface StepTranslation {
  /** Titre court affiché dans la timeline. */
  label: string;
  running: string;
  done: string;
  failed: string;
  /** Pictogramme, pour repérer l'étape d'un coup d'œil. */
  icon: string;
  /**
   * À quoi sert cette étape, pour quelqu'un qui ne code pas.
   *
   * Le persona cible ne sait pas ce qu'est un index, un serveur de contexte ou
   * un arbitrage. Sans ces deux champs, la timeline défile sans qu'il
   * comprenne ce qui se passe — et une progression qu'on ne comprend pas
   * n'inspire aucune confiance dans le résultat.
   */
  why: string;
  /** Une analogie du quotidien, pour ancrer l'idée sans vocabulaire technique. */
  analogy: string;
}

export const STEP_TRANSLATIONS: Record<StepName, StepTranslation> = {
  received: {
    label: 'Demande reçue',
    icon: '📥',
    running: "On enregistre ta demande d'analyse...",
    done: "Demande bien reçue. C'est parti.",
    failed: "On n'a pas pu prendre en compte ta demande.",
    why:
      "On note ta demande et on la met dans la file. Si plusieurs analyses tournent en même temps, chacune garde sa place.",
    analogy:
      "Comme prendre un ticket en arrivant chez le médecin.",
  },
  indexing: {
    label: 'Lecture de ton code',
    icon: '📖',
    running: 'On lit la structure de ton code pour repérer toutes les pages et adresses de ton application...',
    done: 'On a fait le tour de ton application.',
    failed: "On n'a pas réussi à lire ton code. L'analyse s'arrête ici.",
    why:
      "Avant de chercher des failles, il faut savoir ce qu'il y a à protéger. On dresse la liste de toutes les adresses de ton application : chaque page, chaque bouton qui va chercher des données.",
    analogy:
      "Comme faire le tour d'une maison pour compter les portes et les fenêtres avant de vérifier les serrures.",
  },
  context_server: {
    label: 'Mise en relation',
    icon: '🔗',
    running: 'On relie les morceaux de code entre eux pour comprendre ce que chaque page fait vraiment...',
    done: 'Les liens entre les différentes parties de ton code sont établis.',
    failed: "Les liens entre les parties de ton code n'ont pas pu être établis.",
    why:
      "Une adresse toute seule ne dit rien. Il faut suivre ce qu'elle déclenche : quelle donnée elle va chercher, et si une protection s'exécute avant. On reconstitue ce parcours complet.",
    analogy:
      "Comme suivre un fil électrique de l'interrupteur jusqu'à l'ampoule pour comprendre ce qu'il commande.",
  },
  detection: {
    label: 'Recherche de failles',
    icon: '🔍',
    running: "On vérifie que personne ne peut consulter les données d'un autre utilisateur en changeant un numéro dans l'adresse...",
    done: 'Toutes les adresses de ton application ont été vérifiées.',
    failed: "Certaines adresses n'ont pas pu être vérifiées : le scan est incomplet.",
    why:
      "C'est le cœur du travail. Pour chaque adresse, on regarde si quelqu'un pourrait accéder à des données qui ne lui appartiennent pas. Les cas évidents sont tranchés sans intelligence artificielle, pour ne rien te facturer inutilement.",
    analogy:
      "Comme essayer soi-même les poignées pour voir lesquelles s'ouvrent sans clé.",
  },
  aggregation: {
    label: 'Tri des résultats',
    icon: '🧹',
    running: 'On regroupe les signalements, on écarte les doublons et les fausses pistes évidentes...',
    done: 'Le tri est fait : il ne reste que ce qui mérite un examen.',
    failed: "Le tri des résultats a échoué.",
    why:
      "Plusieurs vérifications peuvent signaler le même problème, et certains signalements portent sur du code de test qui ne tourne jamais en vrai. On nettoie tout ça pour ne garder que ce qui compte.",
    analogy:
      "Comme trier son courrier : on jette les publicités avant de lire le reste.",
  },
  master_review: {
    label: 'Seconde relecture',
    icon: '🧠',
    running: 'Une seconde intelligence, plus poussée, relit les points restants pour éliminer les fausses alertes...',
    done: 'La relecture est terminée.',
    failed: "La relecture n'a pas pu aller au bout : certains points sont affichés sans seconde vérification.",
    why:
      "Les vérifications rapides se trompent parfois. Une intelligence plus poussée relit les cas douteux en regardant le vrai code, et écarte les fausses alertes. C'est ce qui évite de te déranger pour rien.",
    analogy:
      "Comme demander un second avis avant une décision importante.",
  },
  report: {
    label: 'Ton rapport',
    icon: '📝',
    running: 'On rédige ton rapport en français simple...',
    done: 'Ton rapport est prêt.',
    failed: "L'analyse s'est interrompue avant de produire un rapport complet.",
    why:
      "On traduit tout en français courant : ce qu'un attaquant pourrait faire concrètement, et dans quelle direction chercher la correction.",
    analogy:
      "Comme un compte rendu écrit pour toi, pas pour un autre spécialiste.",
  },
};

/** Ordre d'affichage de la timeline, indépendant de l'ordre d'arrivée. */
export const STEP_ORDER: StepName[] = [
  'received',
  'indexing',
  'context_server',
  'detection',
  'aggregation',
  'master_review',
  'report',
];

export function translateStep(step: StepName, status: StepStatus): string {
  const translation = STEP_TRANSLATIONS[step];
  if (!translation) return "Une étape de l'analyse est en cours...";
  if (status === 'failed') return translation.failed;
  if (status === 'done') return translation.done;
  if (status === 'skipped') return translation.done;
  return translation.running;
}

/**
 * Glossaire des termes techniques.
 *
 * Contrainte de design de PHASE_6 : « le nom technique peut apparaître, mais
 * toujours accompagné de sa traduction en langage simple juste à côté, jamais
 * seul ». Ce glossaire alimente les info-bulles.
 */
export const GLOSSARY: Record<string, string> = {
  IDOR: "Un visiteur peut accéder aux données de quelqu'un d'autre simplement en changeant un numéro dans l'adresse de la page.",
  SQLI: "Un visiteur peut faire exécuter ses propres ordres à la base de données de ton application.",
  XSS: "Un visiteur peut glisser du code qui s'exécutera dans le navigateur des autres visiteurs.",
  SSRF: "Un visiteur peut forcer ton serveur à aller chercher des pages ou des données auxquelles il ne devrait pas accéder.",
  SECURITY_MISCONFIGURATION: "Un réglage de sécurité est absent ou mal posé, ce qui laisse une porte ouverte.",
  OWASP: "Une organisation qui publie la liste de référence des failles de sécurité les plus courantes sur le web.",
  'A01:2021 – Broken Access Control':
    "Catégorie de référence : les contrôles qui décident « qui a le droit de voir quoi » sont insuffisants.",
};

/** Traduction d'un terme technique, ou null s'il n'est pas au glossaire. */
export function explainTerm(term: string): string | null {
  if (GLOSSARY[term]) return GLOSSARY[term]!;
  const upper = term.toUpperCase();
  return GLOSSARY[upper] ?? null;
}

/** Libellés des niveaux de gravité, côté utilisateur. */
export const SEVERITY_LABELS: Record<string, { label: string; explanation: string; tone: 'red' | 'orange' | 'grey' }> = {
  critical: {
    label: 'À corriger vite',
    explanation: "Si quelqu'un s'en aperçoit, les dégâts peuvent être immédiats et importants.",
    tone: 'red',
  },
  high: {
    label: 'À corriger vite',
    explanation: "Si quelqu'un s'en aperçoit, les dégâts peuvent être immédiats et importants.",
    tone: 'red',
  },
  medium: {
    label: 'À surveiller',
    explanation: "Ce n'est pas une urgence, mais ça vaut le coup d'y jeter un œil.",
    tone: 'orange',
  },
  low: {
    label: 'Mineur',
    explanation: 'Impact limité, à traiter quand tu auras le temps.',
    tone: 'grey',
  },
  info: {
    label: 'Pour information',
    explanation: "Rien à corriger, c'est signalé pour ta connaissance.",
    tone: 'grey',
  },
};
