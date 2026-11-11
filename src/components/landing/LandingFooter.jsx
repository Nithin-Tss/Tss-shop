import Icon from "./Icon";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ONBOARDING_PATH, STORES_PATH, useSession } from "@/lib/auth";
import { Reveal } from "./hooks";

export function LandingCTA() {
  const navigate = useNavigate();
  const signedIn = Boolean(useSession()?.token);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim()) return setError("Please enter your email address.");
    if (!email.includes("@")) return setError("Please enter a valid email address.");
    setError("");
    navigate(signedIn ? STORES_PATH : ONBOARDING_PATH);
  };

  return (
    <section style={{ paddingTop: 16 }}>
      <Reveal className="lp-cta">
        <h2 className="serif">
          Open the doors <em>this week.</em>
        </h2>
        <form onSubmit={submit} noValidate>
          <label htmlFor="lp-cta-email" className="sr-only">
            Your email
          </label>
          <input
            id="lp-cta-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <button type="submit" className="btn btn-dark">
            Start free trial <Icon name="arrow" size={16} stroke={2} className="arrow" />
          </button>
        </form>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <p className="note">14 days free. No card needed.</p>
      </Reveal>
    </section>
  );
}

const COLUMNS = [
  [
    "Store",
    [
      ["What is Store", "#"],
      ["Editions", "#"],
      ["Careers", "#"],
      ["Newsroom", "#"],
      ["Sustainability", "#"],
    ],
  ],
  [
    "Ecosystem",
    [
      ["Developer docs", "#"],
      ["Theme store", "#"],
      ["App store", "#"],
      ["Partners", "#"],
    ],
  ],
  [
    "Resources",
    [
      ["Blog", "/blog"],
      ["Guides", "#"],
      ["Free tools", "#"],
      ["Changelog", "#"],
    ],
  ],
  [
    "Support",
    [
      ["Community", "#"],
      ["Hire a partner", "#"],
      ["Service status", "#"],
    ],
  ],
];

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="wrap">
        <div className="cols">
          <div>
            <p className="brand">Store</p>
            <p>Commerce software for shops that would rather sell than configure.</p>
          </div>
          {COLUMNS.map(([title, links]) => (
            <div key={title}>
              <h4>{title}</h4>
              <ul>
                {links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="bottom">
          <span>&copy; {new Date().getFullYear()} Store. Australia, English.</span>
          <div>
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <a href="/sitemap.xml">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
