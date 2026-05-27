/**
 * Aggregate parsed sessions into a per-issue rollup.
 */

export function emptyProviderTotals() {
  return {
    sessionCount: 0,
    turnCount: 0,
    tokens: {
      inputUncached: 0,
      inputCached: 0,
      cacheCreate5m: 0,
      cacheCreate1h: 0,
      outputVisible: 0,
      outputReasoning: 0,
    },
    tokensGrandTotal: 0,
    models: [],
    firstTimestamp: null,
    lastTimestamp: null,
    quotaSamples: [],
    sourceFiles: [],
  };
}

export function rollupSessions(issueIdentifier, sessions) {
  const providerTotals = {
    claude: emptyProviderTotals(),
    codex: emptyProviderTotals(),
  };
  const modelSets = { claude: new Set(), codex: new Set() };

  for (const session of sessions) {
    const totals = providerTotals[session.provider];
    totals.sessionCount += 1;
    totals.sourceFiles.push(session.sourceFile);
    totals.quotaSamples.push(...session.quotaSamples);

    for (const turn of session.turns) {
      totals.turnCount += 1;
      totals.tokens.inputUncached += turn.tokens.inputUncached;
      totals.tokens.inputCached += turn.tokens.inputCached;
      totals.tokens.cacheCreate5m += turn.tokens.cacheCreate5m;
      totals.tokens.cacheCreate1h += turn.tokens.cacheCreate1h;
      totals.tokens.outputVisible += turn.tokens.outputVisible;
      totals.tokens.outputReasoning += turn.tokens.outputReasoning;
      if (turn.model !== undefined && turn.model !== '') modelSets[session.provider].add(turn.model);
      if (turn.timestamp !== '') {
        if (totals.firstTimestamp === null || turn.timestamp < totals.firstTimestamp) {
          totals.firstTimestamp = turn.timestamp;
        }
        if (totals.lastTimestamp === null || turn.timestamp > totals.lastTimestamp) {
          totals.lastTimestamp = turn.timestamp;
        }
      }
    }
  }

  for (const provider of ['claude', 'codex']) {
    const t = providerTotals[provider];
    t.tokensGrandTotal =
      t.tokens.inputUncached + t.tokens.inputCached + t.tokens.cacheCreate5m +
      t.tokens.cacheCreate1h + t.tokens.outputVisible + t.tokens.outputReasoning;
    t.models = [...modelSets[provider]].sort();
    t.quotaSamples.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  return {
    issueIdentifier,
    providerTotals,
    combinedTokens: providerTotals.claude.tokensGrandTotal + providerTotals.codex.tokensGrandTotal,
    combinedTurns: providerTotals.claude.turnCount + providerTotals.codex.turnCount,
    combinedSessions: providerTotals.claude.sessionCount + providerTotals.codex.sessionCount,
  };
}
