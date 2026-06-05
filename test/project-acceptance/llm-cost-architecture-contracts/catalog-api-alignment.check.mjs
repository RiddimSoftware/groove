import { strict as assert } from 'node:assert';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  formatFinding,
  runAlignmentCheck,
} from '../../../scripts/check-llm-cost-catalog-api-alignment.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

test('llm-cost package catalogs and README-ready APIs stay aligned', async () => {
  const findings = await runAlignmentCheck({ root: REPO_ROOT });
  assert.deepEqual(
    findings,
    [],
    [
      'llm-cost catalog/API alignment drift:',
      ...findings.map((finding) => formatFinding(finding)),
    ].join('\n\n'),
  );
});
