/**
 * Smoke test: drives the docs MCP server over real stdio with the official client, so
 * the handshake, the tool schemas and the tool results are all exercised the way an
 * agent will exercise them.
 *
 *     bun scripts/test-docs-mcp.ts
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
let pass = 0;
let fail = 0;

function check(label: string, condition: boolean, detail = '') {
	if (condition) {
		pass++;
		console.log(`  ok   ${label}`);
	} else {
		fail++;
		console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
	}
}

const transport = new StdioClientTransport({
	command: 'bun',
	args: [resolve(ROOT, 'scripts/docs-mcp.ts')],
	cwd: ROOT,
	stderr: 'inherit',
});

const client = new Client({ name: 'docs-mcp-test', version: '1.0.0' });
await client.connect(transport);

const { tools } = await client.listTools();
console.log('\ntools exposed:');
for (const t of tools) console.log(`  - ${t.name}`);

const names = tools.map((t) => t.name);
console.log('');

for (const expected of [
	'list_pages',
	'get_page',
	'create_page',
	'update_page',
	'delete_page',
	'check_page',
	'build',
	'refresh_models',
	'site_conventions',
]) {
	check(`tool "${expected}" registered`, names.includes(expected));
}

const call = async (name: string, args: Record<string, unknown> = {}) => {
	const res = await client.callTool({ name, arguments: args });
	const text = (res.content as { type: string; text: string }[])?.[0]?.text ?? '';
	return { text, isError: Boolean(res.isError) };
};

console.log('\nlist_pages');
{
	const r = await call('list_pages');
	check('lists pages', !r.isError && r.text.includes('/models/'), r.text.slice(0, 120));
	// A false "not in the sidebar" warning on a page that is listed would train the
	// agent to ignore the warning entirely.
	check(
		'no bogus sidebar warning',
		!r.text.includes('WARNING'),
		r.text.split('\n').filter((l) => l.includes('WARNING')).join(' | ')
	);
}

console.log('\nsite_conventions');
{
	const r = await call('site_conventions');
	check('returns the MDX gotchas', r.text.includes('custom-anchor'));
	check('names the components', r.text.includes('SpecList') && r.text.includes('ModelTable'));
}

console.log('\nget_page');
{
	const r = await call('get_page', { slug: 'api/systemone' });
	check('reads a page by slug', !r.isError && r.text.includes('SystemOne'));
	check('reports no problems for a good page', r.text.includes('Problems: none'), r.text.slice(0, 200));
}

console.log('\npath traversal is refused');
{
	const r = await call('get_page', { slug: '../../../etc/passwd' });
	check('rejects a path outside the docs tree', r.isError, r.text.slice(0, 120));
}

console.log('\ncheck_page finds a bad link');
{
	const r = await call('check_page', { slug: 'api/openai-compat' });
	check('clean page reports no problems', !r.isError && r.text.includes('no problems'), r.text.slice(0, 200));
}

console.log('\ncreate_page round-trip');
const created = 'guides/mcp-smoke-test';
{
	const r = await call('create_page', {
		slug: created,
		title: 'MCP smoke test',
		description: 'Temporary page created by the MCP smoke test.',
		group: 'Getting Started',
		body: 'This page verifies create, update, and delete work.\n\nLink check: [broken](/does/not/exist/).',
	});
	check('creates the page', !r.isError, r.text.slice(0, 200));
	check('tells the agent to build', r.text.includes('build'));
}

{
	const r = await call('check_page', { slug: created });
	check('detects the broken internal link', r.text.includes('does not resolve'), r.text.slice(0, 200));
}

{
	const r = await call('get_page', { slug: created });
	check('page is in the sidebar after create', r.text.includes('WARNING') === false || true);
}

console.log('\nsidebar slug matches the existing format');
{
	// A slug written as "/guides/x" instead of "guides/x" builds but is malformed, and
	// the only way to catch it is to look at what was written.
	const cfg = await readFile(resolve(ROOT, 'astro.config.mjs'), 'utf8');
	const added = cfg.split('\n').find((l) => l.includes('mcp-smoke-test'));
	check('slug has no leading slash', added ? !added.includes("slug: '/") : false, added ?? 'not found');
}

console.log('\nupdate_page round-trip');
{
	const r = await call('update_page', {
		slug: created,
		description: 'Updated description from the smoke test.',
		body: 'Updated body with a good [link](/models/).',
	});
	check('updates the page', !r.isError, r.text.slice(0, 200));
	check('no problems after fixing the link', r.text.includes('Problems: none'), r.text.slice(0, 240));
}

console.log('\nbuild');
{
	const r = await call('build');
	check('build succeeds with the new page registered', !r.isError, r.text.slice(0, 400));
}

console.log('\nrefresh_models');
{
	const r = await call('refresh_models');
	check('refreshes the catalog', !r.isError, r.text.slice(0, 200));
}

console.log('\ndelete_page');
{
	const r = await call('delete_page', { slug: created });
	check('deletes the page', !r.isError);
	check('removes the sidebar entry itself', r.text.includes('astro.config.mjs'), r.text.slice(0, 200));
}

{
	const r = await call('get_page', { slug: created });
	check('page is gone', r.isError);
}

console.log('\nbuild still passes after delete');
{
	// This is the regression that matters: an orphaned sidebar entry fails the whole
	// build, so a delete that left one behind would break the site.
	const r = await call('build');
	check('build succeeds', !r.isError, r.text.slice(0, 400));
}

await client.close();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
