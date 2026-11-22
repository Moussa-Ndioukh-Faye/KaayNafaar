/**
 * Import d'une page web comme source de cours, protégé contre la SSRF
 * (OWASP SSRF Prevention Cheat Sheet) :
 *  - http(s) uniquement, ports 80/443, pas d'identifiants dans l'URL ;
 *  - chaque adresse IP résolue est vérifiée AU MOMENT DE LA CONNEXION (option `lookup`),
 *    ce qui bloque aussi le « DNS rebinding » ;
 *  - adresses privées, locales, de lien local, CGNAT, multicast et métadonnées cloud refusées ;
 *  - redirections suivies manuellement (3 au plus), chacune revérifiée ;
 *  - délai de 10 s, 3 Mo au plus, types HTML / texte / PDF seulement.
 */

const http = require("http");
const https = require("https");
const dns = require("dns");
const net = require("net");
const { parse } = require("node-html-parser");
const pdf = require("pdf-parse");

const TAILLE_MAX = 3 * 1024 * 1024;
const DELAI_MS = 10000;
const MAX_REDIRECTIONS = 3;

class ErreurImport extends Error {}

/** true si l'adresse ne doit jamais être contactée depuis le serveur */
const estAdresseInterdite = (adresse) => {
  if (net.isIPv4(adresse)) {
    const [a, b] = adresse.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // lien local, métadonnées cloud
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224 // multicast et réservé
    );
  }
  if (net.isIPv6(adresse)) {
    const v = adresse.toLowerCase();
    if (v.startsWith("::ffff:")) return estAdresseInterdite(v.slice(7));
    return (
      v === "::" ||
      v === "::1" ||
      v.startsWith("fc") ||
      v.startsWith("fd") || // adresses uniques locales
      v.startsWith("fe80") || // lien local
      v.startsWith("ff") // multicast
    );
  }
  return true;
};

// Résolution DNS filtrée, utilisée par le socket lui-même
const lookupSur = (hote, options, rappel) => {
  dns.lookup(hote, { ...options, all: true }, (err, adresses) => {
    if (err) return rappel(err);
    const liste = Array.isArray(adresses) ? adresses : [{ address: adresses, family: options.family || 4 }];
    const interdite = liste.find((a) => estAdresseInterdite(a.address));
    if (interdite || !liste.length) return rappel(new ErreurImport("Adresse non autorisée"));
    if (options.all) return rappel(null, liste);
    rappel(null, liste[0].address, liste[0].family);
  });
};

const verifierURL = (brute) => {
  let url;
  try {
    url = new URL(String(brute).trim());
  } catch {
    throw new ErreurImport("Lien invalide.");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new ErreurImport("Seuls les liens http et https sont acceptés.");
  if (url.username || url.password) throw new ErreurImport("Lien invalide.");
  if (url.port && !["80", "443"].includes(url.port)) throw new ErreurImport("Port non autorisé.");
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, "")) && estAdresseInterdite(url.hostname.replace(/^\[|\]$/g, "")))
    throw new ErreurImport("Adresse non autorisée.");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname)) throw new ErreurImport("Adresse non autorisée.");
  return url;
};

const telecharger = (url, redirections = 0) =>
  new Promise((resoudre, rejeter) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.get(
      url,
      {
        lookup: lookupSur,
        timeout: DELAI_MS,
        headers: {
          "User-Agent": "KaayNafaarBot/1.0 (+https://kaay-nafaar.vercel.app)",
          Accept: "text/html,application/xhtml+xml,text/plain,application/pdf;q=0.9",
          "Accept-Language": "fr,en;q=0.8",
        },
      },
      (rep) => {
        const statut = rep.statusCode || 0;
        if (statut >= 300 && statut < 400 && rep.headers.location) {
          rep.resume();
          if (redirections >= MAX_REDIRECTIONS) return rejeter(new ErreurImport("Trop de redirections."));
          try {
            const suivante = verifierURL(new URL(rep.headers.location, url).toString());
            return resoudre(telecharger(suivante, redirections + 1));
          } catch (e) {
            return rejeter(e);
          }
        }
        if (statut !== 200) {
          rep.resume();
          return rejeter(new ErreurImport(`La page a répondu ${statut}.`));
        }
        const type = String(rep.headers["content-type"] || "").toLowerCase();
        if (!/text\/html|application\/xhtml|text\/plain|application\/pdf/.test(type)) {
          rep.resume();
          return rejeter(new ErreurImport("Ce lien ne mène ni à une page web, ni à un texte, ni à un PDF."));
        }
        const morceaux = [];
        let taille = 0;
        rep.on("data", (m) => {
          taille += m.length;
          if (taille > TAILLE_MAX) {
            req.destroy();
            rejeter(new ErreurImport("Page trop volumineuse (3 Mo maximum)."));
          } else morceaux.push(m);
        });
        rep.on("end", () => resoudre({ corps: Buffer.concat(morceaux), type, urlFinale: url.toString() }));
        rep.on("error", rejeter);
      }
    );
    req.on("timeout", () => req.destroy(new ErreurImport("La page met trop de temps à répondre.")));
    req.on("error", (e) => rejeter(e instanceof ErreurImport ? e : new ErreurImport("Page inaccessible.")));
  });

/** Texte lisible d'une page HTML : titre + contenu principal, sans menus ni scripts */
const texteHTML = (html) => {
  const racine = parse(html, { blockTextElements: { script: false, style: false, noscript: false, pre: true } });
  racine.querySelectorAll("script,style,noscript,nav,header,footer,aside,form,iframe,svg,button").forEach((n) => n.remove());
  const titre = (racine.querySelector("title")?.text || racine.querySelector("h1")?.text || "").trim();
  const principal = racine.querySelector("article") || racine.querySelector("main") || racine.querySelector("body") || racine;
  const blocs = principal
    .querySelectorAll("h1,h2,h3,h4,p,li,blockquote,pre,td,th,dd,dt")
    .map((n) => n.text.replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 1);
  const texte = (blocs.length ? blocs.join("\n") : principal.text.replace(/\s+/g, " ")).trim();
  return { titre, texte };
};

/**
 * @returns {Promise<{ titre: string, texte: string, url: string }>}
 */
const importerLien = async (brute) => {
  const url = verifierURL(brute);
  const { corps, type, urlFinale } = await telecharger(url);
  let titre = "";
  let texte = "";
  if (type.includes("application/pdf")) {
    texte = (await pdf(corps)).text || "";
  } else if (type.includes("text/plain")) {
    texte = corps.toString("utf8");
  } else {
    ({ titre, texte } = texteHTML(corps.toString("utf8")));
  }
  texte = texte.replace(/\n{3,}/g, "\n\n").trim();
  if (texte.length < 200) throw new ErreurImport("Pas assez de texte sur cette page pour en faire un cours.");
  return { titre: titre.slice(0, 200) || new URL(urlFinale).hostname, texte: texte.slice(0, 500000), url: urlFinale };
};

module.exports = { importerLien, estAdresseInterdite, verifierURL, texteHTML, ErreurImport };
