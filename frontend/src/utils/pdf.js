import { jsPDF } from "jspdf";

export const exporterFichePDF = (fiche) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(fiche.titre || "Fiche de révision", pageWidth / 2, y, { align: "center" });
  y += 15;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");

  if (fiche.resume) {
    doc.setFont("helvetica", "bold");
    doc.text("Résumé", 15, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    const lignes = doc.splitTextToSize(fiche.resume, pageWidth - 30);
    doc.text(lignes, 15, y);
    y += lignes.length * 6 + 10;
  }

  if (fiche.conceptsCles?.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Concepts clés", 15, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    fiche.conceptsCles.forEach((concept, i) => {
      const lignes = doc.splitTextToSize(`${i + 1}. ${concept}`, pageWidth - 30);
      doc.text(lignes, 15, y);
      y += lignes.length * 6 + 3;
    });
    y += 10;
  }

  if (fiche.flashcards?.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Flashcards", 15, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    fiche.flashcards.forEach((fc, i) => {
      doc.setFont("helvetica", "bold");
      doc.text(`Q: ${fc.question}`, 15, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(`R: ${fc.reponse}`, 15, y);
      y += 10;
    });
  }

  const nomFichier = `fiche_${fiche.titre?.replace(/\s+/g, "_") || "revision"}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(nomFichier);
};

export const exporterQuizPDF = (quiz) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(quiz.titre || "Quiz de révision", pageWidth / 2, y, { align: "center" });
  y += 15;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");

  if (quiz.questions?.length > 0) {
    quiz.questions.forEach((q, i) => {
      const lignes = doc.splitTextToSize(`${i + 1}. ${q.question}`, pageWidth - 30);
      doc.text(lignes, 15, y);
      y += lignes.length * 6 + 4;

      q.options?.forEach((opt, j) => {
        doc.text(`   ${String.fromCharCode(65 + j)}) ${opt}`, 15, y);
        y += 5;
      });
      y += 5;
    });
  }

  const nomFichier = `quiz_${quiz.titre?.replace(/\s+/g, "_") || "revision"}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(nomFichier);
};