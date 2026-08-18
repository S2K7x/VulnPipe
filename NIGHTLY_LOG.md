# Journal des nuits

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
