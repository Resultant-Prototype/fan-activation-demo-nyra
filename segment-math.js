// segment-math.js
// Pure functions for the "Try it" tab. No DOM access: safe to run under Node
// for testing, and the same source gets copied into index.html's <script>
// for the browser (see Task 6). Do not edit the two copies independently.

const SEGMENTS = [
  {
    id: 'crestwood',
    name: 'Crestwood Meet Lapsed Ticket Buyers',
    description: 'Bought a ticket in the last 3 years, nothing in 90+ days',
    total: 24300,
    noPreference: 3650,
    optedOut: 890,
    selfExclusion: 14,
  },
  {
    id: 'founders-cup',
    name: 'Founders Cup Wagering VIPs',
    description: 'High-value ADW accounts active in the last 12 months',
    total: 8150,
    noPreference: 980,
    optedOut: 310,
    selfExclusion: 6,
  },
  {
    id: 'clubhouse-kids',
    name: 'Clubhouse Kids Families',
    description: 'Family segment tied to the kids club program',
    total: 12900,
    noPreference: 2150,
    optedOut: 425,
    selfExclusion: 3,
  },
];

const CHANNELS = [
  {
    id: 'email',
    label: 'Email',
    consentNote: null,
    metrics: ['delivered', 'opened', 'clicked', 'purchases'],
    rates: { delivered: 0.98, opened: 0.32, clicked: 0.07, purchases: 0.018 },
  },
  {
    id: 'sms',
    label: 'SMS',
    consentNote: 'Requires documented consent, not just a preference flag.',
    metrics: ['delivered', 'clicked', 'purchases'],
    rates: { delivered: 0.95, clicked: 0.12, purchases: 0.031 },
  },
  {
    id: 'mail',
    label: 'Direct Mail',
    consentNote: null,
    metrics: ['delivered', 'purchases'],
    rates: { delivered: 0.97, purchases: 0.009 },
  },
];

function getSegment(segmentId) {
  const segment = SEGMENTS.find((s) => s.id === segmentId);
  if (!segment) throw new Error(`Unknown segment: ${segmentId}`);
  return segment;
}

function getChannel(channelId) {
  const channel = CHANNELS.find((c) => c.id === channelId);
  if (!channel) throw new Error(`Unknown channel: ${channelId}`);
  return channel;
}

function computeExclusion(segmentId) {
  const s = getSegment(segmentId);
  const excludedTotal = s.noPreference + s.optedOut + s.selfExclusion;
  const eligible = s.total - excludedTotal;
  return {
    total: s.total,
    noPreference: s.noPreference,
    optedOut: s.optedOut,
    selfExclusion: s.selfExclusion,
    excludedTotal,
    eligible,
  };
}

function computeChannelResult(eligible, channelId) {
  const c = getChannel(channelId);
  const result = { channelId, label: c.label };
  for (const metric of c.metrics) {
    result[metric] = Math.round(eligible * c.rates[metric]);
  }
  return result;
}

function computeSendResults(segmentId, channelIds) {
  const exclusion = computeExclusion(segmentId);
  const perChannel = channelIds.map((id) => computeChannelResult(exclusion.eligible, id));

  const combined = {};
  for (const result of perChannel) {
    for (const key of Object.keys(result)) {
      if (key === 'channelId' || key === 'label') continue;
      combined[key] = (combined[key] || 0) + result[key];
    }
  }

  return { exclusion, perChannel, combined };
}

// ---- Live filter builder (Segment Builder tab) ----
// The three SEGMENTS above are each a fixed, pre-computed audience. The
// Segment Builder tab needs the opposite: someone picks criteria and sees a
// count react live, the way it was demoed on the 9/3 sync call ("ticket
// buyers, wagered $100+, also bought food and beverage"). That needs an
// actual population to filter against, not a lookup table.
//
// AUDIENCE_POOL is generated once from a fixed seed (mulberry32, seeded PRNG)
// so results are deterministic and testable, not Math.random() noise that
// changes on every reload mid-demo.

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick(rand, options, weights) {
  const r = rand();
  let acc = 0;
  for (let i = 0; i < options.length; i++) {
    acc += weights[i];
    if (r <= acc) return options[i];
  }
  return options[options.length - 1];
}

