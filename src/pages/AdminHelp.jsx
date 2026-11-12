import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import HelpArticleView from "@/components/HelpArticleView";
import { HelpChatPage } from "@/components/HelpWidget";
import { can, useSession } from "@/lib/auth";
import {
  OPEN_PAGES,
  firstLine,
  getArticle,
  getCategory,
  articlesIn,
  helpPath,
  relatedArticles,
} from "@/lib/helpCenter";

// Help Center: /admin/help (home), /admin/help/<category>, /admin/help/<article>. All text comes from lib/helpCenter.js.

const HELP_HOME = "/admin/help";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";
const COLUMN = "mx-auto w-full max-w-[1040px] px-5 sm:px-8";
const NARROW = "mx-auto w-full max-w-[720px] px-5 sm:px-8";
const DARK_BTN = `rounded-full bg-[#111827] px-6 py-2.5 text-[14px] font-semibold text-white transition hover:bg-black ${FOCUS}`;
const LIGHT_BTN = `rounded-full border border-slate-200 bg-white px-5 py-1.5 text-[13px] font-medium text-[#111827] transition hover:border-slate-300 hover:bg-slate-50 ${FOCUS}`;

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
      </div>
    </header>
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
  const [answer, setAnswer] = useState(null);
  if (answer) {
    return (
      <p role="status" className="text-[14px] text-slate-700">
        Thanks for letting us know.{" "}
        {answer === "no" && (
          <>
            Ask in the{" "}
            <Link to={HELP_HOME} className={`font-medium underline ${FOCUS}`}>
              Help chat
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
  const { topic, articleSlug } = useParams();

  // A new page starts at the top, not where the last one was scrolled to
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [topic, articleSlug]);

  const category = topic ? getCategory(topic) : null;
  const article = topic && !category ? getArticle(topic) : null;

  let body;
  if (articleSlug) body = <HelpArticleView key={articleSlug} slug={articleSlug} />;
  else if (!topic) body = <HelpChatPage />;
  else if (category) body = <CategoryView category={category} />;
  else if (article) body = <ArticleView key={article.slug} article={article} />;
  else body = <NotFound />;

  // The admin sidebar stays beside every Help page
  return (
    <div className="min-h-screen bg-slate-100 text-[#111827]">
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />
        <div className="min-w-0 flex-1 bg-white">
          <TopBar />
          <main>{body}</main>
        </div>
      </div>
    </div>
  );
}
