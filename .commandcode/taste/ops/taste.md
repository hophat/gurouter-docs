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
  chose the reversible option in both cases. Confidence: 0.65
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
- Repo hygiene covers the *agent's own* commits, not just the pre-existing mess: anything
  the agent created while working is expected to be cleaned up before handing back, and
  named explicitly when it isn't. Confidence: 0.55

## What "clean" covers

- A request to clean up means the whole sweep, not just the repo: prune the old timestamped
  backups left on the VPS, delete scratch dirs (`.shots/`, `.cache/`, helper HTML injected into
  `dist/`), remove the `/tmp` headless-Chrome user-data profiles and the throwaway CDP scripts
  written alongside them, kill dev/preview servers, and confirm `git status` clean plus no
  stray background shell tasks left running. Confidence: 0.55
- Backup retention is a judgement call worth reporting, not deciding silently: after shipping to
  production, keep the single newest backup as a rollback path instead of clearing the directory
  ("clean" read literally), and hand the user the exact `ssh … rm -rf` line to run once they are
  satisfied the site is stable. Losing the way back immediately after a production deploy is
  not the agent's call. Confidence: 0.5

## Post-deploy verification

- A deploy is not done when `rsync` returns. Expected: build → backup → sync → curl every
  route's `%{http_code}` (the full set, not just the changed page) → check the search-index
  asset still 200s → confirm the new page's content is actually present in the served HTML.
  Confidence: 0.5
