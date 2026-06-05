import { strict as assert } from 'node:assert';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { findBoundaryViolations } from '../../../packages/llm-cost-attribution/scripts/check-boundary.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const LLM_COST_ATTRIBUTION_ROOT = join(REPO_ROOT, 'packages/llm-cost-attribution');

test('llm-cost attribution core modules do not import adapters or framework APIs', () => {
  const violations = findBoundaryViolations(LLM_COST_ATTRIBUTION_ROOT);
  assert.deepEqual(violations, [], violations.join('\n'));
});
