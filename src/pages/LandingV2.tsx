import { useEffect } from "react";
import HeroSection from "@/components/landing/HeroSection";

const LandingV2 = () => {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
    </div>
  );
};

export default LandingV2;
