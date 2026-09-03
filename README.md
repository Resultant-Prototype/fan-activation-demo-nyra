# Fan Activation Layer Demo — NYRA

A single-file, zero-backend mockup showing a target customer-engagement
architecture: Databricks as the system of record (Customer 360, identity
resolution, consent and suppression, regulatory controls, segments), a
vendor-neutral activation layer on top, and channels below that, with all
engagement and purchase activity flowing back into the lakehouse.

Open `index.html` directly, no install required. All data is fabricated.

## Tabs

1. **Today** — the fragmented state: disconnected Ticketmaster, ADW,
   Marketing, and F&B systems.
2. **Target Architecture** — the proposed model.
3. **Individual View** — one resolved fan record, with fields shown or
   restricted based on the Front-line Staff / Compliance Officer role
   selected. All 4 sample fans are fabricated.
4. **Segment Builder** — live filter criteria against a fabricated 5,000-
   record sample population, with a role-gated "tag & save" action and the
   same channel-send-results flow the original "Try It" tab shipped with.

## Development

The consent/exclusion and engagement math in Tab 3 is developed and tested
separately in `segment-math.js` / `segment-math.test.js` (`node
segment-math.test.js`), then copied by hand into `index.html`'s inline
`<script>`. There is no build step: `index.html` is the single shipped file.
