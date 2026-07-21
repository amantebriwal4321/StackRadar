"use client";

import { useState, useEffect } from "react";
import {
  Play, ListVideo, ExternalLink, Eye, ThumbsUp, Clock, AlertTriangle,
  BookOpen, Languages, Search,
} from "lucide-react";
import { fetchToolResources, type ToolResources, type LearningResource } from "@/data/trends";

/**
 * Where a learner goes after deciding a tool is worth their time.
 *
 * Video results are ranked server-side on real YouTube statistics (reach,
 * engagement, freshness, depth) — see backend/app/services/resources.py. When no
 * YOUTUBE_API_KEY is configured the API returns scoped searches instead and
 * flags `videos_live: false`; this component says so plainly rather than
 * presenting four search links as if they were a curated ranking.
 */

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function duration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function VideoCard({ r }: { r: LearningResource }) {
  const isSearch = r.kind === "search";
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className="tech-panel tech-panel-interactive rounded-xl overflow-hidden flex flex-col group"
    >
      <div className="relative aspect-video bg-[var(--c-surface-2)] overflow-hidden">
        {r.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.thumbnail}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isSearch
              ? <Search className="w-8 h-8 text-indigo-500/40" />
              : <Play className="w-8 h-8 text-indigo-500/40" />}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          {r.kind === "playlist"
            ? <><ListVideo className="w-3 h-3" /> {r.item_count} videos</>
            : r.kind === "search"
              ? <><Search className="w-3 h-3" /> Search</>
              : <><Play className="w-3 h-3" /> Video</>}
        </span>

        {r.language === "hi" && (
          <span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-[var(--accent-1)] text-[10px] font-mono font-bold text-white uppercase tracking-wider">
            हिन्दी
          </span>
        )}

        {r.duration_s ? (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono font-bold text-white tabular-nums">
            {duration(r.duration_s)}
          </span>
        ) : null}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h4 className="text-sm font-bold text-[var(--c-ink)] leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {r.title}
        </h4>
        {r.channel && (
          <p className="text-[11px] font-mono text-[var(--c-ink-2)] truncate">{r.channel}</p>
        )}

        {(r.views !== null || r.likes !== null) && (
          <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--c-ink-2)] tabular-nums">
            {r.views !== null && (
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {compact(r.views)}</span>
            )}
            {r.likes !== null && (
              <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {compact(r.likes)}</span>
            )}
            {r.published_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {new Date(r.published_at).getFullYear()}
              </span>
            )}
          </div>
        )}

        {isSearch && r.blurb && (
          <p className="text-[11px] text-[var(--c-ink-2)] font-light leading-relaxed">{r.blurb}</p>
        )}

        {/* The differentiator: we know the tool's live release data, so we can
            warn before someone commits six hours to a superseded API. */}
        {r.staleness && (
          <p className="mt-auto flex items-start gap-1.5 text-[10px] font-mono text-[#B54708] leading-relaxed">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
            {r.staleness}
          </p>
        )}
      </div>
    </a>
  );
}

export default function LearningResources({ slug }: { slug: string }) {
  const [data, setData] = useState<ToolResources | null>(null);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetchToolResources(slug, lang)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, lang]);

  if (loading) {
    return (
      <div className="tech-panel rounded-2xl p-6 md:p-8">
        <div className="h-4 w-40 rounded bg-[var(--c-surface-2)] animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-[var(--c-border)] overflow-hidden">
              <div className="aspect-video bg-[var(--c-surface-2)] animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-3 rounded bg-[var(--c-surface-2)] animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-[var(--c-surface-2)] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (failed || !data) {
    return (
      <div className="tech-panel rounded-2xl p-6 md:p-8">
        <p className="text-sm text-[var(--c-ink-2)] font-light">
          Couldn&apos;t load learning resources right now.
        </p>
      </div>
    );
  }

  return (
    <div className="tech-panel rounded-2xl p-6 md:p-8 relative overflow-hidden">
      <div className="hud-grid absolute inset-0 opacity-[0.3] pointer-events-none" />

      <div className="relative space-y-8">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Learn {data.name}
            </span>
            <h3 className="text-xl md:text-2xl font-black font-display text-[var(--c-ink)]">
              Where to actually learn this
            </h3>
            <p className="text-sm text-[var(--c-ink-2)] font-light max-w-xl">
              {data.videos_source === "youtube_api"
                ? "Ranked on real view counts, like ratio, recency and course depth — not on what YouTube wants to show you."
                : data.videos_source === "curated"
                  ? "Hand-picked flagship courses, each checked to be live right now. Add a YouTube API key to auto-rank the full catalog."
                  : "Scoped searches and reference platforms. Add a YouTube API key to rank actual videos here."}
              {data.latest_version && (
                <> Currently on <span className="font-mono font-bold text-[var(--c-ink)]">{data.latest_version}</span>.</>
              )}
            </p>
          </div>

          {/* Hindi is a first-class option, not an afterthought — a large share
              of Indian learners prefer it for first-pass understanding. */}
          <div className="flex items-center gap-1 p-1 rounded-xl border border-indigo-500/20 bg-[var(--c-surface)]/60 shrink-0">
            <Languages className="w-3.5 h-3.5 text-[var(--c-ink-2)] ml-2 mr-1" />
            {(["en", "hi"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  lang === l
                    ? "bg-[var(--accent-1)] text-white"
                    : "text-[var(--c-ink-2)] hover:bg-[var(--c-surface-2)]"
                }`}
              >
                {l === "en" ? "English" : "हिन्दी"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Videos ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h4 className="text-[11px] font-mono font-bold text-[var(--c-ink-2)] uppercase tracking-widest">
              {data.videos_source === "youtube_api"
                ? "Top-ranked videos & playlists"
                : data.videos_source === "curated"
                  ? "Recommended courses"
                  : "Video searches"}
            </h4>
            {data.videos_source === "youtube_api" && (
              <span className="text-[10px] font-mono text-[var(--c-ink-2)]/70 uppercase tracking-wider">
                Ranked by reach · engagement · freshness · depth
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.videos.map((r) => <VideoCard key={r.url} r={r} />)}
          </div>
        </div>

        {/* ── Platforms ── */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-mono font-bold text-[var(--c-ink-2)] uppercase tracking-widest">
            Beyond video
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.platforms.map((p) => (
              <a
                key={p.url}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 p-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)]/60 hover:border-indigo-500/40 hover:bg-[var(--c-surface-2)] transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-wider">
                      {p.channel}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[var(--c-ink)] leading-snug group-hover:text-indigo-600 transition-colors">
                    {p.title}
                  </p>
                  {p.blurb && (
                    <p className="text-xs text-[var(--c-ink-2)] font-light leading-relaxed">{p.blurb}</p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--c-ink-2)] shrink-0 mt-0.5 group-hover:text-indigo-600 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
