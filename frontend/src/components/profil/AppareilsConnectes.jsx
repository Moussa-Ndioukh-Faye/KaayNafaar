import { useCallback, useEffect, useState } from "react";
import { Smartphone, Laptop, Tablet, LogOut, ShieldCheck } from "lucide-react";
import { authAPI } from "../../services/api";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { messageErreur } from "@/lib/erreurs";

const ICONES = { telephone: Smartphone, tablette: Tablet, ordinateur: Laptop };

const relatif = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
/** « à l'instant », « il y a 5 minutes », « hier »… */
export const depuis = (date, maintenant = Date.now()) => {
  const secondes = Math.round((new Date(date).getTime() - maintenant) / 1000);
  const abs = Math.abs(secondes);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return relatif.format(Math.round(secondes / 60), "minute");
  if (abs < 86400) return relatif.format(Math.round(secondes / 3600), "hour");
  return relatif.format(Math.round(secondes / 86400), "day");
};

/**
 * Appareils connectés : chaque session ouverte, celle en cours,
 * déconnexion d'un appareil à distance ou de tous les autres.
 */
export default function AppareilsConnectes() {
  const [sessions, setSessions] = useState(null);
  const [erreur, setErreur] = useState("");
  const [annonce, setAnnonce] = useState("");
  const [enCours, setEnCours] = useState(null);
  const [confirmerTout, setConfirmerTout] = useState(false);

  const charger = useCallback(async () => {
    try {
      const { data } = await authAPI.sessions();
      setSessions(data.sessions || []);
      setErreur("");
    } catch (e) {
      setErreur(messageErreur(e, "Impossible de charger les appareils connectés."));
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  // La demande de confirmation s'annule seule au bout de 6 secondes
  useEffect(() => {
    if (!confirmerTout) return undefined;
    const t = setTimeout(() => setConfirmerTout(false), 6000);
    return () => clearTimeout(t);
  }, [confirmerTout]);

  const fermer = async (s) => {
    setEnCours(s.id);
    try {
      await authAPI.fermerSession(s.id);
      setSessions((liste) => liste.filter((x) => x.id !== s.id));
      setAnnonce(`${s.appareil} a été déconnecté.`);
    } catch (e) {
      setAnnonce(messageErreur(e, "Impossible de déconnecter cet appareil."));
    } finally {
      setEnCours(null);
    }
  };

  const fermerAutres = async () => {
    if (!confirmerTout) {
      setConfirmerTout(true);
      return;
    }
    setConfirmerTout(false);
    setEnCours("autres");
    try {
      const { data } = await authAPI.fermerAutresSessions();
      setSessions((liste) => liste.filter((x) => x.actuelle));
      setAnnonce(data.message);
    } catch (e) {
      setAnnonce(messageErreur(e, "Impossible de déconnecter les autres appareils."));
    } finally {
      setEnCours(null);
    }
  };

  const autres = (sessions || []).filter((s) => !s.actuelle).length;

  return (
    <section aria-labelledby="titre-appareils" className="space-y-3">
      <div className="px-1">
        <h2 id="titre-appareils" className="text-[1.375rem]">Appareils connectés</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les appareils où ton compte est ouvert. Si tu n'en reconnais pas un, déconnecte-le puis change ton mot de passe.
        </p>
      </div>

      <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
        {sessions === null && !erreur && (
          <p className="px-4 py-5 text-sm text-muted-foreground" role="status">Chargement…</p>
        )}
        {erreur && (
          <div className="px-4 py-5 text-sm">
            <p className="text-destructive">{erreur}</p>
            <Button variant="link" className="h-auto p-0 mt-1" onClick={charger}>Réessayer</Button>
          </div>
        )}
        {sessions && (
          <ul>
            {sessions.map((s, i) => {
              const Icone = ICONES[s.typeAppareil] || Laptop;
              return (
                <li key={s.id} className={cn("flex items-center gap-3.5 pl-4", i > 0 && "border-t border-border")}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid place-items-center w-9 h-9 rounded-[10px] shrink-0 text-white",
                      s.actuelle ? "bg-[#00853f]" : "bg-[#636366]"
                    )}
                  >
                    <Icone className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0 py-3">
                    <p className="font-medium text-foreground leading-snug">
                      {s.appareil}
                      {s.actuelle && (
                        <span className="ml-2 inline-block align-middle whitespace-nowrap rounded-full bg-succes/15 px-2 py-0.5 text-xs font-semibold text-succes">
                          Cet appareil
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {s.actuelle ? "Actif maintenant" : `Actif ${depuis(s.derniereActivite)}`}
                      {s.ipTronquee ? ` · ${s.ipTronquee}` : ""}
                    </p>
                  </div>
                  {!s.actuelle && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fermer(s)}
                      disabled={enCours !== null}
                      aria-label={`Déconnecter ${s.appareil}`}
                      className="mr-2 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {enCours === s.id ? "…" : "Déconnecter"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {autres > 0 && (
        <Button
          variant="outline"
          onClick={fermerAutres}
          disabled={enCours !== null}
          className={cn("w-full sm:w-auto", confirmerTout && "border-destructive text-destructive hover:text-destructive")}
        >
          <LogOut aria-hidden="true" />
          {confirmerTout
            ? `Confirmer : déconnecter ${autres} appareil${autres > 1 ? "s" : ""}`
            : "Déconnecter les autres appareils"}
        </Button>
      )}

      <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 shrink-0 text-succes" aria-hidden="true" />
        Une session se ferme seule après 3 jours sans activité, et au plus tard après 7 jours. Changer de mot de passe
        déconnecte tous les autres appareils.
      </p>

      <p className="sr-only" role="status" aria-live="polite">{annonce}</p>
    </section>
  );
}
