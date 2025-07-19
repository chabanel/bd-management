require("dotenv").config();
const fs = require("fs-extra");
const path = require("path");
const pdfParse = require("pdf-parse");
const chalk = require("chalk");
const { fromPath } = require("pdf2pic");
const axios = require("axios");

// Configuration
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ""; // Clé API Claude - définissez la variable d'environnement
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Extrait les métadonnées d'un fichier PDF
 */
async function extractPDFMetadata(filePath, pageNumber = 2) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);

    // Extraire les métadonnées du PDF
    const metadata = {
      title: "",
      author: "",
      subject: "",
      keywords: "",
      creator: "",
      producer: "",
    };

    // Essayer d'extraire les métadonnées du PDF
    if (data.info) {
      metadata.title = data.info.Title || "";
      metadata.author = data.info.Author || "";
      metadata.subject = data.info.Subject || "";
      metadata.creator = data.info.Creator || "";
      metadata.producer = data.info.Producer || "";
    }

    // Si on a analysé avec Claude mais pas trouvé de titre, ne pas utiliser le nom de fichier
    if (metadata.confidence > 0 && !metadata.title) {
      metadata.title = "";
    }

    // Si on a analysé avec Claude mais pas trouvé d'auteur, ne pas utiliser "Auteur Inconnu"
    if (metadata.confidence > 0 && !metadata.author) {
      metadata.author = "";
    }

    // Si toujours pas d'informations ou si l'auteur est inconnu, essayer l'analyse d'image avec Claude
    if (
      !metadata.title ||
      !metadata.author ||
      metadata.author === "Auteur Inconnu"
    ) {
      console.log(
        chalk.blue(`  🔍 Tentative d'analyse d'image avec Claude...`)
      );

      // Extraire une page en image
      const imageResult = await extractPageImage(filePath, pageNumber);

      if (imageResult) {
        const imagePath = imageResult.path;
        const pageNumber = imageResult.pageNumber;
        // Analyser l'image avec Claude si la clé API est disponible
        if (CLAUDE_API_KEY) {
          const claudeResult = await analyzeImageWithClaude(imagePath);

          if (claudeResult && (claudeResult.title || claudeResult.author)) {
            console.log(
              chalk.green(
                `  ✅ Claude a identifié: ${
                  claudeResult.title || "Titre inconnu"
                } par ${claudeResult.author || "Auteur inconnu"} (confiance: ${
                  claudeResult.confidence
                }%)`
              )
            );

            // Afficher les détails si disponibles
            if (claudeResult.rawResult) {
              const raw = claudeResult.rawResult;
              if (raw.creators && raw.creators.publisher) {
                console.log(
                  chalk.cyan(`    📚 Éditeur: ${raw.creators.publisher}`)
                );
              }
              if (raw.metadata && raw.metadata.language) {
                console.log(
                  chalk.cyan(`    🌍 Langue: ${raw.metadata.language}`)
                );
              }
              if (raw.notes) {
                console.log(chalk.yellow(`    📝 Notes: ${raw.notes}`));
              }
            }

            // Toujours utiliser les résultats de Claude s'ils existent
            if (claudeResult.title !== undefined) {
              metadata.title = claudeResult.title || "";
            }
            if (claudeResult.author !== undefined) {
              metadata.author = claudeResult.author || "";
            }

            // Ajouter les informations supplémentaires si disponibles
            if (claudeResult.rawResult) {
              const raw = claudeResult.rawResult;
              if (raw.creators && raw.creators.publisher) {
                metadata.publisher = raw.creators.publisher;
              }
              if (raw.metadata && raw.metadata.language) {
                metadata.language = raw.metadata.language;
              }
              if (raw.metadata && raw.metadata.isbn) {
                // Extraire seulement l'ISBN PDF si plusieurs formats sont présents
                let isbn = raw.metadata.isbn;
                if (typeof isbn === "string") {
                  // Chercher l'ISBN PDF dans le texte
                  const pdfMatch = isbn.match(/978[-\d]+.*?PDF\)/i);
                  if (pdfMatch) {
                    // Extraire juste le numéro ISBN
                    const isbnNumber = pdfMatch[0].match(/978[-\d]+/);
                    metadata.isbn = isbnNumber ? isbnNumber[0] : isbn;
                  } else {
                    // Si pas de format spécifié, prendre le premier ISBN trouvé
                    const isbnNumber = isbn.match(/978[-\d]+/);
                    metadata.isbn = isbnNumber ? isbnNumber[0] : isbn;
                  }
                } else {
                  metadata.isbn = isbn;
                }
              }
              metadata.confidence = claudeResult.confidence;
            }

            // Ajouter le numéro de page analysée
            metadata.pageAnalyzed = pageNumber;

            // Extraire les informations de série et volume
            if (claudeResult.rawResult && claudeResult.rawResult.title) {
              const raw = claudeResult.rawResult;
              if (raw.title.series) {
                metadata.series = raw.title.series;
              }
              if (raw.title.volume) {
                metadata.volume = raw.title.volume;
              }
            }

            // Si on a une série mais pas d'auteur, la série pourrait être l'auteur
            if (
              metadata.series &&
              !metadata.author &&
              metadata.series !== metadata.author
            ) {
              // Dans certains cas, Claude met l'auteur dans "series" au lieu de "authors"
              // Si on a une série mais pas d'auteur, utiliser la série comme auteur
              metadata.author = metadata.series;
              metadata.series = ""; // Vider la série car c'était en fait l'auteur
            }
          } else {
            console.log(
              chalk.yellow(
                `  ⚠️  Claude n'a pas pu identifier les informations`
              )
            );
          }
        } else {
          console.log(
            chalk.yellow(
              `  ⚠️  Clé API Claude non définie - image extraite pour analyse manuelle`
            )
          );
        }

        // Nettoyer l'image temporaire après traitement
        try {
          await fs.remove(imagePath);
          console.log(chalk.gray(`  🗑️  Image temporaire supprimée`));
        } catch (cleanupError) {
          console.log(
            chalk.yellow(`  ⚠️  Impossible de supprimer l'image temporaire`)
          );
        }
      } else {
        console.log(
          chalk.yellow(
            `  ⚠️  Impossible d'extraire l'image de la première page`
          )
        );
      }
    }

    return metadata;
  } catch (error) {
    console.error(
      chalk.red(`Erreur lors de l'extraction des métadonnées de ${filePath}:`),
      error.message
    );
    return null;
  }
}

