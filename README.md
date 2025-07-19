# Scanner de Bandes Dessinées PDF

Un programme Node.js pour scanner, organiser et renommer automatiquement vos fichiers PDF de bandes dessinées.

## 🎯 Fonctionnalités

- **Scan récursif** : Parcourt tous les sous-dossiers pour trouver les fichiers PDF
- **Extraction de métadonnées** : Lit les métadonnées des PDF pour identifier l'auteur et le titre
- **Analyse des noms de fichiers** : Utilise des patterns intelligents pour extraire les informations du nom de fichier
- **Organisation par auteur** : Crée des dossiers séparés pour chaque auteur
- **Renommage intelligent** : Renomme les fichiers avec le titre correct de la BD
- **Gestion des doublons** : Ajoute automatiquement un numéro si un fichier existe déjà
- **Interface interactive** : Interface en ligne de commande conviviale

## 📦 Installation

1. Clonez ou téléchargez ce projet
2. Installez les dépendances :
```bash
npm install
```

## 🚀 Utilisation

### Lancement interactif
```bash
npm start
```

Le programme vous demandera :
- Le chemin du dossier source à scanner
- Le chemin du dossier de destination pour les fichiers organisés

### Utilisation programmatique
```javascript
const BDScanner = require('./index.js');

const scanner = new BDScanner();
scanner.run();
```

## 📋 Formats de noms de fichiers supportés

Le programme peut extraire les informations à partir de ces formats :

- `Auteur - Titre.pdf`
- `Titre par Auteur.pdf`
- `Titre (Auteur).pdf`
- `Auteur - Titre - Tome 1.pdf`
- `Titre_Auteur.pdf`
- `Titre - Auteur.pdf`

## 🔧 Fonctionnement

1. **Scan** : Le programme parcourt récursivement le dossier source
2. **Extraction** : Pour chaque PDF, il essaie d'extraire les métadonnées
3. **Analyse** : Si les métadonnées sont incomplètes, il analyse le nom de fichier
4. **Organisation** : Crée un dossier par auteur dans le dossier de destination
5. **Renommage** : Copie le fichier avec le titre correct
6. **Statistiques** : Affiche un rapport détaillé du traitement

## 📊 Exemple de sortie

```
🎯 Scanner de Bandes Dessinées PDF
=====================================

📁 Chemin du dossier source à scanner: /Users/user/BDs
📁 Chemin du dossier de destination: /Users/user/BD_Organisees

🔍 Scan du dossier: /Users/user/BDs
✅ 15 fichiers PDF trouvés

📁 Organisation des 15 fichiers PDF...

📄 Traitement: Asterix_Le_Domaine_des_Dieux.pdf
  → Copié vers: Goscinny/Asterix - Le Domaine des Dieux.pdf

📄 Traitement: Tintin_Le_Temple_du_Soleil.pdf
  → Copié vers: Herge/Tintin - Le Temple du Soleil.pdf

📊 Statistiques finales:
  • Fichiers scannés: 15
  • Fichiers traités: 15
  • Erreurs: 0
  • Auteurs trouvés: 8

👥 Auteurs:
  • Goscinny
  • Herge
  • Moebius
  • ...

🎉 Organisation terminée ! Les fichiers sont dans: /Users/user/BD_Organisees
```

## ⚠️ Notes importantes

- Le programme **copie** les fichiers, il ne les déplace pas
- Les caractères spéciaux dans les noms de fichiers sont automatiquement nettoyés
- Si un fichier existe déjà, un numéro est ajouté automatiquement
- Les fichiers sans métadonnées ou avec des noms non reconnus sont classés sous "Auteur Inconnu"

## 🛠️ Dépendances

- `pdf-parse` : Extraction des métadonnées PDF
- `fs-extra` : Gestion avancée des fichiers
- `chalk` : Coloration de la sortie console
- `inquirer` : Interface interactive

## 📝 Licence

ISC 