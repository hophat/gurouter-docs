# Ops — commit, push, deploy

## Deploys to live systems

- Always take a timestamped backup of the live target *before* an `rsync --delete`
  /overwrite, even when the user asked for a straight replace and even when the agent
  labelled the backup path as the non-recommended option. The user explicitly overrode a
  "replace production now (Recommended)" choice in favour of backup-first. A real one-command
  rollback is preferred over a documented "delete the vhost" one. Confidence: 0.7
- Before touching anything live, check the current deployed state (curl the site, read the
  deploy runbook) so the change is made against a known baseline. Accepted silently. Confidence: 0.5

## Push-back on irreversible work

- For irreversible or outward-facing actions (pushing to production, creating a *public*
  remote, publishing a repo), present concrete copy-pasteable options and stop for a
  decision. The user answers by picking an option rather than by typing instructions, and
  chose the reversible option in both cases. A bare option number ("2") is the entire
  instruction — when the picked option includes push + deploy, that is authorization for
  the whole path and the sequence runs to completion without a second confirmation.
  Confidence: 0.7
- A single combined instruction ("commit & deploy", misspelled, one line) is authorization
  for the *whole* path — do not re-present options or pause for a second confirmation once
  told to deploy. The correct response to the confirmation reflex is to make the steps
  safe by default instead (timestamped backup, clean-tree check, build, route + live-DOM
  verification) and report the evidence afterwards. The user asked for the irreversible
  part up front and the full sequence ran to completion without objection. Confidence: 0.6
- The converse holds, twice now: a request that does *not* say deploy ends at the commit.
  Both times the agent committed, stated plainly that it stopped short of deploying because
  it was not asked, and offered the push. So the trigger for deploying is the word, not the
  project being deployable. Confidence: 0.55
- When a plan hits a genuine blocker mid-flight (no git repo, the configured remote returns
  "Repository not found"), surface it rather than improvising a workaround. No pushback on
  being stopped. Confidence: 0.6

## Reporting state honestly

- A terse "done chưa?" is answered with an explicit split of done vs. not done, including
  the parts that look finished but aren't: commits sitting unpushed, deployment not run so
  production still serves the old version. Do not let "the build passes" stand in for
  "shipped". Confidence: 0.6

## Authority granted to an agent-driven workflow

- Authority *offered* is not authority *granted*. Offered a three-rung tool surface for an
  agent-driven content workflow — read/write files, read/write plus a real build, and the
  same plus self-deploy — the user took the middle rung and declined the self-publish one.
  When the agent rather than the user is the actor, the irreversible step stays with the
  human even though it is there to be wired up. Confidence: 0.6
- Prefer the option that lets the agent verify its own work over the one that is merely
  more capable, and prefer repo-local writes over a side branch or direct publish. The
  chosen rung was the one where every change is a revertible diff the human can read. Confidence: 0.55

## Version control

- Expects the *full* VCS path, not a partial one: when a directory isn't a repo, the user
  chose init + commit + create the remote + push over skipping the commit or leaving it
  local-only — even though "skip the commit, deploy only" was a valid option. Confidence: 0.6
- Accepts the agent substituting a broken or missing value (GitHub owner, `editLink` base,
  footer source URL) with the actually-authenticated account, *provided the substitution is
  reported explicitly*. Confidence: 0.55

## Repo hygiene before the first commit

- Scanned staged files for secrets, dropped unused deps and unreferenced assets, gitignored a
  local tooling symlink that would break on clone, and replaced the starter boilerplate
  README. All accepted without comment. These are table stakes, not things to flag or ask
  about. Confidence: 0.5
- `bun` is the toolchain for this project (`bun install`, `bun run build`, `bun remove`).
  Confidence: 0.7
- Scratch artifacts created during verification (`.shots/`, `.cache/`, helper HTML copied
  into `dist/`) are removed and `git status` confirmed clean before finishing, rather than
  left for the next commit to sweep up. Recurred across both deploy cycles. Confidence: 0.55
