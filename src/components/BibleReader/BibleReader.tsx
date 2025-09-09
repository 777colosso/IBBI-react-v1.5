import React, { useState, useEffect, useContext } from 'react';
import { BibleVersion, Language, TranslationSet } from '../../types';
import { useBibleApi } from '../../hooks/useBibleApi';
import { BIBLE_BOOKS } from '../../constants';
import { FontSizeContext } from '../../contexts/FontSizeContext';
import CrossRefPopup from '../../../components/CrossRefPopup';

interface BibleReaderProps {
  book: string;
  chapter: number;
  version: BibleVersion;
  t: TranslationSet;
  language: Language;
}

interface Verse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export const BibleReader: React.FC<BibleReaderProps> = ({ book, chapter, version, t, language }) => {
  const { loading, error, fetchChapter } = useBibleApi();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [translationName, setTranslationName] = useState('');
  const { fontSize } = useContext(FontSizeContext);
  const [crossRef, setCrossRef] = useState<{ reference: string; version: BibleVersion; x: number; y: number } | null>(null);

  useEffect(() => {
    const loadChapter = async () => {
      const data = await fetchChapter(book, chapter, version);
      if (data && data.verses) {
        setVerses(data.verses);
        setTranslationName(data.translation_name);
      } else {
        setVerses([]);
        setTranslationName('');
      }
    };
    loadChapter();
  }, [book, chapter, version, fetchChapter]);

  const handleVerseClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    const target = event.target as HTMLElement;
    const reference = target.getAttribute('data-ref');
    if (reference) {
      const rect = target.getBoundingClientRect();
      setCrossRef({
        reference,
        version,
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY,
      });
    }
  };

  const renderVerseText = (text: string) => {
    const parts = text.split(/(\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        const reference = part.substring(1, part.length - 1);
        return (
          <span
            key={index}
            className="text-blue-400 cursor-pointer hover:underline"
            data-ref={reference}
            onClick={handleVerseClick}
          >
            {`[${reference}]`}
          </span>
        );
      }
      return part;
    });
  };

  const bookData = BIBLE_BOOKS.find(b => b.name === book);
  const bookDisplayName = language === 'pt' ? bookData?.pt_name : bookData?.name;

  return (
    <div className="bg-slate-800 rounded-lg shadow-md p-6 relative">
      {loading && <div className="text-center text-slate-400">{t.loading}...</div>}
      {error && <div className="text-center text-red-500">{t.fetchChapterError}: {error.message}</div>}
      {!loading && !error && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold text-amber-400 font-serif">{bookDisplayName} {chapter}</h2>
            <span className="text-sm text-slate-400 bg-slate-700 px-2 py-1 rounded-md">{translationName}</span>
          </div>
          <div className={`text-slate-300 space-y-4 leading-relaxed text-${fontSize}`}>
            {verses.map((verse, index) => (
              <p key={index}>
                <span className="font-bold text-amber-400 pr-2">{verse.verse}</span>
                {renderVerseText(verse.text)}
              </p>
            ))}
          </div>
        </>
      )}
      {crossRef && (
        <CrossRefPopup
          reference={crossRef.reference}
          version={crossRef.version}
          onClose={() => setCrossRef(null)}
          position={{ x: crossRef.x, y: crossRef.y }}
        />
      )}
    </div>
  );
};