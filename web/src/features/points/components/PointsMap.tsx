import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RecyclePoint } from "../types/points.types";
import { WASTE_TYPE_LABELS, getFillColor } from "../../../common/lib/format";

// Fix for default icon path broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createContainerIcon(fill: number, isCritical: boolean): L.DivIcon {
  const color = getFillColor(fill);
  const pulse = isCritical ? "animation:pulse 1.5s infinite;" : "";
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:34px;height:34px;border-radius:50%;
        background:${color};border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
        display:flex;align-items:center;justify-content:center;
        color:white;font-size:11px;font-weight:700;
        font-family:'DM Sans',sans-serif;
        ${pulse}
      ">${Math.round(fill)}%</div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

interface PointsMapProps {
  points: RecyclePoint[];
  selectedPointId?: string;
  onPointSelect: (point: RecyclePoint) => void;
}

// Tuluá, Valle del Cauca
const TULUA_CENTER: [number, number] = [4.0847, -76.1954];
const INITIAL_ZOOM = 14;

export function PointsMap({ points, selectedPointId, onPointSelect }: PointsMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Init map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: TULUA_CENTER,
      zoom: INITIAL_ZOOM,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Custom zoom control position
    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when points change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(markersRef.current.keys());
    const newIds = new Set(points.map((p) => p.id));

    // Remove markers no longer in list
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
      }
    }

    // Add or update markers
    for (const point of points) {
      const icon = createContainerIcon(point.currentFillPercentage, point.isCritical);
      const existingMarker = markersRef.current.get(point.id);

      if (existingMarker) {
        existingMarker.setIcon(icon);
        existingMarker.setLatLng([point.latitude, point.longitude]);
      } else {
        const marker = L.marker([point.latitude, point.longitude], { icon })
          .addTo(map)
          .bindTooltip(
            `<b>${point.code}</b><br>${point.name}<br>${WASTE_TYPE_LABELS[point.wasteType]} · ${point.currentFillPercentage.toFixed(0)}% lleno`,
            { direction: "top", offset: [0, -18] }
          )
          .on("click", () => onPointSelect(point));

        markersRef.current.set(point.id, marker);
      }
    }
  }, [points, onPointSelect]);

  // Fly to selected point
  useEffect(() => {
    if (!selectedPointId || !mapRef.current) return;
    const point = points.find((p) => p.id === selectedPointId);
    if (!point) return;
    mapRef.current.flyTo([point.latitude, point.longitude], 16, { duration: 0.8 });
  }, [selectedPointId, points]);

  return <div ref={containerRef} className="h-full w-full rounded-xl" />;
}
