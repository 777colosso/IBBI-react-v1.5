import { BibleVersion, Verse } from '../types';
import { ACF_2007_API_URL, BIBLE_BOOKS } from '../constants';

async function fetchKJV(bookName: string, chapter: number): Promise<Verse[]> {
  const bookData = BIBLE_BOOKS.find(b => b.name === bookName);
  if (!bookData) {
    throw new Error(`Could not find data for book: ${bookName}`);
  }
  const bookForApi = (bookData.api_name || bookData.name).replace(/\s/g, '+');
  const url = `${ACF_2007_API_URL}/${bookForApi}+${chapter}?translation=kjv`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`KJV API error (${response.status}): ${errorData}`);
  }
  const data = await response.json();
  if (!data.verses) {
    throw new Error("KJV API returned unexpected data format.");
  }
  return data.verses.map((v: any) => ({
    number: v.verse,
    text: v.text.trim().replace(/\\n/g, ' '),
  }));
}

async function fetchACF2007(bookName: string, chapter: number): Promise<Verse[]> {
  const bookData = BIBLE_BOOKS.find(b => b.name === bookName);
  if (!bookData) {
    throw new Error(`Could not find data for book: ${bookName}`);
  }
  const bookForApi = bookData.pt_name.replace(/\s/g, '+');
  const url = `${ACF_2007_API_URL}/${bookForApi}+${chapter}?translation=almeida`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`ACF 2007 API error (${response.status}): ${errorData}`);
  }
  const data = await response.json();
  if (!data.verses) {
    throw new Error("ACF 2007 API returned unexpected data format.");
  }
  return data.verses.map((v: any) => ({
    number: v.verse,
    text: v.text.trim().replace(/\\n/g, ' '),
  }));
}

