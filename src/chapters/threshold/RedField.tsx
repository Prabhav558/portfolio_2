import { useMemo } from 'react';
import { mulberry32 } from '../../lib/random';
import { arc } from './layout';

/** Full-bleed red woodcut field the push-in lands on; it dissolves into scan-line stripes. */
export default function RedField() {
  const d = useMemo(() => {
    const rnd = mulberry32(23);
    let deep = '';
    let black = '';
    for (let rad = 60; rad < 1100; rad += 9 + rnd() * 9) {
      for (let i = 0; i < 2; i++) {
        const a0 = rnd() * 360;
        const s = 20 + rnd() * 120;
        if (rnd() < 0.18) black += arc(800, 450, rad, a0, a0 + s * 0.7);
        else deep += arc(800, 450, rad, a0, a0 + s);
      }
    }
    return { deep, black };
  }, []);
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true" focusable="false">
      <rect width="1600" height="900" fill="#722F37" />
      <path d={d.deep} fill="none" stroke="#4A1D23" strokeWidth={2.4} strokeLinecap="round" opacity={0.85} />
      <path d={d.black} fill="none" stroke="#050505" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}
