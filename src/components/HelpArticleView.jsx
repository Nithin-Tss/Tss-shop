import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AssistantMarkdown from "@/components/AssistantMarkdown";
import { articleToMarkdown, getHelpArticle } from "@/lib/helpAssistantApi";

// /admin/help/articles/:slug: one published help article (the ones the Help chat links to)
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";

export default function HelpArticleView({ slug }) {
  const [state, setState] = useState({ loading: true, error: "", article: null });

  useEffect(() => {
    let alive = true;
    getHelpArticle(slug).then((res) => {
      if (!alive) return;
      setState(
        res.ok
          ? { loading: false, error: "", article: res.article }
          : { loading: false, error: "We couldn't find that article.", article: null }
      );
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  const { loading, error, article } = state;
  return (
    <section className="mx-auto w-full max-w-[720px] px-5 pt-12 sm:px-8 sm:pt-20">
      <nav aria-label="Breadcrumb" className="text-[13px] text-slate-500">
        <Link
          to="/admin/help"
          className={`rounded-md hover:text-[#111827] hover:underline ${FOCUS}`}
        >
          Help
        </Link>{" "}
        <span aria-hidden="true">&gt;</span> <span className="text-slate-700">Article</span>
      </nav>
      {loading && <p className="mt-10 text-[15px] text-slate-600">Loading...</p>}
      {error && (
        <p role="alert" className="mt-10 text-[14px] text-red-700">
          {error}
        </p>
      )}
      {article && (
        <>
          <h1 className="mt-6 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[44px]">
            {article.title}
          </h1>
          <div className="mt-8 text-[15px] leading-7 text-slate-800">
            <AssistantMarkdown text={articleToMarkdown(article.body, article.title)} />
          </div>
        </>
      )}
    </section>
  );
}
