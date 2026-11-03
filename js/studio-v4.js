import { sampleImage } from "./depth-library-v4.js";

const $ = (id) => document.getElementById(id);
const stereo = $("stereo"),
  depth = $("depth"),
  original = $("original");
const sourceThumb = $("source-thumb"),
  depthThumb = $("depth-thumb");
let source = null,
  worker = null,
  completed = null,
  pending = true;
let sourceName = "Floating sphere · sample",
  seed = 1979,
  loading = 0;
const controlIds = [
  "map-mode",
  "contrast",
  "gamma",
  "threshold",
  "smoothing",
  "invert",
  "normalise",
  "palette",
  "grain",
  "strength",
  "spacing",
  "scale",
  "resolution",
  "aspect",
  "guides",
];

function status(text, error = false) {
  $("status").textContent = text;
  $("status").classList.toggle("error", error);
}

function settings() {
  return {
    mapMode: $("map-mode").value,
    contrast: Number($("contrast").value),
    gamma: Number($("gamma").value),
    threshold: Number($("threshold").value) / 100,
    smoothing: Number($("smoothing").value),
    invert: $("invert").checked,
    normalise: $("normalise").checked,
    palette: $("palette").value,
    grain: Number($("grain").value),
    strength: Number($("strength").value) / 100,
    spacing: Number($("spacing").value),
    scale: Number($("scale").value) / 100,
    width: Number($("resolution").value),
    aspect: $("aspect").value,
    guides: $("guides").checked,
    seed,
  };
}

function labels() {
  for (const id of ["contrast", "gamma"])
    $(id + "-value").textContent = Number($(id).value).toFixed(2);
  for (const id of ["threshold", "strength", "spacing", "scale"])
    $(id + "-value").textContent = $(id).value + "%";
  $("smoothing-value").textContent = $("smoothing").value + " px";
  $("threshold-field").hidden = $("map-mode").value !== "silhouette";
}

function setBusy(busy) {
  $("generate").disabled = busy;
  $("shuffle").disabled = busy;
  $("cancel").hidden = !busy;
  $("progress").hidden = !busy;
  $("download").disabled = busy || !completed;
  $("download-depth").disabled = busy || !completed;
  $("generate").textContent = busy ? "Generating…" : "Generate Magic Eye";
}

function cancel(announce = true) {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  setBusy(false);
  if (announce)
    status(
      completed
        ? "Generation cancelled. The last completed image is still available."
        : "Generation cancelled. Adjust settings and generate again.",
    );
}

function dirty() {
  if (worker) cancel(false);
  pending = true;
  labels();
  status("Settings changed. Select Generate Magic Eye to apply them.");
  $("output-info").textContent = completed
    ? "Downloads contain the last completed render; generate to apply changes."
    : "Generate an image to enable downloads.";
}

function dimensions(config) {
  const width = config.width;
  const ratio =
    config.aspect === "square"
      ? 1
      : config.aspect === "portrait"
        ? 0.8
        : config.aspect === "source"
          ? Math.max(0.8, Math.min(2, source.width / source.height))
          : 1.5;
  return { width, height: Math.round(width / ratio) };
}

function prepare(config) {
  const { width, height } = dimensions(config);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  // Alpha is retained for the far-plane background, including transparent uploads.
  const fit = Math.min(
    (width * config.scale) / source.width,
    (height * config.scale) / source.height,
  );
  const w = source.width * fit,
    h = source.height * fit;
  ctx.drawImage(source, (width - w) / 2, (height - h) / 2, w, h);
  return {
    canvas,
    rgba: ctx.getImageData(0, 0, width, height).data,
    width,
    height,
  };
}

function thumbnail(canvas, thumb) {
  const ctx = thumb.getContext("2d");
  ctx.fillStyle = "#020b14";
  ctx.fillRect(0, 0, thumb.width, thumb.height);
  const ratio = Math.min(
    thumb.width / canvas.width,
    thumb.height / canvas.height,
  );
  const w = canvas.width * ratio,
    h = canvas.height * ratio;
  ctx.drawImage(canvas, (thumb.width - w) / 2, (thumb.height - h) / 2, w, h);
}

