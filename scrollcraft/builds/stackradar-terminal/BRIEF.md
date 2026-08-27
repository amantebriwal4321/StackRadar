# BRIEF — StackRadar, "the terminal is the page"

**Build:** `stackradar-terminal`
**Date:** 2026-08-27
**Interview status:** **Partially interviewed.** Questions 4 (the peak), 5, 6, 7
and 8 were answered by the owner directly, in a structured choice. Questions 1
(vibe/references), 2 (journey) and 3 (energy curve) are **self-authored** from
the documented brand in `CLAUDE.md` and the live product, and are marked as such
below. Nothing here is paraphrased into marketing prose.

---

## The eight answers

### 1. Vibe in three to five words, plus references
*Self-authored.*

**Instrument. Cold. Certain. Alive.**

References, none of them websites:
- The Bloomberg Terminal — not its looks, its posture. It never sells; it
  reports, and the reporting is the authority.
- An air-traffic control scope at 3am. Sparse, dark, every mark meaningful.
- The dashboard of a seismograph station. Something is always being measured,
  whether or not anyone is watching.

The brand's own positioning line, already in `CLAUDE.md`, is
"the Bloomberg Terminal for your tech stack." The vibe follows from it rather
than being invented alongside it.

### 2. The scroll journey, section by section
*Self-authored, but constrained by the owner's choice of peak.*

1. You arrive and the instrument is already running. Mid-scrape, counters live.
   Nobody greets you.
2. You start moving and realise the scroll is moving **time**. Rankings from
   real readings reorder under your hand.
3. The noise resolves. The radar locks onto one thing that is rising fastest
   right now.
4. You ask "why should I believe that", and the page answers with where the
   number comes from.
5. You put your own goal in and get a path back.

### 3. The energy curve
*Self-authored.*

Quiet open. It should feel like walking into a room where a machine has been
working all night. Energy climbs through the time scrub, then **drops
deliberately** for about half a viewport before the lock, so the lock lands in
silence rather than on top of noise. Loud at the lock. Down again for the
sources, which are stated as fact and should feel almost boring by comparison.
Level and steady at the close, because the close asks the visitor to do
something and pressure is the wrong register for that.

### 4. How they should feel, stage by stage, and the ONE moment
*Peak answered by the owner. Stage feelings self-authored.*

| Act | Feeling |
|---|---|
| 1 | Unease. It already knows something you don't. |
| 2 | Exposure. Six weeks moved while you weren't watching. |
| 3 | **Clarity.** |
| 4 | Trust. |
| 5 | Agency. |

**The one moment (owner's answer): the radar lock.** The constellation is
drifting noise, then scroll pulls it into focus and it locks onto the single
tool rising fastest right now, from live data.

Written as the sentence a visitor would say to a friend:

> "It's the site that told me what to learn next before I asked."

Lives in **act 3**, and holds the largest scroll span on the page.

### 5. One thing this site does that no site they have seen does
*Owner's answer.*

**Scroll is the time axis.** Scrolling does not move you down a document, it
moves you forward through the real snapshot history. Weeks of true readings pass
under the wheel and the rankings actually change while you watch.

The owner's reasoning, kept because it is the justification: nobody else can
build this, because nobody else has the time series.

### 6. How far from premium-minimal
*Owner's answer.*

Stay premium-minimal. The existing Dala system (pure `#000000`, one Electric
Iris accent, Inter, no card surface) is kept exactly as documented. scrollcraft
contributes structure and motion only. This is explicitly **not** a re-theme.

### 7. One unbroken world, or distinct scenes
*Owner's answer, via choosing the Live surface grammar.*

Neither, in the cinematic sense. The page is **one continuous operable
surface** that changes state. Not a world the camera flies through, and not
cut scenes. The visitor never leaves the instrument; the instrument changes what
it is showing.

### 8. What assets already exist
*Owner's answer.*

No photography, no footage, and **no generated assets** — the account holds 80
credits and the owner's instruction was to spend nothing unless required. The
Live surface grammar bans `scrub`, so no video is required and none is bought.

Real assets that do exist and carry the page:
- **Live data.** 31 tools, real scores, 2,799,641 real stars, real mention
  counts, five named sources, updated daily in production.
- **A real time series.** `ToolSnapshot` rows, daily since 2026-08-19 and
  growing. This is the raw material of the signature move.
- **An existing WebGL constellation** (`components/3d/LiveConstellation.tsx`),
  which stops being decoration and becomes the payoff.
- **The Dala design system**, already converged and documented.

---

## The feeling curve

Written before the acts existed, per `feel.md §1`.

| Act | Feeling | What on screen causes it |
|---|---|---|
| 1 | Unease | Counters already moving, a scrape step advancing, no greeting |
| 2 | Exposure | Real dated readings sliding past; ranks visibly swapping |
| 3 | **Clarity (PEAK)** | Drift resolves; one node locks and is named |
| 4 | Trust | Five sources, real counts, stated flat |
| 5 | Agency | A field the visitor types into, answering back |

No two adjacent acts share a feeling. Act 2 is deliberately quieter than act 3.

## The peak

**Act 3, span 3.4vh** — the largest on the page by a clear margin (next largest
is 2.4).

> "It's the site that told me what to learn next before I asked."

## Tell-someone sentence

> It's the site where **scrolling moves you through time and the rankings change
> while you watch.**

An experience, not a device name.

## Authored silence

**~0.4vh at the head of act 3**, between the end of the time scrub and the lock.
The screen is near-static on purpose: the lock has to land in quiet or it reads
as one more busy transition.

**Verification must not report this as dead scroll.** It is the one place on the
page where nothing moving is the intended state.
