import { useState } from "react";
import { 
  User, 
  Settings, 
  Mail, 
  Lock, 
  ShieldAlert, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  Download,
} from "lucide-react";
import { useAuth } from "../App";
import { Link } from "react-router-dom";
import { authAPI } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

export default function Profil() {
  const { utilisateur, connecter, deconnecter } = useAuth();
  const [form, setForm] = useState({
    nom: utilisateur?.nom || "",
    email: utilisateur?.email || "",
  });
  const [motDePasse, setMotDePasse] = useState({
    actuel: "",
    nouveau: "",
    confirmation: "",
  });
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState({ type: "", texte: "" });
  const [voirMDP, setVoirMDP] = useState(false);

  const mettreAJourProfil = async (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.email.trim()) {
      setMessage({ type: "error", texte: "Nom et email requis." });
      return;
    }
    setEnvoi(true);
    setMessage({ type: "", texte: "" });
    try {
      const { data } = await authAPI.updateProfil({ nom: form.nom.trim(), email: form.email.trim() });
      if (data.success) {
        connecter(data.utilisateur);
        setMessage({ type: "success", texte: "Profil mis à jour avec succès !" });
      }
    } catch (_) {
      setMessage({ type: "error", texte: "Erreur lors de la mise à jour." });
    } finally {
      setEnvoi(false);
    }
  };

  const changerMotDePasse = async (e) => {
    e.preventDefault();
    if (motDePasse.nouveau !== motDePasse.confirmation) {
      setMessage({ type: "error", texte: "Les mots de passe ne correspondent pas." });
      return;
    }
    if (motDePasse.nouveau.length < 8) {
      setMessage({ type: "error", texte: "Le mot de passe doit contenir au moins 8 caractères." });
      return;
    }
    setEnvoi(true);
    setMessage({ type: "", texte: "" });
    try {
      const { data } = await authAPI.changerMotDePasse({
        motDePasseActuel: motDePasse.actuel,
        nouveauMotDePasse: motDePasse.nouveau,
      });
      if (data.success) {
        // Les autres sessions sont révoquées ; le serveur a renouvelé le cookie de cette session
        setMotDePasse({ actuel: "", nouveau: "", confirmation: "" });
        setMessage({ type: "success", texte: "Ton mot de passe a été modifié." });
      }
    } catch (err) {
      const erreurs = err.response?.data?.errors;
      setMessage({
        type: "error",
        texte: erreurs?.[0]?.msg || err.response?.data?.message || "Mot de passe actuel incorrect.",
      });
    } finally {
      setEnvoi(false);
    }
  };

  const [exportEnCours, setExportEnCours] = useState(false);

  const exporterDonnees = async () => {
    setExportEnCours(true);
    try {
      const { data } = await authAPI.exporterDonnees();
      const url = URL.createObjectURL(data);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `kaay-nafaar-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", texte: "Tes données ont été téléchargées." });
    } catch (_) {
      setMessage({ type: "error", texte: "Impossible d'exporter tes données pour le moment." });
    } finally {
      setExportEnCours(false);
    }
  };

  const supprimerCompte = async () => {
    const mdp = window.prompt("Pour confirmer la suppression, entre ton mot de passe actuel :");
    if (!mdp) return;
    if (!window.confirm("Attention : cette action supprimera définitivement ton compte, tes cours, fichiers importés, fiches, quiz et ta progression. Continuer ?")) return;
    try {
      await authAPI.supprimerCompte({ motDePasse: mdp });
      deconnecter();
      window.location.href = "/";
    } catch (err) {
      setMessage({ type: "error", texte: err.response?.data?.message || "Erreur lors de la suppression." });
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-20">
      {/* Header Profile */}
      <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-card rounded-xl border border-border">
         <div className="w-24 h-24 rounded-xl surface-marque flex items-center justify-center shadow-lg">
            <User className="w-12 h-12" />
         </div>
         <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{utilisateur?.nom}</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center md:justify-start gap-2 mt-1">
               <Mail className="w-4 h-4" />
               {utilisateur?.email}
            </p>
         </div>
         <Button variant="outline" onClick={deconnecter} className="rounded-xl font-bold border-2 text-red-700 border-red-50 hover:bg-red-50 dark:border-red-900/20 dark:hover:bg-red-900/30">
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
         </Button>
      </div>

      {message.texte && (
        <div role={message.type === "error" ? "alert" : "status"} className={cn(
          "px-6 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-fade-in border-2",
          message.type === "success" 
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" 
            : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/30"
        )}>
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.texte}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Informations personnelles */}
         <Card className="rounded-xl shadow-lg border-none overflow-hidden h-full flex flex-col bg-white dark:bg-gray-800">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-800/50 p-6 border-b border-gray-100 dark:border-gray-700">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-primary-600">
                     <Settings className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-lg">Paramètres du profil</CardTitle>
               </div>
            </CardHeader>
            <form onSubmit={mettreAJourProfil} className="flex-1 flex flex-col">
               <CardContent className="p-6 space-y-4 flex-1">
                  <div className="space-y-2">
                    <label htmlFor="profil-champ-143" className="text-xs font-bold uppercase tracking-[0.08em] text-gray-600 dark:text-gray-300 ml-1">Nom complet</label>
                    <div className="relative">
                       <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                       <input id="profil-champ-143"
                         type="text"
                         className="input-field pl-10 pr-4"
                         value={form.nom}
                         onChange={(e) => setForm({ ...form, nom: e.target.value })}
                         required
                       />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="profil-champ-156" className="text-xs font-bold uppercase tracking-[0.08em] text-gray-600 dark:text-gray-300 ml-1">Adresse email</label>
                    <div className="relative">
                       <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                       <input id="profil-champ-156"
                         type="email"
                         className="input-field pl-10 pr-4"
                         value={form.email}
                         onChange={(e) => setForm({ ...form, email: e.target.value })}
                         required
                       />
                    </div>
                  </div>
               </CardContent>
               <CardFooter className="p-6 pt-0">
                  <Button type="submit" disabled={envoi} className="w-full rounded-xl font-bold h-11">
                    {envoi ? "Mise à jour..." : "Enregistrer les modifications"}
                  </Button>
               </CardFooter>
            </form>
         </Card>

         {/* Mot de passe */}
         <Card className="rounded-xl shadow-lg border-none overflow-hidden h-full flex flex-col bg-white dark:bg-gray-800">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-800/50 p-6 border-b border-gray-100 dark:border-gray-700">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-orange-700">
                     <Lock className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-lg">Sécurité</CardTitle>
               </div>
            </CardHeader>
            <form onSubmit={changerMotDePasse} className="flex-1 flex flex-col">
               <CardContent className="p-6 space-y-4 flex-1">
                  <div className="space-y-2">
                    <label htmlFor="profil-champ-190" className="text-xs font-bold uppercase tracking-[0.08em] text-gray-600 dark:text-gray-300 ml-1">Mot de passe actuel</label>
                    <input id="profil-champ-190"
                      type={voirMDP ? "text" : "password"}
                      className="input-field"
                      value={motDePasse.actuel}
                      onChange={(e) => setMotDePasse({ ...motDePasse, actuel: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="profil-champ-200" className="text-xs font-bold uppercase tracking-[0.08em] text-gray-600 dark:text-gray-300 ml-1">Nouveau mot de passe</label>
                    <div className="relative">
                       <input id="profil-champ-200"
                         type={voirMDP ? "text" : "password"}
                         className="input-field"
                         value={motDePasse.nouveau}
                         onChange={(e) => setMotDePasse({ ...motDePasse, nouveau: e.target.value })}
                         required
                         minLength={8}
                       />
                       <button 
                         type="button" 
                         onClick={() => setVoirMDP(!voirMDP)}
                         aria-label={voirMDP ? "Masquer les mots de passe" : "Afficher les mots de passe"}
                         aria-pressed={voirMDP}
                         className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-md text-muted-foreground hover:text-primary"
                       >
                          {voirMDP ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                       </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="profil-champ-220" className="text-xs font-bold uppercase tracking-[0.08em] text-gray-600 dark:text-gray-300 ml-1">Confirmation</label>
                    <input id="profil-champ-220"
                      type={voirMDP ? "text" : "password"}
                      className="input-field"
                      value={motDePasse.confirmation}
                      onChange={(e) => setMotDePasse({ ...motDePasse, confirmation: e.target.value })}
                      required
                    />
                  </div>
               </CardContent>
               <CardFooter className="p-6 pt-0">
                  <Button type="submit" disabled={envoi} variant="secondary" className="w-full rounded-xl font-bold h-11">
                    {envoi ? "Changement..." : "Mettre à jour le secret"}
                  </Button>
               </CardFooter>
            </form>
         </Card>
      </div>

      {/* Mes données (RGPD / loi sénégalaise 2008-12) */}
      <Card className="rounded-xl shadow-lg border-none bg-white dark:bg-gray-800">
         <CardContent className="p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
               <h3 className="text-xl font-bold text-gray-900 dark:text-white">Mes données personnelles</h3>
               <p className="text-gray-600 dark:text-gray-300 mt-2 font-medium">
                  Télécharge une copie de toutes tes données (profil, cours, fiches, quiz, progression) au format JSON.
                  Consulte notre <Link to="/confidentialite" className="underline text-primary-700 dark:text-primary-400 font-bold">politique de confidentialité</Link>.
               </p>
            </div>
            <Button onClick={exporterDonnees} disabled={exportEnCours} variant="outline" className="rounded-2xl h-12 px-6 font-bold">
               <Download className="w-5 h-5 mr-2" aria-hidden="true" />
               {exportEnCours ? "Préparation..." : "Exporter mes données"}
            </Button>
         </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="rounded-xl border-2 border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10 overflow-hidden">
         <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="w-20 h-20 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 text-red-600">
               <ShieldAlert className="w-10 h-10" />
            </div>
            <div className="flex-1 text-center md:text-left">
               <h3 className="text-2xl font-bold text-red-900 dark:text-red-400">Zone de danger</h3>
               <p className="text-red-700 dark:text-red-500/70 mt-2 font-medium">
                  La suppression de ton compte est irréversible. Toutes tes fiches, quiz et ta progression seront supprimés de nos serveurs sans possibilité de récupération.
               </p>
            </div>
            <Button 
               onClick={supprimerCompte} 
               className="rounded-2xl h-14 px-8 font-bold bg-red-600 hover:bg-red-700 shadow-md transition-transform active:scale-95"
            >
               <Trash2 className="w-5 h-5 mr-2" />
               Supprimer le compte
            </Button>
         </CardContent>
      </Card>

      {/* Version Info */}
      <div className="text-center pt-10">
         <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
             Kaay Nafaar — Version 2.0.0
         </p>
      </div>
    </div>
  );
}