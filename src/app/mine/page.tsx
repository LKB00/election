import { redirect } from 'next/navigation';

// My polls moved into You (profiles): your polls, and the ones made on this phone, live there now.
export default function MinePage() {
  redirect('/you');
}
