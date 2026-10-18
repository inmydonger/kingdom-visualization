'use client';

import { useId, useRef, useState, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { getCurrentVolume, getRecentVolumes, type AtlasVolume } from '@/lib/media-data';
import styles from './VolumeFilmstrip.module.css';

type Props = { chapter: number; selectedVolume: number | null; onChoose: (volume: AtlasVolume) => void };

export default function VolumeFilmstrip({ chapter, selectedVolume, onChoose }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const recent = getRecentVolumes(chapter);
  const current = recent.find(volume=>volume.volume===selectedVolume)??getCurrentVolume(chapter);

  function closeShelf() {
    panel.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  }

  return <div className={styles.root}>
    <button ref={trigger} type="button" className={styles.stack} popoverTarget={id} aria-controls={id} aria-expanded={open} aria-label={`Recent volume bookshelf. Current volume ${current.volume}. ${recent.length} volumes available.`}>
      <span className={styles.books} aria-hidden="true">
        {recent.map((volume, index) => <span key={volume.volume} className={styles.book} style={{ '--book-index': index, '--book-count': recent.length } as CSSProperties}>
          <img src={volume.file} width={70} height={100} alt="" decoding="async"/>
        </span>)}
      </span>
      <span className={styles.caption}>Vol. {current.volume}<span aria-hidden="true">⌃</span></span>
    </button>
    <div ref={panel} id={id} popover="auto" className={styles.panel} role="region" aria-labelledby={`${id}-title`} onToggle={event => setOpen(event.newState === 'open')} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeShelf(); }
    }}>
      <div className={styles.heading}>
        <div><h2 id={`${id}-title`}>Your recent volumes</h2><p>Choose a cover to revisit its story.</p></div>
        <button type="button" aria-label="Close volume bookshelf" onClick={closeShelf}><X size={17} aria-hidden="true"/></button>
      </div>
      <div className={styles.hand}>
        {recent.map((volume, index) => <button key={volume.volume} type="button" className={styles.cover} data-current={volume.volume === current.volume}
          style={{ '--book-rotation': `${(index - (recent.length - 1) / 2) * 3}deg` } as CSSProperties}
          aria-label={`Volume ${volume.volume}. Revisit from chapter ${volume.chapters[0]}`} aria-current={volume.volume === current.volume ? 'true' : undefined}
          onClick={() => { closeShelf(); onChoose(volume); }}>
          <span className={styles.art}><img src={volume.file} width={80} height={116} alt={`Kingdom volume ${volume.volume} cover`} decoding="async"/></span>
          <strong>Vol. {volume.volume}</strong><small>Ch. {volume.chapters[0]}</small>
        </button>)}
      </div>
    </div>
  </div>;
}
