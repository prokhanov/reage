import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { LabMapItem } from "@/components/admin/LabLocationsMap";

const LabLocationsMap = lazy(() => import("@/components/admin/LabLocationsMap"));

type CityKey = "msk" | "spb";

const CITIES: { key: CityKey; label: string; center: [number, number]; zoom: number }[] = [
  { key: "msk", label: "Москва и МО", center: [55.7558, 37.6173], zoom: 10 },
  { key: "spb", label: "Санкт-Петербург", center: [59.9386, 30.3141], zoom: 11 },
];

const cityOf = (item: LabMapItem): CityKey => (item.lat > 58 ? "spb" : "msk");

function detectCity(): CityKey {
  if (typeof window === "undefined") return "msk";
  const saved = window.localStorage.getItem("energy_city");
  if (saved === "msk" || saved === "spb") return saved;
  return "msk";
}

export function EnergyWhereToTest() {
  const [items, setItems] = useState<LabMapItem[]>([]);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [city, setCity] = useState<CityKey>(detectCity);
  const [cityTouched, setCityTouched] = useState(false);
  const [mapHeight, setMapHeight] = useState(420);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setMapHeight(w < 640 ? Math.max(260, Math.round(window.innerHeight * 0.45)) : w < 1024 ? 380 : 420);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("energy_city")) return;
    let cancelled = false;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 2000);
    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
        const geo = (await res.json()) as { region?: string; city?: string; latitude?: number };
        if (cancelled) return;
        const text = `${geo.region ?? ""} ${geo.city ?? ""}`.toLowerCase();
        const isSpb =
          text.includes("petersburg") ||
          text.includes("петербург") ||
          text.includes("leningrad") ||
          (typeof geo.latitude === "number" && geo.latitude > 58 && geo.latitude < 61);
        if (isSpb) setCity((c) => (cityTouched ? c : "spb"));
      } catch {
        /* геолокация недоступна — остаёмся на Москве */
      } finally {
        window.clearTimeout(timer);
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectCity = (next: CityKey) => {
    setCityTouched(true);
    setCity(next);
    setSelectedId(null);
    setShowAll(false);
    if (typeof window !== "undefined") window.localStorage.setItem("energy_city", next);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("lab_locations")
        .select("id,title,metro,city,address_short,full_address,phones,hours,page_url,lat,lng")
        .eq("is_active", true)
        .not("lat", "is", null)
        .not("lng", "is", null);
      if (cancelled) return;
      setItems((data ?? []) as unknown as LabMapItem[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cityItems = useMemo(() => items.filter((i) => cityOf(i) === city), [items, city]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cityItems;
    return cityItems.filter((i) =>
      [i.title, i.metro, i.city, i.address_short, i.full_address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [cityItems, query]);

  const visible = showAll ? filtered : filtered.slice(0, 3);

  return (
    <section className="border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-12 md:px-6 md:py-16">
        <h2 className="font-display text-2xl text-foreground md:text-3xl">Где сдавать анализы</h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Выберите удобное отделение — записываться заранее не нужно.
        </p>

        <div className="mt-6 inline-flex rounded-xl border hairline bg-card p-1">
          {CITIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => selectCity(c.key)}
              aria-pressed={city === c.key}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                city === c.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={city === "spb" ? "Адрес или метро в Санкт-Петербурге" : "Адрес или метро в Москве и МО"}
                className="pl-9"
                aria-label="Поиск отделения по адресу или метро"
              />
            </div>

            <ul className="mt-4 space-y-3">
              {visible.map((loc) => (
                <li
                  key={loc.id}
                  className="flex items-start justify-between gap-4 rounded-xl border hairline bg-card p-4"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{loc.title}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">
                        {loc.metro ? `м. ${loc.metro} · ` : ""}
                        {loc.address_short || loc.full_address}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant={selectedId === loc.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedId(loc.id)}
                  >
                    {selectedId === loc.id ? "Выбрано" : "Выбрать"}
                  </Button>
                </li>
              ))}
              {visible.length === 0 && (
                <li className="rounded-xl border hairline bg-card p-4 text-sm text-muted-foreground">
                  Ничего не нашлось — попробуйте другой запрос.
                </li>
              )}
            </ul>

            {filtered.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-4 text-sm font-medium text-primary hover:underline"
              >
                {showAll ? "Свернуть список" : `Показать все адреса (${filtered.length})`}
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border hairline bg-card">
            <Suspense fallback={<div className="w-full bg-muted/40" style={{ height: mapHeight }} />}>
              <LabLocationsMap
                key={city}
                items={filtered}
                center={CITIES.find((c) => c.key === city)!.center}
                zoom={CITIES.find((c) => c.key === city)!.zoom}
                height={mapHeight}
                fitToItems
                hideControls
                clusterMarkers
                showSelectButton
                selectedId={selectedId ?? undefined}
                focusOnSelected
                focusZoom={15}

              />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
