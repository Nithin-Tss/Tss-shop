import FAQ from "../components/FAQ";
import EmailCTA from "../components/EmailCTA";
import WhyChooseShop from "../components/WhyChooseShop";
import NavBar from "../components/NavBar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import StoreBuilder from "../components/StoreBuilder";
export default function HomePage() {
  return (
    <main>
      <NavBar isLoggedIn={true} userName="My Account" />
      <Hero />
      <FAQ />
      <EmailCTA />
       <WhyChooseShop />
       <Footer/>
       <StoreBuilder />
    </main>
  );
}