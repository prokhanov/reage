import { AppSidebar } from "./AppSidebar";
import { Button } from "./ui/button";
import { SidebarProvider, SidebarTrigger } from "./ui/sidebar";
import { Menu } from "lucide-react";
import reAgeLogo from "@/assets/reage-logo.png";
import { AnalysisBookingBanner } from "@/components/AnalysisBookingBanner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex bg-gradient-dark">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          {/* Mobile header */}
          <header className="lg:hidden fixed top-0 left-0 right-0 z-30 border-b border-border/30 bg-secondary/90 backdrop-blur-xl">
            <div className="flex items-center justify-between p-4">
              <SidebarTrigger>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SidebarTrigger>
              <img src={reAgeLogo} alt="ReAge" className="h-8 w-auto" />
              <div className="w-10" />
            </div>
          </header>

          {/* Main content */}
          <main className="pt-16 lg:pt-0 flex-1 w-full">
            <AnalysisBookingBanner />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
