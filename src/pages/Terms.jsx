import { useState } from "react";

export default function Terms() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email.trim()) {
      return;
    }

    setSubmitted(true);
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Hero */}
      <section className="bg-[#111827] px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#D98324]">
            Legal
          </p>

          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Terms & Conditions
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-300">
            Please read these Terms & Conditions carefully before using TSS
            Shop and its services.
          </p>

          <p className="mt-4 text-sm text-gray-400">
            Last updated: October 8, 2026
          </p>
        </div>
      </section>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Table of contents */}
          <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Contents
            </h2>

            <nav className="space-y-2 text-sm">
              <a href="#acceptance" className="block hover:text-[#D98324]">
                1. Acceptance of Terms
              </a>

              <a href="#account" className="block hover:text-[#D98324]">
                2. Account Registration
              </a>

              <a href="#products" className="block hover:text-[#D98324]">
                3. Products and Services
              </a>

              <a href="#orders" className="block hover:text-[#D98324]">
                4. Orders and Payments
              </a>

              <a href="#shipping" className="block hover:text-[#D98324]">
                5. Shipping and Delivery
              </a>

              <a href="#returns" className="block hover:text-[#D98324]">
                6. Returns and Refunds
              </a>

              <a href="#acceptable-use" className="block hover:text-[#D98324]">
                7. Acceptable Use
              </a>

              <a href="#intellectual-property" className="block hover:text-[#D98324]">
                8. Intellectual Property
              </a>

              <a href="#liability" className="block hover:text-[#D98324]">
                9. Limitation of Liability
              </a>

              <a href="#termination" className="block hover:text-[#D98324]">
                10. Termination
              </a>

              <a href="#changes" className="block hover:text-[#D98324]">
                11. Changes to Terms
              </a>

              <a href="#governing-law" className="block hover:text-[#D98324]">
                12. Governing Law
              </a>

              <a href="#contact" className="block hover:text-[#D98324]">
                13. Contact
              </a>
            </nav>
          </aside>

          {/* Legal content */}
          <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
            <div className="prose max-w-none">
              <p className="mb-8 text-base leading-7 text-gray-600">
                These Terms & Conditions govern your access to and use of TSS
                Shop, including our website, services, and related features.
                By accessing or using TSS Shop, you agree to be bound by these
                terms.
              </p>

              <section id="acceptance" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  1. Acceptance of Terms
                </h2>

                <p className="leading-7 text-gray-600">
                  By accessing or using TSS Shop, you acknowledge that you have
                  read, understood, and agreed to these Terms & Conditions. If
                  you do not agree with these terms, please do not use our
                  services.
                </p>
              </section>

              <section id="account" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  2. Account Registration
                </h2>

                <p className="leading-7 text-gray-600">
                  Certain features may require you to create an account. You
                  are responsible for providing accurate information and for
                  keeping your account credentials secure.
                </p>
              </section>

              <section id="products" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  3. Products and Services
                </h2>

                <p className="leading-7 text-gray-600">
                  Product descriptions, prices, availability, images, and
                  specifications may change from time to time. TSS Shop
                  reserves the right to correct errors and update product
                  information when necessary.
                </p>
              </section>

              <section id="orders" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  4. Orders and Payments
                </h2>

                <p className="leading-7 text-gray-600">
                  Orders are subject to availability and confirmation. You
                  agree to provide valid payment and billing information when
                  placing an order.
                </p>
              </section>

              <section id="shipping" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  5. Shipping and Delivery
                </h2>

                <p className="leading-7 text-gray-600">
                  Delivery times may vary depending on location, availability,
                  shipping method, and circumstances outside our control.
                </p>
              </section>

              <section id="returns" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  6. Returns and Refunds
                </h2>

                <p className="leading-7 text-gray-600">
                  Returns, exchanges, and refunds are subject to the applicable
                  TSS Shop return and refund policy.
                </p>
              </section>

              <section id="acceptable-use" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  7. Acceptable Use
                </h2>

                <p className="leading-7 text-gray-600">
                  You agree not to misuse our website, interfere with its
                  operation, attempt unauthorized access, or use the service
                  for unlawful purposes.
                </p>
              </section>

              <section
                id="intellectual-property"
                className="mb-10 scroll-mt-8"
              >
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  8. Intellectual Property
                </h2>

                <p className="leading-7 text-gray-600">
                  Unless otherwise stated, content provided through TSS Shop,
                  including text, graphics, branding, and software, is owned by
                  or licensed to TSS Shop and may not be used without
                  appropriate authorization.
                </p>
              </section>

              <section id="liability" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  9. Limitation of Liability
                </h2>

                <p className="leading-7 text-gray-600">
                  To the extent permitted by applicable law, TSS Shop will not
                  be liable for indirect, incidental, special, or consequential
                  losses arising from your use of our services.
                </p>
              </section>

              <section id="termination" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  10. Termination
                </h2>

                <p className="leading-7 text-gray-600">
                  We may suspend or terminate access to services where
                  reasonably necessary, including where a user violates these
                  Terms & Conditions.
                </p>
              </section>

              <section id="changes" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  11. Changes to Terms
                </h2>

                <p className="leading-7 text-gray-600">
                  TSS Shop may update these Terms & Conditions from time to
                  time. Updated terms will be made available through the
                  website.
                </p>
              </section>

              <section id="governing-law" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  12. Governing Law
                </h2>

                <p className="leading-7 text-gray-600">
                  These terms should be reviewed and customized to reflect the
                  laws and jurisdiction applicable to your business.
                </p>
              </section>

              <section id="contact" className="scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  13. Contact
                </h2>

                <p className="mb-6 leading-7 text-gray-600">
                  If you have questions regarding these Terms & Conditions,
                  please contact the TSS Shop Support Team.
                </p>

                <form onSubmit={handleSubmit} className="max-w-xl">
                  <label
                    htmlFor="terms-email"
                    className="mb-2 block text-sm font-semibold text-gray-900"
                  >
                    Email address
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      id="terms-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your email"
                      required
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#D98324] focus:ring-2 focus:ring-[#D98324]/20"
                    />

                    <button
                      type="submit"
                      className="rounded-lg bg-[#D98324] px-6 py-3 font-semibold text-white transition hover:bg-[#c8731e]"
                    >
                      Send
                    </button>
                  </div>

                  {submitted && (
                    <p className="mt-3 text-sm font-medium text-green-600">
                      Thank you. The TSS Shop Support Team will get back to you.
                    </p>
                  )}
                </form>
              </section>

              <div className="mt-12 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
                <strong>Legal notice:</strong> This page is a general template
                and should be reviewed and customized by qualified legal
                counsel before being used as final legal terms.
              </div>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}