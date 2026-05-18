import React, { useState, useRef, useEffect, useCallback } from "react";
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
  ChevronRight
} from "lucide-react";
import { iaAPI, coursAPI } from "../services/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { cn } from "../lib/utils";

const formatMessage = (texte) => {
  if (!texte) return null;
  return texte.split("\n").map((ligne, i) => {
    if (ligne.startsWith("###")) return <h4 key={i} className="font-bold text-gray-900 dark:text-white mt-4 mb-2">{ligne.replace(/^###\s*/, "")}</h4>;
    if (ligne.startsWith("##")) return <h3 key={i} className="text-lg font-extrabold text-gray-900 dark:text-white mt-5 mb-3">{ligne.replace(/^##\s*/, "")}</h3>;
    if (ligne.startsWith("**") && ligne.endsWith("**")) return <p key={i} className="font-bold my-2">{ligne.replace(/\*\*/g, "")}</p>;
    if (ligne.startsWith("- ") || ligne.startsWith("• ")) return <li key={i} className="ml-5 list-disc my-1 text-gray-700 dark:text-gray-300">{ligne.slice(2)}</li>;
    if (ligne.trim() === "") return <div key={i} className="h-2" />;
    return <p key={i} className="my-1 text-gray-700 dark:text-gray-300 leading-relaxed">{ligne}</p>;
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
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"
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

export default function AssistantIA() {
  const [messages, setMessages] = useState([
    {
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
    coursAPI.getCours().then(({ data }) => setCours(data.cours ?? [])).catch(() => {});
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
    const userMsg = { role: "user", content: texte, timestamp: new Date().toISOString() };
    const nouveauxMessages = [...messages, userMsg];
    setMessages(nouveauxMessages);
    setEnChargement(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date().toISOString() }]);

    let contenuAccumule = "";
    const coursTrouve = cours.find((c) => c.id === coursContexte);

    controllerRef.current = iaAPI.chatStream(
      {
        messages: nouveauxMessages.map((m) => ({ role: m.role, content: m.content })),
        contexte: coursTrouve?.contenu?.slice(0, 2000) || "",
      },
      (delta) => {
        contenuAccumule += delta;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: contenuAccumule };
          return copy;
        });
      },
      (doneData) => {
        setEnChargement(false);
        if (doneData.sources && doneData.sources.length > 0) {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { ...copy[copy.length - 1], sources: doneData.sources };
            return copy;
          });
        }
      },
      (err) => {
        setErreur(err || "Erreur de connexion.");
        setEnChargement(false);
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: "Désolé, une erreur est survenue. Réessaie !" };
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
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `Explique-moi : ${concept}`, timestamp: new Date().toISOString() },
      { role: "assistant", content: "", timestamp: new Date().toISOString() },
    ]);
    setEnChargement(true);

    let contenuAccumule = "";

    controllerRef.current = iaAPI.expliquerStream(
      { concept, contexte: "", niveauEtude: "licence" },
      (delta) => {
        contenuAccumule += delta;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: contenuAccumule };
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
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <select
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none shadow-sm cursor-pointer"
              value={coursContexte}
              onChange={(e) => setCoursContexte(e.target.value)}
            >
              <option value="">Contexte global (pas de cours)</option>
              {cours.map((c) => <option key={c.id} value={c.id}>{c.titre}</option>)}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
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
          {messages.map((msg) => (
            <div
              key={msg.timestamp}
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
                {msg.role === "assistant" && (
                   <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyButton text={msg.content} />
                   </div>
                )}
                
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {msg.content ? (
                      <>
                        {formatMessage(msg.content)}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Sources utilisées :</p>
                            <div className="flex flex-wrap gap-2">
                              {msg.sources.map((s, i) => (
                                <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-100 dark:border-gray-700 text-[10px] font-bold">
                                  <BookOpen className="w-3 h-3" />
                                  {s.titre}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex gap-2 items-center py-2">
                        <div className="flex gap-1.5 items-center">
                           <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce [animation-duration:800ms]" />
                           <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-duration:800ms] [animation-delay:200ms]" />
                           <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-duration:800ms] [animation-delay:400ms]" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Analyse IA...</span>
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
                   {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-gray-800 p-2 border-t-2 border-primary-50 dark:border-primary-900/20">
        <CardContent className="p-0">
          {modeActif === "general" ? (
            <div className="flex gap-3 items-end p-2 pl-6">
              <textarea
                ref={textareaRef}
                className="flex-1 resize-none bg-transparent py-4 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 outline-none max-h-40 min-h-[52px] scrollbar-none"
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
                  <Button onClick={annuler} variant="destructive" size="icon" className="shadow-lg shadow-red-100 dark:shadow-none transition-transform active:scale-90">
                    <Square className="w-5 h-5 fill-current" />
                  </Button>
                ) : (
                  <Button
                    onClick={envoyerMessage}
                    disabled={!input.trim()}
                    size="icon"
                    className="shadow-lg shadow-primary-200 dark:shadow-none transition-all active:scale-90 hover:shadow-xl"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-3 items-center p-3">
              <div className="flex-1 flex items-center gap-4 bg-gray-50 dark:bg-gray-900 rounded-[1.5rem] px-6 py-1.5 border-2 border-transparent focus-within:border-primary-500 transition-all focus-within:bg-white dark:focus-within:bg-gray-800">
                <Search className="w-5 h-5 text-gray-400" />
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
                  className="px-8 font-black text-sm transition-all active:scale-95 shadow-lg shadow-primary-100 dark:shadow-none"
                >
                  Expliquer <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-center gap-4 mt-4 mb-2">
         <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400">
            <Info className="w-3 h-3" />
            L'IA peut faire des erreurs, vérifie les informations importantes.
         </div>
      </div>
    </div>
  );
}
