# Design: Fork in the Road

Fork in the Road uses the design system recorded in [Inference Kitchen's DESIGN.md](https://github.com/bakulbadwal/inference-kitchen/blob/master/DESIGN.md): a Busytown cross-section spread, flat gouache fields on warm paper, one warm-brown outline, and every object wearing a hand-lettered label. Buttons are painted signs, readouts are price tags on a nail, predictions are sticky notes, takeaways are chalked on a wood-framed board, and the glossary is a menu board. The type is Grandstander for signboards, Patrick Hand for labels and Andika for body text.

This file records only what the square changes.

## Palette additions

| Token | Hex | Use |
|---|---|---|
| cobble | `#EAD9B6` | the square's paving, and the ground of every map canvas |
| fog / fog-d | `#EEF3F6` / `#DCE6ED` | the fog banks in scenes; un-classified dots while the fog lifts |
| left | `#246A9C` (sky-d) | everything that went left around the cart |
| right | `#D9771E` | everything that went right; its text partner is `#A85A12` |
| cart red | `#A5321F` (brick-d) | anything that ended inside the cart, and the averager's straight line |
| masthead / footer | `#3B7422` / `#2F5C1C` | a green highway guide sign, replacing the kitchen's brick and the pond's blue |

Route colours are fixed across every canvas, dot, trail and readout: left is always blue, right is always orange, a dent is always cart red.

## New objects

- **The map canvas** (`canvas.sq`): a square plan view of the square. Cobble ground, a sand road up the middle, DEPOT at the bottom and BAKERY at the top, the pretzel cart drawn as a wooden box with a striped awning at its current position, and a dashed ghost box where the courier *believes* the cart is when the two differ.
- **The fog slider**: t from 0 to 999; every logged dot slides along its own forward-process line as the slider moves. The chalk box beneath shows one dot's arithmetic with the live numbers substituted in.
- **The schedule chart**: √ᾱ and √(1−ᾱ) against t for the chosen schedule, with a marker at the current t and the half-fog point called out.
- **The passes ladder**: a small table of passes → share of routes in the cart, computed live for the chosen schedule and η; on step 4 it gains a time column and a budget line.
- **The waypoint card** (step 6): sixteen pins along the road ahead of the courier; the executed ones turn yellow, the discarded ones stay white, and a new card is drawn at every re-plan.
- **The drive HUD**: four price tags (clock, card number, what the courier is doing, dents) that tick during a drive.
- **The arrow field** (step 7): small ink arrows on a grid over the square, showing the flow-matching velocity at the slider's t, with the pins riding their straight paths.
- **The loss chalkboard** (step 8): a chart that draws while the apprentice trains, her smoothed loss against the exact cartographer's dashed floor, beside four price tags (loss, floor, weights, steps) and a chalk box working one training pair with live numbers.
- **The incident folders** (review board): three cases pinned to a cork board, each with a rule to fix, a fleet re-drive and a named cause.

## Scenes

Eight hand-built SVG scenes, 960 × 400, one per step plus the review board, assembled in `js/art.js` from a drawn cast: the courier (a small wheeled delivery robot with a crate and an antenna), the pretzel cart (wooden, striped awning, pretzels on a rail), the dispatcher (cap, joystick, route sheets), the cartographer (visor, apron, magnifier), the lookout (tower, spyglass) and the vendor (chef's hat). Each scene labels its objects with their diffusion meaning ("the cartographer = the denoiser"). The courier is a generic delivery robot, not any company's product.