function drawStereo() {
  const { output, width, height, config } = completed;
  const guideHeight = config.guides ? 48 : 0;
  stereo.width = width;
  stereo.height = height + guideHeight;
  const ctx = stereo.getContext("2d");
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(output), width, height),
    0,
    guideHeight,
  );
  if (config.guides) {
    ctx.fillStyle = "#f6f0e3";
    ctx.fillRect(0, 0, width, guideHeight);
    const spacing = Math.round((width * config.spacing) / 100);
    ctx.fillStyle = "#13263c";
    for (const x of [width / 2 - spacing / 2, width / 2 + spacing / 2]) {
      ctx.beginPath();
      ctx.arc(x, guideHeight / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  $("dimensions").textContent = `${width} × ${stereo.height}`;
}

function generate() {
  if (!source) return;
  cancel(false);
  const config = settings();
  let prepared;
  try {
    prepared = prepare(config);
    worker = new Worker(new URL("./renderer-v4.js", import.meta.url), {
      type: "module",
    });
  } catch (error) {
    status(
      `Cannot start the renderer: ${error.message}. Open this app through your website or a local HTTP server.`,
      true,
    );
    return;
  }
  setBusy(true);
  $("progress").value = 0;
  status("Building the depth map and stereo constraints…");
  const started = performance.now();
  worker.onmessage = ({ data }) => {
    if (data.type === "progress") {
      $("progress").value = data.value;
      status(`Generating your stereogram · ${data.value}%`);
    } else if (data.type === "error") {
      cancel(false);
      status(`Generation failed: ${data.message}`, true);
    } else if (data.type === "done") {
      completed = { ...data, config, name: sourceName };
      pending = false;
      original.width = data.width;
      original.height = data.height;
      const ctx = original.getContext("2d");
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, data.width, data.height);
      ctx.drawImage(prepared.canvas, 0, 0);
      depth.width = data.width;
      depth.height = data.height;
      depth
        .getContext("2d")
        .putImageData(
          new ImageData(
            new Uint8ClampedArray(data.preview),
            data.width,
            data.height,
          ),
          0,
          0,
        );
      drawStereo();
      thumbnail(original, sourceThumb);
      thumbnail(depth, depthThumb);
      $("source-name").textContent = sourceName;
      cancel(false);
      $("output-info").textContent =
        `PNG · ${stereo.width} × ${stereo.height} pixels · rendered in ${((performance.now() - started) / 1000).toFixed(1)}s`;
      status(
        "Your Magic Eye image is ready. Look through the pattern, or reveal the Depth map.",
      );
      selectView("stereo");
    }
  };
  worker.onerror = (event) => {
    cancel(false);
    status(
      `Renderer error: ${event.message || "Worker could not load. Check that all js files were uploaded."}`,
      true,
    );
  };
  worker.postMessage(
    {
      rgba: prepared.rgba.buffer,
      width: prepared.width,
      height: prepared.height,
      settings: config,
    },
    [prepared.rgba.buffer],
  );
}

function selectView(view) {
  for (const key of ["stereo", "depth", "original"]) {
    const selected = key === view;
    $("panel-" + key).hidden = !selected;
    $("tab-" + key).setAttribute("aria-selected", String(selected));
    $("tab-" + key).tabIndex = selected ? 0 : -1;
  }
  $("view-title").textContent = {
    stereo: "Find another dimension.",
    depth: "The shape behind the pattern.",
    original: "Where the image begins.",
  }[view];
  $("viewer-note").textContent = {
    stereo: "Parallel viewing · look through the image",
    depth: "White is near · black is far",
    original: "Source image · fitted without stretching",
  }[view];
}

async function upload(file) {
  if (!file) return;
  const allowed = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/avif",
    "image/gif",
    "image/bmp",
  ];
  if (!allowed.includes(file.type)) {
    status("Choose a PNG, JPEG, WebP, AVIF, GIF or BMP image.", true);
    return;
  }
  if (file.size > 30 * 1024 * 1024) {
    status("Choose an image under 30 MB.", true);
    return;
  }
  cancel(false);
  const request = ++loading;
  status("Reading your image locally…");
  try {
    const image = await createImageBitmap(file);
    if (request !== loading) {
      image.close();
      return;
    }
    if (image.width * image.height > 50000000) {
      image.close();
      throw new Error(
        "Image is too large. Please resize it below 50 megapixels.",
      );
    }
    source?.close?.();
    source = image;
    sourceName = file.name;
    for (const card of document.querySelectorAll("[data-sample]"))
      card.setAttribute("aria-pressed", "false");
    $("file-info").textContent =
      `${file.name} · ${image.width} × ${image.height} · processed locally`;
    pending = true;
    generate();
  } catch (error) {
    if (request === loading)
      status(`Could not read the image: ${error.message}`, true);
  }
}

