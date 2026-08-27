import { ImageResponse } from "next/og";

/**
 * Dynamic Open Graph card — the branded preview that renders wherever a
 * StackRadar link is shared (WhatsApp, X, LinkedIn, Discord). This is what makes
 * a shared /plan link look like a product, not a bare URL, so it earns the click.
 *
 * Params: ?title=...&subtitle=...&emoji=...  (all optional)
 */
export const runtime = "nodejs";

// Dala palette, duplicated by hand: this route renders server-side with
// no CSS, so it cannot read the design tokens in globals.css. Keep these two
// in step with --accent-1 / --color-indigo-400 by hand when the palette moves.
const COBALT = "#2C2E2A";        // Electric Iris
const COBALT_LIGHT = "#FF705D";  // Iris light

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "Learn the right tech, in the right order").slice(0, 80);
  const subtitle = (searchParams.get("subtitle") || "Sequenced roadmaps · best free video per step · ranked by live data").slice(0, 120);
  const emoji = (searchParams.get("emoji") || "🧭").slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#F5F1E4",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        {/* top row: brand + live pill */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: COBALT,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "26px", fontWeight: 400,
              }}
            >
              ◎
            </div>
            <div style={{ fontSize: "30px", fontWeight: 400, letterSpacing: "-0.5px" }}>StackRadar</div>
          </div>
          <div
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "8px 18px", borderRadius: "999px",
              border: `1px solid ${COBALT_LIGHT}66`, background: `${COBALT_LIGHT}22`,
              fontSize: "20px", fontFamily: "monospace", color: COBALT_LIGHT,
            }}
          >
            <div style={{ width: "10px", height: "10px", borderRadius: "999px", background: COBALT }} />
            LIVE DATA
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <div style={{ fontSize: "68px" }}>{emoji}</div>
          <div style={{ fontSize: "70px", fontWeight: 400, lineHeight: 1.05, letterSpacing: "-2.8px", maxWidth: "1000px", display: "flex" }}>
            {title}
          </div>
          <div style={{ fontSize: "30px", color: "#bdbdbd", maxWidth: "900px", display: "flex" }}>
            {subtitle}
          </div>
        </div>

        {/* bottom CTA strip */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              padding: "14px 30px", borderRadius: "22.5px",
              background: COBALT,
              fontSize: "26px", fontWeight: 600, color: "#fff", display: "flex",
            }}
          >
            Start free →
          </div>
          <div style={{ fontSize: "24px", color: "#9a9a9a", fontFamily: "monospace", display: "flex" }}>
            no sign-up to start
          </div>
        </div>

        {/* No accent orb. A 480px Iris circle is exactly the "large surface" the
            accent is barred from, and every equivalent wash was removed from the
            app itself — the card should read as the same product. */}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
