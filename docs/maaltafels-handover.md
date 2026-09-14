# Newton — Maaltafels build handover

**For:** a Claude Code session working on the Newton game
**From:** design session, 13/09/2026
**Owner:** Chris (Christophe van Eysendyck)
**Repo:** https://github.com/Chris-van-Eysendyck/Newton-Game (public, MIT)
**Live:** newton-the-game.netlify.app (Netlify site id `1cf172a0-53e3-425e-8167-df4a7f6a26b4`)
**Local tree (probable source of truth):** `C:\Users\lokaaladmin\Documents\Projects\Newton`


> **Repo check, 13/09/2026: corrections to this handover** (the rest is unchanged)
>
> - **§1 is done.** `Newton 1/` was the source of truth (byte-identical to live deploy `696c97d1`
>   except `Level1.js`). It is now promoted to the repo root and tagged `live-2026-01-18`.
>   GitHub had 6 commits, not 1; they are kept as history.
> - **Levels.** There are four levels, not two. `Level1.js` (1113 lines) is the only one with the
>   touch numpad; `Level2.js` (826 lines) is keyboard-only. `Level3.js` is not empty:
>   `Level3`/`Level4` are "splitsen" levels (530 lines each, copies of each other).
> - **Removed.** `GameScene1.js` and `AsteroidBonus.js` were unreferenced and are gone from the
>   tree (still in history). Ignore them in §12.
> - **Numpad.** The "existing numpad" for Reis is written inline in `Level1.js`
>   (`createTouchButtons`); it can't be imported and needs re-creating in `BaseMathScene`.
> - **Level1 changes.** Level1 got one change after the tag: the numpad layout fix plus a START
>   button fix (it was never destroyed).
> - **Routing.** `Start.js` sets `registry.targetLevel` and goes through `HyperJump`; new scenes
>   plug in there.
>
> **Decided by Chris, 13/09/2026: open points in §5**
>
> - **Session.** A session is a calendar day (local time). Two runs on one evening are one session.
> - **Credits.** Strict: at most one promotion credit per fact per session for *both* steps, so
>   `leren → vlot` and `vlot → beheerst` each take ≥ 3 session days. Only the first answer to a
>   fact in a session can earn credit.
> - **Calibration.** The first 7 session days are counted **per input mode**: typed (Reis) and MC
>   (Warp) calibrate separately.
> - **Interpretation, not yet confirmed.** The correct answer that moves a fact from `untested` to
>   `leren` does not count toward the 3 needed for `vlot`.
> - **Schema (§7) as built in `src/core/`.**
>   - `latencies` is split per mode (`{ typed: [], mc: [] }`).
>   - Facts also carry `slowStreak`.
>   - `config.thresholds.{typed,mc}` holds `{ ms, source, samples, computedAt }` or `null`.
>   - `config.calibrationDays.{typed,mc}` replaces `thresholdTypedMs` / `thresholdMcMs`.
>   - `sessionsCredited` is capped at 10.
>
> **Decided by Chris, 13/09/2026: Step 2 (§7, §9, §15)**
>
> - **Profile picker.** It appears only when a child enters the maaltafels, through the MAALTAFELS
>   button on the start screen. Level 1–4 need no profile. The picker is skipped when there is
>   exactly one profile.
> - **Creating profiles.** Only on the parent screen; kids pick from existing names.
> - **Parent screen.** Reached through a small ⚙ in the bottom-right corner of the start screen.
>   It is an HTML overlay started by the `ParentConfig` scene, because it needs real form controls.
>
> **Built in step 3, 14/09/2026: De Reis. Confirmed by Chris the same day.**
>
> - **Rules live in `src/core/run.js`.** The file is tested under node. `BaseMathScene` only draws
>   and collects input; `ReisScene` is the numpad over it.
> - **Pool.** There is no map yet (step 4), so a leg draws from every unlocked table.
> - **Leg length.** In-leg miss repeats count toward the 20. The end-of-leg repeats come after them.
>   The 5-minute soft stop ends the main phase, and the end repeats still follow.
> - **Leaving early.** Every answer is saved as soon as it is given. A leg abandoned after at least
>   one answer (STOP, ESC or closing the tab) still logs a session and a calibration day. With no
>   answers, nothing is logged.
> - **Dock screen.** It shows the number correct for the leg and the best combo, with only a MENU
>   button. There is no "nog een reis": a second leg the same evening earns no credit anyway.
> - **Miss.** The full fact (`7 × 8 = 56`) stays on screen for 2.2 s with the child's answer
>   underneath, and the shield flickers. There are no red flashes and no ship knock-back.

