import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  isOpen?: boolean;
}

export function ThemeToggle({ isOpen = true }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = theme === "dark";

  if (!isOpen) {
    return (
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
        title={isDark ? "Светлая тема" : "Тёмная тема"}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Sun className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isDark ? (
          <>
            <Moon className="h-4 w-4" />
            <span>Тёмная тема</span>
          </>
        ) : (
          <>
            <Sun className="h-4 w-4" />
            <span>Светлая тема</span>
          </>
        )}
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
    </div>
  );
}
