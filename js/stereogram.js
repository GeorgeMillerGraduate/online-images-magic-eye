// Symmetric scan-line constraints with visibility checks. See README references.
export const palettes = {
  ocean: ["#193c50", "#244d61", "#5e7880", "#a8b6ad", "#f6f0e3", "#dfd5bf"],
  confetti: ["#202953", "#ff6787", "#ffd779", "#52dbc0", "#a0a5ff", "#eff9fa"],
  mono: ["#121824", "#f0f5f9"],
  forest: ["#123d35", "#47846a", "#96b86d", "#d6dca0", "#254954", "#f1edce"],
  sunset: ["#50244b", "#a64161", "#ff7f6b", "#fcb96b", "#f5e3a8", "#8e73a4"],
};

function noise(x, y, seed) {
  let n =
    (seed ^ Math.imul(x + 1, 0x45d9f3b) ^ Math.imul(y + 1, 0x27d4eb2d)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return (n ^ (n >>> 16)) >>> 0;
}

export function separation(depth, period, strength) {
  return Math.round(
    (2 * period * (1 - strength * depth)) / (2 - strength * depth),
  );
}

export function linkRow(depths, offset, width, period, strength) {
  const same = new Int32Array(width);
  for (let x = 0; x < width; x++) same[x] = x;
  for (let x = 0; x < width; x++) {
    const z = depths[offset + x];
    const distance = separation(z, period, strength);
    let left = x - Math.floor(distance / 2),
      right = left + distance;
    if (left < 0 || right >= width) continue;
    let visible = true;
    // A point must be visible to both eyes before its projections can be linked.
    const rayStep = (2 - strength * z) / (strength * period);
    for (let t = 1; z + rayStep * t < 1; t++) {
      const rayDepth = z + rayStep * t;
      if (
        (x - t >= 0 && depths[offset + x - t] >= rayDepth) ||
        (x + t < width && depths[offset + x + t] >= rayDepth)
      ) {
        visible = false;
        break;
      }
    }
    if (!visible) continue;
    // Merge ordered constraint chains without destroying existing equalities.
    let next = same[left];
    while (next !== left && next !== right) {
      if (next < right) left = next;
      else {
        same[left] = right;
        left = right;
        right = next;
      }
      next = same[left];
    }
    same[left] = right;
  }
  return same;
}

export function renderRows(
  depths,
  width,
  height,
  settings,
  start,
  end,
  output,
) {
  const colors = palettes[settings.palette].map((hex) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
  );
  const period = Math.round((width * settings.spacing) / 100);
  for (let y = start; y < Math.min(end, height); y++) {
    const same = linkRow(depths, y * width, width, period, settings.strength);
    for (let x = width - 1; x >= 0; x--) {
      const p = (y * width + x) * 4;
      if (same[x] === x) {
        const color =
          colors[
            noise(
              Math.floor(x / settings.grain),
              Math.floor(y / settings.grain),
              settings.seed,
            ) % colors.length
          ];
        output[p] = color[0];
        output[p + 1] = color[1];
        output[p + 2] = color[2];
      } else {
        const source = (y * width + same[x]) * 4;
        output[p] = output[source];
        output[p + 1] = output[source + 1];
        output[p + 2] = output[source + 2];
      }
      output[p + 3] = 255;
    }
  }
}
