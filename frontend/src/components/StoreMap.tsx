import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import { useEffect, useEffectEvent } from "react";
import { MapContainer, TileLayer, useMap, Marker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet.markercluster";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { type Store, type StoreHours } from "../api/stores";
import { useStores } from "../context/StoreContext";
import { useLocation } from "../context/LocationContext";
import { LocationButton } from "./LocationRibbon";

delete (L.Icon.Default.prototype as L.Icon.Default & {
    _getIconUrl?: unknown;
})._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

interface StoreMapProps {
    height?: string;
}

const NYC_CENTER: [number, number] = [40.7128, -74.006];
const DAY_ORDER = [
    ["mon", "Monday"],
    ["tue", "Tuesday"],
    ["wed", "Wednesday"],
    ["thu", "Thursday"],
    ["fri", "Friday"],
    ["sat", "Saturday"],
    ["sun", "Sunday"],
] as const;

function formatHours(hours: StoreHours) {
    return DAY_ORDER.map(([key, label]) => {
        const entry = hours[key];
        const value =
            entry?.open && entry?.close ? `${entry.open} - ${entry.close}` : "Closed";

        return { key, label, value };
    });
}

function appendParagraph(container: HTMLElement, text: string, strongLabel?: string) {
    const paragraph = document.createElement("p");

    if (strongLabel) {
        const strong = document.createElement("strong");
        strong.textContent = strongLabel;
        paragraph.append(strong, ` ${text}`);
    } else {
        paragraph.textContent = text;
    }

    container.append(paragraph);
}

function createPopupContent(store: Store) {
    const wrapper = document.createElement("div");
    wrapper.className = "store-popup";

    const heading = document.createElement("h2");
    heading.textContent = store.name;
    wrapper.append(heading);

    appendParagraph(wrapper, store.address);
    appendParagraph(wrapper, store.phone ?? "Phone unavailable");

    const websiteParagraph = document.createElement("p");
    if (store.website) {
        const link = document.createElement("a");
        link.href = store.website;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = store.website;
        websiteParagraph.append(link);
    } else {
        websiteParagraph.textContent = "Website unavailable";
    }
    wrapper.append(websiteParagraph);

    const hoursWrapper = document.createElement("div");
    hoursWrapper.className = "store-popup-hours";
    for (const entry of formatHours(store.hours)) {
        appendParagraph(hoursWrapper, entry.value, `${entry.label}:`);
    }
    wrapper.append(hoursWrapper);

    appendParagraph(wrapper, store.parking ?? "Not listed", "Parking:");

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "View Catalog";
    button.dataset.storeId = String(store.store_id);
    wrapper.append(button);

    return wrapper;
}

interface StoreClustersProps {
    stores: Store[];
    onViewCatalog: (storeId: number) => void;
}

function StoreClusters({ stores, onViewCatalog }: StoreClustersProps) {
    const map = useMap();

    useEffect(() => {
        const clusterGroup = L.markerClusterGroup();

        for (const store of stores) {
            const marker = L.marker([store.latitude, store.longitude]);
            const popupContent = createPopupContent(store);

            marker.bindPopup(popupContent);
            marker.on("popupopen", () => {
                const button = popupContent.querySelector<HTMLButtonElement>(
                    `[data-store-id="${store.store_id}"]`,
                );
                if (button) {
                    button.onclick = () => onViewCatalog(store.store_id);
                }
            });

            clusterGroup.addLayer(marker);
        }

        map.addLayer(clusterGroup);

        return () => {
            map.removeLayer(clusterGroup);
        };
    }, [map, onViewCatalog, stores]);

    return null;
}

function UserLocation() {
    const { location } = useLocation();
    const map = useMap();

    useEffect(() => {
        if (location) {
            map.setView([location.latitude, location.longitude], 13);
        }
    }, [location, map]);

    if (!location) return null;

    const redIcon = new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    return (
        <Marker position={[location.latitude, location.longitude]} icon={redIcon}>
            <Popup>
                <div style={{ textAlign: "center" }}>
                    <p style={{ margin: "0 0 8px" }}>You are here</p>
                    <LocationButton label="Update Location" className="location-update-button" />
                </div>
            </Popup>
        </Marker>
    );
}

export default function StoreMap({ height = "100%" }: StoreMapProps) {
  const navigate = useNavigate();
  const { stores, loading, error } = useStores();
  const { location } = useLocation();
  const handleViewCatalog = useEffectEvent((storeId: number) => {
    navigate(`/stores/${storeId}/catalog`);
  });

  return (
        <div className="store-map-shell" style={{ height }}>
            {loading ? <div className="store-map-overlay">Loading stores...</div> : null}
            {error ? <div className="store-map-overlay store-map-status-error">{error}</div> : null}
            <MapContainer
                center={location ? [location.latitude, location.longitude] : NYC_CENTER}
                zoom={12}
                minZoom={3}
                maxBounds={[
                    [-90, -180],
                    [90, 180],
                ]}
                maxBoundsViscosity={1.0}
                scrollWheelZoom
                className="store-map"
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <UserLocation />
                <StoreClusters stores={stores} onViewCatalog={handleViewCatalog} />
            </MapContainer>
        </div>
    );
}
