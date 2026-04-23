import type { AuthUser } from "../api/auth";
import NavBar from "../components/NavBar";
import StoreMap from "../components/StoreMap";
import LocationRibbon from "../components/LocationRibbon";

interface UserHomeProps {
  user: AuthUser | null;
}

export default function UserHome({ user: _user }: UserHomeProps) {
  return (
    <div className="home-page">
      <LocationRibbon />
      <NavBar />
      <main className="map-home" aria-label="Store map">
        <StoreMap />
      </main>
    </div>
  );
}