/**
 * Extrait le titre et l'auteur du nom de fichier
 */
function extractFromFileName(fileName) {
  // Nettoyer le nom de fichier
  let cleanName = fileName.replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();

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
        title: match[2].trim(),
      };
    }
  }

  // Si aucun pattern ne correspond, considérer tout comme titre
  return {
    author: "Auteur Inconnu",
    title: cleanName,
  };
}

/**
 * Extrait une page d'un PDF en image
 */
async function extractPageImage(pdfPath, pageNumber = 2) {
  try {
    // Créer le dossier images s'il n'existe pas
    const imagesDir = path.join(process.cwd(), "images");
    await fs.ensureDir(imagesDir);

    // Générer un nom unique basé sur le nom du fichier PDF
    const pdfName = path.basename(pdfPath, ".pdf");
    const timestamp = Date.now();
    const imageName = `${pdfName}_${timestamp}.png`;

    const options = {
      density: 300,
      saveFilename: imageName,
      savePath: imagesDir,
      format: "png",
      width: 2048,
      height: 2048,
    };

    const convert = fromPath(pdfPath, options);
    const pageData = await convert(pageNumber);

    if (pageData && pageData.path) {
      // Vérifier si le fichier existe
      if (await fs.pathExists(pageData.path)) {
        return { path: pageData.path, pageNumber: pageNumber };
      }
    }

    return null;
  } catch (error) {
    console.error(
      chalk.red(`Erreur lors de l'extraction de l'image de ${pdfPath}:`),
      error.message
    );
    return null;
  }
}

/**
 * Analyse une image avec l'API Claude pour extraire les informations de la BD
 */
