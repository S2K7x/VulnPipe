# VulnPipe — Contexte Projet (CLAUDE.md)

> Ce fichier est la source de vérité du projet. Il doit rester à la racine du repo.
> Chaque session Claude Code doit le lire avant de commencer à coder.

## 1. Mission du produit

VulnPipe est une pipeline de sécurité automatisée, pensée pour les **"vibe coders"** —
développeurs qui livrent du code généré ou co-écrit avec l'IA, sans forcément avoir
un bagage sécurité. Le but : leur donner un scan de sécurité automatique,
compréhensible, et abordable financièrement, à chaque commit.

Deux promesses non négociables :
1. **Low-cost** : la majorité du travail se fait sur des LLM locaux gratuits/open-source.
   L'API payante (Claude) n'intervient que sur les cas ambigus ou critiques.
2. **Compréhensible** : l'utilisateur ne doit jamais lire un JSON brut ou un log
   technique. Chaque étape de la pipeline doit être traduite en langage humain,
   avec une explication du *pourquoi* de chaque alerte.

## 2. Architecture générale (ne pas dévier sans discussion)

```
[ Webhook Git ]
       │
       ▼
[ Node INDEXEUR ]  (Tree-sitter : AST, routes, symbol table, call graph local)
       │  publie un événement "repo indexé"
       ▼
[ Serveur MCP ]  (expose l'index via des tools : get_context(route, depth))
       │
       ├──► [ Node IDOR ]        ┐
       ├──► [ Node XSS ]         │  en parallèle, chacun :
       ├──► [ Node SQLi ]        │  scanner déterministe (pattern/Semgrep)
       ├──► [ Node Sec.Config ]  │  + LLM local (verdict + confidence_score)
       └──► [ Node ... ]         ┘
       │  chaque node retourne un JSON structuré avec confidence_score
       ▼
[ Node AGRÉGATEUR ]  (déterministe, sans LLM)
   - dédup des findings
   - scoring de sévérité (route publique vs /admin/*)
   - filtre : score < 0.4 = rejeté, 0.4-0.7 = zone grise → Claude,
     > 0.7 = validé direct (bypass Claude en option)
       │  n'envoie que 10-15% du volume à Claude
       ▼
[ Master CLAUDE ]  (arbitrage, rédaction du rapport final)
       │
       ▼
[ UI / Rapport ]  (langage humain, pas de JSON brut visible)
```

## 3. Décisions d'architecture déjà tranchées (ne pas rouvrir sans raison forte)

- **Tree-sitter, pas le compilateur TypeScript.** On accepte une résolution de
  liens imparfaite (heuristique) pour rester agnostique au langage (JS/TS
  aujourd'hui, Python/Go plus tard avec le même moteur). Une classe ambiguë
  (deux méthodes `findById` dans deux services différents) est taguée
  `reason: "ambiguous_logic"` et laissée au LLM de trancher — ce n'est pas
  un bug, c'est un choix assumé.
- **Symbol table indexée par `(classe_du_type_injecté, méthode)`**, pas par
  nom de méthode seul, pour réduire les collisions sans réimplémenter un
  TypeChecker.
- **Protocole MCP** entre l'Indexeur et les nodes de détection (pas d'appel
  REST ad-hoc, pas d'A2A pair-à-pair). L'Indexeur = serveur MCP, chaque node
  = client MCP.
- **Confidence score à 3 zones**, pas un simple booléen :
  - `0.0–0.3` → sain, pipeline s'arrête, rien envoyé à Claude
  - `0.4–0.7` → zone grise, envoyé à Claude pour arbitrage
  - `0.8–1.0` → vulnérabilité quasi certaine, alerte directe (option bypass Claude)
- **Deux modes distincts, pricing différent** :
  - `full_scan` (premier scan, pas de diff possible) → chunking par route
    complète via AST, traitement batch, plus lourd, facturé différemment
  - `incremental_scan` (commit normal) → triage par `git diff`, ne réanalyse
    que les routes/fonctions modifiées, c'est le mode "low-cost" du quotidien
- **Chaque verdict de node local sépare deux natures de doute** dans son JSON :
  `reason: "missing_context"` (il manque du code, ex. guard non résolu) vs
  `reason: "ambiguous_logic"` (le contexte est complet mais le jugement métier
  est difficile). Le premier peut déclencher une requête MCP à profondeur
  supérieure avant d'aller voir Claude ; le second va direct à Claude.

## 4. Exigence transversale : l'explicabilité (NON négociable)

**Chaque composant qui produit un output destiné à remonter vers l'utilisateur
doit produire, en plus du JSON technique, un champ `plain_language_summary`.**

Exemple de sortie d'un node, format attendu :

```json
{
  "vulnerability": "IDOR",
  "confidence_score": 0.85,
  "reason": null,
  "plain_language_summary": "La route /orders/:id récupère une commande uniquement par son numéro, sans vérifier qu'elle appartient bien à l'utilisateur connecté. N'importe qui connecté peut donc lire les commandes de n'importe qui d'autre en changeant juste le numéro dans l'URL.",
  "technical_detail": { ... }
}
```

L'UI finale (Phase 6) doit pouvoir afficher `plain_language_summary` à un
non-développeur et qu'il comprenne le risque, sans jamais avoir besoin
d'ouvrir le JSON technique. Le master Claude, en Phase 5, a pour instruction
explicite de rédiger ce résumé en français simple, orienté "qu'est-ce qui
peut m'arriver et comment je corrige", jamais en jargon SAST.

## 5. Stack technique retenue

- **Langage du moteur d'indexation** : Node.js / TypeScript (tree-sitter,
  web-tree-sitter ou bindings natifs selon l'environnement d'exécution)
- **LLM locaux** : Ollama, modèles à définir en Phase 3 (démarrer sur un
  8B, benchmark de recall avant de monter en taille si besoin)
- **Orchestration** : file de messages légère (BullMQ + Redis) — pas de
  Celery/Temporal pour le MVP, trop lourd pour un solo builder
- **Master** : API Anthropic (Claude), appelé uniquement par l'Agrégateur
- **Stockage de l'index** : JSON structuré en V1 (pas de Neo4j tant que le
  volume ne le justifie pas)

## 6. Ce qui n'est PAS dans le scope du MVP

- Pas de couverture complète de l'OWASP Top 10 dès la V1 — on démarre avec
  Injection (SQLi), XSS, IDOR, Security Misconfiguration (les plus
  détectables/rentables), le reste vient après validation du pipeline
- Pas de compilateur TS (ts-morph) — décision prise, voir section 3
- Pas de dashboard multi-tenant / facturation en V1 — un seul repo, usage
  local, avant de penser scale commerciale

## 7. Comment chaque phase doit se comporter

Avant de coder quoi que ce soit dans une phase :
1. Relire ce fichier
2. Relire `ROADMAP.md` pour voir où on en est et ce qui est déjà livré
3. Ne jamais halluciner une API tierce (bindings tree-sitter, SDK Anthropic,
   etc.) — si un doute existe sur la forme exacte d'un retour de fonction,
   écrire un test minimal / un `console.log` de vérification AVANT de
   construire la logique dessus, et le signaler explicitement dans la sortie
4. Chaque phase doit se terminer par des tests exécutables sur un exemple
   concret fourni dans le prompt de phase, pas juste "le code compile"
