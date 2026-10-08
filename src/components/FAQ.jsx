
import { useState } from "react";

const faqItems = [
  {
    question: "Do I need a credit card to start?",
    answer:
      "No. You can start building your store without entering your credit card details.",
  },
  {
    question: "Can I use my own domain name?",
    answer:
      "Yes. You can connect your existing domain name to your online store.",
  },
  {
    question: "How do I get paid?",
    answer:
      "You can connect supported payment providers to accept payments from your customers.",
  },
  {
    question: "Can I move my products from another platform?",
    answer:
      "Yes. You can migrate your existing product information and store data to Store.",
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
    <section className="w-full bg-[#f8faff] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section Badge */}
        <div className="mb-3 flex justify-center">
          <span className="rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-600">
            FAQ
          </span>
        </div>

        {/* Heading */}
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Questions, answered.
        </h2>

        {/* FAQ List */}
        <div className="mx-auto max-w-10xl border-t border-slate-200">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={item.question}
                className="border-b border-slate-200"
              >
                <button
                  type="button"
                  onClick={() => handleToggle(index)}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left transition hover:bg-white"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="text-base font-medium text-slate-800 sm:text-lg">
                    {item.question}
                  </span>

                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xl font-bold transition ${
                      isOpen
                        ? "bg-blue-600 text-white"
                        : "text-blue-600"
                    }`}
                    aria-hidden="true"
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${index}`}
                    className="pb-5 pr-12 text-sm leading-7 text-slate-500 sm:text-base"
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