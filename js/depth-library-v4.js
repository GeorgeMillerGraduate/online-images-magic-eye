export const samples = [
  "sphere",
  "torus",
  "heart",
  "rings",
  "spiral",
  "mountain",
  "star",
  "wave",
  "69420",
  "smiley",
  "troll",
  "rage",
  "deal",
  "cat",
  "alien",
  "jenga",
];
export async function sampleImage(kind) {
  if (!samples.includes(kind)) kind = "sphere";
  const response = await fetch(
    new URL(`../images/depth/${kind}.png?v=depth-4`, import.meta.url),
  );
  if (!response.ok)
    throw new Error(
      "Sample image could not load. Upload the complete images folder.",
    );
  return createImageBitmap(await response.blob());
}
