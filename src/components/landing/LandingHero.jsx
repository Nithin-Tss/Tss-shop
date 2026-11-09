import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ONBOARDING_PATH, STORES_PATH, useSession } from "@/lib/auth";
import { reducedMotion, useCountUp } from "./hooks";
import Icon from "./Icon";

const RANGES = {
  "7D": { total: 6420, delta: "+8.1%", bars: [42, 55, 38, 64, 72, 58, 90] },
  "30D": { total: 18240, delta: "+12.4%", bars: [38, 52, 44, 61, 57, 74, 68, 88, 79, 96] },
  "90D": { total: 51870, delta: "+21.7%", bars: [30, 36, 41, 39, 52, 58, 64, 71, 69, 83, 90, 97] },
};

const PEOPLE = [
  ["Amara Okafor", "#4821", 184, "Paid", "#F5F0E6"],
  ["Lucas Meyer", "#4820", 62.5, "Packed", "#F5F0E6"],
  ["Hana Sato", "#4819", 329, "Paid", "#F5F0E6"],
  ["Diego Ruiz", "#4818", 48, "Shipped", "#F5F0E6"],
  ["Priya Nair", "#4817", 126, "Paid", "#F5F0E6"],
  ["Tom Becker", "#4816", 91.2, "Shipped", "#F5F0E6"],
  ["Sofia Rossi", "#4815", 215, "Packed", "#F5F0E6"],
  ["Noah Kim", "#4814", 74, "Paid", "#F5F0E6"],
];

const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export default function LandingHero() {
  const signedIn = Boolean(useSession()?.token);
  const [range, setRange] = useState("30D");
  const [active, setActive] = useState(null);
  const [feed, setFeed] = useState([0, 1, 2, 3]);
  const tick = useRef(4);

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

  return (
    <section className="lp-hero" id="top">
      <div className="wrap grid">
        <div>
          <h1 className="serif">Build your store, without writing code.</h1>
          <p className="lede">
            Choose a design, add your products and start taking orders. Payments, inventory and
            shipping are already set up for you.
          </p>
          <div className="cta">
            <Link to={signedIn ? STORES_PATH : ONBOARDING_PATH} className="btn btn-dark">
              {signedIn ? "Open your stores" : "Start free"}{" "}
              <Icon name="arrow" size={16} stroke={2} className="arrow" />
            </Link>
            <a href="#features" className="btn btn-ghost">
              See how it works
            </a>
          </div>
          <p className="fine">Free for 14 days. No credit card required.</p>
          <ul className="perks">
            <li>
              <Icon name="layout" size={20} />
              <span>
                <b>Visual editor</b>
                Change anything by clicking it
              </span>
            </li>
            <li>
              <Icon name="card" size={20} />
              <span>
                <b>Payments built in</b>
                Accept cards from day one
              </span>
            </li>
            <li>
              <Icon name="boxes" size={20} />
              <span>
                <b>Orders and stock</b>
                Tracked in one dashboard
              </span>
            </li>
          </ul>
        </div>

        <div className="lp-stage">
          <div className="lp-dash">
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
        </div>
      </div>
    </section>
  );
}
