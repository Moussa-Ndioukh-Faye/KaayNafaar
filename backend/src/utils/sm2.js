const EF_MIN = 1.3;
const EF_MAX = 3.0;

const calculerSM2 = (grade, flashcard = {}) => {
  const q = Math.max(0, Math.min(5, Math.round(grade)));

  const ef = flashcard.easinessFactor || 2.5;
  let rep = flashcard.repetitions || 0;
  let interval = flashcard.interval || 0;

  if (q >= 3) {
    if (rep === 0) interval = 1;
    else if (rep === 1) interval = 6;
    else interval = Math.round(interval * ef);
    rep += 1;
  } else {
    rep = 0;
    interval = 1;
  }

  let nouvelEF = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  nouvelEF = Math.max(EF_MIN, Math.min(EF_MAX, nouvelEF));

  const prochaineRevision = new Date(Date.now() + interval * 86400000);

  return {
    easinessFactor: Math.round(nouvelEF * 100) / 100,
    interval,
    repetitions: rep,
    nextReview: prochaineRevision.toISOString(),
    lastReviewed: new Date().toISOString(),
    niveauMaitrise: q,
  };
};

const normaliserFlashcard = (fc, index) => {
  if (fc.nextReview && fc.easinessFactor) return fc;
  return {
    question: fc.question,
    reponse: fc.reponse,
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: new Date(0).toISOString(),
    lastReviewed: null,
    niveauMaitrise: 0,
    index,
  };
};

module.exports = { calculerSM2, normaliserFlashcard };
