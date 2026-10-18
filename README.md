# Kingdom: Warring States Atlas

Phase 5 of a reader-aware 3D atlas for *Kingdom*. Built with Next.js App Router, React, TypeScript, Tailwind CSS, Three.js, and Lucide. The full-screen isometric map has sculpted relief, painterly terrain textures, coastal cliffs, and woodland groves. Everything floats over the map, with no sidebar or header bar. Chapter-based fog reveals 20 landmarks covering 28 arcs; state cards, a volume bookshelf, and character portraits help explore the stories you have reached.

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL printed by Next.js. Drag to pan, scroll or pinch to zoom, and choose a state or capital to focus the camera. Use the Layers control to toggle mountain relief and labels. Focus the canvas for arrow-key panning, `+`/`-` zoom, and `Home` to reset.

The landscape spans 2.5 times its original width and depth while miniatures retain their original dimensions. The opening view is closer, and landmark focus and the zoom range cover the expanded world. Compact pins reveal their names on hover or focus; close views show full labels.

## Motion, orientation, and reading

Camera flights ease into their destination and stop immediately when you drag, pinch, or scroll. Choosing a new destination replaces the current flight from its current position. Arrow-key pans are immediate. Hovering a discovered miniature or focusing its pin adds a brass highlight and name; unreached silhouettes never become interactive. The map renders on demand and sleeps when the scene is still.

The loading seal fades after the first successful map frame. A small first-use guide explains navigation and the state hand; dismissing it or exploring stores `kingdom-atlas-guide-dismissed` in this browser. The help button keeps the full guide available.

On phones, the reader is a floating bottom sheet. Tap its handle or swipe the handle upward/downward to switch between a compact and expanded view; Arrow Up/Down on the focused handle does the same. Its contents scroll independently, while the close button and completion footer remain reachable. The camera follows the sheet’s size. Expanded reading clears the small map controls from that space; close the card to restore them and center its landmark. Short landscape screens use a taller floating card on the right instead.

The system’s reduced-motion setting is respected live: camera flights settle immediately, inertia and marker pulses stop, and UI motion becomes stationary. Fine-pointer hover lifts are disabled for touch. Explicit close/Escape actions restore focus to the initiating control; clicking outside popovers leaves focus where you clicked.

## Story landmarks and reader cards

Click a discovered miniature or its map pin to fly the camera to that location and open its floating reader card. Gyou’s granary-fortress and Kankoku / Hangu Pass receive larger miniatures and major-campaign cards. Cards contain the arc title, chapter range, and region, a dedicated **Key figures** thumbnail row, and **Overview** / **Territory** tabs. Locations shared by several arcs offer a story selector containing only arcs the reader has reached.

Tap a figure thumbnail to open a floating portrait with their name, state affiliation, and debut arc. Click outside or press Escape to dismiss it. The top-right **Cast** control opens a 30-character grid; choosing a revealed character also flies the camera to their debut region. Characters beyond the reader’s chapter remain unnamed and locked. Supplied portraits cover 30 characters; other named key figures use initials instead of a missing image. Debut gates are usually arc-level, with exact chapter gates where verified, rather than a claim of precise first appearance for every character.

An unfinished arc shows its premise. Its full summary, key figures, and territory outcome unlock when the reader reaches its final chapter. The ongoing arc always shows only its premise and remains behind the spatial endgame frontier until that location is discovered. Undiscovered story landmarks have optional unnamed silhouettes and cannot open a card.

A known story location can appear as a pin within grey terrain in **Faint silhouettes** mode. For example, the Kantan flashback unlocks its own card without expanding the surrounding terrain fog or revealing later campaigns there. **Fully hidden** mode also hides that pin until its surrounding terrain is discovered. The State of Ai landmark is placed at **Taigen**, near northern Qin’s border with Zhao. Coordinates and miniatures are illustrative.

