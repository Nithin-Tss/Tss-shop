import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAssistantAccess } from "@/components/AssistantPanel";
import { ImageAttach } from "@/components/TicketConversation";
import { assistantStore } from "@/lib/assistantApi";
import { useChatStore } from "@/lib/assistantChatStore";
import { apiPost } from "@/lib/api";
import { getActiveStore, useSession } from "@/lib/auth";
import { TICKETS_PATH, firstLine, getArticle, helpPath, searchArticles, ticketPath } from "@/lib/helpCenter";
import {
  MAX_MESSAGE,
  MAX_SUBJECT,
  buildSupportPayload,
  buildTranscript,
  hasChat,
  sendErrorMessage,
  validateSupport,
} from "@/lib/supportRequest";
import { ATTACHMENTS_API, TICKETS_API } from "@/lib/supportTickets";

// /admin/help/contact. Send creates a support ticket (POST /api/v1/support/tickets/) and opens its conversation
// page, where our team's replies appear. The owner chooses whether the store details and the assistant chat are
// included in the first message, and may attach up to 3 screenshots.

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";
const FIELD = `w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[15px] text-[#111827] placeholder:text-slate-400 focus:border-slate-500 ${FOCUS}`;
const DARK_BTN = `rounded-full bg-[#111827] px-6 py-2.5 text-[14px] font-semibold text-white transition hover:bg-black ${FOCUS}`;

// "Add a product (/admin/help/add-product)", or just the path
function describePage(from) {
  const path = String(from || "");
  if (path.startsWith("/admin/help/")) {
    const article = getArticle(path.split("/").pop());
    if (article) return `${article.title} (${path})`;
  }
  if (path) return path;
  try {
    const ref = document.referrer && new URL(document.referrer);
    if (ref && ref.origin === window.location.origin) return ref.pathname;
  } catch {
    /* ignore */
  }
  return "Help Center";
}

function ReadOnlyRow({ label, value }) {
  return (
    <div>
      <dt className="text-[12px] font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-[14px] text-[#111827]">{value || "-"}</dd>
    </div>
  );
}

