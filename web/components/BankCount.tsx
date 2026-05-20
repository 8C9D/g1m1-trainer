"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { BANK_LABEL, getBankQuestions } from "@/lib/questions";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function BankCount({ bankKey, bankId }: { bankKey: string; bankId: string }) {
  const count = useSyncExternalStore(
    subscribe,
    () => getBankQuestions(bankKey).length,
    () => 0,
  );

  if (count === 0) return null;

  return (
    <Link
      href={`/test/${bankId}`}
      className="flex items-center justify-between px-4 py-4 border border-red-200 rounded-lg hover:border-red-400 transition-colors bg-white mt-2"
    >
      <span className="font-medium text-sm text-red-600">{BANK_LABEL}</span>
      <span className="text-sm text-red-300">{count} questions →</span>
    </Link>
  );
}
