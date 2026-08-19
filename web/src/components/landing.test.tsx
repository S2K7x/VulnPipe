/**
 * @vitest-environment jsdom
 */
/**
 * Tests de la page de présentation, du jeu d'icônes et des réglages.
 *
 * Trois affirmations qui, si elles cassent, cassent une promesse du produit :
 *   1. plus AUCUN emoji n'est rendu à l'écran (exigence de cette itération) ;
 *   2. la présentation dit la même chose que la pipeline réelle — les sept
 *      étapes affichées sont celles du catalogue, pas un texte recopié ;
 *   3. les réglages qui engagent de l'argent sont annoncés comme tels et
 *      partent bien vers le serveur.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { screen, cleanup, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { render, renderIn } from '../test-utils.tsx';
import { LandingPage } from './LandingPage.tsx';
import { SettingsPage } from './SettingsPage.tsx';
import { Icon } from './Icon.tsx';
import { ScanTimeline, type StepEvent } from './ScanTimeline.tsx';
import { LiveActivity } from './LiveActivity.tsx';
import { stepTranslations } from '../lib/step_translations.ts';
import { dictionary } from '../i18n/dictionary.ts';
import { DEFAULT_PREFERENCES, resetPreferences, sanitize } from '../lib/preferences.ts';
import { api } from '../lib/api.ts';

afterEach(() => {
  cleanup();
  resetPreferences();
  vi.restoreAllMocks();
});

/**
 * Plages Unicode des emoji couramment employés dans une interface.
 *
 * Le test ne cherche pas « l'emoji qu'on avait mis » mais TOUTE la famille :
 * une régression réintroduirait un autre symbole, pas exactement le même.
 */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{23E9}-\u{23FA}]/u;

describe('Jeu d’icônes', () => {
  it('rend un tracé SVG, pas un caractère', () => {
    const { container } = render(<Icon name="shield-check" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelector('path')?.getAttribute('d')).toBeTruthy();
    // Le tracé prend la couleur du texte : c'est ce qui permet à la charte de
    // décider, et non au système d'exploitation.
    expect(svg!.getAttribute('stroke')).toBe('currentColor');
  });

  it('est décorative par défaut, annoncée seulement si on la nomme', () => {
    const { container, rerender } = render(<Icon name="check" />);
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');

    rerender(<Icon name="check" title="done" />);
    expect(screen.getByRole('img', { name: 'done' })).toBeTruthy();
  });
});

describe('Absence d’emoji à l’écran', () => {
  const timelineEvents: StepEvent[] = [
    { run_id: 'r', seq: 1, step: 'indexing', status: 'done', plain_language: 'Read.', at: '' },
    { run_id: 'r', seq: 2, step: 'detection', status: 'failed', plain_language: 'Oops.', at: '' },
    { run_id: 'r', seq: 3, step: 'report', status: 'running', plain_language: 'Writing.', at: '' },
  ];

  it('la timeline n’affiche aucun emoji, dans les deux langues', () => {
    for (const locale of ['en', 'fr'] as const) {
      const { container, unmount } = renderIn(
        locale,
        <ScanTimeline events={timelineEvents} showTechnicalDetail showExplanations />
      );
      expect(container.textContent ?? '').not.toMatch(EMOJI);
      unmount();
    }
  });

  it('le suivi en direct n’affiche aucun emoji, verdicts compris', () => {
    const events: StepEvent[] = [
      {
        run_id: 'r',
        seq: 1,
        step: 'detection',
        status: 'running',
        plain_language: 'Anyone can read another order.',
        at: '',
        route: { http_method: 'GET', route: '/orders/:id' },
        verdict: {
          vulnerability: 'IDOR',
          confidence_score: 0.9,
          zone: 'alerte',
          free: false,
          plain_language_summary: 'Anyone can read another order.',
        },
      },
    ];
    const { container } = render(
      <LiveActivity events={events} currentStep="detection" running expectedRoutes={1} />
    );
    expect(container.textContent ?? '').not.toMatch(EMOJI);
  });

  it('la page de présentation n’affiche aucun emoji, dans les deux langues', () => {
    for (const locale of ['en', 'fr'] as const) {
      const { container, unmount } = renderIn(locale, <LandingPage onStart={() => {}} />);
      expect(container.textContent ?? '').not.toMatch(EMOJI);
      unmount();
    }
  });

  it('aucune icône d’étape du catalogue n’est un emoji', () => {
    for (const locale of ['en', 'fr'] as const) {
      for (const step of Object.values(stepTranslations(locale))) {
        expect(step.icon).not.toMatch(EMOJI);
        // Un nom d'icône, pas un caractère isolé.
        expect(step.icon.length).toBeGreaterThan(2);
      }
    }
  });
});

