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

// Dual export: CommonJS for the Node test above, global assignment for the
// browser copy inlined into index.html in Task 6.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SEGMENTS, CHANNELS, getSegment, getChannel, computeExclusion, computeChannelResult, computeSendResults };
}
