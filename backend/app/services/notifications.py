"""
Daily learning nudge — the retention half of the loop.

Momentum data changes too slowly to pull a student back every day; their own
progress does. This builds each opted-in user a one-line "here's your next
lesson" email and sends it via Resend.

Safe by construction:
  • Only users with a NotificationPref row (explicit opt-in) are ever contacted.
  • With no RESEND_API_KEY the send is a logged no-op — nothing leaves the
    server until a provider is deliberately configured. Same degrade pattern as
    GITHUB_TOKEN / GROQ_API_KEY / YOUTUBE_API_KEY elsewhere.
  • The batch is triggered by an authenticated admin endpoint, so the owner
    points an external daily cron at it (cron-job.org, a GitHub Action, Vercel
    cron) rather than us running an in-process timer.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from loguru import logger
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.all_models import NotificationPref


def _digest_for(db: Session, user_id: str) -> Optional[dict[str, Any]]:
    """The nudge content for one user, or None if they have nothing in progress
    (no point emailing "keep going" to someone who hasn't started)."""
    from app.api.endpoints.mvp import build_progress_summary  # avoid import cycle

    summary = build_progress_summary(db, user_id)
    focus = summary.get("todays_focus")
    roadmap_slug = summary.get("focus_roadmap")
    if not focus or not roadmap_slug:
        return None
    return {
        "streak": summary.get("streak_days", 0),
        "title": focus.get("title", "your next lesson"),
        "description": (focus.get("description") or "")[:180],
        "roadmap_slug": roadmap_slug,
        "url": f"{settings.SITE_URL}/roadmap/{roadmap_slug}",
    }


def _render_email(digest: dict[str, Any]) -> tuple[str, str]:
    """(subject, html) for a digest. Plain, single-CTA — a nudge, not a newsletter."""
    streak = digest["streak"]
    streak_line = (
        f"🔥 You're on a {streak}-day streak — keep it alive."
        if streak > 0 else "A few minutes today keeps the momentum going."
    )
    subject = f"Today: {digest['title']}"
    html = f"""\
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#141726">
  <div style="font-weight:800;font-size:20px;letter-spacing:-0.3px">StackRadar</div>
  <p style="color:#5A6072;font-size:14px;margin:4px 0 24px">{streak_line}</p>
  <div style="border:1px solid #E6E2EC;border-radius:16px;padding:24px">
    <div style="font-family:monospace;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#7C2D4A;font-weight:700">Today&#39;s focus</div>
    <div style="font-weight:800;font-size:20px;margin:6px 0 8px">{digest['title']}</div>
    <p style="color:#5A6072;font-size:14px;line-height:1.5;margin:0 0 20px">{digest['description']}</p>
    <a href="{digest['url']}" style="display:inline-block;background:linear-gradient(135deg,#7C2D4A,#C23E6E);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px">Study this now →</a>
  </div>
  <p style="color:#8A8398;font-size:12px;margin-top:24px">You&#39;re getting this because you turned on daily nudges on StackRadar.</p>
</div>"""
    return subject, html


async def send_email(to: str, subject: str, html: str) -> bool:
    """Send via Resend, or no-op (returning False) when no key is configured."""
    if not settings.RESEND_API_KEY:
        logger.info(f"[digest] no RESEND_API_KEY — would email {to}: {subject!r}")
        return False
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={"from": settings.DIGEST_FROM, "to": [to], "subject": subject, "html": html},
                timeout=20,
            )
            if r.status_code >= 300:
                logger.warning(f"[digest] Resend {r.status_code} for {to}: {r.text[:200]}")
                return False
            return True
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[digest] send failed for {to}: {e}")
        return False


async def run_daily_digests(db: Session) -> dict[str, int]:
    """Build and send a nudge to every opted-in user who has a next lesson.

    Returns counts so the trigger endpoint can report what happened. Never
    raises for a single bad user — one failure can't sink the batch.
    """
    prefs = (
        db.query(NotificationPref)
        .filter(NotificationPref.daily_opt_in == True, NotificationPref.unsubscribed_at.is_(None))  # noqa: E712
        .all()
    )
    built = sent = skipped = 0
    for pref in prefs:
        try:
            digest = _digest_for(db, pref.user_id)
            if not digest:
                skipped += 1
                continue
            built += 1
            subject, html = _render_email(digest)
            if await send_email(pref.email, subject, html):
                sent += 1
                pref.last_sent_at = datetime.now(timezone.utc)
        except Exception as e:  # noqa: BLE001
            logger.warning(f"[digest] error for {pref.user_id}: {e}")
    db.commit()
    result = {"opted_in": len(prefs), "digests_built": built, "emails_sent": sent, "skipped_no_progress": skipped}
    logger.info(f"[digest] run complete: {result}")
    return result
