import FAQ from "../components/FAQ";
import EmailCTA from "../components/EmailCTA";
import WhyChooseShop from "../components/WhyChooseShop";
import NavBar from "../components/NavBar";
import Hero from "../components/Hero";
export default function HomePage() {
  return (
    <main>
      <NavBar />
      <Hero />
      <FAQ />
      <EmailCTA />
       <WhyChooseShop />
    </main>
  );
}