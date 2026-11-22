import { forwardRef } from "react";
import { Send, Square, Search, ArrowRight } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";

/** Barre de saisie : question libre (mode « Chat ») ou concept à expliquer */
const ZoneSaisie = forwardRef(function ZoneSaisie(
  { mode, valeur, onChange, onEnvoyer, onAnnuler, enChargement },
  refTexte
) {
  const envoyerAvecEntree = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnvoyer();
    }
  };

  const boutonArret = (libelle) => (
    <Button onClick={onAnnuler} variant="destructive" size="icon" aria-label={libelle}>
      <Square className="w-5 h-5 fill-current" aria-hidden="true" />
    </Button>
  );

  return (
    <Card className="rounded-xl border bg-white dark:bg-gray-800 p-2 shadow-lg">
      <CardContent className="p-0">
        {mode === "general" ? (
          <div className="flex gap-3 items-end p-2 pl-6">
            <textarea
              ref={refTexte}
              aria-label="Ta question"
              className="input-field flex-1 resize-none max-h-40 min-h-[52px]"
              placeholder="Pose ta question ou demande un résumé…"
              value={valeur}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={envoyerAvecEntree}
              maxLength={5000}
              rows={1}
              disabled={enChargement}
            />
            <div className="pb-2 flex gap-2">
              {enChargement ? (
                boutonArret("Arrêter la réponse")
              ) : (
                <Button onClick={onEnvoyer} disabled={!valeur.trim()} size="icon" aria-label="Envoyer le message">
                  <Send className="w-5 h-5" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-3 items-center p-3">
            <div className="flex-1 flex items-center gap-4 bg-gray-50 dark:bg-gray-900 rounded-lg px-6 py-1.5 border-2 border-transparent focus-within:border-primary-500 transition-all">
              <Search className="w-5 h-5 text-gray-500" aria-hidden="true" />
              <input
                aria-label="Concept à expliquer"
                className="input-field flex-1 font-bold"
                placeholder="Quel concept veux-tu comprendre ?"
                value={valeur}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={envoyerAvecEntree}
                maxLength={500}
                disabled={enChargement}
              />
            </div>
            {enChargement ? (
              boutonArret("Arrêter l'explication")
            ) : (
              <Button onClick={onEnvoyer} disabled={!valeur.trim()} className="px-8 font-bold text-sm">
                Expliquer <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default ZoneSaisie;
