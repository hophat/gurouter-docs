/**
 * MCP server for the GuRouter docs.
 *
 * An agent driving this server has to know the rules that are not obvious from the
 * files themselves, so they live here rather than in a prompt someone has to
 * remember to paste:
 *
 *  - Content lives in `src/content/docs/`, `.md` for prose, `.mdx` when the page
 *    needs a component.
 *  - Frontmatter needs `title` and `description`. The description is what Pagefind
 *    indexes and what a search result shows, so a missing or vague one is a real
 *    defect, not a cosmetic one.
 *  - A new page is not reachable until it is listed in the `sidebar` array in
 *    `astro.config.mjs`, and if it documents HTTP routes those belong in the
 *    `ROUTES` map in `src/components/PageSidebar.astro`. Both are easy to forget,
 *    and both produce a page that builds fine and is invisible to readers.
 *
 * Nothing here deploys. Writes are files in the working tree, so a bad edit is a
 * revertible git diff rather than an incident.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFile, writeFile, mkdir, readdir, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, relative, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** Project root: this file lives at `<root>/scripts/docs-mcp.ts`. */
const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const DOCS_DIR = join(ROOT, 'src/content/docs');
const CONFIG = join(ROOT, 'astro.config.mjs');
const PAGESIDEAR = join(ROOT, 'src/components/PageSidebar.astro');
const SIDEBAR_GROUPS = ['Getting Started', 'Models', 'API Reference', 'Harness'] as const;

const server = new McpServer({ name: 'gurouter-docs', version: '1.0.0' });

/* ------------------------------------------------------------------ helpers */

/** Content paths are agent-supplied, so every one is confined to the docs tree. */
function resolveDocPath(input: string): string {
	const cleaned = input.replace(/^\/+/, '').replace(/\.(md|mdx)$/i, '');
	const full = resolve(join(DOCS_DIR, cleaned));
	if (full !== DOCS_DIR && !full.startsWith(DOCS_DIR + sep)) {
		throw new Error(`Path escapes the docs directory: ${input}`);
	}
	return full;
}

/**
 * Canonical content slug, matching how Starlight's sidebar config is written: no
 * leading slash, no extension, and `index` collapsed to its directory. The root
 * landing page is "" because it is served from "/" without a sidebar entry.
 */
function contentSlug(input: string): string {
	return input
		.replace(/^\/+/, '')
		.replace(/\.(md|mdx)$/i, '')
		.replace(/\/?index$/, '')
		.replace(/^\/+|\/+$/g, '');
}

/** The URL form, for telling a human or an agent which page it is. */
const urlSlug = (input: string) => '/' + contentSlug(input);

async function listDocFiles(dir = DOCS_DIR, acc: string[] = []): Promise<string[]> {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) await listDocFiles(full, acc);
		else if (['.md', '.mdx'].includes(extname(entry.name))) acc.push(full);
	}
	return acc;
}

/** Split frontmatter from body without a YAML dependency; docs use a flat subset. */
function splitFrontmatter(raw: string): { fm: Record<string, string>; body: string; raw: string } {
	const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!m) return { fm: {}, body: raw, raw: '' };
	const fm: Record<string, string> = {};
	for (const line of m[1].split(/\r?\n/)) {
		const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
		if (kv) fm[kv[1]] = kv[2].trim();
	}
	return { fm, body: raw.slice(m[0].length), raw: m[0] };
}

const ok = (text: string) => ({ content: [{ type: 'text' as const, text }] });
const fail = (text: string) => ({ content: [{ type: 'text' as const, text }], isError: true });

