import { useTheme } from "next-themes";
import logoLight from "@/assets/reage-logo-light.png";
import logoDark from "@/assets/reage-logo-dark.png";

export function useThemedLogo() {
  const { resolvedTheme } = useTheme();
  // light theme = light background → use dark logo (visible on light bg)
  // dark theme = dark background → use light logo (visible on dark bg)
  return resolvedTheme === "light" ? logoDark : logoLight;
}
