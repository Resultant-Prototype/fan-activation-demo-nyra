# Activation Layer Demo — Belmont Racing Group

A single-file, zero-backend mockup showing a target customer-engagement
architecture: Databricks as the system of record (Customer 360, identity
resolution, consent and suppression, regulatory controls, segments), a
vendor-neutral activation layer on top, and channels below that, with all
engagement and purchase activity flowing back into the lakehouse.

Open `index.html` directly, no install required. All data is fabricated.

## Tabs

1. **Today** — the fragmented state: disconnected ticketing, wagering, email,
   concessions, and unsubscribe systems.
2. **Target Architecture** — the proposed model.
3. **Try It** — pick a fabricated audience, pick a channel, send, and see
   consent/suppression logic and engagement results, all computed client-side
   from fixed, fabricated numbers.

## Development

The consent/exclusion and engagement math in Tab 3 is developed and tested
separately in `segment-math.js` / `segment-math.test.js` (`node
segment-math.test.js`), then copied by hand into `index.html`'s inline
`<script>`. There is no build step: `index.html` is the single shipped file.
