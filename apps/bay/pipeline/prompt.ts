// What the image model is asked for every frame: the look, and the two rules that make a map
// out of separate paintings (keep the geometry, carry on from what's painted).

export const PROMPT = [
  "Repaint this 3D render of San Francisco, seen from above at a 45-degree angle, as a bright, polished illustrated city map in the style of a modern isometric sim game.",
  "Style: clean, saturated but natural colours under clear midday sun; crisp building edges; tidy flat roofs with neat rooftop details (vents, AC units, skylights); windows as regular, evenly spaced rows; streets in cool light grey with crisp white lane lines and zebra crosswalks; pale warm-grey sidewalks; trees as round, clumpy, bright green canopies with darker shading and soft drop shadows; fresh green lawns; bare earth in terracotta orange; water in clear blue with gentle ripples; soft, consistent shadows.",
  "Keep everything exactly where the render has it: the same buildings with the same footprints, heights and outlines, the same streets, piers, hills and trees. Do not move, add or remove anything, and do not change the camera.",
  "No text, labels, logos or borders.",
  "Parts of the picture are already painted in this style (the kept area of the mask): leave them as they are and carry their colours, lines and details on seamlessly into the rest, so no seam shows.",
  "If a second picture is given, it is a reference for the style only: match its look, not its content.",
].join("\n\n");
