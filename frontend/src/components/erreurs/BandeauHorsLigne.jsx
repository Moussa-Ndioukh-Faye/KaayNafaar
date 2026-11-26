import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

/** Bandeau discret quand la connexion est perdue, puis « De retour en ligne » pendant 3 s */
export default function BandeauHorsLigne() {
  const [enLigne, setEnLigne] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const [retour, setRetour] = useState(false);

  useEffect(() => {
    let minuterie;
    const horsLigne = () => {
      clearTimeout(minuterie);
      setRetour(false);
      setEnLigne(false);
    };
    const reconnecte = () => {
      setEnLigne(true);
      setRetour(true);
      minuterie = setTimeout(() => setRetour(false), 3000);
    };
    window.addEventListener("offline", horsLigne);
    window.addEventListener("online", reconnecte);
    return () => {
      clearTimeout(minuterie);
      window.removeEventListener("offline", horsLigne);
      window.removeEventListener("online", reconnecte);
    };
  }, []);

  if (enLigne && !retour) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-sm font-medium text-white ${
        enLigne ? "bg-[#006b33]" : "bg-[#1c1c1e]"
      }`}
    >
      {enLigne ? <Wifi className="h-4 w-4" aria-hidden="true" /> : <WifiOff className="h-4 w-4" aria-hidden="true" />}
      {enLigne ? "De retour en ligne" : "Hors connexion : l'application reste ouverte, l'IA et l'enregistrement reprendront avec le réseau."}
    </div>
  );
}
