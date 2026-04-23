import { useState } from "react";
import { useLocation } from "../context/LocationContext";
import "./LocationRibbon.css";

interface LocationButtonProps {
  label?: string;
  className?: string;
}

export function LocationButton({ label = "Enable Location", className = "location-ribbon-button" }: LocationButtonProps) {
  const { setLocation } = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  };

  return (
    <>
      <button
        className={className}
        onClick={handleRequestLocation}
        disabled={loading}
      >
        {loading ? "Loading..." : label}
      </button>
      {error && <p className="location-ribbon-error" style={{ fontSize: "0.8rem", marginTop: "4px" }}>{error}</p>}
    </>
  );
}

export default function LocationRibbon() {
  const { location } = useLocation();

  if (location) {
    return null;
  }

  return (
    <div className="location-ribbon">
      <div className="location-ribbon-content">
        <p className="location-ribbon-text">
          Enable location to see stores near you
        </p>
        <LocationButton />
      </div>
    </div>
  );
}
