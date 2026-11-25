const { Queue } = require("bullmq");
const redisConf = require("../config/redis");
const { indexerCours } = require("./aiPro");
const { lireDocument } = require("./lectureDocument");
const Course = require("../models/Course");

const queueName = "extraction-cours";
const AUCUN_TEXTE = "Aucun texte n'a pu être lu dans ce document. Essaie un PDF non protégé ou une photo plus nette.";

/**
 * Lecture du document (page par page, IA pour les PDF scannés et les photos)
 * puis indexation pour la recherche. Exécutée par le worker BullMQ quand Redis est
 * disponible, sinon directement dans le processus (hébergement sans Redis).
 */
const traiterCours = async ({ coursId, fichierPath, originalname, utilisateurId, titre, contenuDirect }) => {
  console.log(`[Worker] Traitement du cours ${coursId}`);
  try {
    let contenu = contenuDirect || "";
    let pages = null;

    if (!contenu && fichierPath) {
      const extension = String(originalname || "").split(".").pop().toLowerCase();
      const lecture = await lireDocument(fichierPath, extension);
      contenu = lecture.texte;
      pages = lecture.pages;
      console.log(`[Worker] Cours ${coursId} : ${pages.length} page(s) lue(s) (${lecture.methode}), ${contenu.length} caractères`);
      await Course.update({ contenu }, { where: { id: coursId } });
    }

    if (!contenu) {
      console.warn(`[Worker] Cours ${coursId} : aucun texte trouvé dans le document`);
      // Sans ce message, le cours resterait affiché « Traitement en cours… » indéfiniment
      await Course.update({ contenu: AUCUN_TEXTE }, { where: { id: coursId } });
      return;
    }
    const ok = await indexerCours(contenu, { coursId, utilisateurId, titre }, pages);
    console.log(`[Worker] ${ok ? "✅" : "⚠️"} Cours ${coursId} ${ok ? "indexé" : "non indexé"}`);
  } catch (err) {
    console.error(`[Worker] ❌ Erreur sur le cours ${coursId}:`, err.message);
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

module.exports = { extractionQueue, worker, traiterCours, AUCUN_TEXTE };
