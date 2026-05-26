import { describe, it, expect, vi } from "vitest";
// CommonJS helpers shared with `scripts/sync-data.js` and `scripts/cache-images.js`.
import {
  projectQuestion,
  collectImageUrlsFromQuestions,
} from "../../scripts/sync-helpers.js";

const validRaw = {
  testName: "g1-practice-test-1",
  questionNumber: 1,
  question: "Q?",
  questionImageUrl: "https://www.g1.ca/wp-content/uploads/autotest/abc.jpg",
  answerOptions: [
    { index: "1", text: "A" },
    { index: "2", text: "B" },
  ],
  correctAnswer: "B",
  explanation: "Because.",
  chosenAnswer: "A",
};

describe("projectQuestion", () => {
  it("strips chosenAnswer from the projected shape", () => {
    const out = projectQuestion(validRaw);
    expect(out).not.toHaveProperty("chosenAnswer");
  });

  it("preserves every PUBLISHED_FIELD that is present on input", () => {
    const out = projectQuestion(validRaw);
    expect(out.testName).toBe(validRaw.testName);
    expect(out.questionNumber).toBe(validRaw.questionNumber);
    expect(out.question).toBe(validRaw.question);
    expect(out.questionImageUrl).toBe(validRaw.questionImageUrl);
    expect(out.answerOptions).toEqual(validRaw.answerOptions);
    expect(out.correctAnswer).toBe(validRaw.correctAnswer);
    expect(out.explanation).toBe(validRaw.explanation);
  });

  it("strips arbitrary extra fields, not only chosenAnswer", () => {
    const withExtras = { ...validRaw, scrapedAt: "2025-01-01", noise: 7 };
    const out = projectQuestion(withExtras);
    expect(out).not.toHaveProperty("scrapedAt");
    expect(out).not.toHaveProperty("noise");
  });

  it("omits a PUBLISHED_FIELD that is missing from input rather than setting it to undefined", () => {
    const { explanation: _explanation, ...missing } = validRaw;
    void _explanation;
    const out = projectQuestion(missing);
    expect(out).not.toHaveProperty("explanation");
  });

  it("passes questionImageUrl through unchanged by default (rewriteCachedImages off)", () => {
    const out = projectQuestion(validRaw);
    expect(out.questionImageUrl).toBe(validRaw.questionImageUrl);
  });

  it("rewrites questionImageUrl when opted in and the cache predicate returns true", () => {
    const out = projectQuestion(validRaw, {
      rewriteCachedImages: true,
      cacheExists: () => true,
    });
    expect(out.questionImageUrl).toBe("/question-images/abc.jpg");
  });

  it("does not rewrite questionImageUrl when the cache predicate returns false", () => {
    const cacheExists = vi.fn(() => false);
    const out = projectQuestion(validRaw, {
      rewriteCachedImages: true,
      cacheExists,
    });
    expect(out.questionImageUrl).toBe(validRaw.questionImageUrl);
    expect(cacheExists).toHaveBeenCalledWith("abc.jpg");
  });

  it("preserves a null questionImageUrl without consulting the cache predicate", () => {
    const cacheExists = vi.fn(() => true);
    const out = projectQuestion(
      { ...validRaw, questionImageUrl: null },
      { rewriteCachedImages: true, cacheExists },
    );
    expect(out.questionImageUrl).toBeNull();
    expect(cacheExists).not.toHaveBeenCalled();
  });
});

describe("collectImageUrlsFromQuestions", () => {
  it("accumulates non-empty string image URLs from an array", () => {
    const data = [
      { questionImageUrl: "https://example.com/a.jpg" },
      { questionImageUrl: "https://example.com/b.jpg" },
    ];
    expect(collectImageUrlsFromQuestions(data)).toEqual(
      new Set(["https://example.com/a.jpg", "https://example.com/b.jpg"]),
    );
  });

  it("dedupes repeated URLs across entries", () => {
    const data = [
      { questionImageUrl: "https://example.com/a.jpg" },
      { questionImageUrl: "https://example.com/a.jpg" },
    ];
    expect(collectImageUrlsFromQuestions(data).size).toBe(1);
  });

  it("skips entries with null, empty, or non-string questionImageUrl, plus non-object entries", () => {
    const data = [
      { questionImageUrl: null },
      { questionImageUrl: "" },
      { questionImageUrl: 42 },
      {},
      "not an object",
      null,
    ];
    expect(collectImageUrlsFromQuestions(data).size).toBe(0);
  });

  it("returns the provided accumulator Set when one is passed", () => {
    const acc = new Set(["seeded.jpg"]);
    const result = collectImageUrlsFromQuestions(
      [{ questionImageUrl: "added.jpg" }],
      acc,
    );
    expect(result).toBe(acc);
    expect(result).toEqual(new Set(["seeded.jpg", "added.jpg"]));
  });

  it("returns an empty Set for non-array input", () => {
    expect(collectImageUrlsFromQuestions({ not: "an array" })).toEqual(new Set());
    expect(collectImageUrlsFromQuestions(null)).toEqual(new Set());
    expect(collectImageUrlsFromQuestions(undefined)).toEqual(new Set());
  });
});
