import { useState } from "react";
import { Reveal, spotlight, useCountUp, useInView } from "./hooks";

function AssistantTile() {
  const [state, setState] = useState("pending");
  return (
    <div className="lp-chat">
      <div className="me">Restock the Autumn collection and rewrite the coat page.</div>
      <div className="ai">
        {state === "pending" && (
          <>
            I can raise stock on 12 items and draft a new description. Apply these changes?
            <br />
            <button type="button" onClick={() => setState("approved")}>
              Approve
            </button>
            <button type="button" className="no" onClick={() => setState("declined")}>
              Decline
            </button>
          </>
        )}
        {state === "approved" && (
          <>
            Done. Stock updated and the draft is saved.{" "}
            <button type="button" className="no" onClick={() => setState("pending")}>
              Replay
            </button>
          </>
        )}
        {state === "declined" && (
          <>
            No changes made.{" "}
            <button type="button" className="no" onClick={() => setState("pending")}>
              Replay
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StockTile() {
  const [lvl, setLvl] = useState([72, 41, 88]);
  const names = ["Coats", "Boots", "Bags"];
  return (
    <div className="lp-stock">
      {lvl.map((v, i) => (
        <div className="row" key={names[i]}>
          <span>{names[i]}</span>
          <div className="meter">
            <i style={{ width: `${v}%` }} />
          </div>
          <span style={{ width: 32, textAlign: "right" }}>{v}</span>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setLvl((l) =>
            l.map((v) => Math.max(8, Math.min(98, v + Math.round((Math.random() - 0.55) * 40))))
          )
        }
      >
        Simulate an order
      </button>
    </div>
  );
}

function ReportTile() {
  return (
    <svg className="lp-spark" viewBox="0 0 300 90" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="lp-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff8a3d" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff8a3d" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 70 C30 60 45 66 70 50 S120 52 150 36 S210 40 240 20 S280 14 300 8 V90 H0Z"
        fill="url(#lp-g)"
      />
      <path
        className="line"
        d="M0 70 C30 60 45 66 70 50 S120 52 150 36 S210 40 240 20 S280 14 300 8"
        fill="none"
        stroke="#ff8a3d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RolesTile() {
  const [perms, setPerms] = useState({ orders: true, products: true, reports: false, keys: false });
  const labels = {
    orders: "Manage orders",
    products: "Edit products",
    reports: "View reports",
    keys: "Issue API keys",
  };
  return (
    <div className="lp-keys">
      {Object.entries(labels).map(([k, label]) => (
        <label key={k}>
          {label}
          <input
            type="checkbox"
            checked={perms[k]}
            onChange={() => setPerms((p) => ({ ...p, [k]: !p[k] }))}
          />
          <span className="lp-switch" />
        </label>
      ))}
    </div>
  );
}

function Stat({ to, suffix = "", label, start }) {
  const v = useCountUp(to, start);
  return (
    <div>
      <b>
        {Math.round(v)}
        {suffix}
      </b>
      <span>{label}</span>
    </div>
  );
}

export default function LandingDark() {
  const [statsRef, seen] = useInView({ threshold: 0.4 });
  return (
    <section className="lp-dark lp-section" id="pricing" style={{ marginTop: 0 }}>
      <div className="wrap">
        <Reveal className="lp-head split">
          <div style={{ display: "grid", gap: 18 }}>
            <span className="eyebrow">Under the hood</span>
            <h2 className="serif">
              The unglamorous parts, done <em>properly.</em>
            </h2>
          </div>
          <p>Try the controls. This is how the real thing behaves.</p>
        </Reveal>

        <div className="lp-bento">
          <Reveal className="lp-tile c1" onMouseMove={spotlight}>
            <div>
              <h3>Assistant that edits, not just chats</h3>
              <p>
                Ask it to restock a collection or rewrite a product page. It proposes the change;
                you approve it.
              </p>
            </div>
            <div className="vis">
              <AssistantTile />
            </div>
          </Reveal>
          <Reveal delay={100} className="lp-tile c2" onMouseMove={spotlight}>
            <div>
              <h3>Inventory you can trust</h3>
              <p>
                Counts move with every order, return and transfer, with an audit trail behind each
                number.
              </p>
            </div>
            <div className="vis">
              <StockTile />
            </div>
          </Reveal>
          <Reveal className="lp-tile c3" onMouseMove={spotlight}>
            <div>
              <h3>Reports without exporting</h3>
              <p>
                Sales, customers and abandoned checkouts in one place, filterable down to a single
                product.
              </p>
            </div>
            <div className="vis">
              <ReportTile />
            </div>
          </Reveal>
          <Reveal delay={100} className="lp-tile c4" onMouseMove={spotlight}>
            <div>
              <h3>Roles and keys</h3>
              <p>
                Give staff exactly the access they need. Issue API keys that can be revoked in one
                click.
              </p>
            </div>
            <div className="vis">
              <RolesTile />
            </div>
          </Reveal>
        </div>

        <div className="lp-stats" ref={statsRef}>
          <Stat start={seen} to={14} label="days free to try" />
          <Stat start={seen} to={0} label="credit cards needed" />
          <Stat start={seen} to={5} label="trade-specific themes" />
          <Stat start={seen} to={100} suffix="%" label="of template code is editable" />
        </div>
      </div>
    </section>
  );
}
