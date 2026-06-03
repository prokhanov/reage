import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import logoLight from "@/assets/reage-logo-light.png";
import logoDark from "@/assets/reage-logo-dark.png";
import { cn } from "@/lib/utils";

interface ThemedLogoProps {
  className?: string;
  alt?: string;
  eager?: boolean;
}

export function ThemedLogo({ className, alt = "ReAge", eager = false }: ThemedLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // До монтирования отдаём light-логотип (default theme = dark → light logo).
  // Это позволяет браузеру декодировать только ОДНУ картинку, не две.
  const src = !mounted || resolvedTheme !== "light" ? logoLight : logoDark;

  return (
    <img
      src={src}
      alt={alt}
      className={cn(className)}
      width={500}
      height={681}
      decoding="async"
      loading={eager ? "eager" : "lazy"}
      // @ts-ignore — fetchpriority валидный HTML-атрибут
      fetchpriority={eager ? "high" : "auto"}
    />
  );
}
