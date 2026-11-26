import React from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, RefreshCw, Home, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { estErreurChargement, signalerErreur } from "@/lib/erreurs";

const CLE_RECHARGEMENT = "kn-rechargement-version";

/**
 * Après un déploiement, les morceaux de l'ancienne version n'existent plus : la page
 * se recharge une fois pour récupérer la nouvelle version (pas plus d'une fois par minute,
 * pour ne jamais boucler si le réseau est coupé).
 */
const rechargerPourNouvelleVersion = () => {
  try {
    const dernier = Number(sessionStorage.getItem(CLE_RECHARGEMENT) || 0);
    if (Date.now() - dernier < 60000) return false;
    sessionStorage.setItem(CLE_RECHARGEMENT, String(Date.now()));
  } catch (_) {
    return false;
  }
  window.location.reload();
  return true;
};

/** Petite référence locale, pour relier ce que voit l'étudiant à la ligne des logs */
const referenceLocale = () => Math.random().toString(36).slice(2, 10).toUpperCase().replace(/(.{4})/, "$1-");

/** Écran affiché à la place d'une page qui a planté */
export function EcranErreur({ erreur, reference, onReessayer, pleinEcran = false }) {
  const chargement = estErreurChargement(erreur);
  const [copie, setCopie] = React.useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch (_) {
      /* presse-papiers indisponible */
    }
  };

  return (
    <div role="alert" className={`grid place-items-center px-6 py-12 ${pleinEcran ? "min-h-[100dvh] bg-background" : "min-h-[60vh]"}`}>
      <div className="w-full max-w-md text-center apparition">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-card border border-border shadow-sm">
          <AlertTriangle className="h-7 w-7 text-[#e31b23]" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          {chargement ? "Une nouvelle version est disponible" : "Cette page a rencontré un problème"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {chargement
            ? "Recharge la page pour continuer avec la dernière version de Kaay Nafaar."
            : "Tes données sont en sécurité. Réessaie : si le problème continue, signale-le avec la référence ci-dessous."}
        </p>
        <div className="bande-senegal mx-auto my-6 w-12 rounded-full" aria-hidden="true" />
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {chargement ? (
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Recharger
            </Button>
          ) : (
            <Button onClick={onReessayer}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Réessayer
            </Button>
          )}
          <Button variant="outline" onClick={() => window.location.assign("/")}>
            <Home className="mr-2 h-4 w-4" aria-hidden="true" /> Accueil
          </Button>
        </div>
        {!chargement && reference && (
          <p className="mt-6 text-xs text-muted-foreground">
            Référence : <span className="font-mono text-foreground">{reference}</span>
            <button
              type="button"
              onClick={copier}
              className="ml-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 align-middle hover:bg-muted focus-visible:outline-2"
              aria-label="Copier la référence"
            >
              {copie ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              <span className="sr-only" aria-live="polite">{copie ? "Référence copiée" : ""}</span>
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Limite d'erreur : un plantage n'emporte que la partie concernée (la page),
 * pas toute l'application ; la navigation reste utilisable.
 */
export class LimiteErreur extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erreur: null, reference: null };
    this.reessayer = () => this.setState({ erreur: null, reference: null });
  }

  static getDerivedStateFromError(erreur) {
    return { erreur, reference: referenceLocale() };
  }

  componentDidCatch(erreur, info) {
    if (estErreurChargement(erreur) && rechargerPourNouvelleVersion()) return;
    console.error(`Erreur d'affichage [${this.state.reference}]`, erreur, info?.componentStack);
    signalerErreur(
      Object.assign(new Error(`[${this.state.reference}] ${erreur?.message || erreur}`), {
        stack: `${erreur?.stack || ""}\n${info?.componentStack || ""}`,
      }),
      "rendu"
    );
  }

  componentDidUpdate(precedentes) {
    // Changer de page efface l'erreur : on ne reste pas bloqué sur l'écran d'erreur
    if (this.state.erreur && precedentes.cle !== this.props.cle) this.reessayer();
  }

  render() {
    if (this.state.erreur) {
      return (
        <EcranErreur
          erreur={this.state.erreur}
          reference={this.state.reference}
          onReessayer={this.reessayer}
          pleinEcran={this.props.pleinEcran}
        />
      );
    }
    return this.props.children;
  }
}

/** Limite d'erreur remise à zéro à chaque changement de page */
export function LimitePage({ children }) {
  const { pathname } = useLocation();
  return <LimiteErreur cle={pathname}>{children}</LimiteErreur>;
}
