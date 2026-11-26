/**
 * Import d'un cours : avec un fichier, c'est toujours le fichier qui est lu
 * (régression : un texte tapé à côté empêchait la lecture du document).
 */

jest.mock("../src/utils/lectureDocument", () => ({
  lireDocument: jest.fn(async (_chemin, _ext, { onProgression } = {}) => {
    onProgression?.(2, 4);
    return { pages: [{ n: 1, texte: "Chapitre 1 du PDF" }, { n: 2, texte: "Chapitre 2" }], methode: "ia", texte: "— Page 1 —\nChapitre 1 du PDF\n\n— Page 2 —\nChapitre 2" };
  }),
}));
jest.mock("../src/utils/aiPro", () => ({ indexerCours: jest.fn(async () => true) }));
jest.mock("../src/models/Course", () => ({ update: jest.fn(async () => [1]) }));

const { lireDocument } = require("../src/utils/lectureDocument");
const { indexerCours } = require("../src/utils/aiPro");
const Course = require("../src/models/Course");
const { traiterCours } = require("../src/utils/worker");
const { etatLecture, EN_TRAITEMENT, AUCUN_TEXTE } = require("../src/utils/suiviLecture");

beforeEach(() => jest.clearAllMocks());

test("fichier + texte tapé : le fichier est lu, le texte devient une note en tête", async () => {
  await traiterCours({ coursId: 7, fichierPath: "/tmp/c.pdf", originalname: "c.pdf", utilisateurId: 1, titre: "Réseaux", noteEtudiant: "Intro admin système" });
  expect(lireDocument).toHaveBeenCalled();
  const contenu = Course.update.mock.calls[0][0].contenu;
  expect(contenu).toMatch(/^Notes de l'étudiant :\nIntro admin système/);
  expect(contenu).toMatch(/Chapitre 1 du PDF/);
  const pages = indexerCours.mock.calls[0][2];
  expect(pages[0].texte).toMatch(/Notes de l'étudiant/);
  expect(pages).toHaveLength(2);
});

test("texte seul (sans fichier) : indexé tel quel, sans lecture", async () => {
  await traiterCours({ coursId: 8, utilisateurId: 1, titre: "T", contenuDirect: "Mon résumé" });
  expect(lireDocument).not.toHaveBeenCalled();
  expect(indexerCours.mock.calls[0][0]).toBe("Mon résumé");
});

test("erreur pendant la lecture : le cours n'est pas laissé « en cours » pour toujours", async () => {
  lireDocument.mockRejectedValueOnce(new Error("disque"));
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  await expect(traiterCours({ coursId: 9, fichierPath: "/tmp/x.pdf", originalname: "x.pdf", utilisateurId: 1, titre: "T" })).rejects.toThrow();
  spy.mockRestore();
  expect(Course.update).toHaveBeenCalledWith({ contenu: AUCUN_TEXTE }, { where: { id: 9, contenu: EN_TRAITEMENT } });
});

test("état de lecture affiché : progression, échec, lecture interrompue", () => {
  expect(etatLecture({ id: 1, contenu: "Un vrai cours" })).toBeNull();
  expect(etatLecture({ id: 1, contenu: AUCUN_TEXTE })).toEqual({ etat: "echec" });
  expect(etatLecture({ id: 99, contenu: EN_TRAITEMENT, createdAt: new Date(Date.now() - 60 * 60 * 1000) })).toEqual({ etat: "interrompue" });
  expect(etatLecture({ id: 98, contenu: EN_TRAITEMENT, createdAt: new Date() }).etat).toBe("lecture");
});
