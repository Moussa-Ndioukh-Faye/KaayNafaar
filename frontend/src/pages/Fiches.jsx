/**
 * Page Fiches — Fiches de révision + Flashcards + Génération IA
 * + Vue détail HTML + Téléchargement HTML / impression PDF
 */

import React, { useState, useEffect, useRef } from "react";
import { fichesAPI, coursAPI, iaAPI } from "../services/api";

// ── Échappement HTML pour éviter le XSS dans le HTML généré ─────────────────
const escHtml = (str) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// ── Génération du HTML complet de la fiche ────────────────────────────────────
const genererHTMLFiche = (fiche) => {
  const dateStr = new Date(fiche.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const conceptsCles = (fiche.contenu?.conceptsCles || [])
    .map((c) => `<span class="badge">${escHtml(c)}</span>`).join("");

  const pointsImportants = (fiche.contenu?.pointsImportants || [])
    .map((p) => `<li>${escHtml(p)}</li>`).join("");

  const explications = Object.entries(fiche.contenu?.explications || {})
    .map(([nom, expl]) => `
      <div class="concept-card">
        <h4>${escHtml(nom)}</h4>
        <p>${escHtml(expl)}</p>
      </div>`).join("");

  const flashcards = (fiche.flashcards || [])
    .map((fc) => `
      <div class="flashcard">
        <div class="question">❓ ${escHtml(fc.question)}</div>
        <div class="reponse">✅ ${escHtml(fc.reponse)}</div>
      </div>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(fiche.titre)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #f9fafb; padding: 2rem; max-width: 900px; margin: 0 auto; }
    header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
    header h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
    header .meta { font-size: 0.9rem; opacity: 0.85; }
    section { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #4f46e5; }
    h2 { color: #4f46e5; font-size: 1.1rem; margin-bottom: 1rem; }
    p { line-height: 1.7; color: #374151; }
    .badge { display: inline-block; background: #eef2ff; color: #4f46e5; padding: 0.2rem 0.7rem; border-radius: 999px; font-size: 0.8rem; margin: 0.2rem; font-weight: 500; }
    ul { padding-left: 1.5rem; }
    li { margin-bottom: 0.5rem; line-height: 1.6; }
    .concept-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 0.8rem; }
    .concept-card h4 { color: #4f46e5; margin-bottom: 0.4rem; font-size: 0.95rem; font-weight: 600; }
    .flashcard { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 0.8rem; overflow: hidden; }
    .flashcard .question { background: #eef2ff; padding: 0.8rem 1rem; font-weight: 500; color: #1e1b4b; }
    .flashcard .reponse { background: #f0fdf4; padding: 0.8rem 1rem; color: #14532d; }
    footer { text-align: center; color: #9ca3af; font-size: 0.8rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
    @media print {
      body { background: white; padding: 1rem; }
      section { box-shadow: none; break-inside: avoid; }
      header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escHtml(fiche.titre)}</h1>
    <div class="meta">
      ${fiche.cours ? `📚 ${escHtml(fiche.cours.titre)} · ` : ""}Créée le ${dateStr}${fiche.genereeParIA ? " · ✨ Générée par IA" : ""}
    </div>
  </header>

  ${fiche.contenu?.resume ? `<section><h2>📝 Résumé</h2><p>${escHtml(fiche.contenu.resume)}</p></section>` : ""}
  ${conceptsCles ? `<section><h2>🔑 Concepts clés</h2><div>${conceptsCles}</div></section>` : ""}
  ${pointsImportants ? `<section><h2>⭐ Points importants</h2><ul>${pointsImportants}</ul></section>` : ""}
  ${explications ? `<section><h2>📖 Explications détaillées</h2>${explications}</section>` : ""}
  ${flashcards ? `<section><h2>🃏 Flashcards (${fiche.flashcards.length})</h2>${flashcards}</section>` : ""}

  <footer>Fiche de révision · RévisionIA · ${new Date().getFullYear()}</footer>
</body>
</html>`;
};

// ── Téléchargement HTML (côté client, aucune dépendance) ──────────────────────
const telechargerHTML = (fiche) => {
  const html = genererHTMLFiche(fiche);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fiche-${fiche.titre.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50)}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Impression / PDF via fenêtre de navigation ────────────────────────────────
const imprimerFiche = (fiche) => {
  const html = genererHTMLFiche(fiche);
  const fenetre = window.open("", "_blank", "width=960,height=750");
  if (!fenetre) return;
  fenetre.document.write(html);
  fenetre.document.close();
  fenetre.focus();
  setTimeout(() => fenetre.print(), 400);
};

// ─────────────────────────────────────────────────────────────────────────────

export default function Fiches() {
  const [fiches, setFiches] = useState([]);
  const [cours, setCours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [vue, setVue] = useState("liste"); // "liste" | "detail" | "generer" | "flashcards"
  const [ficheSelectionnee, setFicheSelectionnee] = useState(null);
  const [generation, setGeneration] = useState({ coursId: "", contenu: "", titre: "" });
  const [enGeneration, setEnGeneration] = useState(false);
  const [texteStream, setTexteStream] = useState("");
  const [erreur, setErreur] = useState("");
  const [indexFlashcard, setIndexFlashcard] = useState(0);
  const [reponseMontree, setReponseMontree] = useState(false);
  const controllerRef = useRef(null);

  useEffect(() => {
    return () => controllerRef.current?.abort?.();
  }, []);

  useEffect(() => {
    const charger = async () => {
      try {
        const [f, c] = await Promise.all([fichesAPI.getFiches(), coursAPI.getCours()]);
        setFiches(f.data.fiches ?? []);
        setCours(c.data.cours ?? []);
      } catch (_) {
        setErreur("Impossible de charger les données.");
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

  const handleCoursChange = (e) => {
    const coursId = e.target.value;
    const c = cours.find((x) => x._id === coursId);
    setGeneration({ coursId, contenu: c?.contenu || "", titre: c?.titre || "" });
  };

  const lancerGeneration = () => {
    if (!generation.contenu.trim()) { setErreur("Veuillez fournir un contenu de cours."); return; }
    setEnGeneration(true);
    setTexteStream("");
    setErreur("");

    controllerRef.current = iaAPI.genererFicheStream(
      { contenuCours: generation.contenu, titreCours: generation.titre, coursId: generation.coursId || undefined },
      (delta) => setTexteStream((prev) => prev + delta),
      () => {
        setEnGeneration(false);
        fichesAPI.getFiches().then(({ data }) => setFiches(data.fiches ?? []));
        setVue("liste");
        setTexteStream("");
      },
      (err) => { setErreur(err || "Erreur de génération."); setEnGeneration(false); }
    );
  };

  const supprimerFiche = async (id) => {
    if (!window.confirm("Supprimer cette fiche ?")) return;
    try {
      await fichesAPI.supprimerFiche(id);
      setFiches((prev) => prev.filter((f) => f._id !== id));
      if (ficheSelectionnee?._id === id) setVue("liste");
    } catch (_) {
      setErreur("Impossible de supprimer la fiche.");
    }
  };

  const ouvrirDetail = (fiche) => { setFicheSelectionnee(fiche); setVue("detail"); };
  const ouvrirFlashcards = (fiche) => {
    setFicheSelectionnee(fiche);
    setIndexFlashcard(0);
    setReponseMontree(false);
    setVue("flashcards");
  };

  // ── Vue Flashcards ──────────────────────────────────────────────────────────
  if (vue === "flashcards" && ficheSelectionnee) {
    const flashcards = ficheSelectionnee.flashcards || [];
    const card = flashcards[indexFlashcard];

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setVue("detail")} className="btn-secondary text-sm">← Retour</button>
          <h2 className="font-bold text-gray-900">🃏 Flashcards — {ficheSelectionnee.titre}</h2>
        </div>

        {flashcards.length === 0 ? (
          <div className="card text-center py-10 text-gray-500">Aucune flashcard dans cette fiche.</div>
        ) : (
          <>
            <div className="text-sm text-gray-500 text-center">{indexFlashcard + 1} / {flashcards.length}</div>
            <div
              className="card min-h-48 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setReponseMontree(!reponseMontree)}
            >
              {reponseMontree ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wider text-primary-600 font-semibold">Réponse</p>
                  <p className="text-lg font-medium text-gray-900">{card.reponse}</p>
                  <p className="text-xs text-gray-400 mt-4">(Clique pour voir la question)</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Question</p>
                  <p className="text-xl font-semibold text-gray-900">{card.question}</p>
                  <p className="text-xs text-gray-400 mt-4">(Clique pour voir la réponse)</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              <button disabled={indexFlashcard === 0}
                onClick={() => { setIndexFlashcard((i) => i - 1); setReponseMontree(false); }}
                className="btn-secondary disabled:opacity-30">← Précédente</button>
              {indexFlashcard < flashcards.length - 1 ? (
                <button onClick={() => { setIndexFlashcard((i) => i + 1); setReponseMontree(false); }} className="btn-primary">
                  Suivante →
                </button>
              ) : (
                <button onClick={() => { setIndexFlashcard(0); setReponseMontree(false); }} className="btn-primary">
                  🔄 Recommencer
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Vue Détail (HTML rendu) ─────────────────────────────────────────────────
  if (vue === "detail" && ficheSelectionnee) {
    const fiche = ficheSelectionnee;
    const conceptsCles = fiche.contenu?.conceptsCles || [];
    const pointsImportants = fiche.contenu?.pointsImportants || [];
    const explications = fiche.contenu?.explications || {};

    return (
      <div className="max-w-3xl space-y-6">
        {/* En-tête actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => setVue("liste")} className="btn-secondary text-sm">← Retour</button>
            <h2 className="font-bold text-gray-900">{fiche.titre}</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => telechargerHTML(fiche)} className="btn-secondary text-sm" title="Télécharger en HTML">
              ⬇️ HTML
            </button>
            <button onClick={() => imprimerFiche(fiche)} className="btn-secondary text-sm" title="Enregistrer en PDF">
              🖨️ PDF
            </button>
            {fiche.flashcards?.length > 0 && (
              <button onClick={() => ouvrirFlashcards(fiche)} className="btn-primary text-sm">🃏 Réviser</button>
            )}
            <button onClick={() => supprimerFiche(fiche._id)} className="text-red-500 hover:text-red-700 text-sm px-2" title="Supprimer">
              🗑️
            </button>
          </div>
        </div>

        {fiche.genereeParIA && <span className="badge bg-purple-100 text-purple-700 inline-block">✨ Générée par IA</span>}

        {/* Résumé */}
        {fiche.contenu?.resume && (
          <div className="card border-l-4 border-primary-500">
            <h3 className="font-semibold text-primary-700 mb-2">📝 Résumé</h3>
            <p className="text-gray-700 leading-relaxed">{fiche.contenu.resume}</p>
          </div>
        )}

        {/* Concepts clés */}
        {conceptsCles.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">🔑 Concepts clés</h3>
            <div className="flex flex-wrap gap-2">
              {conceptsCles.map((c, i) => (
                <span key={i} className="badge bg-primary-100 text-primary-700 text-sm px-3 py-1">{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Points importants */}
        {pointsImportants.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">⭐ Points importants</h3>
            <ul className="space-y-2">
              {pointsImportants.map((p, i) => (
                <li key={i} className="flex gap-2 text-gray-700">
                  <span className="text-primary-500 flex-shrink-0 mt-1">•</span>
                  <span className="leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Explications détaillées */}
        {Object.keys(explications).length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">📖 Explications détaillées</h3>
            <div className="space-y-3">
              {Object.entries(explications).map(([nom, expl], i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-primary-700 mb-1">{nom}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{expl}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flashcards aperçu + révision */}
        {fiche.flashcards?.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">🃏 Flashcards ({fiche.flashcards.length})</h3>
              <button onClick={() => ouvrirFlashcards(fiche)} className="text-primary-600 text-sm font-medium hover:underline">
                Réviser →
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {fiche.flashcards.map((fc, i) => (
                <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-primary-50 px-3 py-2 text-sm font-medium text-primary-900">❓ {fc.question}</div>
                  <div className="bg-green-50 px-3 py-2 text-sm text-green-800">✅ {fc.reponse}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Téléchargement bas de page */}
        <div className="card bg-gray-50 flex gap-3 flex-wrap items-center">
          <p className="text-sm text-gray-600 flex-1">Exporter cette fiche :</p>
          <button onClick={() => telechargerHTML(fiche)} className="btn-secondary text-sm">⬇️ Télécharger HTML</button>
          <button onClick={() => imprimerFiche(fiche)} className="btn-primary text-sm">🖨️ Imprimer / PDF</button>
        </div>
      </div>
    );
  }

  // ── Vue Génération IA ───────────────────────────────────────────────────────
  if (vue === "generer") {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setVue("liste"); setTexteStream(""); setEnGeneration(false); controllerRef.current?.abort?.(); }}
            className="btn-secondary text-sm"
          >
            ← Retour
          </button>
          <h2 className="font-bold text-gray-900">✨ Générer une fiche avec l'IA</h2>
        </div>

        {erreur && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">{erreur}</div>
        )}

        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Choisir un cours existant (optionnel)</label>
            <select className="input-field" onChange={handleCoursChange} value={generation.coursId}>
              <option value="">-- Sélectionner un cours --</option>
              {cours.map((c) => <option key={c._id} value={c._id}>{c.titre} — {c.matiere}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la fiche</label>
            <input className="input-field" placeholder="ex: Fiche - Algorithmes de tri" maxLength={200}
              value={generation.titre}
              onChange={(e) => setGeneration({ ...generation, titre: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contenu du cours * <span className="text-gray-400 text-xs">({generation.contenu.length}/50000 caractères)</span>
            </label>
            <textarea
              className="input-field h-48 resize-none" placeholder="Colle le texte de ton cours ici…"
              value={generation.contenu} maxLength={50000}
              onChange={(e) => setGeneration({ ...generation, contenu: e.target.value })}
            />
          </div>

          <button
            onClick={lancerGeneration}
            disabled={enGeneration || !generation.contenu.trim()}
            className="btn-primary"
          >
            {enGeneration ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Génération en cours…
              </span>
            ) : "✨ Générer la fiche avec Claude"}
          </button>
        </div>

        {texteStream && (
          <div className="card bg-gray-50">
            <p className="text-xs text-primary-600 font-semibold mb-2 flex items-center gap-1">
              <span className="animate-pulse">●</span> Claude génère ta fiche…
            </p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-auto max-h-96">{texteStream}</pre>
          </div>
        )}
      </div>
    );
  }

  // ── Vue Liste ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">📋 Mes Fiches</h2>
          <p className="text-gray-500 text-sm">{fiches.length} fiche(s)</p>
        </div>
        <button onClick={() => setVue("generer")} className="btn-primary">✨ Générer avec IA</button>
      </div>

      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">{erreur}</div>
      )}

      {chargement ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : fiches.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-5xl mb-4">📋</p>
          <p className="font-medium">Aucune fiche encore.</p>
          <button onClick={() => setVue("generer")} className="btn-primary mt-4">✨ Générer ma première fiche</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fiches.map((fiche) => (
            <div key={fiche._id} className="card hover:shadow-md transition-shadow group flex flex-col">
              <div style={{ borderTop: `4px solid ${fiche.couleur || "#6366f1"}` }} className="rounded-t-lg -mx-6 -mt-6 mb-4 px-6 pt-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-900 truncate flex-1 pr-2">{fiche.titre}</h3>
                  <button onClick={() => supprimerFiche(fiche._id)}
                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    aria-label="Supprimer">🗑️</button>
                </div>
              </div>

              {fiche.genereeParIA && (
                <span className="badge bg-purple-100 text-purple-700 mb-2 inline-block text-xs">✨ IA</span>
              )}

              {fiche.contenu?.conceptsCles?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {fiche.contenu.conceptsCles.slice(0, 3).map((c, i) => (
                    <span key={i} className="badge bg-gray-100 text-gray-600 text-xs">{c}</span>
                  ))}
                  {fiche.contenu.conceptsCles.length > 3 && (
                    <span className="badge bg-gray-100 text-gray-500 text-xs">+{fiche.contenu.conceptsCles.length - 3}</span>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                {fiche.contenu?.resume || "Pas de résumé."}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-1">
                <span className="text-xs text-gray-400 flex-shrink-0">🃏 {fiche.flashcards?.length || 0}</span>
                <div className="flex gap-2 items-center">
                  <button onClick={() => telechargerHTML(fiche)} className="text-gray-400 hover:text-gray-600 text-xs" title="Télécharger HTML">⬇️</button>
                  <button onClick={() => imprimerFiche(fiche)} className="text-gray-400 hover:text-gray-600 text-xs" title="PDF">🖨️</button>
                  <button onClick={() => ouvrirDetail(fiche)} className="text-primary-600 text-sm font-medium hover:underline">Voir →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
