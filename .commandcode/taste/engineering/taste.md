# Engineering practice

## Verification over assertion

- A passing build is not evidence a feature works. The strongest moment in the deploy was
  checking the *deployed HTML* for the "Edit this page" link that had been reported as
  working, which turned out to be silently missing. Chasing it to root cause (a component
  override replacing a mount point) and fixing, re-committing, and re-verifying live was
  received without comment. Confidence: 0.6
- Component overrides that replace something wholesale are expected to be audited for what
  they implicitly dropped. Silent feature loss inside a green build is treated as a real
  defect worth a dedicated follow-up commit. Confidence: 0.55
- End-state claims should be checked against the thing the user actually sees (the live URL,
  the rendered DOM), not against the local artifact or the build log. Confidence: 0.6
- A formula reverse-engineered from source is a hypothesis, not a result. The GuRouter price
  was derived as `input = 2 × model_ratio` from the minified bundle, and was *wrong* until
  checked against the live `/pricing` page — the real charge multiplies by `group_ratio`, so
  one price per model was never correct. Derivation from code never substitutes for
  validation against rendered output. Confidence: 0.6
- Re-verify against the *live* site, not just the local preview, after a deploy. The production
  pass caught nothing new about the page but did confirm the server-rendered catalog survived
  the sync (40 rows in the served HTML, null cache rates still rendering `n/a` rather than
  being coerced to 0). Expected discipline; raise the confidence of an earlier deploy claim
  rather than leaving it resting on a local build. Confidence: 0.5
- A surprising number is a measurement bug until proven otherwise. `grep -c` counts matching
  *lines*, not matches, so a 40-row single-line HTML blob reported "3" — the fix was
  `grep -o … | wc -l`, plus an explicit correction in the write-up rather than quietly
  re-running until the number looked right. Self-corrected miscounts are disclosed in the
  report even when they turn out to be benign. Confidence: 0.5
- Before declaring a layout defect from a geometry metric, confirm which element the number
  describes. `scrollWidth` read off the table was blamed on table overflow, but the rows
  measured exactly the container width and the overflow belonged to the sticky-header
  scroll wrapper. Measure row vs. table vs. wrapper widths separately, and look at a
  screenshot, before escalating. Confidence: 0.5
- Prefer a real browser over `curl` when the claim is about rendering or interaction.
  Headless Chrome over the DevTools protocol was reused to confirm plan switching, null-price
  display and row geometry on the deployed domain. Confidence: 0.55
- A check that reports failure is evidence about the *check*, not yet about the code. The
  wordmark gradient "did not apply" (`background-clip: none` in the computed style) was
  chased into the stylesheet as a specificity problem — grepping every `.site-title` rule
  and suspecting a competing declaration — when the probe was querying
  `.site-title a` and the text actually lives in `.site-title > span`. The markup was
  never wrong; the instrument was. Before editing code to satisfy a red check, confirm the
  probe can see the element it is looking for. Confidence: 0.5
- Don't write selectors against an assumed DOM. Read the served HTML around the target
  element (curl the page, slice around the class name) before authoring a rule against it.
  The markup for the site title was `<a><img><span>text</span></a>`, which invalidated the
  obvious first guess twice over — wrong element, and a gradient clipped to that box would
  have tinted the logo artwork. Confidence: 0.5
- Reusing and patching one throwaway CDP script across iterations beats regenerating it —
  the verification harness gets cheaper as it accumulates, and a fix to the probe is
  distinguishable from a fix to the page. Confidence: 0.4
- A check that reports failure is evidence about the *check*, not yet about the code — and
  it is also evidence about the *timeout*. A build that "failed" inside a tool turned out to
  be an `execFile` timeout too short for a second consecutive run, while the build itself
  was clean. Check the exit code and the clock before believing the red. Confidence: 0.55
- Read the stream the tool actually reports in. Astro writes its result to `stderr` as well
  as `stdout`; reading only `stdout` hid a real failure behind a clean-looking empty
  string, and `[WARN]` lines were initially mistaken for errors. Capture both and
  discriminate on the exit code. Confidence: 0.55
- Verify a generated diff by what actually changed, not by how large it looks. The sync
  run showed `models.json` dirty; the diff was a timestamp and group ordering, with no
  model or price altered. Inspect the changed lines before narrating a change as real. Confidence: 0.5
- A test that dirties the repo should be made revertible before it is first run, not
  after. Committing a `wip:` so a test's writes are `git checkout`-able was done up front;
  later iterations only restored `src/content/docs` and `astro.config.mjs` and reverted
  the uncommitted fix by accident. Scope the reset narrowly and re-apply fixes after. Confidence: 0.5
- A conventional name may be silently ignored by a content pipeline. Astro skips
  collection files whose name starts with `_`, so a page written as `_draft` was listed in
  the sidebar and then failed the build — invisible in a directory listing that looks
  correct. A test artifact hit this before the slug was renamed. Confidence: 0.5
- Path handling that takes strings from a caller gets a confinement check plus a test for
  it. `get_page` with `../../../etc/passwd` is refused, and the refusal is asserted in
  the suite rather than assumed from the resolve logic. Confidence: 0.55

## Tools an agent will drive

