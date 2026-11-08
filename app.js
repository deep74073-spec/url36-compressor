const $ = id => document.getElementById(id);

const imageInput = $("imageInput");
const editor = $("editor");
const dropZone = $("dropZone");
const originalPreview = $("originalPreview");
const compressedPreview = $("compressedPreview");
const compareStage = document.querySelector(".compare-stage");
const compressedLayer = $("compressedLayer");
const compareSlider = $("compareSlider");
const compareLine = $("compareLine");

const category = $("category");
const preset = $("preset");
const widthInput = $("widthInput");
const heightInput = $("heightInput");
const keepRatio = $("keepRatio");
const targetSize = $("targetSize");
const customSize = $("customSize");
const customSizeWrap = $("customSizeWrap");
const quality = $("quality");
const qualityValue = $("qualityValue");
const format = $("format");
const compressBtn = $("compressBtn");
const downloadBtn = $("downloadBtn");
const resultMessage = $("resultMessage");

let originalFile = null;
let originalImage = null;
let compressedUrl = null;
let originalRatio = 1;
let originalWidth = 0;
let originalHeight = 0;
let compressedBlob = null;

const presets = {
  website: [
    ["Hero Image",1920,1080],
    ["Website Banner",1200,400],
    ["Blog Thumbnail",1200,630],
    ["Product Image",1000,1000],
    ["Small Website Image",800,600]
  ],
  social: [
    ["Square Post",1080,1080],
    ["Portrait Post",1080,1350],
    ["Landscape Post",1200,630],
    ["Story / Reel",1080,1920],
    ["Cover Image",1200,675]
  ],
  youtube: [
    ["YouTube Thumbnail",1280,720],
    ["Channel Banner",2560,1440],
    ["Profile Picture",800,800]
  ],
  profile: [
    ["Square Profile Photo",400,400],
    ["Small Avatar",200,200],
    ["Large Profile Photo",800,800]
  ],
  document: [
    ["Passport Photo (common size)",413,531],
    ["Small ID Photo",300,400],
    ["Document Scan",1200,1600],
    ["Signature Image",600,200]
  ],
  custom: [["Custom dimensions",0,0]]
};

function loadPresets() {
  preset.innerHTML = "";
  presets[category.value].forEach((item,index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = item[0];
    preset.appendChild(option);
  });
  applyPreset();
}

function applyPreset() {
  const item = presets[category.value][Number(preset.value)] || presets[category.value][0];
  if (item[1] && item[2]) {
    widthInput.value = item[1];
    heightInput.value = item[2];
  }
}

category.addEventListener("change", loadPresets);
preset.addEventListener("change", applyPreset);

let changingDimensions = false;

widthInput.addEventListener("input", () => {
  if (!keepRatio.checked || !originalRatio || changingDimensions) return;
  changingDimensions = true;
  heightInput.value = Math.max(1,Math.round(Number(widthInput.value) / originalRatio));
  changingDimensions = false;
});

heightInput.addEventListener("input", () => {
  if (!keepRatio.checked || !originalRatio || changingDimensions) return;
  changingDimensions = true;
  widthInput.value = Math.max(1,Math.round(Number(heightInput.value) * originalRatio));
  changingDimensions = false;
});

targetSize.addEventListener("change", () => {
  customSizeWrap.hidden = targetSize.value !== "custom";
});

quality.addEventListener("input", () => {
  qualityValue.textContent = quality.value + "%";
});

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function showMessage(message) {
  resultMessage.textContent = message;
}

function updateCompare(value) {
  compressedLayer.style.width = value + "%";
  compareLine.style.left = value + "%";
  compareSlider.value = value;
}

compareSlider.addEventListener("input", () => updateCompare(compareSlider.value));

function updateCompareImageSize() {
  if (!compareStage || !compressedPreview) return;
  compressedPreview.style.width = compareStage.clientWidth + "px";
  compressedPreview.style.height = compareStage.clientHeight + "px";
}

window.addEventListener("resize", updateCompareImageSize);

function clearCompressed() {
  if (compressedUrl) URL.revokeObjectURL(compressedUrl);
  compressedUrl = null;
  compressedBlob = null;
  downloadBtn.hidden = true;
}

