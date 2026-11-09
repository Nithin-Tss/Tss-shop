import { Link, useNavigate } from "react-router-dom";
import { logout } from "@/lib/api";
import { useSession } from "@/lib/auth";
import Icon from "@/components/Icons";

// Identity card + section nav shared by the customer account pages.
export default function AccountSidebar({ active }) {
  const navigate = useNavigate();
  const session = useSession();
  const user = session?.user;
  const userName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : session?.name || "Customer";
  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() ||
    userName[0]?.toUpperCase() ||
    "C";
  const emailVerified = Boolean(user?.emailVerified);
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const item = (key) =>
    key === active
      ? "bg-slate-100 text-slate-900"
      : "text-slate-600 transition hover:bg-slate-50 hover:text-slate-900";

  return (
    <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold tracking-wide text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-900">{userName}</p>
            <p className="truncate text-sm text-slate-500" title={user?.email}>
              {user?.email}
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Email status</dt>
            <dd
              className={`inline-flex items-center gap-1.5 font-medium ${
                emailVerified ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              <Icon name={emailVerified ? "check-circle" : "alert"} className="h-4 w-4" />
              {emailVerified ? "Verified" : "Unverified"}
            </dd>
          </div>
          {memberSince && (
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Member since</dt>
              <dd className="font-medium text-slate-900">{memberSince}</dd>
            </div>
          )}
        </dl>
      </div>

      <nav
        aria-label="Account sections"
        className="rounded-xl border border-slate-200 bg-white p-2"
      >
        <Link
          to="/account"
          aria-current={active === "profile" ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${item("profile")}`}
        >
          <Icon name="user" className="h-[18px] w-[18px]" />
          Profile & security
        </Link>
        <div className="my-2 border-t border-slate-200" />
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
        >
          <Icon name="logout" className="h-[18px] w-[18px]" />
          Log out
        </button>
      </nav>
    </aside>
  );
}
