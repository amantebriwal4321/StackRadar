# BRIEF — StackRadar, warm editorial

**Build:** `stackradar-editorial`
**Date:** 2026-08-27
**Supersedes:** `stackradar-terminal` (the Live surface build, shipped earlier
the same day)

**Interview status:** **Partially interviewed.** The owner answered the
structural questions directly (light vs dark, scope, assets, illustration
budget) and gave the two reference sites. The vibe, journey and energy answers
are **self-authored** from those references plus the product, and are marked.

---

## What prompted this

The owner's verdict on the Live surface build, in their words:

> "Our website is dark, clumsy, there are no items, not interactive at all."

And the instruction:

> "Basically, copy it but for stack radar. And if there's an element that is not
> relatable to our website, don't use them, instead ask something that I can get
> from my side."

References given: `mindmarket.com`, and its extracted design system on
`styles.refero.design`.

**The diagnosis that shapes this build:** the page does not feel empty only
because it is black. MindMarket carries **65 photographs**; StackRadar has
**zero image files in the entire repo.** Turning the lights on without adding
substance produces a bright empty page instead of a dark one. So this build
changes the light *and* puts real objects on the page.

---

## The eight answers

### 1. Vibe, plus references
*Self-authored from the supplied references.*

**Warm. Printed. Confident. Handmade.**

References, taken from what MindMarket actually is rather than from adjectives:
a well-set trade magazine, a Muji shop floor (cream, calm, objects placed
deliberately), and a good field guide — something you flip through rather than
scroll past.

### 2. The scroll journey
*Self-authored.*

Title page. Then the problem named plainly: you are guessing what to learn next.
Then the measurement behind our answer, stacking up. Then the catalog, where you
pick things up and the page responds. Then the order to learn them in. Then a
colophon that hands back what you built.

### 3. The energy curve
*Self-authored.*

Calm open, deliberately quiet, like a cover. Rises through the problem. Steady
and factual through the measurement. **Loudest at the catalog**, which is the
only place the reader's hand is on something. Falls away for the order, which
should read as instruction rather than persuasion. Quiet, warm and resolved at
the colophon.

### 4. Feelings, and the ONE moment
*Self-authored stages. The peak follows from the owner's "not interactive at
all", which is the complaint this answers.*

| Chapter | Feeling |
|---|---|
| 1 Title page | invitation |
| 2 The guess | recognition |
| 3 The measurement | reassurance |
| 4 **The catalog** | **agency** |
| 5 The order | momentum |
| 6 Colophon | resolve |

**The one moment:** you pick up a technology while reading and the page keeps
it. By the end it is holding a stack you assembled without filling in anything.

> "I didn't fill in a form. I just read it, and by the end it knew what I was
> building."

Lives in **chapter 4**, the largest span on the page.

### 5. One thing no other site does
*Owner's complaint, converted into the mechanic.*

**Reading builds your stack.** The margin folio starts empty. Every chapter
offers real tools from the live catalog; picking one drops it into the folio,
which follows you down the page. The closing plate computes from what you
picked: real average momentum, what is missing, the next roadmap step.

Nobody else can build it: it needs the live catalog and the roadmaps together.

### 6. How far from premium-minimal
*Owner's answer: go light, retire Dala.*

Warm and friendly rather than austere. Cream ground, charcoal ink, four playful
accents, panels with a real surface at 10px radius, Inter at weight 500
throughout. The previous system's rules (pure black, one accent, no card
surface, weight 400/200) are all retired with it.

### 7. One unbroken world, or distinct scenes
*Follows from the chosen grammar.*

**Distinct chapters**, each on its own ground, with hard cuts between them. That
is what MindMarket does with its alternating cream and beige panels, and it is
what makes the page read as something printed rather than something played.

### 8. What assets exist
*Owner's answer: all four are coming. Until then, labelled placeholders, and
"add normal images those are relatable to the website till I get them."*

Available now, and carrying the page:
- **Live data.** 31 tools, real scores, 2,772,018 real stars, five sources.
- **Real tech brand logos** via `simple-icons`, replacing emoji.
- **Product screenshots I capture myself** with the installed Playwright and
  Chrome, from the running app. Real product, no stock, no credits.

Promised, with a labelled slot held open for each:
- A screen recording of the console (chapter 3)
- Two or three real beta-user quotes (chapter 5)
- A founder photo or short clip (chapter 6)

Nothing is invented to fill those. A fabricated testimonial is a ship-blocker,
and a fake one is worse than an empty slot.

---

## The feeling curve

| Ch | Feeling | What on screen causes it |
|---|---|---|
| 1 | Invitation | Cream, one line at 124px, nothing else asked of you |
| 2 | Recognition | The guess named plainly, against a product screenshot |
| 3 | Reassurance | Source cards stacking up, each carrying a real count |
| 4 | **Agency (PEAK)** | Logos you can pick up; the folio fills as you do |
| 5 | Momentum | Real roadmap figures counting into place |
| 6 | Resolve | Your own stack, named back to you, on a quiet plate |

No two adjacent chapters share a feeling. Chapter 3 is deliberately quieter than
chapter 4.

## The peak

**Chapter 4, span 3.6vh** — largest by a clear margin, next largest is 2.2.

> "I didn't fill in a form. I just read it, and by the end it knew what I was
> building."

## Tell-someone sentence

> It's the site where **reading it builds the thing you came for.**

## Authored silence

**The half-viewport before the catalog opens in chapter 4.** The page goes still
so the first pick-up lands in quiet. Verification must not report it as dead
scroll.
