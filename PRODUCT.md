# Product

## Platform

web

## Stack

Static HTML/CSS/JS, no build step, no dependencies. Hosted on GitHub Pages (https://bakulbadwal.github.io/fork-in-the-road/). Must also work opened straight from the file.

## Users

Primary: the author, an MBA (UVA Darden '27) who isn't an engineer and wants to understand diffusion models well enough to read the Diffusion Policy paper and its descendants (π0, GR00T N1) with the right picture in his head. Secondary: people taking Unit 1 of the Hugging Face Diffusion Models Course who want the robotics payoff, and anyone the author shares it with.

## Product purpose

Teach why robots use diffusion to choose actions, through direct manipulation of the real math: the forward process and its two schedules, the exact denoiser and why its one-shot answer is an average, sampling in passes, DDIM vs DDPM and the inference budget, conditioning on an observation, and receding-horizon execution. Success: after about 75 minutes of play, the reader can explain why a regression policy drives into the cart and a diffusion policy goes around it, and can read the Diffusion Policy paper's method section (Tp, Ta, To, DDIM, FiLM, the cosine schedule) without a glossary.

## Positioning

The interactive diffusion explainers are about images (Diffusion Explainer for Stable Diffusion, the schedule visualisers) or about the 2-D geometry (Diffusion Explorer trains real models on hand-drawn distributions). The one diffusion-policy lab (Cart-Pole Diffusion) drives a real trained denoiser through a single-mode balancing task, so it can't show the fork. This lab is about the fork: the multi-modal action distribution that is the reason Diffusion Policy exists. It compares against the regression baseline every step of the way and ends with the robot driving.

## Operating context

Used at a laptop in study sessions alongside the course's Unit 1 notebooks, and on a phone when shared. Steps are done in order (0–8, review board, field test), but people also jump between them. Progress persists in localStorage. Nothing computes until a button is pressed; nothing runs in the background.

## Constraints

- Every number comes from `js/core.js` (exact) or `js/sim.js` (a seeded toy world running the exact math). `ACCEPTANCE.md` lists the verified values.
- The honesty note (what's exact vs a teaching model) must remain, on the page and in the README.
- Numbers quoted from the Diffusion Policy paper (16/8 horizons, 100 training / 10 inference DDIM steps, 0.1 s on an RTX 3080, square cosine schedule, +46.9%) are cited to the paper and not altered.
- The square analogy is the vocabulary: courier = the robot/policy, dispatcher = the human demonstrator, route sheets = demonstrations, the pretzel cart = the obstacle (the fork), fog = noise, the cartographer = the denoiser, the lookout's report = the observation, the waypoint card = the action chunk, the clerk's average = the regression (MSE) policy.

## Brand commitments

- Name: **Fork in the Road**. A sibling of Inference Kitchen and Policy Pond: same design system, a town-square palette and a green highway-sign masthead.
- Must not look like "every AI tool" (dark ground, neon accent, glowing cards) or like a corporate SaaS dashboard.
