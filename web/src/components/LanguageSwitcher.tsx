/**
 * Sélecteur de langue.
 *
 * Deux boutons plutôt qu'une liste déroulante : avec deux choix, une liste
 * ajoute un clic pour rien et cache l'option non retenue. Ici les deux
 * langues sont visibles en permanence, et celle qui est active se lit d'un
 * coup d'œil.
 *
 * `aria-pressed` plutôt qu'un simple style : un lecteur d'écran doit pouvoir
 * annoncer laquelle est active, pas seulement la montrer.
 */

import { LOCALES, dictionary, type Locale } from '../i18n/dictionary.ts';
import { useI18n } from '../i18n/context.tsx';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="vp-lang" role="group" aria-label={t.app.languageLabel}>
      {LOCALES.map((id: Locale) => (
        <button
          key={id}
          type="button"
          onClick={() => setLocale(id)}
          aria-pressed={locale === id}
          title={dictionary(id).localeName}
        >
          {id}
        </button>
      ))}
    </div>
  );
}
