import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { ExternalLink, Phone, Clock, MapPin, Train } from "lucide-react";
import { Button } from "@/components/ui/button";

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

// Кастомная SVG-метка в primary-цвете (использует hsl(var(--primary)))
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
  const center = useMemo<[number, number]>(() => {
    if (!items.length) return [55.7558, 37.6173];
    return [items[0].lat, items[0].lng];
  }, [items]);

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <MapContainer
        center={center}
        zoom={10}
        scrollWheelZoom
        style={{ height: "70vh", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds items={items} />
        <ClusterLayer items={items} />
      </MapContainer>
    </div>
  );
}
