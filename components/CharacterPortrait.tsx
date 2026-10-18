'use client';

import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { BookOpen, X } from 'lucide-react';
import { STATES } from '@/lib/atlas-data';
import { ARCS } from '@/lib/story-data';
import { type AtlasCharacter } from '@/lib/media-data';
import styles from './CharacterPortrait.module.css';

type CharacterPortraitProps = {
  character: AtlasCharacter;
  chapter: number;
  onClose: () => void;
};

export default function CharacterPortrait({ character, chapter, onClose }: CharacterPortraitProps) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<Element | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealed = character.debutChapter <= chapter;
  const state = STATES.find((item) => item.id === character.stateId);
  const debut = ARCS.find((arc) => arc.id === character.debutArcId && arc.chapterStart <= chapter);

  useEffect(() => {
    if (!revealed) return;
    const previous = document.activeElement;
    returnFocus.current = previous;
    const element = panel.current;
    element?.showPopover();
    close.current?.focus({ preventScroll: true });
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (element?.contains(document.activeElement) && previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    };
  }, [character.id, revealed]);

  if (!revealed) return null;

  function dismissPortrait() {
    panel.current?.hidePopover();
    const previous = returnFocus.current;
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
  }

  return (
    <div ref={panel} popover="auto" className={styles.portrait} role="dialog" aria-labelledby={`${id}-name`} style={{ '--state-color': state?.color ?? '#b8a174' } as CSSProperties} onToggle={(event) => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (event.newState === 'closed') closeTimer.current = setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 200);
    }} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismissPortrait(); } }}>
      <div className={styles.imageWrap}>
        {/* Static local assets are resized before the production build. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.image} src={character.portrait} alt={`Portrait of ${character.name}`} width={480} height={600} />
        <button ref={close} type="button" className={styles.close} aria-label={`Close ${character.name} portrait`} onClick={dismissPortrait}><X size={18} strokeWidth={1.5} aria-hidden="true" /></button>
        <span className={styles.state}>{state?.hanzi}<span>{state?.name ?? 'Warring States'}</span></span>
      </div>
      <div className={styles.details}>
        <p className={styles.eyebrow}>People of the seven states</p>
        <h2 id={`${id}-name`}>{character.name}</h2>
        <div className={styles.debut}><BookOpen size={14} strokeWidth={1.4} aria-hidden="true" /><div><span>Debut arc</span><p>{debut?.name ?? 'Your revealed story'}</p></div></div>
      </div>
    </div>
  );
}
