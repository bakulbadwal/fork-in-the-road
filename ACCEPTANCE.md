# Fork in the Road: acceptance criteria

Numeric checks are asserted against `window.FR` (the exact math) and `window.FRSim` (the seeded toy world); `node tests/check.js` prints every number below. Behaviour checks were run in a real browser. Verified 25 Sep 2026.

## A. The math is right

| # | Check | Expected | Result |
|---|---|---|---|
| A1 | Cosine schedule (`squaredcos_cap_v2`): √ᾱ at t = 0 / 250 / 500 / 750 / 999 | 1.000 / 0.920 / 0.702 / 0.378 / 0.000 (ᾱ₉₉₉ = 2.4 × 10⁻⁹) | ✓ |
| A2 | Linear schedule (β 1e-4 → 0.02): √ᾱ at the same t | 1.000 / 0.722 / 0.279 / 0.057 / 0.006 (ᾱ₉₉₉ = 4.0 × 10⁻⁵) | ✓ |
| A3 | The two volume knobs: (√ᾱ)² + (√(1−ᾱ))² | 1.000000 at every t | ✓ |
| A4 | Half-fog point (first t with ᾱ < 0.5) | cosine **496** · linear **259** | ✓ |
| A5 | K-pass timesteps, most noisy first | K = 3 → 999, 666, 332 · K = 10 → 999, 899, …, 99 · K = 1000 → 999 … 0 | ✓ |
| A6 | Null case: denoise an un-noised blob centre at ᾱ ≈ 1 | returns the centre, error < 10⁻⁶ | ✓ |
| A7 | From pure fog (t = 999) the guess is the mixture mean | (0.0001, −0.0000) vs mean (0, 0) | ✓ |
| A8 | ε ↔ x̂₀ round trip: `epsFrom(qSample(x0, ε), x0)` | returns ε to 10⁻⁶ | ✓ |
| A9 | A lightly fogged left point stays left; heavy fog pulls the guess to the middle | t = 100 → (−1.24, 0.16) left · t = 500 → (−0.78, 0.00) left · t = 700 → (−0.18, −0.02) cart · t = 999 → (0, 0) cart | ✓ |
| A10 | The averager's answer = the mixture mean, and it's inside the cart | (0.000, −0.000), `inCart` = true | ✓ |

## B. The toys teach the right direction (seeded, the same for every visitor)

| # | Check | Expected | Result |
|---|---|---|---|
| B1 | 2-D map, cosine, DDIM η = 0, 600 chains, seed 11: share in the cart by passes | K = 1 **100%** · 2 **39%** · 3 **11%** · 5 **2%** · 10 **0%** (1 of 600) · 20/50/100/1000 **0%** | ✓ |
| B2 | Same with η = 1 (DDPM-like) | K = 2 43% · 5 1% · 10 0% · 50 0% | ✓ |
| B3 | Linear schedule, η = 0 | K = 1 100% · 2 **94%** · 5 16% · 10 2% (the K = 2 second stop is t = 499, where linear √(1−ᾱ) = 0.96) | ✓ |
| B4 | Budget at 10 ms per pass, 10 Hz | passes that fit: 1, 2, 3, 5, 10 · DDPM's 1,000 passes = 10 s | ✓ |
| B5 | The lookout: cart at +0.4 / +0.7 / +1.0, 10 passes | with the report 0% / 0% / 0% in the cart · blindfolded 1% / 20% / **28%** (blind left share 52% / 56% / 69%) | ✓ |
| B6 | The drive, cartographer, K = 10, Ta = 8, lookout on, cart still, 20 seeded drives | 0 dents · 0.05 flips per drive · 3.6 s per drive · 4 cards · 10 of 20 first cards go left | ✓ |
| B7 | The averager, same square | **20 of 20** dent · 1.2 s | ✓ |
| B8 | One pass per card | 20 of 20 dent (one pass is the averager) · two passes: 1 of 20 | ✓ |
| B9 | Re-plan every pin (Ta = 1) | 0 dents · **1.90** flips per drive · jitter 0.107 vs 0.031 · 6.4 s · with 50 passes: 1.80 flips (more passes don't fix dithering) | ✓ |
| B10 | Ta = 4 / 16 | flips 0.20 / 0.00 · 0 dents | ✓ |
| B11 | The push (cart 0 → +0.7 at 0.5 s), lookout on | 0 dents · 0.35 flips (the courier re-routes) | ✓ |
| B12 | The push, blindfolded | **11 of 20** dent (every drive that went right) · same as a cart parked at +0.7 from the start | ✓ |
| B13 | The push, lookout on, drive the whole card (Ta = 16) | **10 of 20** dent: the report arrives but isn't re-read until the card is used up | ✓ |
| B14 | The averager with the push (or the cart parked at +0.7) | 0 of 20 dent: off-centre, the demonstrators no longer fork evenly, so the average is a real route | ✓ |
| B15 | The pacing vendor (cart at 0.8·sin(2πt/8)), K = 10 | 1 of 20 dent · 3.5 s per drive | ✓ |
| B16 | Same with K = 1,000 (10 s of thinking per card) | **17 of 20** dent · 24.5 s per drive · with Ta = 2: 20 of 20 · with a faster motor: 17 of 20 · with Ta = 16: 18 of 20 | ✓ |
| B17 | Review board, case 1: the right fix passes, the tempting ones fail | cartographer K10: 0/20 ✓ · 10× more drives (same averager): 20/20 ✗ · averager Ta = 1: 20/20 ✗ | ✓ |
| B18 | Case 2 | Ta = 8: 0.05 flips ✓ · 50 passes at Ta = 1: 1.80 ✗ · 1 pass: 20/20 dents ✗ | ✓ |
| B19 | Case 3 | 10 passes: 1/20 dents, 3.5 s ✓ · Ta = 2 at 1,000 passes: 20/20 ✗ · faster motor at 1,000 passes: 17/20, 23.8 s ✗ | ✓ |

## C. It teaches

- C1 Every step is interactive, with live visuals; nothing computes until a control is touched.
- C2 Every step 0–6 has at least two predict-then-reveal questions (16 in all), and every answer key quotes a number from A or B.
- C3 Every step ends with a "say it out loud" line that unlocks after the predictions and three interactions.
- C4 Every technical term has a tooltip with its plain meaning and its square equivalent.
- C5 Every step names the course notebook section or the Diffusion Policy section it covers.
- C6 The honesty note is on the page and in the README.
- C7 Review board: three cases, each with a fleet re-drive scored on the behaviour *and* a named cause; known-good fixes pass, known-bad fixes fail for the stated reason (B17–B19).
- C8 Field test: eight questions answered by operating the widgets, graded automatically with tolerances (8/8 on the right answers; two wrong answers score 6/8). Every question is answerable from a widget.
- C9 The fog-lift and drive animations are time-based; under `prefers-reduced-motion` or `?instant=1` they jump straight to the end.
- C10 Every step but the last ends with a "Next: …" button.

## D. It works

- D1 Opens straight from the file: no server, no build step, no fetch of local files.
- D2 Zero console errors across all steps.
- D3 No horizontal page scroll at 375 px in any step (the step signs become a swipeable row).
- D4 Progress persists across reloads in localStorage, wrapped so it degrades safely.
- D5 Step links use `#/s3`, which matches no element id, so the browser never fragment-jumps; a legacy `#s3` is rewritten before the body parses. Verified: `#s3` loads as `#/s3`, step 3 shown, scrollY 0 with fonts loaded.
- D6 A fresh-context adversarial review finds no open correctness issue (see the git log for what it found and what changed).
