'use client';
import { Printer } from 'lucide-react';

/** "Print or save as PDF": the phone's or computer's own print sheet (it also saves a PDF). */
export default function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn-primary btn-lg" onClick={() => window.print()}>
      <Printer size={18} strokeWidth={2} aria-hidden /> {label}
    </button>
  );
}