async function useSample() {
  const request = ++loading;
  cancel(false);
  status("Loading depth study…");
  try {
    const image = await sampleImage($("sample").value);
    if (request !== loading) {
      image.close();
      return;
    }
    source?.close?.();
    source = image;
    sourceName = $("sample").selectedOptions[0].textContent + " · sample";
    $("file-info").textContent =
      "Custom depth map loaded. White is near; black is far.";
    $("upload").value = "";
    for (const card of document.querySelectorAll("[data-sample]"))
      card.setAttribute(
        "aria-pressed",
        String(card.dataset.sample === $("sample").value),
      );
    generate();
  } catch (error) {
    if (request === loading) status(error.message, true);
  }
}
// Click, keyboard activation and drag/drop share the same sample loader.
const sampleMime = "application/x-jenga-depth-sample";
let draggedSample = null;
const viewerDrop = $("viewer");
function chooseSample(kind) {
  const option = [...$("sample").options].find(
    (option) => option.value === kind,
  );
  if (!option) return;
  $("sample").value = kind;
  useSample();
}
for (const card of document.querySelectorAll("[data-sample]")) {
  card.draggable = true;
  card.title = "Drag onto the main image, or click to generate";
  card.querySelector("img").draggable = false;
  card.onclick = () => chooseSample(card.dataset.sample);
  card.addEventListener("dragstart", (event) => {
    draggedSample = card.dataset.sample;
    event.dataTransfer.setData(sampleMime, draggedSample);
    event.dataTransfer.effectAllowed = "copy";
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => {
    draggedSample = null;
    card.classList.remove("dragging");
    viewerDrop.classList.remove("sample-over");
  });
}
// Pointer fallback also supports touch screens and browsers that suppress native dragging.
let pointerSample = null;
for (const card of document.querySelectorAll("[data-sample]")) {
  card.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerSample = {
      kind: card.dataset.sample,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
  });
}
window.addEventListener("pointermove", (event) => {
  if (!pointerSample) return;
  if (
    Math.hypot(
      event.clientX - pointerSample.x,
      event.clientY - pointerSample.y,
    ) > 8
  )
    pointerSample.moved = true;
  const rect = viewerDrop.getBoundingClientRect();
  const over =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  viewerDrop.classList.toggle("sample-over", pointerSample.moved && over);
});
window.addEventListener("pointerup", (event) => {
  if (!pointerSample) return;
  const saved = pointerSample;
  pointerSample = null;
  viewerDrop.classList.remove("sample-over");
  const rect = viewerDrop.getBoundingClientRect();
  if (
    saved.moved &&
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  )
    chooseSample(saved.kind);
});
window.addEventListener("pointercancel", () => {
  pointerSample = null;
});
viewerDrop.addEventListener("dragover", (event) => {
  if (
    !draggedSample &&
    ![...event.dataTransfer.types].includes(sampleMime) &&
    ![...event.dataTransfer.types].includes("Files")
  )
    return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  viewerDrop.classList.add("sample-over");
});
viewerDrop.addEventListener("dragleave", (event) => {
  if (!viewerDrop.contains(event.relatedTarget))
    viewerDrop.classList.remove("sample-over");
});
viewerDrop.addEventListener("drop", (event) => {
  event.preventDefault();
  viewerDrop.classList.remove("sample-over");
  const kind = event.dataTransfer.getData(sampleMime) || draggedSample;
  draggedSample = null;
  if (kind) chooseSample(kind);
  else if (event.dataTransfer.files.length) upload(event.dataTransfer.files[0]);
});
$("sample").addEventListener("change", useSample);
// Pattern selections should be visible immediately, without another button press.
for (const id of ["palette", "grain"])
  $(id).addEventListener("change", generate);

