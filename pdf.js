const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const chalk = require('chalk');
const { fromPath } = require('pdf2pic');
const axios = require('axios');

// Configuration
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''; // Clé API Claude - définissez la variable d'environnement
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Extrait les métadonnées d'un fichier PDF
 */
async function extractPDFMetadata(filePath) {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdfParse(dataBuffer);
        
        // Extraire les métadonnées du PDF
        const metadata = {
            title: '',
            author: '',
            subject: '',
            keywords: '',
            creator: '',
            producer: ''
        };

        // Essayer d'extraire les métadonnées du PDF
        if (data.info) {
            metadata.title = data.info.Title || '';
            metadata.author = data.info.Author || '';
            metadata.subject = data.info.Subject || '';
            metadata.creator = data.info.Creator || '';
            metadata.producer = data.info.Producer || '';
        }

        // Si pas de métadonnées, essayer d'extraire du nom de fichier
        if (!metadata.title || !metadata.author) {
            const fileName = path.basename(filePath, '.pdf');
            const extracted = extractFromFileName(fileName);
            
            if (!metadata.title) metadata.title = extracted.title;
            if (!metadata.author) metadata.author = extracted.author;
        }

        // Si toujours pas d'informations, essayer l'analyse d'image avec Claude
        if ((!metadata.title || !metadata.author) && CLAUDE_API_KEY) {
            console.log(chalk.blue(`  🔍 Tentative d'analyse d'image avec Claude...`));
            
            // Extraire la première page en image
            const imagePath = await extractFirstPageImage(filePath);
            
            if (imagePath) {
                // Analyser l'image avec Claude
                const claudeResult = await analyzeImageWithClaude(imagePath);
                
                if (claudeResult && (claudeResult.title || claudeResult.author)) {
                    console.log(chalk.green(`  ✅ Claude a identifié: ${claudeResult.title} par ${claudeResult.author} (confiance: ${claudeResult.confidence}%)`));
                    
                    if (!metadata.title && claudeResult.title) {
                        metadata.title = claudeResult.title;
                    }
                    if (!metadata.author && claudeResult.author) {
                        metadata.author = claudeResult.author;
                    }
                } else {
                    console.log(chalk.yellow(`  ⚠️  Claude n'a pas pu identifier les informations`));
                }
                
                // Nettoyer l'image temporaire
                try {
                    await fs.remove(imagePath);
                } catch (cleanupError) {
                    // Ignorer les erreurs de nettoyage
                }
            } else {
                console.log(chalk.yellow(`  ⚠️  Impossible d'extraire l'image de la première page`));
            }
        }

        return metadata;
    } catch (error) {
        console.error(chalk.red(`Erreur lors de l'extraction des métadonnées de ${filePath}:`), error.message);
        return null;
    }
}

/**
 * Extrait le titre et l'auteur du nom de fichier
 */
function extractFromFileName(fileName) {
    // Nettoyer le nom de fichier
    let cleanName = fileName
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Patterns courants pour les noms de BD
    const patterns = [
        // Format: "Auteur - Titre"
        /^(.+?)\s*[-–]\s*(.+)$/,
        // Format: "Titre par Auteur"
        /^(.+?)\s+par\s+(.+)$/,
        // Format: "Titre (Auteur)"
        /^(.+?)\s*\(([^)]+)\)$/,
        // Format: "Auteur - Titre - Tome"
        /^(.+?)\s*[-–]\s*(.+?)\s*[-–]\s*tome\s*\d+/i,
    ];

    for (const pattern of patterns) {
        const match = cleanName.match(pattern);
        if (match) {
            return {
                author: match[1].trim(),
                title: match[2].trim()
            };
        }
    }

    // Si aucun pattern ne correspond, considérer tout comme titre
    return {
        author: 'Auteur Inconnu',
        title: cleanName
    };
}

/**
 * Extrait la première page d'un PDF en image
 */
async function extractFirstPageImage(pdfPath) {
    try {
        const options = {
            density: 300,
            saveFilename: "first_page",
            savePath: path.dirname(pdfPath),
            format: "png",
            width: 2048,
            height: 2048
        };

        const convert = fromPath(pdfPath, options);
        const pageData = await convert(1); // Première page
        
        if (pageData && pageData.length > 0) {
            return pageData[0].path;
        }
        
        return null;
    } catch (error) {
        console.error(chalk.red(`Erreur lors de l'extraction de l'image de ${pdfPath}:`), error.message);
        return null;
    }
}

/**
 * Analyse une image avec l'API Claude pour extraire les informations de la BD
 */
async function analyzeImageWithClaude(imagePath) {
    try {
        if (!CLAUDE_API_KEY) {
            console.log(chalk.yellow('⚠️  Clé API Claude non définie. Utilisez la variable d\'environnement CLAUDE_API_KEY'));
            return null;
        }

        // Lire l'image en base64
        const imageBuffer = await fs.readFile(imagePath);
        const base64Image = imageBuffer.toString('base64');

        const prompt = `Analyse cette image de couverture de bande dessinée et extrait les informations suivantes au format JSON :
{
  "title": "Titre de la bande dessinée",
  "author": "Nom de l'auteur ou du dessinateur",
  "confidence": "niveau de confiance (0-100)"
}

Si tu ne peux pas identifier clairement ces informations, retourne null pour les champs manquants.`;

        const response = await axios.post(CLAUDE_API_URL, {
            model: "claude-3-sonnet-20240229",
            max_tokens: 1000,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        },
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "image/png",
                                data: base64Image
                            }
                        }
                    ]
                }
            ]
        }, {
            headers: {
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            }
        });

        const content = response.data.content[0].text;
        
        // Essayer de parser la réponse JSON
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                return {
                    title: result.title || '',
                    author: result.author || '',
                    confidence: result.confidence || 0
                };
            }
        } catch (parseError) {
            console.log(chalk.yellow('⚠️  Impossible de parser la réponse JSON de Claude'));
        }

        // Si pas de JSON valide, essayer d'extraire manuellement
        const titleMatch = content.match(/title["\s:]+([^"\n,}]+)/i);
        const authorMatch = content.match(/author["\s:]+([^"\n,}]+)/i);
        
        return {
            title: titleMatch ? titleMatch[1].trim() : '',
            author: authorMatch ? authorMatch[1].trim() : '',
            confidence: 50
        };

    } catch (error) {
        console.error(chalk.red(`Erreur lors de l'analyse avec Claude: ${error.message}`));
        return null;
    }
}

/**
 * Scanne récursivement un dossier pour les fichiers PDF
 */
async function scanDirectory(dirPath) {
    const pdfFiles = [];
    
    try {
        const items = await fs.readdir(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = await fs.stat(fullPath);
            
            if (stat.isDirectory()) {
                // Récursion pour les sous-dossiers
                const subFiles = await scanDirectory(fullPath);
                pdfFiles.push(...subFiles);
            } else if (stat.isFile() && path.extname(item).toLowerCase() === '.pdf') {
                pdfFiles.push(fullPath);
            }
        }
    } catch (error) {
        console.error(chalk.red(`Erreur lors du scan du dossier ${dirPath}:`), error.message);
    }
    
    return pdfFiles;
}

module.exports = {
    extractPDFMetadata,
    extractFromFileName,
    extractFirstPageImage,
    analyzeImageWithClaude,
    scanDirectory
}; 