import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Button } from "./ui/button";
import { Menu } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 border-b border-border/50 bg-card/95 backdrop-blur-xl">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            ReAge
          </h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
