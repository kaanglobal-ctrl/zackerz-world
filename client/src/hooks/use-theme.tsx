import { createContext, useContext, useEffect, type ReactNode } from "react";

type Theme = "dark";

const ThemeContext = createContext<{ theme: Theme } | null>(null);

// Light mode has been removed — the site is always dark.
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return <ThemeContext.Provider value={{ theme: "dark" }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
