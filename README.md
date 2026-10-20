# wannabe-strava

A first-version running dashboard for tracking runs, seeing weekly progress, and building a little consistency.

## Run it

Open `index.html` in a modern browser. No install or build step is required.

Choose one of the five demo profiles in the bottom of the sidebar. Each profile has its own activity list. Add, remove, and attach photos to runs; the data is saved in that browser's local storage.

This is a front-end-only demo, not a secure account system. The five profiles are hardcoded, and browser storage does not update the project's source files or sync data between browsers. A backend or data library can replace this storage later.

## What’s here

- A weekly summary for distance, moving time, and average pace
- A week/month distance chart and a 20 km weekly goal
- Per-profile activity history, with add and remove actions
- Run details for activity name, distance, duration, date, elevation, and an optional note
- Optional activity photos, resized in the browser before saving
- Responsive layout for desktop and mobile screens
