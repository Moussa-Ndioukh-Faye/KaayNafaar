/**
 * Page Assistant IA — Chat en temps réel avec Claude
 * Sécurité : sanitisation des entrées, pas d'injection HTML
 */

import React, { useState, useRef, useEffect } from "react";
import { iaAPI, coursAPI } from "../services/api";

// Sanitise le texte affiché : évite l'injection HTML (pas de dangerouslySetInnerHTML)
const formatMessage = (texte) => {
  // On rend les blocs de code, les listes, les titres en JSX sûr
  return texte.split("\n").map((ligne, i) => {
    if (ligne.startsWith("###")) return <h4 key={i} className="font-semibold text-gray-900 mt-2">{ligne.replace(/^###\s*/, "")}</h4>;
    if (ligne.startsWith("##")) return <h3 key={i} className="font-bold text-gray-900 mt-3">{ligne.replace(/^##\s*/, "")}</h3>;
    if (ligne.startsWith("**") && ligne.endsWith("**")) return <p key={i} className="font-semibold">{ligne.replace(/\*\*/g, "")}</p>;
    if (ligne.startsWith("- ") || ligne.startsWith("• ")) return <li key={i} className="ml-4 list-disc">{ligne.slice(2)}</li>;
    if (ligne.trim() === "") return <br key={i} />;
    return <p key={i}>{ligne}</p>;
  });
};

const MODE_OPTIONS = [
  { id: "general", label: "💬 Chat général", description: "Pose n'importe quelle question" },
  { id: "expliquer", label: "🔍 Expliquer un concept", description: "Explications claires et analogies" },
];

export default function AssistantIA() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Bonjour ! Je suis ton assistant de révision IA. Pose-moi n'importe quelle question sur tes cours, demande des explications ou de l'aide pour comprendre un concept difficile. Comment puis-je t'aider ? 🎓",
    },
  ]);
  const [input, setInput] = useState("");
  const [cours, setCours] = useState([]);
  const [coursContexte, setCoursContexte] = useState("");
  const [modeActif, setModeActif] = useState("general");
  const [conceptInput, setConceptInput] = useState("");
  const [enChargement, setEnChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const messagesEndRef = useRef(null);
  const controllerRef = useRef(null);
  const textareaRef = useRef(null);

  // Cleanup : annuler le stream si le composant est démonté
  useEffect(() => {
    return () => controllerRef.current?.abort?.();
  }, []);

  useEffect(() => {
    coursAPI.getCours().then(({ data }) => setCours(data.cours ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const envoyerMessage = async () => {
    const texte = input.trim();
    if (!texte || enChargement) return;
    if (texte.length > 5000) { setErreur("Message trop long (max 5000 caractères)."); return; }

    setInput("");
    setErreur("");
    const nouveauxMessages = [...messages, { role: "user", content: texte }];
    setMessages(nouveauxMessages);
    setEnChargement(true);

    // Message IA vide qu'on remplira en streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    let contenuAccumule = "";

    // Trouver le cours contexte sélectionné
    const coursTrouve = cours.find((c) => c._id === coursContexte);

    controllerRef.current = iaAPI.chatStream(
      {
        messages: nouveauxMessages.map((m) => ({ role: m.role, content: m.content })),
        contexte: coursTrouve?.contenu?.slice(0, 2000) || "",
      },
      (delta) => {
        contenuAccumule += delta;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: contenuAccumule };
          return copy;
        });
      },
      () => setEnChargement(false),
      (err) => {
        setErreur(err || "Erreur de connexion.");
        setEnChargement(false);
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: "Désolé, une erreur est survenue. Réessaie !" };
          return copy;
        });
      }
    );
  };

  const expliquerConcept = async () => {
    const concept = conceptInput.trim();
    if (!concept || enChargement) return;
    if (concept.length > 500) { setErreur("Concept trop long (max 500 caractères)."); return; }

    setConceptInput("");
    setErreur("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `Explique-moi : ${concept}` },
      { role: "assistant", content: "" },
    ]);
    setEnChargement(true);

    let contenuAccumule = "";

    controllerRef.current = iaAPI.expliquerStream(
      { concept, contexte: "", niveauEtude: "licence" },
      (delta) => {
        contenuAccumule += delta;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: contenuAccumule };
          return copy;
        });
      },
      () => setEnChargement(false),
      (err) => {
        setErreur(err || "Erreur.");
        setEnChargement(false);
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (modeActif === "general") envoyerMessage();
      else expliquerConcept();
    }
  };

  const annuler = () => {
    controllerRef.current?.abort?.();
    setEnChargement(false);
  };

  const reinitialiser = () => {
    annuler();
    setMessages([{
      role: "assistant",
      content: "Conversation réinitialisée. Comment puis-je t'aider ? 🎓",
    }]);
    setErreur("");
  };

  const suggestions = [
    "Explique-moi la différence entre une pile et une file",
    "Qu'est-ce que la complexité algorithmique ?",
    "Comment fonctionne la récursivité ?",
    "Donne-moi 3 techniques de mémorisation efficaces",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2">
          {MODE_OPTIONS.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setModeActif(mode.id)}
              className={`text-sm px-3 py-2 rounded-lg font-medium transition-all ${
                modeActif === mode.id
                  ? "bg-primary-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Sélecteur de contexte cours */}
        <select
          className="input-field text-sm flex-1 max-w-xs"
          value={coursContexte}
          onChange={(e) => setCoursContexte(e.target.value)}
        >
          <option value="">Contexte : Aucun cours</option>
          {cours.map((c) => <option key={c._id} value={c._id}>📚 {c.titre}</option>)}
        </select>

        <button onClick={reinitialiser} className="btn-secondary text-sm">
          🔄 Réinitialiser
        </button>
      </div>

      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-3" role="alert">
          {erreur}
        </div>
      )}

      {/* Zone de messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(s);
                  textareaRef.current?.focus();
                }}
                className="text-left text-sm p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all"
              >
                💡 {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary-600 text-white rounded-tr-none"
                  : "bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none">
                  {msg.content ? (
                    formatMessage(msg.content)
                  ) : (
                    <span className="typing-cursor text-gray-400">Génération en cours</span>
                  )}
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Zone de saisie */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
        {modeActif === "general" ? (
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none text-sm text-gray-900 placeholder-gray-400 outline-none max-h-32 min-h-[40px]"
              placeholder="Pose ta question… (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={5000}
              rows={1}
              disabled={enChargement}
            />
            {enChargement ? (
              <button onClick={annuler} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-600">
                ⏹️ Stop
              </button>
            ) : (
              <button
                onClick={envoyerMessage}
                disabled={!input.trim()}
                className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-40 transition-colors"
              >
                Envoyer →
              </button>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none"
              placeholder="Quel concept veux-tu comprendre ? (ex: la récursivité)"
              value={conceptInput}
              onChange={(e) => setConceptInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={500}
              disabled={enChargement}
            />
            {enChargement ? (
              <button onClick={annuler} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium">⏹️ Stop</button>
            ) : (
              <button
                onClick={expliquerConcept}
                disabled={!conceptInput.trim()}
                className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-40"
              >
                🔍 Expliquer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
