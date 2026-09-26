# GuRouter Docs

Documentation site for [GuRouter](https://gurouter.com), the AI API gateway. Built with
[Astro](https://astro.build) and [Starlight](https://starlight.astro.build), published at
**https://docs.gurouter.com**.

## Commands

Run from the project root:

| Command            | Action                                              |
| :----------------- | :-------------------------------------------------- |
| `bun install`      | Install dependencies                                |
| `bun run dev`      | Start the dev server at `localhost:4321`            |
| `bun run build`    | Build the static site to `./dist/`                  |
| `bun run preview`  | Serve `./dist/` locally to check a real build       |
| `bun run astro`    | Run the Astro CLI (e.g. `astro check`, `astro add`) |

## Content

Docs live in `src/content/docs/`. The sidebar is defined in `astro.config.mjs`, not by
file order.

```
src/content/docs/
├── index.mdx                        landing page (splash template)
├── getting-started/
│   ├── agents.mdx                    base URL, auth, chat completions
│   └── cli-setup.mdx                 Claude Code, Codex, Gemini via CC Switch
├── api/
│   ├── openai-compat.md              OpenAI-compatible routes
│   └── systemone.mdx                 POST /v1/systemone
└── harness/index.mdx                 not shipped yet
```

`.md` for prose, `.mdx` when a page needs a component. Pages using MDX must declare their
imports in the frontmatter fence.

## Adding a page

1. Create the file in `src/content/docs/`.
2. Add a `title` and `description` in frontmatter — the description is what Pagefind
   indexes and what search results show.
3. Add the route to the `sidebar` array in `astro.config.mjs`.
4. If the page documents endpoints, add them to the `ROUTES` map in
   `src/components/PageSidebar.astro` so the route contract shows in the right rail.

`lastUpdated` is on, so a page needs meaningful `git` history for the timestamp to be
useful.

## Design

`src/styles/custom.css` holds the whole token layer: colour, type, spacing, radius, motion,
elevation. It is the only file to edit for a visual change.

Some notes on the constraints the system encodes:

- **The accent hue is sampled from the logo, not chosen.** The GuRouter mark is a full
  spectrum arc, so there is no single brand colour. The gateway routes a request to
  whichever upstream can serve it, so the accent is filled by *route* rather than a fixed
  colour. Light and dark use different accent values because a saturated red-orange loses
  its signal on a near-black field.
- **Contrast is checked, not assumed.** Text and button fills clear WCAG AA 4.5:1 in both
  themes; the focus ring only needs 3:1, so it uses a brighter value.
- **Starlight's component CSS ships after `custom.css`.** A rule in `custom.css` that needs
  to beat a Starlight component (e.g. the right-hand TOC anchors) has to live in that
  component instead, scoped with `:global`.
- **Wide reference tables scroll inside their own edge** on narrow viewports. The fade
  edge is driven by `data-scroll`, set by `src/scripts/table-scroll.ts` only when a table
  genuinely overflows, so a short table never looks truncated.

## Deploy

Static output in `dist/`. See [`deploy/DEPLOY-STEPS.md`](deploy/DEPLOY-STEPS.md) for the
rsync/nginx procedure, TLS notes, verification commands, and rollback.

Origin is HTTP-only: Cloudflare terminates TLS at the edge. The vhost deliberately has no
`http -> https` redirect, because behind Cloudflare that would loop.
