const { Queue } = require("bullmq");
const { redisConfig, isMock } = require("../config/redis");
const fs = require("fs").promises;
const pdf = require("pdf-parse");
const { extraireTexteImage } = require("./ocr");
const { indexerCours } = require("./aiPro");
const Course = require("../models/Course");

const queueName = "extraction-cours";

const extractionQueue = new Queue(queueName, { connection: redisConfig });
extractionQueue.on("error", (err) => console.error("[Queue]", err.message));

let worker;

if (!isMock) {
  const { Worker } = require("bullmq");
  worker = new Worker(
    queueName,
    async (job) => {
      const { coursId, fichierPath, originalname, utilisateurId, titre, contenuDirect } = job.data;
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

          await indexerCours(contenu, {
            coursId,
            utilisateurId,
            titre,
          });

          console.log(`[Worker] ✅ Cours ${coursId} traité avec succès`);
        }
      } catch (err) {
        console.error(`[Worker] ❌ Erreur sur le cours ${coursId}:`, err);
        throw err;
      }
    },
    { connection: redisConfig }
  );

  worker.on("completed", (job) => console.log(`Job ${job.id} terminé`));
  worker.on("failed", (job, err) => console.error(`Job ${job.id} échoué:`, err));
} else {
  console.warn("⚠️ Worker BullMQ désactivé (Redis non disponible).");
  worker = { close: async () => {}, add: async () => {} };
}

module.exports = { extractionQueue, worker };