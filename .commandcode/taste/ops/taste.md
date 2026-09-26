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
- When a plan hits a genuine blocker mid-flight (no git repo, the configured remote returns
  "Repository not found"), surface it rather than improvising a workaround. No pushback on
  being stopped. Confidence: 0.6

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
ed
  afterwards — no stray processes left behind. Confidence: 0.5
