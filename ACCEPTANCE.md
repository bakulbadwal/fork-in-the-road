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
| F3 | Straightness (chord ÷ path length) in each sampler's own coordinates, flow vs DDIM | K = 1 1.00 / 1.00 (one segment, by construction) · 2 0.64 / 0.82 · 3 0.47 / 0.71 · 5 0.53 / 0.80 · 10 0.55 / 0.87 · 50 0.55 / 0.89. Not comparable across columns: see F6 | ✓ |
| F4 | The drive with flow-matching cards (Euler, lookout on, cart still, 20 drives) | K = 1: 20 of 20 dent (one stride is the clerk) · K = 2: 1 of 20 · K = 5: 0 dents, 0.05 flips · K = 10: 0 dents, 0.05 flips, 3.6 s | ✓ |
| F5 | Paper facts quoted on the page, read from the papers' full text on 2026-09-26 | π0: A^τ = τA + (1−τ)ε, target A − ε, τ ~ beta emphasising noisier timesteps, forward Euler with 10 steps (δ = 0.1), H = 50, up to 50 Hz, 300M-parameter expert on a 3.3B total · GR00T N1: A^τ = τA + (1−τ)ε, forward Euler, K = 4, H = 16, 63.9 ms on an L40 in bf16, 2.2B parameters. The GR00T paper prints the target as ε − A; its update rule (A ← A + V/K from noise at τ = 0) and its released code (`velocity = actions - noise`, `actions = actions + dt * pred_velocity` in `flow_matching_action_head.py`, n1-release) use A − ε, the same as π0 | ✓ |
| F6 | **Same fog, same pin.** With the exact field, DDIM at η = 0 and flow matching's Euler integrate the same path in different coordinates (x_flow = x_DDIM ÷ (√ᾱ + √(1−ᾱ))) | K = 10: **599 of 600** fog points end on the same side both ways, largest gap between a point's two pins 0.094 · K = 50: **600 of 600**, gap 0.020 · DDIM's trails redrawn in flow's coordinates score 0.560 (K = 10) / 0.555 (K = 50) against flow's own 0.545 / 0.551. Found by the second adversarial review; the page's earlier "DDIM's paths are straighter, because the fork bends the flow field" was a coordinate artifact and was replaced | ✓ |

## G. The apprentice (step 8): a real network, trained in the browser

