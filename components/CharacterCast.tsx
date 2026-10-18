'use client';

import { useId, useRef, useState } from 'react';
import { LockKeyhole, Users, X } from 'lucide-react';
import { CHARACTERS, getRevealedCharacters, type AtlasCharacter } from '@/lib/media-data';
import CharacterPortrait from './CharacterPortrait';
import styles from './CharacterCast.module.css';

type CharacterCastProps = {
  chapter: number;
  onLocate: (character: AtlasCharacter) => void;
};

export default function CharacterCast({ chapter, onLocate }: CharacterCastProps) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [portrait, setPortrait] = useState<AtlasCharacter | null>(null);
  const [portraitLaunch, setPortraitLaunch] = useState(0);
  const revealed = new Set(getRevealedCharacters(chapter).map((character) => character.id));

  function closeCast() {
    panel.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  }

  function selectCharacter(character: AtlasCharacter) {
    if (!revealed.has(character.id)) return;
    closeCast();
    onLocate(character);
    setPortrait(character);
    setPortraitLaunch(previous => previous + 1);
  }

  return (
    <>
      <button ref={trigger} type="button" className={styles.trigger} popoverTarget={`${id}-cast`} aria-expanded={open} aria-controls={`${id}-cast`} aria-label="Character cast" title="Character cast"><Users size={16} strokeWidth={1.5} aria-hidden="true" /></button>
      <div ref={panel} id={`${id}-cast`} className={styles.panel} popover="auto" aria-labelledby={`${id}-title`} onToggle={(event) => setOpen(event.newState === 'open')} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeCast(); } }}>
        <div className={styles.heading}><div><p>People of Kingdom</p><h2 id={`${id}-title`}>The cast</h2></div><button type="button" className={styles.close} aria-label="Close character cast" onClick={closeCast}><X size={17} strokeWidth={1.5} aria-hidden="true" /></button></div>
        <p className={styles.note}>Choose a character to visit their debut region.</p>
        <div className={styles.grid}>
          {CHARACTERS.map((character, index) => revealed.has(character.id) ? (
            <button key={character.id} type="button" className={styles.character} onClick={() => selectCharacter(character)} aria-label={`${character.name}. Visit debut region and view portrait`} data-character-id={character.id}>
              <span className={styles.thumbnail}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={character.thumbnail} alt="" width={64} height={64} loading="lazy" /></span><span>{character.name}</span>
            </button>
          ) : (
            <div key={character.id} className={styles.locked} role="img" aria-label={`Undiscovered character ${index + 1}. Locked at chapter ${chapter}`}><span className={styles.thumbnail}><LockKeyhole size={15} strokeWidth={1.3} aria-hidden="true" /></span><span>Unrevealed</span></div>
          ))}
        </div>
        <div className={styles.footer}><span>{revealed.size} of {CHARACTERS.length} revealed</span><span>Chapter {chapter}</span></div>
      </div>
      {portrait && <CharacterPortrait key={`${portrait.id}-${portraitLaunch}`} character={portrait} chapter={chapter} onClose={() => setPortrait(null)} />}
    </>
  );
}