function generatePool(size, seed) {
  const rand = mulberry32(seed);
  const pool = [];
  for (let i = 0; i < size; i++) {
    const region = weightedPick(rand, ['home-state', 'neighboring-state', 'out-of-state'], [0.55, 0.25, 0.2]);
    const trackExclusion = rand() < 0.006;
    const mobileExclusion = trackExclusion || rand() < 0.011;
    const dataRestricted = region === 'out-of-state' && rand() < 0.12;
    pool.push({
      ticketBuyer: rand() < 0.42,
      wager30: rand() < 0.55 ? Math.round(rand() * rand() * 3000) : 0,
      fnb: rand() < 0.34,
      horseman: rand() < 0.028,
      marketingOptIn: rand() < 0.71,
      trackExclusion,
      mobileExclusion,
      dataRestricted,
      region,
    });
  }
  return pool;
}

const AUDIENCE_POOL = generatePool(5000, 20260903);

// Self-exclusion (on-track or mobile wagering) and data-use restrictions are
// removed before any chosen criteria run, and that ordering isn't a filter
// someone can turn off — it mirrors the "self-exclusion overrides everything"
// rule from the 9/3 sync.
function computeFilteredAudience(pool, filters) {
  const f = Object.assign(
    { ticketBuyer: false, minWager: 0, fnb: false, horseman: false, optInOnly: true, regions: ['home-state', 'neighboring-state', 'out-of-state'] },
    filters
  );
  const complianceSafe = pool.filter((p) => !(p.trackExclusion || p.mobileExclusion || p.dataRestricted));
  const matched = complianceSafe.filter((p) => {
    if (f.ticketBuyer && !p.ticketBuyer) return false;
    if (p.wager30 < f.minWager) return false;
    if (f.fnb && !p.fnb) return false;
    if (f.horseman && !p.horseman) return false;
    if (f.optInOnly && !p.marketingOptIn) return false;
    if (!f.regions.includes(p.region)) return false;
    return true;
  });
  return { universe: pool.length, complianceSafe: complianceSafe.length, matched: matched.length, matchedRecords: matched };
}

function summarizeAudience(matchedRecords) {
  const n = matchedRecords.length;
  const regionCounts = { 'home-state': 0, 'neighboring-state': 0, 'out-of-state': 0 };
  if (n === 0) return { avgWager: 0, horsemanShare: 0, optInRate: 0, regionCounts };
  const avgWager = Math.round(matchedRecords.reduce((sum, p) => sum + p.wager30, 0) / n);
  const horsemanShare = Math.round((matchedRecords.filter((p) => p.horseman).length / n) * 100);
  const optInRate = Math.round((matchedRecords.filter((p) => p.marketingOptIn).length / n) * 100);
  matchedRecords.forEach((p) => { regionCounts[p.region]++; });
  return { avgWager, horsemanShare, optInRate, regionCounts };
}

// Same per-channel math as computeSendResults, but for a raw eligible count
// instead of a segmentId lookup — the Segment Builder tab already has its
// eligible count from computeFilteredAudience.
function computeSendResultsForAudience(eligible, channelIds) {
  const perChannel = channelIds.map((id) => computeChannelResult(eligible, id));
  const combined = {};
  for (const result of perChannel) {
    for (const key of Object.keys(result)) {
      if (key === 'channelId' || key === 'label') continue;
      combined[key] = (combined[key] || 0) + result[key];
    }
  }
  return { eligible, perChannel, combined };
}

// CommonJS export for the Node test above. When this same block is copied
// into index.html's inline <script> tag, no export step runs there: the
// top-level const and function declarations above simply become ordinary
// script-global bindings, which is all the browser copy needs.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SEGMENTS, CHANNELS, getSegment, getChannel, computeExclusion, computeChannelResult, computeSendResults,
    generatePool, AUDIENCE_POOL, computeFilteredAudience, summarizeAudience, computeSendResultsForAudience,
  };
}
