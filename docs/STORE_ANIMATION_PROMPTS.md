# Store animation clean-plate generation

Tool: built-in image_gen.imagegen, edit mode. Existing master artwork was the edit target in each theme. Only tiny moving-part masks from these outputs are composited over the original masters. The full generated clean plate is never used as a redesigned background.

Saved source outputs:
- artwork/store-animation/day-clean-plate.png
- artwork/store-animation/night-clean-plate.png

Final project assets: public/wallpapers/animation/ (two masked base WebPs, twelve original-pixel fish PNGs, two original fan-hub PNGs, two aquarium foreground PNGs).

Rebuild assets:
```sh
node scripts/prepare-store-animation.cjs artwork/store-animation/day-clean-plate.png artwork/store-animation/night-clean-plate.png
```

Coordinates and fish bounding boxes are shared in lib/store-scene.json. Fish silhouettes are isolated using a day-derived warm-color mask with enclosed-hole filling, then applied to both themes. Repair masks are dilated by three pixels to remove stationary antialiased outlines. Transparent pixels are cleared to reduce PNG size. Original plant/rock masks occlude the swimming sprites. The fan rotor/grille and clock hands are reconstructed as lightweight SVG geometry; original rim, stand, base, hub and clock frame/numerals remain stationary.

The first prompt referred to four fish; closer inspection identified six. The generated clean plate removed all six, and all six are extracted and animated in the final implementation.

## Daytime prompt

Use case: precise-object-edit. Edit target: supplied existing finished 1672x941 daytime pixel-art store wallpaper. This is an ANIMATION CLEAN PLATE, not a redesign. Preserve the same exact canvas dimensions, camera, all artwork, colors, signage, architecture and fixed objects. ONLY remove moving foreground parts in these precisely located tiny areas and reconstruct the occluded background seamlessly: (1) Inside shelf electric fan circle centered (870,174), radius60, remove the dark fan blades AND thin radial wire grille AND center hub, replacing the interior with softly lit pale wall/backplate consistent with the existing fan; KEEP the outer circular metal rim, stand and red base exactly. (2) Remove all FOUR orange aquarium fish only: main-left fish within x1255..1344 y520..572, main-right fish x1384..1472 y486..537, tiny fish x1190..1235 y593..614, tiny fish x1340..1371 y593..613. Reconstruct ONLY the water, retaining identical aquarium boundaries, plants, bubbles, stones, blue vertical tubing/reflections behind the fish. (3) Clock face centered (1210,153): remove ONLY its hour/minute hands and tiny central hub, restore seamless offwhite face underneath. KEEP all Roman numerals, dots, octagonal frame, pendulum and the face's existing lighting. Do not add new hands, fish or fan blades. All objects outside these removal regions must stay exactly unchanged. Pixel-art medium and native 1672x941 dimensions must stay unchanged. No new objects, text, perspective, rescaling, crop or color changes.

## Nighttime prompt

Use case: precise-object-edit. Edit target: supplied existing finished 1672x941 NIGHTTIME pixel-art store wallpaper. Create an ANIMATION CLEAN PLATE, not a redesigned wallpaper. Keep the original exact canvas size, framing, all fixed objects, signage and warm lamp/blue aquarium/night lighting. ONLY erase these moving parts and reconstruct the occluded background: (1) Inside shelf fan circle centered (871,173), radius58, erase blades, radial wire grille and center hub, leaving a plain softly night-lit backplate/wall visible through the empty circular fan; retain outer metal rim, stand and red base unchanged. (2) Erase ALL SIX orange fish in aquarium, including both large goldfish and FOUR tiny fish: main-left around (1295,546), main-right around (1425,515), tiny around (1208,603), (1293,604), (1365,574), (1390,600). Restore seamless water with the original tubes, plants, bubbles, stones, water lighting and boundaries maintained. (3) Clock centered (1210,153): erase just its hands and tiny center hub, seamlessly restore the warm ivory face, retain every Roman numeral, dot, frame edge and pendulum unchanged. No fish, clock hands, fan blades or grille should remain in the edited areas. Do not move, redraw, resize or remove ANY other object. No added objects, lettering, changes to color or lighting, no camera change/crop. Keep the supplied pixel artwork and 1672x941 resolution. This output will only supply tiny precisely masked repair patches over the unmodified source.

