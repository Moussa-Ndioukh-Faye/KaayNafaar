import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft } from "lucide-react";

/**
 * Politique de confidentialité
 * Références : loi sénégalaise n° 2008-12 sur la protection des données à caractère
 * personnel (Commission de protection des Données Personnelles — CDP) et RGPD (UE 2016/679)
 * pour les utilisateurs situés dans l'Union européenne.
 *
 * ⚠️ À compléter par le responsable du traitement : adresse de contact et
 * numéro de déclaration auprès de la CDP (voir constantes ci-dessous).
 */
const CONTACT = ""; // TODO : adresse email de contact du responsable du traitement
const DECLARATION_CDP = "en cours"; // TODO : numéro de récépissé de la CDP
const MISE_A_JOUR = "21 novembre 2026";

const LienContact = () =>
  CONTACT ? (
    <a className="underline font-bold" href={`mailto:${CONTACT}`}>{CONTACT}</a>
  ) : (
    <span className="font-bold">via la page Profil (adresse de contact à venir)</span>
  );

const Section = ({ titre, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-black text-gray-900 dark:text-white">{titre}</h2>
    <div className="space-y-3 text-gray-700 dark:text-gray-300 leading-relaxed">{children}</div>
  </section>
);

export default function Confidentialite() {
  return (
    <main id="contenu" className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
      <article className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl p-8 md:p-12 space-y-10">
        <header className="space-y-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary-700 dark:text-primary-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Retour à Kaay Nafaar
          </Link>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary-600" aria-hidden="true" />
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">Politique de confidentialité</h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Dernière mise à jour : {MISE_A_JOUR}</p>
        </header>

        <Section titre="1. Responsable du traitement">
          <p>
            Kaay Nafaar est une plateforme de révision développée au Sénégal. Le traitement de tes données
            est soumis à la loi n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère
            personnel, sous le contrôle de la Commission de protection des Données Personnelles (CDP).
            Pour les utilisateurs situés dans l'Union européenne, le Règlement général sur la protection
            des données (RGPD) s'applique également.
          </p>
          <p>
            Contact : <LienContact /> — Déclaration CDP : {DECLARATION_CDP}.
          </p>
        </Section>

        <Section titre="2. Données collectées">
          <ul className="list-disc pl-6 space-y-1">
            <li>Compte : nom, adresse email, niveau d'étude, mot de passe (stocké uniquement sous forme chiffrée par bcrypt).</li>
            <li>Contenu : cours et fichiers que tu importes (PDF, images, texte), fiches, quiz et flashcards générés.</li>
            <li>Progression : résultats de quiz, planning de révision, statistiques d'utilisation de l'application.</li>
            <li>Données techniques : adresse IP et journaux de requêtes, utilisés pour la sécurité (limitation des abus).</li>
          </ul>
          <p>Nous ne collectons aucune donnée sensible et n'utilisons aucun cookie publicitaire ou de pistage.</p>
        </Section>

        <Section titre="3. Finalités et base légale">
          <ul className="list-disc pl-6 space-y-1">
            <li>Fournir le service (compte, génération de fiches et de quiz, suivi de progression) — exécution du service que tu demandes.</li>
            <li>Sécuriser la plateforme (authentification, prévention des abus) — intérêt légitime.</li>
            <li>Traitement de tes cours par l'intelligence artificielle — ton consentement, donné à l'inscription.</li>
          </ul>
        </Section>

        <Section titre="4. Fournisseurs et transferts hors du Sénégal">
          <p>
            Pour générer les fiches, quiz et réponses de l'assistant, des extraits de tes cours sont envoyés à
            des fournisseurs d'intelligence artificielle : Google (Gemini), Groq et, le cas échéant, OpenAI et
            Tavily (recherche web). L'interface est hébergée par Vercel. Ces prestataires peuvent être situés hors
            du Sénégal (notamment aux États-Unis). Nous ne leur transmettons que ce qui est nécessaire au traitement
            demandé et ne vendons jamais tes données.
          </p>
        </Section>

        <Section titre="5. Durée de conservation">
          <p>
            Tes données sont conservées tant que ton compte est actif. Lorsque tu supprimes ton compte, toutes
            tes données (profil, cours, fichiers importés, fiches, quiz, progression et index de recherche IA)
            sont effacées définitivement de nos serveurs.
          </p>
        </Section>

        <Section titre="6. Tes droits">
          <p>Tu disposes des droits suivants, exerçables directement depuis ta page Profil :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Accès et portabilité : bouton « Exporter mes données » (fichier JSON).</li>
            <li>Rectification : modification du nom et de l'email.</li>
            <li>Effacement : bouton « Supprimer le compte ».</li>
            <li>Retrait du consentement : la suppression du compte met fin à tout traitement.</li>
          </ul>
          <p>
            Pour toute autre demande ou opposition, contacte-nous : <LienContact />. Tu peux aussi saisir la CDP
            (www.cdp.sn) ou, dans l'Union européenne, l'autorité de protection des données de ton pays.
          </p>
        </Section>

        <Section titre="7. Sécurité">
          <p>
            Les échanges sont chiffrés (HTTPS), les mots de passe sont hachés, les sessions expirent et sont
            révoquées lors d'un changement de mot de passe, et les fichiers importés ne sont accessibles qu'à
            leur propriétaire.
          </p>
        </Section>

        <Section titre="8. Cookies et stockage local">
          <p>
            Nous utilisons uniquement un cookie de session sécurisé (httpOnly) nécessaire à la connexion, ainsi
            que le stockage local du navigateur pour tes préférences (mode sombre) et l'affichage de ton profil. Aucun consentement n'est requis
            pour ces éléments strictement nécessaires.
          </p>
        </Section>
      </article>
    </main>
  );
}
