# Root — general preferences

## Language & communication

- Writes prompts in Vietnamese, typed without diacritics (ASCII-only, e.g. "giao diện docs yêu cầu hiện đại đẹp 2026"). Treat it as Vietnamese intent. Confidence: 0.75
- Gives extremely terse, one-line briefs and expects the agent to make the design/architecture calls autonomously rather than asking clarifying questions first. Confidence: 0.7
- Misspellings are not an obstacle ("commt & deploy" for "commit & deploy") — infer the
  intent and act; do not ask for confirmation of the spelling. Confidence: 0.5
- Terseness extends to operations, not just design: "commit & deploy" bundled two irreversible
  actions with no repo, host, or target named, trusting the agent to discover the deploy
  procedure from the project itself (`deploy/DEPLOY-STEPS.md`). The same shape recurs as
  "merge & deploy & clean" — push, ship, then sweep the workspace — with "merge" used loosely
  for *push to origin* of already-committed work. Treat the whole line as authorization for the
  full path, cleanup included. Confidence: 0.65
- Frames requests around a desired *outcome and mood* ("modern, beautiful, 2026") rather than implementation detail; the agent is expected to derive the concrete spec. Confidence: 0.55
- Confirms understanding tersely and moves on ("Rõ rồi", "ftech nội dung" → "tạo docs cho từng model"). Treat a short affirmative as approval to proceed, not as a request for more detail. Confidence: 0.55
- Pastes concrete markup as a *spec to match exactly* — a YouTube embed snippet with named
  attributes (`si` param, `allow`, `referrerpolicy`, `loading`). Expects the rendered output
  to reproduce those attributes verbatim, verified attribute-by-attribute in the built HTML.
  The supplied markup is intent about *which attributes to include*, not a licence to
  hard-code its pixel values. Confidence: 0.4

## Autonomy boundaries

- Grants wide latitude for judgement calls, but expects anything a reviewer would want to be
  able to reverse or second-guess to be surfaced explicitly at the end (owner substituted,
  backup taken, favicon replaced, `bun.lock` committed). Confidence: 0.6
- When a judgement call departs from the literal request, the departure itself is the thing to
  report — the embed kept `width="560" height="315"` but bounded them with `max-width` +
  `aspect-ratio` so the page wouldn't overflow at 375px, and offered the literal hard-coded
  variant back as a revert. Not yet confirmed by the user. Confidence: 0.35

## Referenced sources

- Points at a URL as the source of truth for a task, but the URL may belong to a *different
  product* than the one being worked on — asked for model docs citing Command Code's catalog
  while the repo is GuRouter's. Always confirm a supplied reference is authoritative for the
  project before building content from it, and say so plainly when it isn't. Confidence: 0.6
- The value of chasing the real source was confirmed: the referenced catalog had 83 models
  belonging to another vendor, while the project's own public API had the correct 40. Building
  from the URL as given would have produced a confidently wrong, entirely invented docs
  section. Confidence: 0.6

## Mid-task redirection

- Will switch to an unrelated task mid-flight without warning or a cleanup instruction. Expects
  the new task completed cleanly and the abandoned thread reported at the end (what was
  started, what was never run, whether to continue) rather than half-finished or silently
  dropped. Confidence: 0.5
