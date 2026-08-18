/**
 * Import à effet de bord : charge `.env` dès l'évaluation du module.
 *
 * À importer EN PREMIER dans un point d'entrée :
 *
 *     import '../src/config/load-env.ts';
 *     import { ... } from './autre-chose.ts';
 *
 * Pourquoi ce module plutôt qu'un simple appel à `loadEnv()` en haut du
 * fichier : les imports ES sont hissés. Écrire
 *
 *     import { loadEnv } from './env.ts';
 *     loadEnv();                        // <- s'exécute APRÈS
 *     import { createClient } from './client.ts';
 *
 * exécute `createClient`'s module AVANT `loadEnv()`. Tant qu'aucun module ne
 * lit `process.env` à son évaluation, ça marche par chance ; le jour où l'un
 * s'y met, la panne est un « clé absente » incompréhensible. L'ordre
 * d'évaluation des imports à effet de bord, lui, est garanti.
 */

import { loadEnv } from './env.ts';

export const dotenv = loadEnv();
