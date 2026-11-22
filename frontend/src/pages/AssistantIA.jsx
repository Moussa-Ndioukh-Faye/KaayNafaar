import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Search, BookOpen, Trash2, Info, AlertCircle, ChevronRight } from "lucide-react";
import { iaAPI, coursAPI } from "../services/api";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import BulleMessage from "../components/assistant/BulleMessage";
import EcranAccueil from "../components/assistant/EcranAccueil";
import ZoneSaisie from "../components/assistant/ZoneSaisie";

const maintenant = () => new Date().toISOString();

const MESSAGE_ACCUEIL = {
  id: "init",
  role: "assistant",
  content:
    "Bonjour ! Je suis ton assistant de révision IA. Pose-moi n'importe quelle question sur tes cours, demande des explications ou de l'aide pour comprendre un concept difficile. Comment puis-je t'aider ?",
  timestamp: maintenant(),
};

/** Applique `changement` au dernier message s'il vient de l'assistant (réponse en cours) */
const majDerniereReponse = (messages, changement) => {
  const copie = [...messages];
  const dernier = copie.length - 1;
  if (copie[dernier]?.role === "assistant") copie[dernier] = { ...copie[dernier], ...changement };
  return copie;
};

export default function AssistantIA() {
  const [messages, setMessages] = useState([MESSAGE_ACCUEIL]);
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

  useEffect(() => () => controllerRef.current?.abort?.(), []);

  useEffect(() => {
    coursAPI
      .getCours()
      .then(({ data }) => {
        if (Array.isArray(data?.cours)) setCours(data.cours);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /** Ajoute la question et une réponse vide, puis remplit la réponse au fil du flux */
  const lancerEchange = useCallback((questionAffichee, appelFlux, { messageErreur = "Erreur." } = {}) => {
    const horodatage = Date.now();
    setErreur("");
    setMessages((prev) => [
      ...prev,
      { id: `user-${horodatage}`, role: "user", content: questionAffichee, timestamp: maintenant() },
      { id: `ai-${horodatage}`, role: "assistant", content: "", timestamp: maintenant() },
    ]);
    setEnChargement(true);

    let contenu = "";
    controllerRef.current = appelFlux(
      (delta) => {
        contenu += delta;
        setMessages((prev) => majDerniereReponse(prev, { content: contenu }));
      },
      (fin) => {
        setEnChargement(false);
        if (fin?.sources?.length) setMessages((prev) => majDerniereReponse(prev, { sources: fin.sources }));
      },
      (err) => {
        setErreur(err || messageErreur);
        setEnChargement(false);
        if (!contenu) {
          setMessages((prev) => majDerniereReponse(prev, { content: "Désolé, une erreur est survenue. Réessaie !" }));
        }
      }
    );
  }, []);

  const envoyerMessage = useCallback(() => {
    const texte = input.trim();
    if (!texte || enChargement) return;
    if (texte.length > 5000) return setErreur("Message trop long (max 5000 caractères).");

    setInput("");
    const coursTrouve = cours.find((c) => String(c.id) === String(coursContexte));
    const historique = [...messages, { role: "user", content: texte }].map((m) => ({ role: m.role, content: m.content }));

    lancerEchange(
      texte,
      (onDelta, onFin, onErreur) =>
        iaAPI.chatStream(
          { messages: historique, contexte: coursTrouve?.contenu?.slice(0, 2000) || "" },
          onDelta,
          onFin,
          onErreur
        ),
      { messageErreur: "Erreur de connexion." }
    );
  }, [input, messages, enChargement, cours, coursContexte, lancerEchange]);

  const expliquerConcept = useCallback(() => {
    const concept = conceptInput.trim();
    if (!concept || enChargement) return;
    if (concept.length > 500) return setErreur("Concept trop long (max 500 caractères).");

    setConceptInput("");
    lancerEchange(`Explique-moi : ${concept}`, (onDelta, onFin, onErreur) =>
      iaAPI.expliquerStream({ concept, contexte: "", niveauEtude: "licence" }, onDelta, onFin, onErreur)
    );
  }, [conceptInput, enChargement, lancerEchange]);

  const annuler = () => {
    controllerRef.current?.abort?.();
    setEnChargement(false);
  };

  const reinitialiser = () => {
    if (!window.confirm("Effacer toute la conversation ?")) return;
    annuler();
    setMessages([
      { id: `init-${Date.now()}`, role: "assistant", content: "Conversation réinitialisée. Comment puis-je t'aider ?", timestamp: maintenant() },
    ]);
    setErreur("");
  };

  const choisirSuggestion = (texte) => {
    setInput(texte);
    textareaRef.current?.focus();
  };

  const modeChat = modeActif === "general";

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-5xl mx-auto animate-in fade-in duration-500">
      <h1 className="sr-only">Assistant IA</h1>

      {/* Mode, cours de contexte, effacer */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
        <Tabs value={modeActif} onValueChange={setModeActif} className="w-full md:w-auto">
          <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl h-auto">
            <TabsTrigger value="general" className="rounded-xl px-4 py-2 font-bold gap-2">
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="expliquer" className="rounded-xl px-4 py-2 font-bold gap-2">
              <Search className="w-4 h-4" aria-hidden="true" />
              Expliquer
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex-1 w-full flex gap-3">
          <div className="relative flex-1 group">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary-500 transition-colors" aria-hidden="true" />
            <select
              aria-label="Cours utilisé comme contexte"
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none shadow-sm cursor-pointer"
              value={coursContexte}
              onChange={(e) => setCoursContexte(e.target.value)}
            >
              <option value="">Contexte global (pas de cours)</option>
              {cours.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titre}
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none rotate-90" aria-hidden="true" />
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Effacer la conversation"
                  onClick={reinitialiser}
                  className="rounded-2xl flex-shrink-0 border-2 border-gray-100 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Effacer la discussion</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {erreur && (
        <div
          role="alert"
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm mb-4 flex items-center gap-2 animate-shake"
        >
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          {erreur}
        </div>
      )}

      {/* Conversation */}
      <ScrollArea className="flex-1 mb-6 pr-4">
        {messages.length === 1 && <EcranAccueil onSuggestion={choisirSuggestion} />}

        <div className="space-y-8" role="log" aria-live="polite" aria-label="Conversation avec l'assistant">
          {messages.map((msg, idx) => (
            <BulleMessage key={msg.id || `msg-${idx}`} msg={msg} enChargement={enChargement} />
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </ScrollArea>

      <ZoneSaisie
        ref={textareaRef}
        mode={modeActif}
        valeur={modeChat ? input : conceptInput}
        onChange={modeChat ? setInput : setConceptInput}
        onEnvoyer={modeChat ? envoyerMessage : expliquerConcept}
        onAnnuler={annuler}
        enChargement={enChargement}
      />

      <div className="flex items-center justify-center gap-4 mt-4 mb-2">
        <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-500">
          <Info className="w-3 h-3" aria-hidden="true" />
          L'IA peut faire des erreurs, vérifie les informations importantes.
        </p>
      </div>
    </div>
  );
}