- Running a dev/preview server for a screenshot is a legitimate step, but it gets stopped
  afterwards — no stray processes left behind. Confidence: 0.5
- No scaffolding commits in the pushed history. A `wip:` marker created only as a
  revert point before a dirty-repo test is reported as not belonging in history, and the
  agent offers to squash it (with a backup on the VPS before the rebase) rather than
  pushing it or hiding it. Clean history is preferred over a fast push. Confidence: 0.55
- When the user picks the squash option, take a recoverable checkpoint *first*
  (`git tag backup-before-rebase-<timestamp>`), inspect both commits to confirm they
  touch the same files, then `git reset --soft HEAD~2` and recommit reusing the real
  message verbatim. Delete the safety tag only after the push and deploy are verified —
  the tag is scaffolding too, and leaving it is the same class of litter as the `wip:`
  commit it replaced. Confidence: 0.5
- Re-run the test suite after a history rewrite before pushing, even though no file
  content changed — it confirms the squash lost nothing, and the test's repo-dirtying
  side effects have to be reverted again before the push. Confidence: 0.5
- Repo hygiene covers the *agent's own* commits, not just the pre-existing mess: anything
  the agent created while working is expected to be cleaned up before handing back, and
  named explicitly when it isn't. Confidence: 0.55

## What "clean" covers

- A request to clean up means the whole sweep, not just the repo: prune the old timestamped
  backups left on the VPS, delete scratch dirs (`.shots/`, `.cache/`, helper HTML injected into
  `dist/`), remove the `/tmp` headless-Chrome user-data profiles and the throwaway CDP scripts
  written alongside them, kill dev/preview servers, and confirm `git status` clean plus no
  stray background shell tasks left running. Confidence: 0.55
- When the user *explicitly* asks to clean up, read it literally and take the whole sweep:
  "merge & close task, clean" produced backups 2 → 0 (all timestamped VPS backups deleted, not
  the newest held back), safety tag gone, /tmp scripts gone, dev processes stopped, working tree
  clean — reported as a before→after table. Holding the newest backup back and handing over an
  `ssh … rm -rf` line is the right call only when cleanup is the agent's own idea, not when
  cleanup is the instruction. Confidence: 0.5
- The learning/taste files under `.commandcode/taste/` live *inside* the project repo and are
  written by the system as the session runs, so a final state check will always show them
  dirty. This is expected: commit and push them with the work rather than treating them as
  local-only artifacts, and note it in one line ("the taste files picked up a new note, I
  committed that too"). The user asked only to close the task and raised no objection to
  the unprompted commit-and-push of the notes.
- "close task" means the agent's own internal todo list, not an issue tracker. The user chains
  VCS, task-list and environment verbs into one line and expects all of them done in the same
  pass; leaving the todo list open reads as an unfinished job. It also covers the background
  shell/monitor task registry — enumerate it with stopped tasks included, not just the todo
  list — and the repo tree. Then state plainly that the registry is empty and nothing is open.
  Confidence: 0.55

## Post-deploy verification

- A deploy is not done when `rsync` returns. Expected: build → backup → sync → curl every
  route's `%{http_code}` (the full set, not just the changed page) → check the search-index
  asset still 200s → confirm the new page's content is actually present in the served HTML.
  Confidence: 0.5
- When the change is a *computed style*, the HTTP status codes are not enough — a route can
  return 200 with the styling silently absent. Confirm via headless Chrome on the live
  domain that `getComputedStyle` reports the actual `background-image` and
  `background-clip: text`, and capture a clipped screenshot of the element to read back.
  Confirming the new hashed CSS asset is served is necessary but not sufficient. Confidence: 0.5
rm via headless Chrome on the live
  domain that `getComputedStyle` reports the actual `background-image` and
  `background-clip: text`, and capture a clipped screenshot of the element to read back.
  Confirming the new hashed CSS asset is served is necessary but not sufficient. Confidence: 0.5
