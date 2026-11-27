import { Link } from "react-router-dom";
import { Wordmark } from "@/components/Brand";
import AuthStorefront from "@/components/AuthStorefront";

// Layout for the sign-in and sign-up pages. From 1024px up the whole page is a live storefront built on TSS Shop
// (components/AuthStorefront.jsx) and the form floats over it on a paper card; below that, just the form.
export default function AuthShell({ children }) {
  return (
    <main className="auth-stage">
      <div className="auth-stage__layer">
        <section className="auth-card">
          <a href="/" className="auth-card__brand" aria-label="TSS Shop home">
            <Wordmark markSize={30} />
          </a>
          <div className="auth-card__body">{children}</div>
          <p className="auth-card__legal">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
          </p>
        </section>
      </div>
      <AuthStorefront />
    </main>
  );
}