- When a tool is being built for an agent, the tool's own job is to surface the errors the
  agent would otherwise never hit. The `build` tool existed to be the one thing that proved
  MDX compiled; a cheap pre-flight check beside it was not sufficient on its own. Confidence: 0.6
- A tool that leaves a follow-up action to the caller must say so unambiguously in its own
  output, and the caller is a machine. Report the exact remaining steps in the result text,
  not in a code comment. Confidence: 0.55
- A capability that quietly creates a *second* problem is worse than not having it. `delete_page`
  left the sidebar entry behind, which Starlight treats as a hard build failure — so the
  cleanup belongs inside the tool, not in a "now you go remove this" message. If violating
  the invariant is a build failure, the tool owns the repair. Confidence: 0.6
- Encode the conventions *in the tool*, not in a document the agent has to find and read.
  The whole point was that the rules were living in someone's head; a `site_conventions`
  tool that returns them beats a section in a file. Confidence: 0.55
- An agent-facing tool should also register the paths it touches in the agent's own
  convention files (AGENTS.md), so the next session inherits the knowledge rather than
  rediscovering it. Confidence: 0.5
- Test such a tool through its real interface — an official client over real stdio, not a
  mocked call — so the handshake, the schemas and the results are exercised the way an agent
  will exercise them. 30 checks, including a full create/update/delete round-trip, the build
  passing both while the page exists and after it is gone, and path traversal refused. Confidence: 0.55

## Color and contrast as measured values

- Brand colors are sampled from the source asset's pixels, never chosen by eye. The logo
  PNG was downloaded and read with PIL: top-frequency colors, then per-hue buckets, then
  positions sampled *along the gradient arc* to recover the stops in the order they appear.
  Eyeballing a gradient produces a plausible sequence that does not match the mark.
  Confidence: 0.5
- Contrast is computed, not assessed. A short Python implementation of the WCAG relative
  luminance and contrast ratio was run over every new stop against every surface it lands
  on (white; and in dark mode, the background *and* both elevated surfaces, taking the
  worst case). Three of six sampled colors failed as body text and were corrected before
  the build. Worth treating as a required step for any new color token, not a nicety.
  Confidence: 0.5
- When a color fails contrast, move lightness and hold hue. The correction script walks
  `L` down in small steps until the ratio clears, keeping `H` and `S` fixed, so the
  corrected swatch is still recognizably the brand color. Report the trade-off explicitly
  when the corrected value is visibly off-brand. Confidence: 0.5
- Dark mode is its own token set derived from the same hues, not an inversion — the logo's
  mid-tone colors lose signal on a near-black field, so every stop was stepped *up* in
  lightness and re-checked against the darkest surface in the theme. Confidence: 0.45

## Configuration portability

- Never write a machine-specific absolute path into a committed config file. Switching
  `.mcp.json` to `/Users/macbookpro/.../scripts/docs-mcp.ts` did make the server runnable
  from any cwd, and was still reverted: the path belongs to one laptop and breaks every
  clone. Relative paths are the correct form for project-scoped config; the session cwd is
  the client's contract. Confidence: 0.55
- Test a config from the directory it is supposed to fail in before "hardening" it. Running
  the stdio server from `/tmp` showed both candidate forms behaved as designed, and the
  committed relative form was already correct — the change was churn, so revert rather than
  ship a rewrite that fixes nothing. Confidence: 0.5
- Say out loud when you tried something and backed it out, with the reason, at the end of the
  report ("I switched it to an absolute path, then reverted — that would put your `/Users/...`
  into the repo"). The user accepted it without comment. Confidence: 0.45

## Getting data out of a live system

- `web_fetch` on a client-rendered SPA returns an empty shell — the page body has no content
  until JS runs. Working method: read the app bundle for API paths, call the underlying JSON
  endpoint directly, and drive headless Chrome over the DevTools protocol
  (`Runtime.evaluate` → `document.body.innerText`) to read the rendered DOM for
  cross-checking. Confidence: 0.6
- Probe endpoint candidates cheaply in a loop with `%{http_code}` + size before committing to
  one; an unauthenticated probe that returns 401 is itself a finding. Confidence: 0.5

## Third-party data in the repo

- Commits a data snapshot regenerated by a script rather than fetching a live API at build
  time — chose `bun run sync:models` writing `src/data/models.json` over a build-time call
  (rationale: the build must not depend on a third-party endpoint, and a price that changes
  between review and publish is worse than one that is visibly stale). Accepted with a terse
  "Rõ rồi". Confidence: 0.5
- An unused snapshot is still worth landing: when the consuming page did not exist yet, the
  script + data were committed anyway so the work was not lost, and the user had said only
  "commit & deploy" — no objection to landing groundwork the previous session left unfinished.
  Land the partial infrastructure, but state plainly that no rendered page reads it yet.
  Confidence: 0.5
- Before committing a never-run script, run it once and inspect the output artifact
  (record count, a sample record, the `fetchedAt` stamp) — an untested generator in a commit
  is a liability. Confidence: 0.45
- Snapshots get a `fetchedAt` timestamp so staleness is visible, and the sync script refuses
  to overwrite on an empty/malformed API response. Worth keeping as a pattern. Confidence: 0.5