async function download(canvas, suffix) {
  if (!completed || worker) return;
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) {
    status("PNG export failed. Try a smaller output size.", true);
    return;
  }
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  const filename =
    completed.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .slice(0, 70) || "jenga";
  link.href = url;
  link.download = `${filename}-${suffix}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status(
    pending
      ? "Saved the last completed render. Generate again to apply your changed settings."
      : "PNG downloaded at full output resolution.",
  );
}

for (const id of controlIds) $(id).addEventListener("input", dirty);
$("upload").onchange = (event) => upload(event.target.files[0]);
const drop = $("drop-zone");
for (const type of ["dragenter", "dragover"])
  drop.addEventListener(type, (event) => {
    event.preventDefault();
    drop.classList.add("dragover");
  });
for (const type of ["dragleave", "drop"])
  drop.addEventListener(type, (event) => {
    event.preventDefault();
    drop.classList.remove("dragover");
  });
drop.addEventListener("drop", (event) => upload(event.dataTransfer.files[0]));
// Avoid navigating away when an image is dropped just outside the upload box.
window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => event.preventDefault());
$("load-sample").onclick = useSample;
$("generate").onclick = generate;
$("cancel").onclick = () => cancel();
$("shuffle").onclick = () => {
  seed = crypto.getRandomValues(new Uint32Array(1))[0];
  generate();
};
$("reset").onclick = () => {
  for (const id of controlIds) {
    const input = $(id);
    if (input.type === "checkbox") input.checked = input.defaultChecked;
    else if (input.tagName === "SELECT")
      input.selectedIndex = [...input.options].findIndex(
        (option) => option.defaultSelected,
      );
    else input.value = input.defaultValue;
    if (input.tagName === "SELECT" && input.selectedIndex < 0)
      input.selectedIndex = 0;
  }
  seed = 1979;
  labels();
  generate();
};
$("download").onclick = () => download(stereo, "magic-eye");
$("download-depth").onclick = () => download(depth, "depth-map");
const tabs = [...document.querySelectorAll("[data-view]")];
for (const tab of tabs) {
  tab.onclick = () => selectView(tab.dataset.view);
  tab.onkeydown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (tabs.indexOf(tab) +
              (event.key === "ArrowRight" ? 1 : -1) +
              tabs.length) %
            tabs.length;
    tabs[index].focus();
    selectView(tabs[index].dataset.view);
  };
}
$("native-size").onchange = () =>
  $("viewer").classList.toggle("native", $("native-size").checked);
$("fullscreen").onclick = async () => {
  try {
    if (!$("viewer").requestFullscreen)
      throw new Error("This browser does not support full-screen viewing.");
    await $("viewer").requestFullscreen();
  } catch (error) {
    status(error.message, true);
  }
};
$("close-fullscreen").onclick = () => document.exitFullscreen();
document.addEventListener("fullscreenchange", () => {
  $("close-fullscreen").hidden = document.fullscreenElement !== $("viewer");
});
window.addEventListener("beforeunload", () => {
  worker?.terminate();
  source?.close?.();
});
labels();
useSample();
