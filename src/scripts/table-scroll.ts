/*
 * A wide table is only marked as scrollable when it genuinely overflows, so the fade
 * applied in `custom.css` is a truthful signal rather than permanent decoration.
 *
 * CSS alone cannot tell "this table is wider than its box" from "this table is exactly
 * as wide as its box", so the state is measured here and written back as `data-scroll`.
 */
function markScrollableTables() {
	for (const table of document.querySelectorAll<HTMLElement>('.sl-markdown-content table')) {
		const overflowing = table.scrollWidth > table.clientWidth + 1;
		if (!overflowing) {
			table.removeAttribute('data-scroll');
			continue;
		}
		const atStart = table.scrollLeft <= 1;
		const atEnd = table.scrollLeft >= table.scrollWidth - table.clientWidth - 1;
		table.dataset.scroll = atStart ? 'end' : atEnd ? 'start' : 'both';
	}
}

/** Attach listeners once per page. `astro:page-load` does not fire for the first
 *  render, so the initial call has to happen directly as well. */
function init() {
	markScrollableTables();
	// A scroll changes which edge is still hidden. Capture catches the table's own
	// scroll, not just the page's.
	document.addEventListener('scroll', markScrollableTables, { passive: true, capture: true });
	// A table starts overflowing when the viewport, the sidebar, or a font swap
	// changes the available width.
	if (typeof ResizeObserver !== 'undefined') {
		new ResizeObserver(markScrollableTables).observe(document.body);
	}
}

init();
document.addEventListener('astro:page-load', init);

