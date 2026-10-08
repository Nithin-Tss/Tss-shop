import { Route, Routes } from "react-router-dom";

import Home from "@/pages/Home";
import Signin from "@/pages/Signin";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import Profile from "@/pages/Profile";
import EditorDemo from "@/pages/EditorDemo";
import AdminOnlineStore from "@/pages/AdminOnlineStore";
import AdminHome from "@/pages/AdminHome";
import AdminProducts from "@/pages/AdminProducts";
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
import AdminSettings from "@/pages/AdminSettings";    
import AdminDiscounts from "@/pages/AdminDiscounts";
import AdminShipping from "@/pages/AdminShipping";

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
      <Route path="/admin/online-store/home" element={<AdminHome />} />
      <Route path="/admin/online-store/products" element={<AdminProducts />} />
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
    </Routes>
  );
}
