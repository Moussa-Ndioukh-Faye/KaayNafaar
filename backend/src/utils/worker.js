const { Queue } = require("bullmq");
const redisConf = require("../config/redis");
const fs = require("fs").promises;
const pdf = require("pdf-parse");
const { extraireTexteImage } = require("./ocr");
const { indexerCours } = require("./aiPro");
const Course = require("../models/Course");

const queueName = "extraction-cours";

/**
 * Extraction du texte (PDF, image, texte) puis indexation IA d'un cours.
 * Exécutée par le worker BullMQ quand Redis est disponible, sinon directement
 * dans le processus (hébergement sans Redis).
 */
const traiterCours = async ({ coursId, fichierPath, originalname, utilisateurId, titre, contenuDirect }) => {
  console.log(`[Worker] Traitement du cours ${coursId} (${titre})`);

  let contenu = contenuDirect || "";
  try {
    if (!contenu && fichierPath) {
      const extension = originalname.split(".").pop().toLowerCase();

      if (extension === "pdf") {
        const dataBuffer = await fs.readFile(fichierPath);
        const data = await pdf(dataBuffer);
        contenu = data.text;
      } else if (["jpg", "jpeg", "png"].includes(extension)) {
        contenu = await extraireTexteImage(fichierPath);
      } else if (extension === "txt") {
        contenu = await fs.readFile(fichierPath, "utf8");
      }
    }

    if (contenu) {
      if (!contenuDirect) {
        await Course.update({ contenu }, { where: { id: coursId } });
      }

      await indexerCours(contenu, { coursId, utilisateurId, titre });
      console.log(`[Worker] ✅ Cours ${coursId} traité avec succès`);
    }
  } catch (err) {
    console.error(`[Worker] ❌ Erreur sur le cours ${coursId}:`, err);
    throw err;
  }
};

let queue = null;
let worker = { close: async () => {} };

if (!redisConf.isMock) {
  const { Worker } = require("bullmq");
  queue = new Queue(queueName, { connection: redisConf.redisConfig });
  queue.on("error", (err) => console.error("[Queue]", err.message));

  worker = new Worker(queueName, (job) => traiterCours(job.data), { connection: redisConf.redisConfig });
  worker.on("completed", (job) => console.log(`Job ${job.id} terminé`));
  worker.on("failed", (job, err) => console.error(`Job ${job.id} échoué:`, err));
} else {
  console.warn("⚠️ Worker BullMQ désactivé (Redis non disponible) : traitement direct des cours.");
}

// Même interface que la file BullMQ ; bascule en traitement direct si Redis manque
const extractionQueue = {
  add: async (nom, donnees) => {
    if (queue && !redisConf.isMock) return queue.add(nom, donnees);
    setImmediate(() => traiterCours(donnees).catch(() => {}));
    return { id: `direct-${Date.now()}` };
  },
  close: async () => {
    if (queue) await queue.close();
  },
};

module.exports = { extractionQueue, worker, traiterCours };