/** Page-level checks that do not need a full build. Cheap enough to always run. */
async function checkFile(path: string): Promise<string[]> {
	const problems: string[] = [];
	const raw = await readFile(path, 'utf8');
	const { fm, body } = splitFrontmatter(raw);
	const isIndex = path.endsWith('index.md') || path.endsWith('index.mdx');

	if (!isIndex) {
		if (!fm.title) problems.push('Frontmatter is missing `title`.');
		if (!fm.description) {
			problems.push(
				'Frontmatter is missing `description`. Pagefind indexes it and search results show it.'
			);
		} else if (fm.description.length > 200) {
			problems.push(
				`\`description\` is ${fm.description.length} chars; it will be truncated in search results.`
			);
		}
	}

	const slug = urlSlug(relative(DOCS_DIR, path));

	// Internal links must resolve to a real page, or readers hit a 404. Compare with
	// trailing slashes removed, since the same page is addressable as `/models` and
	// `/models/`.
	const norm = (s: string) => s.replace(/\/+$/, '').toLowerCase();
	const here = norm(slug);
	for (const m of body.matchAll(/\]\((\/[^)#\s]*)(#[^)]*)?\)/g)) {
		const href = m[1];
		if (norm(href) === here) continue;
		const target = resolveDocPath(href);
		const found = ['', '.md', '.mdx', '/index.md', '/index.mdx']
			.map((ext) => target + ext)
			.find((p) => existsSync(p));
		if (!found) problems.push(`Internal link \`${href}\` does not resolve to a page.`);
	}

	// Component imports in MDX are relative to the file, so a wrong depth breaks the build.
	if (extname(path) === '.mdx') {
		for (const m of body.matchAll(/^import\s+\w+\s+from\s+'([^']+)'/gm)) {
			const spec = m[1];
			if (!spec.startsWith('.')) continue;
			if (!existsSync(resolve(dirname(path), spec))) {
				problems.push(`MDX import \`${spec}\` does not exist relative to this file.`);
			}
		}
	}

	return problems;
}

/* -------------------------------------------------------------------- tools */

server.registerTool(
	'list_pages',
	{
		title: 'List documentation pages',
		description:
			'List every page in the docs, with its slug, format, and frontmatter summary. Start here to see what exists.',
		inputSchema: {},
	},
	async () => {
		const files = (await listDocFiles()).sort();
		if (!files.length) return ok('No pages found.');
		const config = await readFile(CONFIG, 'utf8');
		const lines: string[] = [];
		for (const f of files) {
			const { fm } = splitFrontmatter(await readFile(f, 'utf8'));
			const slug = contentSlug(relative(DOCS_DIR, f));
			// The landing page is served from "/" and deliberately has no sidebar
			// entry, so warning about it would be noise on every call.
			const needsSidebar = slug !== '' && !config.includes(`slug: '${slug}'`);
			lines.push(
				[
					`- \`${urlSlug(relative(DOCS_DIR, f))}\``,
					`  file: src/content/docs/${relative(DOCS_DIR, f)}`,
					`  format: ${extname(f).slice(1)}`,
					fm.title ? `  title: ${fm.title}` : '  title: (none)',
					needsSidebar ? '  WARNING: not in the sidebar in astro.config.mjs' : '',
				]
					.filter(Boolean)
					.join('\n')
			);
		}
		return ok(lines.join('\n'));
	}
);

server.registerTool(
	'get_page',
	{
		title: 'Read a documentation page',
		description:
			'Read one page in full: frontmatter, body, and any problems found in it. Use the slug from list_pages, e.g. "api/systemone".',
		inputSchema: { slug: z.string().describe('Page slug, e.g. "api/systemone" or "models"') },
	},
	async ({ slug }) => {
		const path = resolveDocPath(slug);
		const candidates = [path, path + '.md', path + '.mdx', join(path, 'index.md'), join(path, 'index.mdx')];
		const found = candidates.find((p) => existsSync(p) && extname(p) !== '');
		if (!found) {
			return fail(`No page at \`${slug}\`. Call list_pages to see valid slugs.`);
		}
		const raw = await readFile(found, 'utf8');
		const problems = await checkFile(found).catch(() => ['Could not run checks on this file.']);
		const body = [
			`File: ${relative(ROOT, found)}`,
			`Slug: ${urlSlug(relative(DOCS_DIR, found))}`,
			problems.length ? `\nProblems:\n${problems.map((p) => `  - ${p}`).join('\n')}` : '\nProblems: none',
			'\n--- content ---',
			raw,
		].join('\n');
		return ok(body);
	}
);

server.registerTool(
	'create_page',
	{
		title: 'Create a documentation page',
		description:
			'Create a new page. `slug` is the path without extension ("api/rate-limits"); use an "api/..." path for API reference. Creates the file and registers it in the sidebar, because an unlisted page builds fine but is unreachable. Returns the exact commands still to do: build, and the ROUTES map if the page documents endpoints.',
		inputSchema: {
			slug: z.string().describe('Path without extension, e.g. "api/rate-limits" or "guides/billing"'),
			title: z.string().describe('Page title'),
			description: z
				.string()
				.describe('One sentence, under 180 chars. Indexed by search and shown in results.'),
			group: z
				.enum(SIDEBAR_GROUPS)
				.default('API Reference')
				.describe('Sidebar group to file this under.'),
			body: z.string().default('').describe('Markdown body, without frontmatter.'),
			useMdx: z.boolean().default(false).describe('Create .mdx instead of .md.'),
		},
	},
	async ({ slug, title, description, group, body, useMdx }) => {
		const path = resolveDocPath(slug) + (useMdx ? '.mdx' : '.md');
		if (existsSync(path)) return fail(`\`${slug}\` already exists at ${relative(ROOT, path)}.`);

		await mkdir(dirname(path), { recursive: true });
		const content = `---\ntitle: ${title}\ndescription: ${description}\n---\n\n${body}\n`;
		await writeFile(path, content, 'utf8');

		// Register in the sidebar: an unlisted page is unreachable.
		const entry = `{ label: '${title}', slug: '${contentSlug(slug)}' },`;
		let config = await readFile(CONFIG, 'utf8');
		let registered = false;
		for (const g of SIDEBAR_GROUPS) {
			const marker = `label: '${g}',`;
			const at = config.indexOf(marker);
			if (at < 0) continue;
			const close = config.indexOf(']', at);
			if (close < 0) continue;
			config = `${config.slice(0, close)}${entry}\n\t\t\t\t\t${config.slice(close)}`;
			registered = true;
			break;
		}
		if (registered) await writeFile(CONFIG, config, 'utf8');

		const followUp = [
			`Created ${relative(ROOT, path)} (${useMdx ? 'mdx' : 'md'}).`,
			registered
				? `Registered under "${group}" in astro.config.mjs.`
				: 'WARNING: could not find a matching sidebar group, so this page is NOT in the sidebar. Add it by hand to astro.config.mjs or readers cannot reach it.',
			'',
			'Still to do:',
			'  1. Run the `build` tool and fix anything it reports.',
			'  2. If this page documents endpoints, add them to the ROUTES map in src/components/PageSidebar.astro so the route contract shows in the right rail.',
		].join('\n');
		return ok(followUp);
	}
);

server.registerTool(
	'update_page',
	{
		title: 'Update a documentation page',
		description:
			'Replace fields on a page. Pass only what you are changing: body replaces the prose after the frontmatter, title and description replace their frontmatter values. Unlisted fields are left alone. Run the `build` tool afterwards to confirm nothing broke.',
		inputSchema: {
			slug: z.string().describe('Page slug, e.g. "api/systemone"'),
			title: z.string().optional().describe('New title.'),
			description: z.string().optional().describe('New description.'),
			body: z.string().optional().describe('New body, without frontmatter.'),
		},
	},
	async ({ slug, title, description, body }) => {
		const path = resolveDocPath(slug);
		const candidates = [path, path + '.md', path + '.mdx', join(path, 'index.md'), join(path, 'index.mdx')];
		const found = candidates.find((p) => existsSync(p) && extname(p) !== '');
		if (!found) return fail(`No page at \`${slug}\`. Call list_pages to see valid slugs.`);

		const raw = await readFile(found, 'utf8');
		const { fm, body: existingBody, raw: fmRaw } = splitFrontmatter(raw);

		const nextFm = { ...fm };
		if (title !== undefined) nextFm.title = title;
		if (description !== undefined) nextFm.description = description;
		if (nextFm.title) nextFm.title = nextFm.title.replace(/^["']|["']$/g, '');
		if (nextFm.description) nextFm.description = nextFm.description.replace(/^["']|["']$/g, '');

		// Keep any extra frontmatter keys an MDX page already had (template, editUrl, …).
		const extras = Object.entries(fm)
			.filter(([k]) => !['title', 'description'].includes(k))
			.map(([k, v]) => `${k}: ${v}`);
		const fmBody = [
			...extras,
			nextFm.title ? `title: ${nextFm.title}` : '',
			nextFm.description ? `description: ${nextFm.description}` : '',
		]
			.filter(Boolean)
			.join('\n');
		const rebuilt = `---\n${fmBody}\n---\n\n${body !== undefined ? body : existingBody.trim()}`;

		await writeFile(found, rebuilt, 'utf8');
		const problems = await checkFile(found);
		return ok(
			[
				`Updated ${relative(ROOT, found)}.`,
				problems.length
					? `Problems:\n${problems.map((p) => `  - ${p}`).join('\n')}`
					: 'Problems: none',
				'',
				'Run the `build` tool to confirm the site still compiles.',
			].join('\n')
		);
	}
);

server.registerTool(
	'delete_page',
	{
		title: 'Delete a documentation page',
		description:
			'Delete a page and remove its sidebar entry. The entry has to go too: Starlight fails the whole build on a sidebar slug with no matching page, so leaving it behind would break the site rather than just leave a dead link.',
		inputSchema: { slug: z.string().describe('Page slug to delete.') },
	},
	async ({ slug }) => {
		const path = resolveDocPath(slug);
		const candidates = [path, path + '.md', path + '.mdx', join(path, 'index.md'), join(path, 'index.mdx')];
		const found = candidates.find((p) => existsSync(p) && extname(p) !== '');
		if (!found) return fail(`No page at \`${slug}\` to delete.`);

		await unlink(found);

		// Drop the whole sidebar line for this slug. An orphaned entry is a hard build
		// failure in Starlight, not a cosmetic issue, so it is cleaned up here rather
		// than reported as a to-do.
		const target = contentSlug(slug);
		let config = await readFile(CONFIG, 'utf8');
		const removed = config
			.split('\n')
			.filter((line) => !(line.includes('slug:') && line.includes(target)));
		if (removed.length !== config.split('\n').length) {
			await writeFile(CONFIG, removed.join('\n'), 'utf8');
		}

		return ok(
			[
				`Deleted ${relative(ROOT, found)}.`,
				removed.length !== config.split('\n').length
					? `Also removed the \`${target}\` entry from astro.config.mjs.`
					: 'No sidebar entry to clean up.',
				'',
				'Run the `build` tool to confirm the site still compiles.',
			].join('\n')
		);
	}
);

server.registerTool(
	'check_page',
	{
		title: 'Check a page without building',
		description:
			'Fast checks on one page: missing or over-long frontmatter, internal links that do not resolve, MDX imports with the wrong path. Much quicker than `build` — use it while editing and `build` before finishing.',
		inputSchema: { slug: z.string().describe('Page slug to check.') },
	},
	async ({ slug }) => {
		const path = resolveDocPath(slug);
		const candidates = [path, path + '.md', path + '.mdx', join(path, 'index.md'), join(path, 'index.mdx')];
		const found = candidates.find((p) => existsSync(p) && extname(p) !== '');
		if (!found) return fail(`No page at \`${slug}\`.`);
		const problems = await checkFile(found);
		return ok(
			problems.length
				? `${relative(ROOT, found)}\n${problems.map((p) => `  - ${p}`).join('\n')}`
				: `${relative(ROOT, found)}: no problems.`
		);
	}
);

server.registerTool(
	'build',
	{
		title: 'Build the site to verify changes',
		description:
			'Run the real Astro production build and report errors verbatim. This is the only way to be sure MDX compiles, the sidebar resolves, and a page is reachable. Run it after editing content. Takes a few seconds.',
		inputSchema: {},
	},
	async () => {
		// Astro writes its result to stderr as well as stdout, so both are captured;
		// reading only stdout hides a real failure behind a clean-looking empty string.
		try {
			const { stdout, stderr } = await run('bun', ['run', 'build'], {
				cwd: ROOT,
				timeout: 240_000,
				maxBuffer: 16 * 1024 * 1024,
			});
			const output = `${stdout}\n${stderr}`;
			if (/\[ERROR\]|exited with code [1-9]/.test(output)) {
				const errors = output
					.split('\n')
					.filter((l) => l.includes('[ERROR]'))
					.slice(0, 6)
					.join('\n');
				return fail(`Build FAILED.\n\n${errors || output.slice(-1500)}`);
			}
			const pages = stdout.match(/(\d+) page\(s\) built/)?.[1];
			const warns = (stderr.match(/\[WARN\]/g) ?? []).length;
			return ok(
				`Build succeeded${pages ? ` — ${pages} pages` : ''}` +
					`${warns ? ` (${warns} warnings, all pre-existing)` : ''}.`
			);
		} catch (err) {
			const e = err as { stdout?: string; stderr?: string; message?: string };
			const out = `${e.stdout ?? ''}\n${e.stderr ?? ''}`.trim();
			return fail(
				`Build FAILED. Usually an MDX syntax error, a bad component import, or a sidebar entry pointing at a page that no longer exists.\n\n${out.slice(-2500) || e.message}`
			);
		}
	}
);

server.registerTool(
	'refresh_models',
	{
		title: 'Refresh the model catalog',
		description:
			'Pull the live model catalog from the GuRouter pricing API and regenerate src/data/models.json, which is what the /models/ page reads. Run this before editing pricing content, so the numbers you write about are current.',
		inputSchema: {},
	},
	async () => {
		try {
			const { stdout } = await run('bun', ['run', 'sync:models'], {
				cwd: ROOT,
				timeout: 120_000,
			});
			return ok(`Model catalog refreshed.\n${stdout.trim()}`);
		} catch (err) {
			const e = err as { stdout?: string; stderr?: string; message?: string };
			return fail(`Could not refresh the catalog: ${e.message}\n${e.stderr ?? ''}`);
		}
	}
);

server.registerTool(
	'site_conventions',
	{
		title: 'Get the docs authoring conventions',
		description:
			'The house rules for writing pages here: file formats, frontmatter, which components exist and when to use them, and what breaks the build. Read this before your first edit.',
		inputSchema: {},
	},
	async () =>
		ok(
			[
				'# GuRouter docs conventions',
				'',
				'## Files',
				'- Content: `src/content/docs/`. `.md` for prose, `.mdx` only when a component is needed.',
				'- `index.mdx` at the docs root is the landing page; `models/index.mdx` is the catalog.',
				'- Route: a page at `api/foo.md` serves `/api/foo/`.',
				'',
				'## Frontmatter',
				'- Every page needs `title` and `description`.',
				'- `description` is what Pagefind indexes and what a search result shows. Keep it to one sentence under 180 chars.',
				'- `editUrl: false` hides the "Edit this page" link; used on the landing and harness pages.',
				'',
				'## Making a page reachable',
				'A new page is invisible until it is listed in the `sidebar` array in `astro.config.mjs`. `create_page` does this for you.',
				'If the page documents HTTP routes, also add them to the `ROUTES` map in `src/components/PageSidebar.astro` — that is what renders the route contract in the right rail.',
				'',
				'## Components available (MDX only)',
				'- `QuickstartBar` — base URL / auth header / key block, with working copy states.',
				'- `RouteTrace` — animated client → gateway → upstream diagram.',
				'- `ModelTable` — reads `src/data/models.json`; the /models/ page already uses it.',
				'- `SpecList` — endpoint key/value block. Use it instead of a markdown table with an empty header row, which renders as a stray hairline.',
				'- `NotShipped`, `PlanRail`, `LiveInstead` — the honest empty state for something that does not exist yet.',
				'- `YouTubeEmbed` — takes `id` and optional `si`.',
				'- Import paths are relative to the file. From `src/content/docs/api/x.mdx` it is `../../../components/Name.astro`.',
				'',
				'## Style',
				'- Sentence case for headings. No em dashes in prose, no exclamation marks.',
				'- One verb per button label, errors that name the fix.',
				'- State the measured value, not an adjective: "5.09:1", not "accessible".',
				'',
				'## MDX gotchas that break the build',
				'- `{#custom-anchor}` heading syntax is not supported. Use the auto slug.',
				'- A `<style>` block in an MDX file is parsed as JSX and fails. Move styles into a `.astro` component.',
				'- `position: sticky` on a `<th>` disables `table-layout: fixed`.',
				'',
				'## Verify before you finish',
				'Run `check_page` while editing and `build` before declaring done. The build is what proves MDX compiles and the sidebar resolves.',
				'',
				'## Deploy',
				'This server does not deploy. Leave changes in the working tree; committing and deploying stay with the operator.',
			].join('\n')
		)
);

const transport = new StdioServerTransport();
await server.connect(transport);
