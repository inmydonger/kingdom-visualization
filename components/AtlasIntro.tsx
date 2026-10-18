'use client';

import styles from './AtlasIntro.module.css';

export default function AtlasIntro({ ready }: { ready: boolean }) {
  return <div className={styles.loading} data-ready={ready} role="status" aria-hidden={ready} aria-live="polite">
    <span className={styles.seal} aria-hidden="true">國</span>
    <span className={styles.kicker}>Kingdom · Warring States Atlas</span>
    <p>Unfolding the realm</p>
    <span className={styles.caption}>Preparing terrain and the stories you’ve reached.</span>
  </div>;
}
