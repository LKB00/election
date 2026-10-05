// The size limits, in one place: the server checks them, the phone's text boxes stop at them, and the error messages
// (and their Hindi and Hinglish versions in i18n.ts) quote them.

/** Longest photo (as a data URL) a choice can carry: a small JPEG of about 110 KB. Shared by the phone and the server. */
export const MAX_PHOTO_CHARS = 150_000;
export const MIN_TITLE = 3;
export const MAX_TITLE = 120;
export const MAX_DETAILS = 300;
export const MAX_CHOICE = 60;
export const MIN_CHOICES = 2;
export const MAX_CHOICES = 10;
/** Suggested choices waiting for the maker, per poll. */
export const MAX_WAITING_SUGGESTIONS = 30;
export const MIN_NAME = 2;
export const MAX_NAME = 30;
export const MAX_GROUP = 200;

/** Server messages that quote a limit (also the keys of their translations in i18n.ts). */
export const ERR = {
  titleShort: `Your question needs at least ${MIN_TITLE} letters.`,
  titleLong: `Your question is too long (${MAX_TITLE} letters max).`,
  choiceLong: `A choice is too long (${MAX_CHOICE} letters max).`,
  fewChoices: `Add at least ${MIN_CHOICES} choices.`,
  manyChoices: `You can have up to ${MAX_CHOICES} choices. Remove one to continue.`,
} as const;
