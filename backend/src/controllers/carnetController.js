/**
 * Carnets — gestion : création, sources, notes, réglages du chat, découverte de sources.
 * Le chat et le guide sont dans carnetChatController.js, le studio dans carnetStudioController.js.
 *
 * Sécurité : tout est filtré par utilisateurId (carnet, cours, notes, productions) ;
 * seuls les cours de l'étudiant peuvent entrer dans un carnet.
 */

const crypto = require("crypto");
const Carnet = require("../models/Carnet");
const Course = require("../models/Course");
const CarnetProduction = require("../models/CarnetProduction");
const { texte } = require("../services/normalisation");
const { normaliserReglages } = require("../services/carnets/chat");
const { creerCoursDepuisTexte } = require("../services/cours");
const { rechercherSources, importerSources, ErreurDecouverte } = require("../services/carnets/decouverte");
const { erreur, trouverCarnet } = require("../services/carnets/acces");

const MAX_COURS_PAR_CARNET = 50;
const MAX_NOTES = 200;

/* ── Utilitaires ─────────────────────────────────────────────── */

/** Ne garde que les cours qui appartiennent vraiment à l'étudiant */
const coursAutorises = async (userId, ids) => {
  const propres = [...new Set((Array.isArray(ids) ? ids : []).map(Number).filter(Number.isInteger))].slice(
    0,
    MAX_COURS_PAR_CARNET
  );
  if (!propres.length) return [];
  const cours = await Course.findAll({ where: { id: propres, utilisateurId: userId }, attributes: ["id"] });
  return cours.map((c) => c.id);
};

/** Ajoute des cours au carnet (sans doublon, dans la limite) */
const ajouterSources = (carnet, ids) => {
  carnet.coursIds = [...new Set([...(carnet.coursIds || []), ...ids])].slice(0, MAX_COURS_PAR_CARNET);
};

/**
 * Anciennes productions (un seul exemplaire par type, dans carnet.studio) :
 * converties une fois en lignes CarnetProduction, pour l'historique des versions.
 */
const migrerAnciennesProductions = async (carnet) => {
  const anciennes = Object.entries(carnet.studio || {});
  if (!anciennes.length) return;
  await CarnetProduction.bulkCreate(
    anciennes
      .filter(([, p]) => p?.contenu)
      .map(([type, p]) => ({
        carnetId: carnet.id,
        utilisateurId: carnet.utilisateurId,
        type,
        titre: texte(p.contenu.titre || p.contenu.centre, 200) || null,
        options: {},
        contenu: p.contenu,
        createdAt: p.genereLe ? new Date(p.genereLe) : new Date(),
      }))
  );
  carnet.studio = {};
  carnet.changed("studio", true);
  await carnet.save();
};

const formater = async (carnet) => {
  await migrerAnciennesProductions(carnet);
  const data = carnet.toJSON();
  const [cours, productions] = await Promise.all([
    data.coursIds?.length
      ? Course.findAll({
          where: { id: data.coursIds, utilisateurId: data.utilisateurId },
          attributes: ["id", "titre", "matiere", "createdAt"],
        })
      : [],
    CarnetProduction.findAll({ where: { carnetId: data.id, utilisateurId: data.utilisateurId }, order: [["createdAt", "DESC"]] }),
  ]);
  // studio (ancien format, migré) et guide (servi par sa propre route) ne sont pas renvoyés
  const reste = { ...data };
  delete reste.studio;
  delete reste.guide;
  return {
    ...reste,
    reglages: normaliserReglages(data.reglages),
    sources: cours.map((c) => c.toJSON()),
    productions: productions.map((p) => p.toJSON()),
  };
};

/* ── CRUD ────────────────────────────────────────────────────── */

// GET /api/carnets
const listerCarnets = async (req, res) => {
  try {
    const carnets = await Carnet.findAll({ where: { utilisateurId: req.utilisateur.id }, order: [["updatedAt", "DESC"]] });
    const comptes = await CarnetProduction.count({
      where: { utilisateurId: req.utilisateur.id },
      group: ["carnetId"],
    }).catch(() => []);
    const parCarnet = new Map((Array.isArray(comptes) ? comptes : []).map((c) => [c.carnetId, Number(c.count)]));
    res.json({
      success: true,
      carnets: carnets.map((c) => {
        const d = c.toJSON();
        return {
          id: d.id,
          titre: d.titre,
          description: d.description,
          nbSources: d.coursIds?.length || 0,
          nbNotes: d.notes?.length || 0,
          nbProductions: (parCarnet.get(d.id) || 0) + Object.keys(d.studio || {}).length,
          updatedAt: d.updatedAt,
        };
      }),
    });
  } catch (e) {
    console.error("listerCarnets:", e.message);
    erreur(res, 500, "Impossible de charger tes carnets.");
  }
};

