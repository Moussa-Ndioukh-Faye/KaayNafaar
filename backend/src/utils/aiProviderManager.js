/**
 * Gestionnaire des fournisseurs d'IA (Gemini, Groq) — résilient et auto-réparant.
 *
 * Problèmes constatés en production (novembre 2026) et réponses apportées :
 *  - Groq a retiré « llama-3.3-70b-versatile » (404 à chaque appel) → au démarrage, la liste
 *    des modèles réellement disponibles est lue (GET /models) et le meilleur est choisi ;
 *    un 404 « modèle introuvable » relance cette découverte.
 *  - Gemini répond souvent 503 (surchargé) ou 429 (quota) → nouvelles tentatives avec attente
 *    progressive (en respectant Retry-After), puis modèle de secours (Flash-Lite : quota distinct,
 *    les limites Gemini étant fixées par modèle).
 *  - Un modèle saturé est mis « au repos » quelques instants : on ne le martèle pas.
 *  - Une réponse en flux déjà commencée n'est jamais reprise par un autre modèle (pas de doublon).
 *  - Une seule configuration partagée par tout le serveur (une instance = un état commun).
 */

const OpenAI = require("openai");

const DECOUVERTE_MIN_INTERVALLE_MS = 10 * 60 * 1000;
const REPOS_PAR_DEFAUT_MS = 20 * 1000;
const REPOS_MAX_MS = 5 * 60 * 1000;
const ATTENTE_MAX_MS = 8000;

// Préférences : la première disponible est retenue. La variable d'environnement passe avant.
const PREFERENCES_GROQ = [
  "openai/gpt-oss-120b",
  "moonshotai/kimi-k2-instruct-0905",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "llama-3.3-70b-versatile",
  "qwen/qwen3-32b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.1-8b-instant",
];
const EXCLUS_GROQ = /whisper|guard|tts|orpheus|playai|compound|distil|allam/i;