---

## 0. What this is

Newton is a Phaser 3 educational maths game, originally built for Chris's son and now used by
other people too. The existing content covers sums to 20. The son starts **maaltafels** in
2de leerjaar from **October 2026**: tafel van 10 first, then 2, then 5. The rest follow over the
year. **Deeltafels arrive in April 2026/27** — build for them, don't implement them yet.

This document specifies two new levels and, more importantly, the engine underneath them.
It is the product of a full design session; the reasoning is compressed out. Where a rule looks
arbitrary, it isn't — do not "improve" it without raising it with Chris first. §12 lists the
decisions that are settled.

---

## 1. Step zero — repo hygiene, before any code

The GitHub repo is **not** a working repo. It has a single commit ("Add files via upload"), no
history, and two source trees, one of which is dead. The live Netlify deploy is known-good and
current; the GitHub copy is behind it (it is keyboard-only, with no touch numpad). Chris believes
the live version was pushed from the local Windows folder, but is not certain.

**Do these before writing a line of game code.**

1. **Establish the source of truth.** Compare the local tree against what's live. Fastest check:
   does the local `Level1.js` contain touch-numpad code, and does the live site show an on-screen
   numpad on a phone? If both yes, local is canonical and GitHub is stale.
2. **Make it a real repo.** Initialise/commit the canonical tree with actual history. The existing
   single commit stays in history — nothing is lost.
3. **Delete the dead root tree.** Root `index.html` loads `./src/main.js` and `./phaser.js`; at
   root there is no `src/` and no `phaser.js` (the files are `./main.js` and `./scenes/`). That
   copy cannot run and it is the first thing a visitor to the public repo sees. The real project
   is `Newton 1/` (Phaser Editor project, `project.config`). Promote it to root, drop the rest.
4. **Connect Netlify to the GitHub repo.** Currently it looks like drag-and-drop deploys — there
   is no traceable link between what's live and what's committed, and no rollback. There is no
   build step (plain ES modules, Phaser from CDN), so: no build command, publish directory =
   the folder containing `index.html`.
5. **Tag the current live state** before any new work, so there is a known-good point to return to.

Rationale: other people's children use this. A live thing with outside users and no undo path is
the same failure class as Chris's standing rule that a data gap must never render as a clean
report — you cannot see the state you are in.

---

## 2. The structural problem to avoid

`Newton 1/src/scenes/Level2.js` is `Level1.js` copy-pasted. Both 806 lines. The entire diff is the
class name, `targetScore` 5→10, and `Between(0, 10)` → `Between(0, 20)`. `Level3.js` is 0 bytes.

Adding the maaltafel levels the same way produces ~3,200 lines with the mastery engine duplicated
four times and every bug fixed in three places out of four. **Do not do this.**

**Leave `Level1.js` and `Level2.js` alone.** They work, the son uses them, and refactoring working
content for a live user buys risk for no visible gain. The only permitted change to them is
optional latency logging (§6), and only at the end. The new levels get a new engine; migrating the
old ones is a later decision, or never.

---

## 3. Non-negotiable design rules

These come from the design session and are settled.

1. **The only input is the answer.** No steering, no dodging, no dual-tasking. The ship flies
   itself; a correct answer is the trigger. A 7-year-old retrieving 6×8 is at capacity — asking him
   to also not crash will cost him the sum every time. **He never dies while thinking.**
2. **A wrong answer never ends the run.** No game-over on arithmetic. Wrong answers cost the combo
   (the thing he is building), never lives.
3. **Show the correct answer on a miss**, then re-ask. Current `Level1` fires a 1500ms hit
   animation with input disabled and never shows the answer. That is where the learning is lost.
4. **Mastery is latency, not accuracy.** A fact answered correctly in six seconds is being
   *computed*, not *retrieved*. Both are logged; only fast retrieval graduates.
5. **Never unlock a table before the teacher does.** Competing with the classroom is worse than
   doing nothing. Unlocks are a manual switch Chris flips (§9).
6. **Nothing Star Wars.** "Trooper" as a rank word is fine; the art stays original. This is public
   under Chris's name with an MIT licence.
7. **Never show the child the fact-level grid.** "4 of 100 mastered" in October is demotivating by
   construction. He sees planets and ranks; Chris sees the data (§9).
8. **No teacher backend, no login, no accounts.** Raised previously, deliberately parked. Profiles
   are local (§7), shaped so they *could* sync later.
9. **Never sample uniformly at random.** See §5. This is the single decision the whole thing rests
   on.

---

## 4. Fact model

