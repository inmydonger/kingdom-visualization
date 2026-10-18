'use client';

import { useId, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { STATES } from '@/lib/atlas-data';
import { isStateDiscovered } from '@/lib/state-discovery';
import { DEFAULT_FILTERS, getFilterArcs, getVisibleSites, normalizeFilters, type LandmarkFilters as LandmarkFilterState } from '@/lib/landmark-filters';
import styles from './LandmarkFilters.module.css';

type LandmarkFiltersProps = {
  filters: LandmarkFilterState;
  chapter: number;
  showSilhouettes: boolean;
  onChange: (filters: LandmarkFilterState) => void;
};

export default function LandmarkFilters({ filters, chapter, showSilhouettes, onChange }: LandmarkFiltersProps) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const normalized = normalizeFilters(filters, chapter);
  const arcs = getFilterArcs(chapter, normalized.state);
  const visibleCount = getVisibleSites(chapter, normalized, showSilhouettes).length;
  const activeCount = Number(normalized.state !== 'all') + Number(normalized.arc !== 'all');
  const popoverId = `${id}-filters`;

  function closeFilters() {
    panel.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <button ref={trigger} type="button" className={styles.trigger} aria-label="Landmark filters" aria-expanded={open} aria-controls={popoverId} popoverTarget={popoverId}>
        <SlidersHorizontal size={16} strokeWidth={1.6} aria-hidden="true" />
        <span className={styles.triggerText}>Filters</span>
        {activeCount > 0 && <span className={styles.badge} aria-hidden="true">{activeCount}</span>}
      </button>
      <div ref={panel} id={popoverId} popover="auto" className={styles.popover} role="group" aria-label="Landmark filters" onToggle={(event) => setOpen(event.newState === 'open')} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeFilters(); } }}>
        <div className={styles.heading}>
          <h3>Landmark filters</h3>
          <button type="button" className={styles.close} aria-label="Close landmark filters" onClick={closeFilters}><X size={18} strokeWidth={1.6} aria-hidden="true" /></button>
        </div>
        <label className={styles.field} htmlFor={`${id}-state`}>
          <span>State</span>
          <select id={`${id}-state`} value={normalized.state} onChange={(event) => onChange(normalizeFilters({ state: event.target.value as LandmarkFilterState['state'], arc: 'all' }, chapter))}>
            <option value="all">All states</option>
            {STATES.map((state) => <option key={state.id} value={state.id} disabled={!isStateDiscovered(state.id,chapter)}>{state.name}{!isStateDiscovered(state.id,chapter)?' · undiscovered':''}</option>)}
            <option value="multi">Multi-state</option>
          </select>
        </label>
        <label className={styles.field} htmlFor={`${id}-arc`}>
          <span>Story arc</span>
          <select id={`${id}-arc`} value={normalized.arc} disabled={arcs.length === 0} onChange={(event) => onChange(normalizeFilters({ ...normalized, arc: event.target.value }, chapter))}>
            <option value="all">All revealed arcs</option>
            {arcs.map((arc) => <option key={arc.id} value={arc.id}>{arc.name}</option>)}
          </select>
        </label>
        <div className={styles.summary} aria-live="polite" aria-atomic="true">
          <p className={styles.count}>{visibleCount} {visibleCount === 1 ? 'landmark' : 'landmarks'} at your chapter</p>
          {visibleCount === 0 && <p className={styles.empty}>No landmarks match. Try another state or clear the filters.</p>}
        </div>
        <button type="button" className={styles.clear} disabled={activeCount === 0} onClick={() => onChange({ ...DEFAULT_FILTERS })}>Clear filters</button>
      </div>
    </>
  );
}
