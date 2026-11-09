import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ONBOARDING_PATH } from "@/lib/auth";
import { Reveal, reducedMotion } from "./hooks";

/* ---------------- Marquee ---------------- */
const TRADES_LINE = [
  "Beauty",
  "Fashion",
  "Electronics",
  "Manufacturing",
  "Grocery",
  "Wholesale",
  "Subscriptions",
  "Lookbooks",
  "Bundles",
  "Delivery slots",
];

export function Marquee() {
  const row = [...TRADES_LINE, ...TRADES_LINE];
  return (
    <div className="lp-marquee" aria-hidden="true">
      <div className="track">
        {row.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Trade explorer ---------------- */
const TRADES = [
  {
    name: "Beauty",
    note: "Shade finders, subscriptions",
    icon: "💄",
    tone: "#ffd9c2",
    title: "Find the shade, keep the customer.",
    sub: "Shade finders and refill subscriptions built into the product page.",
    items: [
      ["🧴", "Glow serum", "$38"],
      ["💋", "Velvet tint", "$22"],
      ["🪞", "Skin kit", "$64"],
    ],
    tags: ["Shade finder", "Subscriptions", "Reviews"],
  },
  {
    name: "Fashion",
    note: "Size grids, drops, lookbooks",
    icon: "👗",
    tone: "#d9ccff",
    title: "Drops that sell out on schedule.",
    sub: "Size grids, scheduled drops and lookbooks that feel like a magazine.",
    items: [
      ["🧥", "Wool coat", "$180"],
      ["👟", "Court low", "$96"],
      ["👜", "Day bag", "$120"],
    ],
    tags: ["Size grid", "Scheduled drops", "Lookbook"],
  },
  {
    name: "Electronics",
    note: "Spec tables, bundles",
    icon: "🎧",
    tone: "#c9f2dc",
    title: "Specs first, questions later.",
    sub: "Spec tables, compare views and bundles that raise the basket.",
    items: [
      ["🎧", "Studio cans", "$249"],
      ["⌚", "Pulse watch", "$199"],
      ["🔋", "Power brick", "$59"],
    ],
    tags: ["Spec tables", "Bundles", "Compare"],
  },
  {
    name: "Manufacturing",
    note: "Wholesale tiers, quotes",
    icon: "🏭",
    tone: "#ffe38a",
    title: "Wholesale without the back-and-forth.",
    sub: "Tiered pricing, minimum quantities and quote requests in one flow.",
    items: [
      ["⚙️", "Bearing set", "from $4"],
      ["🔩", "Fastener box", "from $12"],
      ["🛠️", "Tool crate", "Quote"],
    ],
    tags: ["Price tiers", "Quotes", "Min. quantities"],
  },
  {
    name: "Grocery",
    note: "Weight pricing, delivery slots",
    icon: "🥑",
    tone: "#c9f2dc",
    title: "Fresh by the gram, on time.",
    sub: "Weight-based pricing and delivery slots your customers can pick.",
    items: [
      ["🥑", "Avocados", "$6/kg"],
      ["🍞", "Sourdough", "$7"],
      ["🧀", "Aged cheddar", "$18/kg"],
    ],
    tags: ["Weight pricing", "Delivery slots", "Substitutions"],
  },
];

export function TradeExplorer() {
  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(true);
  const t = TRADES[idx];

  useEffect(() => {
    if (!auto || reducedMotion()) return undefined;
    const id = setTimeout(() => setIdx((i) => (i + 1) % TRADES.length), 5000);
    return () => clearTimeout(id);
  }, [idx, auto]);

  return (
    <section className="lp-section" id="features">
      <div className="wrap">
        <Reveal className="lp-head split">
          <div style={{ display: "grid", gap: 18 }}>
            <span className="eyebrow">Themes by trade</span>
            <h2 className="serif">
              Built for the shop you <em>actually</em> run.
            </h2>
          </div>
          <p>
            Start from a theme made for your trade, then change anything: sections, fields, even the
            template code. Pick one to preview it.
          </p>
        </Reveal>

        <Reveal className="lp-explorer">
          <div className="lp-trades" role="tablist" aria-label="Trade themes">
            {TRADES.map((x, i) => (
              <button
                key={x.name}
                role="tab"
                aria-selected={i === idx}
                className={`lp-trade ${i === idx ? "on" : ""}`}
                style={{ "--tone": x.tone }}
                onClick={() => {
                  setIdx(i);
                  setAuto(false);
                }}
              >
                <span className="ico">{x.icon}</span>
                <span>
                  <b>{x.name}</b>
                  <small>{x.note}</small>
                </span>
                {i === idx && auto && <span className="progress" key={`p-${idx}`} />}
              </button>
            ))}
          </div>

          <div className="lp-browser">
            <div className="chrome">
              <i />
              <i />
              <i />
              <span className="url">{t.name.toLowerCase()}-store.example.com</span>
            </div>
            <div className="lp-shop" style={{ "--tone": t.tone }}>
              <div className="inner" key={t.name}>
                <div className="nav">
                  <b>{t.name} Co.</b>
                  <span>
                    <i>Shop</i>
                    <i>Journal</i>
                    <i>Cart (0)</i>
                  </span>
                </div>
                <h3 className="serif">{t.title}</h3>
                <p className="sub">{t.sub}</p>
                <div className="cards">
                  {t.items.map(([emoji, name, price]) => (
                    <div className="card" key={name}>
                      <div className="img">{emoji}</div>
                      <p>
                        {name} <small>· {price}</small>
                      </p>
                    </div>
                  ))}
                </div>
                <div className="tags">
                  {t.tags.map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal style={{ marginTop: 36 }}>
          <Link to={`${ONBOARDING_PATH}?step=themes`} className="btn btn-ghost">
            Browse all themes <span className="arrow">→</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Steps ---------------- */
const STEPS = [
  [
    "01",
    "Pick a theme",
    "Choose one built for your trade. It already has the fields and sections you need.",
  ],
  [
    "02",
    "Make it yours",
    "Change sections and fields in the editor, or open the template code. Preview as you go.",
  ],
  [
    "03",
    "Open the doors",
    "Connect payments and your domain, import your products, and start selling.",
  ],
];

export function Steps() {
  return (
    <section className="lp-section" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <Reveal className="lp-head">
          <span className="eyebrow">How it works</span>
          <h2 className="serif" style={{ maxWidth: "16ch" }}>
            From idea to <em style={{ color: "var(--lp-orange)" }}>open for business</em> in three
            steps.
          </h2>
        </Reveal>
        <div className="lp-steps">
          {STEPS.map(([n, h, p], i) => (
            <Reveal key={n} delay={i * 120} className="lp-step">
              <div className="n">{n}</div>
              <h3>{h}</h3>
              <p>{p}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
const FAQS = [
  [
    "Do I need a credit card to start?",
    "No. You can start building your store without entering your credit card details.",
  ],
  [
    "Can I use my own domain name?",
    "Yes. You can connect your existing domain name to your online store.",
  ],
  [
    "How do I get paid?",
    "You can connect supported payment providers to accept payments from your customers.",
  ],
  [
    "Can I move my products from another platform?",
    "Yes. You can migrate your existing product information and store data to Store.",
  ],
  [
    "Can I cancel anytime?",
    "Yes. You can cancel your plan whenever you want according to the terms of your selected plan.",
  ],
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="lp-section" id="resources" style={{ paddingTop: 0 }}>
      <div className="wrap lp-faq">
        <Reveal className="lp-head" style={{ alignContent: "start" }}>
          <span className="eyebrow">FAQ</span>
          <h2 className="serif">
            Questions, <em>answered.</em>
          </h2>
          <p>Still unsure? Our help center is a message away.</p>
          <div>
            <Link to="/contact" className="btn btn-ghost">
              Contact us <span className="arrow">→</span>
            </Link>
          </div>
        </Reveal>
        <div>
          {FAQS.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <Reveal key={q} delay={i * 70} className={`item ${isOpen ? "open" : ""}`}>
                <button
                  type="button"
                  className="q"
                  aria-expanded={isOpen}
                  aria-controls={`lp-faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span>{q}</span>
                  <span className="plus" aria-hidden="true">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M8 2v12M2 8h12" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
                <div className="a" id={`lp-faq-${i}`} role="region">
                  <div>
                    <p>{a}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
