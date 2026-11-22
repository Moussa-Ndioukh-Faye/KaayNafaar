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
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500 mb-2">Sources utilisées :</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((s, i) =>
          s.isWeb ? (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg border border-primary-100 dark:border-primary-800/50 text-xs font-bold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
            >
              <Globe className="w-3 h-3" aria-hidden="true" />
              {s.titre}
              <ExternalLink className="w-2 h-2" aria-hidden="true" />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          ) : (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-100 dark:border-gray-700 text-xs font-bold"
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
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500 ml-2">Analyse IA...</span>
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
          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-1 border",
          estEtudiant ? "bg-primary text-primary-foreground border-encre/70" : "bg-card text-primary border-encre/60 dark:border-foreground/40"
        )}
      >
        {estEtudiant ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      <div
        className={cn(
          "relative max-w-[88%] sm:max-w-[75%] px-5 py-4 text-[0.95rem]",
          estEtudiant
            ? // La question de l'étudiant : un post-it jaune collé sur la page
              "bg-surligneur-pale text-encre border border-encre/15 rounded-sm shadow-md rotate-[0.4deg]"
            : // La réponse : une feuille posée, réglée
              "bg-card text-card-foreground border border-border rounded-md shadow-md"
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

        <div className={cn("text-xs mt-3 chiffres", estEtudiant ? "text-right text-encre/60" : "text-left text-muted-foreground")}>
          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
        </div>
      </div>
    </div>
  );
}
