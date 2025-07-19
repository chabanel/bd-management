require("dotenv").config();
const axios = require("axios");
const chalk = require("chalk");

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID || "";

/**
 * Effectue une recherche web pour valider les informations d'une BD
 */
async function validateBDInfo(title, author, isbn = "") {
  try {
    console.log(chalk.blue(`  🔍 Recherche web pour validation...`));

    // Construire la requête de recherche
    let searchQuery = "";
    
    if (title && author) {
      searchQuery = `"${title}" "${author}" bande dessinée`;
    } else if (title) {
      searchQuery = `"${title}" bande dessinée`;
    } else if (author) {
      searchQuery = `"${author}" bande dessinée`;
    } else if (isbn) {
      searchQuery = `ISBN ${isbn} bande dessinée`;
    } else {
      console.log(chalk.yellow(`  ⚠️  Pas assez d'informations pour la recherche web`));
      return null;
    }

    // Essayer d'abord avec l'API Google si disponible
    if (GOOGLE_API_KEY && GOOGLE_CSE_ID) {
      const googleResult = await searchWithGoogle(searchQuery);
      if (googleResult) {
        return googleResult;
      }
    }

    // Fallback : recherche avec DuckDuckGo (gratuit, pas d'API key nécessaire)
    const duckDuckGoResult = await searchWithDuckDuckGo(searchQuery);
    if (duckDuckGoResult) {
      return duckDuckGoResult;
    }

    // Fallback : recherche avec SerpAPI (gratuit avec clé demo)
    const serpApiResult = await searchWithWebSearch(searchQuery);
    if (serpApiResult) {
      return serpApiResult;
    }

    // Fallback : recherche sur des sites de BD populaires
    if (title || author) {
      const bdSitesResult = await searchOnBDSites(title, author);
      if (bdSitesResult) {
        return bdSitesResult;
      }
    }

    console.log(chalk.yellow(`  ⚠️  Aucun résultat de recherche web trouvé`));
    return null;

  } catch (error) {
    console.error(chalk.red(`  ❌ Erreur lors de la recherche web: ${error.message}`));
    return null;
  }
}

/**
 * Recherche avec l'API Google Custom Search
 */
async function searchWithGoogle(query) {
  try {
    const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CSE_ID,
        q: query,
        num: 5, // Limiter à 5 résultats
        safe: "active"
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      const results = response.data.items.map(item => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link,
        source: "Google"
      }));

      console.log(chalk.green(`  ✅ ${results.length} résultats Google trouvés`));
      return {
        query: query,
        results: results,
        source: "Google"
      };
    }

    return null;
  } catch (error) {
    console.log(chalk.yellow(`  ⚠️  Erreur API Google: ${error.message}`));
    return null;
  }
}

/**
 * Recherche avec DuckDuckGo (gratuit, pas d'API key)
 */
async function searchWithDuckDuckGo(query) {
  try {
    // Utiliser l'API Instant Answer de DuckDuckGo
    const response = await axios.get("https://api.duckduckgo.com/", {
      params: {
        q: query,
        format: "json",
        no_html: "1",
        skip_disambig: "1"
      },
      timeout: 10000
    });

    const data = response.data;

    // Construire les résultats
    const results = [];

    // Ajouter l'abstract si disponible
    if (data.Abstract) {
      results.push({
        title: data.Heading || "Résultat DuckDuckGo",
        snippet: data.Abstract,
        link: data.AbstractURL || "",
        source: "DuckDuckGo"
      });
    }

    // Ajouter les résultats liés
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 3).forEach(topic => {
        if (topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || "Résultat lié",
            snippet: topic.Text,
            link: topic.FirstURL || "",
            source: "DuckDuckGo"
          });
        }
      });
    }

    if (results.length > 0) {
      console.log(chalk.green(`  ✅ ${results.length} résultats DuckDuckGo trouvés`));
      return {
        query: query,
        results: results,
        source: "DuckDuckGo"
      };
    }

    return null;
  } catch (error) {
    console.log(chalk.yellow(`  ⚠️  Erreur DuckDuckGo: ${error.message}`));
    return null;
  }
}

/**
 * Recherche avec une API de recherche web gratuite
 */
async function searchWithWebSearch(query) {
  try {
    // Utiliser une API de recherche web gratuite
    const response = await axios.get("https://serpapi.com/search", {
      params: {
        q: query,
        engine: "google",
        api_key: "demo", // Clé de démonstration gratuite
        num: 5
      },
      timeout: 15000
    });

    if (response.data.organic_results && response.data.organic_results.length > 0) {
      const results = response.data.organic_results.map(item => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link,
        source: "SerpAPI"
      }));

      console.log(chalk.green(`  ✅ ${results.length} résultats SerpAPI trouvés`));
      return {
        query: query,
        results: results,
        source: "SerpAPI"
      };
    }

    return null;
  } catch (error) {
    console.log(chalk.yellow(`  ⚠️  Erreur SerpAPI: ${error.message}`));
    return null;
  }
}

/**
 * Recherche simple sur des sites de BD populaires
 */
