import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { Button } from "./ui/button";
import { Menu, PanelLeftOpen } from "lucide-react";
import { ThemedLogo } from "@/components/ThemedLogo";
import { AnalysisBookingBanner } from "@/components/AnalysisBookingBanner";
import { DemoBanner } from "@/components/DemoBanner";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { useUserRole } from "@/hooks/useUserRole";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { demoMode, toggleDemoMode } = useDemoMode();

  // Баннер показываем всегда, когда демо-режим включён — и у пациента,
  // и у админа (в том числе в режиме "просмотр как пациент").
  const canShowDemoBanner = demoMode;


  

  // Set initial state based on screen size
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024;
    setSidebarOpen(isDesktop);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-dark">
      <AppSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 border-b border-border/60 bg-background">
        <div className="flex h-full items-center justify-between px-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => setSidebarOpen(true)}
            aria-label="Открыть меню"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <ThemedLogo className="h-7 w-auto" />
          <div className="w-10" />
        </div>
      </header>

      {/* Main content */}
      <main className={`pt-14 lg:pt-0 min-h-screen transition-all duration-300 min-w-0 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
        <div className="px-4 md:px-8 pt-4 md:pt-8 space-y-4">
          {canShowDemoBanner && <DemoBanner onToggleDemoMode={() => toggleDemoMode(false)} />}
          <AnalysisBookingBanner />
        </div>
        {children}
      </main>
    </div>
  );
}