// POST /api/carnets
const creerCarnet = async (req, res) => {
  try {
    const titre = texte(req.body.titre, 120);
    if (!titre) return erreur(res, 400, "Donne un titre à ton carnet.");
    const carnet = await Carnet.create({
      utilisateurId: req.utilisateur.id,
      titre,
      description: texte(req.body.description, 500) || null,
      coursIds: await coursAutorises(req.utilisateur.id, req.body.coursIds),
    });
    res.status(201).json({ success: true, carnet: await formater(carnet) });
  } catch (e) {
    console.error("creerCarnet:", e.message);
    erreur(res, 500, "Impossible de créer le carnet.");
  }
};

// GET /api/carnets/:id
const obtenirCarnet = async (req, res) => {
  try {
    const carnet = await trouverCarnet(req);
    if (!carnet) return erreur(res, 404, "Carnet introuvable.");
    res.json({ success: true, carnet: await formater(carnet) });
  } catch (e) {
    console.error("obtenirCarnet:", e.message);
    erreur(res, 500, "Impossible d'ouvrir ce carnet.");
  }
};

// PUT /api/carnets/:id  (titre, description, sources)
const modifierCarnet = async (req, res) => {
  try {
    const carnet = await trouverCarnet(req);
    if (!carnet) return erreur(res, 404, "Carnet introuvable.");
    if (req.body.titre !== undefined) {
      const titre = texte(req.body.titre, 120);
      if (!titre) return erreur(res, 400, "Le titre ne peut pas être vide.");
      carnet.titre = titre;
    }
    if (req.body.description !== undefined) carnet.description = texte(req.body.description, 500) || null;
    if (req.body.coursIds !== undefined) carnet.coursIds = await coursAutorises(req.utilisateur.id, req.body.coursIds);
    await carnet.save();
    res.json({ success: true, carnet: await formater(carnet) });
  } catch (e) {
    console.error("modifierCarnet:", e.message);
    erreur(res, 500, "Impossible de modifier le carnet.");
  }
};

// PUT /api/carnets/:id/reglages  { style, longueur, consignes, langue }
const modifierReglages = async (req, res) => {
  const carnet = await trouverCarnet(req);
  if (!carnet) return erreur(res, 404, "Carnet introuvable.");
  carnet.reglages = normaliserReglages(req.body);
  carnet.changed("reglages", true);
  await carnet.save();
  res.json({ success: true, reglages: carnet.reglages });
};

// DELETE /api/carnets/:id  (messages et productions supprimés en cascade)
const supprimerCarnet = async (req, res) => {
  const carnet = await trouverCarnet(req);
  if (!carnet) return erreur(res, 404, "Carnet introuvable.");
  await carnet.destroy();
  res.json({ success: true });
};

/* ── Notes ───────────────────────────────────────────────────── */

// POST /api/carnets/:id/notes
const ajouterNote = async (req, res) => {
  const carnet = await trouverCarnet(req);
  if (!carnet) return erreur(res, 404, "Carnet introuvable.");
  const contenu = texte(req.body.contenu, 20000);
  if (!contenu) return erreur(res, 400, "La note est vide.");
  const notes = Array.isArray(carnet.notes) ? [...carnet.notes] : [];
  if (notes.length >= MAX_NOTES) return erreur(res, 400, "Ce carnet a atteint 200 notes.");
  const citations = (Array.isArray(req.body.citations) ? req.body.citations : []).slice(0, 12).map((c) => ({
    n: Number(c.n) || 0,
    titre: texte(c.titre, 200),
    texte: texte(c.texte, 2000),
  }));
  const note = {
    id: crypto.randomUUID(),
    titre: texte(req.body.titre, 160) || contenu.split("\n")[0].slice(0, 80),
    contenu,
    citations,
    creeLe: new Date().toISOString(),
  };
  notes.unshift(note);
  carnet.notes = notes;
  await carnet.save();
  res.status(201).json({ success: true, note });
};

