import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, CheckCircle2, Clock, Crosshair, FlaskConical, Home, MapPin, Minus, Navigation, Plus, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUtm } from "@/lib/utm";
import { supabase } from "@/integrations/supabase/client";
import labquestLogo from "@/assets/labquest-logo.png";
import LabLocationsMapType, { normalizeHours, type LabMapItem } from "@/components/admin/LabLocationsMap";

const LabLocationsMap = lazy(() => import("@/components/admin/LabLocationsMap")) as typeof LabLocationsMapType;

export type CityKey = "msk" | "spb";

export const CITIES: { key: CityKey; label: string; inLabel: string; center: [number, number]; zoom: number }[] = [
  { key: "msk", label: "Москва и МО", inLabel: "в Москве и МО", center: [55.7558, 37.6173], zoom: 10 },
  { key: "spb", label: "Санкт-Петербург", inLabel: "в Санкт-Петербурге", center: [59.9386, 30.3141], zoom: 11 },
];

/** Строчный выбор города в шапке: «в Москве и МО ⌄» с выпадающим списком. */
function CityInlineSelect({ city, onChange }: { city: CityKey; onChange: (next: CityKey) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const current = CITIES.find((c) => c.key === city)!;

  return (
    <div ref={rootRef} className="relative inline-block align-baseline">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-primary underline decoration-dashed decoration-primary/50 underline-offset-4 transition-colors hover:decoration-primary"
      >
        <span>{current.inLabel}</span>
        <ChevronDown className={`h-4 w-4 self-center transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Выбор города"
          className="absolute left-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg"
        >
          {CITIES.map((c) => (
            <button
              key={c.key}
              type="button"
              role="option"
              aria-selected={c.key === city}
              onClick={() => {
                onChange(c.key);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${
                c.key === city ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              <span>{c.label}</span>
              {c.key === city && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

export const clinicHoursLine = (item: LabMapItem) => normalizeHours(item.hours ?? []).slice(0, 3).join(" · ");

/** Приводит ввод к 11 цифрам, начинающимся с 7: понимает +7, 7, 8 и 10-значные номера вида 910… */
function normalizeRuPhoneDigits(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d[0] === "8") d = "7" + d.slice(1);
  else if (d[0] !== "7") d = "7" + d;
  return d.slice(0, 11);
}

/** Форматирует ввод как +7 (910) 123-45-67 по мере набора. */
function formatRuPhoneInput(raw: string): string {
  const d = normalizeRuPhoneDigits(raw);
  if (!d) return "";
  let out = "+7";
  if (d.length > 1) out += ` (${d.slice(1, 4)}`;
  if (d.length >= 4) out += ")";
  if (d.length > 4) out += ` ${d.slice(4, 7)}`;
  if (d.length > 7) out += `-${d.slice(7, 9)}`;
  if (d.length > 9) out += `-${d.slice(9, 11)}`;
  return out;
}

/** Форма «Заказать медсестру на дом»: телефон + отправка заявки. */
function NurseCallForm() {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const digits = normalizeRuPhoneDigits(phone);
    if (digits.length !== 11 || !digits.startsWith("7")) {
      setError("Введите номер полностью — например, +7 (910) 123-45-67");
      return;
    }
    const normalized = `+${digits}`;
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("callback_requests").insert({
        phone: normalized,
        source: "nurse_home",
        page_url: `${window.location.pathname}${window.location.search}`.slice(0, 500),
        utm: getUtm(),
        user_id: userData?.user?.id ?? null,
      });
      if (insErr) throw insErr;
      setSent(true);
    } catch {
      setError("Не удалось отправить. Позвоните нам: +7 (995) 998-46-38");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-left">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm leading-relaxed text-foreground">
          Заявка принята — перезвоним и согласуем удобные день и время.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => {
            setPhone(formatRuPhoneInput(e.target.value));
            setError(null);
          }}
          placeholder="+7 (___) ___-__-__"
          aria-label="Ваш телефон"
          maxLength={18}
          className="h-12 min-w-0 flex-1 text-base"
        />
        <Button type="submit" disabled={sending} className="h-12 shrink-0 gap-2 whitespace-nowrap px-5 text-base">
          <Send className="h-4 w-4" aria-hidden />
          {sending ? "Отправляем…" : "Отправить"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-sm text-muted-foreground">
        Заказать медсестру на дом — быстро перезвоним и согласуем удобные день и время.
      </p>
    </form>
  );
}

interface Props {
  /** Подтверждённое отделение (из общего состояния страницы). */
  confirmed: LabMapItem | null;
  onConfirm: (item: LabMapItem) => void;
  /** "section" — панель + карта в две колонки, "stack" — всё в одну колонку (корзина). */
  layout?: "section" | "stack";
  /** Дополнительный контент справа от переключателя городов. */
  header?: React.ReactNode;
  /** Кастомная шапка: получает строчный выбор города (или null, когда выбор скрыт). */
  renderHeader?: (cityTrigger: React.ReactNode) => React.ReactNode;
  /** Только просмотр: скрыть выбор отделения, карта без клика по точкам. */
  readOnly?: boolean;
}

export function EnergyClinicPicker({ confirmed, onConfirm, layout = "section", header, renderHeader, readOnly = false }: Props) {
  const [mode, setMode] = useState<"lab" | "home">("lab");
  const [items, setItems] = useState<LabMapItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(confirmed?.id ?? null);
  const [city, setCity] = useState<CityKey>(() => (confirmed ? cityOf(confirmed) : detectCity()));
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const [mapHeight, setMapHeight] = useState(420);
  const [isWide, setIsWide] = useState(false);
  const mapRef = useRef<{ zoomIn: () => void; zoomOut: () => void } | null>(null);
  const externalZoom = layout === "stack";
  const showTabs = layout === "section";

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setMapHeight(w < 640 ? 260 : w < 1024 ? 340 : layout === "stack" ? 360 : 440);
      setIsWide(w >= 1024);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [layout]);

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
    setGeoNote(null);
    if (typeof window !== "undefined") window.localStorage.setItem("energy_city", next);
  };

  const pickNearestTo = useCallback(
    (pos: [number, number] | null) => {
      // С реальной геолокацией ищем по всем городам, без неё — в пределах выбранного города.
      const pool = pos ? items : cityItems.length ? cityItems : items;
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
        if (near) {
          const nearCity = cityOf(near);
          if (nearCity !== city) {
            setCity(nearCity);
            if (typeof window !== "undefined") window.localStorage.setItem("energy_city", nearCity);
          }
          setSelectedId(near.id);
        }
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
    <div className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {renderHeader
          ? renderHeader(!showTabs || mode === "lab" ? <CityInlineSelect city={city} onChange={selectCity} /> : null)
          : header}
        {!renderHeader && (!showTabs || mode === "lab") && (
          <div className="flex w-full shrink-0 rounded-xl border border-border bg-card p-1 sm:w-auto">
            {CITIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => selectCity(c.key)}
                aria-pressed={city === c.key}
                className={`min-h-11 flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-4 ${
                  city === c.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {showTabs && (
        <div className="mt-6 flex gap-6 border-b hairline sm:gap-8" role="tablist" aria-label="Где сдать анализы">
          {(
            [
              { key: "lab", label: "В лаборатории", icon: FlaskConical },
              { key: "home", label: "Дома", icon: Home },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = mode === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(t.key)}
                className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 text-base font-medium transition-colors md:text-lg ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {showTabs && mode === "home" ? (
        <div className="mt-5 grid gap-4 rounded-xl border border-border bg-card p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)] md:gap-8 md:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Home className="h-6 w-6 text-primary" aria-hidden />
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="font-display text-xl font-semibold leading-tight text-foreground md:text-2xl">
                  Медсестра приедет к вам
                </h3>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium leading-relaxed text-primary">
                  только Москва и МО
                </span>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {[
                "Забор крови дома или на работе — в удобное вам время",
                "Натощак, процедура занимает 15 минут",
                "Доступно в Москве и Московской области",
              ].map((text) => (
                <li key={text} className="flex items-start gap-3 text-base text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0">{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:justify-self-end md:w-[340px]">
            <NurseCallForm />
          </div>
        </div>
      ) : (
        <>
        <div
        className={`mt-5 grid gap-4 md:gap-5 ${
          layout === "section" && !readOnly ? "lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]" : ""
        }`}
      >
        {/* Левая панель (на мобильном — под картой) */}
        {!readOnly && (
        <div
          className={`flex min-w-0 flex-col rounded-xl border border-border bg-card p-4 sm:p-5 ${
            layout === "section" ? "order-2 lg:order-1" : ""
          }`}
          style={layout === "section" && isWide ? { minHeight: mapHeight } : undefined}

        >
          {!selected ? (
            <div className="flex flex-1 flex-col">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-40 items-center justify-center rounded-xl bg-white p-3">
                  <img
                    src={labquestLogo}
                    alt="LabQuest"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">Официальный партнёр ReAge</p>
              </div>

              {layout === "section" && (
                <ul className="mt-5 space-y-3">
                  {[
                    "Десятки отделений по Москве, СПб и всей России",
                    "Государственная аккредитация лаборатории",
                    "Сдача в любой день",
                  ].map((text) => (
                    <li key={text} className="flex items-start gap-3 text-base text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0">{text}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto space-y-3 pt-8">
                <p className="text-center text-base text-muted-foreground">
                  Выберите отделение на карте или найдём ближайшее автоматически
                </p>
                <Button
                  type="button"
                  onClick={handleLocate}
                  size="lg"
                  disabled={locating || items.length === 0}
                  className="h-12 w-full gap-2 text-base"
                >
                  <Crosshair className="h-4 w-4" aria-hidden />
                  {locating ? "Определяем…" : "Определить ближайшую"}
                </Button>
                {geoNote && <p className="text-center text-xs text-muted-foreground">{geoNote}</p>}
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
                    setGeoNote(null);
                  }}
                  className="-my-2 -mr-2 shrink-0 px-2 py-2 text-sm font-medium text-primary hover:underline"
                >
                  Изменить
                </button>

              </div>

              <h3 className="mt-3 text-xl font-semibold leading-snug text-foreground">
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
                    size="lg"
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
                  onClick={() => onConfirm(selected)}
                  size="lg"
                  className="h-12 w-full text-base"
                >
                  {confirmed?.id === selected.id ? "✓ Отделение выбрано" : "Выбрать это отделение"}
                </Button>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Карта */}
        <div
          className={`min-w-0 overflow-hidden rounded-xl border border-border bg-card ${
            layout === "section" ? "order-1 lg:order-2" : ""
          }`}
        >
          {externalZoom && (
            <div className="flex items-center justify-end gap-2 border-b border-border bg-card px-3 py-2">
              <span className="mr-auto text-xs text-muted-foreground">Масштаб карты</span>
              <button
                type="button"
                aria-label="Отдалить"
                onClick={() => mapRef.current?.zoomOut()}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Приблизить"
                onClick={() => mapRef.current?.zoomIn()}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
          <Suspense fallback={<div className="w-full bg-muted/40" style={{ height: mapHeight }} />}>
            <LabLocationsMap
              key={city}
              items={cityItems}
              center={CITIES.find((c) => c.key === city)!.center}
              zoom={CITIES.find((c) => c.key === city)!.zoom}
              height={mapHeight}
              fitToItems
              hideControls
              hideZoomControl={externalZoom}
              onMapReady={(map) => {
                mapRef.current = map ?? null;
              }}
              clusterMarkers
              showSelectButton={!readOnly}
              showPartnerButton={false}
              selectOnMarkerClick={!readOnly}
              selectedId={readOnly ? undefined : (selectedId ?? undefined)}
              focusOnSelected={!readOnly}
              focusZoom={15}
              onSelect={readOnly ? undefined : (item) => setSelectedId(item.id)}
            />
          </Suspense>
        </div>
        </div>
        {showTabs && !readOnly && (
          <p className="mt-3 text-xs text-muted-foreground">
            Клик по группе точек на карте приближает карту к этим отделениям.
          </p>
        )}
        </>
      )}
    </div>
  );
}
