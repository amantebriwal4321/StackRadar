# Assets still needed

The landing is built and live. Three things on it are **labelled placeholder
slots** rather than content, because they need something only you can supply.
Each slot is visible on the page and says what goes in it, so nothing is hidden.

Nothing here is faked to fill the gap. In particular the testimonial slot stays
empty until real quotes exist: inventing one is a hard rule against, and a
plausible fake is worse than an obvious blank.

---

## 1. Screen recording of the console  ·  highest value

**Where:** chapter 3, "The measurement", beside the source cards.
**Drop it at:** `frontend/public/media/console.mp4`

5 to 10 seconds. Scroll `/explore`, open a tool, let a score ring animate. No
audio needed, and any resolution above 1280 wide is fine. Screen-record it
however you like (Windows: `Win + Alt + R`).

**What changes when it lands:** the chapter stops describing the product and
shows it running. This is the single biggest remaining upgrade on the page.

**Tell me:** "console.mp4 is in" and I will wire it in and re-verify.

---

## 2. Real beta-user quotes

**Where:** chapter 5, "The order", where the reference site runs case studies.
**Drop them at:** `frontend/src/data/testimonials.ts`

Two or three is plenty. For each: the quote, a first name, and what they were
learning. Anything real from the feedback form or the waitlist works, even if
it is short.

**What changes when it lands:** an empty slot becomes a quoted row. Until then
the page makes no social-proof claim at all, which is the honest position for a
beta.

---

## 3. A photo of you, or a short clip

**Where:** chapter 6, the colophon byline.
**Drop it at:** `frontend/public/media/founder.jpg` (or `.mp4` for a clip)

A headshot, or 10 seconds of you saying what StackRadar is for. The reference
site's entire pitch is real humans, and a beta product gains more from a face
than a mature one does.

---

## 4. Optional: roadmap walkthrough

**Where:** chapter 5, beside the quotes.
**Drop it at:** `frontend/public/media/roadmap.mp4`

You checking off steps on a roadmap page. Shows the progress loop the copy
currently only claims.

---

## What is already covered, so you do not need to send it

- **Tech brand logos.** Real React, Rust, Kubernetes and 26 other marks now
  render from `simple-icons` instead of emoji. Foundry and Hardhat have no entry
  in that set and still use their emoji.
- **Product screenshots.** `frontend/public/media/shot-*.png` were captured from
  your own running app, so they are the real product rather than stock. They
  will go stale if the UI changes much; say the word and I will re-shoot them.
- **Every number on the page.** All live, from the API.