`js/net.js`: an MLP (10 inputs: x, y and a sine/cosine encoding of t at four frequencies; two hidden layers of 32, SiLU; 2 outputs), hand-written backprop, Adam at lr 0.002, batches of 64, weights seeded. Trained with notebook 01's loop on the dispatcher's log (50 drives, six positions each), cosine schedule. Her clean guess is clipped to |x| ≤ 3 (diffusers' `clip_sample`) and the clip is counted at every pass. **Both samplers in this step start at t = 899** (`timestepsFrom(K, 899)`: 899, 809, … 89 for ten passes), not at 999: √ᾱ₉₉₉ ≈ 4.9 × 10⁻⁵ multiplies any error in a learned ε̂ by about 20,000 and throws every chain to the clip, which the first version of this step mistook for a lesson (G7, D8); √ᾱ₈₉₉ = 0.155, a multiplier of 6.4. Both start from centred N(0, I) fog, which is not the true fog at t = 899 for a lopsided log; G9 measures what that costs. The exact cartographer samples with the log's share as her prior. All rows: seed 11 fog, 600 pins, training seed 7 unless stated, verified in Node and Chrome (both V8).

| # | Check | Expected | Result |
|---|---|---|---|
| G1 | Gradient check: one weight by finite differences (h = 10⁻⁶), and the gradient the training step feeds to Adam (a seeded batch of 8, seven weights and biases by finite differences; Adam's update itself is not exercised) | analytic 1.4801 × 10⁻² = numeric 1.4801 × 10⁻² · worst relative error **1.7 × 10⁻⁸** · 1,474 weights | ✓ |
| G2 | The loss floors: the exact guess's mean squared error on the fog, 20,000 pairs, on the true map with the log's share / on the log's own 300 pins | 25/25: **0.356 / 0.340** · 10/40: 0.326 / 0.313 · 5/45: 0.303 / 0.290 · 1/49: 0.275 / 0.261 (± 0.003; the page shows two decimals) | ✓ |
| G3 | 25/25 log, 10 passes, by training steps, seeds 7 / 8 / 9 | 300: **191** / 224 / 171 in the cart, left 37 / 31 / 38%, route distance **0.53** / 0.55 / 0.53, clipped guesses 3 / 0 / 0 of 6,000, loss 0.479 / 0.460 / 0.474 · 3,000: **16** / 13 / 9, 0.22 / 0.22 / 0.24, no clips · 10,000: **11** / 5 / 7, 0.19 / 0.18 / 0.18, left 49 / 54 / 52%, loss 0.368 (exact from 899: 0 in the cart, 0.14, 51% left) | ✓ |
| G4 | One pass from t = 899 | Exact: **600 of 600** in the cart (the tidy average). Apprentice at 10,000 steps: **514** / 526 / 588 in the cart, route distance 0.89, **no guess clipped**; at 300 steps 467 / 299 / 64 (an under-trained one-shot lands anywhere). Fifty passes at 10,000 steps: 4 / 2 / 3 in the cart | ✓ |
| G5 | The split, 10,000 steps, 10 passes from centred fog at t = 899: the apprentice against the exact cartographer with the same share as prior, through the same sampler and the same fog. Page (fog seed 11, training seed 7) and `node tests/seeds.js` (training seeds 7–16, fog seeds 11–15) | Fog 11, seed 7 (page): 50%: **292** vs exact 307 · 20%: **132** vs 129 · 10%: **84** vs 71 · 2%: **13** vs 13; in the cart 11 / 15 / 4 / 6. Ten seeds on fog 11: 50%: 275–322, mean 306, SD 14 (binomial 12) · 20%: 108–151, mean 128, SD 15 (binomial 10) · 10%: 46–85, mean 68, SD 13 (binomial 8) · 2%: 6–20, mean 14, SD 4 (binomial 4). Ten seeds × five fogs, left share: apprentice **50.2 / 20.4 / 11.5 / 3.2%** (± SE 0.8 / 0.7 / 0.5 / 0.35) against the exact cartographer's **49.9 / 20.6 / 11.6 / 2.8%** on the same fogs (49.9 / 21.6 / 11.6 / 2.6% over 20,000 draws, G9). A single seed scatters 1.2–1.6× the fog draw; the means agree. The first rework's reading of this ("she reproduces the share: 13 / 10 / 6 against 12 ± 3") was three seeds and one fog, and 6 is outside 12 ± 3 anyway; retracted by the fourth review | ✓ |
| G6 | 30,000 steps, seed 7 | 25/25: loss **0.356** (the map floor; above the log floor 0.340), 1 in the cart, 331 left, route distance 0.16 · 1/49: loss 0.285, 0 in the cart, 13 left | ✓ |
| G7 | From t = 999 instead (the first version), for the record | Ten passes with diffusers' trailing spacing: every chain's first guess is clipped to a corner, and the pass to t = 899 starts from 0.155 × that corner; one pass: 600 of 600 at the map's edge at any training length. The "32 in the cart at 300 steps, 0 at 10,000" and "rare side drawn at 4%, then 1%, blobs dropping out" numbers the first version quoted were this corner kick plus a single seed, not properties of the network | recorded |
| G8 | A trained apprentice is still not the exact cartographer | 10,000 steps, 10 passes: 5–11 pins in the cart where the exact leaves 0; route distance 0.18–0.19 against 0.14; her loss 0.368 against the floor 0.356 | ✓ |
| G9 | The cost of starting from centred N(0, I) fog at t = 899: the real fog there still carries √ᾱ₈₉₉ = 15.5% of the map (for the 1/49 map its mean is (0.15, 0), not (0, 0)), so a centred start nudges a rare side up, for the exact cartographer as much as for the apprentice. Exact cartographer's left share by start, 20,000 chains, K = 10 (K = 50 in `tests/seeds.js`) | 50% prior: centred at 899 **49.9%** · true fog at 899 49.4% · trailing from 999 50.0% — 20%: **21.6%** · 18.8% · 18.3% (K = 50: 23.1% · 19.7%) — 10%: **11.6%** · 8.7% · 8.9% (K = 50: 12.8% · 10.0%) — 2%: **2.6%** · 1.4% · 1.7% (K = 50: 3.1% · 2.2%). The true-fog start under-draws a rare side at ten passes (a finite-K DDIM bias that closes by fifty); the page keeps the centred start every sampler in the course uses, states the nudge, and compares her against the exact count through the same sampler rather than against 600 × share | ✓ |

## C. It teaches

- C1 Every step is interactive, with live visuals; no sampling or training runs until a control is touched (step 8's loss floors are computed on the first Train, not at load).
- C2 Every step 0–8 has at least one predict-then-reveal question (22 in all), and every number in an answer key appears in A, B, F or G.
- C3 Every step ends with a "say it out loud" line that unlocks after the predictions and three interactions.
- C4 Every wavy-underlined term has a tooltip with its plain meaning and its square equivalent; ᾱ, x̂₀, Ta, latency and flow matching are wired up.
- C5 Every step names the course notebook section or the Diffusion Policy section it covers.
- C6 The honesty note is on the page and in the README, and names the timestep spacing correctly ("trailing").
- C7 Review board: three cases, each with a fleet re-drive scored on the behaviour *and* a named cause; known-good fixes pass, known-bad fixes fail for the stated reason (B17–B19). A star, once earned, is kept.
- C8 Field test: ten questions answered by operating the widgets, graded automatically with tolerances (10/10 on the right answers; eight or more earns the check). Every question states the settings it needs.
- C13 Step 8 trains in chunks of about 12 ms on a timer (not animation frames), so the page stays responsive; a background tab throttles the timer, so training slows to a crawl there and finishes when the tab is back. The Train, Lift and Study buttons disable while a run is in progress and re-enable when it ends, including after an error (the chunk loops are wrapped). Retraining clears the previous lift's tiles and maps; the exact baseline uses the share she was trained on, and the status line says so if the slider has moved since (during training too). The maps repaint when the study ends. The honesty note says one network is trained, that both step-8 samplers start at t = 899, and what she gets wrong is on the page.
- C11 The map canvases are drawn in the scenes' language: cobbled paving, storefronts down both sides, a tree and a bench, the depot and the bakery, the cart with its striped awning and sign, the courier with its crate and antenna, and fog banks whose opacity follows √(1−ᾱ) on step 1 (half of it on step 2, so the guesses stay readable), the sampler's actual √(1−ᾱ) at each pass on step 3 and on step 7's DDIM map, and 1 − t on step 7's flow map.
- C12 A second fresh-context review of step 7 confirmed the flow-matching math (posterior, velocity, Euler, straightness) and the paper numbers, and found the step's original conclusion wrong (F6). Fixed: the s7c answer key, the say-it line, the README and this file.
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
- D8 A third fresh-context review, of step 8 only, found the step's first version unpublishable as written: its one-shot lesson ("all 600 at the map's edge") and its rare-side lesson ("drawn at 4%, then 1%, with blobs dropping out") were the t = 999 corner kick and a single training seed; its loss floor did not follow the slider (and, for lopsided logs, was sampled with uniform rather than prior weights); its exact baseline ignored the slider; and the study's "≥ 5 pins per blob" rule could not be met at a 2% share by anyone. Fixed by starting both samplers at t = 899, counting clip events at every pass, computing the map and log floors per log on Train, sampling the exact baseline with the log's share, re-measuring everything over three training seeds against the binomial spread, and rewriting s8a–s8c, both callouts, the say line, the README row, the recap card and G1–G8. The lesson the step now teaches, that under-training blurs the fork into the cart and a trained network reproduces the log's shares, is the one the numbers support.
- D9 A fourth fresh-context review, of the reworked step 8, confirmed the math, the floors, the clip accounting, the UI state and every quoted number, and found two things still wrong: one false sentence about a number ("10 and 6, all inside 12 ± 3"), and that "she reproduces the share" was itself a three-seed reading contaminated by the rework's own centred start at t = 899, which nudges a rare side up for the exact cartographer too (G9). Fixed by re-measuring over ten training seeds and five fogs (`tests/seeds.js`, G5), comparing her against the exact cartographer through the same sampler and fog (the split table's reference column is now that count, and the lede, callout, s8c, say line, scene label, README and recap say "about as often as the exact cartographer"), stating the start's cost on the page and in the honesty note, and conditioning the one-pass claim on 10,000 steps and the 25/25 log. Eleven minor wording, UI-state and comment fixes from the same review are in the same commit.
