const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

// Import des fonctions PDF
const { 
    extractPDFMetadata, 
    extractFromFileName, 
    scanDirectory 
} = require('./pdf.js');

// Configuration
const SOURCE_DIR = "/Users/pcidss/developpement/tri-bd/bd"; // Dossier à scanner - MODIFIEZ ICI

// Statistiques globales
const stats = {
  scanned: 0,
  processed: 0,
  errors: 0,
  authors: new Set(),
};

/**
 * Nettoie et normalise un nom de fichier/dossier
 */
function sanitizeName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, "") // Caractères interdits Windows
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 200); // Limiter la longueur
}

/**
 * Lit le fichier CSV existant s'il existe
 */
async function readExistingCSV(csvPath) {
  try {
    if (await fs.pathExists(csvPath)) {
      const content = await fs.readFile(csvPath, "utf8");
      const lines = content.split("\n").filter((line) => line.trim());

      if (lines.length > 1) {
        const headers = lines[0].split(",").map((h) => h.replace(/"/g, ""));
        const existingData = {};

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.replace(/"/g, ""));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });
          existingData[row["Nom du fichier"]] = row;
        }

        return existingData;
      }
    }
    return {};
  } catch (error) {
    console.log(
      chalk.yellow(
        "⚠️  Impossible de lire le CSV existant, création d'un nouveau fichier"
      )
    );
    return {};
  }
}

/**
 * Analyse les fichiers PDF et crée un fichier CSV
 */
async function analyzeFiles(sourceDir, pdfFiles) {
  console.log(
    chalk.blue(`\n📁 Analyse des ${pdfFiles.length} fichiers PDF...`)
  );

  // Lire le CSV existant
  const csvPath = path.join(process.cwd(), "inventaire_bd.csv");
  const existingData = await readExistingCSV(csvPath);
  console.log(
    chalk.gray(
      `📊 ${Object.keys(existingData).length} entrées existantes trouvées`
    )
  );

  const csvData = [];
  const csvHeaders = [
    "Nom du fichier",
    "Titre",
    "Auteur",
    "Série",
    "Numéro",
    "ISBN",
    "Confiance",
    "Page analysée",
    "Date d'analyse",
  ];

  for (const pdfFile of pdfFiles) {
    try {
      stats.scanned++;
      const fileName = path.basename(pdfFile);

      console.log(chalk.gray(`\n📄 Traitement: ${fileName}`));

      // Vérifier si le fichier a déjà été analysé avec succès
      const existingEntry = existingData[fileName];
      if (
        existingEntry &&
        existingEntry["Titre"] &&
        existingEntry["Auteur"] &&
        existingEntry["Auteur"] !== "Auteur Inconnu"
      ) {
        console.log(
          chalk.cyan(
            `  ⏭️  Déjà analysé: ${existingEntry["Titre"]} par ${existingEntry["Auteur"]}`
          )
        );
        csvData.push(existingEntry);
        stats.processed++;
        if (existingEntry["Auteur"]) {
          stats.authors.add(existingEntry["Auteur"]);
        }
        continue;
      }

      // Extraire les métadonnées
      const metadata = await extractPDFMetadata(pdfFile);

      if (!metadata) {
        stats.errors++;
        continue;
      }

      // Préparer les données pour le CSV
      const csvRow = {
        "Nom du fichier": fileName,
        Titre: metadata.title || "",
        Auteur: metadata.author || "",
        Série: metadata.series || "",
        Numéro: metadata.volume || "",
        ISBN: metadata.isbn || "",
        Confiance: metadata.confidence || "",
        "Page analysée": metadata.pageAnalyzed || "",
        "Date d'analyse": new Date().toISOString(),
      };

      csvData.push(csvRow);

      stats.processed++;
      if (csvRow["Auteur"]) {
        stats.authors.add(csvRow["Auteur"]);
      }

      // Afficher le message de traitement
      const titreAffichage = csvRow["Titre"] || "Titre non identifié";
      const auteurAffichage = csvRow["Auteur"] || "Auteur non identifié";
      console.log(
        chalk.green(`  ✅ Analysé: ${titreAffichage} par ${auteurAffichage}`)
      );
    } catch (error) {
      console.error(
        chalk.red(`  ❌ Erreur lors du traitement de ${pdfFile}:`),
        error.message
      );
      stats.errors++;
    }
  }

  // Créer le fichier CSV
  if (csvData.length > 0) {
    const csvPath = path.join(process.cwd(), "inventaire_bd.csv");
    await createCSVFile(csvPath, csvHeaders, csvData);
    console.log(chalk.blue(`\n📊 Inventaire sauvegardé dans: ${csvPath}`));
  }
}

/**
 * Crée un fichier CSV avec les données
 */
async function createCSVFile(filePath, headers, data) {
  try {
    // Créer l'en-tête CSV
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header] || "";
            // Échapper les virgules et guillemets dans les valeurs
            if (
              typeof value === "string" &&
              (value.includes(",") ||
                value.includes('"') ||
                value.includes("\n"))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    await fs.writeFile(filePath, csvContent, "utf8");
  } catch (error) {
    console.error(
      chalk.red(`Erreur lors de la création du fichier CSV: ${error.message}`)
    );
  }
}

/**
 * Affiche les statistiques finales
 */
function showStats() {
  console.log(chalk.blue("\n📊 Statistiques finales:"));
  console.log(chalk.white(`  • Fichiers scannés: ${stats.scanned}`));
  console.log(chalk.green(`  • Fichiers traités: ${stats.processed}`));
  console.log(chalk.red(`  • Erreurs: ${stats.errors}`));
  console.log(chalk.cyan(`  • Auteurs trouvés: ${stats.authors.size}`));

  if (stats.authors.size > 0) {
    console.log(chalk.cyan("\n👥 Auteurs:"));
    Array.from(stats.authors)
      .sort()
      .forEach((author) => {
        console.log(chalk.white(`  • ${author}`));
      });
  }
}

/**
 * Lance le processus de scan et d'organisation
 */
async function run() {
  console.log(chalk.blue("🎯 Scanner de Bandes Dessinées PDF"));
  console.log(chalk.gray("=====================================\n"));

  try {
    // Vérifier que le dossier source existe
    if (!(await fs.pathExists(SOURCE_DIR))) {
      console.error(
        chalk.red(`❌ Le dossier source n'existe pas: ${SOURCE_DIR}`)
      );
      console.log(
        chalk.yellow(
          "💡 Modifiez la constante SOURCE_DIR dans le fichier index.js"
        )
      );
      return;
    }

    console.log(chalk.blue(`📁 Dossier source: ${SOURCE_DIR}`));

    console.log(chalk.blue(`\n🔍 Scan du dossier: ${SOURCE_DIR}`));

    // Scanner les fichiers PDF
    const pdfFiles = await scanDirectory(SOURCE_DIR);

    if (pdfFiles.length === 0) {
      console.log(
        chalk.yellow("⚠️  Aucun fichier PDF trouvé dans le dossier spécifié.")
      );
      return;
    }

    console.log(chalk.green(`✅ ${pdfFiles.length} fichiers PDF trouvés`));

    // Analyser les fichiers et créer le CSV
    await analyzeFiles(SOURCE_DIR, pdfFiles);

    // Afficher les statistiques
    showStats();

    console.log(
      chalk.green(`\n🎉 Analyse terminée ! L'inventaire CSV a été créé.`)
    );
  } catch (error) {
    console.error(chalk.red("❌ Erreur lors de l'exécution:"), error.message);
  }
}

// Lancer le programme
if (require.main === module) {
  run();
}

module.exports = {
  run,
  analyzeFiles,
  showStats,
  sanitizeName,
  createCSVFile,
};
