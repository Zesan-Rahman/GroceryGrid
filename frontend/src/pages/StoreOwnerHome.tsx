import type { AuthUser } from "../api/auth";
import NavBar from "../components/NavBar";
import StoreMap from "../components/StoreMap";

interface StoreOwnerHomeProps {
  user: AuthUser | null;
}

export default function StoreOwnerHome({ user: _user }: StoreOwnerHomeProps) {
  return (
    <div className="home-page">
      <NavBar />
      <main className="map-home" aria-label="Store map">
        <StoreMap />
      </main>
    </div>
  );
}
