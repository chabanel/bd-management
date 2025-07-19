#!/usr/bin/env node

// Script pour exécuter l'analyse sans validation web
process.env.ENABLE_WEB_VALIDATION = "false";

// Importer et exécuter le script principal
const { run } = require("./index.js");

console.log("🚫 Mode sans validation web activé");
run().catch(console.error); 