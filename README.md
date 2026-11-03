# Magic Eye Studio — optical edition

Extract the contents of this ZIP into `public_html/apps/magic-eye/`, replacing the app files while retaining the css, js and images folders. Route remains `/apps/magic-eye/`. Refresh with Ctrl+F5 after uploading. No other app files need changing.

Local preview: `python3 -m http.server 8080` in this folder, then open http://localhost:8080/ . JavaScript module workers require HTTP(S); double-clicking index.html is not supported.

## Included
- Responsive three-column editorial layout, shared compass masthead, wood-effect CSS frame, original engraved optical illustration, plain cream background.
- 16 bundled depth maps: sphere, torus, heart, rings, spiral, mountain, star, wave, 69420, smiley, troll grin, rage face, sunglasses face, keyboard cat, pixel alien, JENGA.
- Drag a gallery thumbnail onto the main image to generate immediately, or click it. The dropdown also loads immediately; palette and dot-size changes regenerate automatically. Select Depth map to see the hidden subject. Sample dropdown is also retained.
- Existing local upload, drag-and-drop, grayscale/layers/silhouette conversion, contrast, midtones, smoothing, inversion, tonal expansion, five palettes, dot size, depth strength, pattern spacing, subject scaling, four output resolutions, aspect ratios, guide dots, native pixels, full screen, cancellation, new pattern and both PNG downloads retained.
- Rendering runs in a module worker. Nothing is uploaded. No build or dependencies required for the app.

## Viewing
Use parallel viewing: look through the pattern as though it were a window. Try merging the two dots into three; relax your focus. Depth visibility depends on display scale, viewing distance and binocular vision. Select Actual pixels if scaling makes fusion difficult. Adjust pattern spacing and depth strength as needed. Never claim a generated image will be viewable by everyone.

Black means far, white means near. Samples with solid faces/lettering are intentionally crisp reliefs. Grayscale photography is interpreted as brightness-based relief, not true reconstructed scene depth.

Changed settings apply when Generate is selected. Downloads always refer to the last completed render; the interface states this when settings are pending.

## Validation
`npm test` (or `node --test tests/*.test.js`): seven tests cover luminance, alpha, inversion, normalisation, smoothing, stereo disparity, constraint consistency and repeatable seeded output. Browser checks: initial generation, 69420/troll sample generation, preview tabs, both PNG download events; phone and tablet document widths match their viewports without horizontal overflow. PNG exports are actual canvas renders, not illustration mockups.

See ASSET-ATTRIBUTIONS.md for custom image provenance and the regeneration script.

Drag edition validation: browser drag of Heart onto viewer completed a new render; colour palette changes also triggered generation. Native HTML drag plus pointer fallback is included.

Cache fix edition 4: index.html now loads uniquely named studio-v4.js, depth-library-v4.js, renderer-v4.js and style-v4.css. This avoids a cached legacy samples.js that rendered JENGA for unknown sample IDs. Upload the complete ZIP including index.html and all new filenames.
