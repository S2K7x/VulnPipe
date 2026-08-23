# Journal des nuits

## 2026-08-23

**Sujet** : sixième variante du même faux négatif silencieux dans le scanner
IDOR déterministe — cette fois `extractCallArguments` retrouvait toujours la
PREMIÈRE occurrence du nom de méthode sur la ligne, sans distinguer DEUX
appels du même nom sur la MÊME ligne.

**Résultat** : PR ouverte (branche `claude/exciting-volta-s170so`).

**Ce que j'ai appris** :
- `main` et cette branche étaient déjà vertes au démarrage (378/378,
  typecheck propre) : pas de suite rouge cette nuit, direct à la priorité 2
  (bug réel et reproductible).
- Les cinq correctifs précédents (2026-08-18 à 2026-08-22) avaient
  progressivement bordé `extractCallArguments`/`mentionsUserScope` sur le
  "où" chercher (avant/après l'appel), le "quoi" (préfixe de méthode,
  identifiant entier plutôt que sous-chaîne) et le "dans quel texte"
  (retirer les commentaires avant, pas après, la recherche du nom). Aucun
  des cinq ne traitait le "combien de fois" : `fromCallLine.indexOf(methodName)`
  cherche la PREMIÈRE occurrence du nom sur la ligne, sans savoir laquelle
  des N occurrences correspond à L'APPEL EN COURS D'EXAMEN. Repéré en
  relisant `scanForIdor` avec cette question précise plutôt que par lecture
  exhaustive du fichier (le journal du 2026-08-22 notait explicitement ne
  pas avoir cherché de sixième variante par ce moyen-là — j'ai pris une piste
  différente : chercher ce que les cinq correctifs précédents n'avaient
  jamais posé comme question).
- Reproduit par le même patron que les cinq nuits précédentes : un
  `resolved_calls` construit à la main, deux appels `findOne` sur la même
  ligne (`this.db.logs.findOne({ userId }); return
  this.db.orders.findOne({ id });`), le premier filtré (log d'audit), le
  second non filtré (la vraie lecture de la ressource). Test écrit d'abord,
  vérifié rouge (`has_unscoped_data_access: false`,
  `has_user_scoped_data_access: true`, `decisive_score: 0.1`) via un script
  jetable (`npx tsx` sur un probe dans le scratchpad) avant d'écrire le test
  définitif.
- Corrigé en faisant compter, pour chaque triplet (corps englobant, ligne,
  nom d'appel), combien d'occurrences de ce triplet ont déjà été vues au fil
  du parcours de `sites` dans `scanForIdor`, et en passant ce compteur à
  `extractCallArguments` comme index d'occurrence à cibler (recherche
  répétée avec `indexOf(methodName, searchFrom)` au lieu d'un simple
  premier match). Ça repose sur une hypothèse déjà implicite ailleurs dans ce
  fichier et non remise en cause cette nuit : l'ordre de `resolved_calls`
  reflète l'ordre d'apparition dans le code source. Je ne l'ai pas vérifiée
  contre le vrai indexeur Tree-sitter (hors du périmètre d'un correctif d'une
  nuit sur le scanner) — seulement contre le patron déjà utilisé par les 6
  tests de cette famille, où l'ordre du tableau construit à la main
  correspond à l'ordre du texte.
- Vérifié que les 6 correctifs précédents de cette famille restent verts
  ensemble : 379/379, aucun n'a régressé.

**À ne pas refaire** :
- Ne pas ajouter d'index de colonne dans `ResolvedCall` "pour régler ça
  proprement" sans en discuter d'abord : ce serait toucher l'indexeur/le
  resolver des Phases 1-2, hors du périmètre d'un correctif d'une nuit sur
  le scanner, et l'architecture de `ResolvedCall` (ligne seule, pas de
  colonne) est une décision déjà en place, pas un oubli signalé comme tel.
  Le compteur d'occurrences résout le cas réel sans y toucher.
