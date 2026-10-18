'use client';

import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { getFilterArcs } from '@/lib/landmark-filters';
import styles from './StoryArcPicker.module.css';

type Props = { chapter: number; arc: string; onChange: (arc: string) => void };

export default function StoryArcPicker({ chapter, arc, onChange }: Props) {
  const id = useId();
  return <div className={styles.picker}>
    <label className="sr-only" htmlFor={id}>Story arc</label>
    <select id={id} value={arc} onChange={event => onChange(event.target.value)}>
      <option value="all">All story arcs</option>
      {getFilterArcs(chapter, 'all').map(story => <option key={story.id} value={story.id}>{story.name}</option>)}
    </select>
    <ChevronDown size={13} strokeWidth={1.6} aria-hidden="true" />
  </div>;
}
