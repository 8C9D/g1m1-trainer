import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BankCount } from "./BankCount";
import { serializeBankStorage, BANK_LABEL, type Question } from "@/lib/questions";

function makeQuestion(n: number): Question {
  return {
    testName: "m1-practice-test-1",
    questionNumber: n,
    question: `Q${n}?`,
    questionImageUrl: null,
    answerOptions: [
      { index: "1", text: "A" },
      { index: "2", text: "B" },
    ],
    correctAnswer: "A",
    correctAnswerIndex: "1",
    explanation: "",
  };
}

function seedBank(bankKey: string, count: number) {
  const questions = Array.from({ length: count }, (_, i) => makeQuestion(i + 1));
  localStorage.setItem(bankKey, serializeBankStorage(questions));
}

describe("BankCount", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders nothing when the bank is empty", () => {
    const { container } = render(<BankCount bankKey="m1-missed" bankId="bank" />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("links to the bank's test route when the bank has questions", () => {
    seedBank("m1-missed", 1);
    render(<BankCount bankKey="m1-missed" bankId="bank" />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/test/bank");
    expect(screen.getByText(BANK_LABEL)).toBeTruthy();
  });

  it("shows the number of questions currently in the bank", () => {
    seedBank("m1-missed", 3);
    render(<BankCount bankKey="m1-missed" bankId="bank" />);
    expect(screen.getByText(/3 questions/)).toBeTruthy();
  });

  it("reads the count from the bankKey it is given", () => {
    seedBank("g1-missed", 2);
    render(<BankCount bankKey="g1-missed" bankId="g1-bank" />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/test/g1-bank");
    expect(screen.getByText(/2 questions/)).toBeTruthy();
  });

  it("updates the count live when a storage event fires (cross-tab sync)", () => {
    seedBank("m1-missed", 1);
    render(<BankCount bankKey="m1-missed" bankId="bank" />);
    expect(screen.getByText(/1 questions/)).toBeTruthy();

    // Another tab adds two more missed questions and notifies via `storage`.
    act(() => {
      seedBank("m1-missed", 3);
      window.dispatchEvent(new Event("storage"));
    });

    expect(screen.getByText(/3 questions/)).toBeTruthy();
  });

  it("surfaces the bank link when a storage event reports the first missed question", () => {
    const { container } = render(<BankCount bankKey="m1-missed" bankId="bank" />);
    expect(container.querySelector("a")).toBeNull(); // empty bank: nothing rendered

    act(() => {
      seedBank("m1-missed", 2);
      window.dispatchEvent(new Event("storage"));
    });

    expect(screen.getByRole("link").getAttribute("href")).toBe("/test/bank");
    expect(screen.getByText(/2 questions/)).toBeTruthy();
  });
});
