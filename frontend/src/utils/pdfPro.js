/**
 * Moteur d'export PDF Professionnel — Kaay Nafaar
 * Utilise jsPDF et des techniques de mise en page avancées
 */

import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const exporterFichePro = (fiche) => {
  const doc = jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    putOnlyUsedFonts: true,
  });

  const primaryColor = [67, 56, 202]; // Indigo 500
  const secondaryColor = [139, 92, 246]; // Violet 500
  const textColor = [31, 41, 55]; // Slate 800
  const lightGray = [241, 245, 249]; // Slate 100

  // 1. En-tête stylisé
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Kaay Nafaar", 15, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Fiche de révision intelligente", 15, 28);

  doc.setFontSize(8);
  doc.text(`Date d'export : ${new Date().toLocaleDateString()}`, 170, 15);

  // 2. Titre de la fiche
  let y = 55;
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  const splitTitle = doc.splitTextToSize(fiche.titre, 180);
  doc.text(splitTitle, 15, y);
  y += (splitTitle.length * 10);

  // 3. Métadonnées (Cours, Matière)
  doc.setDrawColor(...lightGray);
  doc.line(15, y, 195, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Matière :", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(fiche.matiere || "Non spécifiée", 35, y);

  if (fiche.cours) {
    doc.setFont("helvetica", "bold");
    doc.text("Cours :", 100, y);
    doc.setFont("helvetica", "normal");
    doc.text(fiche.cours.titre, 115, y);
  }
  y += 15;

  // 4. Résumé
  if (fiche.contenu?.resume) {
    doc.setFillColor(...lightGray);
    doc.roundedRect(15, y, 180, 25, 3, 3, "F");
    
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("RÉSUMÉ SYNTHÉTIQUE", 20, y + 8);
    
    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    const splitResume = doc.splitTextToSize(fiche.contenu.resume, 170);
    doc.text(splitResume, 20, y + 16);
    y += (splitResume.length * 5) + 15;
  }

  // 5. Concepts Clés
  if (fiche.contenu?.conceptsCles?.length > 0) {
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("CONCEPTS FONDAMENTAUX", 15, y);
    y += 8;

    doc.autoTable({
      startY: y,
      head: [['Concept', 'Définition / Explication']],
      body: Object.entries(fiche.contenu.explications || {}).map(([k, v]) => [k, v]),
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      margin: { left: 15, right: 15 },
      styles: { fontSize: 9 }
    });
    y = doc.lastAutoTable.finalY + 15;
  }

  // 6. Points Importants
  if (fiche.contenu?.pointsImportants?.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("POINTS À RETENIR", 15, y);
    y += 8;

    fiche.contenu.pointsImportants.forEach((point, i) => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.setTextColor(...secondaryColor);
      doc.text("•", 15, y);
      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");
      const splitPoint = doc.splitTextToSize(point, 175);
      doc.text(splitPoint, 22, y);
      y += (splitPoint.length * 5) + 2;
    });
    y += 10;
  }

  // 7. Flashcards
  if (fiche.flashcards?.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("FLASHCARDS (RÉVISION)", 15, y);
    y += 8;

    doc.autoTable({
      startY: y,
      head: [['Question', 'Réponse']],
      body: fiche.flashcards.map(f => [f.question, f.reponse]),
      theme: 'grid',
      headStyles: { fillColor: secondaryColor },
      margin: { left: 15, right: 15 },
      styles: { fontSize: 8, cellPadding: 4 }
    });
  }

  // Pied de page sur toutes les pages
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} sur ${pageCount} — Généré par Kaay Nafaar`, 105, 290, { align: "center" });
  }

  doc.save(`fiche-${fiche.titre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
};
