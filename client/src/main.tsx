import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { hydrateFromServer } from "./lib/hydration";
import { HelmetProvider } from "react-helmet-async";

// Hydrate the app with any data preloaded on the server 
hydrateFromServer();

// Render the app
createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ThemeProvider defaultTheme="light" storageKey="indie-bookshop-theme">
      <App />
    </ThemeProvider>
  </HelmetProvider>
);
