import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_TO_DB_CODE } from "@/lib/biomarkerCodeMap";

let cache: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

async function loadNames(): Promise<Record<string, string>> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase.from("biomarkers").select("code, name");
    const map: Record<string, string> = {};
    (data || []).forEach((b: any) => {
      if (b?.code && b?.name) map[b.code] = b.name;
    });
    cache = map;
    inflight = null;
    return map;
  })();
  return inflight;
}

export function useBiomarkerNames() {
  const [nameByCode, setNameByCode] = useState<Record<string, string>>(cache || {});

  useEffect(() => {
    if (cache) return;
    let alive = true;
    loadNames().then((m) => {
      if (alive) setNameByCode(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  const format = (code: string | null | undefined): string => {
    if (!code) return "";
    if (nameByCode[code]) return nameByCode[code];
    const mapped = DEMO_TO_DB_CODE[code];
    if (mapped && nameByCode[mapped]) return nameByCode[mapped];
    return code;
  };

  return { nameByCode, format };
}
