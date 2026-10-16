import { lazy, Suspense } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import EditingThemeBar from "@/components/EditingThemeBar";
import Home from "@/pages/Home";
const Signin = lazy(() => import("@/pages/Signin"));
const Signup = lazy(() => import("@/pages/Signup"));
const StoreSelect = lazy(() => import("@/pages/StoreSelect"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Account = lazy(() => import("@/pages/Account"));
const OrderHistory = lazy(() => import("@/pages/OrderHistory"));
const EditorDemo = lazy(() => import("@/pages/EditorDemo"));
const AdminOnlineStore = lazy(() => import("@/pages/AdminOnlineStore"));
const AdminCustomize = lazy(() => import("@/pages/AdminCustomize"));
const AdminSettings = lazy(() => import("@/pages/AdminSettings"));
const AdminHome = lazy(() => import("@/pages/AdminHome"));
const AdminProducts = lazy(() => import("@/pages/AdminProducts"));
const AdminAddProduct = lazy(() => import("@/pages/AdminAddProduct"));
const AdminProductDetails = lazy(() => import("@/pages/AdminProductDetails"));
const AdminCollections = lazy(() => import("@/pages/AdminCollections"));
const AdminAddCollection = lazy(() => import("@/pages/AdminAddCollection"));
const AdminCatalogues = lazy(() => import("@/pages/AdminCatalogues"));
const AdminAddCatalogue = lazy(() => import("@/pages/AdminAddCatalogue"));
const AdminContent = lazy(() => import("@/pages/AdminContent"));
const BlogPostsPage = lazy(() =>
  import("@/pages/AdminContent").then((m) => ({ default: m.BlogPostsPage }))
);
const StorePagesPage = lazy(() => import("@/pages/AdminPages"));
const AdminMenus = lazy(() => import("@/pages/AdminMenus"));
const AdminInventory = lazy(() => import("@/pages/AdminInventory"));
const AdminOrders = lazy(() => import("@/pages/AdminOrders"));
const AdminDrafts = lazy(() => import("@/pages/AdminDrafts"));
const AdminAbandonedCheckouts = lazy(() => import("@/pages/AdminAbandonedCheckouts"));
const AdminCreateOrder = lazy(() => import("@/pages/AdminCreateOrder"));
const AdminCustomers = lazy(() => import("@/pages/AdminCustomers"));
const AdminAddCustomer = lazy(() => import("@/pages/AdminAddCustomer"));
const AdminOverview = lazy(() => import("@/pages/AdminOverview"));
const AdminReports = lazy(() => import("@/pages/AdminReports"));
const AdminReportExploration = lazy(() => import("@/pages/AdminReportExploration"));
const AdminAnalytics = lazy(() => import("@/pages/AdminAnalytics"));
const AdminDiscounts = lazy(() => import("@/pages/AdminDiscounts"));
const AdminCreateDiscount = lazy(() => import("@/pages/AdminCreateDiscount"));
const AdminShipping = lazy(() => import("@/pages/AdminShipping"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Contact = lazy(() => import("@/pages/Contact"));
const Blog = lazy(() => import("@/pages/Blog"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
import { can, useSession } from "@/lib/auth";

export default function App() {
  // Switching store remounts every page, so each one re-fetches the new store's data
  const storeId = useSession()?.storeId || "none";

  return (
    <Suspense fallback={<div className="p-8 text-sm text-neutral-500">Loading...</div>}>
      <Routes key={storeId}>
        <Route path="/" element={<Home />} />
        <Route path="/auth/signin" element={<Signin />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/stores" element={<StoreSelect />} />
        <Route path="/auth/onboarding" element={<Onboarding />} />
        {/* Admin pages and the profile need a signed-in user; otherwise go to sign-in first */}
        <Route element={<RequireSignIn />}>
          <Route path="/profile" element={<Account />} />
          <Route path="/account" element={<Account />} />
          <Route path="/account/orders" element={<OrderHistory />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/admin" element={<Navigate to="/admin/online-store/home" replace />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/online-store/home" element={<AdminHome />} />
          <Route path="/admin/online-store/settings" element={<AdminSettings />} />
          <Route path="/admin/online-store/content" element={<AdminContent />} />
          <Route path="/admin/online-store/content/menus" element={<AdminMenus />} />
          <Route
            path="/admin/online-store/menus"
            element={<Navigate to="/admin/online-store/content/menus" replace />}
          />
          <Route
            path="/admin/content/menus"
            element={<Navigate to="/admin/online-store/content/menus" replace />}
          />
          {/* Pages a role may not have (see can() in lib/auth.js); the API refuses them anyway */}
          <Route element={<RequirePermission permission="themes.view" />}>
            <Route path="/admin/online-store" element={<AdminOnlineStore />} />
          </Route>
          <Route element={<RequirePermission permission="themes.manage" />}>
            <Route
              path="/admin/online-store/customize"
              element={
                <>
                  <AdminCustomize />
                  <EditingThemeBar />
                </>
              }
            />
            <Route path="/admin/online-store/pages" element={<StorePagesPage />} />
            <Route path="/admin/online-store/blog-posts" element={<BlogPostsPage />} />
            {/* Theme code editor: it saves theme files */}
            <Route
              path="/editor-demo"
              element={
                <>
                  <EditorDemo />
                  <EditingThemeBar />
                </>
              }
            />
          </Route>
          <Route element={<RequirePermission permission="products.view" />}>
            <Route path="/admin/online-store/products" element={<AdminProducts />} />
            <Route
              path="/admin/online-store/products/:productId"
              element={<AdminProductDetails />}
            />
            <Route path="/admin/online-store/collections" element={<AdminCollections />} />
            <Route path="/admin/online-store/catalogues" element={<AdminCatalogues />} />
          </Route>
          <Route element={<RequirePermission permission="products.manage" />}>
            <Route path="/admin/online-store/products/new" element={<AdminAddProduct />} />
            <Route path="/admin/online-store/collections/new" element={<AdminAddCollection />} />
            <Route
              path="/admin/online-store/collections/:collectionId"
              element={<AdminAddCollection />}
            />
            <Route path="/admin/online-store/catalogues/new" element={<AdminAddCatalogue />} />
            <Route path="/admin/online-store/catalogs/new" element={<AdminAddCatalogue />} />
          </Route>
          <Route element={<RequirePermission permission="inventory.view" />}>
            <Route path="/admin/online-store/inventory" element={<AdminInventory />} />
          </Route>
          <Route element={<RequirePermission permission="orders.view" />}>
            <Route path="/admin/online-store/orders" element={<AdminOrders />} />
            <Route
              path="/admin/online-store/orders/abandoned-checkouts"
              element={<AdminAbandonedCheckouts />}
            />
          </Route>
          <Route element={<RequirePermission permission="draft_orders.view" />}>
            <Route path="/admin/online-store/orders/drafts" element={<AdminDrafts />} />
          </Route>
          <Route element={<RequirePermission permission="reports.view" />}>
            <Route path="/admin/online-store/overview" element={<AdminOverview />} />
            <Route path="/admin/online-store/reports" element={<AdminReports />} />
            <Route path="/admin/online-store/reports/new" element={<AdminReportExploration />} />
            <Route path="/admin/online-store/analytics/new" element={<AdminReportExploration />} />
            <Route path="/admin/online-store/analytics" element={<AdminAnalytics />} />
          </Route>
          <Route element={<RequirePermission permission="orders.manage" />}>
            <Route path="/admin/online-store/orders/create" element={<AdminCreateOrder />} />
          </Route>
          <Route element={<RequirePermission permission="customers.view" />}>
            <Route path="/admin/online-store/customers" element={<AdminCustomers />} />
          </Route>
          <Route element={<RequirePermission permission="customers.manage" />}>
            <Route path="/admin/online-store/customers/new" element={<AdminAddCustomer />} />
          </Route>
          <Route element={<RequirePermission permission="discounts.view" />}>
            <Route path="/admin/online-store/discounts" element={<AdminDiscounts />} />
            <Route path="/admin/online-store/discounts/new" element={<AdminCreateDiscount />} />
<Route
              path="/admin/online-store/discounts/new/:discountType"
              element={<AdminCreateDiscount />}
            />
<Route
              path="/admin/online-store/discounts/amount-off-products"
              element={<AdminCreateDiscount initialType="amount-off-products" />}
            />
<Route
              path="/admin/online-store/discounts/buy-x-get-y"
              element={<AdminCreateDiscount initialType="buy-x-get-y" />}
            />
<Route
              path="/admin/online-store/discounts/amount-off-order"
              element={<AdminCreateDiscount initialType="amount-off-order" />}
            />
<Route
              path="/admin/online-store/discounts/free-shipping"
              element={<AdminCreateDiscount initialType="free-shipping" />}
            />
          </Route>
          <Route element={<RequirePermission permission="shipping.view" />}>
            <Route path="/admin/online-store/shipping" element={<AdminShipping />} />
          </Route>
        </Route>
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        {/* Links sent by email (see the backend's apps/identity/email_links.py) */}
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/verify-email" element={<VerifyEmail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

// Signed out (never signed in, signed out, or the session expired): go to
// sign-in instead of showing a page whose API calls would all fail with 401.
// Sign-in brings the user back here afterwards (?next=).
function RequireSignIn() {
  const session = useSession();
  const location = useLocation();

  if (!session?.token) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/signin?next=${next}`} replace />;
  }

  return <Outlet />;
}

// The user's role in the current store doesn't allow this page: say so instead
// of showing a page whose every request would fail with 403.
function RequirePermission({ permission }) {
  const session = useSession();

  if (!can(session, permission)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <h1 className="text-3xl font-bold text-slate-900">No access</h1>
        <p className="text-sm text-slate-500">
          Your role in this store doesn't include this page. Ask the store owner if you need it.
        </p>
        <Link to="/admin/online-store/home" className="font-medium text-violet-600 hover:underline">
          Back to admin home
        </Link>
      </main>
    );
  }

  return <Outlet />;
}

// Without a catch-all, an unknown URL renders nothing: a blank page
function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-500">This page doesn't exist yet.</p>
      <Link to="/" className="font-medium text-violet-600 hover:underline">
        Back to home
      </Link>
    </main>
  );
}
