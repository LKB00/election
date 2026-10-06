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
/** A group poll with no end time ends after this many days (one missing friend must not keep it open for ever). */
export const GROUP_DEFAULT_DAYS = 3;
/** A poll its maker deleted is kept (hidden) this long, as the Rules page promises, then erased with its votes. */
export const DELETED_KEEP_DAYS = 180;

/** Lists of polls refresh their vote counts this often while the page is open, at most this many times, for at most
 * this many polls (docs/DESIGN.md, "Motion round"): the site feels alive without a steady load on the free plan. */
export const LIVE_COUNTS_MS = 45_000;
export const LIVE_COUNTS_TIMES = 10;
export const LIVE_COUNTS_MAX = 24;

/** Server messages that quote a limit (also the keys of their translations in i18n.ts). */
export const ERR = {
  titleShort: `Your question needs at least ${MIN_TITLE} letters.`,
  titleLong: `Your question is too long (${MAX_TITLE} letters max).`,
  choiceLong: `A choice is too long (${MAX_CHOICE} letters max).`,
  fewChoices: `Add at least ${MIN_CHOICES} choices.`,
  manyChoices: `You can have up to ${MAX_CHOICES} choices. Remove one to continue.`,
} as const;
