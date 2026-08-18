// segment-math.test.js
// Run with: node segment-math.test.js
const {
  computeExclusion,
  computeSendResults,
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

console.log(failures === 0 ? '\nAll tests passed.' : `\n${failures} test(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
