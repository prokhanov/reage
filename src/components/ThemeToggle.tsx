import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="relative w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center"
        disabled
      >
        <Sun className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "relative w-10 h-10 rounded-full transition-all duration-300 ease-in-out",
        "bg-gradient-to-br from-primary/20 to-primary/10",
        "hover:from-primary/30 hover:to-primary/20 hover:scale-110",
        "active:scale-95",
        "border border-primary/20 hover:border-primary/40",
        "shadow-sm hover:shadow-md"
      )}
      title={theme === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <Sun
          className={cn(
            "absolute h-4 w-4 text-primary transition-all duration-300",
            theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
          )}
        />
        <Moon
          className={cn(
            "absolute h-4 w-4 text-primary transition-all duration-300",
            theme === "dark" ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          )}
        />
      </div>
    </button>
  );
}
