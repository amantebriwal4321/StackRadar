# Fingerprints

Every site you build with **scrollcraft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|
| stackradar-terminal | Live surface | App chrome: tab strip + live status line (no wordmark+CTA bar) | Surface already in a state (pinned readouts, no title card) | 5 acts / 11.0vh, peak 3rd and largest (3.4) | Real input (goal chooser), holds | Scroll is the time axis: the wheel scrubs the real snapshot series and the ranking reorders | Pure-black data surface, Dala tokens, no photography | StackRadar |

*(first row appended 2026-08-27. From the next build onwards, this table is the
constraint.)*

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- **Live surface** as a grammar, claimed by `stackradar-terminal`.
- **App chrome instead of a nav bar** (tab strip + live status line).
- **Closing on a real input rather than a CTA button.**
- **Scroll-as-time-axis** as a signature move. A later build scrubbing any other
  series through scroll is the same move wearing different data.
- The **5 acts / 11.0vh** band, peak third at 3.4vh.
- A **pure-black, zero-imagery data ground.** A second build with no generated
  assets must find a different reason to have none.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scrollcraft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.
