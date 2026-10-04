// The named complaints (grievance) officer the IT Rules ask for. The owner sets these on Vercel:
// NEXT_PUBLIC_GRIEVANCE_NAME (a person's name) and NEXT_PUBLIC_GRIEVANCE_EMAIL.
export function grievanceContact() {
  return { name: process.env.NEXT_PUBLIC_GRIEVANCE_NAME?.trim() ?? '', email: process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL?.trim() ?? '' };
}

/** When the rules last changed (shown on /terms). Change it whenever the Terms text changes. */
export const RULES_UPDATED = '2026-10-04';