async function analyzeImageWithClaude(imagePath) {
  try {
    if (!CLAUDE_API_KEY) {
      console.log(
        chalk.yellow(
          "⚠️  Clé API Claude non définie. Utilisez la variable d'environnement CLAUDE_API_KEY"
        )
      );
      return null;
    }

    // Lire l'image en base64
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const prompt = `Analyse cette image de couverture de bande dessinée et extrait les informations suivantes. Recherche attentivement tous les textes visibles sur la couverture.

Instructions :
1. Examine l'image entière, y compris les zones en haut, en bas et sur les côtés
2. Les informations peuvent être écrites dans différentes langues
3. Distingue bien le titre principal des sous-titres ou mentions de collection
4. Les noms d'auteurs peuvent apparaître avec différentes mentions (scénario, dessin, couleurs)

Format de sortie JSON :
{
  "title": {
    "main": "Titre principal de la BD",
    "subtitle": "Sous-titre éventuel",
    "series": "Nom de la série si applicable",
    "volume": "Numéro du tome/volume si visible"
  },
  "creators": {
    "authors": [
      {
        "name": "Nom complet",
        "role": "scénario/dessin/couleurs/autre"
      }
    ],
    "publisher": "Éditeur si visible"
  },
  "metadata": {
    "language": "Langue détectée du titre",
    "isbn": "ISBN si visible",
    "price": "Prix si visible"
  },
  "confidence": {
    "title": 0-100,
    "authors": 0-100,
    "overall": 0-100
  },
  "notes": "Informations supplémentaires ou difficultés rencontrées"
}

Règles importantes :
- Si une information n'est pas clairement lisible, mets null
- Pour la confiance : 100 = parfaitement lisible, 50 = partiellement lisible, 0 = illisible
- Si plusieurs auteurs, crée une entrée pour chacun dans le tableau "authors"
- Indique dans "notes" si certains textes sont flous, coupés ou partiellement cachés`;

    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: base64Image,
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    const content = response.data.content[0].text;

    // Essayer de parser la réponse JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log(
          chalk.gray(`    Debug - Result: ${JSON.stringify(result)}`)
        );

        // Extraire le titre principal
        let title = "";
        if (result.title) {
          if (typeof result.title === "string") {
            title = result.title;
          } else if (result.title.main) {
            title = result.title.main;
            if (result.title.subtitle) {
              title += ` - ${result.title.subtitle}`;
            }
            if (result.title.volume) {
              title += ` (Tome ${result.title.volume})`;
            }
          }
        }

        // Si pas de titre principal mais qu'on a un sous-titre ou une série, l'utiliser
        if (!title && result.title) {
          if (result.title.subtitle) {
            title = result.title.subtitle;
          } else if (result.title.series) {
            title = result.title.series;
          }
        }

        // Extraire seulement les auteurs principaux (scénario/dessin)
        let author = "";
        if (
          result.creators &&
          result.creators.authors &&
          result.creators.authors.length > 0
        ) {
          const mainAuthors = result.creators.authors
            .filter((a) => {
              const role = a.role ? a.role.toLowerCase() : "";
              // Inclure seulement les rôles principaux
              return (
                role.includes("scénario") ||
                role.includes("dessin") ||
                role.includes("auteur") ||
                role.includes("scenario") ||
                role.includes("drawing") ||
                role.includes("author") ||
                !role || // Si pas de rôle spécifié, inclure
                role === ""
              );
            })
            .map((a) => a.name)
            .filter((name) => name && name.trim());
          author = mainAuthors.join(", ");
        }

        // Calculer la confiance globale
        let confidence = 50; // Valeur par défaut
        if (result.confidence) {
          if (typeof result.confidence === "number") {
            confidence = result.confidence;
          } else if (result.confidence.overall) {
            confidence = result.confidence.overall;
          } else if (result.confidence.title && result.confidence.authors) {
            confidence = Math.round(
              (result.confidence.title + result.confidence.authors) / 2
            );
          }
        }

        return {
          title: title,
          author: author,
          confidence: confidence,
          rawResult: result, // Garder le résultat complet pour debug
        };
      }
    } catch (parseError) {
      console.log(
        chalk.yellow("⚠️  Impossible de parser la réponse JSON de Claude")
      );
    }

    // Si pas de JSON valide, essayer d'extraire manuellement
    const titleMatch = content.match(/title["\s:]+([^"\n,}]+)/i);
    const authorMatch = content.match(/author["\s:]+([^"\n,}]+)/i);

    return {
      title: titleMatch ? titleMatch[1].trim() : "",
      author: authorMatch ? authorMatch[1].trim() : "",
      confidence: 50,
    };
  } catch (error) {
    console.error(
      chalk.red(`Erreur lors de l'analyse avec Claude: ${error.message}`)
    );
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
      } else if (stat.isFile() && path.extname(item).toLowerCase() === ".pdf") {
        pdfFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.error(
      chalk.red(`Erreur lors du scan du dossier ${dirPath}:`),
      error.message
    );
  }

  return pdfFiles;
}

module.exports = {
  extractPDFMetadata,
  extractFromFileName,
  extractPageImage,
  analyzeImageWithClaude,
  scanDirectory,
};