// DELETE /api/carnets/:id/notes/:noteId
const supprimerNote = async (req, res) => {
  const carnet = await trouverCarnet(req);
  if (!carnet) return erreur(res, 404, "Carnet introuvable.");
  carnet.notes = (carnet.notes || []).filter((n) => n.id !== req.params.noteId);
  await carnet.save();
  res.json({ success: true });
};

// POST /api/carnets/:id/notes/:noteId/source — la note devient une source du carnet
const noteEnSource = async (req, res) => {
  try {
    const carnet = await trouverCarnet(req);
    if (!carnet) return erreur(res, 404, "Carnet introuvable.");
    const notes = Array.isArray(carnet.notes) ? [...carnet.notes] : [];
    const index = notes.findIndex((n) => n.id === req.params.noteId);
    if (index === -1) return erreur(res, 404, "Note introuvable.");
    if (notes[index].sourceId) return erreur(res, 409, "Cette note est déjà une source du carnet.");
    if ((carnet.coursIds || []).length >= MAX_COURS_PAR_CARNET) return erreur(res, 400, "Ce carnet a atteint 50 sources.");

    const cours = await creerCoursDepuisTexte({
      utilisateurId: req.utilisateur.id,
      titre: `Note — ${notes[index].titre}`,
      matiere: "Notes",
      contenu: notes[index].contenu,
      tags: ["note"],
    });
    notes[index] = { ...notes[index], sourceId: cours.id };
    carnet.notes = notes;
    ajouterSources(carnet, [cours.id]);
    await carnet.save();
    res.status(201).json({ success: true, carnet: await formater(carnet) });
  } catch (e) {
    console.error("noteEnSource:", e.message);
    erreur(res, 500, "Impossible de transformer cette note en source.");
  }
};

/* ── Découverte de sources sur le web ────────────────────────── */

// POST /api/carnets/:id/decouvrir  { sujet }
const decouvrirSources = async (req, res) => {
  try {
    const carnet = await trouverCarnet(req);
    if (!carnet) return erreur(res, 404, "Carnet introuvable.");
    const resultats = await rechercherSources(req.body?.sujet);
    res.json({ success: true, resultats });
  } catch (e) {
    if (e instanceof ErreurDecouverte) return erreur(res, 400, e.message);
    console.error("decouvrirSources:", e.message);
    erreur(res, 502, "La recherche de sources a échoué. Réessaie.");
  }
};

// POST /api/carnets/:id/sources/web  { urls: [] }
const ajouterSourcesWeb = async (req, res) => {
  try {
    const carnet = await trouverCarnet(req);
    if (!carnet) return erreur(res, 404, "Carnet introuvable.");
    const place = MAX_COURS_PAR_CARNET - (carnet.coursIds || []).length;
    if (place <= 0) return erreur(res, 400, "Ce carnet a atteint 50 sources.");
    const urls = (Array.isArray(req.body?.urls) ? req.body.urls : []).slice(0, place);
    const { crees, echecs } = await importerSources({ utilisateurId: req.utilisateur.id, urls, matiere: carnet.titre });
    if (crees.length) {
      ajouterSources(carnet, crees.map((c) => c.id));
      await carnet.save();
    }
    res.status(crees.length ? 201 : 400).json({
      success: crees.length > 0,
      message: crees.length ? `${crees.length} source${crees.length > 1 ? "s" : ""} ajoutée${crees.length > 1 ? "s" : ""}.` : "Aucune page n'a pu être importée.",
      carnet: await formater(carnet),
      echecs,
    });
  } catch (e) {
    if (e instanceof ErreurDecouverte) return erreur(res, 400, e.message);
    console.error("ajouterSourcesWeb:", e.message);
    erreur(res, 502, "L'import des sources a échoué.");
  }
};

module.exports = {
  listerCarnets,
  creerCarnet,
  obtenirCarnet,
  modifierCarnet,
  modifierReglages,
  supprimerCarnet,
  ajouterNote,
  supprimerNote,
  noteEnSource,
  decouvrirSources,
  ajouterSourcesWeb,
};
