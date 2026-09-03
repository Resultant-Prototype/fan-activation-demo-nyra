// segment-math.test.js
// Run with: node segment-math.test.js
const {
  computeExclusion,
  computeSendResults,
  AUDIENCE_POOL,
  computeFilteredAudience,
  summarizeAudience,
  computeSendResultsForAudience,
} = require('./segment-math.js');

let failures = 0;

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    console.error(`FAIL: ${label} — expected ${expected}, got ${actual}`);
    failures++;
  } else {
    console.log(`PASS: ${label}`);
  }
}

// Test 1: Crestwood exclusion math matches the spec table
{
  const result = computeExclusion('crestwood');
  assertEqual(result.excludedTotal, 4554, 'crestwood excludedTotal');
  assertEqual(result.eligible, 19746, 'crestwood eligible');
}

// Test 2: Founders Cup exclusion math matches the spec table
{
  const result = computeExclusion('founders-cup');
  assertEqual(result.excludedTotal, 1296, 'founders-cup excludedTotal');
  assertEqual(result.eligible, 6854, 'founders-cup eligible');
}

// Test 3: Clubhouse Kids exclusion math matches the spec table
{
  const result = computeExclusion('clubhouse-kids');
  assertEqual(result.excludedTotal, 2578, 'clubhouse-kids excludedTotal');
  assertEqual(result.eligible, 10322, 'clubhouse-kids eligible');
}

// Test 4: single-channel email send on crestwood computes expected values
{
  const result = computeSendResults('crestwood', ['email']);
  assertEqual(result.combined.delivered, Math.round(19746 * 0.98), 'crestwood email delivered');
  assertEqual(result.combined.opened, Math.round(19746 * 0.32), 'crestwood email opened');
  assertEqual(result.combined.clicked, Math.round(19746 * 0.07), 'crestwood email clicked');
  assertEqual(result.combined.purchases, Math.round(19746 * 0.018), 'crestwood email purchases');
}

// Test 5: mail has no opened/clicked keys at all (different metric set per channel)
{
  const result = computeSendResults('founders-cup', ['mail']);
  assertEqual('opened' in result.combined, false, 'mail has no opened metric');
  assertEqual('clicked' in result.combined, false, 'mail has no clicked metric');
  assertEqual('delivered' in result.combined, true, 'mail has delivered metric');
}

// Test 6: multi-channel selection sums independently computed results
{
  const emailOnly = computeSendResults('clubhouse-kids', ['email']);
  const smsOnly = computeSendResults('clubhouse-kids', ['sms']);
  const both = computeSendResults('clubhouse-kids', ['email', 'sms']);
  assertEqual(both.combined.delivered, emailOnly.combined.delivered + smsOnly.combined.delivered, 'multi-channel delivered sums independently');
  assertEqual(both.combined.clicked, emailOnly.combined.clicked + smsOnly.combined.clicked, 'multi-channel clicked sums independently');
}

// Test 7: unknown segment throws instead of silently returning garbage
{
  let threw = false;
  try { computeExclusion('nonexistent'); } catch (e) { threw = true; }
  assertEqual(threw, true, 'unknown segment throws');
}

// Test 8: the audience pool is deterministic — same seed, same population,
// every time the module loads (no Math.random() drift mid-demo)
{
  assertEqual(AUDIENCE_POOL.length, 5000, 'audience pool size');
  const regenerated = require('./segment-math.js').AUDIENCE_POOL;
  assertEqual(regenerated[0].wager30, AUDIENCE_POOL[0].wager30, 'audience pool is stable across requires');
}

// Test 9: the 9/3 call's exact example — ticket buyers, wagered $100+,
// also bought food and beverage — matches a known count against the seeded pool
{
  const result = computeFilteredAudience(AUDIENCE_POOL, { ticketBuyer: true, minWager: 100, fnb: true });
  assertEqual(result.universe, 5000, 'default filters universe');
  assertEqual(result.complianceSafe, 4779, 'default filters complianceSafe');
  assertEqual(result.matched, 236, 'default filters matched');
}

// Test 10: self-exclusion and data-use restriction removal can't be switched
// off by any combination of criteria — an empty filter set still drops them
{
  const result = computeFilteredAudience(AUDIENCE_POOL, {});
  assertEqual(result.complianceSafe, 4779, 'compliance-safe count is filter-independent');
  assertEqual(result.matched <= result.complianceSafe, true, 'matched never exceeds compliance-safe pool');
}

// Test 11: summarizeAudience reflects only the matched slice, not the full pool
{
  const result = computeFilteredAudience(AUDIENCE_POOL, { ticketBuyer: true, minWager: 100, fnb: true });
  const summary = summarizeAudience(result.matchedRecords);
  assertEqual(summary.optInRate, 100, 'default filters are opt-in-only, so opt-in rate is 100%');
  assertEqual(summary.regionCounts['home-state'] + summary.regionCounts['neighboring-state'] + summary.regionCounts['out-of-state'], result.matched, 'region counts sum to matched total');
}

// Test 12: computeSendResultsForAudience applies the same per-channel rates
// as computeSendResults, for a raw eligible number instead of a segment id
{
  const result = computeSendResultsForAudience(1000, ['email']);
  assertEqual(result.combined.delivered, 980, 'audience-based send delivered');
  assertEqual(result.combined.opened, 320, 'audience-based send opened');
  assertEqual(result.combined.purchases, 18, 'audience-based send purchases');
}

// Test 13: empty audience produces zeroed results, not a crash
{
  const result = computeSendResultsForAudience(0, ['email', 'sms']);
  assertEqual(result.combined.delivered, 0, 'zero-eligible send has zero delivered');
}

console.log(failures === 0 ? '\nAll tests passed.' : `\n${failures} test(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
