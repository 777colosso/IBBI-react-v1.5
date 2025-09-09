export enum BibleVersion {
  KJV = 'KJV',
  ACF2007 = 'ACF2007',
  ACF2007_LOCAL = 'ACF2007_LOCAL'
}

export enum Language {
  en = 'en',
  pt = 'pt'
}

export interface TranslationSet {
  loading: string;
  fetchChapterError: string;
  // Add other translation keys as needed
}

export interface Book {
  name: string;
  pt_name: string;
  api_name: string;
  abbr: string;
  chapters: number;
}