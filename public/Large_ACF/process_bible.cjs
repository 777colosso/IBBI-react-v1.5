const fs = require('fs');
const path = require('path');

// --- NEW LINE HERE ---
console.log('Script started!');

const masterJsonPath = path.join(__dirname, 'bible_master.json');
const outputDirectory = path.join(__dirname, 'output_books');

// Function to sanitize book names for filenames
function createFileName(bookName) {
    if (!bookName) return 'unnamed-book.json';
    return bookName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase() + '.json';
}

async function processBibleJson() {
    console.log(`Iniciando o processamento da Bíblia ACF de ${masterJsonPath}...`);

    // 1. Create output directory if it doesn't exist
    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
        console.log(`Diretório de saída criado: ${outputDirectory}`);
    } else {
        console.log(`Diretório de saída já existe: ${outputDirectory}`);
    }

    try {
        // --- NEW LINE HERE ---
        console.log('Attempting to read master JSON file.');
        // 2. Read the master JSON file
        const masterJsonContent = await fs.promises.readFile(masterJsonPath, 'utf8');
        const masterBible = JSON.parse(masterJsonContent);

        // Check if masterBible itself is an array of books
        if (!Array.isArray(masterBible)) { // NO LONGER looking for a 'livros' property, just checking if the root is an array
            throw new Error('Formato do JSON mestre inesperado. Esperava que o arquivo raiz fosse um array de objetos de livros.');
        }

        let processedCount = 0;
        // Iterate directly over masterBible since it is the array of books
        for (const book of masterBible) { // Removed '.livros'
        let processedCount = 0;
        for (const book of masterBible) {
            // Your book objects seem to have 'abbrev' (e.g., "gn")
            // Let's use 'abbrev' for filenames and a more descriptive name if available, or just the abbrev.
            const bookIdentifier = book.abbrev || '[Livro sem abreviação]'; // Use abbrev, or a placeholder

            if (bookIdentifier && book.chapters) { // Ensure it has an identifier and chapters
                // For filename, we'll just use the abbrev directly
                const fileName = `${book.abbrev}.json`; 
                const outputPath = path.join(outputDirectory, fileName);

                // The content of the individual book file will be the 'book' object itself
                await fs.promises.writeFile(outputPath, JSON.stringify(book, null, 2), 'utf8');
                console.log(`Livro "${bookIdentifier}" salvo em: ${fileName}`);
                processedCount++;
            } else {
                console.warn('Livro encontrado sem "abbrev" ou "chapters". Ignorando:', book);
            }
        }        }

        console.log(`\nProcessamento concluído! ${processedCount} livros foram salvos na pasta "${path.basename(outputDirectory)}".`);

    } catch (error) {
        console.error('Ocorreu um erro durante o processamento:', error);
        if (error.code === 'ENOENT') {
            console.error(`Erro: O arquivo master JSON não foi encontrado no caminho: ${masterJsonPath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`Erro: Problema ao analisar o JSON. Verifique se ${masterJsonPath} é um JSON válido.`);
        }
    }
}

processBibleJson();