function loadFile(file) {
  if (!file) return;

  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
    showMessage("Please select a JPG, PNG or WebP image.");
    return;
  }

  if (file.size > 30 * 1024 * 1024) {
    showMessage("Image size must be 30 MB or less.");
    return;
  }

  clearCompressed();
  originalFile = file;
  const url = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    originalImage = img;
    originalWidth = img.naturalWidth;
    originalHeight = img.naturalHeight;
    originalRatio = originalWidth / originalHeight;

    originalPreview.src = url;
    $("originalSize").textContent = formatSize(file.size);
    $("originalDimensions").textContent = originalWidth + " × " + originalHeight;

    widthInput.value = originalWidth;
    heightInput.value = originalHeight;
    keepRatio.checked = true;

    editor.hidden = false;
    $("compressedSize").textContent = "—";
    $("savingPercent").textContent = "—";
    $("compressedDimensions").textContent = "—";
    compressedPreview.removeAttribute("src");
    updateCompare(50);
    showMessage("Image ready. Choose your settings and compress.");
    setTimeout(updateCompareImageSize,100);
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
    showMessage("This image could not be opened.");
  };

  img.src = url;
}

imageInput.addEventListener("change", event => {
  if (event.target.files && event.target.files[0]) {
    loadFile(event.target.files[0]);
  }
});

dropZone.addEventListener("dragover", event => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", event => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  loadFile(event.dataTransfer.files[0]);
});

function getTargetBytes() {
  if (targetSize.value === "none") return Infinity;
  if (targetSize.value === "custom") {
    const kb = Number(customSize.value);
    return kb > 0 ? kb * 1024 : Infinity;
  }
  return Number(targetSize.value) * 1024;
}

function canvasBlob(canvas,mime,q) {
  return new Promise(resolve => canvas.toBlob(resolve,mime,q));
}

function makeCanvas(width,height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (format.value === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0,0,width,height);
  }
  ctx.drawImage(originalImage,0,0,width,height);
  return canvas;
}

async function encodeAtQuality(canvas,mime,startQuality) {
  if (mime === "image/png") return canvasBlob(canvas,mime);
  let low = 0.05;
  let high = startQuality;
  let best = await canvasBlob(canvas,mime,low);

  for (let i=0;i<9;i++) {
    const mid = (low + high) / 2;
    const blob = await canvasBlob(canvas,mime,mid);
    if (!blob) break;
    best = blob;
    if (blob.size > getTargetBytes()) high = mid;
    else low = mid;
  }
  return best;
}

async function compressImage() {
  if (!originalImage) {
    showMessage("Please upload an image first.");
    return;
  }

  let width = Math.max(1,Math.min(12000,Number(widthInput.value) || originalWidth));
  let height = Math.max(1,Math.min(12000,Number(heightInput.value) || originalHeight));

  const mime = format.value;
  const startQuality = Number(quality.value) / 100;
  const target = getTargetBytes();

  compressBtn.disabled = true;
  compressBtn.textContent = "Compressing...";
  showMessage("Please wait while your image is being compressed.");

  try {
    let blob = null;
    let canvas = null;
    let attempts = 0;

    while (attempts < 20) {
      canvas = makeCanvas(width,height);
      blob = await encodeAtQuality(canvas,mime,startQuality);
      if (!blob) throw new Error("Your browser could not create the compressed image.");
      if (blob.size <= target || attempts >= 19) break;

      width = Math.max(1,Math.round(width * 0.88));
      height = Math.max(1,Math.round(height * 0.88));
      attempts++;
    }

    clearCompressed();
    compressedBlob = blob;
    compressedUrl = URL.createObjectURL(blob);
    compressedPreview.src = compressedUrl;

    const saved = Math.max(0,(1 - blob.size / originalFile.size) * 100);
    $("compressedSize").textContent = formatSize(blob.size);
    $("savingPercent").textContent = saved.toFixed(1) + "%";
    $("compressedDimensions").textContent = width + " × " + height;

    downloadBtn.href = compressedUrl;
    const extension = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
    downloadBtn.download = "compressed-image." + extension;
    downloadBtn.hidden = false;

    updateCompare(50);
    setTimeout(updateCompareImageSize,100);

    if (blob.size > target) {
      showMessage("Compression complete, but the selected file-size target could not be reached. Try a larger target or smaller dimensions.");
    } else {
      showMessage("Compression complete. Your image is ready to download.");
    }
  } catch (error) {
    showMessage(error.message || "Something went wrong while compressing.");
  } finally {
    compressBtn.disabled = false;
    compressBtn.textContent = "Compress Image";
  }
}

compressBtn.addEventListener("click",compressImage);

loadPresets();
qualityValue.textContent = quality.value + "%";
