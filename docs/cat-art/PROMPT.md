# Built-in image generation pose study

Edit target: the original nighttime cat crop, 252 × 83 pixels, from the existing wallpaper at x=28, y=682. Transparent output requested. Saved study: `meow-pose-reference.png`.

Exact prompt:

> Use case: precise-object-edit. Create an animation sprite sheet based on the EXACT existing pixel-art cat in this reference crop, for a website Easter egg. Output six aligned frames in a single horizontal row of equal rectangular cells. Transparent background, no furniture or wall, no text or labels. Preserve the cat's recognizable stocky curled sleeping body, long gray tail curled at left, patchy gray/tan/cream coat, big cream face at right, coral ear interiors, closed curved dark eyes and original right-facing orientation. All six bodies, positions, dimensions and fur patterns must be IDENTICAL, with NO scaling or body motion. Only very subtle ear pose and mouth drawings differ: 1 resting original cat face; 2 one tiny ear twitch mouth closed; 3 small opening dark mouth under pink nose; 4 clear full cute meow mouth with pink tongue, eyes still sleepy; 5 small closing mouth; 6 EXACT same idle as frame 1. Keep each face in exactly the same position and same size so frames never jitter. Original low-resolution pixel-art with chunky square pixel edges and original warm nighttime palette, NOT smooth illustration, NOT a redesigned cat. Isolate entire cat only on real transparent alpha. This is a six-frame game animation asset sheet, not a presentation. The reference image is the edit target, not merely inspiration.

The production sprite builder uses original wallpaper pixels, with small mouth/ear drawings guided by this study. It does not replace the cat body with the generated rendition.
