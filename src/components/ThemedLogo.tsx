import logoLight from "@/assets/reage-logo-light.png";
import logoDark from "@/assets/reage-logo-dark.png";
import { cn } from "@/lib/utils";

interface ThemedLogoProps {
  className?: string;
  alt?: string;
}

export function ThemedLogo({ className, alt = "ReAge" }: ThemedLogoProps) {
  return (
    <>
      <img src={logoLight} alt={alt} className={cn(className, "dark:block hidden")} />
      <img src={logoDark} alt={alt} className={cn(className, "dark:hidden block")} />
    </>
  );
}
