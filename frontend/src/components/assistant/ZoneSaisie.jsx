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
    <Button onClick={onAnnuler} variant="destructive" size="icon" className="rounded-full" aria-label={libelle}>
      <Square className="w-5 h-5 fill-current" aria-hidden="true" />
    </Button>
  );

  return (
    <Card className="rounded-[26px] bg-card p-1.5 shadow-lg">
      <CardContent className="p-0">
        {mode === "general" ? (
          <div className="flex gap-2 items-end p-1.5">
            <textarea
              ref={refTexte}
              aria-label="Ta question"
              className="input-field flex-1 resize-none max-h-40 min-h-[48px] rounded-[20px] py-3 h-auto"
              placeholder="Pose ta question ou demande un résumé…"
              value={valeur}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={envoyerAvecEntree}
              maxLength={5000}
              rows={1}
              disabled={enChargement}
            />
            <div className="pb-1 flex gap-2">
              {enChargement ? (
                boutonArret("Arrêter la réponse")
              ) : (
                <Button onClick={onEnvoyer} disabled={!valeur.trim()} size="icon" className="rounded-full" aria-label="Envoyer le message">
                  <Send className="w-5 h-5" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-3 items-center p-3">
            <div className="flex-1 flex items-center gap-3 bg-card rounded-[20px] px-4 py-1.5 border border-input focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 transition-all">
              <Search className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
              <input
                aria-label="Concept à expliquer"
                className="flex-1 h-10 bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
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
              <Button onClick={onEnvoyer} disabled={!valeur.trim()} className="rounded-full px-6">
                Expliquer <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default ZoneSaisie;
