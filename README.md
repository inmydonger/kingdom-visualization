# Kingdom: Warring States Atlas

Phase 5 of a reader-aware 3D atlas for *Kingdom*. Built with Next.js App Router, React, TypeScript, Tailwind CSS, Three.js, and Lucide. The full-screen isometric map has sculpted relief, painterly terrain textures, coastal cliffs, and woodland groves. Everything floats over the map, with no sidebar or header bar. Chapter-based fog reveals 20 landmarks covering 28 arcs; a centered story-arc picker, a five-volume comic stack, and character portraits help explore the stories you have reached.

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL printed by Next.js. Drag to pan, scroll or pinch to zoom, and choose a state or capital to focus the camera. Focus the canvas for arrow-key panning, `+`/`-` zoom, and `Home` to reset.

The landscape spans 2.5 times its original width and depth while miniatures retain their original dimensions. The opening view is closer, and landmark focus and the zoom range cover the expanded world. Compact pins reveal their names on hover or focus; close views show full labels.

## Motion, orientation, and reading

Camera flights ease into their destination and stop immediately when you drag, pinch, or scroll. Choosing a new destination replaces the current flight from its current position. Arrow-key pans are immediate. Hovering a discovered miniature or focusing its pin adds a brass highlight and name; unreached silhouettes never become interactive. The map renders on demand and sleeps when the scene is still.

The loading seal fades after the first successful map frame. The icon-only rail on the right contains Cast, the map guide, and a hidden legend. The legend holds discovery keys, chapter markers, and scale notes, keeping the resting map clear.

On phones, the reader is a floating bottom sheet. Tap its handle or swipe the handle upward/downward to switch between a compact and expanded view; Arrow Up/Down on the focused handle does the same. Its contents scroll independently, while the close button and completion footer remain reachable. The camera follows the sheet’s size. Opening a reader card tucks away the bottom controls on phones, and expanded reading hides the icon rail; close the card to restore them and center its landmark. Short landscape screens use a taller floating card on the right instead.

The system’s reduced-motion setting is respected live: camera flights settle immediately, inertia stops, and UI motion becomes stationary. Fine-pointer hover lifts are disabled for touch. Explicit close/Escape actions restore focus to the initiating control; clicking outside popovers leaves focus where you clicked.

## Story landmarks and reader cards

Click a discovered miniature or its map pin to fly the camera to that location and open its floating reader card. Gyou’s granary-fortress and Kankoku / Hangu Pass receive larger miniatures and major-campaign cards. Cards contain the arc title, chapter range, and region, a dedicated **Key figures** thumbnail row, and **Overview** / **Territory** tabs. Locations shared by several arcs offer a story selector containing only arcs the reader has reached.

Tap a figure thumbnail to open a floating portrait with their name, state affiliation, and debut arc. Click outside or press Escape to dismiss it. The top-right **Cast** control opens a 30-character grid; choosing a revealed character also flies the camera to their debut region. Characters beyond the reader’s chapter remain unnamed and locked. Supplied portraits cover 30 characters; other named key figures use initials instead of a missing image. Debut gates are usually arc-level, with exact chapter gates where verified, rather than a claim of precise first appearance for every character.

An unfinished arc shows its premise. Its full summary, key figures, and territory outcome unlock when the reader reaches its final chapter. The ongoing arc always shows only its premise and remains behind the spatial endgame frontier until that location is discovered. Undiscovered story landmarks have optional unnamed silhouettes and cannot open a card.

A known story location can appear as a pin within grey terrain in **Faint silhouettes** mode. For example, the Kantan flashback unlocks its own card without expanding the surrounding terrain fog or revealing later campaigns there. **Fully hidden** mode also hides that pin until its surrounding terrain is discovered. The State of Ai landmark is placed at **Taigen**, near northern Qin’s border with Zhao. Coordinates and miniatures are illustrative.

