"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";
export type ColorTheme = "purple" | "blue" | "rose" | "amber";

type StoredTheme = {
  theme?: unknown;
  color?: unknown;
};

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: ThemePreference;
  defaultColor?: ColorTheme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  colorTheme: ColorTheme;
  setTheme: (theme: ThemePreference) => void;
  setColorTheme: (color: ColorTheme) => void;
  toggleTheme: () => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

const validThemes: ThemePreference[] = ["dark", "light", "system"];
const validColors: ColorTheme[] = ["purple", "blue", "rose", "amber"];

function normalizeTheme(value: unknown, fallback: ThemePreference): ThemePreference {
  return validThemes.includes(value as ThemePreference) ? (value as ThemePreference) : fallback;
}

function normalizeColor(value: unknown, fallback: ColorTheme): ColorTheme {
  if (validColors.includes(value as ColorTheme)) return value as ColorTheme;
  if (value === "sepia") return "amber";
  return fallback;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function hasSubscriberCookie(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|; )tomoverso-subscriber=1(?:;|$)/.test(document.cookie);
}

function readStoredPreferences(storageKey: string, defaultTheme: ThemePreference, defaultColor: ColorTheme) {
  if (typeof window === "undefined") {
    return { theme: defaultTheme, color: defaultColor };
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return { theme: defaultTheme, color: defaultColor };
    const parsed = JSON.parse(stored) as StoredTheme;
    const storedColor = normalizeColor(parsed.color, defaultColor);
    return {
      theme: normalizeTheme(parsed.theme, defaultTheme),
      color: storedColor === "purple" || hasSubscriberCookie() ? storedColor : "purple",
    };
  } catch {
    return { theme: defaultTheme, color: defaultColor };
  }
}

function applyPreferences(theme: ThemePreference, resolvedTheme: ResolvedTheme, color: ColorTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-color", color);
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  defaultColor = "purple",
  storageKey = "tomoverso-ui-theme",
  ...props
}: ThemeProviderProps) {
  const initial = useMemo(
    () => readStoredPreferences(storageKey, defaultTheme, defaultColor),
    [storageKey, defaultTheme, defaultColor]
  );

  const [theme, setThemeState] = useState<ThemePreference>(initial.theme);
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(initial.color);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(query.matches ? "dark" : "light");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    applyPreferences(theme, resolvedTheme, colorTheme);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ theme, color: colorTheme }));
      document.cookie = `tomoverso-ui-theme=${theme};path=/;max-age=31536000;SameSite=Lax`;
      document.cookie = `tomoverso-ui-color=${colorTheme};path=/;max-age=31536000;SameSite=Lax`;
    } catch {}
  }, [theme, resolvedTheme, colorTheme, storageKey]);

  const value: ThemeProviderState = {
    theme,
    resolvedTheme,
    colorTheme,
    setTheme: (t) => setThemeState(normalizeTheme(t, "dark")),
    setColorTheme: (c) => setColorThemeState(normalizeColor(c, "purple")),
    toggleTheme: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
