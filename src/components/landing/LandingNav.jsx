import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { ONBOARDING_PATH, STORES_PATH, useSession } from "@/lib/auth";

const links = [
  { name: "Features", href: "#features" },
  { name: "Themes", href: `${ONBOARDING_PATH}?step=themes`, route: true },
  { name: "Pricing", href: "#pricing" },
  { name: "Resources", href: "#resources" },
  { name: "Blog", href: "/blog", route: true },
];

export default function LandingNav() {
  const session = useSession();
  const pathname = useLocation().pathname;
  const profileHref = `/profile?from=${encodeURIComponent(pathname || "/")}`;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const item = (l, cls) =>
    l.route ? (
      <Link key={l.name} to={l.href} className={cls} onClick={() => setOpen(false)}>
        {l.name}
      </Link>
    ) : (
      <a key={l.name} href={l.href} className={cls} onClick={() => setOpen(false)}>
        {l.name}
      </a>
    );

  return (
    <header className={`lp-nav ${scrolled ? "scrolled" : ""}`}>
      <div className="bar">
        <a href="#top" className="logo" aria-label="Store home">
          <i>
            <Icon name="bag" size={16} stroke={2} />
          </i>{" "}
          Store
        </a>
        <nav className="links" aria-label="Primary">
          {links.map((l) => item(l))}
        </nav>
        <div className="actions">
          {session ? (
            <Link to={profileHref} className="login">
              {session.name || "My Account"}
            </Link>
          ) : (
            <Link to="/auth/signin" className="login">
              Login
            </Link>
          )}
          <Link to={session?.token ? STORES_PATH : ONBOARDING_PATH} className="btn btn-dark">
            {session?.token ? "Your stores" : "Create Store"}
          </Link>
          <button
            type="button"
            className="burger"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                d={open ? "M6 18L18 6M6 6l12 12" : "M4 7h16M4 12h16M4 17h16"}
              />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="sheet">
          {links.map((l) => item(l))}
          {!session && (
            <Link to="/auth/signin" onClick={() => setOpen(false)}>
              Login
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
