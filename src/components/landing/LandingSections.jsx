import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ONBOARDING_PATH } from "@/lib/auth";
import { Reveal, reducedMotion } from "./hooks";
import Icon from "./Icon";
import ProductArt, { hasArt } from "./ProductArt";

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
          <span className="chip" key={i}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Trade explorer ---------------- */
const TRADES = [
  {
    name: "Beauty",
    announce: "Free shipping on orders over $50",
    badges: ["Bestseller", "New", "Save 15%"],
    cta: "Shop now",
    note: "Shade finders, subscriptions",
    icon: "sparkles",
    tone: "#F1E4D3",
    title: "Find the shade, keep the customer.",
    sub: "Shade finders and refill subscriptions built into the product page.",
    items: [
      ["droplet", "Glow serum", "$38"],
      ["lips", "Velvet tint", "$22"],
      ["mirror", "Skin kit", "$64"],
    ],
    tags: ["Shade finder", "Subscriptions", "Reviews"],
  },
  {
    name: "Fashion",
    announce: "New season drop: free returns for 30 days",
    badges: ["New", "Low stock", "Bestseller"],
    cta: "Shop now",
    note: "Size grids, drops, lookbooks",
    icon: "shirt",
    tone: "#F5F0E6",
    title: "Drops that sell out on schedule.",
    sub: "Size grids, scheduled drops and lookbooks that feel like a magazine.",
    items: [
      ["coat", "Wool coat", "$180"],
      ["shoe", "Court low", "$96"],
      ["handbag", "Day bag", "$120"],
    ],
    tags: ["Size grid", "Scheduled drops", "Lookbook"],
  },
  {
    name: "Electronics",
    announce: "Bundle and save up to 20% this week",
    badges: ["Bestseller", "New", "Bundle"],
    cta: "Shop now",
    note: "Spec tables, bundles",
    icon: "headphones",
    tone: "#E7E9EE",
    title: "Specs first, questions later.",
    sub: "Spec tables, compare views and bundles that raise the basket.",
    items: [
      ["headphones", "Studio cans", "$249"],
      ["watch", "Pulse watch", "$199"],
      ["battery", "Power brick", "$59"],
    ],
    tags: ["Spec tables", "Bundles", "Compare"],
  },
  {
    name: "Manufacturing",
    announce: "Net-30 terms available for approved accounts",
    badges: ["Bulk", "Bulk", "Custom"],
    cta: "Request a quote",
    note: "Wholesale tiers, quotes",
    icon: "factory",
    tone: "#EDE6D8",
    title: "Wholesale without the back-and-forth.",
    sub: "Tiered pricing, minimum quantities and quote requests in one flow.",
    items: [
      ["gear", "Bearing set", "from $4"],
      ["bolt", "Fastener box", "from $12"],
      ["wrench", "Tool crate", "Quote"],
    ],
    tags: ["Price tiers", "Quotes", "Min. quantities"],
  },
  {
    name: "Grocery",
    announce: "Order by 2pm for same-day delivery",
    badges: ["Organic", "Fresh", "Local"],
    cta: "Book a delivery slot",
    note: "Weight pricing, delivery slots",
    icon: "basket",
    tone: "#F3EDDC",
    title: "Fresh by the gram, on time.",
    sub: "Weight-based pricing and delivery slots your customers can pick.",
    items: [
      ["basket", "Avocados", "$6/kg"],
      ["bread", "Sourdough", "$7"],
      ["cheese", "Aged cheddar", "$18/kg"],
    ],
    tags: ["Weight pricing", "Delivery slots", "Substitutions"],
  },
];

