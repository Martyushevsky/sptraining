# SP Training Calculator

A static web version of my personal `inventory.xlsx` spreadsheet. Enter your beads, crystals, Hologold and Hololium to see how many members you can train to each practice stage, which resource is the bottleneck, and what each stage costs.

Plain **HTML, CSS and vanilla JavaScript** — no framework, build step or dependencies.

## Background

I originally made `inventory.xlsx` for my personal use. I then used an OpenCode free model to convert the spreadsheet into a static site, and iterated on the layout and design with help from an agent.

The spreadsheet is kept in the repo as the source reference. It is not used by the site at runtime.

## Features

- Separate inputs for bead and crystal bundles, colored beads/crystals, Hologold and Hololium.
- Live **Max members** results for 3★, 4★ and 5★ at practice stages 1–4.
- Shows the limiting resource for each stage.
- Constant **Cost requirements** table for every tier and stage.
- Inputs are saved in `localStorage`, so they survive a page reload.
- Large numbers are shown compactly (`1.23 M`, `34.6 B`, etc.) with the exact value in a tooltip.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and inventory inputs |
| `styles.css` | Layout and styling |
| `app.js` | Spreadsheet formulas, results tables and saving |
| `inventory.xlsx` | Original spreadsheet, kept for reference |

## Customizing

- **Item names** — edit the `NAMES` block at the top of `app.js`.
- **Stage costs** — edit `MODEL.tiers` in `app.js`.
- **Bundle multipliers** — edit `MODEL.beadSizes` and `MODEL.crystalSizes` in `app.js`.

## Notes

- All calculations run in the browser; nothing is uploaded.
- Inputs are capped at `999 999 999 999`; anything larger is marked invalid and excluded from the results.
- To reset saved inputs, clear the site's local storage in your browser.

## Disclaimer

This is an unofficial, fan-made training calculator for hololive Dreams and is not affiliated with or endorsed by QualiArts Inc., COVER Corp., hololive production, hololive Dreams, or any hololive talent. All game names, characters, and related marks belong to their respective owners. No official artwork, logos, or music are used.
