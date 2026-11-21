import { useNavigate } from "react-router-dom";
import { FileQuestion, Home, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "../components/ui/button";

export default function Page404() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="relative mx-auto w-40 h-40 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/20 rounded-full animate-pulse" />
          <div className="absolute inset-4 bg-white dark:bg-gray-900 rounded-full shadow-xl shadow-primary-200/50 dark:shadow-primary-950/30 flex items-center justify-center">
            <FileQuestion className="w-16 h-16 text-primary-500 dark:text-primary-400" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl rotate-12 flex items-center justify-center shadow-lg">
            <BookOpen className="w-6 h-6 text-amber-500 dark:text-amber-400" />
          </div>
        </div>

        <h1 className="text-8xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-2">
          4<span className="text-primary-500">0</span>4
        </h1>
        <p className="text-lg font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-6">
          Page introuvable
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-sm mx-auto mb-10">
          On dirait que cette page s'est évaporée comme un cours à la veille des examens...
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl gap-2 h-12 px-6 border-gray-200 dark:border-gray-700"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <Button
            className="rounded-xl gap-2 h-12 px-6 bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200/50 dark:shadow-primary-950/30"
            onClick={() => navigate("/")}
          >
            <Home className="w-4 h-4" />
            Accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
