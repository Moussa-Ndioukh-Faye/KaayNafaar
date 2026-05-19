const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const { orchestrerRecherche } = require('./backend/src/utils/searchOrchestrator');

console.log("--- DIAGNOSTIC ENV ---");
console.log("TAVILY_API_KEY:", process.env.TAVILY_API_KEY ? "PRÉSENTE" : "ABSENTE");
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "PRÉSENTE" : "ABSENTE");

async function diag() {
  console.log("\n--- TEST ORCHESTRATEUR ---");
  const res = await orchestrerRecherche("président sénégal", 1);
  console.log("Résultat context length:", res.context.length);
  console.log("Sources found:", res.sources.length);
  if (res.context) {
    console.log("Extrait context:", res.context.substring(0, 100));
  }
  process.exit(0);
}

diag();
