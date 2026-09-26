## Editing docs content

This site is the GuRouter docs. Content lives in `src/content/docs/`.

**Use the `gurouter-docs` MCP server.** It is registered in `.mcp.json` at project
scope, so it is available in any session opened in this repo. Prefer its tools over
reading and writing the files by hand:

| Tool                 | Use it for                                                  |
| :------------------- | :---------------------------------------------------------- |
| `site_conventions`   | House rules, components, and the MDX gotchas. Read first.   |
| `list_pages`         | What exists, with a warning if a page is not in the sidebar |
| `get_page`           | Read one page and see its problems                          |
| `create_page`        | New page, registered in the sidebar as part of the write   |
| `update_page`        | Change title, description, or body                         |
| `delete_page`        | Remove a page and its sidebar entry                        |
| `check_page`         | Fast checks: frontmatter, internal links, MDX imports      |
| `build`              | The real Astro build. Run this before declaring done       |
| `refresh_models`     | Pull the live price catalog before writing about pricing   |

The `build` tool is the only thing that proves MDX compiles and the sidebar resolves.
A page can be written, linked and listed and still fail the build, so run it rather than
assuming the edit is safe.

This server never deploys. Leave changes in the working tree; committing, pushing and
rsyncing to the VPS stay with the operator.

To verify the server itself:

```bash
bun scripts/test-docs-mcp.ts
```

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
