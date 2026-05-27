/**
 * Spec §5.2.3 quota helpers.
 *
 * A `quota` object on a usage record is a point-in-time sample of the
 * provider's rate-limit state at the END of the turn. The spec shape:
 *
 *   {
 *     "planType": "pro",
 *     "windows": [
 *       { "label": "primary",   "windowMinutes": 300,   "usedPercent": 64.0, "resetsAt": 1779863673 },
 *       { "label": "secondary", "windowMinutes": 10080, "usedPercent": 57.0, "resetsAt": 1780187884 }
 *     ]
 *   }
 *
 * Reserved labels are `primary` (short window, e.g. 5h for Codex Pro) and
 * `secondary` (long window, e.g. 7d for Codex Pro). Implementations MAY add
 * additional labels; readers MUST treat unknown labels as opaque.
 *
 * `QuotaSample` (the in-memory shape used inside this package) is the same
 * structure plus a `provider` tag and a `timestamp`:
 *
 *   {
 *     "provider": "codex",
 *     "timestamp": "2026-05-18T21:50:34Z",
 *     "planType": "pro",
 *     "windows": [...same as above...]
 *   }
 */

/**
 * Strip the in-memory `QuotaSample` wrapping down to the spec's bare
 * `quota` object shape. Returns `null` if the sample has no windows.
 */
export function quotaSampleToSpecObject(sample) {
  if (!sample || !Array.isArray(sample.windows) || sample.windows.length === 0) return null;
  return {
    planType: sample.planType ?? '',
    windows: sample.windows.map((w) => {
      const out = {
        label: w.label,
        windowMinutes: w.windowMinutes,
        usedPercent: w.usedPercent,
      };
      if (typeof w.resetsAt === 'number') out.resetsAt = w.resetsAt;
      return out;
    }),
  };
}

/**
 * Find the window with the given label inside a QuotaSample. Returns
 * `undefined` if absent.
 */
export function findWindow(sample, label) {
  if (!sample || !Array.isArray(sample.windows)) return undefined;
  return sample.windows.find((w) => w.label === label);
}
