import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Crosshair, MapPin, Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import labquestLogo from "@/assets/labquest-logo.png.asset.json";
import LabLocationsMapType, { normalizeHours, type LabMapItem } from "@/components/admin/LabLocationsMap";

const LabLocationsMap = lazy(() => import("@/components/admin/LabLocationsMap")) as typeof LabLocationsMapType;

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

function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(km < 10 ? 1 : 0)} км`;

export function EnergyWhereToTest() {
  const [items, setItems] = useState<LabMapItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [city, setCity] = useState<CityKey>(detectCity);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const [mapHeight, setMapHeight] = useState(420);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setMapHeight(w < 640 ? 320 : w < 1024 ? 380 : 440);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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

  const selected = useMemo(
    () => cityItems.find((i) => i.id === selectedId) ?? null,
    [cityItems, selectedId],
  );

  const selectCity = (next: CityKey) => {
    setCity(next);
    setSelectedId(null);
    setConfirmedId(null);
    setGeoNote(null);
    if (typeof window !== "undefined") window.localStorage.setItem("energy_city", next);
  };

  const pickNearestTo = useCallback(
    (pos: [number, number] | null) => {
      const pool = cityItems.length ? cityItems : items;
      if (!pool.length) return null;
      const base = pos ?? CITIES.find((c) => c.key === city)!.center;
      let best = pool[0];
      let bestD = Infinity;
      for (const it of pool) {
        const d = distanceKm(base, [it.lat, it.lng]);
        if (d < bestD) {
          bestD = d;
          best = it;
        }
      }
      return best;
    },
    [cityItems, items, city],
  );

  const handleLocate = () => {
    setGeoNote(null);
    const fallback = () => {
      const near = pickNearestTo(null);
      if (near) {
        setSelectedId(near.id);
        setGeoNote("Геолокация недоступна — показали отделение в центре выбранного города.");
      }
      setLocating(false);
    };
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      fallback();
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos: [number, number] = [p.coords.latitude, p.coords.longitude];
        setUserPos(pos);
        const near = pickNearestTo(pos);
        if (near) setSelectedId(near.id);
        setLocating(false);
      },
      () => fallback(),
      { timeout: 8000, maximumAge: 300000 },
    );
  };

  const selectedHours = selected ? normalizeHours(selected.hours ?? []) : [];
  const selectedDistance =
    selected && userPos ? distanceKm(userPos, [selected.lat, selected.lng]) : null;

  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 md:py-16">
        <h2 className="font-display text-[1.7rem] leading-tight text-foreground md:text-3xl">
          Где сдавать анализы
        </h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Выберите удобное отделение — записываться заранее не нужно.
        </p>

        {/* Партнёрская плашка */}
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 md:mt-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold tracking-tight text-primary-foreground">
            LQ
          </span>
          <p className="min-w-0 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">партнёр — LabQuest</span> · 400+
            отделений по России, гос. аккредитация
          </p>
        </div>

        <div className="mt-4 inline-flex rounded-xl border border-border bg-card p-1">
          {CITIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => selectCity(c.key)}
              aria-pressed={city === c.key}
              className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                city === c.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:mt-6 md:gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          {/* Левая панель */}
          <div
            className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-5"
            style={{ minHeight: mapHeight }}
          >
            {!selected ? (
              <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-bold tracking-tight text-primary-foreground">
                    LQ
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">LabQuest</p>
                    <p className="text-sm text-muted-foreground">официальный партнёр ReAge</p>
                  </div>
                </div>

                <ul className="mt-5 space-y-3">
                  {[
                    "400+ отделений по Москве, СПб и всей России",
                    "Государственная аккредитация лаборатории",
                    "Результаты доступны онлайн в личном кабинете",
                  ].map((text) => (
                    <li key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0">{text}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto space-y-3 pt-8">
                  <p className="text-center text-sm text-muted-foreground">
                    Выберите отделение на карте или найдём ближайшее автоматически
                  </p>
                  <Button
                    type="button"
                    onClick={handleLocate}
                    disabled={locating || items.length === 0}
                    className="h-12 w-full gap-2 text-base"
                  >
                    <Crosshair className="h-4 w-4" aria-hidden />
                    {locating ? "Определяем…" : "Определить ближайшую"}
                  </Button>
                  {geoNote && (
                    <p className="text-center text-xs text-muted-foreground">{geoNote}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Выбранное отделение
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(null);
                      setConfirmedId(null);
                      setGeoNote(null);
                    }}
                    className="shrink-0 text-sm font-medium text-primary hover:underline"
                  >
                    Изменить
                  </button>
                </div>

                <h3 className="mt-3 text-lg font-semibold leading-snug text-foreground">
                  {selected.title}
                </h3>

                <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    {selected.metro ? `м. ${selected.metro} · ` : ""}
                    {selected.address_short || selected.full_address}
                  </span>
                </div>

                {selectedHours.length > 0 && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0">{selectedHours.slice(0, 3).join(" · ")}</span>
                  </div>
                )}

                <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                  <Navigation className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    {selectedDistance !== null
                      ? `${formatDistance(selectedDistance)} от вас`
                      : "Расстояние — после определения геолокации"}
                  </span>
                </div>

                {geoNote && <p className="mt-3 text-xs text-muted-foreground">{geoNote}</p>}

                <div className="mt-auto space-y-2 pt-6">
                  {!userPos && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleLocate}
                      disabled={locating}
                      className="h-11 w-full gap-2"
                    >
                      <Crosshair className="h-4 w-4" aria-hidden />
                      {locating ? "Определяем…" : "Определить ближайшую"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => setConfirmedId(selected.id)}
                    className="h-12 w-full text-base"
                  >
                    {confirmedId === selected.id ? "✓ Отделение выбрано" : "Выбрать это отделение"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Карта */}
          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
            <Suspense
              fallback={<div className="w-full bg-muted/40" style={{ height: mapHeight }} />}
            >
              <LabLocationsMap
                key={city}
                items={cityItems}
                center={CITIES.find((c) => c.key === city)!.center}
                zoom={CITIES.find((c) => c.key === city)!.zoom}
                height={mapHeight}
                fitToItems
                hideControls
                clusterMarkers
                showSelectButton
                selectOnMarkerClick
                selectedId={selectedId ?? undefined}
                focusOnSelected
                focusZoom={15}
                onSelect={(item) => {
                  setSelectedId(item.id);
                  setConfirmedId(null);
                }}
              />
            </Suspense>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Клик по группе точек на карте приближает карту к этим отделениям.
        </p>
      </div>
    </section>
  );
}
