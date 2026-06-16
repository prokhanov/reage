import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import * as cheerio from "npm:cheerio@1.0.0";

const sources = [
  { region: "Москва", url: "https://www.labquest.ru/adresa-i-vremya-raboty/" },
  { region: "Московская область", url: "https://www.labquest.ru/mos-oblast/adresa-i-vremya-raboty/" },
  { region: "Санкт-Петербург", url: "https://www.labquest.ru/sankt-peterburg/adresa-i-vremya-raboty/" },
];

type Clinic = {
  provider: string;
  external_id: string;
  region: string;
  metro: string | null;
  address_short: string | null;
  title: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  phones: string[];
  hours: string[];
  full_address: string | null;
  email: string | null;
  page_url: string | null;
  is_active: boolean;
  updated_at: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: only superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isSuper } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "superadmin",
    });
    if (!isSuper) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const all: Clinic[] = [];
    const byRegion: Record<string, number> = {};

    for (const source of sources) {
      const res = await fetch(source.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ReAgeBot/1.0)" },
      });
      if (!res.ok) {
        console.warn(`Failed to fetch ${source.url}: ${res.status}`);
        continue;
      }
      const html = await res.text();
      const $ = cheerio.load(html);

      const items: Clinic[] = [];
      $('li[itemtype="http://schema.org/Place"]').each((_i, el) => {
        const item = $(el);
        const pagePath =
          item.find(".gooffice").attr("href") ||
          item.find('a[href*="/adresa-i-vremya-raboty/"]').attr("href") ||
          null;

        const externalId = item.attr("data-id") || "";
        const lat = Number(item.find('[itemprop="latitude"]').first().text().trim());
        const lng = Number(item.find('[itemprop="longitude"]').first().text().trim());

        if (!externalId || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

        items.push({
          provider: "labquest",
          external_id: externalId,
          region: source.region,
          metro: item.attr("data-metro") || null,
          address_short: item.attr("data-address") || null,
          title: item.find(".title-block div").first().text().replace(/\s+/g, " ").trim() || null,
          city: item.find('[itemprop="addressLocality"]').first().text().trim() || null,
          lat,
          lng,
          phones: item.find('[itemprop="telephone"]').map((_j, x) => $(x).text().trim()).get(),
          hours: item.find(".address-worktime li").map((_j, x) => $(x).text().trim()).get(),
          full_address: item.find("a[data-office]").attr("data-office") || null,
          email: item.find("a[data-mail]").attr("data-mail") || null,
          page_url: pagePath
            ? (pagePath.startsWith("http") ? pagePath : `https://www.labquest.ru${pagePath}`).replace("?leftc=1", "")
            : null,
          is_active: true,
          updated_at: new Date().toISOString(),
        });
      });

      byRegion[source.region] = items.length;
      all.push(...items);
    }

    // Dedupe by (provider, external_id) — last occurrence wins
    const dedupMap = new Map<string, Clinic>();
    for (const c of all) dedupMap.set(`${c.provider}:${c.external_id}`, c);
    const deduped = Array.from(dedupMap.values());

    // Chunked upsert
    const CHUNK = 500;
    let upserted = 0;
    for (let i = 0; i < deduped.length; i += CHUNK) {
      const chunk = deduped.slice(i, i + CHUNK);
      const { error } = await admin
        .from("lab_locations")
        .upsert(chunk, { onConflict: "provider,external_id" });
      if (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message, upserted }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      upserted += chunk.length;
    }

    return new Response(
      JSON.stringify({ ok: true, count: upserted, by_region: byRegion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("sync-labquest-clinics error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
