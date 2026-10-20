# wannabe-strava

A first-version running dashboard for tracking runs, seeing weekly progress, and building a little consistency.

## Run it

Open `index.html` in a modern browser. No install or build step is required.

Choose one of the five demo profiles in the bottom of the sidebar. Each profile has its own activity list. Add, remove, and attach photos to runs, bike rides, hikes, or walks; the data is saved in that browser's local storage.

Mark activities private or public when logging them. Public activities appear in the Activities feed for the other demo profiles; your own private activities remain visible to you. Progress has week and activity-type filters and distance totals by activity type. Use the moon/sun button in the header to toggle the saved light/dark theme.

This is a front-end-only demo, not a secure account system. Public sharing works only between the hardcoded demo profiles in the same browser because browser storage does not sync between devices or browsers. A backend or data library can replace this storage later.

## What’s here

- A weekly summary for distance, moving time, and average pace
- A weekly distance chart and a 20 km weekly goal
- A community activity feed with activity-type and week filters
- Weekly progress totals by run, bike, hike, and walk
- Year-grouped historical week selection and a monthly distance comparison between selected and latest recorded years
- Per-profile private activity history, with add and remove actions
- Activity details for name, type, editable privacy, distance, duration, date, elevation, and an optional note
- Optional activity photos, resized in the browser before saving
- Light and dark themes
- Responsive layout for desktop and mobile screens
