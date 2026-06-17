import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings2, RotateCcw } from "lucide-react";
import locationIconAsset from "@/assets/location_icon.png.asset.json";

export type LabMapItem = {
  id: string;
  title: string;
  metro?: string | null;
  city?: string | null;
  address_short?: string | null;
  full_address?: string | null;
  phones?: string[];
  hours?: string[];
  page_url?: string | null;
  lat: number;
  lng: number;
};

type TileStyleKey =
  | "osm"
  | "osm-hot"
  | "opentopo"
  | "carto-dark-nolabels"
  | "carto-light-nolabels";

const TILE_STYLES: Record<
  TileStyleKey,
  {
    label: string;
    group: "С подписями (RU)" | "Без подписей";
    url: string;
    attribution: string;
    subdomains?: string;
    maxZoom: number;
  }
> = {
  osm: {
    label: "OSM Standard",
    group: "С подписями (RU)",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap",
    subdomains: "abc",
    maxZoom: 19,
  },
  "osm-hot": {
    label: "OSM Humanitarian",
    group: "С подписями (RU)",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: "© OSM HOT",
    subdomains: "abc",
    maxZoom: 19,
  },
  opentopo: {
    label: "OpenTopoMap",
    group: "С подписями (RU)",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap (CC-BY-SA)",
    subdomains: "abc",
    maxZoom: 17,
  },
  "carto-dark-nolabels": {
    label: "Тёмная · без подписей",
    group: "Без подписей",
    url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    attribution: "© OSM © CARTO",
    subdomains: "abcd",
    maxZoom: 20,
  },
  "carto-light-nolabels": {
    label: "Светлая · без подписей",
    group: "Без подписей",
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    attribution: "© OSM © CARTO",
    subdomains: "abcd",
    maxZoom: 20,
  },
};

type TileFilters = {
  brightness: number;
  contrast: number;
  saturate: number;
  invert: boolean;
  hueRotate: number;
};

const DEFAULT_FILTERS: TileFilters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  invert: false,
  hueRotate: 0,
};

const buildIcon = () =>
  L.divIcon({
    className: "lab-map-marker",
    html: `<img src="${locationIconAsset.url}" style="width:28px !important;height:36px !important;display:block;" alt="" />`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32],
  });

function CustomZoomControl() {
  const map = useMap();
  useEffect(() => {
    const control = L.control.zoom({
      position: "topright",
      zoomInTitle: "Приблизить",
      zoomOutTitle: "Отдалить",
    });
    map.addControl(control);
    return () => {
      map.removeControl(control);
    };
  }, [map]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    // Multiple delayed invalidations to catch dialog/popover open transitions
    const t1 = setTimeout(invalidate, 50);
    const t2 = setTimeout(invalidate, 200);
    const t3 = setTimeout(invalidate, 500);
    const container = map.getContainer();
    const ro = new ResizeObserver(() => invalidate());
    ro.observe(container);
    window.addEventListener("resize", invalidate);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      ro.disconnect();
      window.removeEventListener("resize", invalidate);
    };
  }, [map]);
  return null;
}

