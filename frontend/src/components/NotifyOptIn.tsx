"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { Bell, BellRing, Check, Loader2 } from "lucide-react";
import { getNotificationStatus, subscribeNotifications, type NotificationStatus } from "@/data/trends";

/**
 * Daily-nudge opt-in.
 *
 * The nudge is the retention half of the loop — it brings a student back the
 * next day with their exact next lesson. This sits inside the "Continue
 * learning" hero, where the habit already lives. Email prefills from Clerk so
 * opting in is one tap.
 */
export default function NotifyOptIn() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const userId = user?.id || "";
  const clerkEmail = user?.primaryEmailAddress?.emailAddress || "";

  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getToken()
      .then((t) => getNotificationStatus(userId, t))
      .then((s) => { setStatus(s); setEmail(s.email || clerkEmail); })
      .catch(() => setStatus({ subscribed: false, email: null }));
  }, [userId, clerkEmail, getToken]);

  if (!userId || !status) return null;

  if (status.subscribed) {
    return (
      <div className="flex items-center gap-2 text-[11px] font-mono text-[#12B76A]">
        <BellRing className="w-3.5 h-3.5" />
        Daily nudge on — we&apos;ll email your next lesson.
      </div>
    );
  }

  const onSubscribe = async () => {
    if (saving || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    setSaving(true);
    try {
      const t = await getToken();
      setStatus(await subscribeNotifications(userId, email, t));
    } catch {
      /* leave the form so they can retry */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
      <span className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--c-ink-2)] uppercase tracking-wider shrink-0">
        <Bell className="w-3.5 h-3.5 text-indigo-600" /> Daily nudge
      </span>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] text-sm text-[var(--c-ink)] placeholder:text-[var(--c-ink-2)]/50 focus:outline-none focus:border-indigo-500/50"
      />
      <button
        onClick={onSubscribe}
        disabled={saving}
        className="btn-primary text-xs py-2 px-4 rounded-lg shrink-0 justify-center disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Remind me</>}
      </button>
    </div>
  );
}
