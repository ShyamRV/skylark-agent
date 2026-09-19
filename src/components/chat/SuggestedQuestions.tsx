"use client";

export const investigationPrompts = [
  "What's our pipeline this quarter?",
  "Which sectors are performing best?",
  "What deals are stuck?",
  "What is closing this month?",
  "Compare Deals and Work Orders.",
  "Prepare an executive update.",
];

export function SuggestedQuestions({
  onAsk,
}: {
  onAsk: (question: string) => void;
}) {
  return (
    <section className="suggested-questions" aria-label="Try asking">
      <span className="eyebrow">Try asking</span>
      <div>
        {investigationPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => onAsk(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
    </section>
  );
}