async function fetchACF2007Local(bookName: string, chapter: number): Promise<Verse[]> {
  const bookData = BIBLE_BOOKS.find(b => b.name === bookName);
  if (!bookData) {
    throw new Error(`Could not find data for book: ${bookName}`);
  }
  
  // Try different properties to find book abbreviation
  let bookAbbr = (bookData as any)?.abbr?.toLowerCase?.();
  
  // If abbr is not available, try other common properties
  if (!bookAbbr) {
    bookAbbr = (bookData as any)?.abbreviation?.toLowerCase?.();
  }
  if (!bookAbbr) {
    bookAbbr = (bookData as any)?.short_name?.toLowerCase?.();
  }
  if (!bookAbbr) {
    bookAbbr = (bookData as any)?.code?.toLowerCase?.();
  }
  
  // As a fallback, create abbreviation from the book name
  if (!bookAbbr) {
    // Portuguese book abbreviations mapping to match actual file names
    const abbreviations: { [key: string]: string } = {
      'Genesis': 'gn',
      'Exodus': 'ex',
      'Leviticus': 'lv',
      'Numbers': 'nm',
      'Deuteronomy': 'dt',
      'Joshua': 'js',
      'Judges': 'jz',
      'Ruth': 'rt',
      '1 Samuel': '1sm',
      '2 Samuel': '2sm',
      '1 Kings': '1rs',
      '2 Kings': '2rs',
      '1 Chronicles': '1cr',
      '2 Chronicles': '2cr',
      'Ezra': 'ed',
      'Nehemiah': 'ne',
      'Esther': 'et',
      'Job': 'jó',
      'Psalms': 'sl',
      'Proverbs': 'pv',
      'Ecclesiastes': 'ec',
      'Song of Solomon': 'ct',
      'Isaiah': 'is',
      'Jeremiah': 'jr',
      'Lamentations': 'lm',
      'Ezekiel': 'ez',
      'Daniel': 'dn',
      'Hosea': 'os',
      'Joel': 'jl',
      'Amos': 'am',
      'Obadiah': 'ob',
      'Jonah': 'jn',
      'Micah': 'mq',
      'Nahum': 'na',
      'Habakkuk': 'hc',
      'Zephaniah': 'sf',
      'Haggai': 'ag',
      'Zechariah': 'zc',
      'Malachi': 'ml',
      'Matthew': 'mt',
      'Mark': 'mc',
      'Luke': 'lc',
      'John': 'jo',
      'Acts': 'atos',
      'Romans': 'rm',
      '1 Corinthians': '1co',
      '2 Corinthians': '2co',
      'Galatians': 'gl',
      'Ephesians': 'ef',
      'Philippians': 'fp',
      'Colossians': 'cl',
      '1 Thessalonians': '1ts',
      '2 Thessalonians': '2ts',
      '1 Timothy': '1tm',
      '2 Timothy': '2tm',
      'Titus': 'tt',
      'Philemon': 'fm',
      'Hebrews': 'hb',
      'James': 'tg',
      '1 Peter': '1pe',
      '2 Peter': '2pe',
      '1 John': '1jo',
      '2 John': '2jo',
      '3 John': '3jo',
      'Jude': 'jd',
      'Revelation': 'ap'
    };
    
    bookAbbr = abbreviations[bookName];
  }
  
  if (!bookAbbr) {
    console.error('Available book data:', bookData);
    throw new Error(`Book abbreviation not found for ${bookName}. Available properties: ${Object.keys(bookData).join(', ')}`);
  }
  
  const url = `/Biblias/2007 ACF/output_books/${bookAbbr}.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  const chapterData = data.chapters[chapter - 1];
  if (!chapterData) {
    throw new Error(`Chapter not found: ${chapter}`);
  }
  
  return chapterData.map((text: string, index: number) => ({
    number: index + 1,
    text: text.trim(),
  }));
}

export async function fetchChapter(
  version: BibleVersion,
  bookName: string,
  chapter: number
): Promise<Verse[]> {
  try {
    switch (version) {
      case BibleVersion.KJV:
        return await fetchKJV(bookName, chapter);
      case BibleVersion.ACF2007:
        return await fetchACF2007(bookName, chapter);
      case 'ACF2007_LOCAL' as BibleVersion:
        return await fetchACF2007Local(bookName, chapter);
      default:
        throw new Error(`Unsupported Bible version: ${version}`);
    }
  } catch (error) {
    console.error(`Failed to fetch chapter for ${version} (${bookName} ${chapter}):`, error);
    throw error;
  }
}

export async function fetchCrossReferenceText(reference: string, version: BibleVersion): Promise<string> {
    const bookNamesForRegex = BIBLE_BOOKS.map(b => b.name.replace(/\s/g, '\\s')).join('|');
    const verseRefRegex = new RegExp(`^(${bookNamesForRegex})\\s+(\\d{1,3})(?::(\\d{1,3}(?:-\\d{1,3})?))?$`, 'i');

    const match = reference.match(verseRefRegex);
    if (!match) {
        throw new Error(`Invalid reference format: ${reference}`);
    }

    const [, bookName, chapterStr, versePart] = match;
    const chapter = parseInt(chapterStr, 10);
    
    const hasVersePart = !!versePart;
    let startVerse = 1;
    let endVerse = -1; // Indicates whole chapter if it remains -1

    if (hasVersePart) {
        const verseRangeParts = versePart.split('-').map(Number);
        startVerse = verseRangeParts[0];
        endVerse = verseRangeParts.length > 1 ? verseRangeParts[1] : startVerse;
    }

    const bookData = BIBLE_BOOKS.find(b => b.name.toLowerCase() === bookName.toLowerCase());
    if (!bookData) {
        throw new Error(`Book not found: ${bookName}`);
    }

    try {
        if (version === BibleVersion.KJV || version === BibleVersion.ACF2007) {
            const apiTranslation = version === BibleVersion.KJV ? 'kjv' : 'almeida';
            const bookForApi = version === BibleVersion.KJV
                ? (bookData.api_name || bookData.name).replace(/\s/g, '+')
                : bookData.pt_name.replace(/\s/g, '+');
            
            let url;
            if (hasVersePart) {
                const verseRangeParam = endVerse > startVerse ? `${startVerse}-${endVerse}` : `${startVerse}`;
                url = `${ACF_2007_API_URL}/${bookForApi}+${chapter}:${verseRangeParam}?translation=${apiTranslation}`;
            } else {
                url = `${ACF_2007_API_URL}/${bookForApi}+${chapter}?translation=${apiTranslation}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API error ${response.status}: ${await response.text()}`);
            const data = await response.json();
            return data.verses.map((v: any) => `${v.verse}. ${v.text.trim()}`).join('\n');
        } else if (version === 'ACF2007_LOCAL' as BibleVersion) {
            // Handle local ACF2007 version
            // Try different properties to find book abbreviation
            let bookAbbr = (bookData as any)?.abbr?.toLowerCase?.();
            
            // If abbr is not available, try other common properties
            if (!bookAbbr) {
                bookAbbr = (bookData as any)?.abbreviation?.toLowerCase?.();
            }
            if (!bookAbbr) {
                bookAbbr = (bookData as any)?.short_name?.toLowerCase?.();
            }
            if (!bookAbbr) {
                bookAbbr = (bookData as any)?.code?.toLowerCase?.();
            }
            
            // As a fallback, create abbreviation from the book name
            if (!bookAbbr) {
                // Portuguese book abbreviations mapping to match actual file names
                const abbreviations: { [key: string]: string } = {
                    'Genesis': 'gn',
                    'Exodus': 'ex',
                    'Leviticus': 'lv',
                    'Numbers': 'nm',
                    'Deuteronomy': 'dt',
                    'Joshua': 'js',
                    'Judges': 'jz',
                    'Ruth': 'rt',
                    '1 Samuel': '1sm',
                    '2 Samuel': '2sm',
                    '1 Kings': '1rs',
                    '2 Kings': '2rs',
                    '1 Chronicles': '1cr',
                    '2 Chronicles': '2cr',
                    'Ezra': 'ed',
                    'Nehemiah': 'ne',
                    'Esther': 'et',
                    'Job': 'jó',
                    'Psalms': 'sl',
                    'Proverbs': 'pv',
                    'Ecclesiastes': 'ec',
                    'Song of Solomon': 'ct',
                    'Isaiah': 'is',
                    'Jeremiah': 'jr',
                    'Lamentations': 'lm',
                    'Ezekiel': 'ez',
                    'Daniel': 'dn',
                    'Hosea': 'os',
                    'Joel': 'jl',
                    'Amos': 'am',
                    'Obadiah': 'ob',
                    'Jonah': 'jn',
                    'Micah': 'mq',
                    'Nahum': 'na',
                    'Habakkuk': 'hc',
                    'Zephaniah': 'sf',
                    'Haggai': 'ag',
                    'Zechariah': 'zc',
                    'Malachi': 'ml',
                    'Matthew': 'mt',
                    'Mark': 'mc',
                    'Luke': 'lc',
                    'John': 'jo',
                    'Acts': 'atos',
                    'Romans': 'rm',
                    '1 Corinthians': '1co',
                    '2 Corinthians': '2co',
                    'Galatians': 'gl',
                    'Ephesians': 'ef',
                    'Philippians': 'fp',
                    'Colossians': 'cl',
                    '1 Thessalonians': '1ts',
                    '2 Thessalonians': '2ts',
                    '1 Timothy': '1tm',
                    '2 Timothy': '2tm',
                    'Titus': 'tt',
                    'Philemon': 'fm',
                    'Hebrews': 'hb',
                    'James': 'tg',
                    '1 Peter': '1pe',
                    '2 Peter': '2pe',
                    '1 John': '1jo',
                    '2 John': '2jo',
                    '3 John': '3jo',
                    'Jude': 'jd',
                    'Revelation': 'ap'
                };
                
                bookAbbr = abbreviations[bookName];
            }
            
            if (!bookAbbr) {
                throw new Error(`Book abbreviation not found for ${bookName}`);
            }
            
            const url = `/Biblias/2007 ACF/output_books/${bookAbbr}.json`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const chapterData = data.chapters[chapter - 1];
            if (!chapterData) throw new Error(`Chapter not found: ${chapter}`);
            
            if (hasVersePart) {
                const verses = [];
                for (let v = startVerse; v <= (endVerse === -1 ? startVerse : endVerse); v++) {
                    if (chapterData[v - 1]) {
                        verses.push(`${v}. ${chapterData[v - 1].trim()}`);
                    }
                }
                return verses.join('\n');
            } else {
                return chapterData.map((text: string, index: number) => 
                    `${index + 1}. ${text.trim()}`
                ).join('\n');
            }
        } else {
            throw new Error(`Unsupported Bible version for cross-reference: ${version}`);
        }
    } catch (error) {
        console.error(`Failed to fetch cross reference ${reference}:`, error);
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error('Unknown error fetching cross-reference.');
    }
}