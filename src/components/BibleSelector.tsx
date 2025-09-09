import React from 'react';
import { BibleVersion, Language } from './types';
import { BIBLE_BOOKS } from './constants';
import { TranslationSet } from './types';
import { BIBLE_VERSIONS } from './hooks/useBibleApi';

interface BibleSelectorProps {
    version: BibleVersion;
    setVersion: (version: BibleVersion) => void;
    language: Language;
    setLanguage: (language: Language) => void;
    t: {
        version: string;
        language: string;
    };
}

const BibleSelector: React.FC<BibleSelectorProps> = ({ version, setVersion, language, setLanguage, t }) => {
    const selectStyles = "block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 sm:text-sm";

    return (
        <div>
            <div>
                <label htmlFor="version-floating" className="block text-sm font-medium text-slate-400 mb-1">{t.version}</label>
                <select id="version-floating" value={version} onChange={(e) => setVersion(e.target.value as BibleVersion)} className={selectStyles}>
                    <option value={BibleVersion.KJV}>{BIBLE_VERSIONS.KJV}</option>
                    <option value={BibleVersion.ACF2007}>{BIBLE_VERSIONS.ACF2007}</option>
                    <option value={BibleVersion.ACF2007_LOCAL}>{BIBLE_VERSIONS.ACF2007_LOCAL}</option>
                </select>
            </div>
            <div className="flex gap-4">
                {/* Other components or elements can go here */}
            </div>
        </div>
    );
};

export default BibleSelector;