export default function AdminHelpContact() {
  const session = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const access = useAssistantAccess();
  const { messages } = useChatStore(assistantStore);
  const chatExists = hasChat(messages);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [choice, setChoice] = useState(null); // null = follow whether a chat exists
  const [shareDetails, setShareDetails] = useState(true);
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");

  const includeChat = access && chatExists && (choice ?? true);
  const related = searchArticles(subject, 3);

  const details = {
    storeName: getActiveStore(session)?.storeName || "",
    storeId: session?.storeId || "",
    name: session?.name || "",
    email: session?.email || "",
    page: describePage(location.state?.from),
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validateSupport({ subject, message });
    setErrors(found);
    if (Object.keys(found).length || sending) return;

    setFormError("");
    setSending(true);
    const result = await apiPost(
      TICKETS_API,
      buildSupportPayload({
        subject,
        message,
        transcript: includeChat ? buildTranscript(messages) : "",
        page: shareDetails ? details.page : "",
        includeStoreDetails: shareDetails,
        attachments: images.map((image) => image.id),
      })
    );
    setSending(false);

    if (result.ok) {
      navigate(ticketPath(result.data.id));
      return;
    }
    // The server's own message; the form keeps what was typed
    const { subject: subjectError, message: messageError } = result.fieldErrors || {};
    setErrors({ ...(subjectError && { subject: subjectError }), ...(messageError && { message: messageError }) });
    setFormError(subjectError || messageError ? "" : sendErrorMessage(result));
  };

  return (
    <section className="mx-auto w-full max-w-[720px] px-5 pt-12 sm:px-8 sm:pt-20">
      <nav aria-label="Breadcrumb" className="text-[13px] text-slate-500">
        <Link to="/admin/help" className={`rounded-md hover:text-[#111827] hover:underline ${FOCUS}`}>
          Help
        </Link>{" "}
        <span aria-hidden="true">&gt;</span> <span className="text-slate-700">Contact support</span>
      </nav>
      <h1 className="mt-6 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[44px]">
        Contact support
      </h1>
      <p className="mt-4 text-[16px] text-slate-600">
        Tell us what is wrong. Our team will reply in a conversation you can follow in{" "}
        <Link to={TICKETS_PATH} className={`font-medium underline ${FOCUS}`}>
          My tickets
        </Link>
        .
      </p>

      <form onSubmit={submit} noValidate className="mt-10 space-y-6">
        <div>
          <label htmlFor="support-subject" className="text-[14px] font-medium text-[#111827]">
            Subject
          </label>
          <input
            id="support-subject"
            type="text"
            value={subject}
            maxLength={MAX_SUBJECT + 50}
            onChange={(e) => setSubject(e.target.value)}
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? "support-subject-error" : undefined}
            autoComplete="off"
            className={`mt-1.5 ${FIELD}`}
          />
          {errors.subject && (
            <p id="support-subject-error" role="alert" className="mt-1 text-[13px] text-red-700">
              {errors.subject}
            </p>
          )}
        </div>

        {related.length > 0 && (
          <div aria-live="polite">
            <h2 className="text-[14px] font-semibold text-[#111827]">Before you contact us</h2>
            <ul className="mt-2 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white p-2">
              {related.map((article) => (
                <li key={article.slug}>
                  <Link
                    to={helpPath(article.slug)}
                    className={`block rounded-lg px-2 py-3 transition hover:bg-slate-50 ${FOCUS}`}
                  >
                    <span className="block text-[14px] font-semibold text-[#111827]">{article.title}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-slate-600">{firstLine(article)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label htmlFor="support-message" className="text-[14px] font-medium text-[#111827]">
            Describe the problem
          </label>
          <textarea
            id="support-message"
            rows={7}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "support-message-error" : undefined}
            className={`mt-1.5 resize-y ${FIELD}`}
          />
          <div className="mt-1 flex justify-between gap-4 text-[13px]">
            <p id="support-message-error" role="alert" className="text-red-700">
              {errors.message}
            </p>
            <p className={message.length > MAX_MESSAGE ? "text-red-700" : "text-slate-500"}>
              {message.length}/{MAX_MESSAGE}
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-[14px] font-semibold text-[#111827]">Screenshots (optional)</h2>
          <div className="mt-2">
            <ImageAttach items={images} onChange={setImages} uploadUrl={ATTACHMENTS_API} />
          </div>
        </div>

        {access && (
          <label className="flex items-start gap-3 text-[14px] text-[#111827]">
            <input
              type="checkbox"
              checked={includeChat}
              disabled={!chatExists}
              onChange={(e) => setChoice(e.target.checked)}
              className={`mt-0.5 h-4 w-4 rounded border-slate-300 ${FOCUS}`}
            />
            <span>
              Include my chat with the assistant
              {!chatExists && <span className="block text-[13px] text-slate-500">You have no chat yet.</span>}
            </span>
          </label>
        )}

        <div>
          <label className="flex items-start gap-3 text-[14px] text-[#111827]">
            <input
              type="checkbox"
              checked={shareDetails}
              onChange={(e) => setShareDetails(e.target.checked)}
              className={`mt-0.5 h-4 w-4 rounded border-slate-300 ${FOCUS}`}
            />
            <span>Share my store details with support</span>
          </label>
          {shareDetails && (
            <dl className="mt-3 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
              <ReadOnlyRow label="Store name" value={details.storeName} />
              <ReadOnlyRow label="Store ID" value={details.storeId} />
              <ReadOnlyRow label="Your name" value={details.name} />
              <ReadOnlyRow label="Your email" value={details.email} />
              <div className="sm:col-span-2">
                <ReadOnlyRow label="Page you came from" value={details.page} />
              </div>
            </dl>
          )}
        </div>

        {formError && (
          <p role="alert" className="text-[14px] text-red-700">
            {formError}
          </p>
        )}

        <button type="submit" disabled={sending} className={`${DARK_BTN} disabled:opacity-60`}>
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
