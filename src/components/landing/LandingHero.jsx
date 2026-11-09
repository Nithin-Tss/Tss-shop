import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ONBOARDING_PATH, STORES_PATH, useSession } from "@/lib/auth";
import { reducedMotion, useCountUp } from "./hooks";

const WORDS = ["yours", "your brand", "your trade", "you"];

const RANGES = {
  "7D": { total: 6420, delta: "+8.1%", bars: [42, 55, 38, 64, 72, 58, 90] },
  "30D": { total: 18240, delta: "+12.4%", bars: [38, 52, 44, 61, 57, 74, 68, 88, 79, 96] },
  "90D": { total: 51870, delta: "+21.7%", bars: [30, 36, 41, 39, 52, 58, 64, 71, 69, 83, 90, 97] },
};

const PEOPLE = [
  ["Amara Okafor", "#4821", 184, "Paid", "#ffd9c2"],
  ["Lucas Meyer", "#4820", 62.5, "Packed", "#ffe38a"],
  ["Hana Sato", "#4819", 329, "Paid", "#c9f2dc"],
  ["Diego Ruiz", "#4818", 48, "Shipped", "#d9ccff"],
  ["Priya Nair", "#4817", 126, "Paid", "#ffd9c2"],
  ["Tom Becker", "#4816", 91.2, "Shipped", "#c9f2dc"],
  ["Sofia Rossi", "#4815", 215, "Packed", "#ffe38a"],
  ["Noah Kim", "#4814", 74, "Paid", "#d9ccff"],
];

const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export default function LandingHero() {
  const signedIn = Boolean(useSession()?.token);
  const [wordIdx, setWordIdx] = useState(0);
  const [range, setRange] = useState("30D");
  const [active, setActive] = useState(null);
  const [feed, setFeed] = useState([0, 1, 2, 3]);
  const tick = useRef(4);
  const dashRef = useRef(null);

  // Rotating headline word
  useEffect(() => {
    if (reducedMotion()) return undefined;
    const id = setInterval(() => setWordIdx((i) => (i + 1) % WORDS.length), 2600);
    return () => clearInterval(id);
  }, []);

  // New orders "arrive" live
  useEffect(() => {
    if (reducedMotion()) return undefined;
    const id = setInterval(() => {
      setFeed((f) => [tick.current++ % PEOPLE.length, ...f.slice(0, 3)]);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  const data = RANGES[range];
  const shown = useCountUp(data.total, true, 900);
  const bar = active !== null ? data.bars[active] : null;
  const total = bar !== null ? Math.round((bar / 100) * data.total * 0.28) : Math.round(shown);

  // 3D tilt toward the cursor
  const onMove = (e) => {
    if (reducedMotion() || !dashRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    dashRef.current.style.transform = `rotateY(${x * 9}deg) rotateX(${-y * 9}deg)`;
  };
  const onLeave = () => {
    if (dashRef.current) dashRef.current.style.transform = "";
  };

  return (
    <section className="lp-hero" id="top">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className="grain" />
      <div className="wrap grid">
        <div>
          <span className="pill">
            <b>New</b> An assistant that edits your store, with your approval
          </span>
          <h1 className="serif">
            A store that looks like{" "}
            <span className="swap" aria-live="polite">
              <span className="word" key={wordIdx}>
                {WORDS[wordIdx]}
              </span>
            </span>
            , and runs itself.
          </h1>
          <p className="lede">
            Themes you can edit down to the code, inventory that stays honest, and a checkout your
            customers finish. One place for the whole business.
          </p>
          <div className="cta">
            <Link to={signedIn ? STORES_PATH : ONBOARDING_PATH} className="btn btn-dark">
              {signedIn ? "Open your stores" : "Start free"} <span className="arrow">→</span>
            </Link>
            <a href="#features" className="btn btn-ghost">
              See how it works
            </a>
          </div>
          <div className="fine">
            <span>14 days free</span>
            <span>No card</span>
            <span>Cancel from the dashboard</span>
          </div>
        </div>

        <div className="lp-stage" onMouseMove={onMove} onMouseLeave={onLeave}>
          <div className="lp-float f2">
            <div className="dot" style={{ background: "#c9f2dc" }}>
              ↗
            </div>
            <div>
              <b>Conversion up</b>
              <small>vs. previous period</small>
            </div>
          </div>
          <div className="lp-dash" ref={dashRef}>
            <div className="top">
              <span className="label">Sales dashboard</span>
              <div className="seg" role="tablist" aria-label="Date range">
                {Object.keys(RANGES).map((k) => (
                  <button
                    key={k}
                    role="tab"
                    aria-selected={range === k}
                    className={range === k ? "on" : ""}
                    onClick={() => {
                      setRange(k);
                      setActive(null);
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div className="metrics">
              <div>
                <div className="label">
                  {bar !== null ? "Selected day" : `Sales, last ${range.replace("D", "")} days`}
                </div>
                <div className="big">{money(total).replace(/\.00$/, "")}</div>
              </div>
              <span className="delta">{data.delta}</span>
            </div>
            <div className="bars">
              {data.bars.map((h, i) => (
                <button
                  key={`${range}-${i}`}
                  aria-label={`Day ${i + 1}`}
                  className={
                    (active === null ? i === data.bars.length - 1 : active === i) ? "on" : ""
                  }
                  style={{ height: `${h}%` }}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  <span className="tip">Day {i + 1}</span>
                </button>
              ))}
            </div>
            <div className="orders" aria-live="polite">
              {feed.map((idx, i) => {
                const [name, id, amt, status, tone] = PEOPLE[idx];
                return (
                  <div className="order" key={`${id}-${i === 0 ? "new" : i}`}>
                    <span className="avatar" style={{ background: tone }}>
                      {name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")}
                    </span>
                    <span>
                      {name}
                      <small>{id}</small>
                    </span>
                    <span className={`status ${status}`}>{status}</span>
                    <span className="amt">{money(amt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="lp-float f1">
            <div className="dot" style={{ background: "#ffd9c2" }}>
              🛍️
            </div>
            <div>
              <b>New order</b>
              <small>just now</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
