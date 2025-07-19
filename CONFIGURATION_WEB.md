# Configuration de la Validation Web

## Vue d'ensemble

Le script inclut maintenant une fonction de validation web qui recherche automatiquement les informations extraites sur internet pour confirmer leur exactitude.

## Configuration

### 1. Variables d'environnement

Créez un fichier `.env` dans le répertoire du projet avec les variables suivantes :

```bash
# Clé API Google Custom Search (optionnel)
# Obtenez votre clé sur: https://console.cloud.google.com/
GOOGLE_API_KEY=votre_clé_api_google

# ID du moteur de recherche personnalisé Google (optionnel)
# Créez votre CSE sur: https://cse.google.com/
GOOGLE_CSE_ID=votre_id_custom_search_engine

# Pour désactiver la validation web
ENABLE_WEB_VALIDATION=false

# Clé API Claude (si vous l'utilisez déjà)
CLAUDE_API_KEY=votre_clé_api_claude
```

### 2. Configuration Google (optionnel)

Si vous souhaitez utiliser l'API Google pour de meilleurs résultats :

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un projet et activez l'API Custom Search
3. Créez des identifiants (clé API)
4. Allez sur [Google Custom Search](https://cse.google.com/)
5. Créez un moteur de recherche personnalisé
6. Notez l'ID du moteur de recherche

### 3. Fallback automatique

Si vous n'avez pas de clé Google, le script utilise automatiquement DuckDuckGo (gratuit, pas de clé nécessaire).

## Fonctionnalités

### Validation automatique
- Recherche web des titres, auteurs et ISBN extraits
- Calcul d'un score de confiance basé sur les correspondances
- Suggestions d'amélioration des données

### Sources de recherche
1. **Google Custom Search** (si configuré)
2. **SerpAPI** (clé demo gratuite)
3. **Sites de BD populaires** (Bedetheque, ComicVine, Goodreads)
4. **DuckDuckGo** (fallback automatique)

### Analyse des résultats
- Correspondance des titres
- Correspondance des auteurs
- Correspondance des ISBN
- Suggestions d'amélioration
- Score de confiance global

## Utilisation

La validation web se lance automatiquement pour chaque fichier analysé. Vous pouvez la désactiver en définissant `ENABLE_WEB_VALIDATION=false` dans votre fichier `.env`.

## Exemple de sortie

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

## Scripts de test

Vous pouvez tester la validation web indépendamment avec :

```bash
node test-validation.js
```

Ce script teste la validation web avec des exemples de BD connues. 