async function searchOnBDSites(title, author) {
  try {
    const results = [];
    
    // Sites de BD populaires à vérifier
    const sites = [
      {
        name: "Bedetheque",
        url: `https://www.bedetheque.com/serie-${encodeURIComponent(title)}.html`,
        searchUrl: `https://www.bedetheque.com/recherche?q=${encodeURIComponent(title + " " + author)}`
      },
      {
        name: "ComicVine",
        url: `https://comicvine.gamespot.com/search/?header=1&q=${encodeURIComponent(title + " " + author)}`
      },
      {
        name: "Goodreads",
        url: `https://www.goodreads.com/search?q=${encodeURIComponent(title + " " + author + " comic")}`
      }
    ];

    // Simuler une recherche en vérifiant si les URLs existent
    for (const site of sites) {
      try {
        const response = await axios.head(site.url, { timeout: 5000 });
        if (response.status === 200) {
          results.push({
            title: `${title} - ${site.name}`,
            snippet: `Page trouvée sur ${site.name}`,
            link: site.url,
            source: site.name
          });
        }
      } catch (error) {
        // Ignorer les erreurs 404
      }
    }

    if (results.length > 0) {
      console.log(chalk.green(`  ✅ ${results.length} sites de BD trouvés`));
      return {
        query: `${title} ${author}`,
        results: results,
        source: "Sites BD"
      };
    }

    return null;
  } catch (error) {
    console.log(chalk.yellow(`  ⚠️  Erreur recherche sites BD: ${error.message}`));
    return null;
  }
}

/**
 * Recherche avec une API de recherche alternative (gratuite)
 */
async function searchWithAlternativeAPI(query) {
  try {
    // Utiliser une API de recherche gratuite
    const response = await axios.get("https://serpapi.com/search", {
      params: {
        q: query,
        engine: "google",
        api_key: "demo", // Clé de démonstration gratuite
        num: 3
      },
      timeout: 10000
    });

    if (response.data.organic_results && response.data.organic_results.length > 0) {
      const results = response.data.organic_results.map(item => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link,
        source: "Alternative API"
      }));

      console.log(chalk.green(`  ✅ ${results.length} résultats trouvés`));
      return {
        query: query,
        results: results,
        source: "Alternative API"
      };
    }

    return null;
  } catch (error) {
    console.log(chalk.yellow(`  ⚠️  Erreur API alternative: ${error.message}`));
    return null;
  }
}

/**
 * Analyse les résultats de recherche pour extraire des informations validées
 */
function analyzeSearchResults(searchData, originalData) {
  if (!searchData || !searchData.results || searchData.results.length === 0) {
    return null;
  }

  const analysis = {
    titleMatch: false,
    authorMatch: false,
    isbnMatch: false,
    confidence: 0,
    suggestions: [],
    validation: {
      title: originalData.title,
      author: originalData.author,
      isbn: originalData.isbn
    }
  };

  const searchText = searchData.results.map(r => 
    `${r.title} ${r.snippet}`.toLowerCase()
  ).join(" ");

  // Vérifier les correspondances
  if (originalData.title) {
    const titleWords = originalData.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const titleMatchCount = titleWords.filter(word => searchText.includes(word)).length;
    analysis.titleMatch = titleMatchCount >= Math.max(1, titleWords.length * 0.5);
  }

  if (originalData.author) {
    const authorWords = originalData.author.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const authorMatchCount = authorWords.filter(word => searchText.includes(word)).length;
    analysis.authorMatch = authorMatchCount >= Math.max(1, authorWords.length * 0.5);
  }

  if (originalData.isbn) {
    const cleanIsbn = originalData.isbn.replace(/[-\s]/g, "");
    analysis.isbnMatch = searchText.includes(cleanIsbn) || searchText.includes(originalData.isbn);
  }

  // Calculer la confiance
  let confidence = 0;
  if (analysis.titleMatch) confidence += 40;
  if (analysis.authorMatch) confidence += 40;
  if (analysis.isbnMatch) confidence += 20;
  analysis.confidence = confidence;

  // Extraire des suggestions
  searchData.results.forEach(result => {
    const text = `${result.title} ${result.snippet}`;
    
    // Chercher des titres alternatifs
    const titleMatches = text.match(/"([^"]{5,50})"/g);
    if (titleMatches) {
      titleMatches.forEach(match => {
        const cleanTitle = match.replace(/"/g, "");
        if (cleanTitle !== originalData.title && !analysis.suggestions.includes(cleanTitle)) {
          analysis.suggestions.push(cleanTitle);
        }
      });
    }

    // Chercher des auteurs alternatifs
    const authorPatterns = [
      /par\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /de\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /par\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g
    ];

    authorPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const author = match.replace(/^(par|de)\s+/i, "");
          if (author !== originalData.author && !analysis.suggestions.includes(author)) {
            analysis.suggestions.push(author);
          }
        });
      }
    });
  });

  return analysis;
}

/**
 * Affiche les résultats de validation
 */
function displayValidationResults(analysis) {
  if (!analysis) return;

  console.log(chalk.blue(`  📊 Résultats de validation:`));
  
  // Afficher les correspondances
  const matches = [];
  if (analysis.titleMatch) matches.push("Titre");
  if (analysis.authorMatch) matches.push("Auteur");
  if (analysis.isbnMatch) matches.push("ISBN");
  
  if (matches.length > 0) {
    console.log(chalk.green(`    ✅ Correspondances: ${matches.join(", ")}`));
  } else {
    console.log(chalk.yellow(`    ⚠️  Aucune correspondance trouvée`));
  }

  // Afficher la confiance
  let confidenceColor = chalk.red;
  if (analysis.confidence >= 60) confidenceColor = chalk.green;
  else if (analysis.confidence >= 30) confidenceColor = chalk.yellow;
  
  console.log(confidenceColor(`    📈 Confiance: ${analysis.confidence}%`));

  // Afficher les suggestions
  if (analysis.suggestions.length > 0) {
    console.log(chalk.cyan(`    💡 Suggestions:`));
    analysis.suggestions.slice(0, 3).forEach(suggestion => {
      console.log(chalk.white(`      • ${suggestion}`));
    });
  }
}

module.exports = {
  validateBDInfo,
  analyzeSearchResults,
  displayValidationResults,
  searchWithGoogle,
  searchWithDuckDuckGo,
  searchWithWebSearch,
  searchOnBDSites
}; 