function FitBounds({ items }: { items: LabMapItem[] }) {
  const map = useMap();
  useEffect(() => {
    if (!items.length) return;
    const bounds = L.latLngBounds(items.map((i) => [i.lat, i.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [items, map]);
  return null;
}

function ClusterLayer({ items }: { items: LabMapItem[] }) {
  const map = useMap();
  useEffect(() => {
    if (!items.length) return;
    const icon = buildIcon();
    const cluster = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50,
    }) as L.LayerGroup;

    items.forEach((it) => {
      const m = L.marker([it.lat, it.lng], { icon });
      const phones = (it.phones ?? []).filter(Boolean);
      const hours = (it.hours ?? []).filter(Boolean);
      const html = `
        <div class="lab-popup">
          <div class="lab-popup-title">${escapeHtml(it.title)}</div>
          ${it.metro ? `<div class="lab-popup-row"><span class="lab-popup-icon">🚇</span>${escapeHtml(it.metro)}</div>` : ""}
          ${it.full_address ? `<div class="lab-popup-row"><span class="lab-popup-icon">📍</span>${escapeHtml(it.full_address)}</div>` : ""}
          ${phones.length ? `<div class="lab-popup-section"><div class="lab-popup-label">Телефоны</div>${phones.map((p) => `<a href="tel:${escapeAttr(p)}" class="lab-popup-link">${escapeHtml(p)}</a>`).join("<br/>")}</div>` : ""}
          ${hours.length ? `<div class="lab-popup-section"><div class="lab-popup-label">Часы работы</div>${hours.map(escapeHtml).join("<br/>")}</div>` : ""}
          ${it.page_url ? `<a href="${escapeAttr(it.page_url)}" target="_blank" rel="noreferrer" class="lab-popup-cta">Открыть на сайте провайдера ↗</a>` : ""}
        </div>
      `;
      m.bindPopup(html, { maxWidth: 320, minWidth: 240 });
      cluster.addLayer(m);
    });

    map.addLayer(cluster);
    return () => {
      map.removeLayer(cluster);
    };
  }, [items, map]);
  return null;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s: string) {
  return escapeHtml(s);
}

function filterCss(f: TileFilters) {
  return [
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturate}%)`,
    f.invert ? `invert(100%) hue-rotate(180deg)` : "",
    f.hueRotate ? `hue-rotate(${f.hueRotate}deg)` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export type { TileStyleKey, TileFilters };
export { TILE_STYLES, DEFAULT_FILTERS };

export default function LabLocationsMap({
  items,
  center: centerProp,
  zoom: zoomProp,
  fitToItems = true,
  height = "70vh",
  styleKey: styleKeyProp,
  onStyleKeyChange,
  filters: filtersProp,
  onFiltersChange,
}: {
  items: LabMapItem[];
  center?: [number, number];
  zoom?: number;
  fitToItems?: boolean;
  height?: string | number;
  styleKey?: TileStyleKey;
  onStyleKeyChange?: (k: TileStyleKey) => void;
  filters?: TileFilters;
  onFiltersChange?: (f: TileFilters) => void;
}) {
  useTheme();
  const [styleKeyLocal, setStyleKeyLocal] = useState<TileStyleKey>(styleKeyProp ?? "osm");
  const [filtersLocal, setFiltersLocal] = useState<TileFilters>(filtersProp ?? DEFAULT_FILTERS);
  const styleKey = styleKeyProp ?? styleKeyLocal;
  const filters = filtersProp ?? filtersLocal;
  const setStyleKey = (k: TileStyleKey) => {
    if (onStyleKeyChange) onStyleKeyChange(k);
    else setStyleKeyLocal(k);
  };
  const setFilters = (updater: TileFilters | ((f: TileFilters) => TileFilters)) => {
    const next = typeof updater === "function" ? (updater as (f: TileFilters) => TileFilters)(filters) : updater;
    if (onFiltersChange) onFiltersChange(next);
    else setFiltersLocal(next);
  };

  const center = useMemo<[number, number]>(() => {
    if (centerProp) return centerProp;
    if (!items.length) return [55.7558, 37.6173];
    return [items[0].lat, items[0].lng];
  }, [items, centerProp]);

  const style = TILE_STYLES[styleKey];

  const grouped = useMemo(() => {
    const g: Record<string, TileStyleKey[]> = {};
    (Object.keys(TILE_STYLES) as TileStyleKey[]).forEach((k) => {
      const grp = TILE_STYLES[k].group;
      (g[grp] ||= []).push(k);
    });
    return g;
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Стиль карты:</span>
          <ToggleGroup
            type="single"
            size="sm"
            value={styleKey}
            onValueChange={(v) => v && setStyleKey(v as TileStyleKey)}
            className="flex-wrap"
          >
            {(Object.keys(TILE_STYLES) as TileStyleKey[]).map((k) => (
              <ToggleGroupItem key={k} value={k} aria-label={TILE_STYLES[k].label}>
                {TILE_STYLES[k].label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                Настройки вида
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-4 z-[9999] relative">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Внешний вид</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  <RotateCcw className="h-3 w-3" />
                  Сброс
                </Button>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label className="text-muted-foreground">Яркость</Label>
                  <span className="tabular-nums">{filters.brightness}%</span>
                </div>
                <Slider
                  min={30}
                  max={170}
                  step={1}
                  value={[filters.brightness]}
                  onValueChange={(v) => setFilters((f) => ({ ...f, brightness: v[0] }))}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label className="text-muted-foreground">Контраст</Label>
                  <span className="tabular-nums">{filters.contrast}%</span>
                </div>
                <Slider
                  min={30}
                  max={200}
                  step={1}
                  value={[filters.contrast]}
                  onValueChange={(v) => setFilters((f) => ({ ...f, contrast: v[0] }))}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label className="text-muted-foreground">Насыщенность</Label>
                  <span className="tabular-nums">{filters.saturate}%</span>
                </div>
                <Slider
                  min={0}
                  max={200}
                  step={1}
                  value={[filters.saturate]}
                  onValueChange={(v) => setFilters((f) => ({ ...f, saturate: v[0] }))}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label className="text-muted-foreground">Оттенок</Label>
                  <span className="tabular-nums">{filters.hueRotate}°</span>
                </div>
                <Slider
                  min={0}
                  max={360}
                  step={1}
                  value={[filters.hueRotate]}
                  onValueChange={(v) => setFilters((f) => ({ ...f, hueRotate: v[0] }))}
                />
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border">
                <Label className="text-sm">Инвертировать (тёмный режим)</Label>
                <Switch
                  checked={filters.invert}
                  onCheckedChange={(c) => setFilters((f) => ({ ...f, invert: c }))}
                />
              </div>

              <div className="pt-1 border-t border-border space-y-1.5">
                <Label className="text-xs text-muted-foreground">Пресеты</Label>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setFilters({ brightness: 90, contrast: 95, saturate: 60, invert: false, hueRotate: 0 })
                    }
                  >
                    Минимал
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setFilters({ brightness: 100, contrast: 110, saturate: 0, invert: false, hueRotate: 0 })
                    }
                  >
                    Ч/Б
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setFilters({ brightness: 70, contrast: 110, saturate: 80, invert: true, hueRotate: 180 })
                    }
                  >
                    Тёмный из светлого
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setFilters({ brightness: 110, contrast: 115, saturate: 130, invert: false, hueRotate: 0 })
                    }
                  >
                    Сочный
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">{items.length} точек</span>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <style>{`.lab-map-tiles .leaflet-tile-pane { filter: ${filterCss(filters)}; }`}</style>
        <MapContainer
          center={center}
          zoom={zoomProp ?? 10}
          scrollWheelZoom
          attributionControl={false}
          zoomControl={false}
          className="lab-map-tiles"
          style={{ height, width: "100%" }}
        >
          <TileLayer
            key={styleKey}
            url={style.url}
            subdomains={(style.subdomains ?? "abc") as any}
            maxZoom={style.maxZoom}
            detectRetina
          />
          <CustomZoomControl />
          {fitToItems && <FitBounds items={items} />}
          <ClusterLayer items={items} />
        </MapContainer>
        <div className="flex items-center justify-end gap-2 px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground">
          <span>{style.attribution}</span>
        </div>
      </div>
    </div>
  );
}