```js
// a = the table (multiplicand), b = the multiplier
{ a, b, product }
factId = `${a}x${b}`          // e.g. "7x8"
```

A planet's pool is `a × 1 … a × 10` — ten facts per table.

**Question shapes** — model all three now, implement only `MULT` until April:

| shape | form | status |
| :-- | :-- | :-- |
| `MULT` | `a × b = ?` | active |
| `MISSING` | `a × ? = c` | built, disabled |
| `DIV` | `c : a = ?` | built, disabled |

**Commutativity.** `7x8` and `8x7` are **separate facts** — a 7-year-old does not automatically
transfer between them. One exception: when a fact reaches `beheerst`, its sibling, *if still
`untested`*, is seeded at `leren`. Nothing else transfers.

---

## 5. Mastery engine

### States

`untested → leren → vlot → beheerst`

These are internal. The child never sees them (§3.7); they drive planet ranks (§8).

### Promotion

| transition | condition |
| :-- | :-- |
| `untested → leren` | first correct answer |
| `leren → vlot` | 3 consecutive correct, any speed |
| `vlot → beheerst` | 3 consecutive correct **under threshold**, spanning **≥ 2 distinct sessions** |

**A repeat of the same fact within one session never counts toward promotion.** At most one
promotion-credit per fact per session. Three fast answers inside ninety seconds measures working
memory — the number is still in his head from two questions ago. Promotion has to cross a night's
sleep at least once.

`beheerst` can **only** be earned in the typed level (Reis). Multiple choice can be passed by
recognition, so it is practice, not proof. `vlot` can be earned in either.

### Demotion

- Any **wrong** answer → back to `leren`, streak reset to 0.
- **Correct but slow**: demote `beheerst → vlot` only after **two consecutive** slow answers. One
  slow answer is noise — the cat walked past.

### Latency measurement

- Clock **starts** when the question is fully rendered.
- Clock **stops on first keypress / first tap**, not on submit. Stopping at submit measures his
  thumbs, not his recall.
- Thresholds are **per input mode** — typing on a numpad is structurally slower than tapping a
  button, and one global number would make the typed level look worse than it is.

### Threshold calibration

There is no timing data in the existing code, so do not hardcode a number from a study of American
third-graders.

- **Sessions 1–7: calibration.** Log latencies, apply no threshold. Nothing reaches `beheerst` yet;
  that is correct and harmless, because October is the tafel van 10.
- **Thereafter:** `thresholdMs = clamp(1.5 × median(correct-answer latencies on facts at vlot or
  above), 2000, 6000)`, computed separately per mode, recalculated monthly.
- **Fallback** until ≥ 30 correct samples exist in a mode: typed 5000ms, MC 3500ms.

Self-tightening as he gets faster, anchored to him.

---

## 6. Selection engine

Sampling is weighted, over the pool of **unlocked and active** facts only.

| state | weight | note |
| :-- | :-- | :-- |
| `leren` | 5 | |
| `untested` | 3 | |
| `vlot` | 2 | |
| `beheerst` | 1 | only if `lastSeenAt` older than 7 days — maintenance, not drilling |

Additional rules:

- **Never the same fact twice in a row.**
- **Miss re-queue:** a missed fact returns after exactly 2 intervening questions, and once more at
  the end of the run. **Neither repeat can promote** — they are correction, not evidence.
- Guessing must not pay. The combination of re-queue plus "wrong resets the streak" means
  tap-spamming through the MC level gets you nowhere.

Rationale, so nobody "simplifies" this away: there are 100 facts but ×1, ×2, ×5, ×10 are nearly
free and commutativity halves the remainder. The genuinely hard core is about a dozen — 6×7, 6×8,
7×8, 7×9, 8×9, 6×9, 4×7, 3×8, 7×7, 8×8, 4×8, 6×6. Uniform sampling spends most of the practice
budget re-confirming 2×3 while those come round every few minutes. That is why kids grind
maaltafels for months without the hard twelve ever sticking.

---

## 7. Persistence

`localStorage`, one key per profile: `newton.profile.<slug>`.

```json
{
  "version": 1,
  "name": "…",
  "createdAt": "2026-10-01T18:30:00Z",
  "facts": {
    "7x8": {
      "state": "leren",
      "streak": 0,
      "correct": 12,
      "wrong": 3,
      "lastSeenAt": "2026-11-04T18:32:11Z",
      "sessionsCredited": ["2026-11-02", "2026-11-04"],
      "latencies": [3120, 2890, 4400]
    }
  },
  "planets": { "maan": { "unlocked": true, "rank": "kapitein" } },
  "sessions": [
    { "date": "2026-11-04", "mode": "warp", "questions": 42, "correct": 38, "durationMs": 90000 }
  ],
  "config": {
    "unlockedTables": [10],
    "tableForPlanet": { "maan": 10, "mercurius": 2, "venus": 5 },
    "thresholdTypedMs": null,
    "thresholdMcMs": null
  }
}
```

