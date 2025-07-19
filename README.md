# Scanner de Bandes Dessinées PDF

Un outil avancé pour scanner et organiser automatiquement les fichiers PDF de bandes dessinées en extrayant les métadonnées, analysant les couvertures et validant les informations via le web.

## 🚀 Fonctionnalités

- **Scan récursif** de dossiers pour les fichiers PDF
- **Extraction automatique** des métadonnées PDF
- **Analyse d'images** avec Claude AI pour identifier les informations de couverture
- **Validation web** des données extraites via recherche sur internet
- **Création d'inventaire CSV** avec toutes les informations extraites
- **Gestion intelligente** des entrées existantes (pas de duplication)
- **Support multi-pages** pour l'analyse d'images
- **Score de confiance** basé sur la validation web

## 📋 Prérequis

- Node.js (version 14 ou supérieure)
- Clé API Claude (optionnelle, pour l'analyse d'images)
- Clé API Google Custom Search (optionnelle, pour une meilleure validation web)

## 🛠️ Installation

1. Clonez le repository
2. Installez les dépendances :
```bash
npm install
```

3. Configurez les variables d'environnement (voir `CONFIGURATION_WEB.md`)

## 🎯 Utilisation

### Analyse complète avec validation web
```bash
npm start
# ou
node index.js
```

### Analyse sans validation web
```bash
npm run no-validation
```

### Test de la validation web
```bash
npm test
# ou
npm run validate
```

## 📊 Sortie

Le script génère un fichier `inventaire_bd.csv` avec les colonnes suivantes :
- Nom du fichier
- Titre
- Auteur
- Série
- Numéro
- ISBN
- Confiance (score de validation)
- Page analysée
- Date d'analyse

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env` avec les variables suivantes :

```bash
# Clé API Claude (pour l'analyse d'images)
CLAUDE_API_KEY=votre_clé_api_claude

# Clé API Google Custom Search (optionnel)
GOOGLE_API_KEY=votre_clé_api_google
GOOGLE_CSE_ID=votre_id_custom_search_engine

# Pour désactiver la validation web
ENABLE_WEB_VALIDATION=false
```

### Configuration du dossier source

Modifiez la constante `SOURCE_DIR` dans `index.js` pour pointer vers votre dossier de PDF :

```javascript
const SOURCE_DIR = "/chemin/vers/votre/dossier/bd";
```

## 🌐 Validation Web

Le script inclut une fonction de validation web qui :

1. **Recherche automatiquement** les informations extraites sur internet
2. **Calcule un score de confiance** basé sur les correspondances trouvées
3. **Utilise plusieurs sources** :
   - Google Custom Search (si configuré)
   - Sites de BD populaires (Bedetheque, ComicVine, Goodreads)
   - DuckDuckGo (fallback)

### Exemple de validation

```
📄 Traitement: exemple.pdf
  ✅ Analysé: Titre de la BD par Auteur
  🔍 Recherche web pour validation...
  ✅ 2 sites de BD trouvés
  📊 Résultats de validation:
    ✅ Correspondances: Titre
    📈 Confiance: 40%
  ✅ Validation web réussie - Confiance mise à jour: 40%
```

## 📁 Structure du projet

```
tri-bd/
├── index.js              # Script principal
├── pdf.js                # Fonctions d'extraction PDF
├── web-search.js         # Fonctions de validation web
├── test-validation.js    # Script de test de validation
├── run-without-validation.js # Script sans validation web
├── CONFIGURATION_WEB.md  # Documentation de configuration
├── inventaire_bd.csv     # Inventaire généré
├── images/               # Images temporaires d'analyse
└── bd/                   # Dossier source des PDF
```

## 🛠️ Dépendances

- `pdf-parse` : Extraction des métadonnées PDF
- `pdf2pic` : Conversion PDF vers image
- `axios` : Requêtes HTTP pour la validation web
- `chalk` : Coloration de la sortie console
- `fs-extra` : Gestion avancée des fichiers
- `dotenv` : Gestion des variables d'environnement

## 📝 Licence

ISC 