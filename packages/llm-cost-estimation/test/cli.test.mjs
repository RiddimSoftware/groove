import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(PACKAGE_ROOT, 'bin', 'llm-cost-estimate.mjs');

function specRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    recordedAt: '2026-06-01T00:00:00Z',
    runID: '00000000-0000-4000-8000-000000000000',
    turn: 1,
    issueIdentifier: 'GRV-1',
    provider: 'codex',
    model: 'gpt-5.4',
    botRole: 'developer',
    size: 'L',
    inputTokens: 100,
    outputTokens: 0,
    totalTokens: 100,
    inputUncachedTokens: 100,
    outputVisibleTokens: 0,
    usageSource: 'provider_reported',
    startedAt: '2026-06-01T00:00:00Z',
    endedAt: '2026-06-01T00:00:01Z',
    ...overrides,
  };
}

async function withTempUsage(records, fn) {
  const dir = await mkdtemp(join(tmpdir(), 'llm-cost-estimate-cli-'));
  const path = join(dir, 'usage.jsonl');
  const body = records.map((r) => JSON.stringify(r)).join('\n') + (records.length > 0 ? '\n' : '');
  await writeFile(path, body, 'utf8');
  try {
    return await fn(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runCli(args, env = {}) {
  return new Promise((resolveRun) => {
    const proc = spawn('node', [CLI, ...args], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
    proc.on('close', (code) => resolveRun({ code: code ?? 0, stdout, stderr }));
  });
}

describe('llm-cost-estimate CLI', () => {
  it('forecasts from --size with no Linear token and emits a table', async () => {
    // Five issues at size=L, model=gpt-5.4 → cell has enough samples to clear
    // the default low-confidence threshold.
    const records = [];
    for (let i = 1; i <= 5; i++) {
      const totalTokens = i * 100;
      records.push(specRecord({
        issueIdentifier: `GRV-${i}`,
        inputTokens: totalTokens,
        totalTokens,
        inputUncachedTokens: totalTokens,
      }));
    }
    await withTempUsage(records, async (path) => {
      const { code, stdout, stderr } = await runCli(
        ['--size', 'L', '--model', 'gpt-5.4', '--from-usage', path],
        { LINEAR_API_TOKEN: '' },
      );
      assert.equal(code, 0, `stderr was: ${stderr}`);
      assert.match(stdout, /COST FORECAST/);
      assert.match(stdout, /size L/);
      assert.match(stdout, /n = 5/);
      assert.match(stdout, /tokens/);
      assert.match(stdout, /turns/);
      assert.match(stdout, /dollars/);
      assert.doesNotMatch(stdout, /low confidence/);
    });
  });

  it('--size --json emits a parseable JSON payload with tokens, turns, dollars, and n', async () => {
    const records = [
      specRecord({ issueIdentifier: 'GRV-1', inputTokens: 100, totalTokens: 100, inputUncachedTokens: 100 }),
      specRecord({ issueIdentifier: 'GRV-2', inputTokens: 200, totalTokens: 200, inputUncachedTokens: 200 }),
    ];
    await withTempUsage(records, async (path) => {
      const { code, stdout } = await runCli(
        ['--size', 'L', '--model', 'gpt-5.4', '--from-usage', path, '--json'],
        { LINEAR_API_TOKEN: '' },
      );
      assert.equal(code, 0);
      const payload = JSON.parse(stdout);
      assert.equal(payload.size, 'L');
      assert.equal(payload.model, 'gpt-5.4');
      assert.equal(payload.n, 2);
      assert.equal(payload.tokens.n, 2);
      assert.equal(payload.tokens.p50, 100);
      assert.equal(payload.turns.n, 2);
      assert.equal(payload.dollars.n, 2);
      assert.ok(payload.dollars.p50 >= 0);
      assert.equal(payload.lowConfidence, true); // n=2 < default minSampleSize=5
      assert.equal(payload.empty, false);
    });
  });

  it('--size with no matching records prints the empty/legible result and still shows n', async () => {
    const records = [specRecord({ size: 'S' })];
    await withTempUsage(records, async (path) => {
      const { code, stdout } = await runCli(
        ['--size', 'L', '--model', 'gpt-5.4', '--from-usage', path],
        { LINEAR_API_TOKEN: '' },
      );
      assert.equal(code, 0);
      assert.match(stdout, /n = 0/);
      assert.match(stdout, /forecast is empty/);
    });
  });

  it('--issue without LINEAR_API_TOKEN exits with the documented error', async () => {
    const { code, stderr } = await runCli(
      ['--issue', 'GRV-123', '--model', 'gpt-5.4'],
      { LINEAR_API_TOKEN: '' },
    );
    assert.notEqual(code, 0);
    assert.match(stderr, /LINEAR_API_TOKEN/);
    assert.match(stderr, /--size/);
  });

  it('--issue resolves a Linear estimate via the createLinearEstimateSource adapter', async () => {
    // The CLI's --issue path goes Linear → createLinearEstimateSource →
    // resolveEstimates. The production endpoint is hardcoded, so the easiest
    // way to prove the contract is to exercise the adapter against a local
    // GraphQL stub and confirm it returns the estimate the CLI would forecast
    // at. The CLI smoke-test below feeds that resolved estimate back as
    // --size and asserts the forecast matches.
    const records = [];
    for (let i = 1; i <= 5; i++) {
      const totalTokens = i * 100;
      records.push(specRecord({
        issueIdentifier: `GRV-${i}`,
        estimate: 3,
        size: undefined,
        inputTokens: totalTokens,
        totalTokens,
        inputUncachedTokens: totalTokens,
      }));
    }

    const { createServer } = await import('node:http');
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', (c) => { body += c.toString('utf8'); });
      req.on('end', () => {
        const payload = JSON.parse(body);
        assert.ok(payload.query.includes('issues'), 'expected an issues query');
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({
          data: { issues: { nodes: [{ identifier: 'GRV-123', estimate: 3 }] } },
        }));
      });
    });
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;
    const endpoint = `http://127.0.0.1:${port}/graphql`;

    try {
      await withTempUsage(records, async (path) => {
        const { createLinearEstimateSource } = await import('../src/index.mjs');
        const source = createLinearEstimateSource({ token: 'test-token', endpoint });
        const result = await source.resolveEstimates(['GRV-123']);
        assert.equal(result.get('GRV-123'), 3);

        // Smoke-test the full --size path with the resolved value:
        const { code, stdout } = await runCli(
          ['--size', '3', '--model', 'gpt-5.4', '--from-usage', path, '--json'],
          { LINEAR_API_TOKEN: '' },
        );
        assert.equal(code, 0);
        const payload = JSON.parse(stdout);
        assert.equal(payload.size, '3');
        assert.equal(payload.n, 5);
      });
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it('rejects passing both --size and --issue', async () => {
    const { code, stderr } = await runCli(
      ['--size', 'L', '--issue', 'GRV-1', '--model', 'gpt-5.4'],
      {},
    );
    assert.notEqual(code, 0);
    assert.match(stderr, /both/);
  });

  it('rejects missing --model', async () => {
    const { code, stderr } = await runCli(['--size', 'L'], {});
    assert.notEqual(code, 0);
    assert.match(stderr, /--model/);
  });

  it('prints usage on --help and exits 0', async () => {
    const { code, stdout } = await runCli(['--help'], {});
    assert.equal(code, 0);
    assert.match(stdout, /Usage: llm-cost-estimate/);
  });
});