- Cap `latencies` at the last 10 per fact, `sessions` at the last 60. Keeps storage small and
  bounded.
- **Profile picker on start** — other people's children play this. Default profile if only one.
- **Export / import as a JSON string** in a textarea on the parent screen. That is the escape
  hatch for device migration; localStorage is per-device and per-browser.
- **Write a `version` field and honour it.** Migrations will be needed.
- A missing or corrupt profile must fail visibly, not silently reset to zeros. Chris's standing
  rule: a data gap never renders as a clean report.

---

## 8. The map and the ranks

### Ranks are on the planet, not the fact

A rank badge reads to a child as a thing *he* has. Per-fact state is engine plumbing and stays
invisible. Per planet:

| rank | earned when |
| :-- | :-- |
| **Trooper** | ladder unlocked, work started |
| **Navigator** | every fact in the table correct at least once |
| **Kapitein** | every fact at `vlot` |
| **Admiraal** | every fact at `beheerst` |

**Displayed rank is a high-water mark.** Internally a fact demotes on a miss and gets drilled
again, but the badge never comes off. Ranks are earned, not rented — a 7-year-old losing Kapitein
because he fluffed one sum on a tired evening is a fight nobody wants at 19:15.

Overall pilot rank = count of Admiraal badges. It only ever goes up.

### The map

| # | destination | tafel |
| :-- | :-- | :-- |
| 1 | Maan | 10 |
| 2 | Mercurius | 2 |
| 3 | Venus | 5 |
| 4 | Mars | 4 |
| 5 | Asteroïdengordel | 3 |
| 6 | Jupiter | 6 |
| 7 | Saturnus | 8 |
| 8 | Uranus | 7 |
| 9 | Neptunus | 9 |
| — | **De Zon** | all tables mixed |

The Sun is the **gauntlet**, unlocked only after nine Admiraal badges. Mixed-table retrieval is a
genuinely different skill from within-table retrieval and most children never get drilled on it.
It is also where deeltafels land in April without needing a new map.

The belt reuses the existing `Asteroid2.png`. Distance from Earth happens to track difficulty, so
the map reads as "further = harder" without contrivance.

**The planet↔table mapping lives in config, not in code** (§9). Teachers reshuffle.

---

## 9. Parent config screen

Reachable from the start screen, not prominent, not password-protected (overkill here).

- **Unlock toggles per table.** Chris flips one on when the teacher introduces it. Nothing is
  unlocked by date or automatically.
- **Planet↔table mapping** as dropdowns.
- **The data Chris sees:** fact-level grid with state and median latency, per-planet progress,
  session history. `untested` facts render as *untested* — never as 0% and never as green.
- **Threshold display** (current calibrated values, per mode) and a recalibrate button.
- **Export / import / reset profile.**

October 2026 starting state: tafel van 10 only. Then 2, then 5, on Chris's switch.

---

## 10. The two levels

Both are configs over one shared base scene. All user-facing strings in **Dutch** — the existing
game already is ("Welkom Kapitein!").

### Level A — **Warp** (arcade)

- **Multiple choice**, 4 tappable options, no typing.
- **Session clock: 90 seconds.** How far can you get. **No fail state** — the clock ending is a
  docking animation, not a death. Self-competition against his own best.
- Score = distance + combo multiplier.
- **Distractor generation** is the real design work here. Wrong options must be plausible:
  `a×(b±1)`, `a×(b±2)`, `(a±1)×b`. Exactly 3 wrong + 1 right, shuffled, deduplicated, no negatives,
  no duplicate of the correct answer. Obviously-wrong options teach nothing; near-misses force
  actual discrimination.
- Wrong answer: show the correct answer ~1200ms, combo resets, shield flicker, **no damage**.
  Re-queue per §6.
- Can earn `vlot`, **cannot** earn `beheerst`.

**No per-question timer in v1.** Time-pressuring a fact he cannot yet retrieve is how children
learn to hate arithmetic. A per-question timer is a later unlock, and only over facts already
proven in Reis.

### Level B — **De Reis** (expedition)

- **Typed answer** on the existing numpad. No clock.
- A run is one journey leg: default 20 questions, then dock. Soft stop around five minutes with a
  docking animation and "tot morgen" — not an endless loop. Rote practice works in short daily
  bursts.
