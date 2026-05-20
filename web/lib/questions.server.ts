import "server-only";
import fs from "node:fs";
import path from "node:path";
import { parseQuestion, type LicenceClass } from "./questions";

export interface PracticeTestSummary {
  id: string;
  label: string;
  order: number;
  count: number;
}

export interface LicenceClassSummary {
  tests: PracticeTestSummary[];
  totalQuestions: number;
}

function countValidQuestions(publicPath: string): number {
  const fsPath = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  const raw: unknown = JSON.parse(fs.readFileSync(fsPath, "utf-8"));
  if (!Array.isArray(raw)) {
    throw new Error(`${publicPath}: expected an array of questions at the top level`);
  }
  raw.forEach((item, i) => {
    try {
      parseQuestion(item);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`${publicPath}[${i}]: ${msg}`);
    }
  });
  return raw.length;
}

export function getClassSummary(licenceClass: LicenceClass): LicenceClassSummary {
  const tests: PracticeTestSummary[] = Object.entries(licenceClass.tests)
    .map(([id, meta]) => ({
      id,
      label: meta.label,
      order: meta.order,
      count: countValidQuestions(meta.dataFile),
    }))
    .sort((a, b) => a.order - b.order);
  const totalQuestions = tests.reduce((sum, t) => sum + t.count, 0);
  return { tests, totalQuestions };
}
