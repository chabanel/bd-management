require("dotenv").config();
const chalk = require("chalk");
const {
  validateBDInfo,
  analyzeSearchResults,
  displayValidationResults,
} = require("./web-search.js");

/**
 * Test de la validation web avec des exemples
 */
async function testWebValidation() {
  console.log(chalk.blue("🧪 Test de la Validation Web"));
  console.log(chalk.gray("============================\n"));

  const testCases = [
    {
      title: "Astérix",
      author: "René Goscinny",
      isbn: "978-2-86497-133-4",
      description: "BD classique française"
    },
    {
      title: "Tintin",
      author: "Hergé",
      isbn: "",
      description: "BD belge célèbre"
    },
    {
      title: "Persepolis",
      author: "Marjane Satrapi",
      isbn: "978-2-203-00105-3",
      description: "BD autobiographique"
    },
    {
      title: "Maus",
      author: "Art Spiegelman",
      isbn: "",
      description: "BD historique"
    }
  ];

  for (const testCase of testCases) {
    console.log(chalk.cyan(`\n📚 Test: ${testCase.description}`));
    console.log(chalk.gray(`   Titre: ${testCase.title}`));
    console.log(chalk.gray(`   Auteur: ${testCase.author}`));
    if (testCase.isbn) {
      console.log(chalk.gray(`   ISBN: ${testCase.isbn}`));
    }

    try {
      const searchData = await validateBDInfo(
        testCase.title,
        testCase.author,
        testCase.isbn
      );

      if (searchData) {
        const analysis = analyzeSearchResults(searchData, {
          title: testCase.title,
          author: testCase.author,
          isbn: testCase.isbn
        });

        if (analysis) {
          displayValidationResults(analysis);
        } else {
          console.log(chalk.yellow("  ⚠️  Impossible d'analyser les résultats"));
        }
      } else {
        console.log(chalk.yellow("  ⚠️  Aucun résultat de recherche trouvé"));
      }
    } catch (error) {
      console.error(chalk.red(`  ❌ Erreur: ${error.message}`));
    }

    // Pause entre les tests pour éviter de surcharger les APIs
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(chalk.blue("\n✅ Tests terminés"));
}

// Lancer les tests si le script est exécuté directement
if (require.main === module) {
  testWebValidation().catch(console.error);
}

module.exports = {
  testWebValidation
}; 