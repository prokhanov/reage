import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { Button } from "./ui/button";
import { Menu, PanelLeftOpen } from "lucide-react";
import reAgeLogo from "@/assets/reage-logo.png";
import { AnalysisBookingBanner } from "@/components/AnalysisBookingBanner";
import { useDemoMode } from "@/hooks/useDemoMode";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { demoMode } = useDemoMode();

  // Set initial state based on screen size
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024;
    setSidebarOpen(isDesktop);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-dark">
      <AppSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Desktop floating trigger button (when sidebar is closed) */}
      {!sidebarOpen && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className={`hidden lg:flex fixed left-4 z-40 bg-secondary/90 backdrop-blur-xl border-border/50 hover:bg-secondary hover:border-primary/50 transition-all ${demoMode ? 'top-20' : 'top-4'}`}
          title="Открыть боковую панель"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
      )}
      
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 border-b border-border/30 bg-secondary/90 backdrop-blur-xl">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <img src={reAgeLogo} alt="ReAge" className="h-8 w-auto" />
          <div className="w-10" />
        </div>
      </header>

      {/* Analysis Booking Banner */}
      <div className={`pt-16 lg:pt-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        <AnalysisBookingBanner />
      </div>

      {/* Main content */}
      <main className={`pt-16 lg:pt-0 min-h-screen transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        {children}
      </main>
    </div>
  );
}
