/**
 * Application installable (PWA).
 * - Enregistre le service worker (mise à jour automatique).
 * - Capture l'invitation d'installation du navigateur (« beforeinstallprompt »)
 *   dès le chargement, pour que le bouton « Installer » puisse la déclencher plus tard.
 */
import { registerSW } from "virtual:pwa-register";

let invitation = null;
const abonnes = new Set();
const prevenir = () => abonnes.forEach((f) => f());

export const estInstallee = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

// iPhone / iPad : pas d'invitation automatique, il faut passer par « Partager »
export const estIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

export const invitationDisponible = () => invitation !== null;

export const sAbonner = (f) => {
  abonnes.add(f);
  return () => abonnes.delete(f);
};

/** Affiche la fenêtre d'installation du navigateur. Renvoie true si l'utilisateur accepte. */
export const installer = async () => {
  if (!invitation) return false;
  invitation.prompt();
  const { outcome } = await invitation.userChoice;
  invitation = null;
  prevenir();
  return outcome === "accepted";
};

export function demarrerPWA() {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // on affiche notre propre bouton, au bon moment
    invitation = e;
    prevenir();
  });
  window.addEventListener("appinstalled", () => {
    invitation = null;
    prevenir();
  });

  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    // iPhone : Safari ne cherche une nouvelle version qu'à l'ouverture. On vérifie aussi
    // au retour sur l'app et toutes les heures, pour ne jamais rester sur un ancien design.
    registerSW({
      immediate: true,
      onRegisteredSW(_url, enregistrement) {
        if (!enregistrement) return;
        const verifier = () => {
          if (navigator.onLine) enregistrement.update().catch(() => {});
        };
        setInterval(verifier, 60 * 60 * 1000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") verifier();
        });
      },
    });
  }
}
