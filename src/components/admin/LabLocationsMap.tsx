import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

type TileStyleKey = "carto-dark" | "carto-light" | "carto-voyager" | "osm";

const TILE_STYLES: Record<
  TileStyleKey,
  { label: string; url: string; attribution: string; subdomains?: string; maxZoom: number }
> = {
  "carto-dark": {
    label: "Тёмный",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  },
  "carto-light": {
    label: "Светлый",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  },
  "carto-voyager": {
    label: "Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  },
  osm: {
    label: "OSM",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
};

const buildIcon = () =>
  L.divIcon({
    className: "lab-map-marker",
    html: `<div style="
      position: relative;
      width: 28px;
      height: 36px;
      transform: translate(-14px, -36px);
    ">
      <svg viewBox="0 0 28 36" width="28" height="36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 12.4 21 13.07 21.6a1.4 1.4 0 0 0 1.86 0C15.6 35 28 23.5 28 14 28 6.27 21.73 0 14 0z"
          fill="hsl(var(--primary))" stroke="hsl(var(--background))" stroke-width="1.5"/>
        <circle cx="14" cy="14" r="5" fill="hsl(var(--background))"/>
      </svg>
    </div>`,
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

export default function LabLocationsMap({ items }: { items: LabMapItem[] }) {
  const { resolvedTheme } = useTheme();
  const defaultStyle: TileStyleKey = resolvedTheme === "light" ? "carto-light" : "carto-dark";
  const [styleKey, setStyleKey] = useState<TileStyleKey>(defaultStyle);

  const center = useMemo<[number, number]>(() => {
    if (!items.length) return [55.7558, 37.6173];
    return [items[0].lat, items[0].lng];
  }, [items]);

  const style = TILE_STYLES[styleKey];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Стиль карты:</span>
          <ToggleGroup
            type="single"
            size="sm"
            value={styleKey}
            onValueChange={(v) => v && setStyleKey(v as TileStyleKey)}
          >
            {(Object.keys(TILE_STYLES) as TileStyleKey[]).map((k) => (
              <ToggleGroupItem key={k} value={k} aria-label={TILE_STYLES[k].label}>
                {TILE_STYLES[k].label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <span className="text-xs text-muted-foreground">{items.length} точек</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <MapContainer
          center={center}
          zoom={10}
          scrollWheelZoom
          attributionControl={false}
          zoomControl={false}
          style={{ height: "70vh", width: "100%" }}
        >
          <TileLayer
            key={styleKey}
            url={style.url}
            subdomains={style.subdomains as any}
            maxZoom={style.maxZoom}
            detectRetina
          />
          <CustomZoomControl />
          <FitBounds items={items} />
          <ClusterLayer items={items} />
        </MapContainer>
        <div className="flex items-center justify-end gap-2 px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground">
          <span>©</span>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="hover:underline text-primary"
          >
            OpenStreetMap
          </a>
          {styleKey !== "osm" && (
            <>
              <span>|</span>
              <a
                href="https://carto.com/attributions"
                target="_blank"
                rel="noreferrer"
                className="hover:underline text-primary"
              >
                CARTO
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
