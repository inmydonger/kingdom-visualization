# Local media

`manifest.json` and the 110 originals in `source/` were copied from the user-supplied `kingdom-atlas-codex-pack`. They remain local. The manifest's chapter ranges are preserved exactly, including volume 77 at chapters 835–845. Positions after chapter 878 retain the last supplied cover (volume 80).

Run `node scripts/prepare-assets.mjs` before a production build. It uses Sharp to create 200×300 maximum cover images, 96×120 maximum character thumbnails, and 420×560 maximum portraits in `public/assets/`, with their aspect ratios preserved. The generated manifest points only to local WebP files. Originals are never requested by the browser.

Character data in `lib/media-data.ts` records the first narrative arc in which each character appears. The pack contains names and wiki URLs, but no debut metadata. Most spoiler gates therefore use the debut arc's first chapter, rather than claiming an exact appearance chapter. The known chapter gates below were checked against the linked character pages:

- [Ou Hon](https://kingdom.fandom.com/wiki/Ou_Hon): Alliance, chapter 180.
- [Mou Ten](https://kingdom.fandom.com/wiki/Mou_Ten): Third Faction, chapter 183.
- [Ren Pa](https://kingdom.fandom.com/wiki/Ren_Pa): Sanyou Campaign, chapter 193.
- [Haku Rei](https://kingdom.fandom.com/wiki/Haku_Rei): Sanyou Aftermath, chapter 253.
- [Shou Hei Kun](https://kingdom.fandom.com/wiki/Shou_Hei_Kun): Assassination Plot, chapter 96.
- [Kyou](https://kingdom.fandom.com/wiki/Kyou): Battle of Bayou flashback, chapter 113.

State labels reflect the character's introduction, avoiding later allegiance spoilers. Ren Pa and Rin Ko are grouped with Wei during Sanyou, and Qin's mountain allies are grouped with Qin. `getCharacterByName` also matches punctuation variants such as `Man U` / `Man'U`.
