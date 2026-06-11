# Design QA

final result: passed

## Scope

- Reference direction: Henri Heymans, Thibaut Foussard, and Blobmixer.
- Implementation target: VitePress homepage, content feeds, publish entry, identity widget, and base-aware static data loading.

## Checks

- Desktop homepage renders with a dark editorial hero, oversized title treatment, visible organic blob motion layer, strong section separation, latest-content controls, and contributor cards.
- News, tools, and discussions pages render the correct feed type labels: `发布新闻`, `发布工具`, and `发布讨论`.
- The discussions page now uses `ContentFeed type="discussions"` instead of the broken `disc` alias.
- Static data fetches use VitePress `withBase()` for homepage, contributors, forum links/list, submissions, hotlist, and magazine data.
- The publish page exists at `/create.html` and exposes the shared `PostComposer`.
- Main CSS is consolidated in `.vitepress/theme/custom.css`; the old duplicated `public/override.css` stylesheet is no longer referenced.
- `npm run build` passes.

## Notes

- The only observed browser console error during local inspection was the browser's default request for `/favicon.ico`; the configured SVG favicon still loads through VitePress head metadata.
- Mobile behavior is covered by explicit breakpoints for the hero, stats, feature grid, filters, feed rows, contributor cards, and identity widget. The currently exposed browser MCP did not provide a direct viewport resize control in this session.
