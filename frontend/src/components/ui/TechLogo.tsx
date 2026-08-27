import * as si from "simple-icons";

/* Real brand marks instead of emoji.
 *
 * The reference site's richness is partly a wall of recognisable client logos.
 * StackRadar's honest equivalent is the technologies it actually tracks, and
 * emoji were standing in for them everywhere. simple-icons (MIT) covers 29 of
 * the 31; the two it misses fall back to the tool's emoji rather than to a
 * generic placeholder, which would be worse than the emoji it replaced.
 *
 * Server component: no hooks, no client bundle cost.
 */

const ICON_KEY: Record<string, string> = {
  astro: "Astro",
  bun: "Bun",
  deno: "Deno",
  docker: "Docker",
  ethersjs: "Ethers",
  fastapi: "Fastapi",
  go: "Go",
  grafana: "Grafana",
  kubernetes: "Kubernetes",
  langchain: "Langchain",
  metasploit: "Metasploit",
  nextjs: "Nextdotjs",
  ollama: "Ollama",
  "owasp-zap": "Owasp",
  prisma: "Prisma",
  prometheus: "Prometheus",
  pytorch: "Pytorch",
  react: "React",
  rust: "Rust",
  supabase: "Supabase",
  svelte: "Svelte",
  tailwindcss: "Tailwindcss",
  tensorflow: "Tensorflow",
  terraform: "Terraform",
  transformers: "Huggingface",
  trpc: "Trpc",
  vite: "Vite",
  vuejs: "Vuedotjs",
  wireshark: "Wireshark",
  // foundry and hardhat have no simple-icons entry; they use the emoji path.
};

type Icon = { path: string; hex: string; title: string };

function lookup(slug: string): Icon | null {
  const key = ICON_KEY[slug];
  if (!key) return null;
  const icon = (si as unknown as Record<string, Icon | undefined>)["si" + key];
  return icon ?? null;
}

export default function TechLogo({
  slug,
  emoji,
  size = 24,
  brand = false,
  className = "",
}: {
  slug: string;
  /** Fallback for the two tools simple-icons does not carry. */
  emoji?: string | null;
  size?: number;
  /** true paints the official brand colour; false inherits currentColor. */
  brand?: boolean;
  className?: string;
}) {
  const icon = lookup(slug);

  if (!icon) {
    return (
      <span
        aria-hidden="true"
        className={className}
        style={{ fontSize: size * 0.85, lineHeight: 1, display: "inline-block" }}
      >
        {emoji ?? "●"}
      </span>
    );
  }

  return (
    <svg
      role="img"
      aria-label={icon.title}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      /* Several brand marks are pure #000000, which disappears on the dark
         theme, so brand colour is opt-in and currentColor is the default. */
      fill={brand ? `#${icon.hex}` : "currentColor"}
    >
      <path d={icon.path} />
    </svg>
  );
}

/** True when a real brand mark exists, for callers that need to know. */
export function hasTechLogo(slug: string): boolean {
  return lookup(slug) !== null;
}
