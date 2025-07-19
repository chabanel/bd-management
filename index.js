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
const SOURCE_DIR = '/Users/pcidss/developpement/tri-bd/bd'; // Dossier à scanner - MODIFIEZ ICI
const TARGET_DIR = path.join(process.cwd(), 'BD_Organisees'); // Dossier de destination

// Statistiques globales
const stats = {
    scanned: 0,
    processed: 0,
    errors: 0,
    authors: new Set()
};

/**
 * Nettoie et normalise un nom de fichier/dossier
 */
function sanitizeName(name) {
    return name
        .replace(/[<>:"/\\|?*]/g, '') // Caractères interdits Windows
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200); // Limiter la longueur
}

/**
 * Organise les fichiers PDF par auteur
 */
async function organizeFiles(sourceDir, targetDir, pdfFiles) {
    console.log(chalk.blue(`\n📁 Organisation des ${pdfFiles.length} fichiers PDF...`));
    
    for (const pdfFile of pdfFiles) {
        try {
            stats.scanned++;
            
            console.log(chalk.gray(`\n📄 Traitement: ${path.basename(pdfFile)}`));
            
            // Extraire les métadonnées
            const metadata = await extractPDFMetadata(pdfFile);
            
            if (!metadata) {
                stats.errors++;
                continue;
            }

            // Nettoyer les noms
            const author = sanitizeName(metadata.author || 'Auteur Inconnu');
            const title = sanitizeName(metadata.title || path.basename(pdfFile, '.pdf'));
            
            // Créer le dossier de l'auteur
            const authorDir = path.join(targetDir, author);
            await fs.ensureDir(authorDir);
            
            // Créer le nouveau nom de fichier
            const newFileName = `${title}.pdf`;
            const targetPath = path.join(authorDir, newFileName);
            
            // Vérifier si le fichier existe déjà
            if (await fs.pathExists(targetPath)) {
                const baseName = path.basename(newFileName, '.pdf');
                const ext = path.extname(newFileName);
                let counter = 1;
                let finalPath = targetPath;
                
                while (await fs.pathExists(finalPath)) {
                    finalPath = path.join(authorDir, `${baseName} (${counter})${ext}`);
                    counter++;
                }
                
                await fs.copy(pdfFile, finalPath);
                console.log(chalk.yellow(`  → Copié vers: ${path.relative(targetDir, finalPath)}`));
            } else {
                await fs.copy(pdfFile, targetPath);
                console.log(chalk.green(`  → Copié vers: ${path.relative(targetDir, targetPath)}`));
            }
            
            stats.processed++;
            stats.authors.add(author);
            
        } catch (error) {
            console.error(chalk.red(`  ❌ Erreur lors du traitement de ${pdfFile}:`), error.message);
            stats.errors++;
        }
    }
}

/**
 * Affiche les statistiques finales
 */
function showStats() {
    console.log(chalk.blue('\n📊 Statistiques finales:'));
    console.log(chalk.white(`  • Fichiers scannés: ${stats.scanned}`));
    console.log(chalk.green(`  • Fichiers traités: ${stats.processed}`));
    console.log(chalk.red(`  • Erreurs: ${stats.errors}`));
    console.log(chalk.cyan(`  • Auteurs trouvés: ${stats.authors.size}`));
    
    if (stats.authors.size > 0) {
        console.log(chalk.cyan('\n👥 Auteurs:'));
        Array.from(stats.authors).sort().forEach(author => {
            console.log(chalk.white(`  • ${author}`));
        });
    }
}

/**
 * Lance le processus de scan et d'organisation
 */
async function run() {
    console.log(chalk.blue('🎯 Scanner de Bandes Dessinées PDF'));
    console.log(chalk.gray('=====================================\n'));

    try {
        // Vérifier que le dossier source existe
        if (!await fs.pathExists(SOURCE_DIR)) {
            console.error(chalk.red(`❌ Le dossier source n'existe pas: ${SOURCE_DIR}`));
            console.log(chalk.yellow('💡 Modifiez la constante SOURCE_DIR dans le fichier index.js'));
            return;
        }

        console.log(chalk.blue(`📁 Dossier source: ${SOURCE_DIR}`));
        console.log(chalk.blue(`📁 Dossier destination: ${TARGET_DIR}`));

        // Créer le dossier de destination
        await fs.ensureDir(TARGET_DIR);

        console.log(chalk.blue(`\n🔍 Scan du dossier: ${SOURCE_DIR}`));
        
        // Scanner les fichiers PDF
        const pdfFiles = await scanDirectory(SOURCE_DIR);
        
        if (pdfFiles.length === 0) {
            console.log(chalk.yellow('⚠️  Aucun fichier PDF trouvé dans le dossier spécifié.'));
            return;
        }

        console.log(chalk.green(`✅ ${pdfFiles.length} fichiers PDF trouvés`));

        // Organiser les fichiers
        await organizeFiles(SOURCE_DIR, TARGET_DIR, pdfFiles);

        // Afficher les statistiques
        showStats();

        console.log(chalk.green(`\n🎉 Organisation terminée ! Les fichiers sont dans: ${TARGET_DIR}`));

    } catch (error) {
        console.error(chalk.red('❌ Erreur lors de l\'exécution:'), error.message);
    }
}

// Lancer le programme
if (require.main === module) {
    run();
}

module.exports = {
    run,
    organizeFiles,
    showStats,
    sanitizeName
};
