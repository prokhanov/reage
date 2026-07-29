import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import logoLight from "@/assets/reage-logo-light.png";
import logoLightWebp from "@/assets/reage-logo-light.png?format=webp&quality=80&w=300&url";
import logoLightAvif from "@/assets/reage-logo-light.png?format=avif&quality=70&w=300&url";
import logoDark from "@/assets/reage-logo-dark.png";
import logoDarkWebp from "@/assets/reage-logo-dark.png?format=webp&quality=80&w=300&url";
import logoDarkAvif from "@/assets/reage-logo-dark.png?format=avif&quality=70&w=300&url";
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

  const isLight = mounted && resolvedTheme === "light";
  const src = isLight ? logoDark : logoLight;
  const webp = isLight ? logoDarkWebp : logoLightWebp;
  const avif = isLight ? logoDarkAvif : logoLightAvif;

  return (
    <picture>
      <source srcSet={avif} type="image/avif" />
      <source srcSet={webp} type="image/webp" />
      <img
        src={src}
        alt={alt}
        className={cn(className)}
        width={500}
        height={681}
        decoding={eager ? "sync" : "async"}
        loading={eager ? "eager" : "lazy"}
        {...({ fetchpriority: eager ? "high" : "auto" } as Record<string, string>)}
      />
    </picture>
  );
}
