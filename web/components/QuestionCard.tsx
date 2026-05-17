"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { type Question } from "@/lib/questions";

interface Props {
  question: Question;
  questionNumber: number;
  total: number;
  onNext: (correct: boolean) => void;
}

export function QuestionCard({ question, questionNumber, total, onNext }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;
  const isLast = questionNumber === total;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!answered) {
        const i = parseInt(e.key) - 1;
        if (i >= 0 && i < question.answerOptions.length) {
          setSelected(question.answerOptions[i].text);
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onNext(selected === question.correctAnswer);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [answered, selected, question, onNext]);

  const handleSelect = (text: string) => {
    if (!answered) setSelected(text);
  };

  const getStyle = (text: string) => {
    if (!answered) {
      return "border-gray-200 hover:border-gray-400 cursor-pointer";
    }
    if (text === question.correctAnswer) {
      return "border-green-500 bg-green-50 text-green-900";
    }
    if (text === selected) {
      return "border-red-400 bg-red-50 text-red-900";
    }
    return "border-gray-100 text-gray-400";
  };

  const getIndicator = (text: string) => {
    if (!answered) return null;
    if (text === question.correctAnswer) return <span className="text-green-600 font-bold">✓</span>;
    if (text === selected) return <span className="text-red-500 font-bold">✗</span>;
    return null;
  };

  return (
    <div className="flex flex-col gap-6">
      {question.questionImageUrl && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={question.questionImageUrl}
            alt="Question image"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      <h2 className="text-lg font-medium leading-snug">{question.question}</h2>

      <div className="flex flex-col gap-2">
        {question.answerOptions.map((option, i) => (
          <button
            key={option.index}
            onClick={() => handleSelect(option.text)}
            className={`flex items-center justify-between w-full text-left px-4 py-3 border rounded-lg text-sm transition-colors ${getStyle(option.text)}`}
          >
            <span className="flex items-center gap-3">
              <kbd className="text-xs text-gray-300 font-mono w-4 shrink-0">{i + 1}</kbd>
              {option.text}
            </span>
            {getIndicator(option.text)}
          </button>
        ))}
      </div>

      {answered && question.explanation && (
        <p className="text-sm text-gray-500 leading-relaxed border-l-2 border-gray-200 pl-3">
          {question.explanation}
        </p>
      )}

      {answered && (
        <div className="flex justify-end">
          <button
            onClick={() => onNext(selected === question.correctAnswer)}
            className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {isLast ? "Finish" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}