- Wrong answer: show the correct answer, re-ask after 2 intervening questions, re-ask once more at
  the end of the leg.
- **The only mode where `beheerst` is earned.**

**Ship Reis first.** Warp is the fun one, but it cannot credit mastery — and if Warp ships first he
will never play Reis. Reis is also the simpler scene.

---

## 11. Reward metering

Front-load the **feel**, meter the **content**.

The first weapon must be genuinely satisfying from the Moon onward — good hit effects, screen
shake, a combo that builds. That costs nothing later and it is what gets him used to the game.

But ×10, ×2 and ×5 need no motivational scaffolding; he will have those thirty-odd facts fluent by
Christmas almost regardless. Spend all the novelty there and you have a bored child facing the hard
tables in January.

| planet | unlock |
| :-- | :-- |
| Maan, Mercurius | base blaster, full effects |
| Venus | cosmetic (trail) |
| **Mars** (tafel 4) | **second weapon** |
| Asteroïdengordel | cosmetic (decal) |
| **Jupiter** (tafel 6) | **new enemy type** |
| Saturnus | cosmetic (hull colour) |
| **Uranus** (tafel 7) | **hull upgrade** |
| Neptunus | cosmetic |
| De Zon | final sequence |

Cosmetics can drop at every planet — they are cheap and there is always something.

---

## 12. Architecture

```
src/
  core/                 ← pure JS, ZERO Phaser imports, testable under node
    facts.js            fact generation, ids, siblings, question shapes
    mastery.js          state machine, promotion/demotion, thresholds, calibration
    selector.js         weighted sampling, no-repeat, miss re-queue
    profile.js          localStorage load/save/migrate/export/import
    clock.js            latency measurement
    config.js           planets, table mapping, defaults, unlock state
  scenes/
    BaseMathScene.js    shared HUD, ship, effects, question lifecycle
    WarpScene.js        config over base
    ReisScene.js        config over base
    MapScene.js         solar system, planet ranks
    ParentConfig.js     unlock toggles, mapping, data view, export
    Start.js            + profile picker
    GameScene1.js       untouched
    HyperJump.js        untouched
    Level1.js           untouched (except optional §6 latency logging, last)
    Level2.js           untouched (idem)
```

**`core/` must not import Phaser.** It is the part that must not break, and it should be runnable
and testable from a node script with no browser. Write that test script — feed it a synthetic
answer stream and assert the state transitions. This is worth more than any amount of manual play
testing, because the mastery rules are exactly the thing you cannot eyeball.

A level must end up being roughly a config object over `BaseMathScene`, not another 800-line file.

---

## 13. Work order

0. **Repo hygiene** (§1). Nothing else starts first.
1. **`core/` + node test script.** No UI at all. Get the state machine right in isolation.
2. **Profile picker + ParentConfig.** Unlock toggles must exist before content does.
3. **ReisScene.** Ship it. This is the pedagogically load-bearing one and the simpler scene.
4. **MapScene + ranks.**
5. **WarpScene** + distractor generation.
6. **Reward metering and cosmetics** (§11) — only Maan/Mercurius assets needed before January.
7. *Optional, last:* retrofit latency logging into Level1/Level2.

Target: steps 0–3 live before the tafel van 10 is introduced in October. Steps 4–6 can land over
the autumn. Nothing after step 5 is needed before January.

---

## 14. Do not

- Do not use Star Wars assets or imagery.
- Do not add steering, dodging, or any second input channel.
- Do not add a game-over on a wrong answer.
- Do not sample facts uniformly at random.
- Do not show the child the fact-level grid or a "x of 100" counter.
- Do not build a teacher backend, login, or accounts.
- Do not refactor Level1/Level2 beyond optional logging.
- Do not unlock tables by date or automatically.
- Do not hardcode a latency threshold before calibration data exists.
- Do not copy-paste a scene to make a new level.

---

## 15. Open items for Chris

- Confirm the local tree is canonical once §1.1 is checked.
- Confirm session cadence (assumed: a few minutes, most evenings). It changes how long "spanning
  ≥2 sessions" takes in practice.
- Decide whether the profile picker needs to be visible from the start screen or can live behind
  the parent screen — depends on whether other children play on the same device.
- Deeltafels: revisit in **March 2027**, ahead of the April introduction. `MISSING` and `DIV` are
  already modelled; they need enabling, a UI decision, and their own place in the rank rules.

---

*End of handover. Design decisions in §3, §5, §6 and §8 were argued through and settled on
13/09/2026; treat them as given unless Chris reopens them.*
