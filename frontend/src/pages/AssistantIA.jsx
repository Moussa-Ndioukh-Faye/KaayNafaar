import { useState, useRef, useEffect, useCallback } from "react";
import { 
  MessageSquare, 
  Search, 
  Send, 
  Square, 
  Lightbulb, 
  BookOpen, 
  User,
  Bot,
  ArrowRight,
  Copy,
  Check,
  Trash2,
  Info,
  Sparkles,
  AlertCircle,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Globe,
  ExternalLink
} from "lucide-react";
import { iaAPI, coursAPI, feedbackAPI } from "../services/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { cn } from "../lib/utils";

const formatMessage = (texte) => {
  if (!texte) return null;
  
  // Split par lignes pour gérer les structures de bloc
  return texte.split("\n").map((ligne, i) => {
    // Gestion des titres
    if (ligne.startsWith("###")) {
      return <h4 key={i} className="font-bold text-gray-900 dark:text-white mt-4 mb-2">{renderInline(ligne.replace(/^###\s*/, ""))}</h4>;
    }
    if (ligne.startsWith("##")) {
      return <h3 key={i} className="text-lg font-extrabold text-gray-900 dark:text-white mt-5 mb-3">{renderInline(ligne.replace(/^##\s*/, ""))}</h3>;
    }
    
    // Gestion des listes
    if (ligne.startsWith("- ") || ligne.startsWith("• ")) {
      return (
        <li key={i} className="ml-5 list-disc my-1 text-gray-700 dark:text-gray-300">
          {renderInline(ligne.slice(2))}
        </li>
      );
    }
    
    // Lignes vides
    if (ligne.trim() === "") {
      return <div key={i} className="h-2" />;
    }
    
    // Paragraphe standard avec support du gras inline
    return (
      <p key={i} className="my-1 text-gray-700 dark:text-gray-300 leading-relaxed">
        {renderInline(ligne)}
      </p>
    );
  });
};

/**
 * Fonction utilitaire pour parser le gras (**text**) à l'intérieur d'une ligne
 */
const renderInline = (text) => {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-bold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleCopy}
            className="w-8 h-8 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copié !" : "Copier la réponse"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const FeedbackButtons = ({ msg }) => {
  const [sent, setSent] = useState(null);

  const sendFeedback = async (note, categorie) => {
    if (sent) return;
    setSent(note);
    try {
      await feedbackAPI.envoyer({
        type: "chat",
        note,
        categorie,
        contenuAssistant: msg.content,
        interactionComplete: msg.content?.substring(0, 500),
      });
    } catch (_) {}
  };

  if (sent) {
    return (
      <div className="flex items-center gap-1 mt-3 text-[10px] font-bold text-gray-500">
        <Check className="w-3 h-3 text-emerald-500" />
        Merci de ton retour
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
      <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mr-1">Utile ?</span>
      <button
        onClick={() => sendFeedback(1, "trop_difficile")}
        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"
        title="Pas utile"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => sendFeedback(3, "utile")}
        className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-500 hover:text-amber-500 transition-colors"
        title="Moyennement utile"
      >
        <Meh className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => sendFeedback(5, "parfait")}
        className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-500 hover:text-emerald-500 transition-colors"
        title="Très utile"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default function AssistantIA() {
  const [messages, setMessages] = useState([
    {
      id: "init",
      role: "assistant",
      content: "Bonjour ! Je suis ton assistant de révision IA. Pose-moi n'importe quelle question sur tes cours, demande des explications ou de l'aide pour comprendre un concept difficile. Comment puis-je t'aider ?",
      timestamp: new Date().toISOString(),
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

  useEffect(() => {
    return () => controllerRef.current?.abort?.();
  }, []);

  useEffect(() => {
    coursAPI.getCours()
      .then(({ data }) => {
        if (data && Array.isArray(data.cours)) {
          setCours(data.cours);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const envoyerMessage = useCallback(async () => {
    const texte = input.trim();
    if (!texte || enChargement) return;
    if (texte.length > 5000) { setErreur("Message trop long (max 5000 caractères)."); return; }

    setInput("");
    setErreur("");
    const userMsg = { 
      id: `user-${Date.now()}`,
      role: "user", 
      content: texte, 
      timestamp: new Date().toISOString() 
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setEnChargement(true);

    const assistantMsgId = `ai-${Date.now()}`;
    setMessages((prev) => [...prev, { 
      id: assistantMsgId,
      role: "assistant", 
      content: "", 
      timestamp: new Date().toISOString() 
    }]);

    let contenuAccumule = "";
    // Conversion ID en nombre pour la comparaison si nécessaire
    const coursTrouve = cours.find((c) => String(c.id) === String(coursContexte));

    controllerRef.current = iaAPI.chatStream(
      {
        messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        contexte: coursTrouve?.contenu?.slice(0, 2000) || "",
      },
      (delta) => {
        contenuAccumule += delta;
        setMessages((prev) => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (copy[lastIdx] && copy[lastIdx].role === "assistant") {
            copy[lastIdx] = { ...copy[lastIdx], content: contenuAccumule };
          }
          return copy;
        });
      },
      (doneData) => {
        setEnChargement(false);
        if (doneData.sources && doneData.sources.length > 0) {
          setMessages((prev) => {
            const copy = [...prev];
            const lastIdx = copy.length - 1;
            if (copy[lastIdx] && copy[lastIdx].role === "assistant") {
              copy[lastIdx] = { ...copy[lastIdx], sources: doneData.sources };
            }
            return copy;
          });
        }
      },
      (err) => {
        setErreur(err || "Erreur de connexion.");
        setEnChargement(false);
        setMessages((prev) => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (copy[lastIdx] && copy[lastIdx].role === "assistant") {
            copy[lastIdx] = { ...copy[lastIdx], content: "Désolé, une erreur est survenue. Réessaie !" };
          }
          return copy;
        });
      }
    );
  }, [input, messages, enChargement, cours, coursContexte]);

  const expliquerConcept = useCallback(async () => {
    const concept = conceptInput.trim();
    if (!concept || enChargement) return;
    if (concept.length > 500) { setErreur("Concept trop long (max 500 caractères)."); return; }

    setConceptInput("");
    setErreur("");
    
    const userMsg = { 
      id: `user-exp-${Date.now()}`,
      role: "user", 
      content: `Explique-moi : ${concept}`, 
      timestamp: new Date().toISOString() 
    };
    
    const aiMsgId = `ai-exp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: aiMsgId, role: "assistant", content: "", timestamp: new Date().toISOString() },
    ]);
    setEnChargement(true);

    let contenuAccumule = "";

    controllerRef.current = iaAPI.expliquerStream(
      { concept, contexte: "", niveauEtude: "licence" },
      (delta) => {
        contenuAccumule += delta;
        setMessages((prev) => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (copy[lastIdx] && copy[lastIdx].role === "assistant") {
            copy[lastIdx] = { ...copy[lastIdx], content: contenuAccumule };
          }
          return copy;
        });
      },
      () => setEnChargement(false),
      (err) => {
        setErreur(err || "Erreur.");
        setEnChargement(false);
      }
    );
  }, [conceptInput, enChargement]);

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
    if (window.confirm("Effacer toute la conversation ?")) {
      annuler();
      setMessages([{
        id: "init-" + Date.now(),
        role: "assistant",
        content: "Conversation réinitialisée. Comment puis-je t'aider ?",
        timestamp: new Date().toISOString(),
      }]);
      setErreur("");
    }
  };

    const suggestions = [
    { id: "s1", text: "Différence entre pile et file" },
    { id: "s2", text: "Complexité algorithmique ?" },
    { id: "s3", text: "Comment fonctionne la récursivité ?" },
    { id: "s4", text: "Techniques de mémorisation" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
        <Tabs value={modeActif} onValueChange={setModeActif} className="w-full md:w-auto">
          <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl h-auto">
            <TabsTrigger value="general" className="rounded-xl px-4 py-2 font-bold gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="expliquer" className="rounded-xl px-4 py-2 font-bold gap-2">
              <Search className="w-4 h-4" />
              Expliquer
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex-1 w-full flex gap-3">
          <div className="relative flex-1 group">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary-500 transition-colors" />
            <select
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none shadow-sm cursor-pointer"
              value={coursContexte}
              onChange={(e) => setCoursContexte(e.target.value)}
            >
              <option value="">Contexte global (pas de cours)</option>
              {Array.isArray(cours) && cours.map((c) => <option key={c.id} value={c.id}>{c.titre}</option>)}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none rotate-90" />
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={reinitialiser} className="rounded-2xl flex-shrink-0 border-2 border-gray-100 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Effacer la discussion</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {erreur && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm mb-4 flex items-center gap-2 animate-shake">
          <AlertCircle className="w-4 h-4" />
          {erreur}
        </div>
      )}

      {/* Chat Area */}
      <ScrollArea className="flex-1 mb-6 pr-4">
        {messages.length === 1 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative mb-6">
               <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-[2.5rem] flex items-center justify-center animate-pulse">
                 <Bot className="w-10 h-10 text-primary-600" />
               </div>
               <div className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg border border-gray-100 dark:border-gray-700">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
               </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Assistant Révision</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-10 font-medium">Ton tuteur personnel disponible 24/7 pour t'aider à réussir tes examens.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setInput(s.text);
                    textareaRef.current?.focus();
                  }}
                  className="flex items-center gap-4 text-left p-5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-3xl hover:border-primary-200 dark:hover:border-primary-800 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all group active:scale-[0.98]"
                >
                  <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-orange-500" />
                  </div>
                  <span className="flex-1 font-bold text-gray-700 dark:text-gray-300 text-sm leading-tight">{s.text}</span>
                  <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-8">
          {messages.map((msg, idx) => (
            <div
              key={msg.id || `msg-${idx}`}
              className={cn(
                "flex gap-4 group animate-in slide-in-from-bottom-4 duration-300",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm transition-transform group-hover:scale-105",
                msg.role === "user" ? "bg-primary-600 text-white" : "bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-800 text-primary-600"
              )}>
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div className={cn(
                "relative max-w-[85%] sm:max-w-[75%] rounded-[2rem] px-6 py-5 text-sm shadow-sm transition-all",
                msg.role === "user"
                  ? "bg-primary-600 text-white rounded-tr-none"
                  : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none group-hover:shadow-md"
              )}>
                {msg.role === "assistant" && !enChargement && msg.content && (
                   <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyButton text={msg.content} />
                   </div>
                )}
                
                {msg.role === "assistant" ? (
                  <div className="max-w-none">
                    {msg.content ? (
                      <>
                        {formatMessage(msg.content)}
                        {msg.sources && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Sources utilisées :</p>
                            <div className="flex flex-wrap gap-2">
                              {msg.sources.map((s, i) => (
                                s.isWeb ? (
                                  <a 
                                    key={i} 
                                    href={s.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg border border-primary-100 dark:border-primary-800/50 text-[10px] font-bold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                                  >
                                    <Globe className="w-3 h-3" />
                                    {s.titre}
                                    <ExternalLink className="w-2 h-2" />
                                  </a>
                                ) : (
                                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-100 dark:border-gray-700 text-[10px] font-bold">
                                    <BookOpen className="w-3 h-3" />
                                    {s.titre}
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                        {!enChargement && msg.content && (
                          <FeedbackButtons msg={msg} />
                        )}
                      </>
                    ) : (
                      <div className="flex gap-2 items-center py-2">
                        <div className="flex gap-1.5 items-center">
                           <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce [animation-duration:800ms]" />
                           <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-duration:800ms] [animation-delay:200ms]" />
                           <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-duration:800ms] [animation-delay:400ms]" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Analyse IA...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>
                )}
                
                <div className={cn(
                   "text-[9px] font-black uppercase tracking-widest mt-4 opacity-30",
                   msg.role === "user" ? "text-right" : "text-left"
                )}>
                   {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <Card className="rounded-[2.5rem] border bg-white dark:bg-gray-800 p-2 shadow-2xl">
        <CardContent className="p-0">
          {modeActif === "general" ? (
            <div className="flex gap-3 items-end p-2 pl-6">
              <textarea
                ref={textareaRef}
                className="flex-1 resize-none bg-transparent py-4 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 outline-none max-h-40 min-h-[52px]"
                placeholder="Pose ta question ou demande un résumé…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={5000}
                rows={1}
                disabled={enChargement}
              />
              <div className="pb-2 flex gap-2">
                {enChargement ? (
                  <Button onClick={annuler} variant="destructive" size="icon">
                    <Square className="w-5 h-5 fill-current" />
                  </Button>
                ) : (
                  <Button
                    onClick={envoyerMessage}
                    disabled={!input.trim()}
                    size="icon"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-3 items-center p-3">
              <div className="flex-1 flex items-center gap-4 bg-gray-50 dark:bg-gray-900 rounded-[1.5rem] px-6 py-1.5 border-2 border-transparent focus-within:border-primary-500 transition-all">
                <Search className="w-5 h-5 text-gray-500" />
                <input
                  className="flex-1 bg-transparent text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none py-3"
                  placeholder="Quel concept veux-tu comprendre ?"
                  value={conceptInput}
                  onChange={(e) => setConceptInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={500}
                  disabled={enChargement}
                />
              </div>
              {enChargement ? (
                <Button onClick={annuler} variant="destructive" size="icon">
                  <Square className="w-5 h-5 fill-current" />
                </Button>
              ) : (
                <Button
                  onClick={expliquerConcept}
                  disabled={!conceptInput.trim()}
                  className="px-8 font-black text-sm"
                >
                  Expliquer <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-center gap-4 mt-4 mb-2">
         <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-500">
            <Info className="w-3 h-3" />
            L'IA peut faire des erreurs, vérifie les informations importantes.
         </div>
      </div>
    </div>
  );
}
