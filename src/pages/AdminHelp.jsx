import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AssistantPanel, useAssistantAccess } from "@/components/AssistantPanel";
import AdminHelpContact from "@/pages/AdminHelpContact";
import HelpArticleView from "@/components/HelpArticleView";
import HelpWidget from "@/components/HelpWidget";
import AdminHelpTicket from "@/pages/AdminHelpTicket";
import AdminHelpTickets from "@/pages/AdminHelpTickets";
import { assistantStore } from "@/lib/assistantApi";
import { useChatStore } from "@/lib/assistantChatStore";
import { can, useSession } from "@/lib/auth";
import {
  CATEGORIES,
  CONTACT_PATH,
  CONTACT_SLUG,
  OPEN_PAGES,
  TICKETS_PATH,
  firstLine,
  getArticle,
  getCategory,
  articlesIn,
  helpPath,
  relatedArticles,
  searchArticles,
  topArticles,
} from "@/lib/helpCenter";

// Help Center: /admin/help (home), /admin/help/<category>, /admin/help/<article>. All text comes from lib/helpCenter.js.

const HELP_HOME = "/admin/help";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";
const LINK = `rounded-md text-[#111827] underline-offset-4 transition hover:text-black hover:underline ${FOCUS}`;
const COLUMN = "mx-auto w-full max-w-[1040px] px-5 sm:px-8";
const NARROW = "mx-auto w-full max-w-[720px] px-5 sm:px-8";
const DARK_BTN = `rounded-full bg-[#111827] px-6 py-2.5 text-[14px] font-semibold text-white transition hover:bg-black ${FOCUS}`;
const LIGHT_BTN = `rounded-full border border-slate-200 bg-white px-5 py-1.5 text-[13px] font-medium text-[#111827] transition hover:border-slate-300 hover:bg-slate-50 ${FOCUS}`;

const icon = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function AskAssistantButton({ className = "" }) {
  const access = useAssistantAccess();
  if (!access) return null;
  return (
    <button
      type="button"
      onClick={() => assistantStore.setOpen(true)}
      className={`inline-flex items-center gap-2 rounded-md px-1 text-[14px] font-medium text-slate-600 transition hover:text-[#111827] ${FOCUS} ${className}`}
    >
      <svg {...icon} className="h-4 w-4 text-slate-500">
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
        <path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z" />
      </svg>
      Ask the assistant
    </button>
  );
}

function TopBar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className={`${COLUMN} flex h-16 items-center gap-5`}>
        <Link
          to={HELP_HOME}
          aria-label="Help Center home"
          className={`flex items-center gap-2.5 rounded-md ${FOCUS}`}
        >
          <span className="display flex h-9 w-9 items-center justify-center rounded-md bg-[#111827] text-2xl text-white">
            S
          </span>
          <span className="text-[16px] font-semibold text-[#111827]">Help</span>
        </Link>
        <div className="flex-1" />
        <AskAssistantButton className="hidden sm:inline-flex" />
        <Link
          to={TICKETS_PATH}
          className={`rounded-md px-1 text-[14px] font-medium text-slate-600 transition hover:text-[#111827] ${FOCUS}`}
        >
          My tickets
        </Link>
        <Link
          to="/admin"
          className={`rounded-md px-1 text-[14px] font-medium text-slate-600 transition hover:text-[#111827] ${FOCUS}`}
        >
          Back to admin
        </Link>
      </div>
    </header>
  );
}

// Floating "Contact support" pill (like "Chat with a human" on help.shopify.com). The open assistant panel is
// 400px wide on the right. From 1280px the page is pushed and the pill moves left of the panel; below that the
// panel covers the page, so the pill is hidden. It is not shown on the contact page itself.
function ContactPill() {
  const { pathname } = useLocation();
  const access = useAssistantAccess();
  const { open } = useChatStore(assistantStore);
  if (pathname === CONTACT_PATH) return null;
  const panelOpen = access && open;
  return (
    <Link
      to={CONTACT_PATH}
      state={{ from: pathname }}
      className={`fixed bottom-5 right-5 z-30 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-[14px] font-semibold text-[#111827] shadow-[0_4px_16px_rgba(17,24,39,0.16)] transition-[right,background-color] hover:bg-slate-50 motion-reduce:transition-none ${FOCUS} ${
        panelOpen ? "hidden xl:inline-flex xl:right-[420px]" : "inline-flex"
      }`}
    >
      <svg {...icon} className="h-5 w-5">
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z" />
        <path d="M8.5 11.5h7M8.5 14.5h4" />
      </svg>
      Contact support
    </Link>
  );
}

