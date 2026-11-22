import { User, Bot, Globe, ExternalLink, BookOpen } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatMessage } from "./formatMessage";
import BoutonCopier from "./BoutonCopier";
import BoutonsAvis from "./BoutonsAvis";

/** Sources (cours de l'étudiant ou pages web) utilisées pour une réponse */
function SourcesMessage({ sources }) {
  if (!Array.isArray(sources) || sources.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Sources utilisées :</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((s, i) =>
          s.isWeb ? (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg border border-primary-100 dark:border-primary-800/50 text-[10px] font-bold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
            >
              <Globe className="w-3 h-3" aria-hidden="true" />
              {s.titre}
              <ExternalLink className="w-2 h-2" aria-hidden="true" />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          ) : (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-100 dark:border-gray-700 text-[10px] font-bold"
            >
              <BookOpen className="w-3 h-3" aria-hidden="true" />
              {s.titre}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function IndicateurReflexion() {
  return (
    <div className="flex gap-2 items-center py-2" role="status">
      <div className="flex gap-1.5 items-center" aria-hidden="true">
        <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce [animation-duration:800ms]" />
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-duration:800ms] [animation-delay:200ms]" />
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-duration:800ms] [animation-delay:400ms]" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Analyse IA...</span>
    </div>
  );
}

/** Une bulle de conversation (étudiant ou assistant) */
export default function BulleMessage({ msg, enChargement }) {
  const estEtudiant = msg.role === "user";
  const reponseTerminee = !estEtudiant && !enChargement && msg.content;

  return (
    <div className={cn("flex gap-4 group animate-in slide-in-from-bottom-4 duration-300", estEtudiant ? "flex-row-reverse" : "flex-row")}>
      <div
        aria-hidden="true"
        className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm transition-transform group-hover:scale-105",
          estEtudiant ? "bg-primary-600 text-white" : "bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-800 text-primary-600"
        )}
      >
        {estEtudiant ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      <div
        className={cn(
          "relative max-w-[85%] sm:max-w-[75%] rounded-[2rem] px-6 py-5 text-sm shadow-sm transition-all",
          estEtudiant
            ? "bg-primary-600 text-white rounded-tr-none"
            : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none group-hover:shadow-md"
        )}
      >
        <span className="sr-only">{estEtudiant ? "Toi :" : "Assistant :"}</span>

        {reponseTerminee && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <BoutonCopier text={msg.content} />
          </div>
        )}

        {estEtudiant ? (
          <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>
        ) : (
          <div className="max-w-none">
            {msg.content ? (
              <>
                {formatMessage(msg.content)}
                <SourcesMessage sources={msg.sources} />
                {reponseTerminee && <BoutonsAvis msg={msg} />}
              </>
            ) : (
              <IndicateurReflexion />
            )}
          </div>
        )}

        <div className={cn("text-[9px] font-black uppercase tracking-widest mt-4 opacity-30", estEtudiant ? "text-right" : "text-left")}>
          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
        </div>
      </div>
    </div>
  );
}
