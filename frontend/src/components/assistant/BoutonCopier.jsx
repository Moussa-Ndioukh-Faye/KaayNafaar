import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

/** Copie la réponse de l'IA dans le presse-papiers */
export default function BoutonCopier({ text }) {
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch (_) {
      /* presse-papiers indisponible */
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={copie ? "Copié" : "Copier la réponse"}
            onClick={copier}
            className="w-8 h-8 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"
          >
            {copie ? <Check className="w-4 h-4 text-emerald-500" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copie ? "Copié !" : "Copier la réponse"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