function Footer() {
  const { pathname } = useLocation();
  return (
    <footer className="mt-32 border-t border-slate-200 bg-white">
      <div
        className={`${COLUMN} flex flex-col items-start gap-4 py-16 sm:items-center sm:text-center`}
      >
        <h2 className="text-[22px] font-semibold tracking-tight text-[#111827]">Need more help?</h2>
        <p className="text-[15px] text-slate-600">
          Can't find what you need? Our support team will get back to you.
        </p>
        <div className="mt-2 flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          <Link
            to={CONTACT_PATH}
            state={{ from: pathname }}
            className={`inline-flex items-center justify-center gap-2 ${DARK_BTN}`}
          >
            <svg {...icon} className="h-4 w-4">
              <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z" />
              <path d="M8.5 11.5h7M8.5 14.5h4" />
            </svg>
            Contact support
          </Link>
          <Link
            to={TICKETS_PATH}
            className={`inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-2.5 text-[14px] font-semibold text-[#111827] transition hover:bg-slate-100 ${FOCUS}`}
          >
            My tickets
          </Link>
        </div>
      </div>
    </footer>
  );
}

function Breadcrumb({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-slate-500">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">&gt;</span>}
            {item.to ? (
              <Link
                to={item.to}
                className={`rounded-md hover:text-[#111827] hover:underline ${FOCUS}`}
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-slate-700">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// A row used by search results and category lists
function ArticleRow({ article, showCategory = true }) {
  const category = getCategory(article.category);
  return (
    <li>
      <Link
        to={helpPath(article.slug)}
        className={`block px-2 py-4 transition hover:bg-slate-50 ${FOCUS}`}
      >
        <span className="block text-[15px] font-semibold text-[#111827]">{article.title}</span>
        {showCategory && (
          <span className="mt-0.5 block text-[12px] font-medium text-slate-500">
            {category?.title}
          </span>
        )}
        <span className="mt-1 block truncate text-[14px] text-slate-600">{firstLine(article)}</span>
      </Link>
    </li>
  );
}

function SearchBox() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const results = searchArticles(query);
  const hasQuery = query.trim() !== "";

  const submit = (event) => {
    event.preventDefault();
    if (results[0]) navigate(helpPath(results[0].slug));
  };

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <form
        role="search"
        onSubmit={submit}
        className="flex items-center gap-3 rounded-full border border-slate-200 bg-white py-2 pl-5 pr-2 shadow-[0_2px_12px_rgba(17,24,39,0.08)] transition focus-within:border-slate-400"
      >
        <svg {...icon} className="h-5 w-5 shrink-0 text-slate-400">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask anything"
          aria-label="Search the Help Center"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-[16px] text-[#111827] outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          aria-label="Open the first result"
          disabled={!hasQuery || results.length === 0}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${FOCUS} ${
            hasQuery && results.length > 0
              ? "bg-[#111827] text-white hover:bg-black"
              : "cursor-default bg-slate-200 text-slate-400"
          }`}
        >
          <svg {...icon} className="h-5 w-5">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>

      <div aria-live="polite" className="mt-4 text-left">
        {hasQuery && results.length > 0 && (
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white p-2">
            {results.map((article) => (
              <ArticleRow key={article.slug} article={article} />
            ))}
          </ul>
        )}
        {hasQuery && results.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center">
            <p className="text-[14px] font-semibold text-[#111827]">No results</p>
            <p className="mt-1 text-[13px] text-slate-600">
              Try other words, or ask us directly.{" "}
              <Link
                to={CONTACT_PATH}
                state={{ from: pathname }}
                className={`font-medium underline ${FOCUS}`}
              >
                Contact support
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Home() {
  return (
    <>
      <section className={`${COLUMN} pb-6 pt-20 text-center sm:pt-[120px]`}>
        <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#111827] sm:text-[60px]">
          How can we help?
        </h1>
        <div className="mt-8 sm:mt-12">
          <SearchBox />
        </div>
      </section>

      <section className={`${COLUMN} mt-24`} aria-labelledby="browse-heading">
        <h2 id="browse-heading" className="text-[22px] font-semibold tracking-tight text-[#111827]">
          Browse by topic
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-x-16 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => (
            <div key={category.slug}>
              <h3>
                <Link
                  to={helpPath(category.slug)}
                  className={`rounded-md text-[18px] font-bold text-[#111827] underline-offset-4 transition hover:text-black hover:underline ${FOCUS}`}
                >
                  {category.title}
                </Link>
              </h3>
              <ul className="mt-4 space-y-3">
                {topArticles(category.slug).map((article) => (
                  <li key={article.slug}>
                    <Link to={helpPath(article.slug)} className={`text-[15px] ${LINK}`}>
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function CategoryView({ category }) {
  const articles = articlesIn(category.slug);
  return (
    <section className={`${NARROW} pt-12 sm:pt-20`}>
      <div>
        <Breadcrumb items={[{ label: "Help", to: HELP_HOME }, { label: category.title }]} />
        <h1 className="mt-6 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[44px]">
          {category.title}
        </h1>
        <p className="mt-4 text-[16px] text-slate-600">{category.summary}</p>
        <ul className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
          {articles.map((article) => (
            <ArticleRow key={article.slug} article={article} showCategory={false} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function Feedback() {
  const { pathname } = useLocation();
  const [answer, setAnswer] = useState(null);
  if (answer) {
    return (
      <p role="status" className="text-[14px] text-slate-700">
        Thanks for letting us know.{" "}
        {answer === "no" && (
          <>
            You can{" "}
            <Link
              to={CONTACT_PATH}
              state={{ from: pathname }}
              className={`font-medium underline ${FOCUS}`}
            >
              contact support
            </Link>{" "}
            if you are still stuck.
          </>
        )}
      </p>
    );
  }
  const button = LIGHT_BTN;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-[14px] font-medium text-[#111827]">Was this helpful?</p>
      <button type="button" className={button} onClick={() => setAnswer("yes")}>
        Yes
      </button>
      <button type="button" className={button} onClick={() => setAnswer("no")}>
        No
      </button>
    </div>
  );
}

function ArticleView({ article }) {
  const session = useSession();
  const category = getCategory(article.category);
  const page = article.open ? OPEN_PAGES[article.open] : null;
  const canOpen = Boolean(page) && can(session, page.permission);
  const related = relatedArticles(article);

  return (
    <article className={`${NARROW} pt-12 sm:pt-20`}>
      <div>
        <Breadcrumb
          items={[
            { label: "Help", to: HELP_HOME },
            { label: category.title, to: helpPath(category.slug) },
            { label: article.title },
          ]}
        />
        <h1 className="mt-6 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[44px]">
          {article.title}
        </h1>

        <ol className="mt-12 space-y-7">
          {article.steps.map((step, index) => (
            <li key={step} className="flex gap-4">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[13px] font-semibold text-slate-700"
              >
                {index + 1}
              </span>
              <p className="min-w-0 text-[16px] leading-7 text-[#111827]">{step}</p>
            </li>
          ))}
        </ol>

        {article.note && (
          <aside className="mt-10 border-l-2 border-slate-300 py-1 pl-5">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Note</p>
            <p className="mt-1 text-[15px] leading-7 text-slate-700">{article.note}</p>
          </aside>
        )}

        {canOpen && (
          <Link to={page.path} className={`mt-10 inline-flex ${DARK_BTN}`}>
            {page.label}
          </Link>
        )}

        <div className="mt-14 border-t border-slate-200 pt-6">
          <Feedback />
        </div>

        {related.length > 0 && (
          <section className="mt-14" aria-labelledby="related-heading">
            <h2
              id="related-heading"
              className="text-[18px] font-semibold tracking-tight text-[#111827]"
            >
              Related articles
            </h2>
            <ul className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
              {related.map((item) => (
                <ArticleRow key={item.slug} article={item} showCategory={false} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}

function NotFound() {
  return (
    <section className={`${NARROW} pt-20 text-center`}>
      <h1 className="text-[32px] font-semibold tracking-tight text-[#111827]">
        We couldn't find that article
      </h1>
      <p className="mt-3 text-[15px] text-slate-600">
        It may have moved. Try searching the Help Center.
      </p>
      <Link to={HELP_HOME} className={`mt-8 inline-flex ${DARK_BTN}`}>
        Back to Help
      </Link>
    </section>
  );
}

export default function AdminHelp() {
  const { topic, ticketId, articleSlug } = useParams();
  const { pathname } = useLocation();
  const isTickets = pathname.replace(/\/+$/, "") === TICKETS_PATH;

  // A new page starts at the top, not where the last one was scrolled to
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [topic, ticketId, articleSlug, isTickets]);

  const isContact = topic === CONTACT_SLUG;
  const category = topic && !isContact ? getCategory(topic) : null;
  const article = topic && !isContact && !category ? getArticle(topic) : null;

  let body;
  if (articleSlug) body = <HelpArticleView key={articleSlug} slug={articleSlug} />;
  else if (ticketId) body = <AdminHelpTicket key={ticketId} ticketId={ticketId} />;
  else if (isTickets) body = <AdminHelpTickets />;
  else if (!topic) body = <Home />;
  else if (isContact) body = <AdminHelpContact />;
  else if (category) body = <CategoryView category={category} />;
  else if (article) body = <ArticleView key={article.slug} article={article} />;
  else body = <NotFound />;

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <TopBar />
      <main>{body}</main>
      <Footer />
      <ContactPill />
      <AssistantPanel />
      <HelpWidget />
    </div>
  );
}