/* Extra storefront detail per demo product: category, reviews, compare-at price, swatches, tile tint */
const DETAIL = {
  "Glow serum": {
    cat: "Serum",
    reviews: 214,
    was: "$46",
    swatches: ["#E8CDB8", "#D9A58B", "#B97A5E"],
    tint: "#EFD9CB",
  },
  "Velvet tint": {
    cat: "Lip",
    reviews: 98,
    swatches: ["#C0504D", "#9C3B3B", "#D98880", "#6E2B2B"],
    tint: "#EBCFCB",
  },
  "Skin kit": { cat: "Sets", reviews: 61, was: "$78", swatches: [], tint: "#DCE3DA" },
  "Wool coat": {
    cat: "Outerwear",
    reviews: 142,
    swatches: ["#2B2F3A", "#B8A58A", "#7B5E45"],
    tint: "#E3DCD0",
  },
  "Court low": {
    cat: "Footwear",
    reviews: 87,
    swatches: ["#FFFFFF", "#1F2937", "#B8A58A"],
    tint: "#DDE1E6",
  },
  "Day bag": {
    cat: "Accessories",
    reviews: 53,
    was: "$150",
    swatches: ["#7B5E45", "#1F2937"],
    tint: "#EADFCF",
  },
  "Studio cans": {
    cat: "Audio",
    reviews: 536,
    swatches: ["#1F2937", "#E5E7EB", "#B8A58A"],
    tint: "#DCE0E8",
  },
  "Pulse watch": {
    cat: "Wearables",
    reviews: 318,
    was: "$229",
    swatches: ["#1F2937", "#C9B28A"],
    tint: "#E2E4DD",
  },
  "Power brick": { cat: "Charging", reviews: 129, swatches: [], tint: "#E6E1D8" },
  "Bearing set": {
    cat: "Bearings",
    reviews: 44,
    swatches: [],
    tint: "#DDE0E3",
    note: "Min. order 50",
  },
  "Fastener box": {
    cat: "Fasteners",
    reviews: 71,
    swatches: [],
    tint: "#E5E0D3",
    note: "Min. order 10",
  },
  "Tool crate": { cat: "Tools", reviews: 19, swatches: [], tint: "#E0DDD8", note: "Custom quote" },
  Avocados: { cat: "Produce", reviews: 302, swatches: [], tint: "#DCE5D2", note: "Per kg" },
  Sourdough: { cat: "Bakery", reviews: 188, swatches: [], tint: "#EBDDC6", note: "Baked today" },
  "Aged cheddar": {
    cat: "Dairy",
    reviews: 96,
    was: "$21/kg",
    swatches: [],
    tint: "#EFE2BF",
    note: "Per kg",
  },
};
const CATS = {
  Beauty: ["Serums", "Lips", "Sets"],
  Fashion: ["Outerwear", "Footwear", "Bags"],
  Electronics: ["Audio", "Wearables", "Charging"],
  Manufacturing: ["Bearings", "Fasteners", "Tools"],
  Grocery: ["Produce", "Bakery", "Dairy"],
};

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
                <span className="ico">
                  <Icon name={x.icon} size={22} />
                </span>
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
              <span className="nav-btns">
                <Icon name="back" size={14} stroke={2} />
                <Icon name="forward" size={14} stroke={2} />
              </span>
              <span className="url">
                <Icon name="lock" size={11} stroke={2} />
                {t.name.toLowerCase()}-store.example.com
              </span>
            </div>
            <div className="lp-shop" style={{ "--tone": t.tone }}>
              <div className="announce">{t.announce}</div>
              <div className="inner" key={t.name}>
                <div className="nav">
                  <b>{t.name} Co.</b>
                  <span className="links">
                    <i>Shop</i>
                    <i>Collections</i>
                    <i>Journal</i>
                  </span>
                  <span className="tools">
                    <Icon name="search" size={16} />
                    <Icon name="heart" size={16} />
                    <span className="bag">
                      <Icon name="bag" size={16} />
                      <em>2</em>
                    </span>
                  </span>
                </div>
                <div className="hero">
                  <div>
                    <h3 className="serif">{t.title}</h3>
                    <p className="sub">{t.sub}</p>
                    <div className="actions">
                      <span className="pri">{t.cta}</span>
                      <span className="sec">View lookbook</span>
                    </div>
                  </div>
                  <ul className="tags">
                    {t.tags.map((x) => (
                      <li key={x}>
                        <Icon name="shield" size={14} stroke={2} />
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="toolbar">
                  <span className="cats">
                    <em className="on">All</em>
                    {CATS[t.name].map((c) => (
                      <em key={c}>{c}</em>
                    ))}
                  </span>
                  <span className="sort">
                    <Icon name="sliders" size={13} /> Filter
                    <span className="sep" />
                    Sort: Featured <Icon name="chevron" size={13} stroke={2} />
                  </span>
                </div>
                <div className="cards">
                  {t.items.map(([icon, name, price], n) => {
                    const d = DETAIL[name] || {};
                    return (
                      <div className="card" key={name}>
                        <div className={`img v${n}`} style={{ "--tint": d.tint }}>
                          <span className="badge">{t.badges[n]}</span>
                          <span className="wish">
                            <Icon name="heart" size={14} />
                          </span>
                          {hasArt(name) ? (
                            <ProductArt name={name} className="art" />
                          ) : (
                            <span className="plate">
                              <Icon name={icon} size={46} stroke={1.15} />
                            </span>
                          )}
                          {price !== "Quote" && <span className="quick">Quick add</span>}
                        </div>
                        <div className="meta">
                          <small className="cat">{d.cat}</small>
                          <p>{name}</p>
                          <span className="stars" aria-label="4.8 out of 5">
                            {[0, 1, 2, 3, 4].map((k) => (
                              <Icon key={k} name="star" size={11} stroke={1.5} />
                            ))}
                            <small>4.8 ({d.reviews})</small>
                          </span>
                          {d.swatches?.length > 0 && (
                            <span className="swatches">
                              {d.swatches.map((c, k) => (
                                <i
                                  key={c}
                                  className={k === 0 ? "on" : ""}
                                  style={{ background: c }}
                                />
                              ))}
                            </span>
                          )}
                          {d.note && <small className="note">{d.note}</small>}
                          <div className="buy">
                            <strong>
                              {price}
                              {d.was && <s>{d.was}</s>}
                            </strong>
                            <span>{price === "Quote" ? "Request" : "Add"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="trust">
                  <span>
                    <Icon name="truck" size={16} /> Fast, tracked delivery
                  </span>
                  <span>
                    <Icon name="returns" size={16} /> 30-day returns
                  </span>
                  <span>
                    <Icon name="shield" size={16} /> Secure checkout
                  </span>
                </div>
              </div>
              <div className="toast" key={`toast-${t.name}`} role="status">
                <span className="ok">
                  <Icon name="check" size={14} stroke={2.5} />
                </span>
                <span>
                  <b>{t.items[0][1]} added</b>
                  <small>2 items · View cart</small>
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal style={{ marginTop: 36 }}>
          <Link to={`${ONBOARDING_PATH}?step=themes`} className="btn btn-ghost">
            Browse all themes <Icon name="arrow" size={16} stroke={2} className="arrow" />
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
              Contact us <Icon name="arrow" size={16} stroke={2} className="arrow" />
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
