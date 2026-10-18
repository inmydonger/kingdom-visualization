'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { ChevronUp, LockKeyhole, X } from 'lucide-react';
import { STATES, type StateId } from '@/lib/atlas-data';
import { isStateDiscovered } from '@/lib/state-discovery';
import styles from './StateDock.module.css';

type StateDockProps = {
  chapter: number;
  selectedState: StateId | null;
  onSelect: (id: StateId) => void;
  onReset: () => void;
  onOpenChange?: (open: boolean) => void;
};

export default function StateDock({ chapter, selectedState, onSelect, onReset, onOpenChange }: StateDockProps) {
  const handId = useId();
  const dockRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = pinnedOpen || hovered || focused;
  const selected = STATES.find(state => state.id === selectedState);

  useEffect(() => onOpenChange?.(open), [open, onOpenChange]);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!dockRef.current?.contains(event.target as Node)) {
        setPinnedOpen(false);
        setHovered(false);
        setFocused(false);
      }
    };
    document.addEventListener('click', closeOutside);
    return () => document.removeEventListener('click', closeOutside);
  }, []);

  return (
    <div
      ref={dockRef}
      className={styles.dock}
      data-state-dock=""
      data-open={open}
      data-selected={Boolean(selected)}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (event.target instanceof HTMLElement && event.target.matches(':focus-visible')) setFocused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        handleRef.current?.focus({ preventScroll: true });
        setPinnedOpen(false);
        setHovered(false);
        setFocused(false);
      }}
    >
      <div id={handId} className={styles.hand} role="group" aria-label="Seven States">
        {STATES.map((state, index) => {
          const locked = !isStateDiscovered(state.id, chapter);
          const active = selectedState === state.id;
          const position = index - 3;
          return (
            <button
              key={state.id}
              type="button"
              className={styles.card}
              data-state-card={state.id}
              data-selected={active}
              data-locked={locked}
              style={{
                '--state-color': state.color,
                '--card-position': position,
                '--card-distance': Math.abs(position),
                '--card-order': index,
              } as CSSProperties}
              disabled={locked}
              aria-pressed={active}
              aria-label={locked ? `${state.name}, undiscovered at chapter ${chapter}` : `${state.name}${active ? ', selected. Clear state filter' : ', filter landmarks and fly to territory'}`}
              title={locked ? `Undiscovered at chapter ${chapter}` : active ? `Clear ${state.name} filter` : `Explore ${state.name}`}
              onClick={() => {if(!open){setPinnedOpen(true);return;}onSelect(state.id);}}
            >
              <span className={styles.cardHeading}><i aria-hidden="true" /><strong>{state.name}</strong></span>
              <span className={styles.hanzi} aria-hidden="true">{state.hanzi}</span>
              {!locked && <span className={styles.capital}><small>Capital</small>{state.capital.name}</span>}
              <span className={styles.cardFooter} aria-hidden="true">
                {locked ? <><LockKeyhole size={10} strokeWidth={1.6} /> Uncharted</> : active ? 'Selected' : 'Explore state'}
              </span>
              <span className={styles.corner} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {selected && (
        <button type="button" className={styles.reset} onClick={onReset} aria-label={`Clear ${selected.name} state filter`}>
          <span>{selected.name}</span><X size={11} strokeWidth={1.7} aria-hidden="true" />
        </button>
      )}
      <button
        ref={handleRef}
        type="button"
        className={styles.handle}
        aria-label={open ? 'Collapse Seven States' : 'Explore Seven States'}
        aria-expanded={open}
        aria-controls={handId}
        onClick={() => {
          setPinnedOpen(previous => !previous);
          setFocused(false);
          setHovered(false);
        }}
      >
        <span>Seven States</span><ChevronUp size={12} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}
