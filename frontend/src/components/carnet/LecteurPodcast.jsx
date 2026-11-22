import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Square } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

const VITESSES = [0.85, 1, 1.15, 1.3];

/** Choisit deux voix françaises différentes quand le téléphone en propose plusieurs */
const choisirVoix = (voix) => {
  const fr = voix.filter((v) => v.lang?.toLowerCase().startsWith("fr"));
  const feminines = /amélie|amelie|audrey|aurélie|marie|julie|léa|lea|céline|celine|hortense|denise|female|femme/i;
  const masculines = /thomas|nicolas|paul|henri|claude|daniel|male|homme/i;
  const awa = fr.find((v) => feminines.test(v.name)) || fr[0] || null;
  const moussa = fr.find((v) => masculines.test(v.name) && v !== awa) || fr.find((v) => v !== awa) || awa;
  return { Awa: awa, Moussa: moussa };
};

/**
 * Résumé audio : le script (deux voix, Awa et Moussa) est lu par la synthèse vocale
 * du téléphone ou de l'ordinateur. Gratuit, sans fichier à télécharger, et le texte
 * reste affiché (sous-titres, accessibilité).
 */
export default function LecteurPodcast({ titre, repliques = [] }) {
  const disponible = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const [voix, setVoix] = useState({ Awa: null, Moussa: null });
  const [index, setIndex] = useState(0);
  const [enLecture, setEnLecture] = useState(false);
  const [vitesse, setVitesse] = useState(1);
  const lectureRef = useRef(false);
  const ligneRefs = useRef([]);

  useEffect(() => {
    if (!disponible) return undefined;
    const synthese = window.speechSynthesis;
    const charger = () => setVoix(choisirVoix(synthese.getVoices() || []));
    charger();
    synthese.addEventListener?.("voiceschanged", charger);
    return () => {
      synthese.removeEventListener?.("voiceschanged", charger);
      synthese.cancel?.(); // couper la voix en quittant la page
    };
  }, [disponible]);

  const lire = useCallback(
    (i) => {
      if (!disponible || i >= repliques.length) {
        lectureRef.current = false;
        setEnLecture(false);
        return;
      }
      const r = repliques[i];
      const enonce = new window.SpeechSynthesisUtterance(r.texte);
      enonce.lang = "fr-FR";
      enonce.rate = vitesse;
      const v = voix[r.voix];
      if (v) enonce.voice = v;
      // Une seule voix disponible : on distingue Moussa par une voix plus grave
      enonce.pitch = r.voix === "Moussa" && voix.Moussa === voix.Awa ? 0.8 : 1;
      enonce.onend = () => {
        if (!lectureRef.current) return;
        setIndex(i + 1);
        lire(i + 1);
      };
      setIndex(i);
      ligneRefs.current[i]?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
      window.speechSynthesis.speak(enonce);
    },
    [disponible, repliques, vitesse, voix]
  );

  const demarrer = () => {
    window.speechSynthesis.cancel();
    lectureRef.current = true;
    setEnLecture(true);
    lire(index >= repliques.length ? 0 : index);
  };

  const arreter = (retourDebut = false) => {
    lectureRef.current = false;
    setEnLecture(false);
    if (disponible) window.speechSynthesis.cancel();
    if (retourDebut) setIndex(0);
  };

  const aller = (i) => {
    const cible = Math.max(0, Math.min(repliques.length - 1, i));
    const continuer = lectureRef.current;
    if (disponible) window.speechSynthesis.cancel();
    setIndex(cible);
    if (continuer) {
      lectureRef.current = true;
      lire(cible);
    }
  };

  const minutes = Math.max(1, Math.round(repliques.reduce((n, r) => n + r.texte.split(/\s+/).length, 0) / 150 / vitesse));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto min-w-0">
          <p className="etiquette">Environ {minutes} min · Awa et Moussa</p>
          {titre && <p className="font-display text-xl text-foreground truncate">{titre}</p>}
        </div>
        {disponible ? (
          <div className="flex items-center gap-2" role="group" aria-label="Commandes du lecteur">
            <Button variant="ghost" size="icon" className="w-10 h-10" aria-label="Réplique précédente" onClick={() => aller(index - 1)}>
              <SkipBack aria-hidden="true" />
            </Button>
            {enLecture ? (
              <Button className="w-12 h-12 rounded-full px-0" aria-label="Pause" onClick={() => arreter(false)}>
                <Pause aria-hidden="true" />
              </Button>
            ) : (
              <Button className="w-12 h-12 rounded-full px-0" aria-label={index > 0 ? "Reprendre la lecture" : "Écouter"} onClick={demarrer}>
                <Play aria-hidden="true" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="w-10 h-10" aria-label="Réplique suivante" onClick={() => aller(index + 1)}>
              <SkipForward aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" className="w-10 h-10" aria-label="Arrêter et revenir au début" onClick={() => arreter(true)}>
              <Square aria-hidden="true" />
            </Button>
            <label className="sr-only" htmlFor="vitesse-podcast">
              Vitesse de lecture
            </label>
            <select
              id="vitesse-podcast"
              value={vitesse}
              onChange={(e) => {
                setVitesse(Number(e.target.value));
                if (lectureRef.current) arreter(false);
              }}
              className="input-field h-10 w-[5.5rem] py-0"
            >
              {VITESSES.map((v) => (
                <option key={v} value={v}>
                  ×{v.toLocaleString("fr-FR")}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">La lecture audio n'est pas disponible sur ce navigateur : voici le texte.</p>
        )}
      </div>

      <ol className="mt-5 space-y-2 max-h-[26rem] overflow-y-auto pr-1">
        {repliques.map((r, i) => (
          <li
            key={i}
            ref={(el) => (ligneRefs.current[i] = el)}
            aria-current={enLecture && i === index ? "true" : undefined}
            className={cn(
              "grid grid-cols-[4rem_1fr] items-baseline gap-2 rounded-md px-3 py-2 transition-colors",
              i === index && (enLecture || index > 0) ? "bg-secondary/40" : ""
            )}
          >
            <button
              type="button"
              onClick={() => aller(i)}
              className={cn("text-left text-sm font-semibold", r.voix === "Awa" ? "text-primary" : "text-marge")}
            >
              {r.voix}
            </button>
            <p className="text-foreground/85">{r.texte}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
