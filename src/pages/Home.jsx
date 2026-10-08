import FAQ from "@/components/FAQ";
import StoreBuilder from "@/components/StoreBuilder";
import EmailCTA from "@/components/EmailCTA";
import WhyChooseShop from "@/components/WhyChooseShop";
import NavBar from "@/components/NavBar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main>
      <NavBar />
      <Hero />
      <StoreBuilder />
      <FAQ />
      <EmailCTA />
       <WhyChooseShop />
       <Footer/>
    </main>
  );
}