describe('Page de présentation', () => {
  it('décrit les sept étapes réelles de la pipeline', () => {
    render(<LandingPage onStart={() => {}} />);
    for (const step of Object.values(stepTranslations('en'))) {
      expect(screen.getAllByText(step.label).length).toBeGreaterThan(0);
      // Le « à quoi ça sert » est visible d'emblée : c'est le contenu qui
      // justifie la page, il ne doit pas être caché derrière un dépliant.
      expect(screen.getByText(step.why)).toBeTruthy();
    }
  });

  it('montre les trois zones de confiance avec leurs bornes', () => {
    render(<LandingPage onStart={() => {}} />);
    for (const zone of dictionary('en').landing.zones) {
      expect(screen.getAllByText(zone.range).length).toBeGreaterThan(0);
      expect(screen.getAllByText(zone.title).length).toBeGreaterThan(0);
    }
  });

  it('dit ce qui est disponible et ce qui ne l’est pas', () => {
    render(<LandingPage onStart={() => {}} />);
    const l = dictionary('en').landing;
    // Un seul détecteur livré aujourd'hui : la page ne doit pas laisser
    // croire que les quatre tournent.
    expect(screen.getAllByText(l.statusLive)).toHaveLength(1);
    expect(screen.getAllByText(l.statusPlanned)).toHaveLength(3);
  });

  it('emmène vers le lanceur depuis les deux appels à l’action', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<LandingPage onStart={onStart} />);
    const l = dictionary('en').landing;

    await user.click(screen.getByRole('button', { name: new RegExp(l.ctaPrimary, 'i') }));
    await user.click(screen.getByRole('button', { name: new RegExp(l.finalCta, 'i') }));
    expect(onStart).toHaveBeenCalledTimes(2);
  });

  it('bascule entièrement en français', () => {
    renderIn('fr', <LandingPage onStart={() => {}} />);
    expect(screen.getByText(dictionary('fr').landing.lede)).toBeTruthy();
    expect(screen.queryByText(dictionary('en').landing.lede)).toBeNull();
  });
});

describe('Préférences', () => {
  it('ignore une valeur stockée invalide plutôt que de la propager', () => {
    const cleaned = sanitize({
      defaultKind: 'nimporte-quoi' as never,
      autoConfirmUnderUsd: -5,
      technicalByDefault: 'oui' as never,
    });
    expect(cleaned.defaultKind).toBe(DEFAULT_PREFERENCES.defaultKind);
    // Une valeur douteuse sur un réglage qui AUTORISE une dépense retombe sur
    // « toujours demander ».
    expect(cleaned.autoConfirmUnderUsd).toBe(0);
    expect(cleaned.technicalByDefault).toBe(false);
  });

  it('plafonne le seuil d’acceptation automatique', () => {
    expect(sanitize({ autoConfirmUnderUsd: 10_000 }).autoConfirmUnderUsd).toBe(100);
  });
});

