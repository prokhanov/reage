import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import dashboardImg from "@/assets/register-hero.png";
import healthImg from "@/assets/register-health.png";
import profileImg from "@/assets/register-profile.png";

export function HeroShowcase() {
  const [view, setView] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="relative mt-16 md:mt-24 px-4">
      {/* View Toggle */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <span className={`text-sm font-medium transition-colors ${view === "desktop" ? "text-foreground" : "text-muted-foreground"}`}>
          Десктоп
        </span>
        <button
          onClick={() => setView(view === "desktop" ? "mobile" : "desktop")}
          className="relative w-14 h-8 rounded-full bg-muted/50 border border-border/50 p-1 transition-colors hover:border-primary/30"
          aria-label="Переключить вид"
        >
          <div
            className={`absolute top-1 w-6 h-6 rounded-full bg-primary shadow-lg transition-all duration-300 flex items-center justify-center ${
              view === "mobile" ? "left-7" : "left-1"
            }`}
          >
            {view === "desktop" ? (
              <Monitor className="w-3 h-3 text-primary-foreground" />
            ) : (
              <Smartphone className="w-3 h-3 text-primary-foreground" />
            )}
          </div>
        </button>
        <span className={`text-sm font-medium transition-colors ${view === "mobile" ? "text-foreground" : "text-muted-foreground"}`}>
          Мобильный
        </span>
      </div>

      {/* Showcase Container */}
      <div className="relative max-w-6xl mx-auto">
        {/* Floating Stat Cards - Left */}
        <div className="absolute left-0 top-1/4 -translate-x-1/2 hidden lg:block animate-float z-20">
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-xl">
            <div className="text-xs text-muted-foreground mb-1">Биовозраст</div>
            <div className="text-3xl font-bold text-primary">32</div>
            <div className="text-xs text-status-good mt-1">−3 года</div>
          </div>
        </div>

        <div className="absolute left-4 bottom-1/4 hidden lg:block animate-float-delayed z-20">
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-xl">
            <div className="text-xs text-muted-foreground mb-1">Индекс здоровья</div>
            <div className="text-3xl font-bold text-status-good">87%</div>
            <div className="text-xs text-muted-foreground mt-1">Отлично</div>
          </div>
        </div>

        {/* Floating Stat Cards - Right */}
        <div className="absolute right-0 top-1/3 translate-x-1/2 hidden lg:block animate-float-slow z-20">
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-xl">
            <div className="text-xs text-muted-foreground mb-1">Биомаркеров</div>
            <div className="text-3xl font-bold text-foreground">50+</div>
            <div className="text-xs text-muted-foreground mt-1">анализируется</div>
          </div>
        </div>

        <div className="absolute right-8 bottom-1/3 hidden lg:block animate-float z-20">
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-xl">
            <div className="text-xs text-muted-foreground mb-1">AI-рекомендаций</div>
            <div className="text-3xl font-bold text-accent">12</div>
            <div className="text-xs text-muted-foreground mt-1">персональных</div>
          </div>
        </div>

        {/* Main Mockup */}
        <div 
          className={`relative mx-auto transition-all duration-500 ${
            view === "mobile" ? "max-w-xs" : "max-w-4xl"
          }`}
        >
          {/* Browser Chrome */}
          <div className="bg-card/90 backdrop-blur-xl rounded-t-2xl border border-border/50 border-b-0 p-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-status-warning/60" />
              <div className="w-3 h-3 rounded-full bg-status-good/60" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-muted/50 rounded-lg px-4 py-1.5 text-xs text-muted-foreground text-center">
                reage.lovable.app/dashboard
              </div>
            </div>
          </div>

          {/* Screen Content */}
          <div className="bg-card/50 backdrop-blur-xl rounded-b-2xl border border-border/50 border-t-0 overflow-hidden shadow-2xl">
            <div className={`relative ${view === "mobile" ? "aspect-[9/16]" : "aspect-video"}`}>
              {/* Main Dashboard Image */}
              <img
                src={dashboardImg}
                alt="Dashboard Preview"
                className="w-full h-full object-cover object-top"
              />
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
            </div>
          </div>
        </div>

        {/* Secondary Floating Screens */}
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 hidden xl:block z-10">
          <div className="w-32 rounded-xl overflow-hidden border border-border/30 shadow-xl rotate-[-8deg] opacity-60 hover:opacity-100 transition-opacity">
            <img src={healthImg} alt="Health Screen" className="w-full" />
          </div>
        </div>

        <div className="absolute -right-8 top-1/2 -translate-y-1/2 hidden xl:block z-10">
          <div className="w-32 rounded-xl overflow-hidden border border-border/30 shadow-xl rotate-[8deg] opacity-60 hover:opacity-100 transition-opacity">
            <img src={profileImg} alt="Profile Screen" className="w-full" />
          </div>
        </div>

        {/* Bottom Decorative Elements */}
        <div className="flex justify-center gap-4 mt-8 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur border border-border/30 rounded-full text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-status-good animate-pulse" />
            Данные в реальном времени
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur border border-border/30 rounded-full text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            AI-анализ активен
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur border border-border/30 rounded-full text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Персональные рекомендации
          </div>
        </div>
      </div>
    </div>
  );
}
