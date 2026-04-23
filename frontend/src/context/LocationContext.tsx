import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";

interface Location {
  latitude: number;
  longitude: number;
}

interface LocationContextValue {
  location: Location | null;
  setLocation: (location: Location | null) => void;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: PropsWithChildren) {
  const [location, setLocation] = useState<Location | null>(null);

  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);

  if (!context) {
    throw new Error("useLocation must be used within LocationProvider");
  }

  return context;
}
