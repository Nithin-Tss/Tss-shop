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
import AdminCatalogues from "@/pages/AdminCatalogues";
import AdminContent from "@/pages/AdminContent";
import AdminInventory from "@/pages/AdminInventory";
import AdminOrders from "@/pages/AdminOrders";
import AdminOverview from "@/pages/AdminOverview";
import AdminReports from "@/pages/AdminReports";
import AdminAnalytics from "@/pages/AdminAnalytics";
import AdminDiscounts from "@/pages/AdminDiscounts";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import AdminShipping from "@/pages/AdminShipping";
import Contact from "@/pages/Contact";
import Blog from "@/pages/Blog";   


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
      <Route path="/admin/online-store/catalogues" element={<AdminCatalogues />} />
      <Route path="/admin/online-store/content" element={<AdminContent />} />
      <Route path="/admin/online-store/inventory" element={<AdminInventory />} />
      <Route path="/admin/online-store/orders" element={<AdminOrders />} />
      <Route path="/admin/online-store/overview" element={<AdminOverview />} />
      <Route path="/admin/online-store/reports" element={<AdminReports />} />
      <Route path="/admin/online-store/analytics" element={<AdminAnalytics />} />
      <Route path="/admin/online-store/discounts" element={<AdminDiscounts />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />   
      <Route path="/admin/online-store/shipping" element={<AdminShipping />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/blog" element={<Blog />} />
      
    </Routes>
  );
}
