// Shade-derived relief maps; no claim of monocular scene reconstruction.
export const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));

export function blurDepth(input, width, height, radius) {
  if (!radius) return input;
  const temp = new Float32Array(input.length);
  const result = new Float32Array(input.length);
  const span = 2 * radius + 1;
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++)
      sum += input[y * width + clamp(k, 0, width - 1)];
    for (let x = 0; x < width; x++) {
      temp[y * width + x] = sum / span;
      sum +=
        input[y * width + clamp(x + radius + 1, 0, width - 1)] -
        input[y * width + clamp(x - radius, 0, width - 1)];
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++)
      sum += temp[clamp(k, 0, height - 1) * width + x];
    for (let y = 0; y < height; y++) {
      result[y * width + x] = sum / span;
      sum +=
        temp[clamp(y + radius + 1, 0, height - 1) * width + x] -
        temp[clamp(y - radius, 0, height - 1) * width + x];
    }
  }
  return result;
}

export function makeDepth(rgba, width, height, settings) {
  let depths = new Float32Array(width * height);
  let low = 1,
    high = 0;
  for (let i = 0; i < depths.length; i++) {
    const p = i * 4;
    const luminance =
      (0.2126 * rgba[p] + 0.7152 * rgba[p + 1] + 0.0722 * rgba[p + 2]) / 255;
    depths[i] = luminance;
    if (rgba[p + 3]) {
      low = Math.min(low, luminance);
      high = Math.max(high, luminance);
    }
  }
  for (let i = 0; i < depths.length; i++) {
    let value = depths[i];
    if (settings.normalise && high - low > 0.001)
      value = (value - low) / (high - low);
    value = clamp((value - 0.5) * settings.contrast + 0.5);
    value = Math.pow(value, 1 / settings.gamma);
    if (settings.invert) value = 1 - value;
    if (settings.mapMode === "silhouette")
      value = value >= settings.threshold ? 1 : 0;
    else if (settings.mapMode === "layers") value = Math.round(value * 4) / 4;
    depths[i] = (value * rgba[i * 4 + 3]) / 255;
  }
  depths = blurDepth(depths, width, height, settings.smoothing);
  const preview = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < depths.length; i++) {
    preview.fill(Math.round(clamp(depths[i]) * 255), i * 4, i * 4 + 3);
    preview[i * 4 + 3] = 255;
  }
  return { depths, preview };
}
