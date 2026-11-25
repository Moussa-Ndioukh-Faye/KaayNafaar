/**
 * Catalogue des carnets côté interface : productions du studio et leurs options,
 * réglages du chat. Les valeurs correspondent à celles validées par le serveur
 * (backend/src/services/carnets/studio.js, audio.js et chat.js).
 */
import {
  FileText,
  ScrollText,
  Network,
  CalendarRange,
  HelpCircle,
  BookA,
  Layers,
  BrainCircuit,
  Headphones,
} from "lucide-react";

export const TYPES_STUDIO = [
  {
    type: "podcast",
    nom: "Résumé audio",
    detail: "Awa et Moussa en discutent",
    icone: Headphones,
    teinte: "bg-[#d63384]",
    options: [
      {
        cle: "format",
        defaut: "approfondi",
        nom: "Format",
        choix: [
          { id: "approfondi", nom: "Approfondi" },
          { id: "bref", nom: "Bref" },
          { id: "critique", nom: "Critique" },
          { id: "debat", nom: "Débat" },
        ],
      },
      {
        cle: "duree",
        defaut: "normale",
        nom: "Durée",
        choix: [
          { id: "courte", nom: "Courte · 3 min" },
          { id: "normale", nom: "Normale · 6 min" },
          { id: "longue", nom: "Longue · 12 min" },
        ],
      },
    ],
    exemple: "Ex. : concentre-toi sur les protocoles de sécurité.",
  },
  {
    type: "rapport",
    nom: "Rapport",
    detail: "Guide d'étude, briefing, article…",
    icone: ScrollText,
    teinte: "bg-[#0047db]",
    options: [
      {
        cle: "format",
        defaut: "guide_etude",
        nom: "Format",
        choix: [
          { id: "guide_etude", nom: "Guide d'étude" },
          { id: "briefing", nom: "Briefing" },
          { id: "article", nom: "Article" },
          { id: "personnalise", nom: "Personnalisé" },
        ],
      },
    ],
    exemple: "Ex. : un plan de révision en 5 jours avec des exercices.",
  },
  {
    type: "synthese",
    nom: "Note de synthèse",
    detail: "L'essentiel, structuré",
    icone: FileText,
    teinte: "bg-[#f5c400] text-[#1c1c1e]",
    options: [
      {
        cle: "detail",
        defaut: "normal",
        nom: "Niveau de détail",
        choix: [
          { id: "court", nom: "Court" },
          { id: "normal", nom: "Normal" },
          { id: "detaille", nom: "Détaillé" },
        ],
      },
    ],
  },
  { type: "carte_mentale", nom: "Carte mentale", detail: "Touche une notion pour l'explorer", icone: Network, teinte: "bg-[#00853f]", options: [] },
  {
    type: "flashcards",
    nom: "Flashcards",
    detail: "À réviser, puis dans Mes fiches",
    icone: Layers,
    teinte: "bg-[#e8590c]",
    options: [
      {
        cle: "nombre",
        defaut: "20",
        nom: "Nombre de cartes",
        choix: [
          { id: "10", nom: "10" },
          { id: "20", nom: "20" },
          { id: "30", nom: "30" },
        ],
      },
    ],
  },
  {
    type: "quiz",
    nom: "Quiz",
    detail: "QCM corrigé, noté sur 20",
    icone: BrainCircuit,
    teinte: "bg-[#cf1820]",
    options: [
      {
        cle: "nombre",
        defaut: "10",
        nom: "Questions",
        choix: [
          { id: "5", nom: "5" },
          { id: "10", nom: "10" },
          { id: "15", nom: "15" },
          { id: "20", nom: "20" },
        ],
      },
      {
        cle: "difficulte",
        defaut: "moyen",
        nom: "Difficulté",
        choix: [
          { id: "facile", nom: "Facile" },
          { id: "moyen", nom: "Moyen" },
          { id: "difficile", nom: "Difficile" },
        ],
      },
    ],
  },
  { type: "faq", nom: "Questions d'examen", detail: "Questions probables et réponses", icone: HelpCircle, teinte: "bg-[#5b4bdb]", options: [] },
  { type: "frise", nom: "Frise et étapes", detail: "Dates ou grandes étapes", icone: CalendarRange, teinte: "bg-[#0b7f9e]", options: [] },
  { type: "glossaire", nom: "Glossaire", detail: "Les termes à connaître", icone: BookA, teinte: "bg-[#636366]", options: [] },
];

export const typeStudio = (type) => TYPES_STUDIO.find((t) => t.type === type) || TYPES_STUDIO[0];

/** Options par défaut d'un type (identiques aux valeurs par défaut du serveur) */
export const optionsParDefaut = (type) => {
  const o = { consignes: "", langue: "fr" };
  typeStudio(type).options.forEach((opt) => {
    o[opt.cle] = opt.defaut;
  });
  return o;
};

export const LANGUES = [
  { id: "fr", nom: "Français" },
  { id: "en", nom: "Anglais" },
];

export const STYLES_CHAT = [
  { id: "defaut", nom: "Par défaut", detail: "Clair et direct" },
  { id: "guide", nom: "Guide d'apprentissage", detail: "Pas à pas, avec une question pour vérifier" },
  { id: "analyste", nom: "Analyste", detail: "Compare, nuance, signale les limites" },
  { id: "examen", nom: "Préparation d'examen", detail: "Définitions, pièges, questions probables" },
];

export const LONGUEURS_CHAT = [
  { id: "courte", nom: "Courte" },
  { id: "normale", nom: "Normale" },
  { id: "longue", nom: "Longue" },
];
