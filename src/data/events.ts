import { FxEvent } from '../types';
import { PART1_DATA } from './events_part1';
import { PART2_DATA } from './events_part2';
import { PART3_DATA } from './events_part3';

function mergeAndDedupEvents(arrays: FxEvent[][]): FxEvent[] {
  const seen = new Set<string>();
  const merged: FxEvent[] = [];

  for (const arr of arrays) {
    for (const ev of arr) {
      const canonicalDate = (() => {
        try {
          return new Date(ev.date).toISOString();
        } catch {
          return ev.date;
        }
      })();
      const key = `${ev.title.trim().toLowerCase()}|${canonicalDate}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(ev);
      }
    }
  }

  // Sort chronologically
  return merged.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (isNaN(timeA) && isNaN(timeB)) return 0;
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;
    return timeA - timeB;
  });
}

export const BUILTIN_DATA: FxEvent[] = mergeAndDedupEvents([
  PART1_DATA,
  PART2_DATA,
  PART3_DATA
]);

