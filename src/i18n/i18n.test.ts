/**
 * Le basculement de langue doit être RÉEL, pas décoratif.
 *
 * Une traduction se vérifie sur deux points seulement, mais impérativement :
 *  - la même information sort dans les deux langues (pas de trou) ;
 *  - l'anglais est bien le défaut, y compris quand rien n'est demandé.
 */

import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, LOCALES, normalizeLocale, plural } from './locale.ts';
import { messages } from './messages.ts';
import { aggregate } from '../aggregator/aggregator.ts';
import { buildReport } from '../master/report-builder.ts';
import { UsageTracker } from '../orchestration/usage-tracker.ts';
import { classifyTarget, TargetError } from '../orchestration/scan-target.ts';
import { describeProviders } from '../nodes/shared/llm/factory.ts';
import { humanDuration } from '../orchestration/estimator.ts';

describe('normalizeLocale', () => {
  it("retombe sur l'anglais plutôt que d'échouer", () => {
    // Une langue non prise en charge n'est pas une erreur : c'est un défaut.
    for (const input of [undefined, null, '', 'de', 'klingon', 42, {}]) {
      expect(normalizeLocale(input)).toBe('en');
    }
  });

  it('accepte les variantes régionales', () => {
    for (const input of ['fr', 'FR', 'fr-FR', 'fr_CA', ' fr ']) {
      expect(normalizeLocale(input)).toBe('fr');
    }
    expect(normalizeLocale('en-GB')).toBe('en');
  });

  it("l'anglais est la langue par défaut du produit", () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });
});

describe('catalogue', () => {
  it('couvre les deux langues sans trou', () => {
    // Le typage garantit déjà la complétude à la compilation ; ce test attrape
    // le cas qu'il ne voit pas : une clé traduite par une chaîne vide.
    const walk = (node: unknown, path: string): void => {
      if (typeof node === 'string') {
        expect(node.length, `${path} est vide`).toBeGreaterThan(0);
        return;
      }
      if (typeof node === 'function') return;
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        walk(value, `${path}.${key}`);
      }
    };
    for (const locale of LOCALES) walk(messages(locale), locale);
  });

  it('ne laisse aucune phrase identique par accident entre les deux langues', () => {
    // Deux langues qui rendent exactement la même phrase longue signalent
    // presque toujours une traduction oubliée, copiée depuis l'autre.
    const en = messages('en').scan;
    const fr = messages('fr').scan;
    for (const key of ['received', 'contextDone', 'reportRunning'] as const) {
      expect(en[key]).not.toBe(fr[key]);
    }
  });
});

describe('plural', () => {
  it('accorde au-delà de un', () => {
    expect(plural(1, 'address', 'addresses')).toBe('address');
    expect(plural(2, 'address', 'addresses')).toBe('addresses');
    // Zéro prend le singulier en français comme en anglais courant.
    expect(plural(0, 'address', 'addresses')).toBe('address');
  });
});

describe('les modules produisent bien la langue demandée', () => {
  it('agrégateur', () => {
    expect(aggregate([]).plain_language_summary).toContain('detectors reported no security issue');
    expect(aggregate([], { locale: 'fr' }).plain_language_summary).toContain(
      "Aucun problème de sécurité"
    );
  });

  it('rapport final', () => {
    const empty = {
      arbitrated: [],
      unarbitrated: [],
      provider: 'fake',
      model: 'fake',
      usage: { input_tokens: 0, output_tokens: 0, calls: 0, latency_ms: 0 },
    } as never;
    expect(buildReport(aggregate([]), empty).scan_summary.plain_language_intro).toContain(
      'Good news'
    );
    expect(
      buildReport(aggregate([]), empty, { locale: 'fr' }).scan_summary.plain_language_intro
    ).toContain('Bonne nouvelle');
  });

  it('consommation', () => {
    expect(new UsageTracker().report().plain_language_summary).toContain('no artificial intelligence');
    expect(new UsageTracker('fr').report().plain_language_summary).toContain(
      'aucune intelligence artificielle'
    );
  });

  it('durées', () => {
    expect(humanDuration(90, 'en')).toBe('2 minutes');
    expect(humanDuration(90, 'fr')).toBe('2 minutes');
    expect(humanDuration(12, 'en')).toBe('12 seconds');
    expect(humanDuration(12, 'fr')).toBe('12 secondes');
  });

  it('refus de cible', () => {
    const messageFor = (locale: 'en' | 'fr'): string => {
      try {
        classifyTarget('chemin/inexistant/xyz', process.cwd(), locale);
        return '';
      } catch (error) {
        return (error as TargetError).plainLanguageSummary;
      }
    };
    expect(messageFor('en')).toContain('does not exist on your computer');
    expect(messageFor('fr')).toContain("n'existe pas sur ton ordinateur");
  });

  it('disponibilité des fournisseurs', () => {
    const why = (locale: 'en' | 'fr'): string =>
      describeProviders({}, locale).find((p) => p.id === 'gemini')!.why!;
    expect(why('en')).toBe('GEMINI_API_KEY is missing from your .env file.');
    expect(why('fr')).toBe('GEMINI_API_KEY absente du fichier .env.');
  });
});
