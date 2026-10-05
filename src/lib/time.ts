// The site runs on India time: days, "today's question", month cards and end times are all counted in IST.
export const INDIA_TZ = 'Asia/Kolkata';
export const INDIA_OFFSET = '+05:30';

/** The locale for dates and numbers: Hindi dates for Hindi, Indian English for English and Hinglish. */
export const dateLocale = (lang: string) => (lang === 'hi' ? 'hi-IN' : 'en-IN');
