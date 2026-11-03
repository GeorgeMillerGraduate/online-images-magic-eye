import { makeDepth } from "./depth.js";
import { renderRows } from "./stereogram.js";

self.onmessage = async ({ data }) => {
  try {
    const { rgba, width, height, settings } = data;
    const { depths, preview } = makeDepth(
      new Uint8ClampedArray(rgba),
      width,
      height,
      settings,
    );
    const output = new Uint8ClampedArray(width * height * 4);
    for (let row = 0; row < height; row += 32) {
      renderRows(depths, width, height, settings, row, row + 32, output);
      self.postMessage({
        type: "progress",
        value: Math.min(100, Math.round(((row + 32) / height) * 100)),
      });
    }
    self.postMessage(
      {
        type: "done",
        output: output.buffer,
        preview: preview.buffer,
        width,
        height,
      },
      [output.buffer, preview.buffer],
    );
  } catch (error) {
    self.postMessage({ type: "error", message: error.message });
  }
};
