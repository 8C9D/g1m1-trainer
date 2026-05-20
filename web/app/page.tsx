import Link from "next/link";
import {
  LICENCE_CLASSES,
  MARATHON_LABEL,
  type LicenceClass,
} from "@/lib/questions";
import { getClassSummary, type LicenceClassSummary } from "@/lib/questions.server";
import { BankCount } from "@/components/BankCount";

export default function Home() {
  const summaries = LICENCE_CLASSES.map((cls) => ({
    licenceClass: cls,
    summary: getClassSummary(cls),
  }));

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-md flex flex-col gap-12">
        {summaries.map(({ licenceClass, summary }) => (
          <ClassSection key={licenceClass.key} licenceClass={licenceClass} summary={summary} />
        ))}
      </div>
    </main>
  );
}

function ClassSection({
  licenceClass,
  summary,
}: {
  licenceClass: LicenceClass;
  summary: LicenceClassSummary;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">{licenceClass.label}</h2>
      <div className="flex flex-col gap-2">
        {summary.tests.map((test) => (
          <Link
            key={test.id}
            href={`/test/${test.id}`}
            className="flex items-center justify-between px-4 py-4 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors bg-white"
          >
            <span className="font-medium text-sm">{test.label}</span>
            <span className="text-sm text-gray-400">{test.count} questions →</span>
          </Link>
        ))}

        {summary.tests.length > 0 && (
          <Link
            href={`/test/${licenceClass.marathonId}`}
            className="flex items-center justify-between px-4 py-4 border border-gray-900 rounded-lg hover:bg-gray-900 hover:text-white transition-colors bg-white mt-2"
          >
            <span className="font-medium text-sm">{MARATHON_LABEL}</span>
            <span className="text-sm opacity-60">{summary.totalQuestions} questions →</span>
          </Link>
        )}

        <BankCount bankKey={licenceClass.bankKey} bankId={licenceClass.bankId} />
      </div>
    </section>
  );
}