To open Gyou directly in the local preview, use [chapter 845 at Gyou](http://127.0.0.1:3000/?chapter=845&site=gyou). The `site` parameter opens only a landmark discovered at the requested chapter; future-site links do not expose its reader card.

## Floating state hand and landmark filters

The **Seven States** dock rests at bottom center as a slim fanned stack with a brass handle. Hover with a mouse, focus with the keyboard, or tap the handle to fan out Qin, Zhao, Wei, Han, Chu, Yan, and Qi. Hovered cards lift. Selecting a card filters landmarks to that state and flies the camera to its territory; its brass border and raised position mark the selection. Select it again or use the reset chip to clear. A state unlocks when any part of its territory is discovered at the reader’s chapter; undiscovered cards are dimmed, disabled, and labeled with that chapter. Only interactive cards and controls receive pointer events, so empty dock space leaves map panning available. Motion uses CSS and respects reduced-motion preferences.

Open **Landmark filters** to choose a state, an arc, or both. State categories match the story dataset exactly: **Multi-state** contains its own shared-border campaigns and is separate from the Qin and Zhao choices. Arc options contain only stories started by your current chapter whose locations are revealed, and narrow to the selected state. The visible-landmark count follows the filters, chapter gates, and unexplored-area mode. **Clear filters** restores all available landmarks.

Filtering to one arc at a shared location shows only that arc in its reader card. For example, selecting **Conquest of Han** leaves the Shintei miniature visible and keeps its earlier **Nature of Humanity** story out of the filtered card. Lowering your chapter clears an active arc filter if you have no longer reached it.

Filters are stored in the URL using `filter=stateID` and `arc=arcID`, so the view can be shared or reopened locally. For example, [Zhao’s Western Zhao Invasion at chapter 845](http://127.0.0.1:3000/?chapter=845&filter=zhao&arc=western-zhao) selects the Gyou campaign. Invalid, future, and state-incompatible arc parameters reset to all available arcs. Filters are not stored in local storage.

## Volume bookshelf and local media

A bottom-left chip shows the current volume’s cover and **Vol N**, using the supplied manifest’s chapter ranges: chapter **845** belongs to **volume 77**. Tap it to raise a horizontally scrollable filmstrip of all 80 covers, clear of the state hand. The current volume has a brass border; volumes whose first chapter is beyond the reader’s position are greyed and locked. Selecting an available cover jumps to its first chapter and flies the camera toward its main arc region. The supplied range ends at chapter 878; later positions retain volume 80’s cover.

Media stays local. `assets/manifest.json` and `assets/source/` preserve the supplied 80 covers and 30 character originals (about 40 MB). `npm run prepare:assets` uses Sharp to generate 140 WebP images totaling about 3.22 MB in `public/assets/`, plus a generated manifest. Covers are at most 200×300, thumbnails 96×120, and portraits 420×560, preserving aspect ratio. `npm run build` runs this preparation automatically through `prebuild`; the browser serves only the smaller images. `lib/media-data.ts` supplies chapter-to-volume lookup, main-arc selection, and character metadata. See `assets/README.md` for source and metadata notes.

Volume travel only chooses arcs already started at the volume’s first chapter. If the destination is still hidden under your current spoiler setting, the camera uses your discovered frontier instead of an unreached location. Character debut shortcuts follow the same rule.

## Reading progress

Open **Your chapter** to enter the last chapter you have read and choose **Apply chapter**. The default is chapter **845**. Your chapter and unexplored-area preference are saved in this browser; the `?chapter=100` URL parameter overrides the saved chapter for that visit. Chapter changes update the URL so a local view can be reopened at the same point.

Discovered terrain retains its color. Under **Unexplored areas**, choose **Faint silhouettes** for grey terrain and unnamed shapes beyond your chapter, or **Fully hidden** to hide unreached terrain, names, and markers. Capital models follow terrain discovery, while story pins also obey their reading gates and active filters. The **Your chapter** marker follows your frontier, while the pulsing **Latest release** marker shows the configured latest point when its area is visible.

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

This local deliverable completes Phases 1–5: the map, chapter-driven fog, reader cards, state and arc filters, the floating state hand, volume browsing, character portraits/Cast, and the Phase 5 camera, loading, responsive-reader, focus, and reduced-motion polish. No publishing or external upload is required to use the local preview.
