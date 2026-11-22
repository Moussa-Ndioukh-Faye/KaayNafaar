/**
 * Transforme un élément produit par l'IA en texte affichable.
 * L'IA renvoie normalement des chaînes, mais peut parfois renvoyer un objet
 * (ex. { terme, definition }) : sans cette conversion, React plante et la page devient blanche.
 */
export const enTexte = (valeur) => {
  if (valeur == null) return "";
  if (typeof valeur === "string" || typeof valeur === "number") return String(valeur);
  if (typeof valeur === "object") {
    const principal = valeur.terme ?? valeur.nom ?? valeur.titre ?? valeur.concept ?? valeur.point ?? valeur.texte;
    if (principal != null) {
      const detail = valeur.definition ?? valeur.description ?? valeur.explication;
      return detail ? `${principal} : ${detail}` : String(principal);
    }
    return Object.values(valeur).filter((v) => typeof v === "string").join(" — ");
  }
  return String(valeur);
};
