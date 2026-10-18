# browser-signals

A small, privacy-first Web SDK that collects device and behavioral signals in the browser for fraud and risk scoring. About 2 KB compressed for the script-tag build, one global, no dependencies.

> Status: early. Device signals and keystroke timing work and are tested in Chromium, Firefox and WebKit. More collectors are on the roadmap below.

## What it collects

| Signal | Why it matters for risk | Privacy rule |
|---|---|---|
| Device: platform, languages, timezone, screen, CPU cores, memory, touch points, GPU vendor/renderer | Ties sessions to a device; spots emulators and mismatched setups | Hashed into one stable SHA-256 `hash`; raw values sent once per page load |
| `navigator.webdriver` | Most automation tools set it | None needed |
| Keystroke timing: dwell (key held) and flight (gap between keys), as mean and std | People type with a steady rhythm; scripts and paste-driven fraud do not | **Which key was pressed is never stored or sent** |
| Untrusted key events (`isTrusted === false`) | Input injected by script, not a person | Count only |

## Install

Script tag:

```html
<script src="https://unpkg.com/browser-signals/dist/browser-signals.iife.min.js"></script>
<script>
  const signals = BrowserSignals.init({ endpoint: "https://risk.example.com/collect" });
</script>
```

npm:

```ts
import { init } from "browser-signals";
const signals = init({ endpoint: "/collect", sampleRate: 0.5, requireConsent: true });
// after the user accepts your consent banner:
signals.grantConsent();
```

## API

`init(config)` returns a client. Calling `init` again returns the same client, so two copies of the tag on one page never double-count.

| Option | Default | Meaning |
|---|---|---|
| `endpoint` | none | URL that receives JSON payloads |
| `onPayload` | none | Callback with each payload (demos, tests, custom transport) |
| `flushIntervalMs` | `10000` | Batch interval while the page is visible |
| `sampleRate` | `1` | Fraction of page loads that run the SDK |
| `requireConsent` | `false` | Collect nothing until `grantConsent()` |

Client: `flush()`, `grantConsent()`, `destroy()` (removes every listener and timer).

Payload shape: see `src/types.ts` (`Payload`).

## Design decisions

- **Never break the host page.** Every entry point and every event handler is wrapped so the SDK cannot throw into the page. Listeners are passive (never block scrolling or typing) and capture-phase (still see events when the page calls `stopPropagation`).
- **Leave nothing behind.** Every listener returns its own remover; `destroy()` calls them all. The IIFE build adds exactly one global (`BrowserSignals`), and a test proves it.
- **Constant memory.** Timing stats use Welford's running mean and variance, so no raw event lists are kept, however long the session.
- **Send reliably on exit.** Batches go out on an interval, on `visibilitychange` to hidden, and on `pagehide`, using `sendBeacon` with a `fetch(keepalive)` fallback. `text/plain` bodies avoid a CORS preflight during unload.
- **Stable hash, honest hash.** The device hash leaves out values that change on the same device (user agent on browser updates, pixel ratio on zoom, timezone offset on DST). If SubtleCrypto is unavailable (insecure context) the hash is `null`, never a weak substitute.
- **Obfuscation.** The IIFE is minified with Terser and mangles `_private` property names. That shrinks the file and slows casual reading; it is not real obfuscation. Anything a fraudster must not see belongs on the server.

## Build and tooling

- **Rollup** builds two outputs from `src/index.ts`: ESM (`dist/browser-signals.esm.js`) for bundlers and a minified IIFE for script tags.
- **Babel** (`@babel/preset-env` + `@babel/preset-typescript`) lowers syntax for the targets in `browserslist` (package.json). **tsc** only type-checks and writes `.d.ts` files.
- **size-limit** fails CI if the IIFE grows past 5 KB.
- **Vitest + happy-dom** for unit tests; **Playwright** runs the end-to-end tests in Chromium, Firefox and WebKit.
- **GitHub Actions** runs typecheck, unit tests, build and size, then the browser tests as a 3-engine matrix.

```bash
npm install
npx playwright install chromium firefox webkit   # once
npm run check        # typecheck + unit tests + build + size
npm run test:e2e     # cross-browser tests
npm run serve        # then open http://localhost:4173/demo/
```

## Roadmap

Each item is a self-contained collector or feature. Follow the pattern in `src/collectors/keystroke.ts` (a `Collector` with `start`, `snapshot`, `stop`), register it in `src/index.ts`, and add a unit test plus a Playwright test.

- [ ] **Pointer dynamics**: pointer speed, acceleration, straightness of paths, click hold time (`pointermove` sampled with `requestAnimationFrame`)
- [ ] **Paste and autofill**: paste count per field, characters pasted vs typed (never the content)
- [ ] **Focus and visibility**: tab switches, time hidden, field focus order
- [ ] **Touch gestures**: swipe speed, touch area and pressure where available (mobile web)
- [ ] **Canvas and audio signals**: rendering differences used in device fingerprinting; research the privacy-browser countermeasures first
- [ ] **Bot signals**: headless hints (missing plugins, inconsistent `userAgentData` vs `userAgent`, impossible screen sizes)
- [ ] **Payload signing**: HMAC the payload with a per-session key from the server, so replayed or forged payloads can be rejected
- [ ] **Retry queue**: keep unsent batches in `sessionStorage` and resend on the next page
- [ ] **UMD/CJS build** and a `browser-signals.d.ts` bundle with `rollup-plugin-dts`
- [ ] **Publish** to npm with provenance from GitHub Actions

## License

MIT
