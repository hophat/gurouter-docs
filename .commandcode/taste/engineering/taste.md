# Engineering

## Verification discipline (agent-executed, weak signal — no pushback either way)

- Verify every external reference before writing about it, and take the repo as the source
  of truth rather than the user's description. A pasted YouTube block was checked with
  `oembed` before the page was written, and the base URL and example model ids were pulled
  from the repo's own docs and `models.json` instead of being invented. Confidence: 0.5
- The same rule cuts the other way: when a fact can only come from memory rather than a
  check (a version number for when a client shipped BYOK support), label it as unverified in
  the sign-off and ask the user to confirm it before deploy. Never let an unchecked number
  read as a verified one. Confidence: 0.5
- A new page is not done until it is registered in the sidebar, given a route contract for
  the endpoints it documents, and builds clean. While in the file, drop imports that ended
  up unused — an unused `Tabs`/`TabItem` import was removed on sight. Confidence: 0.45
- Before committing a page, look at it rendered: screenshot the full desktop page, the
  lower sections (the error table and code blocks), and a mobile width. Build passing is not
  the same as the page reading well. Confidence: 0.4
