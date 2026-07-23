import { ImageResponse } from "next/og";

/**
 * Dynamic Open Graph card — the branded preview that renders wherever a
 * StackRadar link is shared (WhatsApp, X, LinkedIn, Discord). This is what makes
 * a shared /plan link look like a product, not a bare URL, so it earns the click.
 *
 * Params: ?title=...&subtitle=...&emoji=...  (all optional)
 */
export const runtime = "nodejs";

const WINE = "#7C2D4A";
const MAGENTA = "#C23E6E";

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
          background: `linear-gradient(135deg, #0E0A10 0%, #1A0E16 55%, ${WINE} 160%)`,
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
                background: `linear-gradient(135deg, ${WINE}, ${MAGENTA})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "26px", fontWeight: 800,
              }}
            >
              ◎
            </div>
            <div style={{ fontSize: "30px", fontWeight: 800, letterSpacing: "-0.5px" }}>StackRadar</div>
          </div>
          <div
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "8px 18px", borderRadius: "999px",
              border: `1px solid ${MAGENTA}66`, background: `${MAGENTA}22`,
              fontSize: "20px", fontFamily: "monospace", color: "#FF9EC0",
            }}
          >
            <div style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#12B76A" }} />
            LIVE DATA
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <div style={{ fontSize: "68px" }}>{emoji}</div>
          <div style={{ fontSize: "70px", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-1.5px", maxWidth: "1000px", display: "flex" }}>
            {title}
          </div>
          <div style={{ fontSize: "30px", color: "#C9C4D6", maxWidth: "900px", display: "flex" }}>
            {subtitle}
          </div>
        </div>

        {/* bottom CTA strip */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              padding: "14px 30px", borderRadius: "14px",
              background: `linear-gradient(135deg, ${WINE}, ${MAGENTA})`,
              fontSize: "26px", fontWeight: 700, color: "#fff", display: "flex",
            }}
          >
            Start free →
          </div>
          <div style={{ fontSize: "24px", color: "#8A8398", fontFamily: "monospace", display: "flex" }}>
            no sign-up to start
          </div>
        </div>

        {/* faint accent glow */}
        <div
          style={{
            position: "absolute", top: "-160px", right: "-160px",
            width: "480px", height: "480px", borderRadius: "999px",
            background: `${MAGENTA}22`,
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
