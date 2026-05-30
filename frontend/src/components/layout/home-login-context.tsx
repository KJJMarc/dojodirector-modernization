"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface HomeLoginContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openLogin: () => void;
}

const HomeLoginContext = createContext<HomeLoginContextValue | null>(null);

export function HomeLoginProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <HomeLoginContext.Provider
      value={{
        isOpen,
        setIsOpen,
        openLogin: () => setIsOpen(true),
      }}
    >
      {children}
    </HomeLoginContext.Provider>
  );
}

export function useHomeLogin() {
  const context = useContext(HomeLoginContext);

  if (!context) {
    throw new Error("useHomeLogin must be used within HomeLoginProvider");
  }

  return context;
}
