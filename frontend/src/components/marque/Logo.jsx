import { cn } from "../../lib/utils";
import marque from "../../assets/marque/kn-mark.png";
import marqueClaire from "../../assets/marque/kn-mark-clair.png";
import logoComplet from "../../assets/marque/kn-logo.png";
import logoCompletClair from "../../assets/marque/kn-logo-clair.png";

/**
 * Monogramme KN (toque + trait bleu). `ton="clair"` pour un fond sombre ;
 * par défaut, la version claire s'affiche automatiquement en mode sombre.
 */
export function LogoMarque({ className, ton = "auto" }) {
  if (ton === "clair") {
    return <img src={marqueClaire} alt="" className={cn("w-10 h-auto", className)} />;
  }
  return (
    <>
      <img src={marque} alt="" className={cn("w-10 h-auto", ton === "auto" && "dark:hidden", className)} />
      {ton === "auto" && <img src={marqueClaire} alt="" className={cn("w-10 h-auto hidden dark:block", className)} />}
    </>
  );
}

/** Logo complet (monogramme + « Kaay Nafaar » + livre), pour les grandes surfaces */
export function LogoComplet({ className, ton = "auto" }) {
  if (ton === "clair") {
    return <img src={logoCompletClair} alt="Kaay Nafaar" className={cn("h-auto", className)} />;
  }
  return (
    <>
      <img src={logoComplet} alt="Kaay Nafaar" className={cn("h-auto dark:hidden", className)} />
      <img src={logoCompletClair} alt="Kaay Nafaar" className={cn("h-auto hidden dark:block", className)} />
    </>
  );
}

/** Logo horizontal : monogramme + logotype bicolore (marine / bleu roi) */
export default function Logo({ className, ton = "auto" }) {
  const clair = ton === "clair";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMarque ton={ton} className="w-11" />
      <span className="text-[1.3rem] font-bold leading-none tracking-[-0.03em]">
        <span className={clair ? "text-white" : "text-marine dark:text-white"}>Kaay </span>
        <span className={clair ? "text-primary-300" : "text-primary-600 dark:text-primary"}>Nafaar</span>
      </span>
    </span>
  );
}
