/**
 * VB6 Fixture State Management
 * 
 * Provides global state for VB6 strict mode fixture data.
 */

import { createContext, useContext, useState, ReactNode } from 'react';
import type { Vb6VehicleFixture } from '../../domain/physics/vb6/fixtures';
import { createEmptyFixture } from '../../domain/physics/vb6/fixtures';

interface Vb6FixtureState {
  fixture: Partial<Vb6VehicleFixture>;
  strictMode: boolean;
  setFixture: (fixture: Partial<Vb6VehicleFixture>) => void;
  setStrictMode: (enabled: boolean) => void;
  resetFixture: () => void;
}

const Vb6FixtureContext = createContext<Vb6FixtureState | undefined>(undefined);

export function Vb6FixtureProvider({ children }: { children: ReactNode }) {
  const [fixture, setFixture] = useState<Partial<Vb6VehicleFixture>>(createEmptyFixture());
  const [strictMode, setStrictMode] = useState(false);

  const resetFixture = () => {
    setFixture(createEmptyFixture());
  };

  return (
    <Vb6FixtureContext.Provider
      value={{
        fixture,
        strictMode,
        setFixture,
        setStrictMode,
        resetFixture,
      }}
    >
      {children}
    </Vb6FixtureContext.Provider>
  );
}

export function useVb6Fixture() {
  const context = useContext(Vb6FixtureContext);
  if (!context) {
    throw new Error('useVb6Fixture must be used within Vb6FixtureProvider');
  }
  return context;
}
