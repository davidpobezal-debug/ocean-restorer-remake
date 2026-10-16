# Ocean Restorer · Remake

A one-thumb 3D mobile game (Three.js, no build step). Wash the dirt off the seabed, rescue animals from ghost nets and watch the reef bloom back to life.

## Run locally
```bash
python -m http.server 8742
```
Then open http://localhost:8742. For GitHub Pages, upload the whole folder.

## Controls
- **Drag anywhere:** the diver swims and vacuums the seabed.
- **Let go:** sonar pulse. Scares sharks, pushes jellyfish away, cleans around you and pulls in trash. On a computer use WASD or arrows; Space is the pulse.

## Expedition (main mode)
- **One endless dive**, the goal is the highest score.
- **Four big regions, one after another**, each in its own colour: Tropical Reef → Shipwreck → Kelp Forest → Glowing Deep. Clean 70 % of a region and the next one opens. You get full oxygen, +1 ❤️ and a 1,000 × region bonus.
- **The upgrade dock is always at the bottom:** Reach, Power, Fins, Robot / Pulse, Shield, Lure, +25 s O₂. Buy with coins from the dive in one tap; every dive starts from zero so the score chase is fair.
  - **Robot** is a little helper drone that hunts the nearest dirt.
  - **Shield** blocks one hit. **Lure** is a decoy the sharks chase instead of you.
- **The world gets dirty again:** trash sinks from the surface and leaking barrels spread oil until you vacuum them up.
- **Treasure chests** sit out on the dirty seabed: swim over one for +55 ◈.
- Sharks join as the dive goes on; every 20 m² cleaned gives +1 s of oxygen.
- A random rescued friend joins every dive (picking one will later be a rewarded-ad perk).
- The minimap shows what is left to clean, the friend in the net, oil leaks, sharks and O₂.
- A friend challenge is `?e=<seed>&s=<score>&n=<name>`, so your friend plays the same seabed. The Daily Dive is the same expedition for everyone.

## Open Sea (like the original map)
- **One big continuous seabed**: the four biomes are bands side by side. Clean 80 % of a band and the next one opens.
- **It never ends**: after the last band a new, dirtier sea is generated (new biome order). Score, coins, run upgrades, the robot and rescued friends carry over.
- Same dock, sharks, leaks and chests as the Expedition; its best score is kept separately.

## Levels
- Levels take 1 to 3 minutes. ★ at 60 %, ★★ at 85 % and ★★★ at 100 % of the reef restored. Oxygen is the timer and O₂ bubbles top it up.
- **Combo:** clean without a pause and the multiplier grows ×2 to ×4, then **FEVER ×5** with a huge reach and rainbow music.
- **Trash:** bottles, cans, bags, boots, crates, tires and barrels. Heavy pieces need a moment of holding.
- **Rescue:** an animal in a net (turtle, seal, octopus, dolphin, whale) swims with you after you free it and helps clean. It joins your collection too.
- **Clams with pearls** are hidden under the dirt. Pearls are the premium currency for suits and a second chance.
- From level 4 come **sharks**: a red lane warns before the dash, so you can dodge or pulse. From level 6 come **jellyfish**.
- Near the end an arrow points to the leftover dirt, so 100 % is always reachable.

## Viral bits
- A **BEFORE / AFTER** share image (1080 × 1350) with score, stars, rescued animals and the game address.
- **Challenge links** `?l=7&s=12345&n=Name`: your friend sees "Name challenges you"; the winner gets +50 ◈.
- **Daily Dive:** the same reef for everyone that day, shared as a Wordle-style emoji grid.
- **Share & keep going:** after a loss, sharing gives a second chance. The first share of the day gives +50 ◈.
- Day streak 🔥 and a first-dive-of-the-day bonus.
- PWA: add it to your home screen, it works offline. Links in Messenger and WhatsApp have a preview (`og:image`).

## Look
Models follow the original game: chunky boxes, gems and faceted shapes with flat colours, crisp edges and smoothing (MSAA). The diver swims flat, buddies wear a thin gold ring and a small gold gem, and pickups (O₂, pearls, treasure) glow.
- `demo/models.html`: every model in a numbered lineup plus a small reef scene (`?look=lowpoly` shows the alternative low-poly look).
- `demo/compare.html`: both looks side by side. `demo/robot.html`: robot helper candidates.

## Files
| File | Contents |
|---|---|
| `js/main.js` | renderer, camera, screens, HUD, minimap, sharing |
| `js/game.js` | gameplay (movement, combo, trash, chests, rescue, sharks, jellyfish, robot, lure) |
| `js/world.js` | regions, the seabed shader with the dirt mask, corals |
| `js/boxy.js` | the game's models in the original style |
| `js/models.js` | shared materials, net, shadows and the older low-poly models |
| `js/lowpoly.js` | the alternative low-poly look (demo only) |
| `js/fx.js` | particles, shockwaves, floating numbers and coins |
| `js/audio.js` | procedural sounds and generative music |
| `js/save.js` | progress in localStorage, upgrades, suits, animals |
| `js/share.js` | share image, challenge links, daily text |
| `TRIPO.md` | prompts for Tripo 3D models |

## Possible next steps
- A global leaderboard and a "together we cleaned X m²" counter, e.g. with Supabase (free tier).
- Rewarded ads: pick your dive buddy, second chance.
