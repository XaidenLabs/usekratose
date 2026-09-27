import ButtonGradient from "@/components/svg/button-gradient";
import Footer from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import Benefits from "@/components/sections/benefits";
import Hero from "@/components/sections/hero";
import Pricing from "@/components/sections/pricing";
import Roadmap from "@/components/sections/roadmap";
import Services from "@/components/sections/services";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <main className="landing-root">
      <div className={cn("overflow-hidden")}>
        <Navbar />
        <Hero />
        <Benefits />
        <Services />
        <Pricing />
        <Roadmap />
        <Footer />
      </div>
      <ButtonGradient />
    </main>
  );
}
