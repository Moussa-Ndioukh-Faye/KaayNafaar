/**
 * Export d'une fiche en page HTML autonome (téléchargement ou impression).
 * Tout le contenu venant de l'IA ou de l'étudiant est échappé (XSS).
 */
import { enTexte } from "../lib/texte";

export const escHtml = (str) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const genererHTMLFiche = (fiche) => {
  const dateStr = new Date(fiche.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const conceptsCles = (fiche.contenu?.conceptsCles || [])
    .map((c) => `<span class="badge">${escHtml(enTexte(c))}</span>`)
    .join("");

  const pointsImportants = (fiche.contenu?.pointsImportants || [])
    .map((p) => `<li>${escHtml(enTexte(p))}</li>`)
    .join("");

  const explications = Object.entries(fiche.contenu?.explications || {})
    .map(
      ([nom, expl]) => `
      <div class="concept-card">
        <h4>${escHtml(nom)}</h4>
        <p>${escHtml(expl)}</p>
      </div>`
    )
    .join("");

  const flashcards = (fiche.flashcards || [])
    .map(
      (fc) => `
      <div class="flashcard">
        <div class="question">❓ ${escHtml(fc.question)}</div>
        <div class="reponse">✅ ${escHtml(fc.reponse)}</div>
      </div>`
    )
    .join("");

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
    .flashcard .question { background: #eef2ff; padding: 0.8rem 1rem; font-weight: 500; color: #1e1b4b; display: flex; align-items: center; gap: 0.5rem; }
    .flashcard .reponse { background: #f0fdf4; padding: 0.8rem 1rem; color: #14532d; display: flex; align-items: center; gap: 0.5rem; }
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

  <footer>Fiche de révision · Kaay Nafaar · ${new Date().getFullYear()}</footer>
</body>
</html>`;
};

export const telechargerHTML = (fiche) => {
  const html = genererHTMLFiche(fiche);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fiche-${fiche.titre.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50)}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

export const imprimerFiche = (fiche) => {
  const html = genererHTMLFiche(fiche);
  const fenetre = window.open("", "_blank", "width=960,height=750");
  if (!fenetre) return;
  fenetre.document.write(html);
  fenetre.document.close();
  fenetre.focus();
  setTimeout(() => fenetre.print(), 400);
};
