import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CollectionStop } from "../types/schedule.types";

interface RouteLiveMapProps {
  stops: CollectionStop[];
  truckPlate: string;
  truckLat?: number;
  truckLng?: number;
  truckSpeedKmh?: number;
  isLive: boolean;
  onSelectStop?: (stopId: string) => void;
}

const TULUA_CENTER: [number, number] = [4.0847, -76.1954];

function createStopMarkerIcon(stop: CollectionStop): L.DivIcon {
  const bg =
    stop.status === "COMPLETADA"
      ? "#16A34A"
      : stop.status === "EN_PROCESO"
      ? "#F59E0B"
      : stop.status === "OMITIDA"
      ? "#EF4444"
      : "#0A0A0A";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:28px;height:28px;border-radius:50%;
        background:${bg};border:2.5px solid #ffffff;
        box-shadow:0 2px 6px rgba(0,0,0,0.28);
        display:flex;align-items:center;justify-content:center;
        color:#ffffff;font-size:11px;font-weight:800;
        font-family:'DM Sans',sans-serif;
      ">${stop.order}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createTruckIcon(plate: string, isLive: boolean): L.DivIcon {
  const badgeBg = isLive ? "#0A0A0A" : "#52525B";
  const dotBg = isLive ? "#4ADE80" : "#A1A1AA";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        display:inline-flex;align-items:center;gap:5px;
        padding:4px 9px;border-radius:999px;
        background:${badgeBg};border:2px solid #E5FF8A;
        box-shadow:0 4px 12px rgba(0,0,0,0.32);
        color:#ffffff;font-size:10px;font-weight:800;
        font-family:'DM Sans',sans-serif;white-space:nowrap;
      ">
        <span style="width:7px;height:7px;border-radius:50%;background:${dotBg};display:inline-block;"></span>
        <span>${plate}</span>
      </div>
    `,
    iconSize: [76, 26],
    iconAnchor: [38, 13],
  });
}

export function RouteLiveMap({
  stops,
  truckPlate,
  truckLat,
  truckLng,
  truckSpeedKmh = 0,
  isLive,
  onSelectStop,
}: RouteLiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const initialCenter: [number, number] =
      truckLat && truckLng
        ? [truckLat, truckLng]
        : stops[0]?.latitude && stops[0]?.longitude
        ? [stops[0].latitude, stops[0].longitude]
        : TULUA_CENTER;

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const group = L.layerGroup().addTo(map);
    layerGroupRef.current = group;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const coords: [number, number][] = [];

    for (const stop of stops) {
      const lat = stop.latitude ?? 4.0847;
      const lng = stop.longitude ?? -76.1954;
      coords.push([lat, lng]);

      const marker = L.marker([lat, lng], {
        icon: createStopMarkerIcon(stop),
      })
        .bindTooltip(
          `<b>Parada #${stop.order} · ${stop.recyclePointCode}</b><br>${stop.recyclePointName}<br>Estado: ${stop.status}`,
          { direction: "top", offset: [0, -14] }
        )
        .addTo(group);

      if (onSelectStop) {
        marker.on("click", () => onSelectStop(stop.id));
      }
    }

    if (coords.length >= 2) {
      L.polyline(coords, {
        color: isLive ? "#16A34A" : "#52525B",
        weight: 3.5,
        dashArray: isLive ? undefined : "6, 6",
        opacity: 0.85,
      }).addTo(group);
    }

    const tLat = truckLat ?? coords[0]?.[0] ?? TULUA_CENTER[0];
    const tLng = truckLng ?? coords[0]?.[1] ?? TULUA_CENTER[1];

    L.marker([tLat, tLng], {
      icon: createTruckIcon(truckPlate, isLive),
      zIndexOffset: 500,
    })
      .bindTooltip(
        `<b>Camión ${truckPlate}</b><br>${
          isLive ? `En ruta · ${truckSpeedKmh.toFixed(0)} km/h` : "En base / Programado"
        }`,
        { direction: "top", offset: [0, -14] }
      )
      .addTo(group);
  }, [stops, truckPlate, truckLat, truckLng, truckSpeedKmh, isLive, onSelectStop]);

  return (
    <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-zinc-200">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute top-2.5 left-2.5 z-[400] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs shadow-2xs border border-zinc-200/80 text-[10px] font-bold text-zinc-900">
        <span
          className={`w-2 h-2 rounded-full ${
            isLive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
          }`}
        />
        <span>{isLive ? `Rastreo GPS en vivo · ${truckPlate}` : `Trazado de ruta · ${truckPlate}`}</span>
      </div>
    </div>
  );
}
