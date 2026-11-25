import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Square, Loader2, BookmarkPlus, SlidersHorizontal, Eraser, CornerDownRight } from "lucide-react";
import { carnetsAPI } from "../../services/api";
import { Button } from "../ui/button";
import { formatMessage } from "../assistant/formatMessage";
import { STYLES_CHAT } from "./catalogue";

/**
 * Chat du carnet : réponses citées (passages cliquables), historique conservé,
 * questions de relance. `demande` ({ texte, cle }) permet de poser une question
 * depuis le guide ou la carte mentale.
 */
export default function PanneauChat({ carnet, actives, demande, onPassage, onNote, onErreur, ouvrirReglages, entete }) {
  const [messages, setMessages] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [question, setQuestion] = useState("");
  const [enCours, setEnCours] = useState(false);
  const controleur = useRef(null);
  const fin = useRef(null);
  const derniereDemande = useRef(null);

  useEffect(() => {
    let actif = true;
    carnetsAPI
      .messages(carnet.id)
      .then(({ data }) => actif && setMessages(data.messages.map((m) => ({ role: m.role, content: m.contenu, passages: m.passages || [], suivi: m.suivi || [] }))))
      .catch(() => {})
      .finally(() => actif && setChargement(false));
    return () => {
      actif = false;
      controleur.current?.abort?.();
    };
  }, [carnet.id]);

  useEffect(() => {
    fin.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages]);

  const envoyer = useCallback(
    (texteDemande) => {
      const texte = (texteDemande ?? question).trim();
      if (!texte || enCours) return;
      if (!actives.length) return onErreur("Coche au moins une source pour poser une question.");
      onErreur("");
      setQuestion("");
      setMessages((l) => [...l, { role: "user", content: texte }, { role: "assistant", content: "", passages: [], suivi: [] }]);
      setEnCours(true);

      const maj = (changement) =>
        setMessages((l) => {
          const copie = [...l];
          copie[copie.length - 1] = { ...copie[copie.length - 1], ...changement(copie[copie.length - 1]) };
          return copie;
        });

      controleur.current = carnetsAPI.chatStream(
        carnet.id,
        { question: texte, coursIds: actives },
        {
          onPassages: (passages) => maj(() => ({ passages })),
          onDelta: (delta) => maj((m) => ({ content: m.content + delta })),
          onSuivi: (suivi) => maj(() => ({ suivi })),
          onDone: () => setEnCours(false),
          onError: (msg) => {
            setEnCours(false);
            onErreur(msg || "Erreur pendant la réponse.");
          },
        }
      );
    },
    [question, enCours, actives, carnet.id, onErreur]
  );

  // Question venue du guide ou de la carte mentale
  useEffect(() => {
    if (demande && demande.cle !== derniereDemande.current) {
      derniereDemande.current = demande.cle;
      envoyer(demande.texte);
    }
  }, [demande, envoyer]);

  const arreter = () => {
    controleur.current?.abort?.();
    setEnCours(false);
  };

  const effacer = async () => {
    try {
      await carnetsAPI.effacerMessages(carnet.id);
      setMessages([]);
    } catch {
      onErreur("Impossible d'effacer la conversation.");
    }
  };

  const style = STYLES_CHAT.find((s) => s.id === carnet.reglages?.style) || STYLES_CHAT[0];

  return (
    <section aria-labelledby="titre-chat" className="flex flex-col min-h-[30rem] lg:h-[calc(100dvh-13rem)]">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 id="titre-chat" className="text-xl">
          Questions
        </h3>
        <div className="flex items-center gap-1">
          {/* Nom accessible = texte visible précédé du contexte (WCAG 2.5.3) */}
          <Button variant="ghost" size="sm" onClick={ouvrirReglages}>
            <SlidersHorizontal aria-hidden="true" />
            <span className="sr-only">Réglages des réponses : </span>
            <span className="sr-only sm:not-sr-only">{style.nom}</span>
          </Button>
          {messages.length > 0 && !enCours && (
            <Button variant="ghost" size="icon" onClick={effacer} aria-label="Effacer la conversation">
              <Eraser aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 pr-1" role="log" aria-live="polite" aria-label="Conversation avec le carnet">
        {entete}
        {chargement && (
          <p role="status" className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Chargement de la conversation…
          </p>
        )}
        {!chargement && messages.length === 0 && (
          <p className="text-muted-foreground px-1">
            Chaque réponse s'appuie uniquement sur les sources cochées et cite ses passages : touche un numéro pour lire l'extrait.
          </p>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] w-fit bg-primary text-primary-foreground rounded-[20px] rounded-br-md px-4 py-2.5 break-words">
              <span className="sr-only">Toi : </span>
              {m.content}
            </div>
          ) : (
            <div key={i} className="max-w-[95%] bg-card rounded-[20px] rounded-bl-md shadow-sm px-5 py-4">
              <span className="sr-only">Carnet : </span>
              {m.content ? (
                formatMessage(m.content, { passages: m.passages, surCitation: onPassage })
              ) : (
                <p role="status" className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Lecture des sources…
                </p>
              )}
              {m.content && !(enCours && i === messages.length - 1) && (
                <>
                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
                    {m.passages?.length > 0 && (
                      <span className="text-xs text-muted-foreground mr-auto">
                        {m.passages.length} passage{m.passages.length > 1 ? "s" : ""} · {new Set(m.passages.map((p) => p.titre)).size} source
                        {new Set(m.passages.map((p) => p.titre)).size > 1 ? "s" : ""}
                      </span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => onNote(m)}>
                      <BookmarkPlus aria-hidden="true" />
                      Garder en note
                    </Button>
                  </div>
                  {i === messages.length - 1 && m.suivi?.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1.5" aria-label="Questions pour continuer">
                      {m.suivi.map((s) => (
                        <li key={s}>
                          <button
                            type="button"
                            onClick={() => envoyer(s)}
                            className="inline-flex items-start gap-2 rounded-xl bg-secondary px-3 py-2 text-left text-sm text-secondary-foreground hover:brightness-95"
                          >
                            <CornerDownRight className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )
        )}
        <div ref={fin} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          envoyer();
        }}
        className="mt-4 flex items-end gap-2 rounded-[26px] bg-card shadow-lg p-1.5"
      >
        <label htmlFor="question-carnet" className="sr-only">
          Ta question
        </label>
        <textarea
          id="question-carnet"
          rows={1}
          maxLength={4000}
          className="flex-1 resize-none bg-transparent px-4 py-2.5 outline-none max-h-40 text-foreground placeholder:text-muted-foreground"
          placeholder={carnet.coursIds?.length ? "Pose une question sur tes sources…" : "Ajoute d'abord une source"}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              envoyer();
            }
          }}
        />
        {enCours ? (
          <Button type="button" variant="destructive" size="icon" className="rounded-full" aria-label="Arrêter la réponse" onClick={arreter}>
            <Square aria-hidden="true" />
          </Button>
        ) : (
          <Button type="submit" size="icon" className="rounded-full" aria-label="Envoyer la question" disabled={!question.trim()}>
            <Send aria-hidden="true" />
          </Button>
        )}
      </form>
    </section>
  );
}
