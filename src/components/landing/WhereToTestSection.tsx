import { useEffect, useMemo, useState } from "react";
import { Home, Building2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import LabLocationsMap, {
  type LabMapItem,
  type TileStyleKey,
  type TileFilters,
  DEFAULT_FILTERS,
} from "@/components/admin/LabLocationsMap";

type CityKey = "moscow" | "spb";

const CITIES: { key: CityKey; label: string; center: [number, number]; zoom: number }[] = [
  { key: "moscow", label: "Москва и область", center: [55.7558, 37.6173], zoom: 10 },
  { key: "spb", label: "Санкт-Петербург", center: [59.9343, 30.3351], zoom: 11 },
];

const isSpb = (city: string | null) =>
  !!city && /санкт|петербург|спб/i.test(city);

const filterByCity = (items: LabMapItem[], key: CityKey) => {
  if (key === "spb") return items.filter((i) => isSpb(i.city ?? null));
  // moscow = Москва + область (всё, что не СПб)
  return items.filter((i) => !isSpb(i.city ?? null));
};

type LandingContext = {
  default_city: "moscow" | "spb";
  default_zoom: number;
  only_active: boolean;
  height_px: number;
  is_enabled: boolean;
  tile_style: TileStyleKey;
  tile_filters: TileFilters;
  show_partner_button: boolean;
  partner_button_label: string;
};

const cards = [
  {
    icon: Home,
    title: "На дому",
    subtitle: "Удобно, быстро, без поездок",
    bullets: [
      "Выезд медсестры в удобное время",
      "Забор крови за 10–15 минут",
      "Доступно по Москве, области и Санкт-Петербургу",
    ],
  },
  {
    icon: Building2,
    title: "В клинике",
    subtitle: "Десятки точек рядом с домом",
    bullets: [
      "Аккредитованные лаборатории-партнёры",
      "Удобный график работы, без очередей",
      "Доступно по Москве, области и Санкт-Петербургу",
    ],
  },
];

export function WhereToTestSection() {
  const [items, setItems] = useState<LabMapItem[]>([]);
  const [ctx, setCtx] = useState<LandingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<CityKey>("moscow");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [locsRes, ctxRes] = await Promise.all([
        supabase
          .from("lab_locations")
          .select(
            "id,title,metro,city,address_short,full_address,phones,hours,page_url,lat,lng",
          )
          .eq("is_active", true)
          .not("lat", "is", null)
          .not("lng", "is", null),
        supabase
          .from("lab_map_contexts" as never)
          .select("*")
          .eq("key", "landing")
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const locs = (locsRes.data ?? []) as unknown as LabMapItem[];
      setItems(locs);
      const c = (ctxRes.data ?? null) as unknown as LandingContext | null;
      setCtx(c);
      if (c?.default_city === "spb") setCity("spb");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => filterByCity(items, city), [items, city]);

  const cityMeta = CITIES.find((c) => c.key === city)!;
  const heightPx = Math.min(Math.max(ctx?.height_px ?? 560, 400), 720);
  const showMap = !!ctx?.is_enabled;

  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Где сдать анализы</span>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="text-foreground">Там, где </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">удобно вам</span>
          </h2>
          <p
            className="text-base md:text-lg text-muted-foreground animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Сдайте анализы дома с выездом медсестры или в одной из десятков партнёрских
            клиник — Москва, Московская область и Санкт-Петербург.
          </p>
        </div>

        {/* Two mode cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-12 md:mb-14">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="group relative animate-fade-in"
                style={{ animationDelay: `${0.1 + i * 0.1}s` }}
              >
                <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
                <div className="relative h-full rounded-3xl bg-card/50 backdrop-blur-sm border border-border/50 p-8 transition-all duration-500 group-hover:bg-card/80 group-hover:border-primary/30 group-hover:shadow-2xl group-hover:-translate-y-1">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                        {c.title}
                      </h3>
                      <div className="text-sm text-muted-foreground">{c.subtitle}</div>
                    </div>
                  </div>
                  <ul className="space-y-2.5">
                    {c.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2.5 text-[15px] text-muted-foreground"
                      >
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map block */}
      {showMap && (
        <div
          className="animate-fade-in"
          style={{
            animationDelay: "0.3s",
            position: "relative",
            width: "100vw",
            marginLeft: "calc(-50vw + 50%)",
          }}
        >
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <ToggleGroup
                type="single"
                size="sm"
                value={city}
                onValueChange={(v) => v && setCity(v as CityKey)}
                className="flex-wrap"
              >
                {CITIES.map((c) => (
                  <ToggleGroupItem key={c.key} value={c.key} aria-label={c.label}>
                    {c.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="text-sm text-muted-foreground tabular-nums">
                {loading
                  ? "Загружаем точки…"
                  : `${filtered.length} ${pluralLabs(filtered.length)} в выбранном регионе`}
              </div>
            </div>
          </div>

          <div className="border-y border-border/50 overflow-hidden shadow-xl shadow-primary/5 bg-card/50 backdrop-blur-sm">
            <LabLocationsMap
              key={city}
              items={filtered}
              center={cityMeta.center}
              zoom={cityMeta.zoom}
              fitToItems={filtered.length > 0}
              height={`${heightPx}px`}
              styleKey={ctx?.tile_style ?? "osm"}
              filters={ctx?.tile_filters ?? DEFAULT_FILTERS}
              showPartnerButton={ctx?.show_partner_button ?? true}
              showSelectButton={false}
              partnerButtonLabel={
                ctx?.partner_button_label ?? "Открыть на сайте провайдера ↗"
              }
              hideControls
              hideAttribution
            />
          </div>
        </div>
      )}
    </section>
  );
}

function pluralLabs(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "лаборатория";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "лаборатории";
  return "лабораторий";
}
