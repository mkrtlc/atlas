/**
 * Browser-based translation using Mozilla's Bergamot WASM translator.
 * Models are downloaded on first use (~15-20MB per language pair) and cached by the browser.
 *
 * Supported languages: English, Turkish, French, Spanish, Italian.
 */

// Language codes used by Bergamot models (ISO 639-1, two-letter)
export type TranslationLanguage = 'en' | 'tr' | 'fr' | 'es' | 'it';

export const TRANSLATION_LANGUAGES: Array<{ code: TranslationLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Turkish' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
];

// ─── Lightweight language detection (trigram-based) ────────────────────────

// Top trigrams per language, extracted from large corpora.
// Only need enough to distinguish 5 languages reliably.
const TRIGRAMS: Record<TranslationLanguage, string[]> = {
  en: ['the', 'ing', 'and', 'tion', 'her', 'for', 'tha', 'hat', 'ent', 'ion', 'ter', 'was', 'you', 'ith', 'ver', 'all', 'wit', 'thi', 'his', 'ere'],
  tr: ['ler', 'lar', 'bir', 'ini', 'eri', 'ile', 'ara', 'aya', 'ası', 'nda', 'yor', 'dır', 'aki', 'ını', 'rin', 'sin', 'lan', 'dan', 'dir', 'ard'],
  fr: ['les', 'ent', 'que', 'ait', 'des', 'ous', 'une', 'est', 'ion', 'par', 'our', 'eur', 'ell', 'tre', 'dan', 'ans', 'pas', 'ais', 'ont', 'com'],
  es: ['que', 'ent', 'ión', 'los', 'las', 'ado', 'nte', 'con', 'por', 'est', 'ara', 'una', 'cia', 'ment', 'ero', 'des', 'ido', 'mos', 'era', 'sta'],
  it: ['che', 'ell', 'per', 'ion', 'ent', 'ato', 'con', 'lla', 'tti', 'one', 'ment', 'nte', 'ita', 'gli', 'all', 'ere', 'nto', 'del', 'ess', 'sta'],
};

/**
 * Detect the most likely language of a text string.
 * Returns the language code and a confidence score (0-1).
 * Works best with 50+ characters of text.
 */
export function detectLanguage(text: string): { language: TranslationLanguage; confidence: number } {
  const clean = text.toLowerCase().replace(/[^a-zà-öù-ÿşçğıöü]/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length < 20) return { language: 'en', confidence: 0 };

  const scores: Record<string, number> = {};

  for (const [lang, trigrams] of Object.entries(TRIGRAMS)) {
    let hits = 0;
    for (const tri of trigrams) {
      // Count occurrences of each trigram
      let idx = 0;
      while ((idx = clean.indexOf(tri, idx)) !== -1) {
        hits++;
        idx += 1;
      }
    }
    scores[lang] = hits;
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const best = entries[0];

  if (total === 0) return { language: 'en', confidence: 0 };

  return {
    language: best[0] as TranslationLanguage,
    confidence: best[1] / total,
  };
}

// ─── Bergamot translator singleton ─────────────────────────────────────────

type TranslatorInstance = {
  translate: (request: { from: string; to: string; text: string; html?: boolean }) => Promise<{ target: { text: string } }>;
  delete: () => Promise<void>;
};

let translatorPromise: Promise<TranslatorInstance> | null = null;
let isLoading = false;

async function getTranslator(): Promise<TranslatorInstance> {
  if (translatorPromise) return translatorPromise;

  isLoading = true;
  translatorPromise = (async () => {
    const { LatencyOptimisedTranslator } = await import(
      /* @vite-ignore */
      '@browsermt/bergamot-translator/translator.js'
    );
    const instance = new LatencyOptimisedTranslator({
      pivotLanguage: 'en',
      downloadTimeout: 120000, // 2 minutes for first model download
    });
    isLoading = false;
    return instance as TranslatorInstance;
  })();

  translatorPromise.catch(() => {
    translatorPromise = null;
    isLoading = false;
  });

  return translatorPromise;
}

/**
 * Translate text or HTML from one language to another.
 * Downloads the model on first use for each language pair.
 */
export async function translateText(
  text: string,
  from: TranslationLanguage,
  to: TranslationLanguage,
  html = false,
): Promise<string> {
  const translator = await getTranslator();
  const response = await translator.translate({ from, to, text, html });
  return response.target.text;
}

/**
 * Whether the translator is currently loading its WASM module.
 */
export function isTranslatorLoading(): boolean {
  return isLoading;
}
