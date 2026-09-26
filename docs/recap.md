# Fork in the Road: the recap card

Print this before a sitting. Every number is from the lab's own widgets (`ACCEPTANCE.md` has them all).

## The five lines to carry

1. **Forward:** x_t = √ᾱ_t·x₀ + √(1−ᾱ_t)·ε. A crossfader between the map and Gaussian fog, set by a schedule (cosine is half fog at t ≈ 500, linear at t ≈ 260).
2. **Train:** pick a random t, add fog, have the network predict the fog, take the squared error. That is the whole objective.
3. **Why passes:** from pure fog, the squared-error-best single guess is the average of everything (the cart). Small passes commit gradually to one side: 1 pass 100% in the cart, 5 passes 2%, 10 passes 1 in 600.
4. **Sample:** start from fog and step with the sampler. DDIM does it in about 10 passes; flow matching's Euler strides follow the same path in different coordinates. A learned network's clean guess is clipped (diffusers' `clip_sample`), because at t = 999 the guess formula divides by √ᾱ ≈ 0.00005 on the cosine schedule; diffusers' default "leading" spacing starts a notch lower instead.
5. **Robots:** swap the image for a card of 16 waypoints, condition on what the camera sees, drive 8, look again. Same schedule, same loss. A regression policy averages the fork and dents the cart; a diffusion policy picks a side.

## The steps, in one line each

| Step | The one thing |
|---|---|
| 0 · The Square | Squared error answers a fork with the average, and the average is the cart. More data doesn't change it. |
| 1 · Fog Rolls In | The forward process is arithmetic; the schedule sets how fast the map fades. |
| 2 · The Cartographer | The exact best guess from pure fog is the smudge. Predicting the fog and predicting the map are the same prediction. |
| 3 · Fog Lifts in Passes | Each pass starts from a map that already leans, so the pin commits to a side. |
| 4 · The Stopwatch | A card of 8 pins is 0.8 s of driving; 10 DDIM passes take 0.1 s. A thousand would take 10 s. |
| 5 · The Lookout | Conditioning: with the observation, routes go around today's cart; blindfolded, around where it used to be. |
| 6 · Pin 16, Drive 8 | Receding horizon: commit to a card for smoothness, re-plan for reactivity. Re-plan every pin and the courier dithers. |
| 7 · Arrows | Flow matching trains a straight-line velocity; with the exact field it is DDIM's path in other coordinates. The learned field bends at a fork, for both. |
| 8 · The Apprentice | Under-trained, she blurs the fork into the cart (a third of the pins at 300 steps, about ten at 10,000). Trained, she draws each side about as often as the exact cartographer does through the same sampler, rare sides included, and her one pass (25/25 log, 10,000 steps) is the cart average like anyone's. The exact cartographer is the ceiling. |

## The paper numbers to remember

Diffusion Policy: T_p = 16, T_a = 8, T_o = 2 · DDIM at 10 inference steps (100 for training) · 0.1 s per chunk on an RTX 3080 · square cosine schedule · FiLM conditioning in the CNN variant · +46.9% average over 15 tasks.
π0: flow matching, 10 Euler steps, chunks of 50 at up to 50 Hz, 300M-parameter action expert. GR00T N1: 4 Euler steps, chunks of 16 in 63.9 ms on an L40, 2.2B parameters.
