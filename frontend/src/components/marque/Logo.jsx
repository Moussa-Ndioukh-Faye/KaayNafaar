import { cn } from "../../lib/utils";

/**
 * Logo Kaay Nafaar : un losange (motif bogolan) qui s'ouvre comme un livre.
 * `ton` = "clair" sur fond sombre, "sombre" sur fond clair.
 */
export function LogoMarque({ className, ton = "sombre" }) {
  const encre = ton === "clair" ? "#fbf7ef" : "currentColor";
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("w-10 h-10", ton === "sombre" && "text-primary-700 dark:text-primary-400", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 3 L37 20 L20 37 L3 20 Z" fill={encre} />
      <path d="M20 11 L20 29 M20 13 C16 11 12 12 10 14 L10 27 C12 25 16 25 20 27 C24 25 28 25 30 27 L30 14 C28 12 24 11 20 13"
        fill="none" stroke={ton === "clair" ? "#0c4f3c" : "#fbf7ef"} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="20" cy="7.5" r="1.6" fill="#e08a3c" />
    </svg>
  );
}

export default function Logo({ className, ton = "sombre", sousTitre = true }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMarque ton={ton} />
      <span className="leading-none">
        <span
          className={cn(
            "block font-display text-[1.35rem] font-semibold tracking-tight",
            ton === "clair" ? "text-[#fbf7ef]" : "text-gray-900 dark:text-white"
          )}
        >
          Kaay Nafaar
        </span>
        {sousTitre && (
          <span
            className={cn(
              "block mt-1 text-[10px] font-bold uppercase tracking-[0.22em]",
              ton === "clair" ? "text-secondary-200" : "text-secondary-700 dark:text-secondary-300"
            )}
          >
            Réviser malin
          </span>
        )}
      </span>
    </span>
  );
}
