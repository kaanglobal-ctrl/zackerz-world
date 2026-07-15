import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type DockState = {
  isOpen: boolean;
  activeId: number | null;
  openDock: (partnerId?: number | null) => void;
  closeDock: () => void;
  toggleDock: () => void;
  setActiveId: (id: number | null) => void;
};

const Ctx = createContext<DockState | null>(null);

export function MessageDockProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  const openDock = useCallback((partnerId?: number | null) => {
    if (partnerId != null) setActiveId(partnerId);
    setIsOpen(true);
  }, []);

  const closeDock = useCallback(() => setIsOpen(false), []);
  const toggleDock = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <Ctx.Provider value={{ isOpen, activeId, openDock, closeDock, toggleDock, setActiveId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMessageDock() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMessageDock must be used within MessageDockProvider");
  return c;
}
