import type { NextConfig } from "next";

// Where the FastAPI backend actually listens, from the Next server's point of
// view. On the same host that's localhost:8000; override with BACKEND_ORIGIN in
// other setups. Only used server-side (in the rewrite + SSR fetches).
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:8000";

const nextConfig: NextConfig = {
  /**
   * Same-origin API proxy.
   *
   * The browser calls `/api/v1/*` on whatever origin served the page
   * (localhost:3000, or 192.168.1.8:3000 on a phone) and Next forwards it to the
   * backend server-side. This removes the old fragility where the client fetched
   * a hardcoded `http://<LAN-IP>:8000` that was unreachable from the same machine
   * (firewall) or required a second open port on the phone. Now only the page's
   * own port needs to be reachable.
   *
   * Scoped to `/api/v1/*` so the app's own `/api/og` route is NOT proxied.
   */
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${BACKEND_ORIGIN}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
