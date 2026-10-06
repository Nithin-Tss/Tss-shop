import FAQ from "../components/FAQ";
import EmailCTA from "../components/EmailCTA";
import WhyChooseShop from "../components/WhyChooseShop";
import NavBar from "../components/NavBar";
export default function HomePage() {
  return (
    <main>
      <NavBar />
      <FAQ />
      <EmailCTA />
       <WhyChooseShop />
    </main>
  );
}