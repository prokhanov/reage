import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DisclaimerVariant = "full" | "short";
export interface DisclaimerSettings {
  variant: DisclaimerVariant;
  full: string;
  short: string;
}

export async function fetchDisclaimer(): Promise<DisclaimerSettings | null> {
  const { data } = await (supabase as any)
    .from("site_settings")
    .select("value")
    .eq("key", "disclaimer")
    .maybeSingle();
  const v = data?.value;
  if (!v) return null;
  return { variant: v.variant === "short" ? "short" : "full", full: v.full ?? "", short: v.short ?? "" };
}

/** Абзацы активного варианта дисклеймера (null — пока грузится / нет данных). */
export function useActiveDisclaimer(): string[] | null {
  const [paras, setParas] = useState<string[] | null>(null);
  useEffect(() => {
    fetchDisclaimer().then((d) => {
      if (!d) return;
      const text = d.variant === "short" ? d.short : d.full;
      setParas(text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean));
    });
  }, []);
  return paras;
}
