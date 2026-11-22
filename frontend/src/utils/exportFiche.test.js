import { escHtml, genererHTMLFiche } from "./exportFiche";

describe("Export HTML d'une fiche", () => {
  test("échappe les caractères HTML", () => {
    expect(escHtml('<script>alert("x")</script>')).not.toContain("<script>");
  });

  test("un contenu malveillant ne peut pas injecter de script dans le fichier exporté", () => {
    const html = genererHTMLFiche({
      titre: "<img src=x onerror=alert(1)>",
      contenu: { resume: "<script>vol()</script>", conceptsCles: [{ terme: "<b>SSH</b>" }], pointsImportants: ["<i>22</i>"] },
      flashcards: [],
    });
    expect(html).not.toMatch(/<script>vol/);
    expect(html).not.toMatch(/<img src=x/);
    expect(html).toContain("&lt;b&gt;SSH&lt;/b&gt;");
  });
});
