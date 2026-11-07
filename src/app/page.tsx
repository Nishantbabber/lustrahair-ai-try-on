import { HeroSection } from "@/components/homepage/HeroSection";
import { ValuePropositionSection } from "@/components/homepage/ValuePropositionSection";
import { HowItWorksSection } from "@/components/homepage/HowItWorksSection";
import { ExploreHairstylesSection } from "@/components/homepage/ExploreHairstylesSection";
import { ForSalonsSection } from "@/components/homepage/ForSalonsSection";
import { ForWigBoutiquesSection } from "@/components/homepage/ForWigBoutiquesSection";
import { FinalCtaSection } from "@/components/homepage/FinalCtaSection";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-ivory text-charcoal">
      <HeroSection />
      <ValuePropositionSection />
      <HowItWorksSection />
      <ExploreHairstylesSection />
      <ForSalonsSection />
      <ForWigBoutiquesSection />
      <FinalCtaSection />
      <Footer />
    </div>
  );
}
