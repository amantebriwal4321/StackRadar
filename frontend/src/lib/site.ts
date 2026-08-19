/**
 * Single source of truth for the site's absolute URL.
 *
 * Used for OG images, canonical links, the sitemap, robots.txt, and JSON-LD —
 * anything that must be an absolute URL. To point the app at a new domain, set
 * ONE env var (`NEXT_PUBLIC_SITE_URL`) in your host's dashboard and redeploy;
 * no code changes anywhere.
 *
 *   • local dev:   unset → http://localhost:3000
 *   • production:  https://stackradar.vercel.app  (or your js.org / custom domain)
 *
 * Note: it's read at build time (it's baked into statically-generated metadata),
 * so set it before the build, not just at runtime.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, ""); // tolerate a trailing slash in the env value