/** Version numérique d'un nom de modèle Gemini (« gemini-3.6-flash » → 3.6) */
const versionGemini = (id) => Number((id.match(/^gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
const estGeminiTexte = (id) => /^gemini-[\d.]+-flash(-lite)?$/.test(id); // ni preview, ni image, ni tts, ni live

/** Chaîne de modèles Gemini : principal (Flash le plus récent) puis secours (Flash-Lite le plus récent) */
const choisirModelesGemini = (disponibles, prefere, secoursPrefere) => {
  const texte = disponibles.filter(estGeminiTexte).sort((a, b) => versionGemini(b) - versionGemini(a));
  const flash = texte.filter((id) => !id.endsWith("-lite"));
  const lite = texte.filter((id) => id.endsWith("-lite"));
  const chaine = [];
  const ajouter = (id) => id && !chaine.includes(id) && chaine.push(id);
  if (prefere && (!disponibles.length || disponibles.includes(prefere))) ajouter(prefere);
  ajouter(flash[0]);
  if (secoursPrefere && (!disponibles.length || disponibles.includes(secoursPrefere))) ajouter(secoursPrefere);
  ajouter(lite[0]);
  return chaine;
};

/** Chaîne de modèles Groq : préférés disponibles, sinon tout modèle de texte disponible */
const choisirModelesGroq = (disponibles, prefere) => {
  const texte = disponibles.filter((id) => !EXCLUS_GROQ.test(id));
  const chaine = [];
  const ajouter = (id) => id && !chaine.includes(id) && chaine.push(id);
  if (prefere && (!disponibles.length || texte.includes(prefere))) ajouter(prefere);
  PREFERENCES_GROQ.filter((id) => texte.includes(id)).forEach(ajouter);
  if (chaine.length < 2) texte.slice(0, 2).forEach(ajouter);
  return chaine.slice(0, 3);
};

const FOURNISSEURS = [
  {
    nom: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    cleEnv: "GEMINI_API_KEY",
    timeout: 90000,
    // Avant découverte : valeurs configurées (ou valeurs par défaut récentes)
    modelesInitiaux: () =>
      [process.env.GEMINI_MODEL || "gemini-3.6-flash", process.env.GEMINI_MODEL_SECOURS || "gemini-3.5-flash-lite"],
    choisir: (dispo) =>
      choisirModelesGemini(dispo, process.env.GEMINI_MODEL || "gemini-3.6-flash", process.env.GEMINI_MODEL_SECOURS),
    normaliserId: (id) => String(id).replace(/^models\//, ""),
  },
  {
    nom: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    cleEnv: "GROQ_API_KEY",
    timeout: 45000,
    modelesInitiaux: () => [process.env.GROQ_MODEL || PREFERENCES_GROQ[0]],
    choisir: (dispo) => choisirModelesGroq(dispo, process.env.GROQ_MODEL),
    normaliserId: (id) => String(id),
  },
];

/* ── État partagé par tout le serveur ───────────────────────────── */

const etat = {
  fournisseurs: [],
  repos: new Map(), // modèle → fin du repos (timestamp)
  derniereDecouverte: 0,
  decouverteEnCours: null,
};

const journal = (...a) => {
  if (process.env.NODE_ENV !== "test") console.log(...a);
};

const initialiser = () => {
  etat.fournisseurs = FOURNISSEURS.filter((f) => process.env[f.cleEnv]).map((f) => ({
    ...f,
    // Les nouvelles tentatives sont gérées ici (attente, repos, secours), pas par le SDK
    client: new OpenAI({ apiKey: process.env[f.cleEnv], baseURL: f.baseURL, maxRetries: 0, timeout: f.timeout }),
    modeles: f.modelesInitiaux(),
  }));
  if (process.env.NODE_ENV !== "test") {
    if (etat.fournisseurs.length) {
      journal(`🤖 Fournisseurs IA : ${etat.fournisseurs.map((f) => `${f.nom} (${f.modeles.join(" → ")})`).join(", ")}`);
    } else {
      console.error("⚠️ Aucun fournisseur IA configuré : définir GEMINI_API_KEY et/ou GROQ_API_KEY.");
    }
  }
};

/** Lit les modèles réellement disponibles chez chaque fournisseur et met à jour les chaînes */
const decouvrirModeles = async ({ forcer = false } = {}) => {
  if (etat.decouverteEnCours) return etat.decouverteEnCours;
  if (!forcer && Date.now() - etat.derniereDecouverte < DECOUVERTE_MIN_INTERVALLE_MS) return null;
  etat.derniereDecouverte = Date.now();
  etat.decouverteEnCours = Promise.all(
    etat.fournisseurs.map(async (f) => {
      try {
        const page = await f.client.models.list();
        const ids = (page.data || []).map((m) => f.normaliserId(m.id));
        const chaine = f.choisir(ids);
        if (chaine.length) {
          if (chaine.join() !== f.modeles.join()) journal(`🤖 ${f.nom} : modèles retenus ${chaine.join(" → ")}`);
          f.modeles = chaine;
        } else {
          console.error(`⚠️ ${f.nom} : aucun modèle de texte disponible`);
        }
      } catch (err) {
        console.error(`⚠️ ${f.nom} : liste des modèles indisponible (${err.status || err.message})`);
      }
    })
  ).finally(() => {
    etat.decouverteEnCours = null;
  });
  return etat.decouverteEnCours;
};

/* ── Classification des erreurs ─────────────────────────────────── */

const estModeleIntrouvable = (err) =>
  err?.status === 404 || /model.*(does not exist|not found|decommissioned|not supported)/i.test(err?.message || "");
const estSaturation = (err) => [429, 503, 502, 500, 529].includes(err?.status) || /overloaded|unavailable|rate limit|quota/i.test(err?.message || "");
const estReseau = (err) => /timeout|timed out|econnreset|econnrefused|socket|network|fetch failed/i.test(`${err?.code || ""} ${err?.message || ""}`);

/** Durée de repos demandée par le fournisseur (Retry-After), bornée */
const dureeRepos = (err) => {
  const entete = err?.headers?.get?.("retry-after") ?? err?.headers?.["retry-after"];
  const secondes = Number.parseFloat(entete);
  if (Number.isFinite(secondes) && secondes > 0) return Math.min(secondes * 1000, REPOS_MAX_MS);
  return err?.status === 429 ? 60 * 1000 : REPOS_PAR_DEFAUT_MS;
};

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const attenteProgressive = (tentative) => Math.min(ATTENTE_MAX_MS, 600 * 2 ** tentative + Math.floor(Math.random() * 300));

const auRepos = (modele) => (etat.repos.get(modele) || 0) > Date.now();
const mettreAuRepos = (modele, ms) => etat.repos.set(modele, Date.now() + ms);

/** Message affiché à l'étudiant selon la dernière erreur */
const messageErreur = (err) =>
  estSaturation(err) || estReseau(err)
    ? "Le service d'IA est très demandé en ce moment. Réessaie dans une minute."
    : "Le service d'IA est momentanément indisponible. Réessaie un peu plus tard.";

class ErreurIA extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "ErreurIA";
    this.cause = cause;
    this.status = cause?.status;
  }
}

/* ── Gestionnaire ───────────────────────────────────────────────── */

class AIProviderManager {
  constructor() {
    if (!etat.initialise) {
      etat.initialise = true;
      initialiser();
      if (process.env.NODE_ENV !== "test" && etat.fournisseurs.length) decouvrirModeles({ forcer: true }).catch(() => {});
    }
  }

  get providers() {
    return etat.fournisseurs;
  }

  estDisponible() {
    return etat.fournisseurs.length > 0;
  }

  /**
   * Candidats (fournisseur, modèle) dans l'ordre demandé. Les modèles au repos passent à la fin
   * (on ne les essaie que si rien d'autre n'est possible) ; une tâche facultative les ignore.
   */
  candidats(ordre, { optionnel = false } = {}) {
    const fournisseurs = ordre
      ? [...ordre.map((n) => etat.fournisseurs.find((f) => f.nom === n)).filter(Boolean), ...etat.fournisseurs.filter((f) => !ordre.includes(f.nom))]
      : etat.fournisseurs;
    const tous = fournisseurs.flatMap((f) => f.modeles.map((modele) => ({ f, modele })));
    const libres = tous.filter((c) => !auRepos(c.modele));
    if (optionnel) return libres;
    return [...libres, ...tous.filter((c) => auRepos(c.modele))];
  }

  /** Traite l'échec d'un modèle ; renvoie true s'il vaut la peine de réessayer ce même modèle */
  async traiterEchec(err, { f, modele }, tentative, maxTentatives) {
    console.error(`❌ IA ${f.nom} (${modele}) : ${err.status || ""} ${String(err.message || "").slice(0, 160)}`);
    if (estModeleIntrouvable(err)) {
      mettreAuRepos(modele, REPOS_MAX_MS);
      await decouvrirModeles({ forcer: true }).catch(() => {});
      return false;
    }
    if (estSaturation(err) || estReseau(err)) {
      if (tentative + 1 < maxTentatives && err.status !== 429) {
        await attendre(attenteProgressive(tentative));
        return true; // 503/réseau : souvent passager, on réessaie le même modèle
      }
      mettreAuRepos(modele, dureeRepos(err)); // 429 : quota → repos, puis modèle suivant
      return false;
    }
    return false; // autre erreur (clé, requête) : modèle suivant
  }

  /**
   * Réponse complète.
   * @param {{ messages, maxTokens?, ordre?: string[], optionnel?: boolean, temperature?: number }} p
   *   optionnel : petite tâche (reformulation, relances) → un seul essai par modèle, pas de modèle au repos
   */
  async complete({ messages, maxTokens = 4096, ordre = null, optionnel = false, temperature = 0.1 }) {
    const candidats = this.candidats(ordre, { optionnel });
    if (!candidats.length) throw new ErreurIA("Aucun modèle d'IA disponible pour le moment.");
    const maxTentatives = optionnel ? 1 : 2;
    let derniere = null;

    for (const c of candidats) {
      for (let tentative = 0; tentative < maxTentatives; tentative += 1) {
        try {
          const r = await c.f.client.chat.completions.create({ model: c.modele, messages, max_tokens: maxTokens, temperature });
          const texte = r.choices?.[0]?.message?.content || "";
          if (texte) return texte;
          derniere = new Error("Réponse vide");
          break;
        } catch (err) {
          derniere = err;
          if (!(await this.traiterEchec(err, c, tentative, maxTentatives))) break;
        }
      }
    }
    throw new ErreurIA(messageErreur(derniere), derniere);
  }

  /**
   * Réponse en flux. Avant le premier morceau reçu, on peut réessayer ou changer de modèle ;
   * après, on ne change plus (sinon l'étudiant verrait le début de la réponse en double).
   */
  async streamComplete({ messages, onDelta, onDone, onError, maxTokens = 4096, ordre = null, temperature = 0.1 }) {
    const candidats = this.candidats(ordre);
    let derniere = null;

    for (const c of candidats) {
      for (let tentative = 0; tentative < 2; tentative += 1) {
        let texte = "";
        try {
          const flux = await c.f.client.chat.completions.create({
            model: c.modele,
            messages,
            stream: true,
            max_tokens: maxTokens,
            temperature,
          });
          for await (const morceau of flux) {
            const delta = morceau.choices?.[0]?.delta?.content || "";
            if (delta) {
              texte += delta;
              onDelta?.(delta);
            }
          }
          if (!texte) throw Object.assign(new Error("Réponse vide"), { status: 503 });
          await onDone?.(texte);
          return texte;
        } catch (err) {
          derniere = err;
          if (texte) {
            // Réponse interrompue en cours de route : on termine proprement sans tout recommencer
            console.error(`❌ IA ${c.f.nom} (${c.modele}) : flux interrompu après ${texte.length} caractères`);
            const avis = "\n\n_(Réponse interrompue : le service d'IA a coupé. Repose la question pour la suite.)_";
            onDelta?.(avis);
            await onDone?.(texte + avis);
            return texte + avis;
          }
          if (!(await this.traiterEchec(err, c, tentative, 2))) break;
        }
      }
    }
    onError?.(messageErreur(derniere), derniere);
    return null;
  }

  /** État lisible (diagnostic) : modèles retenus et modèles au repos */
  etat() {
    const maintenant = Date.now();
    return {
      fournisseurs: etat.fournisseurs.map((f) => ({
        nom: f.nom,
        modeles: f.modeles.map((m) => ({ modele: m, reposSecondes: Math.max(0, Math.round(((etat.repos.get(m) || 0) - maintenant) / 1000)) })),
      })),
    };
  }
}

/** Modèles Gemini retenus (pour les appels natifs : lecture de PDF et de photos) */
const modelesGemini = () => etat.fournisseurs.find((f) => f.nom === "gemini")?.modeles.filter((m) => !auRepos(m)) || [];

/** Réinitialisation (tests uniquement) */
const _reinitialiser = () => {
  etat.initialise = false;
  etat.repos.clear();
  etat.derniereDecouverte = 0;
  etat.decouverteEnCours = null;
};

module.exports = {
  AIProviderManager,
  ErreurIA,
  decouvrirModeles,
  modelesGemini,
  mettreAuRepos,
  choisirModelesGemini,
  choisirModelesGroq,
  estSaturation,
  _reinitialiser,
};
