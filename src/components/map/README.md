# src/components/map (owned by Atlas)

Placeholder for the new interactive lot map (MapLibre GL + licensed vector tiles).
Nothing here is imported yet. The live map is still the three.js massing model in
`src/components/site/site-model.tsx`, embedded from:

- `src/site/sections/home.tsx` (`HomeSiteModel`, about line 278/307)
- `src/site/sections/community.tsx` (line 61, `hintKey="community.model.hint"`)
- `src/site/blocks.tsx` (line ~425, editor library block)
- registry: `src/site/registry.tsx` (`HomeSiteModel: "Interactive site map"`)

See /workspace/belmore/map-handoff.md for the full brief, sources, rules and status.
