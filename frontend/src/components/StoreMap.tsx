import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import {
    memo,
    useDeferredValue,
    useEffect,
    useEffectEvent,
    useMemo,
    useRef,
    useState,
} from "react";
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

interface StoreClustersProps {
    stores: Store[];
    onViewCatalog: (storeId: number) => void;
    onReadyFocusStore: (focusStore: ((storeId: number) => void) | null) => void;
}

interface StoreSearchSidebarProps {
    stores: Store[];
    onSelectStore: (storeId: number) => void;
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
            entry?.open && entry?.close ? `${entry.open} - ${entry.close}` : "Not Listed";

        return { key, label, value };
    });
}

function normalizeSearchValue(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function computeStoreMatchScore(query: string, store: Store) {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) {
        return 0;
    }

    const normalizedName = normalizeSearchValue(store.name);
    if (!normalizedName) {
        return 0;
    }

    if (normalizedName === normalizedQuery) {
        return 1000;
    }

    if (normalizedName.startsWith(normalizedQuery)) {
        return 800 - (normalizedName.length - normalizedQuery.length);
    }

    const words = normalizedName.split(" ");
    if (words.some((word) => word.startsWith(normalizedQuery))) {
        return 650 - normalizedName.indexOf(normalizedQuery);
    }

    if (normalizedName.includes(normalizedQuery)) {
        return 500 - normalizedName.indexOf(normalizedQuery);
    }

    let queryIndex = 0;
    let gaps = 0;
    for (const char of normalizedName) {
        if (char === normalizedQuery[queryIndex]) {
            queryIndex += 1;
            if (queryIndex === normalizedQuery.length) {
                return 250 - gaps;
            }
        } else if (queryIndex > 0) {
            gaps += 1;
        }
    }

    return 0;
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

const StoreClusters = memo(function StoreClusters({
    stores,
    onViewCatalog,
    onReadyFocusStore,
}: StoreClustersProps) {
    const map = useMap();
    const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
    const markerByStoreIdRef = useRef<Map<number, L.Marker>>(new Map());

    useEffect(() => {
        const clusterGroup = L.markerClusterGroup();
        const markerByStoreId = new Map<number, L.Marker>();

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
            markerByStoreId.set(store.store_id, marker);
        }

        clusterGroupRef.current = clusterGroup;
        markerByStoreIdRef.current = markerByStoreId;
        map.addLayer(clusterGroup);

        return () => {
            map.removeLayer(clusterGroup);
            clusterGroupRef.current = null;
            markerByStoreIdRef.current = new Map();
        };
    }, [map, onViewCatalog, stores]);

    useEffect(() => {
        onReadyFocusStore((storeId: number) => {
            const clusterGroup = clusterGroupRef.current;
            const marker = markerByStoreIdRef.current.get(storeId);
            if (!clusterGroup || !marker) {
                return;
            }

            clusterGroup.zoomToShowLayer(marker, () => {
                const position = marker.getLatLng();
                map.setView(position, Math.max(map.getZoom(), 16), { animate: false });
                marker.openPopup();
            });
        });

        return () => {
            onReadyFocusStore(null);
        };
    }, [map, onReadyFocusStore]);

    return null;
});

const StoreSearchSidebar = memo(function StoreSearchSidebar({
    stores,
    onSelectStore,
}: StoreSearchSidebarProps) {
    const [query, setQuery] = useState("");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const deferredQuery = useDeferredValue(query);

    const matchedStores = useMemo(() => {
        const trimmedQuery = deferredQuery.trim();
        if (!trimmedQuery) {
            return stores.slice(0, 8);
        }

        return stores
            .map((store) => ({
                store,
                score: computeStoreMatchScore(trimmedQuery, store),
            }))
            .filter((entry) => entry.score > 0)
            .sort((left, right) => {
                if (right.score !== left.score) {
                    return right.score - left.score;
                }
                return left.store.name.localeCompare(right.store.name);
            })
            .slice(0, 8)
            .map((entry) => entry.store);
    }, [deferredQuery, stores]);

    function handleSelect(storeId: number) {
        setSidebarCollapsed(true);
        onSelectStore(storeId);
    }

    return (
        <aside
            className={`store-search-sidebar${sidebarCollapsed ? " is-collapsed" : ""}`}
            aria-label="Store search"
        >
            {sidebarCollapsed ? (
                <button
                    type="button"
                    className="store-search-toggle"
                    onClick={() => setSidebarCollapsed(false)}
                    aria-expanded="false"
                >
                    Search Stores
                </button>
            ) : (
                <div className="store-search-panel">
                    <div className="store-search-panel-header">
                        <div>
                            <p className="store-search-eyebrow">Store Finder</p>
                            <h2>Search Stores</h2>
                        </div>
                        <button
                            type="button"
                            className="store-search-minimize"
                            onClick={() => setSidebarCollapsed(true)}
                            aria-label="Minimize store search"
                        >
                            Hide
                        </button>
                    </div>

                    <label className="store-search-label" htmlFor="store-map-search">
                        Store name
                    </label>
                    <input
                        id="store-map-search"
                        type="search"
                        className="store-search-input"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Start typing a store name"
                    />

                    <div className="store-search-results" role="list">
                        {matchedStores.length > 0 ? (
                            matchedStores.map((store) => (
                                <button
                                    key={store.store_id}
                                    type="button"
                                    className="store-search-result"
                                    onClick={() => handleSelect(store.store_id)}
                                >
                                    <strong>{store.name}</strong>
                                    <span>{store.address}</span>
                                </button>
                            ))
                        ) : (
                            <p className="store-search-empty">
                                No close matches yet. Try a different spelling or a shorter name.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </aside>
    );
});

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
    const focusStoreRef = useRef<((storeId: number) => void) | null>(null);
    const handleViewCatalog = useEffectEvent((storeId: number) => {
        navigate(`/stores/${storeId}/catalog`);
    });

    const handleReadyFocusStore = useEffectEvent((focusStore: ((storeId: number) => void) | null) => {
        focusStoreRef.current = focusStore;
    });

    function handleSelectStore(storeId: number) {
        focusStoreRef.current?.(storeId);
    }

    return (
        <div className="store-map-shell" style={{ height }}>
            <StoreSearchSidebar stores={stores} onSelectStore={handleSelectStore} />

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
                <StoreClusters
                    stores={stores}
                    onViewCatalog={handleViewCatalog}
                    onReadyFocusStore={handleReadyFocusStore}
                />
            </MapContainer>
        </div>
    );
}
