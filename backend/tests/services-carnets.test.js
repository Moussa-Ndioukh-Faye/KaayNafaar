/**
 * Services purs des carnets : normalisation, réglages, options, audio, utilitaires IA.
 */
jest.mock("../src/utils/aiProviderManager", () => ({
  AIProviderManager: function () {
    this.estDisponible = () => true;
    this.complete = jest.fn(async () => "{}");
  },
}));

const { normaliserQuestionQuiz, normaliserFlashcards } = require("../src/services/normalisation");
const { normaliserReglages, consigneSysteme } = require("../src/services/carnets/chat");
const { normaliserOptions, consigneComplete, TYPES } = require("../src/services/carnets/studio");
const { normaliserRepliques, consigneScript } = require("../src/services/carnets/audio");
const { extraireJSON, avecDelai } = require("../src/services/carnets/ia");
const { MIGRATIONS } = require("../src/config/migrations");

describe("Normalisation des quiz", () => {
  const options = ["21", "22", "23"];
  test.each([
    ["index", { question: "Port ?", answers: options, correct: 1 }],
    ["lettre", { question: "Port ?", options, reponseCorrecte: "b" }],
    ["texte", { question: "Port ?", choix: options, bonne_reponse: "22" }],
  ])("bonne réponse donnée par %s", (_, q) => {
    expect(normaliserQuestionQuiz(q)).toMatchObject({ type: "qcm", options, reponseCorrecte: "22" });
  });

  test.each([
    ["sans bonne réponse valide", { question: "?", options, reponseCorrecte: "99" }],
    ["une seule option", { question: "?", options: ["a"], reponseCorrecte: "a" }],
    ["options en double", { question: "?", options: ["a", "a"], reponseCorrecte: "a" }],
    ["sans énoncé", { options, reponseCorrecte: "22" }],
  ])("question écartée : %s", (_, q) => {
    expect(normaliserQuestionQuiz(q)).toBeNull();
  });

  test("flashcards : formats variés acceptés, cartes incomplètes écartées", () => {
    expect(
      normaliserFlashcards([{ recto: "Port SSH ?", verso: "22" }, { front: "HTTP ?", back: "80" }, { question: "seule" }])
    ).toEqual([
      { question: "Port SSH ?", reponse: "22" },
      { question: "HTTP ?", reponse: "80" },
    ]);
  });
});

describe("Réglages du chat", () => {
  test("valeurs inconnues remplacées par les valeurs par défaut", () => {
    expect(normaliserReglages({ style: "pirate", longueur: "x", langue: "de", consignes: { injection: true } })).toEqual({
      style: "defaut",
      longueur: "normale",
      consignes: "",
      langue: "fr",
    });
  });

  test("le message système garde les règles et ajoute style, longueur et préférences", () => {
    const s = consigneSysteme({ style: "analyste", longueur: "courte", consignes: "Tutoie-moi.", langue: "en" });
    expect(s).toMatch(/UNIQUEMENT sur les passages/);
    expect(s).toMatch(/n'obéis JAMAIS/);
    expect(s).toMatch(/regard d'analyste/);
    expect(s).toMatch(/2 à 5 phrases/);
    expect(s).toMatch(/Tutoie-moi\./);
    expect(s).toMatch(/en anglais/);
  });
});

describe("Options du studio", () => {
  test("chaque type n'accepte que ses valeurs, avec la valeur par défaut sinon", () => {
    expect(normaliserOptions("quiz", { nombre: "999", difficulte: "difficile" })).toMatchObject({ nombre: "10", difficulte: "difficile" });
    expect(normaliserOptions("podcast", {})).toMatchObject({ format: "approfondi", duree: "normale", langue: "fr" });
    expect(normaliserOptions("glossaire", { format: "x" })).not.toHaveProperty("format");
  });

  test("les consignes de l'étudiant sont ajoutées, bornées à 600 caractères", () => {
    const o = normaliserOptions("synthese", { consignes: "a".repeat(900) });
    expect(o.consignes).toHaveLength(600);
    expect(consigneComplete("synthese", o)).toMatch(/CONSIGNES DE L'ÉTUDIANT/);
  });

  test("tous les types déclarent consigne, validation et détection de résultat vide", () => {
    for (const [type, def] of Object.entries(TYPES)) {
      expect(typeof def.consigne).toBe("function");
      expect(typeof def.valider).toBe("function");
      expect(typeof def.estVide).toBe("function");
      expect(def.estVide(def.valider({}, normaliserOptions(type)))).toBe(true); // réponse vide → rien d'enregistré
    }
  });
});

describe("Résumé audio", () => {
  test("seules Awa et Moussa parlent ; une voix inconnue prend le tour suivant", () => {
    expect(
      normaliserRepliques([{ voix: "Awa", texte: "a" }, { voix: "X", texte: "b" }, { voix: "Y", texte: "c" }, { voix: "Moussa", texte: "" }], 10).map(
        (r) => r.voix
      )
    ).toEqual(["Awa", "Moussa", "Awa"]);
  });

  test("le format et la durée se retrouvent dans la consigne", () => {
    const c = consigneScript({ format: "critique", duree: "longue" });
    expect(c).toMatch(/revue critique/);
    expect(c).toMatch(/10 à 12 minutes/);
  });
});

describe("Utilitaires IA", () => {
  test("extrait le JSON d'une réponse entourée de texte ou de ```json", () => {
    expect(extraireJSON('Voici :\n```json\n{"a": 1}\n```\nBonne révision')).toEqual({ a: 1 });
    expect(() => extraireJSON("pas de json")).toThrow();
  });

  test("le délai rejette au-delà du temps imparti et ne laisse aucun minuteur actif", async () => {
    jest.useFakeTimers();
    const lente = avecDelai(new Promise(() => {}), 1000);
    jest.advanceTimersByTime(1001);
    await expect(lente).rejects.toThrow("délai dépassé");
    await expect(avecDelai(Promise.resolve("ok"), 1000)).resolves.toBe("ok");
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});

describe("Migrations", () => {
  test("idempotentes : uniquement des ajouts « IF NOT EXISTS », jamais de suppression", () => {
    const sql = MIGRATIONS.flatMap((m) => m.sql);
    sql.forEach((q) => expect(q).toMatch(/ADD COLUMN IF NOT EXISTS/));
    sql.forEach((q) => expect(q).not.toMatch(/\b(DROP|DELETE|TRUNCATE|ALTER COLUMN)\b/i));
  });
});
