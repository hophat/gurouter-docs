/**
 * Regenerates `src/data/models.json` from the live GuRouter pricing API.
 *
 *     bun run sync:models
 *
 * The catalog changes often, so the docs read a committed snapshot rather than hitting
 * the API at build time: a docs build should never depend on a third-party endpoint
 * being up, and a price that silently changed between review and publish would be
 * worse than one that is visibly stale.
 *
 * Pricing model, verified against the rendered `/pricing` page:
 *
 *   base input   $/M = 2 x model_ratio
 *   base output  $/M = base input x completion_ratio
 *   base cache   $/M = base input x cache_ratio
 *   charged      $/M = base x group_ratio   (per subscription group)
 *
 * `group_ratio` is why a single "price" is not enough to describe a model: the same
 * model costs different amounts depending on the reader's plan.
 */

const API = 'https://gurouter.com/api/pricing';
const OUT = new URL('../src/data/models.json', import.meta.url);

interface RawModel {
	model_name: string;
	description?: string;
	vendor_id?: number;
	coding_score?: number | null;
	auto_speed?: number | null;
	quota_type?: number;
	model_ratio: number;
	completion_ratio: number | null;
	cache_ratio: number | null;
	enable_groups?: string[];
	supported_endpoint_types?: string[];
}

interface RawVendor {
	id: number;
	name: string;
}

interface RawPayload {
	data: RawModel[];
	vendors: RawVendor[];
	group_ratio: Record<string, number>;
	supported_endpoint: Record<string, { path: string; method: string }>;
}

interface Catalog {
	/** ISO timestamp of the snapshot. */
	fetchedAt: string;
	/** Display label for each group, keyed by group id. */
	groups: Record<string, string>;
	/** Effective multiplier applied to base price, keyed by group id. */
	groupRatio: Record<string, number>;
	/** Endpoint path/method per endpoint type id. */
	endpoints: Record<string, { path: string; method: string }>;
	vendors: Record<string, string>;
	models: CatalogModel[];
}

interface CatalogModel {
	/** Exact string to send as `model` in a request. */
	id: string;
	vendor: string;
	description: string;
	endpoints: string[];
	groups: string[];
	/** Base price per 1M tokens, before any group discount. Null where the vendor
	 *  publishes no rate for that token class — distinct from a rate of zero. */
	base: { input: number; output: number | null; cacheRead: number | null };
	/** Published quality/speed metrics, or null when the vendor has not published them. */
	score: number | null;
	speed: number | null;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

async function main() {
	const res = await fetch(API, { headers: { accept: 'application/json' } });
	if (!res.ok) throw new Error(`${API} responded ${res.status}`);
	const raw = (await res.json()) as RawPayload;

	if (!Array.isArray(raw.data) || raw.data.length === 0) {
		throw new Error('Pricing API returned no models; refusing to overwrite the snapshot.');
	}

	const vendors: Record<string, string> = {};
	for (const v of raw.vendors) vendors[String(v.id)] = v.name;

	const groups: Record<string, string> = {
		default: 'Default',
		pro: 'Pro',
		subscriber: 'Subscriber',
		vibecode: 'Vibecode',
		vip: 'VIP',
	};

	const models: CatalogModel[] = raw.data
		.map((m) => {
			const input = round(2 * m.model_ratio);
			return {
				id: m.model_name,
				vendor: vendors[String(m.vendor_id)] ?? 'Other',
				description: m.description ?? '',
				endpoints: m.supported_endpoint_types ?? [],
				groups: m.enable_groups ?? [],
				// A null ratio means the vendor publishes no rate for that class.
				// Coercing it to 0 would advertise the model as free, which is a
				// materially different claim.
				base: {
					input,
					output: m.completion_ratio === null ? null : round(input * m.completion_ratio),
					cacheRead: m.cache_ratio === null ? null : round(input * m.cache_ratio),
				},
				score: m.coding_score ?? null,
				speed: m.auto_speed ?? null,
			};
		})
		.sort((a, b) => a.id.localeCompare(b.id));

	const catalog: Catalog = {
		fetchedAt: new Date().toISOString(),
		groups,
		groupRatio: raw.group_ratio,
		endpoints: raw.supported_endpoint,
		vendors,
		models,
	};

	const file = new URL(OUT.pathname, `file://${process.cwd()}/`);
	await Bun.write(file, `${JSON.stringify(catalog, null, '\t')}\n`);

	const priced = models.length;
	const dual = models.filter((m) => m.endpoints.length > 1).length;
	console.log(`Wrote ${priced} models to src/data/models.json`);
	console.log(`  vendors: ${new Set(models.map((m) => m.vendor)).size}`);
	console.log(`  multi-endpoint: ${dual}`);
}

await main();
