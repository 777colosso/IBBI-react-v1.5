import { useState, useCallback } from 'react';
import { BIBLE_BOOKS } from '../../constants';
import { BibleVersion } from '../../types';

const BOLLS_LIFE_API_URL = 'https://bolls.life/get-text';
const BIBLE_API_URL = 'https://bible-api.com';

// Keep the original BIBLE_VERSIONS export for backwards compatibility (ACF2011 removed)
export const BIBLE_VERSIONS = {
  KJV: 'King James Version',
  ACF2007: 'Almeida Revista e Atualizada (ARA)',
};

// Bible source types
enum BibleSource {
  BOLLS_LIFE = 'bolls_life',
  BIBLE_API = 'bible_api',
  LOCAL_JSON = 'local_json'
}

// Bible configuration interface
interface BibleConfig {
  version: BibleVersion;
  source: BibleSource;
  apiEndpoint?: string;
  apiVersion?: string;
  jsonPath?: string;
  names: {
    en: string;
    pt?: string;
  };
  translationId: string;
}

// Centralized Bible configurations (ACF2011 removed)
const BIBLE_CONFIGS: Record<BibleVersion, BibleConfig> = {
  [BibleVersion.KJV]: {
    version: BibleVersion.KJV,
    source: BibleSource.BOLLS_LIFE,
    apiEndpoint: BOLLS_LIFE_API_URL,
    apiVersion: 'kjv',
    names: {
      en: 'King James Version'
    },
    translationId: 'KJV'
  },
  [BibleVersion.ACF2007]: {
    version: BibleVersion.ACF2007,
    source: BibleSource.BIBLE_API,
    apiEndpoint: BIBLE_API_URL,
    names: {
      en: 'Almeida Revista e Atualizada (ARA)',
      pt: 'Almeida Revista e Atualizada (ARA)'
    },
    translationId: 'ARA'
  }
};

// Helper function to get Bible display name
const getBibleDisplayName = (version: BibleVersion, locale: string = 'en'): string => {
  const config = BIBLE_CONFIGS[version];
  if (!config) return BIBLE_VERSIONS[version as keyof typeof BIBLE_VERSIONS] || 'Unknown Bible';
  return config.names[locale as keyof typeof config.names] || config.names.en;
};

export interface Verse {
  bookname: string;
  chapter: string;
  verse: string;
  text: string;
}

export interface BibleApiResponse {
  bookname: string;
  chapter: string;
  verses: Verse[];
}

export const useBibleApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchVerse = useCallback(async (book: string, chapter: number, verse: number, version: BibleVersion) => {
    setLoading(true);
    setError(null);
    try {
      const config = BIBLE_CONFIGS[version];
      if (!config) {
        throw new Error(`Unsupported Bible version: ${version}`);
      }

      if (config.source === BibleSource.BIBLE_API) {
        // Logic for bible-api.com (ARA)
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
          translation_name: getBibleDisplayName(version),
          translation_note: data.translation_note,
        };
      } else {
        // Logic for bolls.life API (KJV only)
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
            translation_name: getBibleDisplayName(version),
            translation_note: 'bolls.life',
          };
        } else {
          throw new Error('Verse not found or invalid response');
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      } else {
        setError(new Error('An unknown error occurred'));
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChapter = useCallback(async (book: string, chapter: number, version: BibleVersion) => {
    setLoading(true);
    setError(null);
    try {
      const config = BIBLE_CONFIGS[version];
      if (!config) {
        throw new Error(`Unsupported Bible version: ${version}`);
      }

      if (config.source === BibleSource.BIBLE_API) {
        // Logic for bible-api.com (ARA)
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
          translation_name: getBibleDisplayName(version),
          translation_id: config.translationId
        };

      } else {
        // Logic for bolls.life API (KJV only)
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
          translation_name: getBibleDisplayName(version),
          translation_id: config.translationId
        };
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      } else {
        setError(new Error('An unknown error occurred'));
      }
      return { verses: [], translation_name: '', translation_id: '' };
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, fetchVerse, fetchChapter };
};

// Export new utilities for future use
export { BIBLE_CONFIGS, getBibleDisplayName, BibleSource };
export type { BibleConfig };