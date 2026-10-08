import { useState } from "react";

export default function Privacy() {
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
            Privacy Policy
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-300">
            This Privacy Policy explains how TSS Shop may collect, use, and
            protect information when you use our services.
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
              <a href="#information" className="block hover:text-[#D98324]">
                1. Information We Collect
              </a>

              <a href="#use" className="block hover:text-[#D98324]">
                2. How We Use Information
              </a>

              <a href="#sharing" className="block hover:text-[#D98324]">
                3. Information Sharing
              </a>

              <a href="#cookies" className="block hover:text-[#D98324]">
                4. Cookies
              </a>

              <a href="#security" className="block hover:text-[#D98324]">
                5. Data Security
              </a>

              <a href="#retention" className="block hover:text-[#D98324]">
                6. Data Retention
              </a>

              <a href="#rights" className="block hover:text-[#D98324]">
                7. Your Rights
              </a>

              <a href="#children" className="block hover:text-[#D98324]">
                8. Children's Privacy
              </a>

              <a href="#third-party" className="block hover:text-[#D98324]">
                9. Third-Party Services
              </a>

              <a href="#changes" className="block hover:text-[#D98324]">
                10. Changes to This Policy
              </a>

              <a href="#contact" className="block hover:text-[#D98324]">
                11. Contact
              </a>
            </nav>
          </aside>

          {/* Privacy content */}
          <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
            <div>
              <p className="mb-8 text-base leading-7 text-gray-600">
                Your privacy is important to us. This Privacy Policy describes
                how TSS Shop handles information that may be collected when you
                use our website and services.
              </p>

              <section id="information" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  1. Information We Collect
                </h2>

                <p className="leading-7 text-gray-600">
                  Depending on how you interact with TSS Shop, we may collect
                  information such as your name, email address, contact
                  information, account information, order details, and
                  information you voluntarily provide.
                </p>
              </section>

              <section id="use" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  2. How We Use Information
                </h2>

                <p className="leading-7 text-gray-600">
                  Information may be used to provide and improve our services,
                  process orders, communicate with you, provide customer
                  support, maintain security, and comply with applicable legal
                  requirements.
                </p>
              </section>

              <section id="sharing" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  3. Information Sharing
                </h2>

                <p className="leading-7 text-gray-600">
                  We may share information with service providers and other
                  parties where reasonably necessary to operate our business,
                  provide services, process transactions, or comply with the
                  law.
                </p>
              </section>

              <section id="cookies" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  4. Cookies
                </h2>

                <p className="leading-7 text-gray-600">
                  Our website may use cookies or similar technologies to
                  support functionality, understand website usage, and improve
                  the user experience.
                </p>
              </section>

              <section id="security" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  5. Data Security
                </h2>

                <p className="leading-7 text-gray-600">
                  We take reasonable measures designed to protect information
                  against unauthorized access, alteration, disclosure, or
                  destruction.
                </p>
              </section>

              <section id="retention" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  6. Data Retention
                </h2>

                <p className="leading-7 text-gray-600">
                  Information may be retained for as long as reasonably
                  necessary for the purposes described in this policy or as
                  required by applicable law.
                </p>
              </section>

              <section id="rights" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  7. Your Rights
                </h2>

                <p className="leading-7 text-gray-600">
                  Depending on applicable law, you may have rights relating to
                  access, correction, deletion, restriction, or other
                  processing of your personal information.
                </p>
              </section>

              <section id="children" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  8. Children's Privacy
                </h2>

                <p className="leading-7 text-gray-600">
                  Our services are not intended to be used in violation of
                  applicable age restrictions or child privacy laws.
                </p>
              </section>

              <section id="third-party" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  9. Third-Party Services
                </h2>

                <p className="leading-7 text-gray-600">
                  Our website may interact with third-party services. Those
                  services may have their own privacy policies and terms that
                  apply to their handling of information.
                </p>
              </section>

              <section id="changes" className="mb-10 scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  10. Changes to This Policy
                </h2>

                <p className="leading-7 text-gray-600">
                  We may update this Privacy Policy from time to time. The
                  latest version will be made available through the website.
                </p>
              </section>

              <section id="contact" className="scroll-mt-8">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                  11. Contact Us
                </h2>

                <p className="mb-6 leading-7 text-gray-600">
                  If you have questions about this Privacy Policy, please
                  contact the TSS Shop Privacy Team.
                </p>

                <form onSubmit={handleSubmit} className="max-w-xl">
                  <label
                    htmlFor="privacy-email"
                    className="mb-2 block text-sm font-semibold text-gray-900"
                  >
                    Email address
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      id="privacy-email"
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
                      Thank you. The TSS Shop Privacy Team will get back to you.
                    </p>
                  )}
                </form>
              </section>

              
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}