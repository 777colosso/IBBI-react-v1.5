import { useState, useCallback } from 'react';
import { BIBLE_BOOKS } from '../../constants';

// Keep the original BIBLE_VERSIONS export for backwards compatibility (ACF2011 removed)
export const BIBLE_VERSIONS = {
  KJV: 'King James Version',
  ACF2007: 'Almeida Revista e Atualizada (ARA)',
  ACF2007_LOCAL: 'Almeida Corrigida Fiel (2007 ACF)',
};

// Bible source types
enum BibleSource {
  BOLLS_LIFE = 'bolls_life',
  BIBLE_API = 'bible_api',
  LOCAL_JSON = 'local_json'
}

interface BibleConfig {
  version: string;
  source: BibleSource;
  apiEndpoint?: string;
  apiVersion?: string;
  jsonPath?: string;
  names: { en: string; pt?: string };
  translationId: string;
}

const BIBLE_CONFIGS: Record<string, BibleConfig> = {
  KJV: {
    version: 'KJV',
    source: BibleSource.BOLLS_LIFE,
    apiEndpoint: 'https://bolls.life/get-text',
    apiVersion: 'kjv',
    names: { en: 'King James Version' },
    translationId: 'KJV'
  },
  ACF2007: {
    version: 'ACF2007',
    source: BibleSource.BIBLE_API,
    apiEndpoint: 'https://bible-api.com',
    names: {
      en: 'Almeida Revista e Atualizada (ARA)',
      pt: 'Almeida Revista e Atualizada (ARA)'
    },
    translationId: 'ARA'
  },
  ACF2007_LOCAL: {
    version: 'ACF2007_LOCAL',
    source: BibleSource.LOCAL_JSON,
    jsonPath: '/Biblias/2007 ACF/output_books',
    names: {
      en: 'Almeida Corrigida Fiel (2007 ACF)',
      pt: 'Almeida Corrigida Fiel (2007 ACF)'
    },
    translationId: 'ACF2007'
  }
};

// Additional aliases to better map user dropdown or legacy values
const VERSION_ALIASES: Record<string, string> = {
  'almeida corrigida fiel (2007 acf)': 'ACF2007_LOCAL',
  'almeida corrigida fiel 2007 acf': 'ACF2007_LOCAL',
  'acf2007 local': 'ACF2007_LOCAL',
  'acf2007-local': 'ACF2007_LOCAL',
  '2007 acf': 'ACF2007_LOCAL',
  'acf2007_local': 'ACF2007_LOCAL',
  'acf2007local': 'ACF2007_LOCAL',
  'ACF2007_LOCAL': 'ACF2007_LOCAL',
};

// Enhanced normalization helpers
const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const squash = (s: string) => normalize(s).replace(/[^a-z0-9]/g, '');

// Unified resolver with stronger matching
const resolveBibleConfig = (input: string): BibleConfig | undefined => {
  if (!input) return undefined;
  
  // Direct match first
  const direct = BIBLE_CONFIGS[input];
  if (direct) return direct;
  
  // Try exact alias matches first
  const aliasHit = VERSION_ALIASES[input];
  if (aliasHit && BIBLE_CONFIGS[aliasHit]) return BIBLE_CONFIGS[aliasHit];
  
  // Normalize and try again
  const norm = normalize(input).replace(/[()]/g, '');
  const aliasHitNorm = VERSION_ALIASES[norm];
  if (aliasHitNorm && BIBLE_CONFIGS[aliasHitNorm]) return BIBLE_CONFIGS[aliasHitNorm];
  
  // Fuzzy matching as fallback
  const squashedInput = squash(input);
  const found = Object.values(BIBLE_CONFIGS).find(c => {
    const candidates = [
      c.version,
      c.names.en,
      c.names.pt,
      BIBLE_VERSIONS[c.version as keyof typeof BIBLE_VERSIONS],
      c.translationId
    ].filter(Boolean) as string[];
    return candidates.some(name => {
      const n1 = normalize(name).replace(/[()]/g, '');
      if (n1 === norm) return true;
      return squash(name) === squashedInput;
    });
  });
  
  if (!found) {
    console.warn('[useBibleApi] Unable to resolve Bible version:', input);
  }
  return found;
};

const getBibleDisplayName = (version: string, locale: string = 'en'): string => {
  const config = resolveBibleConfig(version);
  if (!config) return BIBLE_VERSIONS[version as keyof typeof BIBLE_VERSIONS] || version || 'Unknown Bible';
  return (config.names as any)[locale] || config.names.en;
};

export interface Verse { bookname: string; chapter: string; verse: string; text: string; }
export interface BibleApiResponse { bookname: string; chapter: string; verses: Verse[]; }