To open Gyou directly in the local preview, use [chapter 845 at Gyou](http://127.0.0.1:3000/?chapter=845&site=gyou). The `site` parameter opens only a landmark discovered at the requested chapter; future-site links do not expose its reader card.

## Focused map controls

The chapter button floats at the top center, with one **Story arc** picker directly below it. Choose a revealed arc to focus its landmark, or **All story arcs** to restore the available map. The picker includes only started stories at discovered locations. Lowering the reader chapter clears an arc that is no longer available. The Seven States dock, state filter, filter menu, and Layers control have been removed; relief and place labels remain enabled.

Filtering to one arc at a shared location shows only that arc in its reader card. For example, **Conquest of Han** keeps the Shintei miniature and excludes its earlier **Nature of Humanity** story from the filtered card. The URL stores the selection as `arc=arcID`; legacy `filter` parameters are cleared. State selection on the map still focuses a territory without filtering landmarks.

The brand is an unboxed wordmark on desktop and a small seal on phones. Cast, map help, and legend use vertically stacked icon buttons with accessible labels and hover titles. The legend is closed by default and light-dismisses on outside click or Escape. There is no persistent heading, legend, scale note, or first-use panel over the terrain.

## Volume bookshelf and local media

A bottom-left **comic-book stack** shows the current volume and up to four preceding volumes. The manifest places chapter **845** in **volume 77**, so its shelf contains only **volumes 73–77**. Tap the stack to fan out those five covers; the current volume has a brass outline, and a hovered cover lifts. Choosing a cover closes the shelf, jumps to its first chapter, and flies toward its main arc. Outside click or Escape dismisses the shelf. Beginning readers see only the volumes they have reached, and later reading positions retain the last supplied cover (volume 80).


Media stays local. `assets/manifest.json` and `assets/source/` preserve the supplied 80 covers and 30 character originals (about 40 MB). `npm run prepare:assets` uses Sharp to generate 140 WebP images totaling about 3.22 MB in `public/assets/`, plus a generated manifest. Covers are at most 200×300, thumbnails 96×120, and portraits 420×560, preserving aspect ratio. `npm run build` runs this preparation automatically through `prebuild`; the browser serves only the smaller images. `lib/media-data.ts` supplies chapter-to-volume lookup, main-arc selection, and character metadata. See `assets/README.md` for source and metadata notes.

Volume travel only chooses arcs already started at the volume’s first chapter. If the destination is still hidden under your current spoiler setting, the camera uses your discovered frontier instead of an unreached location. Character debut shortcuts follow the same rule.

## Reading progress

Open **Your chapter** to enter the last chapter you have read and choose **Apply chapter**. The default is chapter **845**. Your chapter and unexplored-area preference are saved in this browser; the `?chapter=100` URL parameter overrides the saved chapter for that visit. Chapter changes update the URL so a local view can be reopened at the same point.

Discovered terrain retains its color. Under **Unexplored areas**, choose **Faint silhouettes** for grey terrain and unnamed shapes beyond your chapter, or **Fully hidden** to hide unreached terrain, names, and markers. Capital models follow terrain discovery, while story pins also obey their reading gates and active filters. The **Your chapter** marker follows your frontier, while the muted **Latest release** marker shows the configured latest point when its area is visible.

The unexplored-area preference is stored under `kingdom-silhouettes`. A URL parameter overrides that saved mode: `spoilers=silhouettes` shows faint shapes, while `spoilers=hidden` fully hides unexplored areas. Chapter progress is stored under `kingdom-reader-chapter`.

Chapter **890** is a user-supplied release estimate, not a live or independently verified chapter count. Update `LATEST_RELEASE_CHAPTER` in `lib/progression.ts` when the estimate changes. The chapter control currently accepts whole numbers from 1 through that configured value.

At chapter **100**, the western starting area is colored and later regions remain grey. At chapter **845**, the remaining fog is concentrated in the Zhao endgame area. Han changes to Qin territory only after chapter **844**; entering an earlier chapter restores its independent appearance. Discovery regions are a schematic reading aid, not a claim that one chapter reveals an entire historical state.

## Validate and build

```sh
npm run check:data
npm run check:terrain
npm run check:geometry
npm run check:progression
npm run check:story
npm run check:filters
npm run check:landmarks
npm run check:map-space
npm run prepare:assets
npm run check:media
npm run check:navigation
npm run check:camera
npm run typecheck
npm run build
```

The app exports a static site to `out/`. `lib/atlas-data.ts` holds seven hand-authored schematic state polygons, their capitals, rivers, and Hangu Pass. `lib/terrain-height.ts` defines connected ridges, plateaus, riverbeds, and capital clearings; `lib/terrain-textures.ts` supplies procedural surface textures. Terrain geometry shares a sampling grid across state boundaries. `lib/progression.ts` defines the discovery field and chapter thresholds; `lib/fog-material.ts` shades or hides uncharted terrain, and `lib/discovery-frontier.ts` traces its edge. `lib/story-data.ts` holds the 28 arcs, 20 sites, and story-detail gates; `lib/story-miniatures.ts` builds their 3D models. `lib/landmark-filters.ts` supplies chapter-safe filter choices and shared visibility rules for the map, counts, and cards. Boundaries and topography are illustrative, not historical GIS or DEM data.

## Phase boundary

This local deliverable completes Phases 1–5: the map, chapter-driven fog, reader cards, arc filtering, recent-volume browsing, character portraits/Cast, and the Phase 5 camera, loading, responsive-reader, focus, and reduced-motion polish. No publishing or external upload is required to use the local preview.
