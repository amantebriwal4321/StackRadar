# Assets still needed

The landing is built and live. Four things on it are **labelled placeholder
slots** rather than content, because they need something only you can supply.
Each slot is visible on the page and carries its own spec, so you can work from
the site itself and never need this file — it is here so the list survives
outside the browser, and the numbering matches (`Asset 01` on the page is `1.`
below).

Nothing here is faked to fill the gap. In particular the testimonial slot stays
empty until real quotes exist: inventing one is a hard rule against, and a
plausible fake is worse than an obvious blank.

**Order of value:** 1 is worth more than 2, 3 and 4 combined. If you only ever
do one of these, do 1.

| # | Asset | Where | Drop it at |
|---|---|---|---|
| 1 | Screen recording | ch. 3, The measurement | `frontend/public/media/console.mp4` |
| 2 | Beta-user quotes | ch. 5, The order | `frontend/src/data/testimonials.ts` |
| 3 | Your photo or clip | ch. 6, Colophon | `frontend/public/media/founder.jpg` |
| 4 | Roadmap walkthrough *(optional)* | ch. 5, beside the quotes | `frontend/public/media/roadmap.mp4` |

When any of them is in place, tell me the filename and I will wire it in,
delete the slot, and re-verify the page.

---

## 1. Screen recording of the console  ·  do this one first

**Where:** chapter 3, "The measurement", beside the source cards.
**Drop it at:** `frontend/public/media/console.mp4`

| | |
|---|---|
| Length | 5–10 seconds |
| Shows | scrolling `/explore`, then opening one tool |
| Audio | not needed |
| Size | 1280px wide or more |
| Format | `.mp4` |

**How:** Windows `Win + Alt + R` starts a capture. Let a score ring finish
animating before you stop.

**When it lands:** the chapter stops describing the product and starts showing
it running. The largest single upgrade left on the page.

---

## 2. Real beta-user quotes

**Where:** chapter 5, "The order", where the reference site runs case studies.
**Drop them at:** `frontend/src/data/testimonials.ts`

| | |
|---|---|
| How many | two or three is plenty |
| Each needs | the quote, a first name, what they were learning |
| Source | feedback form or waitlist replies |
| Length | one or two sentences each |

**How:** paste them to me in any form and I will shape the file.

**When it lands:** an empty slot becomes a quoted row. Until then the page
makes no social-proof claim at all, which is the honest position for a beta.

---

## 3. A photo of you, or a short clip

**Where:** chapter 6, the colophon byline.
**Drop it at:** `frontend/public/media/founder.jpg` (or `.mp4` for a clip)

| | |
|---|---|
| Either | a headshot, or ~10s of you to camera |
| Saying | what StackRadar is for, in your own words |
| Crop | portrait, 4:5 |
| Format | `.jpg` — or `.mp4` for the clip |

**How:** a phone photo in even light is genuinely fine.

**When it lands:** becomes the byline on the closing plate, so the page ends on
a person rather than a paragraph.

---

## 4. Roadmap walkthrough  ·  optional

**Where:** chapter 5, beside the quotes.
**Drop it at:** `frontend/public/media/roadmap.mp4`

| | |
|---|---|
| Length | 6–12 seconds |
| Shows | checking off two or three steps on a roadmap |
| Audio | not needed |
| Format | `.mp4` |

**When it lands:** demonstrates the progress loop that the copy currently only
claims.

---

## What is already covered, so you do not need to send it

- **Tech brand logos.** Real React, Rust, Kubernetes and 26 other marks now
  render from `simple-icons` instead of emoji. Foundry and Hardhat have no entry
  in that set and still use their emoji.
- **Product screenshots.** `frontend/public/media/shot-*.png` were captured from
  your own running app, so they are the real product rather than stock. They
  will go stale if the UI changes much; say the word and I will re-shoot them.
- **Every number on the page.** All live, from the API.
