const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const JSZip = require("jszip");
const { estAdresseInterdite, verifierURL, texteHTML, importerLien, ErreurImport } = require("../src/utils/importLien");
const { extraireDocx, extrairePptx } = require("../src/utils/extraction");

describe("Import de lien : protection SSRF", () => {
  test.each([
    "127.0.0.1",
    "10.0.0.5",
    "172.16.4.1",
    "192.168.1.10",
    "169.254.169.254", // métadonnées cloud
    "100.64.0.1", // CGNAT
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])("refuse l'adresse interne %s", (ip) => {
    expect(estAdresseInterdite(ip)).toBe(true);
  });

  test.each(["8.8.8.8", "41.82.10.1", "2001:4860:4860::8888"])("accepte l'adresse publique %s", (ip) => {
    expect(estAdresseInterdite(ip)).toBe(false);
  });

  test.each([
    "file:///etc/passwd",
    "ftp://exemple.com/cours.pdf",
    "http://localhost/admin",
    "http://127.0.0.1:5001/api",
    "http://[::1]/",
    "https://utilisateur:motdepasse@exemple.com/",
    "https://exemple.com:8443/",
    "javascript:alert(1)",
    "pas une url",
  ])("refuse le lien %s", (url) => {
    expect(() => verifierURL(url)).toThrow(ErreurImport);
  });

  test("accepte un lien https ordinaire", () => {
    expect(verifierURL("https://fr.wikipedia.org/wiki/Secure_Shell").hostname).toBe("fr.wikipedia.org");
  });

  test("ne peut pas atteindre un service local, même s'il écoute vraiment", async () => {
    const serveur = http.createServer((req, res) => res.end("<p>secret interne</p>".repeat(50)));
    await new Promise((r) => serveur.listen(0, "127.0.0.1", r));
    const { port } = serveur.address();
    await expect(importerLien(`http://127.0.0.1:${port}/`)).rejects.toThrow(ErreurImport);
    // Même avec un nom d'hôte qui résout vers 127.0.0.1 (« DNS rebinding »), le socket refuse
    await expect(importerLien("http://localtest.me/")).rejects.toThrow(ErreurImport);
    serveur.close();
  });

  test("extrait le texte principal d'une page, sans scripts ni menus", () => {
    const { titre, texte } = texteHTML(`
      <html><head><title>SSH — Cours</title><script>vol()</script></head>
      <body><nav>Accueil · Contact</nav>
        <article><h1>Secure Shell</h1><p>SSH chiffre les échanges.</p><ul><li>Port 22</li></ul></article>
        <footer>© 2026</footer></body></html>`);
    expect(titre).toBe("SSH — Cours");
    expect(texte).toContain("SSH chiffre les échanges.");
    expect(texte).toContain("Port 22");
    expect(texte).not.toMatch(/vol\(\)|Accueil|© 2026/);
  });
});

describe("Extraction Word et PowerPoint", () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "kn-extraction-"));
  afterAll(() => fs.rmSync(dossier, { recursive: true, force: true }));

  const ecrireZip = async (nom, fichiers) => {
    const zip = new JSZip();
    Object.entries(fichiers).forEach(([n, contenu]) => zip.file(n, contenu));
    const chemin = path.join(dossier, nom);
    fs.writeFileSync(chemin, await zip.generateAsync({ type: "nodebuffer" }));
    return chemin;
  };

  test("lit le texte d'un document Word", async () => {
    const chemin = await ecrireZip("cours.docx", {
      "[Content_Types].xml": `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
      "_rels/.rels": `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
      "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Les formes normales</w:t></w:r></w:p><w:p><w:r><w:t>La 3FN élimine les dépendances transitives.</w:t></w:r></w:p></w:body></w:document>`,
    });
    const texte = await extraireDocx(chemin);
    expect(texte).toContain("Les formes normales");
    expect(texte).toContain("La 3FN élimine les dépendances transitives.");
  });

  test("lit les diapositives d'un PowerPoint dans l'ordre", async () => {
    const diapo = (t) =>
      `<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${t}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
    const chemin = await ecrireZip("cours.pptx", {
      "ppt/slides/slide10.xml": diapo("Conclusion"),
      "ppt/slides/slide2.xml": diapo("SSH &amp; Telnet"),
      "ppt/slides/slide1.xml": diapo("Introduction"),
    });
    const texte = await extrairePptx(chemin);
    expect(texte.indexOf("Introduction")).toBeLessThan(texte.indexOf("SSH & Telnet"));
    expect(texte.indexOf("SSH & Telnet")).toBeLessThan(texte.indexOf("Conclusion"));
    expect(texte).toMatch(/Diapositive 1\nIntroduction/);
  });
});
