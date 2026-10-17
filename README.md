# Grandir Ensemble — 2027

A French-themed daily planner game for **1 January – 30 April 2027**. Plan each day in time blocks (00:00–24:00), seal the plan, complete it, and watch ten national indicators of France rise with you. Every day you log unlocks a stamp: beautiful spots in January, churches in February, French foods in March and French brands in April.

Pure HTML, CSS and JavaScript. No build step, no server, no account: progress is saved in the visitor's browser (localStorage).

## Publish on GitHub Pages

The repository has 315 files, and GitHub's web uploader takes 100 files at a time, so use one of these:

**Option A: GitHub Desktop or the command line (easiest)**

```bash
git init
git add .
git commit -m "Grandir Ensemble 2027"
git branch -M main
git remote add origin https://github.com/<your-username>/grandir-ensemble.git
git push -u origin main
```

**Option B: web upload in batches.** Create the repository, then drag in, one batch at a time: the root files (`index.html`, `manifest.webmanifest`, `.nojekyll`, `README.md`) with the `css`, `js` and `assets/brand` and `assets/audio` folders; then `assets/collection/jan` and `feb`; then `mar` and `apr`; then `assets/collection/thumbs`. Keep the folder structure exactly as it is.

Then: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save.** After a minute the site is live at `https://<your-username>.github.io/grandir-ensemble/`.

Keep the empty `.nojekyll` file: it tells GitHub Pages to serve the files as they are.

## Folder map

```
index.html                 the app shell
manifest.webmanifest       lets phones "install" the site
css/style.css              all styles
js/economy.js              indicator model (the maths)
js/game.js                 rules, rewards, saving
js/zoom.js                 pan & zoom engine (viewer and map)
js/app-core.js             profiles, header, modals, sounds, results
js/view-plan.js            Accueil, Calendrier, daily planner
js/view-more.js            Indicateurs, Album + viewer, Carte, Médiathèque, Courage
js/content.js              videos, quotes, government messages
js/collection-data.js      the 120 daily unlockables (from the Descriptions folder)
js/departments.js          the 101 departments
js/map_svg.js              the department map (mapchart.net)
assets/brand/              logo, icons, flag
assets/audio/              sound effects + "Au clair de la lune" musette loop
assets/collection/         full-size images (≤ 2400 px, WebP) + logos (SVG)
assets/collection/thumbs/  640 px thumbnails for the album and calendar
```

## Rules in short

| Share of the to-do list done | Indicators | Gems |
|---|---|---|
| 100% | +0.60% | +8 |
| 75–99% | +0.30% | +4 |
| 50–74% | +0.15% | +2 |
| 30–49% | −0.15% | −1 |
| under 30% or nothing | −0.30% | −3 |

* Changing a sealed plan on its own day costs **1 gem per revision**. Planning future days is free; plans made in advance seal themselves when the day begins.
* Each logged day unlocks that day's stamp, whatever the outcome.
* The boost is applied to the **élan national** K, which drives all ten indicators through calibrated formulas (UNDP HDI formula, elasticities, diminishing-returns curves, normal-distribution world ranks). The full maths is in the Indicateurs tab.

## Practice mode

Choose **Practice** when creating a profile to move the date forward yourself and try the whole term before January 2027. Real-calendar profiles follow the clock.

## Credits

Department map created with mapchart.net. Videos are embedded with youtube-nocookie.com and belong to their creators. Photos and logos come from the supplied asset pack; check the rights of each image before making the site public. Sound effects and the musette loop were synthesised for this project (La Marseillaise and Au clair de la lune are public domain). The government voice is role-play: this is a personal productivity game, not affiliated with the French Government.
