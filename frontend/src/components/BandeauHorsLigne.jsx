import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Prévient quand la connexion est perdue (fréquent en 3G) : l'app reste ouverte, l'IA attendra le réseau */
export default function BandeauHorsLigne() {
  const [horsLigne, setHorsLigne] = useState(typeof navigator !== "undefined" && navigator.onLine === false);

  useEffect(() => {
    const maj = () => setHorsLigne(!navigator.onLine);
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);

  if (!horsLigne) return null;
  return (
    <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 bg-encre text-papier px-4 py-2.5 rounded-md shadow-lg text-sm">
      <WifiOff className="w-4 h-4" aria-hidden="true" />
      Hors connexion : l'application reste ouverte, l'IA et l'enregistrement reprendront avec le réseau.
    </div>
  );
}
