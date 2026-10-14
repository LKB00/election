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
/** The optional name drawn on the "I voted" picture ("Lokesh voted"); kept on the phone, never stored with a vote. */
export const MAX_CARD_NAME = 20;
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

/** "Other (write your own)": the longest name a voter can write, how many people must write the same name before it
 * shows in the results (one person's odd entry never does), and how many names show. */
export const MAX_OTHER = 40;
/** Home says "N people have voted here" once at least this many have (a tiny number would put people off). */
export const VOTERS_SHOW_MIN = 25;
/** A poll's link preview says "N people have voted" from this many (a crowd makes people tap; two would not). */
export const OG_VOTERS_MIN = 10;
/** Home shows "N views" from this many page views (owner, Oct 2026: "show it from 1", then "show views"). */
export const VIEWS_SHOW_MIN = 1;
export const OTHER_MIN_PEOPLE = 2;
export const OTHER_TOP = 3;

/** Server messages that quote a limit (also the keys of their translations in i18n.ts). */
export const ERR = {
  titleShort: `Your question needs at least ${MIN_TITLE} letters.`,
  titleLong: `Your question is too long (${MAX_TITLE} letters max).`,
  choiceLong: `A choice is too long (${MAX_CHOICE} letters max).`,
  fewChoices: `Add at least ${MIN_CHOICES} choices.`,
  manyChoices: `You can have up to ${MAX_CHOICES} choices. Remove one to continue.`,
  otherBad: `Write your choice (${MAX_OTHER} letters max, no abusive words).`,
} as const;

/** "Show results" at a set time: the choices on Create (minutes from now; 'ninepm' is tonight's 9 pm final count). */
export const REVEAL_IN = ['now', 'm30', 'h1', 'ninepm'] as const;
export const REVEAL_MINUTES: Record<string, number> = { m30: 30, h1: 60 };

/** Join codes (/join, the big screen and the poster): digits only, so a phone shows its number keypad. */
export const JOIN_CODE_DIGITS = 6;

/** "Ask again every week": how many past weeks the maker's trend shows. */
export const WEEKLY_TREND_WEEKS = 8;

/** "Ideas first": how long people add ideas before voting opens (the maker can start voting sooner), and how many
 * ideas one person may add to one poll. */
export const IDEAS_HOURS = 24;
export const IDEAS_PER_PERSON = 3;

/** Knockout battles: how many entrants (a full bracket), and how long each round runs. */
export const BATTLE_SIZES = [4, 8] as const;
export const BATTLE_ROUND_HOURS = [1, 24, 72] as const;
/** Long lists show this many first, then "Show N more" adds this many again (Miller's and Hick's laws: a few at a time). */
export const LIST_FIRST = 6;
/** A tie's decider poll (two or more tied choices, the same question) runs this long. */
export const RUNOFF_HOURS = 24;
/** "Post later": a poll can be set to open at most this many days ahead. */
export const START_MAX_DAYS = 14;
/** "It's quiet" on the maker's page: an open poll with fewer than QUIET_MAX_VOTES votes and none in the last QUIET_HOURS
 *  (and at least that old) gets the WhatsApp Status picture as its next step. */
export const QUIET_HOURS = 6;
export const QUIET_MAX_VOTES = 10;
/** "Say why in one line": how long a line may be, how many lines a poll loads (shown LIST_FIRST-style, 3 first), and
 *  how many reports hide one. */
export const TAKE_MAX = 80;
export const TAKES_LOAD = 12;
export const TAKES_FIRST = 3;
export const TAKE_REPORTS_HIDE = 2;
/** Poll night: how many questions one night holds. */
export const ROOM_MAX = 8;
/** Circles: a circle's name length, how many members it holds, and how many circles one person may make. */
export const CIRCLE_NAME_MAX = 40;
export const CIRCLE_MAX_MEMBERS = 50;
export const CIRCLES_PER_PERSON = 10;
