import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuestionCard } from "./QuestionCard";
import type { Question } from "@/lib/questions";

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    testName: "g1-practice-test-1",
    questionNumber: 1,
    question: "Pick the fruit.",
    questionImageUrl: null,
    answerOptions: [
      { index: "1", text: "Apple" },
      { index: "2", text: "Banana" },
      { index: "3", text: "Cherry" },
      { index: "4", text: "Date" },
    ],
    correctAnswer: "Banana",
    correctAnswerIndex: "2",
    explanation: "Banana is the fruit.",
    ...overrides,
  };
}

describe("QuestionCard", () => {
  it("renders all answer options", () => {
    render(
      <QuestionCard question={makeQuestion()} questionNumber={1} total={4} onNext={vi.fn()} />,
    );
    for (const text of ["Apple", "Banana", "Cherry", "Date"]) {
      expect(screen.getByRole("button", { name: new RegExp(text, "i") })).toBeTruthy();
    }
  });

  it("calls onNext(true) when the correct option is selected and Next is clicked", () => {
    const onNext = vi.fn();
    render(
      <QuestionCard question={makeQuestion()} questionNumber={1} total={4} onNext={onNext} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /banana/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledWith(true);
  });

  it("calls onNext(false) when an incorrect option is selected and Next is clicked", () => {
    const onNext = vi.fn();
    render(
      <QuestionCard question={makeQuestion()} questionNumber={1} total={4} onNext={onNext} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /apple/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onNext).toHaveBeenCalledWith(false);
  });

  it("uses stable index — not display position — to determine correctness when answer order is shuffled", () => {
    const onNext = vi.fn();
    const shuffled = makeQuestion({
      answerOptions: [
        { index: "3", text: "Cherry" },
        { index: "2", text: "Banana" },
        { index: "4", text: "Date" },
        { index: "1", text: "Apple" },
      ],
    });
    render(
      <QuestionCard question={shuffled} questionNumber={1} total={4} onNext={onNext} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /banana/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onNext).toHaveBeenCalledWith(true);
  });

  it("shows the Finish label on the last question", () => {
    render(
      <QuestionCard question={makeQuestion()} questionNumber={5} total={5} onNext={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /banana/i }));
    expect(screen.getByRole("button", { name: /finish/i })).toBeTruthy();
  });
});
