import { NavLink, useLocation } from "react-router-dom";
import { LayoutGrid, BookOpen, NotebookPen, MessageSquare, MoreHorizontal } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Barre d'onglets du téléphone, comme dans les apps iOS : les quatre sections les plus
 * utilisées toujours à portée de pouce, « Plus » ouvre le menu complet.
 * Respecte la zone de la barre d'accueil de l'iPhone (safe-area-inset-bottom).
 */
const ONGLETS = [
  { vers: "/", nom: "Accueil", icone: LayoutGrid, exact: true },
  { vers: "/mes-cours", nom: "Cours", icone: BookOpen },
  { vers: "/carnets", nom: "Carnets", icone: NotebookPen },
  { vers: "/assistant", nom: "Assistant", icone: MessageSquare },
];

const style = (actif) =>
  cn(
    "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[50px] pt-1.5 text-[0.6875rem] font-medium transition-colors",
    actif ? "text-primary" : "text-muted-foreground hover:text-foreground"
  );

export default function BarreOnglets({ ouvrirMenu, menuOuvert }) {
  const { pathname } = useLocation();
  const dansUnOnglet = ONGLETS.some(({ vers, exact }) => (exact ? pathname === vers : pathname.startsWith(vers)));

  return (
    <nav
      aria-label="Navigation principale"
      className="md:hidden barre-verre border-t border-border/70 flex px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)]"
    >
      {ONGLETS.map(({ vers, nom, icone: Icone, exact }) => (
        <NavLink key={vers} to={vers} end={exact} className={({ isActive }) => style(isActive)}>
          {({ isActive }) => (
            <>
              <Icone aria-hidden="true" className="w-6 h-6" strokeWidth={isActive ? 2.4 : 1.9} />
              {nom}
            </>
          )}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={ouvrirMenu}
        aria-haspopup="dialog"
        aria-expanded={menuOuvert}
        className={style(!dansUnOnglet)}
      >
        <MoreHorizontal aria-hidden="true" className="w-6 h-6" strokeWidth={!dansUnOnglet ? 2.4 : 1.9} />
        Plus
      </button>
    </nav>
  );
}
