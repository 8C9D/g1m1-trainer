"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTests, getG1Tests, getBankQuestions, M1_BANK_KEY, G1_BANK_KEY, type Test } from "@/lib/questions";

export default function Home() {
  const [m1Tests, setM1Tests] = useState<Test[]>([]);
  const [g1Tests, setG1Tests] = useState<Test[]>([]);
  const [m1BankCount, setM1BankCount] = useState(0);
  const [g1BankCount, setG1BankCount] = useState(0);

  useEffect(() => {
    getTests().then(setM1Tests);
    getG1Tests().then(setG1Tests);
    setM1BankCount(getBankQuestions(M1_BANK_KEY).length);
    setG1BankCount(getBankQuestions(G1_BANK_KEY).length);
  }, []);

  const m1Total = m1Tests.reduce((sum, t) => sum + t.questions.length, 0);
  const g1Total = g1Tests.reduce((sum, t) => sum + t.questions.length, 0);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-md flex flex-col gap-12">

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">M1 Motorcycle</h2>
          <div className="flex flex-col gap-2">
            {m1Tests.map((test) => (
              <Link
                key={test.id}
                href={`/test/${test.id}`}
                className="flex items-center justify-between px-4 py-4 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors bg-white"
              >
                <span className="font-medium text-sm">{test.label}</span>
                <span className="text-sm text-gray-400">{test.questions.length} questions →</span>
              </Link>
            ))}

            {m1Tests.length > 0 && (
              <Link
                href="/test/all"
                className="flex items-center justify-between px-4 py-4 border border-gray-900 rounded-lg hover:bg-gray-900 hover:text-white transition-colors bg-white mt-2"
              >
                <span className="font-medium text-sm">Marathon</span>
                <span className="text-sm opacity-60">{m1Total} questions →</span>
              </Link>
            )}

            {m1BankCount > 0 && (
              <Link
                href="/test/bank"
                className="flex items-center justify-between px-4 py-4 border border-red-200 rounded-lg hover:border-red-400 transition-colors bg-white mt-2"
              >
                <span className="font-medium text-sm text-red-600">Missed Questions</span>
                <span className="text-sm text-red-300">{m1BankCount} questions →</span>
              </Link>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">G1 Car</h2>
          <div className="flex flex-col gap-2">
            {g1Tests.map((test) => (
              <Link
                key={test.id}
                href={`/test/${test.id}`}
                className="flex items-center justify-between px-4 py-4 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors bg-white"
              >
                <span className="font-medium text-sm">{test.label}</span>
                <span className="text-sm text-gray-400">{test.questions.length} questions →</span>
              </Link>
            ))}

            {g1Tests.length > 0 && (
              <Link
                href="/test/g1-all"
                className="flex items-center justify-between px-4 py-4 border border-gray-900 rounded-lg hover:bg-gray-900 hover:text-white transition-colors bg-white mt-2"
              >
                <span className="font-medium text-sm">Marathon</span>
                <span className="text-sm opacity-60">{g1Total} questions →</span>
              </Link>
            )}

            {g1BankCount > 0 && (
              <Link
                href="/test/g1-bank"
                className="flex items-center justify-between px-4 py-4 border border-red-200 rounded-lg hover:border-red-400 transition-colors bg-white mt-2"
              >
                <span className="font-medium text-sm text-red-600">Missed Questions</span>
                <span className="text-sm text-red-300">{g1BankCount} questions →</span>
              </Link>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
