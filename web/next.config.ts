import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// en desarrollo, Next bloquea los archivos de la página si se abre desde otra IP (el visor VR, un celular);
// se permiten todas las IP locales de este equipo
const LAN = Object.values(networkInterfaces()).flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n!.address);

// proxy al backend: el navegador llama a /backend/... y Next lo reenvía
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: LAN,
  async rewrites() {
    return [{ source: "/backend/:path*", destination: `${BACKEND_URL}/:path*` }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