- Je n'ai pas cherché de septième variante par lecture manuelle exhaustive
  du reste du scanner : comme les nuits précédentes, le temps restant a été
  utilisé à vérifier que ce correctif ne régresse rien plutôt qu'à une
  chasse plus large sans piste concrète. Le vrai correctif de fond reste, six
  nuits de suite maintenant, un suivi de flux de données réel plutôt qu'un
  pattern-matching textuel sur le code source — hors de portée d'un
  changement d'une nuit. Si une septième variante existe, elle vivra
  probablement dans le même angle mort : une hypothèse implicite sur la
  FORME du texte source que le pattern-matching n'a jamais vérifiée.

**Vérifications exécutées** :
```
npm run typecheck   # 0 erreur
npm test             # 379/379 verts (378 avant + 1 nouveau test, aucun ignoré/affaibli)
npm run build         # web/dist généré, 313,99 kB / 98,31 kB gzip
```
Aucun script consommant du quota LLM n'a été lancé (bench/measure/report/e2e) :
le changement est entièrement couvert par un test hors-ligne qui construit son
propre bundle de contexte et n'appelle aucun modèle.

**Note sur l'environnement de la nuit** : `node_modules` n'existait pas au
démarrage (même situation que les nuits précédentes) — `npm ci` explicite
nécessaire avant toute vérification. Contrairement aux nuits du 2026-08-20 au
2026-08-22, `origin/main` est ici directement à jour avec la branche de
départ (`d6acaeb`, PR #13 déjà fusionnée) : rien à signaler côté écart de
branche cette fois.

## 2026-08-22

**Sujet** : cinquième variante du même faux négatif silencieux dans le
scanner IDOR déterministe — cette fois `extractCallArguments` capturait les
arguments d'un COMMENTAIRE mentionnant l'appel, au lieu de l'appel réel.

**Résultat** : PR ouverte (branche `claude/exciting-volta-ro8ohl`).

**Ce que j'ai appris** :
- Les quatre correctifs précédents (2026-08-18 à 2026-08-21) ont progressivement
  resserré la question "où chercher le filtre utilisateur" (fenêtre avant vs
  après l'appel, nom de méthode exact vs préfixe, sous-chaîne vs identifiant
  entier) — mais tous opéraient sur `enclosingCode` sans jamais en retirer les
  commentaires AVANT de localiser l'appel lui-même. `stripComments` existe
  bien dans ce fichier, mais n'est appliqué que dans `mentionsUserScope`, sur
  le texte DÉJÀ extrait par `extractCallArguments` — trop tard : si un
  commentaire `/* ... */` précède l'appel réel sur la MÊME ligne et mentionne
  le nom de la méthode suivi de parenthèses (une trace d'ancienne version
  filtrée, une explication laissée par relecture, ou un commentaire généré
  par un assistant IA décrivant "avant/après"), `extractCallArguments` trouve
  la première occurrence du nom de méthode DANS le commentaire et capture ses
  parenthèses — le texte du commentaire, pas celui de l'appel.
- Reproduit avec le même patron que les quatre nuits précédentes : un
  `resolved_calls` construit à la main, un seul site d'accès isolé
  (`return /* old: findOne({ id, userId }) */ this.db.orders.findOne({ id });`,
  où l'appel réel ne filtre rien). Test écrit d'abord, vérifié rouge
  (`has_unscoped_data_access: false`, `has_user_scoped_data_access: true`,
  `decisive_score: 0.1`) avant tout correctif — confirmé aussi par un script
  jetable (`npx tsx`) reproduisant le bundle avant d'écrire le test définitif.
- Corrigé en ajoutant `stripCommentsPreserveLines` : comme `stripComments`,
  mais remplace chaque caractère de commentaire par un espace au lieu de
  collabler tout le commentaire en un seul espace — ça préserve la longueur
  ET les sauts de ligne. `extractCallArguments` l'applique à `enclosingCode`
  AVANT de découper en lignes et de chercher le nom de méthode, au lieu
  d'opérer sur le texte brut. Le `stripComments` existant (collabant les
  sauts de ligne) aurait décalé `enclosingStartLine`/`callLine` et cassé
  l'indexation par ligne — d'où une fonction séparée plutôt qu'une
  réutilisation directe.
- Vérifié que les 5 correctifs précédents de cette famille restent verts
  ensemble : 378/378, aucun n'a régressé.

**À ne pas refaire** :
- Ne pas fusionner `stripComments` et `stripCommentsPreserveLines` "pour
  éviter la duplication" : le premier est utilisé là où seule la présence
  d'un motif compte (peu importe les lignes), le second là où les numéros de
  ligne doivent rester exacts. Les confondre réintroduirait soit ce bug, soit
  le risque de décalage de ligne que la fonction séparée évite justement.
- Je n'ai pas cherché de sixième variante par lecture manuelle exhaustive du
  reste du scanner : comme les nuits précédentes, le temps restant a été
  utilisé à vérifier que ce correctif ne régresse rien plutôt qu'à une chasse
  plus large sans piste concrète. Le vrai correctif de fond reste, comme noté
  cinq nuits de suite maintenant, un suivi de flux de données réel plutôt
  qu'un pattern-matching textuel sur le code source — hors de portée d'un
  changement d'une nuit.

**Vérifications exécutées** :
```
npm run typecheck   # 0 erreur
npm test             # 378/378 verts (377 avant + 1 nouveau test, aucun ignoré/affaibli)
npm run build         # web/dist généré, 314 kB / 98 kB gzip
```
Aucun script consommant du quota LLM n'a été lancé (bench/measure/report/e2e) :
le changement est entièrement couvert par un test hors-ligne qui construit son
propre bundle de contexte et n'appelle aucun modèle.

**Note sur l'environnement de la nuit** : `node_modules` n'existait pas au
démarrage (même situation que la nuit du 2026-08-21) — `npm ci` explicite
nécessaire avant toute vérification. `origin/main` reste très en retard sur
cette branche (2 commits contre l'historique cumulé complet ici) ; comme noté
la nuit précédente, c'est un écart de process antérieur à ces nuits, hors du
périmètre d'un correctif d'une nuit.

## 2026-08-21

**Sujet** : quatrième variante du même faux négatif silencieux dans le
scanner IDOR déterministe — cette fois `mentionsUserScope` matchait "userid"
en SOUS-CHAÎNE d'un identifiant plus long (`userIdFilter`) au lieu de
comparer l'identifiant entier.

**Résultat** : PR ouverte (branche `claude/exciting-volta-je2wwg`).

**Ce que j'ai appris** :
- Le correctif de la nuit du 2026-08-20 (`extractCallArguments`) a bien réglé
  la question de PORTÉE : chercher le filtre utilisateur uniquement dans les
  arguments réels de l'appel, jamais avant ni après. Mais une fois ce texte
  isolé, `mentionsUserScope` le normalisait encore en un seul bloc de
  caractères sans ponctuation (`{ id, userIdFilter }` -> `iduseridfilter`)
  puis cherchait `"userid"` en SOUS-CHAÎNE. N'importe quel identifiant qui
  CONTIENT cette sous-chaîne matchait donc, y compris un nom de variable
  comme `userIdFilter` construit ailleurs par une fonction séparée
  (`buildFilter(id)`) qui ne filtre peut-être sur rien du tout. Le
  `ROADMAP.md` prédisait littéralement ce cas dans ses limitations restantes
  ("un identifiant utilisateur passé en argument mais jamais réellement
  branché sur le filtre... resterait invisible") sans qu'un test ne
  l'exerce — je l'ai pris comme piste de la nuit plutôt que d'en inventer une.
- Reproduit par le même patron que les nuits précédentes : un
  `resolved_calls` construit à la main avec un seul site d'accès isolé
  (`this.db.orders.findOne(userIdFilter)`, où `userIdFilter` vient d'un appel
  à `buildFilter(id)` non résolu). Test écrit d'abord, vérifié rouge
  (`has_unscoped_data_access: false`, `decisive_score: 0.1`) avant tout
  correctif.
- Corrigé en remplaçant la comparaison par sous-chaîne par une comparaison
  par IDENTIFIANT ENTIER : le texte des arguments est découpé en chaînes
  `a.b.c` (points compris, pour ne pas casser `req.user.id`), et pour chacune
  seul le DERNIER segment (`userId` dans `filter.userId`) ou les DEUX
  DERNIERS segments collés (`user`+`id` dans `req.user.id`, où l'identité est
  répartie sur deux niveaux d'accès) sont comparés — jamais une sous-chaîne
  d'un identifiant plus long. Vérifié que ça ne casse aucun des 4 correctifs
  précédents de ce fichier : `req.user.id` matche toujours (via les deux
  derniers segments), `{ id, userId }` matche toujours (dernier segment),
  `userIdFilter` ne matche plus.

**À ne pas refaire** :
- Ne pas revenir à une normalisation "tout en un bloc + sous-chaîne" pour
  simplifier le code : c'est précisément ce format qui a produit ce
  quatrième faux négatif de la même famille (avant l'appel, nom de méthode,
  après l'appel, et maintenant sous-chaîne d'identifiant).
- Le vrai correctif de fond reste, comme noté les nuits précédentes, un
  suivi de flux de données réel — savoir si `userIdFilter` a été construit à
  partir du champ d'identité, pas seulement s'il porte un nom qui y
  ressemble. Hors de portée d'un changement d'une nuit : ça demanderait de
  résoudre le corps de `buildFilter` et de suivre ce qu'il fait de son
  argument, ce que ni l'indexeur ni le resolver ne font aujourd'hui.
- Je n'ai PAS cherché d'autres variantes de ce bug par lecture manuelle du
  reste du scanner : le temps restant a été mis dans la vérification que ce
  correctif précis ne régresse aucun des tests existants plutôt que dans une
  chasse plus large sans piste concrète.

**Vérifications exécutées** :
```
npm run typecheck   # 0 erreur
npm test             # 377/377 verts (376 avant + 1 nouveau test, aucun ignoré/affaibli)
npm run build         # web/dist généré, 314 kB / 98 kB gzip
```
Aucun script consommant du quota LLM n'a été lancé (bench/measure/report/e2e) :
le changement est entièrement couvert par un test hors-ligne qui construit son
propre bundle de contexte et n'appelle aucun modèle.

**Note sur l'environnement de la nuit** : `node_modules` n'existait pas au
démarrage du conteneur (`npm run typecheck` échouait sur `Cannot find type
definition file for 'node'`) — un `npm ci` explicite était nécessaire avant
toute vérification. Séparément : `origin/main` (2 commits : "Initial commit"
+ "refactor: move phase docs") est très en retard sur cette branche, qui
contient 25 commits d'historique cumulé (dont plusieurs PR de nuits
précédentes fermées sans fusion sur GitHub, #1 à #11, alors que leur contenu
est déjà présent ici). `origin/main` reste un ancêtre direct de cette branche
(`git merge-base` le confirme) : pas de conflit, juste un écart de process
antérieur à cette nuit, non résolu ici — hors du périmètre d'un correctif
d'une nuit, et je n'ai pas de PR ouverte pour cette branche à comparer.

## 2026-08-20

**Sujet** : troisième variante du même faux négatif silencieux dans le
scanner IDOR déterministe — cette fois la fenêtre de vérification du filtre
regardait trop loin APRÈS l'appel, au lieu de trop loin AVANT (nuit du
2026-08-18) ou du mauvais nom de méthode (nuit du 2026-08-19).

**Résultat** : PR ouverte (branche `claude/exciting-volta-151mvl`).

**Ce que j'ai appris** :
- `extractCallWindow` (`src/nodes/idor/scanner.ts`) prenait les 4 lignes qui
  suivent la ligne de l'appel, pour couvrir un littéral d'objet multi-lignes
  (`findOne({\n  id,\n  userId,\n})`). Mais une fenêtre en nombre de lignes ne
  sait pas distinguer "dans les arguments de CET appel" de "dans
  l'instruction suivante, sans rapport". `this.db.orders.findOne({ id })`
  (aucun filtre) suivi deux lignes plus bas d'un
  `logger.log('accessed by ' + req.user.id)` — un log d'accès banal, sans
  aucun lien avec la requête — faisait matcher "userid" dans la fenêtre et
  déclenchait `decisive_score: 0.1` ("sain"), sur une route réellement
  vulnérable. Exactement le défaut que ce garde-fou est censé éviter :
  `decisive_score` court-circuite le LLM, donc personne — humain ou modèle —
  ne revoit jamais cette route.
- Reproduit par un bundle de contexte synthétique (même patron que les tests
  précédents : un `resolved_calls` construit à la main plutôt qu'un vrai
  fichier indexé), avec un seul site d'accès isolé pour être sûr que rien
  d'autre ne rattrape le faux négatif. Test écrit d'abord, vérifié rouge
  (`has_unscoped_data_access: false`, `decisive_score: 0.1`) avant tout
  correctif.
- Corrigé en remplaçant la fenêtre à distance fixe par un appariement de
  parenthèses (`extractCallArguments`) : on part du nom de méthode sur la
  ligne de l'appel, on trouve la parenthèse ouvrante, puis on capture
  jusqu'à sa fermeture correspondante (en ignorant les parenthèses à
  l'intérieur de chaînes/template literals). Ça couvre toujours un littéral
  multi-lignes, mais plus rien après la fermeture de l'appel ne compte —
  la question n'était pas "combien de lignes", c'était "qu'est-ce que
  l'appel reçoit réellement". `SCOPE_WINDOW_LINES` a disparu : il n'y a
  plus de distance arbitraire à régler dans un sens ou dans l'autre.
- Si le nom de méthode n'apparaît pas dans le texte disponible (contexte
  tronqué, forme inattendue), la fonction renvoie une chaîne vide — direction
  sûre déjà retenue les nuits précédentes : dans le doute, la requête est vue
  comme non filtrée, jamais l'inverse.

**À ne pas refaire** :
- Ne pas revenir à une fenêtre en nombre de lignes "pour plus de simplicité"
  sans rouvrir ce raisonnement, ni dans un sens ni dans l'autre : c'est
  précisément ce format qui a produit trois faux négatifs de suite (avant,
  puis nom de méthode, puis après).
- Le vrai correctif de fond reste, comme noté les nuits précédentes, un
  suivi de flux de données plutôt qu'un pattern-matching textuel sur les
  arguments — hors de portée d'un changement d'une nuit. L'appariement de
  parenthèses réduit la classe de faux négatifs "texte à proximité sans
  rapport", il ne l'élimine pas : un identifiant utilisateur passé en
  argument mais jamais réellement branché sur le filtre côté ORM (rare, mais
  possible avec un objet construit ailleurs et passé par variable) resterait
  invisible à ce stade.

**Vérifications exécutées** :
```
npm run typecheck   # 0 erreur
npm test             # 376/376 verts (375 avant + 1 nouveau test, aucun ignoré/affaibli)
npm run build         # web/dist généré, 314 kB / 98 kB gzip
```
Aucun script consommant du quota LLM n'a été lancé (bench/measure/report/e2e) :
le changement est entièrement couvert par un test hors-ligne qui construit son
propre bundle de contexte et n'appelle aucun modèle.

**Note sur l'environnement de la nuit** : au démarrage, `origin/main` en
cache local ne pointait pas encore sur les PR déjà fusionnées (#4 à #10) —
un `git fetch origin main` explicite était nécessaire avant de partir d'une
base à jour. Pas un bug du dépôt, juste une trace pour la nuit suivante si le
même flottement de ref apparaît.

## 2026-08-19

**Sujet** : le scanner IDOR déterministe pouvait encore classer une route
vulnérable comme "saine" sans jamais consulter le LLM — cette fois à cause
d'une liste de noms de méthode exacts qui ratait les conventions ORM
composées.

**Résultat** : PR ouverte (branche `claude/exciting-volta-x4wscq`).

**Ce que j'ai appris** :
- `isDataAccess()` (`src/nodes/idor/scanner.ts`) comparait le nom de chaque
  appel à une liste FIGÉE de noms exacts (`findone`, `findbyid`, `getbyid`...).
  Un nom de méthode réel mais absent de la liste — `findOneBy` (TypeORM),
  `findByIdAndUpdate` (Mongoose), et toute variante composée du même genre —
  n'était pas reconnu comme un accès aux données : `collectDataAccessSites`
  le voyait bien, mais la boucle principale de `scanForIdor` l'ignorait
  purement et simplement (`if (!isDataAccess(...)) continue;`).
- Conséquence : si la MÊME méthode contient à la fois un appel reconnu et
  filtré (ex. `this.db.logs.findOne({ userId })`, pour un log d'accès) et un
  appel non reconnu et NON filtré (ex. `this.db.orders.findOneBy({ id })`,
  la vraie lecture de la ressource), le scanner ne voit que le premier. Le
  garde-fou `scoped && !unscoped && !hasUnresolvedGuard` conclut alors
  `decisive_score: 0.1` ("sain", coût nul) alors que la route est réellement
  vulnérable. Exactement la même famille de faux négatif silencieux que le
  bug corrigé hier soir (voir entrée du 2026-08-18) — cette fois sur le nom
  de la méthode plutôt que sur la fenêtre de recherche du filtre.
- Corrigé en remplaçant la comparaison par égalité exacte par une
  comparaison de PRÉFIXE sur le même jeu de verbes (`find`, `get`, `query`,
  `select`, `fetch`, `load`, `update`, `delete`, `remove`, `destroy`, `save`).
  Tous les noms de la fixture (`findById`, `findOne`) commencent déjà par un
  de ces verbes : aucune régression sur les cas existants, vérifié par les
  283 tests déjà en place plus le nouveau.
- Un faux positif introduit par le préfixe (un nom métier qui commence par
  "get" sans être une requête base) ne peut plus produire un verdict "sain"
  à tort : au pire il ajoute un site "non reconnu comme filtré" qui pousse la
  route en zone grise (coût LLM en plus), jamais l'inverse. C'est la
  direction sûre déjà retenue hier soir.

**À ne pas refaire** :
- Ne pas revenir à une liste de noms exacts "pour plus de précision" sans
  rouvrir ce raisonnement : c'est précisément ce qui a permis à `findOneBy`
  de passer inaperçu.
- Je n'ai PAS tenté d'énumérer davantage de noms ORM exacts (`findBy`,
  `updateOne`, `deleteMany`, méthodes d'agrégation...) : une liste, même
  élargie, reste un jeu au chat et à la souris avec les conventions de nommage
  réelles. Le préfixe couvre la famille au lieu d'un nom précis, mais reste
  heuristique par construction — un verbe métier qui ne commence par aucun de
  ces préfixes (rare mais possible) resterait invisible. Le vrai correctif de
  fond, déjà noté dans `ROADMAP.md`, est un suivi de flux de données plutôt
  qu'un filtre sur le nom de la méthode ; hors de portée d'un changement d'une
  nuit.

**Vérifications exécutées** :
```
npm run typecheck   # 0 erreur
npm test             # 284/284 verts (283 avant + 1 nouveau test, aucun ignoré/affaibli)
npm run build         # web/dist généré, 293 kB / 91 kB gzip
```
Aucun script consommant du quota LLM n'a été lancé (bench/measure/report/e2e) :
le changement est entièrement couvert par les tests hors-ligne (`FakeLlmClient`)
et par un test unitaire du scanner qui n'appelle aucun modèle.

## 2026-08-19

**Sujet** : en mode `incremental_scan`, un commit qui ne touchait qu'un service
ne faisait réanalyser aucune route — VulnPipe répondait « rien à revérifier »
sur le commit qui venait justement d'introduire la faille.

**Résultat** : PR ouverte (branche `nightly/2026-08-19-incremental-service-deps`).

**Ce que j'ai appris** :
- La condition de rattachement dans `selectRoutes` (`src/orchestration/pipeline.ts`)
  était `fichier.includes(route.controller)`. `route.controller` est le NOM DE
  CLASSE (`OrderController`), le fichier est un CHEMIN (`src/order.controller.ts`) :
  la condition ne pouvait jamais être vraie. Ce n'était pas une heuristique
  faible, c'était du code mort — et son commentaire affirmait le contraire
  (« un service modifié rend vulnérables les routes qui l'appellent »). Un
  commentaire qui décrit une intention non implémentée est pire qu'une absence
  de commentaire : il empêche de relire la ligne.
- Le mode incrémental n'avait AUCUN test sur son chemin nominal. Les trois
  tests existants couvraient uniquement les replis (pas de commit, diff
  incalculable), c'est-à-dire les cas où la fonction ne sélectionne rien. Le
  seul endroit capable de produire un faux négatif — décider ce qu'on
  n'analyse PAS — n'était vérifié nulle part. Leçon générale : un test sur les
  branches d'échec d'une fonction de filtrage ne dit rien de son filtre.
- Créer un vrai dépôt git jetable dans un test est bon marché : `git init` +
  deux commits, hors ligne, ~40 ms pour cinq dépôts. Pas besoin de simuler
  `git diff` — c'est justement l'accord entre la forme réelle de sa sortie et
  nos chemins qui cassait.
- `git diff --name-only` renvoie des chemins relatifs à la RACINE DU DÉPÔT,
  pas au `cwd` passé à `execFileSync`. Nos `route.file` sont relatifs à la
  racine INDEXÉE. Sur un monorepo dont on n'indexe qu'un paquet, plus rien ne
  correspondait — deuxième faux négatif, silencieux lui aussi. `--relative`
  aligne les deux et exclut au passage ce qui est hors du dossier indexé.
- `injection_map` (indexeur, Phase 1) suffit à relier une route à ses services,
  transitivement, sans aucun appel LLM ni relecture du disque. Le contexte
  nécessaire existait déjà dans l'index ; il n'était pas consulté.

**À ne pas refaire** :
- Ne pas rétablir de rattachement par ressemblance de noms (chemin contre nom
  de classe, ou `order` contre `OrderController`). C'est ce qui a masqué le
  bug : ça a l'air d'un lien, ça n'en est pas un. L'index sait qui appelle
  qui — il faut le lui demander.
- Piste écartée : traiter un fichier modifié non rattaché à une route comme
  « sans effet » et rester en incrémental. Moins coûteux, mais c'est
  exactement le raisonnement « dans le doute, tout va bien » que ce produit
  ne peut pas se permettre. J'ai pris le repli en scan complet, annoncé par
  un message. Contrepartie assumée et notée dans le ROADMAP : sur un dépôt
  réel, l'incrémental retombera probablement souvent en complet. Il faut le
  MESURER sur un vrai dépôt avant d'affiner — pas le deviner.

**Vérifications exécutées** :
```
npm run typecheck   # 0 erreur
npm test            # 289/289 verts (284 avant + 5 nouveaux, aucun ignoré/affaibli)
npm run build       # web/dist généré, 293 kB / 91 kB gzip
```
Aucun script consommant du quota LLM n'a été lancé (bench/measure/report/e2e) :
la sélection de routes est purement déterministe et se teste hors ligne.

**Note de rebase** : la branche a été rebasée sur `main` après l'arrivée des
PR #2 (page de présentation, réglages) et #3 (préfixes ORM du scanner). Seul
`NIGHTLY_LOG.md` était en conflit — deux nuits datées du même jour, les deux
entrées ont été conservées. Les chiffres ci-dessus sont ceux d'APRÈS rebase ;
les fichiers de code se sont fusionnés sans conflit (les modifications de
`pipeline.ts` par la PR #3 portent sur l'agrégation, pas sur `selectRoutes`).

## 2026-08-18

**Sujet** : le scanner IDOR déterministe pouvait classer une route vulnérable
comme "saine" sans jamais consulter le LLM, à cause d'une vérification de
filtre trop large.

**Résultat** : PR ouverte (branche `claude/exciting-volta-u9ijhz`).

**Ce que j'ai appris** :
- `mentionsUserScope()` (`src/nodes/idor/scanner.ts`) cherchait un champ
  d'identité (`userId`, `ownerId`, ...) dans **tout le corps de la méthode
  englobante** de l'appel base de données, pas seulement près de cet appel.
  Un paramètre `userId` reçu dans la signature mais jamais branché sur le
  filtre — un oubli très courant chez un vibe coder qui a commencé à câbler
  l'ownership check et ne l'a jamais terminé — suffisait à faire matcher le
  texte et à classer `findOne({ id })` comme protégé.
- C'est plus grave qu'un simple faux négatif de LLM : `decisive_score`
  est le chemin qui **court-circuite le LLM**. Un faux positif sur "scoped"
  ici produit une route vulnérable classée saine à coût nul, jamais revue
  par personne — humain ou modèle. C'est exactement le défaut que
  `CLAUDE.md` §3/§4 et le ROADMAP désignent comme le pire possible pour ce
  produit.
- Le test existant ("ne se laisse pas berner par un `req.user.id` utilisé
  seulement pour un log") ne couvrait PAS ce cas : il passait par accident,
  parce que la fixture avait un DEUXIÈME site d'accès (l'appel imbriqué
  `this.db.orders.findOne({ id })` dans `OrderService.findById`) qui restait
  correctement classé "non filtré" et suffisait à empêcher le verdict
  décisif, indépendamment de la mauvaise classification du site parent. Un
  scénario avec un SEUL site d'accès dans la méthode qui reçoit le paramètre
  inutilisé n'était testé nulle part — c'est celui que j'ai ajouté.
- Piste explorée et écartée : faire regarder la fenêtre aussi quelques lignes
  **avant** l'appel (pour reconnaître un `if (!owns) throw` juste au-dessus).
  Abandonné : dans une méthode courte (la majorité des cas réels et de nos
  fixtures), une fenêtre arrière retomberait sur la ligne de signature et
  réintroduirait exactement le bug que je corrige (le paramètre `userId`
  inutilisé redeviendrait visible). Direction retenue : fenêtre strictement
  vers l'avant. Conséquence assumée et documentée dans le ROADMAP — un
  contrôle d'accès écrit en amont de l'appel n'est plus reconnu par le
  scanner déterministe et pousse la route en zone grise (coût LLM) au lieu
  d'un verdict "sain" à coût nul. C'est la direction sûre : dans le doute, on
  demande, on ne conclut jamais à tort qu'une route est protégée.

**À ne pas refaire** :
- Ne pas élargir à nouveau `mentionsUserScope` pour regarder tout le corps de
  la méthode "pour réduire le taux de zone grise" sans re-belier le
  raisonnement ci-dessus : c'est précisément ce qui a causé ce bug.
- Le vrai correctif de fond (suivi de flux de données au lieu d'un
  pattern-matching textuel) n'a pas été tenté cette nuit — hors scope d'un
  changement d'une nuit, nécessiterait de repenser l'indexeur/resolver pour
  exposer les arguments réels d'un appel plutôt qu'un simple nom de méthode
  et une ligne.

**Vérifications exécutées** :
```
npm run typecheck   # 0 erreur
npm test             # 187/187 verts (186 avant + 1 nouveau test, aucun ignoré/affaibli)
npm run build         # web/dist généré, 217 kB / 69 kB gzip
```
Aucun script consommant du quota LLM n'a été lancé (bench/measure/report/e2e) :
le changement est entièrement couvert par les tests hors-ligne (`FakeLlmClient`).