describe('Page de réglages', () => {
  const providers = {
    settings: { nodeProvider: 'gemini' as const, masterProvider: 'anthropic' as const },
    available: [
      { id: 'gemini' as const, available: true, why: null },
      { id: 'ollama' as const, available: false, why: 'Ollama is not running' },
    ],
  };

  const stubSettings = (bypass = false) =>
    vi.spyOn(api, 'getScanSettings').mockResolvedValue({
      settings: { bypassClaudeForHighConfidence: bypass },
      thresholds: { reject_below: 0.4, direct_alert_above: 0.7 },
    });

  it('annonce ce qui est appliqué sur le serveur et ce qui reste local', async () => {
    stubSettings();
    render(<SettingsPage providers={providers} onProviderChange={async () => {}} />);
    const s = dictionary('en').settings;
    await waitFor(() => expect(screen.getAllByText(s.savedOnServer).length).toBe(2));
    expect(screen.getAllByText(s.savedLocally).length).toBe(2);
  });

  it('affiche les seuils que le serveur applique réellement, pas des valeurs recopiées', async () => {
    vi.spyOn(api, 'getScanSettings').mockResolvedValue({
      settings: { bypassClaudeForHighConfidence: false },
      thresholds: { reject_below: 0.3, direct_alert_above: 0.9 },
    });
    render(<SettingsPage providers={providers} onProviderChange={async () => {}} />);
    await waitFor(() => expect(screen.getByText('0.0 – 0.3')).toBeTruthy());
    expect(screen.getByText('0.9 – 1.0')).toBeTruthy();
  });

  it('envoie le contournement de l’arbitrage au serveur et prévient de l’effet', async () => {
    stubSettings();
    const setScan = vi.spyOn(api, 'setScanSettings').mockResolvedValue({
      settings: { bypassClaudeForHighConfidence: true },
      thresholds: { reject_below: 0.4, direct_alert_above: 0.7 },
    });
    const user = userEvent.setup();
    render(<SettingsPage providers={providers} onProviderChange={async () => {}} />);

    const s = dictionary('en').settings;
    const toggle = await screen.findByLabelText(new RegExp(s.bypassLabel, 'i'));
    await user.click(toggle);

    expect(setScan).toHaveBeenCalledWith({ bypassClaudeForHighConfidence: true });
    // Couper l'arbitrage change le rapport rendu : l'écran doit le dire.
    await waitFor(() => expect(screen.getByText(s.bypassWarning)).toBeTruthy());
  });

  it('revient en arrière si le serveur refuse le réglage', async () => {
    stubSettings();
    vi.spyOn(api, 'setScanSettings').mockRejectedValue(new Error('nope'));
    const user = userEvent.setup();
    render(<SettingsPage providers={providers} onProviderChange={async () => {}} />);

    const s = dictionary('en').settings;
    const toggle = (await screen.findByLabelText(new RegExp(s.bypassLabel, 'i'))) as HTMLInputElement;
    await user.click(toggle);
    await waitFor(() => expect(toggle.checked).toBe(false));
  });

  it('mémorise une préférence locale et la restitue', async () => {
    stubSettings();
    const user = userEvent.setup();
    render(<SettingsPage providers={providers} onProviderChange={async () => {}} />);

    const s = dictionary('en').settings;
    const toggle = (await screen.findByLabelText(
      new RegExp(s.technicalByDefaultLabel, 'i')
    )) as HTMLInputElement;
    await user.click(toggle);
    expect(toggle.checked).toBe(true);

    await user.click(screen.getByRole('button', { name: new RegExp(s.reset, 'i') }));
    expect(toggle.checked).toBe(false);
  });

  it('signale un moteur sans clé avec la raison donnée par le serveur', async () => {
    stubSettings();
    render(<SettingsPage providers={providers} onProviderChange={async () => {}} />);
    await waitFor(() => expect(screen.getByText('Ollama is not running')).toBeTruthy());
  });

  it('annonce le service injoignable plutôt que de rester silencieux', async () => {
    vi.spyOn(api, 'getScanSettings').mockRejectedValue(new Error('down'));
    render(<SettingsPage providers={providers} onProviderChange={async () => {}} />);
    await waitFor(() =>
      expect(screen.getByText(dictionary('en').settings.serverOffline)).toBeTruthy()
    );
  });
});
