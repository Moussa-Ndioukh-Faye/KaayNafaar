import { describe, test, expect, vi, afterEach } from "vitest";
import { messageErreur, referenceErreur, estErreurChargement, estTemporaire } from "./erreurs";

const reponse = (status, data = {}, headers = {}) => ({ isAxiosError: true, response: { status, data, headers } });

afterEach(() => vi.restoreAllMocks());

describe("messageErreur", () => {
  test("erreur de validation : le message du serveur est affiché", () => {
    expect(messageErreur(reponse(400, { message: "Le titre est requis." }), "Échec.")).toBe("Le titre est requis.");
    expect(messageErreur(reponse(422, { errors: [{ msg: "Email invalide" }] }), "Échec.")).toBe("Email invalide");
  });

  test("erreur serveur : message de l'action + référence, jamais le détail interne", () => {
    const m = messageErreur(reponse(500, { message: "Erreur interne du serveur.", reference: "AB12-CD34" }), "Impossible de créer le carnet.");
    expect(m).toBe("Impossible de créer le carnet. (réf. AB12-CD34)");
  });

  test("IA indisponible : message du serveur conservé", () => {
    const m = messageErreur(reponse(503, { code: "IA_INDISPONIBLE", message: "Le service d'IA est très demandé.", reference: "R1R1-R2R2" }));
    expect(m).toMatch(/^Le service d'IA est très demandé\. \(réf\. R1R1-R2R2\)$/);
  });

  test("trop de demandes : délai Retry-After indiqué", () => {
    expect(messageErreur(reponse(429, {}, { "retry-after": "30" }))).toBe("Trop de demandes. Réessaie dans 30 secondes.");
  });

  test("hors ligne, délai dépassé, serveur injoignable", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(messageErreur({ isAxiosError: true, code: "ERR_NETWORK" })).toMatch(/hors ligne/);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    expect(messageErreur({ isAxiosError: true, code: "ECONNABORTED", message: "timeout of 30000ms exceeded" })).toMatch(/trop de temps/);
    expect(messageErreur({ isAxiosError: true, code: "ERR_NETWORK", message: "Network Error" })).toMatch(/Impossible de joindre/);
  });

  test("annulation volontaire : aucun message", () => {
    expect(messageErreur({ name: "CanceledError", code: "ERR_CANCELED" })).toBe("");
  });

  test("404 de route : message générique compréhensible", () => {
    expect(messageErreur(reponse(404, { message: "Route introuvable." }))).toMatch(/introuvable/i);
  });
});

test("référence lue dans le corps ou l'en-tête", () => {
  expect(referenceErreur(reponse(500, { reference: "A" }))).toBe("A");
  expect(referenceErreur(reponse(500, {}, { "x-request-id": "B" }))).toBe("B");
});

test("détection d'un morceau d'application manquant (nouvelle version)", () => {
  expect(estErreurChargement(new TypeError("Failed to fetch dynamically imported module: /assets/Carnet-abc.js"))).toBe(true);
  expect(estErreurChargement(new Error("x is undefined"))).toBe(false);
});

test("erreurs temporaires", () => {
  expect(estTemporaire(reponse(503))).toBe(true);
  expect(estTemporaire(reponse(400))).toBe(false);
  expect(estTemporaire({ code: "ERR_NETWORK" })).toBe(true);
});
