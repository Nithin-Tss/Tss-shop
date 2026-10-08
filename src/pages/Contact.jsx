import { useState } from "react";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-[#071A2B] px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#D98324]">
            Get in touch
          </p>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Contact Us
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300">
            Have a question about TSS Shop? Our team is here to help.
            Send us a message and we'll get back to you as soon as possible.
          </p>
        </div>
      </section>

      {/* Contact content */}
      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
          {/* Contact information */}
          <div className="md:col-span-1">
            <h2 className="text-2xl font-bold text-gray-900">
              Get in touch
            </h2>

            <p className="mt-4 leading-7 text-gray-600">
              Whether you need help with your account, have a question about
              our platform, or want to discuss something else, we'd love to
              hear from you.
            </p>

            <div className="mt-8 space-y-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#D98324]">
                  Email
                </p>
                <p className="mt-1 text-gray-700">
                  support@tss-shop.com
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#D98324]">
                  Support
                </p>
                <p className="mt-1 text-gray-700">
                  TSS Shop Support Team
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#D98324]">
                  Response time
                </p>
                <p className="mt-1 text-gray-700">
                  We aim to respond as soon as possible.
                </p>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200 md:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Send us a message
            </h2>

            <p className="mt-2 text-gray-600">
              Fill out the form below and our support team will get back to
              you.
            </p>

            {submitted ? (
              <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6">
                <h3 className="font-semibold text-green-800">
                  Message submitted
                </h3>
                <p className="mt-2 text-green-700">
                  Thank you for contacting TSS Shop. Our team will get back to
                  you as soon as possible.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Name
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#D98324] focus:ring-2 focus:ring-[#D98324]/20"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#D98324] focus:ring-2 focus:ring-[#D98324]/20"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Subject
                  </label>

                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#D98324] focus:ring-2 focus:ring-[#D98324]/20"
                    placeholder="How can we help?"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Message
                  </label>

                  <textarea
                    id="message"
                    name="message"
                    rows="6"
                    required
                    className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#D98324] focus:ring-2 focus:ring-[#D98324]/20"
                    placeholder="Write your message..."
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-[#D98324] px-6 py-3 font-semibold text-white transition hover:opacity-90"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}