export const useBibleApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchVerse = useCallback(async (book: string, chapter: number, verse: number, version: string) => {
    setLoading(true); setError(null);
    try {
      const config = resolveBibleConfig(version);
      if (!config) throw new Error(`Unsupported Bible version: ${version}`);

      if (config.source === BibleSource.BIBLE_API) {
        const bookPtName = BIBLE_BOOKS.find(b => b.name === book)?.pt_name;
        if (!bookPtName) throw new Error(`Book portuguese name not found for ${book}`);
        const response = await fetch(`${config.apiEndpoint}/${encodeURIComponent(bookPtName)}+${chapter}:${verse}?translation=acf`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return {
          reference: data.reference,
          verses: data.verses.map((v: any) => ({
            book_id: v.book_id,
            book_name: v.book_name,
            chapter: v.chapter,
            verse: v.verse,
            text: v.text,
          })),
          text: data.text.trim(),
          translation_id: config.translationId,
          translation_name: getBibleDisplayName(config.version),
          translation_note: data.translation_note,
        };
      } else if (config.source === BibleSource.LOCAL_JSON) {
        const bookMeta = BIBLE_BOOKS.find(b => b.name === book);
        const bookAbbr = (bookMeta as any)?.abbr?.toLowerCase?.(); // tolerate typing mismatch
        if (!bookAbbr) throw new Error(`Book abbreviation not found for ${book}`);
        const response = await fetch(`${config.jsonPath}/${bookAbbr}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const chapterData = data.chapters[chapter - 1];
        if (!chapterData) throw new Error(`Chapter not found: ${chapter}`);
        const verseText = chapterData[verse - 1];
        if (verseText === undefined) throw new Error(`Verse not found: ${verse}`);
        const verseData = { book_id: bookAbbr, book_name: data.name, chapter, verse, text: verseText };
        return {
          reference: `${data.name} ${chapter}:${verse}`,
          verses: [verseData],
          text: verseText,
          translation_id: config.translationId,
          translation_name: getBibleDisplayName(config.version),
          translation_note: 'Local 2007 ACF version',
        };
      } else {
        const bookForApi = BIBLE_BOOKS.find(b => b.name === book)?.api_name || book;
        const response = await fetch(`${config.apiEndpoint}/${config.apiVersion}/${bookForApi}/${chapter}/${verse}/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data && data.length > 0) {
          const verseData = data[0];
          return {
            reference: `${verseData.bookname} ${verseData.chapter}:${verseData.verse}`,
            verses: [{
              book_id: verseData.bookname.toLowerCase().replace(/\s/g, ''),
              book_name: verseData.bookname,
              chapter: parseInt(verseData.chapter, 10),
              verse: parseInt(verseData.verse, 10),
              text: verseData.text,
            }],
            text: verseData.text,
            translation_id: config.translationId,
            translation_name: getBibleDisplayName(config.version),
            translation_note: 'bolls.life',
          };
        }
        throw new Error('Verse not found or invalid response');
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error('An unknown error occurred'));
      return null;
    } finally { setLoading(false); }
  }, []);

  const fetchChapter = useCallback(async (book: string, chapter: number, version: string) => {
    setLoading(true); setError(null);
    try {
      const config = resolveBibleConfig(version);
      if (!config) {
        // eslint-disable-next-line no-console
        console.error('[useBibleApi] fetchChapter unresolved version', version);
        throw new Error(`Unsupported Bible version: ${version}`);
      }

      if (config.source === BibleSource.BIBLE_API) {
        const bookPtName = BIBLE_BOOKS.find(b => b.name === book)?.pt_name;
        if (!bookPtName) throw new Error(`Book portuguese name not found for ${book}`);
        const response = await fetch(`${config.apiEndpoint}/${encodeURIComponent(bookPtName)}+${chapter}?translation=acf`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return {
          verses: data.verses.map((v: any) => ({
            book_id: v.book_id,
            book_name: v.book_name,
            chapter: v.chapter,
            verse: v.verse,
            text: v.text,
          })),
          translation_name: getBibleDisplayName(config.version),
          translation_id: config.translationId
        };
      } else if (config.source === BibleSource.LOCAL_JSON) {
        const bookMeta = BIBLE_BOOKS.find(b => b.name === book);
        const bookAbbr = (bookMeta as any)?.abbr?.toLowerCase?.();
        if (!bookAbbr) throw new Error(`Book abbreviation not found for ${book}`);
        const response = await fetch(`${config.jsonPath}/${bookAbbr}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const chapterData = data.chapters[chapter - 1];
        if (!chapterData) throw new Error(`Chapter not found: ${chapter}`);
        return {
          verses: chapterData.map((text: string, index: number) => ({
            book_id: bookAbbr,
            book_name: data.name,
            chapter,
            verse: index + 1,
            text,
          })),
          translation_name: getBibleDisplayName(config.version),
          translation_id: config.translationId
        };
      } else {
        const bookForApi = BIBLE_BOOKS.find(b => b.name === book)?.api_name || book;
        const response = await fetch(`${config.apiEndpoint}/${config.apiVersion}/${bookForApi}/${chapter}/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return {
          verses: data.map((v: Verse) => ({
            book_id: v.bookname.toLowerCase().replace(/\s/g, ''),
            book_name: v.bookname,
            chapter: parseInt(v.chapter, 10),
            verse: parseInt(v.verse, 10),
            text: v.text,
          })),
          translation_name: getBibleDisplayName(config.version),
          translation_id: config.translationId
        };
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error('An unknown error occurred'));
      return { verses: [], translation_name: '', translation_id: '' };
    } finally { setLoading(false); }
  }, []);

  return { loading, error, fetchVerse, fetchChapter };
};

export { BIBLE_CONFIGS, getBibleDisplayName, BibleSource, resolveBibleConfig, VERSION_ALIASES };