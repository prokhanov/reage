import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-3 px-4 py-2.5"
      >
        <Sun className="h-4 w-4" />
        <span className="font-medium">Тема</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-full justify-start gap-3 px-4 py-2.5 hover:bg-primary/10 hover:text-primary transition-all duration-200"
    >
      {theme === "dark" ? (
        <>
          <Sun className="h-4 w-4" />
          <span className="font-medium">Светлая тема</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span className="font-medium">Темная тема</span>
        </>
      )}
    </Button>
  );
}
