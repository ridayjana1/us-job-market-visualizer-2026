"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * App-wide theme provider (next-themes). Defaults to the system theme,
 * persists the user's choice to localStorage, and applies the `dark` class on
 * <html> so Tailwind `dark:` variants and our CSS variables switch together.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
