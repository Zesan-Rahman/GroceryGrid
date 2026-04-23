import { useState } from "react";
import { useLocation } from "../context/LocationContext";
import "./LocationRibbon.css";

export default function LocationRibbon() {
  const { location, setLocation } = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (location) {
    return null;
  }

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
    <div className="location-ribbon">
      <div className="location-ribbon-content">
        <p className="location-ribbon-text">
          {error ? (
            <span className="location-ribbon-error">Error: {error}</span>
          ) : (
            "Enable location to see stores near you"
          )}
        </p>
        <button
          className="location-ribbon-button"
          onClick={handleRequestLocation}
          disabled={loading}
        >
          {loading ? "Loading..." : "Enable Location"}
        </button>
      </div>
    </div>
  );
}
