/**
 * Whether to open the phone's share menu for a link. Phones and tablets only: on a computer (a Mac's Chrome or Safari
 * has a share menu too) its "Copy" puts the whole message on the clipboard, link and words together, so a pasted
 * "link" opened "Poll not found" (owner, Oct 2026). Computers copy the bare link instead.
 */
export function shareMenu(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false;
  return !!window.matchMedia?.('(pointer: coarse)').matches;
}
