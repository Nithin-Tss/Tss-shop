import "@/components/landing/landing.css";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import LandingDark from "@/components/landing/LandingDark";
import { Faq, Marquee, Steps, TradeExplorer } from "@/components/landing/LandingSections";
import { LandingCTA, LandingFooter } from "@/components/landing/LandingFooter";

export default function HomePage() {
  return (
    <main className="lp">
      <LandingNav />
      <LandingHero />
      <Marquee />
      <TradeExplorer />
      <Steps />
      <LandingDark />
      <Faq />
      <LandingCTA />
      <LandingFooter />
    </main>
  );
}
