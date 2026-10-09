import { Link, Route, Routes } from "react-router-dom";

import Home from "@/pages/Home";
import Signin from "@/pages/Signin";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import Profile from "@/pages/Profile";
import EditorDemo from "@/pages/EditorDemo";
import AdminOnlineStore from "@/pages/AdminOnlineStore";
import AdminCustomize from "@/pages/AdminCustomize";
import AdminSettings from "@/pages/AdminSettings";
import AdminHome from "@/pages/AdminHome";
import AdminProducts from "@/pages/AdminProducts";
import AdminAddProduct from "@/pages/AdminAddProduct";
import AdminCollections from "@/pages/AdminCollections";
import AdminAddCollection from "@/pages/AdminAddCollection";
import AdminCatalogues from "@/pages/AdminCatalogues";
import AdminContent from "@/pages/AdminContent";
import AdminInventory from "@/pages/AdminInventory";
import AdminOrders from "@/pages/AdminOrders";
import AdminDrafts from "@/pages/AdminDrafts";
import AdminCreateOrder from "@/pages/AdminCreateOrder";
import AdminCustomers from "@/pages/AdminCustomers";
import AdminAddCustomer from "@/pages/AdminAddCustomer";
import AdminOverview from "@/pages/AdminOverview";
import AdminReports from "@/pages/AdminReports";
import AdminAnalytics from "@/pages/AdminAnalytics";
import AdminDiscounts from "@/pages/AdminDiscounts";
import AdminShipping from "@/pages/AdminShipping";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Contact from "@/pages/Contact";
import Blog from "@/pages/Blog";
import ForgotPassword from "@/pages/ForgotPassword";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth/signin" element={<Signin />} />
      <Route path="/auth/signup" element={<Signup />} />
      <Route path="/auth/onboarding" element={<Onboarding />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/editor-demo" element={<EditorDemo />} />
      <Route path="/admin/online-store" element={<AdminOnlineStore />} />
      <Route path="/admin/online-store/customize" element={<AdminCustomize />} />
      <Route path="/admin/settings" element={<AdminSettings />} />
      <Route path="/admin/online-store/home" element={<AdminHome />} />
      <Route path="/admin/online-store/products" element={<AdminProducts />} />
      <Route path="/admin/online-store/products/new" element={<AdminAddProduct />} />
      <Route path="/admin/online-store/collections" element={<AdminCollections />} />
      <Route path="/admin/online-store/collections/new" element={<AdminAddCollection />} />
      <Route path="/admin/online-store/catalogues" element={<AdminCatalogues />} />
      <Route path="/admin/online-store/content" element={<AdminContent />} />
      <Route path="/admin/online-store/inventory" element={<AdminInventory />} />
      <Route path="/admin/online-store/orders" element={<AdminOrders />} />
      <Route path="/admin/online-store/orders/drafts" element={<AdminDrafts />} />
      <Route path="/admin/online-store/orders/create" element={<AdminCreateOrder />} />
      <Route path="/admin/online-store/customers" element={<AdminCustomers />} />
      <Route path="/admin/online-store/customers/new" element={<AdminAddCustomer />} />
      <Route path="/admin/online-store/overview" element={<AdminOverview />} />
      <Route path="/admin/online-store/reports" element={<AdminReports />} />
      <Route path="/admin/online-store/analytics" element={<AdminAnalytics />} />
      <Route path="/admin/online-store/settings" element={<AdminSettings />} />
      <Route path="/admin/online-store/discounts" element={<AdminDiscounts />} />
      <Route path="/admin/online-store/shipping" element={<AdminShipping />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Without a catch-all, an unknown URL renders nothing: a blank page
function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-500">This page doesn't exist yet.</p>
      <Link to="/" className="font-medium text-blue-600 hover:underline">
        Back to home
      </Link>
    </main>
  );
}
