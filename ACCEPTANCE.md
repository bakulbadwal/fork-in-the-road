# Fork in the Road: acceptance criteria

Numeric checks are asserted against `window.FR` (the exact math) and `window.FRSim` (the seeded toy world); `node tests/check.js` prints every number below, rounded the way the page rounds (a non-zero count under 0.5% prints as "<1%", with the count in brackets). Behaviour checks were run in a real browser. Verified 25 Sep 2026, after the adversarial review.

## A. The math is right

| # | Check | Expected | Result |
|---|---|---|---|
| A1 | Cosine schedule (`squaredcos_cap_v2`): √ᾱ at t = 0 / 250 / 500 / 750 / 999 | 1.000 / 0.920 / 0.702 / 0.378 / 0.000 (ᾱ₉₉₉ = 2.4 × 10⁻⁹) | ✓ |
| A2 | Linear schedule (β 1e-4 → 0.02): √ᾱ at the same t | 1.000 / 0.722 / 0.279 / 0.057 / 0.006 (ᾱ₉₉₉ = 4.0 × 10⁻⁵) | ✓ |
| A3 | The two volume knobs: (√ᾱ)² + (√(1−ᾱ))² | 1.000000 at every t | ✓ |
| A4 | Half-fog point (first t with ᾱ < 0.5) | cosine **496** · linear **259** | ✓ |
| A5 | K-pass timesteps, most noisy first (diffusers' "trailing" spacing) | K = 3 → 999, 666, 332 · K = 10 → 999, 899, …, 99 · K = 1000 → 999 … 0 | ✓ |
| A6 | Null case: denoise an un-noised blob centre at ᾱ ≈ 1 | returns the centre, error < 10⁻⁶ | ✓ |
| A7 | From pure fog (t = 999) the guess is the mixture mean | (0.0001, −0.0000) vs mean (0, 0) | ✓ |
| A8 | ε ↔ x̂₀ round trip: `epsFrom(qSample(x0, ε), x0)` | returns ε to 10⁻⁶ | ✓ |
| A9 | A lightly fogged left point stays left; heavy fog pulls the guess to the middle | t = 100 → (−1.24, 0.16) left · t = 500 → (−0.78, 0.00) left · t = 700 → (−0.18, −0.02) cart · t = 999 → (0, 0) cart | ✓ |
| A10 | The averager's answer = the mixture mean, and it's inside the cart | (0.000, −0.000), `inCart` = true | ✓ |
| A11 | Independent reviewer's probes (read-only, fresh context): schedules vs a separate diffusers-formula build; DCT basis orthonormality; `denoise` vs an explicit-matrix posterior mean in 16-D and vs a 400k-sample Monte Carlo in 2-D; DDIM σ at η = 1 vs DDPM's β̃ | max difference 0 · 2.7 × 10⁻¹⁵ · 4 × 10⁻¹⁵ and 3 decimals · exact | ✓ |

## B. The toys teach the right direction (seeded, the same for every visitor)

| # | Check | Expected | Result |
|---|---|---|---|
| B0 | The demonstrations: 100 drives, alternating sides, six logged positions each | 600 positions, **300 / 300** | ✓ |
| B1 | 2-D map, cosine, DDIM η = 0, 600 pins, seed 11: share in the cart by passes | K = 1 **100%** · 2 **39%** (236) · 3 **11%** (66) · 5 **2%** (10) · 10 **<1%** (1) · 20/50/100/1000 **0%** | ✓ |
| B2 | Same with η = 1 (DDPM-like) | K = 2 43% · 5 1% (6) · 10 0% · 50 0% | ✓ |
| B3 | Linear schedule, η = 0 | K = 1 100% · 2 **94%** (562) · 5 16% · 10 2% (9). The K = 2 second stop is t = 499, where linear ᾱ = 0.08 | ✓ |
| B4 | The budget: a card of 8 pins at 10 pins/s lasts 0.8 s | at 10 ms per pass, **80** passes fit; 10 passes = 0.1 s, **11%** of a cycle spent waiting; 1,000 passes = **10 s** | ✓ |
| B5 | The lookout: cart at +0.4 / +0.7 / +1.0, 10 passes | with the report 0 / 2 / 2 of 600 in the cart · blindfolded 1% (7) / 20% (119) / **28%** (171), every one of them a right-route pin; blind left-route share 51% throughout | ✓ |
| B6 | The drive, cartographer, K = 10, Ta = 8, lookout on, cart still, 20 seeded drives | 0 dents · 0.05 flips per drive · 3.6 s per drive · 4 cards · 10 of 20 first cards go left | ✓ |
| B7 | The averager, same square | **20 of 20** dent · 0 flips (a straight card has no side) · 1.2 s | ✓ |
| B8 | One pass per card | 20 of 20 dent, 0 flips (one pass is the averager) · two passes: 1 of 20 | ✓ |
| B9 | Re-plan every pin (Ta = 1) | 0 dents · **1.90** flips per drive · jitter 0.107 vs 0.031 · 6.4 s · with 50 passes: 1.80 flips (more passes don't fix dithering) | ✓ |
| B10 | Ta = 4 / 16 | flips 0.20 / 0.00 · 0 dents | ✓ |
| B11 | The push (cart 0 → +0.7 at 0.5 s), lookout on | 0 dents · 0.35 flips (the courier re-routes) | ✓ |
| B12 | The push, blindfolded | **11 of 20** dent: every drive that ends on the right clips the cart's corner (the old route skirts +1.0 to +1.3; the cart now reaches +1.25) · same as a cart parked at +0.7 from the start | ✓ |
| B13 | The push, lookout on, drive the whole card (Ta = 16) | **10 of 20** dent: the report arrives but isn't re-read until the card is used up | ✓ |
| B14 | The averager with the push (or the cart parked at +0.7) | 0 of 20 dent: off-centre, the demonstrators no longer fork evenly, so the average is a real route | ✓ |
| B15 | The pacing vendor (cart at 0.8·sin(2πt/8)), K = 10 | 1 of 20 dent · 3.5 s per drive | ✓ |
| B16 | Same with K = 1,000 (10 s of thinking per card) | **17 of 20** dent · 24.5 s per drive · with Ta = 2: 20 of 20 · with a faster motor: 17 of 20 · with Ta = 16: 18 of 20. A cart that rolls into the courier while it thinks counts as a dent | ✓ |
| B17 | Review board, case 1: the right fix passes, the tempting ones fail | cartographer K10: 0/20 ✓ · 10× more drives (same averager): 20/20 ✗ · averager Ta = 1: 20/20 ✗ | ✓ |
| B18 | Case 2 | Ta = 8: 0.05 flips ✓ · 50 passes at Ta = 1: 1.80 ✗ · 1 pass: 20/20 dents ✗ | ✓ |
| B19 | Case 3 | 10 passes: 1/20 dents, 3.5 s ✓ · Ta = 2 at 1,000 passes: 20/20 ✗ · faster motor at 1,000 passes: 17/20, 23.8 s ✗ | ✓ |

## F. Flow matching (step 7): the same fog, the same map, Euler in K strides

| # | Check | Expected | Result |
|---|---|---|---|
| F1 | Null cases: at t = 0 the velocity points at the mixture mean and the posterior weights are uniform; one Euler stride of length 1 lands on the mean | v(x, 0) + x = mean to 10⁻⁴ · weight spread 0 · K = 1 → (0.000, 0.000) for three seeds | ✓ |
| F2 | Share of 600 pins in the cart, flow vs DDIM (η = 0, cosine), same seed 11 | K = 1 100% / 100% · 2 39% (232) / 39% (236) · 3 **8% (48) / 11% (66)** · 4 3% / 5% · 5 1% (8) / 2% (10) · 10 <1% (2) / <1% (1) · 20 <1% (1) / 0% · 50 0% / 0% | ✓ |
| F3 | Straightness (chord ÷ path length), flow vs DDIM | K = 1 1.00 / 1.00 · 2 0.64 / 0.82 · 3 0.47 / 0.71 · 5 0.53 / 0.80 · **10 0.55 / 0.87** · 50 0.55 / 0.89. The marginal flow field bends at the fork; DDIM's paths are straighter here | ✓ |
| F4 | The drive with flow-matching cards (Euler, lookout on, cart still, 20 drives) | K = 1: 20 of 20 dent (one stride is the clerk) · K = 2: 1 of 20 · K = 5: 0 dents, 0.05 flips · K = 10: 0 dents, 0.05 flips, 3.6 s | ✓ |
| F5 | Paper facts quoted on the page, read from the papers' full text on 2026-09-26 | π0: A^τ = τA + (1−τ)ε, target A − ε, τ ~ beta emphasising noisier timesteps, forward Euler with 10 steps (δ = 0.1), H = 50, up to 50 Hz, 300M-parameter expert on a 3.3B total · GR00T N1: A^τ = τA + (1−τ)ε, target ε − A, τ ~ Beta(1.5, 1) scaled, forward Euler, K = 4, H = 16, 63.9 ms on an L40 in bf16, 2.2B parameters | ✓ |

## C. It teaches

- C1 Every step is interactive, with live visuals; nothing computes until a control is touched.
- C2 Every step 0–7 has at least one predict-then-reveal question (19 in all), and every number in an answer key appears in A, B or F.
- C3 Every step ends with a "say it out loud" line that unlocks after the predictions and three interactions.
- C4 Every wavy-underlined term has a tooltip with its plain meaning and its square equivalent; ᾱ, x̂₀, Ta, latency and flow matching are wired up.
- C5 Every step names the course notebook section or the Diffusion Policy section it covers.
- C6 The honesty note is on the page and in the README, and names the timestep spacing correctly ("trailing").
- C7 Review board: three cases, each with a fleet re-drive scored on the behaviour *and* a named cause; known-good fixes pass, known-bad fixes fail for the stated reason (B17–B19). A star, once earned, is kept.
- C8 Field test: nine questions answered by operating the widgets, graded automatically with tolerances (9/9 on the right answers; seven or more earns the check). Every question states the settings it needs.
- C11 The map canvases are drawn in the scenes' language: cobbled paving, storefronts down both sides, a tree and a bench, the depot and the bakery, the cart with its striped awning and sign, the courier with its crate and antenna, and fog banks whose opacity follows √(1−ᾱ) on steps 1–2 and the pass progress on steps 3 and 7.
- C9 The fog-lift and drive animations are time-based; under `prefers-reduced-motion` or `?instant=1` they jump straight to the end, and the buttons re-enable.
- C10 Every step but the last ends with a "Next: …" button.

## D. It works

- D1 Opens straight from the file: no server, no build step, no fetch of local files.
- D2 Zero console errors across all steps.
- D3 No horizontal page scroll at 375 px in any step (the step signs become a swipeable row).
- D4 Progress persists across reloads in localStorage, wrapped so it degrades safely.
- D5 Step links use `#/s3`, which matches no element id, so the browser never fragment-jumps; a legacy `#s3` is rewritten before the body parses. Verified: `#s3` loads as `#/s3`, step 3 shown, scrollY 0 with fonts loaded.
- D6 Changing the passes, sampler or schedule while the fog is lifting can't break the run: a run carries its own settings.
- D7 A fresh-context adversarial review (read-only, a different model) was run before publishing. It confirmed the math core and found 7 blockers, 9 major and 9 minor issues in the copy, readouts and UI state: numbers the page quoted that its own widgets contradicted ("0%" for 1 of 600, "12 of 600" for 10, "300/300" for 287/313), the step 4 budget framed around a 100 ms card loop instead of the card's own 0.8 s, "leading" for the trailing spacing, the sign of the score, a misattributed reason for the cosine schedule, a "went left" readout that counted right-route pins, side flips counted on straight cards, two animation lock-ups, and an under-specified field-test question. All were fixed and re-verified; this file records the corrected values.
