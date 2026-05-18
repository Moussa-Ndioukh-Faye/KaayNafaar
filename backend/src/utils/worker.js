const { Queue, Worker } = require("bullmq");
const { redisConfig } = require("../config/redis");
const fs = require("fs").promises;
const pdf = require("pdf-parse");
const { extraireTexteImage } = require("./ocr");
const { indexerCours } = require("./aiPro");
const Course = require("../models/Course");

const queueName = "extraction-cours";

// Création de la file d'attente
const extractionQueue = new Queue(queueName, { connection: redisConfig });

// Création du worker
const worker = new Worker(
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
        // Mettre à jour le cours avec le contenu extrait (seulement si on a extrait du texte d'un fichier)
        if (!contenuDirect) {
          await Course.update({ contenu }, { where: { id: coursId } });
        }

        // Indexation vectorielle
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

module.exports = { extractionQueue, worker };
