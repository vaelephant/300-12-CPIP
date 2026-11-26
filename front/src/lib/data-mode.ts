const rawMode = import.meta.env.VITE_DATA_MODE ?? import.meta.env.VITE_HCC_API_MODE ?? "demo";
export const DATA_MODE: "demo" | "server" = rawMode === "server" ? "server" : "demo";
export const IS_SERVER_MODE = DATA_MODE === "server";
