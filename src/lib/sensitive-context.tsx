"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type SensitiveContextType = {
  revealed: boolean;
  reveal: () => void;
};

const SensitiveContext = createContext<SensitiveContextType | null>(null);
const STORAGE_KEY = "vipextoy_sensitive_revealed_v1";

export function SensitiveProvider({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);

  // Doc trang thai da luu (1 lan bam la nho luon cho lan sau, khong
  // can bam lai moi lan vao site).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of localStorage on mount, not a rendering loop.
      if (saved === "1") setRevealed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const reveal = () => {
    setRevealed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <SensitiveContext.Provider value={{ revealed, reveal }}>
      {children}
    </SensitiveContext.Provider>
  );
}

export function useSensitive() {
  const ctx = useContext(SensitiveContext);
  if (!ctx) {
    throw new Error("useSensitive must be used within SensitiveProvider");
  }
  return ctx;
}
