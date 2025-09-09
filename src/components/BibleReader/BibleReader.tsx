import React, { useState } from 'react';
import { kjvBooks, tbsBooks } from './BibleBooks';

const bibles = [
  { name: 'King James Version', abbreviation: 'kjv', books: kjvBooks },
  { name: 'Almeida Revista e Atualizada (ARA)', abbreviation: 'tbs', books: tbsBooks }
];

const BibleReader = () => {
  const [selectedBible, setSelectedBible] = useState(bibles[0]);

  const handleBibleChange = (event) => {
    const selected = bibles.find(bible => bible.abbreviation === event.target.value);
    setSelectedBible(selected);
  };

  return (
    <div>
      <h1>Bible Reader</h1>
      <select onChange={handleBibleChange} value={selectedBible.abbreviation}>
        {bibles.map(bible => (
          <option key={bible.abbreviation} value={bible.abbreviation}>
            {bible.name}
          </option>
        ))}
      </select>
      <div>
        {selectedBible.books.map(book => (
          <div key={book}>{book}</div>
        ))}
      </div>
    </div>
  );
};

export default BibleReader;