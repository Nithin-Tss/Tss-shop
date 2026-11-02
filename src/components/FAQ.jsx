import { useState } from "react";

const faqItems = [
  {
    question: "Do I need a credit card to start?",
    answer: "No. You can start building your store without entering your credit card details.",
  },
  {
    question: "Can I use my own domain name?",
    answer: "Yes. You can connect your existing domain name to your online store.",
  },
  {
    question: "How do I get paid?",
    answer: "You can connect supported payment providers to accept payments from your customers.",
  },
  {
    question: "Can I move my products from another platform?",
    answer: "Yes. You can migrate your existing product information and store data to Store.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. You can cancel your plan whenever you want according to the terms of your selected plan.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12 lg:px-10">
        <h2 className="display text-5xl text-ink lg:col-span-4 lg:text-6xl">
          Questions, answered.
        </h2>

        <div className="lg:col-span-7 lg:col-start-6">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div key={item.question} className="border-t border-slate-200 last:border-b">
                <button
                  type="button"
                  onClick={() => handleToggle(index)}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="text-lg text-ink">{item.question}</span>
                  <svg
                    viewBox="0 0 16 16"
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M8 2v12M2 8h12" strokeLinecap="round" />
                  </svg>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${index}`}
                    className="max-w-xl pb-6 leading-relaxed text-slate-600"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
