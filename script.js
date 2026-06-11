"use strict";

const STORAGE_KEYS = {
    userAssets: "coverGenerator.userAssets.v2",
    resolutionPresets: "coverGenerator.resolutionPresets.v1",
    templates: "coverGenerator.templates.v3",
    draft: "coverGenerator.currentDraft.v1",
    textPresets: "coverGenerator.textPresets.v1"
};

const DEFAULT_CANVAS = {
    width: 1920,
    height: 1080,
    backgroundColor: "#7a2b2f"
};

const BUILTIN_ASSETS = [
    { id: "book", name: "书本", type: "svg", src: "image/book.svg" },
    { id: "magnifier", name: "放大镜", type: "svg", src: "image/magnifier.svg" }
];

const TEXTURES = [
    { id: "metal", name: "金属", src: "image/textures/metal.jpg" },
    { id: "wood", name: "木纹", src: "image/textures/wood.jpg" },
    { id: "marble", name: "大理石", src: "image/textures/marble.jpg" },
    { id: "banlan", name: "斑斓", src: "image/textures/banlan.jpg" },
    { id: "colorful", name: "多彩", src: "image/textures/colorful.jpg" },
    { id: "yellow", name: "黄色", src: "image/textures/yellow.jpg" },
    { id: "blue", name: "蓝色", src: "image/textures/blue.jpg" },
    { id: "green", name: "绿色", src: "image/textures/green.jpg" },
    { id: "yama", name: "岩脉", src: "image/textures/yama.jpg" }
];

const FONT_OPTIONS = [
    { value: "LXGWWenKai", label: "霞鹜文楷" },
    { value: "LiSuLocal", label: "隶书" },
    { value: "XinDiXiaoWanZi", label: "新蒂小丸子" },
    { value: "HongLeiBanShu", label: "鸿雷板书" },
    { value: "SimHei", label: "黑体" },
    { value: "Microsoft YaHei", label: "微软雅黑" },
    { value: "SimSun", label: "宋体" }
];

const TEXT_PRESETS = [
    {
        id: "goldTitle",
        name: "金字标题",
        apply: {
            fontFamily: "SimHei",
            fontWeight: "bold",
            fillMode: "color",
            baseFill: "#ffe56e",
            stroke: "#b97616",
            strokeWidth: 5,
            paintFirst: "stroke",
            shadow: null,
            charSpacing: 80,
            gradientKind: "goldTitle"
        }
    }
];

const DEFAULT_RESOLUTION_PRESETS = [
    { name: "横版 1920 x 1080", width: 1920, height: 1080 },
    { name: "竖版 1080 x 1920", width: 1080, height: 1920 },
    { name: "方图 1080 x 1080", width: 1080, height: 1080 },
    { name: "海报 1242 x 2208", width: 1242, height: 2208 }
];
const FABRIC_CUSTOM_PROPS = [
    "id",
    "kind",
    "assetName",
    "assetSrc",
    "assetType",
    "isBackground",
    "originalSrc",
    "originalWidth",
    "originalHeight",
    "fillMode",
    "baseFill",
    "textureName",
    "gradientColor1",
    "gradientColor2",
    "gradientAngle",
    "layerName",
    "locked",
    "gradientKind",
    "paintFirst",
    "charSpacing"
];

const state = {
    canvas: null,
    background: null,
    textObjects: new Map(),
    userAssets: [],
    resolutionPresets: [],
    templates: {},
    textPresets: [],
    textCounter: 0,
    contextText: null,
    draggedLayerId: "",
    guidesVisible: false,
    guides: [],
    view: {
        zoom: 1,
        panX: 0,
        panY: 0,
        panning: null
    },
    history: {
        enabled: false,
        restoring: false,
        undo: [],
        redo: [],
        lastSnapshot: "",
        timer: null
    }
};

const els = {};

window.addEventListener("DOMContentLoaded", init);

function init() {
    if (!window.fabric) {
        document.body.innerHTML = "<main class=\"fatal-error\">Fabric.js 加载失败</main>";
        return;
    }

    cacheElements();
    preloadFonts();
    createCanvas();
    installDeleteControl();
    bindGlobalControls();
    loadUserAssets();
    loadResolutionPresets();
    loadTemplates();
    loadTextPresets();
    renderResourceGallery();
    renderResolutionPresets();
    renderTemplateSelect();
    if (!restoreDraftSnapshot()) {
        addDefaultTextBoxes();
        finishCanvasStartup();
    }
}

function finishCanvasStartup() {
    renderTextPanel();
    renderLayerPanel();
    resetHistory();
    saveDraftSnapshot();
    updateHistoryButtons();
    syncAssetsFromServer({ silent: true });
    updateCanvasLabels();
    adjustCanvasDisplay();
}

function cacheElements() {
    const byId = (id) => document.getElementById(id);
    Object.assign(els, {
        canvas: byId("canvas"),
        viewport: byId("canvasViewport"),
        canvasInfo: byId("canvasInfo"),
        activeObjectLabel: byId("activeObjectLabel"),
        width: byId("width"),
        height: byId("height"),
        applySizeBtn: byId("applySizeBtn"),
        useBgResolutionBtn: byId("useBgResolutionBtn"),
        bgColor: byId("bgColor"),
        bgOpacity: byId("bgOpacity"),
        bgImage: byId("bgImage"),
        assetFiles: byId("assetFiles"),
        refreshAssetsBtn: byId("refreshAssetsBtn"),
        cleanupAssetsBtn: byId("cleanupAssetsBtn"),
        resourceGallery: byId("resourceGallery"),
        addTextBtn: byId("addTextBtn"),
        textPanel: byId("textPanel"),
        layerPanel: byId("layerPanel"),
        refreshLayersBtn: byId("refreshLayersBtn"),
        resolutionPresetName: byId("resolutionPresetName"),
        saveResolutionPresetBtn: byId("saveResolutionPresetBtn"),
        resolutionPresetSelect: byId("resolutionPresetSelect"),
        loadResolutionPresetBtn: byId("loadResolutionPresetBtn"),
        deleteResolutionPresetBtn: byId("deleteResolutionPresetBtn"),
        templateName: byId("templateName"),
        saveTemplateBtn: byId("saveTemplateBtn"),
        templateSelect: byId("templateSelect"),
        loadTemplateBtn: byId("loadTemplateBtn"),
        deleteTemplateBtn: byId("deleteTemplateBtn"),
        exportTemplateJsonBtn: byId("exportTemplateJsonBtn"),
        importTemplateJsonInput: byId("importTemplateJsonInput"),
        exportBtn: byId("exportBtn"),
        undoBtn: byId("undoBtn"),
        redoBtn: byId("redoBtn"),
        resetViewBtn: byId("resetViewBtn"),
        toggleGuidesBtn: byId("toggleGuidesBtn"),
        zoomLabel: byId("zoomLabel"),
        alignTools: document.querySelector(".align-tools"),
        textContextMenu: byId("textContextMenu"),
        contextStrokeColor: byId("contextStrokeColor"),
        contextStrokeWidth: byId("contextStrokeWidth"),
        toastHost: byId("toastHost")
    });
}

function preloadFonts() {
    if (!("FontFace" in window)) return;

    const fontFaces = [
        new FontFace("LXGWWenKai", "url(./fonts/LXGWWenKai-Regular.ttf)"),
        new FontFace("LiSuLocal", "url(./fonts/LiSu.ttf)"),
        new FontFace("XinDiXiaoWanZi", "url(./fonts/%E6%96%B0%E8%92%82%E5%B0%8F%E4%B8%B8%E5%AD%90%E5%B0%8F%E5%AD%A6%E7%89%88.ttf)"),
        new FontFace("HongLeiBanShu", "url(./fonts/%E9%B8%BF%E9%9B%B7%E6%9D%BF%E4%B9%A6%E7%AE%80%E4%BD%93.ttf)")
    ];

    Promise.all(fontFaces.map((fontFace) => fontFace.load()))
        .then((loadedFonts) => {
            loadedFonts.forEach((fontFace) => document.fonts.add(fontFace));
            state.canvas?.requestRenderAll();
        })
        .catch(() => showToast("字体加载失败，已使用浏览器默认字体"));
}

function createCanvas() {
    state.canvas = new fabric.Canvas(els.canvas, {
        width: DEFAULT_CANVAS.width,
        height: DEFAULT_CANVAS.height,
        backgroundColor: DEFAULT_CANVAS.backgroundColor,
        preserveObjectStacking: true,
        fireRightClick: true,
        stopContextMenu: true
    });

    state.canvas.on("selection:created", handleSelectionChange);
    state.canvas.on("selection:updated", handleSelectionChange);
    state.canvas.on("selection:cleared", handleSelectionCleared);
    state.canvas.on("object:modified", handleObjectModified);
    state.canvas.on("object:moving", handleObjectMoving);
    state.canvas.on("object:scaling", handleObjectScaling);
    state.canvas.on("object:added", handleCanvasMutation);
    state.canvas.on("object:removed", handleCanvasMutation);
    state.canvas.on("text:changed", handleTextChanged);
    state.canvas.on("mouse:down", handleCanvasMouseDown);

    state.canvas.upperCanvasEl.addEventListener("pointerdown", prioritizeActiveTextForPointer, { capture: true });
    state.canvas.upperCanvasEl.addEventListener("contextmenu", handleCanvasContextMenu);
    window.addEventListener("resize", adjustCanvasDisplay);
}

function installDeleteControl() {
    fabric.Object.prototype.controls.deleteControl = new fabric.Control({
        x: 0.5,
        y: -0.5,
        offsetX: 16,
        offsetY: -16,
        cursorStyle: "pointer",
        mouseUpHandler: deleteFabricObject,
        render: renderDeleteIcon,
        cornerSize: 24
    });
}

function bindGlobalControls() {
    els.applySizeBtn.addEventListener("click", () => applyCanvasSizeFromInputs());
    [els.width, els.height].forEach((input) => {
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                applyCanvasSizeFromInputs();
            }
        });
        input.addEventListener("wheel", (event) => {
            event.preventDefault();
            const next = parseInt(input.value || "0", 10) + (event.deltaY < 0 ? 10 : -10);
            input.value = Math.max(60, next);
            applyCanvasSizeFromInputs();
        });
    });

    els.useBgResolutionBtn.addEventListener("click", useBackgroundResolution);
    els.bgColor.addEventListener("input", () => {
        state.canvas.backgroundColor = els.bgColor.value;
        state.canvas.requestRenderAll();
        scheduleHistory();
    });
    els.bgOpacity.addEventListener("input", () => {
        if (!state.background) return;
        state.background.set("opacity", parseFloat(els.bgOpacity.value));
        state.canvas.requestRenderAll();
    });
    els.bgImage.addEventListener("change", handleBackgroundUpload);
    els.assetFiles.addEventListener("change", handleAssetUpload);
    els.refreshAssetsBtn.addEventListener("click", () => syncAssetsFromServer());
    els.cleanupAssetsBtn.addEventListener("click", cleanupUnusedAssets);
    els.exportBtn.addEventListener("click", exportImage);

    els.addTextBtn.addEventListener("click", () => {
        const text = addTextBox({ text: `文本框 ${state.textCounter + 1}` });
        state.canvas.setActiveObject(text);
        state.canvas.requestRenderAll();
        renderTextPanel();
        renderLayerPanel();
        commitHistory();
    });

    els.textPanel.addEventListener("input", handleTextPanelInput);
    els.textPanel.addEventListener("change", handleTextPanelInput);
    els.textPanel.addEventListener("click", handleTextPanelClick);
    els.textPanel.addEventListener("contextmenu", handleTextPanelContextMenu);
    els.layerPanel.addEventListener("input", handleLayerPanelInput);
    els.layerPanel.addEventListener("click", handleLayerPanelClick);
    els.layerPanel.addEventListener("dragstart", handleLayerDragStart);
    els.layerPanel.addEventListener("dragover", handleLayerDragOver);
    els.layerPanel.addEventListener("dragleave", handleLayerDragLeave);
    els.layerPanel.addEventListener("drop", handleLayerDrop);
    els.refreshLayersBtn.addEventListener("click", renderLayerPanel);

    els.saveResolutionPresetBtn.addEventListener("click", saveResolutionPreset);
    els.loadResolutionPresetBtn.addEventListener("click", loadSelectedResolutionPreset);
    els.deleteResolutionPresetBtn.addEventListener("click", deleteSelectedResolutionPreset);
    els.resolutionPresetName.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            saveResolutionPreset();
        }
    });

    els.saveTemplateBtn.addEventListener("click", saveTemplate);
    els.loadTemplateBtn.addEventListener("click", loadSelectedTemplate);
    els.deleteTemplateBtn.addEventListener("click", deleteSelectedTemplate);
    els.exportTemplateJsonBtn.addEventListener("click", exportTemplateJSON);
    els.importTemplateJsonInput.addEventListener("change", importTemplateJSON);
    els.templateName.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            saveTemplate();
        }
    });

    els.undoBtn.addEventListener("click", undoHistory);
    els.redoBtn.addEventListener("click", redoHistory);
    els.resetViewBtn.addEventListener("click", resetCanvasView);
    els.toggleGuidesBtn.addEventListener("click", toggleGuides);
    els.alignTools.addEventListener("click", handleAlignToolClick);
    els.viewport.addEventListener("wheel", handleStageWheel, { passive: false });
    els.viewport.addEventListener("pointerdown", handleViewportPointerDown);
    document.addEventListener("pointermove", handleStagePointerMove);
    document.addEventListener("pointerup", endStagePan);

    els.textContextMenu.addEventListener("click", handleContextMenuClick);
    els.contextStrokeColor.addEventListener("input", updateContextStroke);
    els.contextStrokeWidth.addEventListener("input", updateContextStroke);
    document.addEventListener("click", (event) => {
        if (!els.textContextMenu.contains(event.target)) closeTextContextMenu();
    });
    document.addEventListener("keydown", handleKeyboard);
}

function addDefaultTextBoxes() {
    addTextBox({
        text: "喜报",
        left: DEFAULT_CANVAS.width / 2,
        top: DEFAULT_CANVAS.height * 0.34,
        originX: "center",
        fontSize: 132,
        fontFamily: "LiSuLocal",
        baseFill: "#fff2c8",
        stroke: "#6c101a",
        strokeWidth: 3
    });
    addTextBox({
        text: "金榜题名",
        left: DEFAULT_CANVAS.width / 2,
        top: DEFAULT_CANVAS.height * 0.52,
        originX: "center",
        fontSize: 76,
        fontFamily: "HongLeiBanShu",
        baseFill: "#ffffff"
    });
    addTextBox({
        text: "可替换姓名、学校、获奖信息",
        left: DEFAULT_CANVAS.width / 2,
        top: DEFAULT_CANVAS.height * 0.68,
        originX: "center",
        fontSize: 42,
        fontFamily: "LXGWWenKai",
        baseFill: "#f8d980"
    });
    renderTextPanel();
}
function addTextBox(options = {}) {
    const id = options.id || createId("text");
    state.textCounter += 1;

    const text = new fabric.IText(options.text || `文本框 ${state.textCounter}`, {
        left: options.left ?? 120,
        top: options.top ?? (120 + state.textCounter * 72),
        originX: options.originX || "left",
        originY: options.originY || "top",
        fontSize: options.fontSize || 48,
        fontFamily: options.fontFamily || "LXGWWenKai",
        fill: options.baseFill || options.fill || "#ffffff",
        visible: options.visible ?? true,
        fontWeight: options.fontWeight || "normal",
        fontStyle: options.fontStyle || "normal",
        underline: !!options.underline,
        linethrough: !!options.linethrough,
        stroke: options.stroke || null,
        strokeWidth: options.strokeWidth || 0,
        shadow: options.shadow || null,
        scaleX: options.scaleX || 1,
        scaleY: options.scaleY || 1,
        angle: options.angle || 0
    });

    text.set({
        id,
        kind: "text",
        fillMode: options.fillMode || "color",
        baseFill: options.baseFill || options.fill || "#ffffff",
        textureName: options.textureName || TEXTURES[0].id,
        gradientColor1: options.gradientColor1 || "#fff2c8",
        gradientColor2: options.gradientColor2 || "#b91f31",
        gradientAngle: options.gradientAngle ?? 0,
        layerName: options.layerName || options.text || `文本框 ${state.textCounter}`,
        locked: !!options.locked
    });

    state.textObjects.set(id, text);
    state.canvas.add(text);
    applyTextFill(text);
    return text;
}

function createId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyCanvasSizeFromInputs() {
    const width = parseCanvasDimension(els.width.value, DEFAULT_CANVAS.width);
    const height = parseCanvasDimension(els.height.value, DEFAULT_CANVAS.height);
    setCanvasSize(width, height, { scalePositions: true });
}

function parseCanvasDimension(value, fallback) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(60, Math.min(20000, parsed));
}

function setCanvasSize(width, height, options = {}) {
    const oldWidth = state.canvas.getWidth();
    const oldHeight = state.canvas.getHeight();
    const scaleX = width / oldWidth;
    const scaleY = height / oldHeight;

    if (options.scalePositions) {
        state.canvas.getObjects().forEach((object) => {
            object.set({
                left: object.left * scaleX,
                top: object.top * scaleY
            });
            object.setCoords();
        });
    }

    state.canvas.setWidth(width);
    state.canvas.setHeight(height);
    els.width.value = width;
    els.height.value = height;

    if (state.background && options.fitBackground !== false) {
        fitBackgroundToCanvas();
    }
    updateGuides();

    updateCanvasLabels();
    adjustCanvasDisplay();
    state.canvas.requestRenderAll();
    commitHistory();
}

function useBackgroundResolution() {
    if (!state.background) {
        showToast("请先选择背景图");
        return;
    }

    const width = Math.round(state.background.originalWidth || state.background.width);
    const height = Math.round(state.background.originalHeight || state.background.height);
    setCanvasSize(width, height, { scalePositions: true });
    fitBackgroundToCanvas();
    showToast("已使用背景图分辨率");
}

async function handleBackgroundUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const [asset] = await uploadFiles([file], "backgrounds");
    if (!asset) return;
    setBackgroundFromSource(asset.src, asset.name);
    event.target.value = "";
}

async function handleAssetUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const uploaded = await uploadFiles(files, "assets");
    if (!uploaded.length) return;

    state.userAssets.push(...uploaded.map((asset) => ({
        id: createId("asset"),
        name: asset.name,
        type: "image",
        src: asset.src,
        uploaded: !asset.temporary,
        temporary: !!asset.temporary
    })));
    saveUserAssets();
    renderResourceGallery();
    event.target.value = "";
}

async function uploadFiles(files, bucket) {
    const normalizedFiles = Array.from(files || []);
    if (!normalizedFiles.length) return [];

    if (location.protocol.startsWith("http")) {
        try {
            const form = new FormData();
            form.append("bucket", bucket);
            normalizedFiles.forEach((file) => form.append("files", file, file.name));
            const response = await fetch("upload", {
                method: "POST",
                body: form
            });
            if (response.ok) {
                const data = await response.json();
                return data.files || [];
            }
        } catch (error) {
            console.warn("上传接口不可用，使用临时浏览器路径", error);
        }
    }

    showToast("当前使用临时素材路径");
    return normalizedFiles.map((file) => ({
        name: file.name,
        src: URL.createObjectURL(file),
        temporary: true
    }));
}

function setBackgroundFromSource(src, name) {
    loadFabricImage(src, (img) => {
        if (state.background) {
            state.canvas.remove(state.background);
        }

        img.set({
            id: createId("background"),
            kind: "background",
            assetName: name || "背景图",
            layerName: name || "背景图",
            assetSrc: src,
            isBackground: true,
            originalSrc: src,
            originalWidth: img.width,
            originalHeight: img.height,
            originX: "center",
            originY: "center",
            opacity: parseFloat(els.bgOpacity.value)
        });

        state.background = img;
        state.canvas.add(img);
        fitBackgroundToCanvas();
        state.canvas.setActiveObject(img);
        updateSelectionLabel(img);
        renderLayerPanel();
        commitHistory();
        state.canvas.requestRenderAll();
    });
}

function loadFabricImage(src, callback) {
    const options = src.startsWith("blob:") ? {} : { crossOrigin: "anonymous" };
    fabric.Image.fromURL(src, (img) => {
        if (!img) {
            showToast("图片加载失败");
            return;
        }
        callback(img);
    }, options);
}

function fitBackgroundToCanvas() {
    const bg = state.background;
    if (!bg) return;

    const scale = Math.max(
        state.canvas.getWidth() / bg.width,
        state.canvas.getHeight() / bg.height
    );

    bg.set({
        left: state.canvas.getWidth() / 2,
        top: state.canvas.getHeight() / 2,
        scaleX: scale,
        scaleY: scale,
        angle: 0
    });
    bg.sendToBack();
    bg.setCoords();
}

function constrainBackgroundImage() {
    const bg = state.background;
    if (!bg) return;

    const minScale = Math.max(
        state.canvas.getWidth() / bg.width,
        state.canvas.getHeight() / bg.height
    );
    if (bg.scaleX < minScale || bg.scaleY < minScale) {
        bg.scale(minScale);
    }

    const halfWidth = bg.getScaledWidth() / 2;
    const halfHeight = bg.getScaledHeight() / 2;
    const canvasWidth = state.canvas.getWidth();
    const canvasHeight = state.canvas.getHeight();

    bg.left = halfWidth <= canvasWidth / 2
        ? canvasWidth / 2
        : clamp(bg.left, canvasWidth - halfWidth, halfWidth);
    bg.top = halfHeight <= canvasHeight / 2
        ? canvasHeight / 2
        : clamp(bg.top, canvasHeight - halfHeight, halfHeight);
    bg.setCoords();
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function renderResourceGallery() {
    const resources = [...BUILTIN_ASSETS, ...state.userAssets];
    els.resourceGallery.innerHTML = "";

    resources.forEach((resource) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "resource-tile";
        button.title = resource.name;
        button.dataset.resourceId = resource.id;

        const img = document.createElement("img");
        img.src = resource.src;
        img.alt = resource.name;
        img.loading = "lazy";

        const label = document.createElement("span");
        label.textContent = resource.name;

        button.append(img, label);
        if (resource.uploaded || resource.src.startsWith("image/uploads/")) {
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "asset-delete-button";
            deleteButton.textContent = "×";
            deleteButton.title = "删除素材";
            deleteButton.addEventListener("click", (event) => {
                event.stopPropagation();
                deleteUploadedAsset(resource);
            });
            button.appendChild(deleteButton);
        }

        button.addEventListener("click", () => addResourceToCanvas(resource));
        els.resourceGallery.appendChild(button);
    });
}

function addResourceToCanvas(resource) {
    if (resource.type === "svg" || resource.src.endsWith(".svg")) {
        fabric.loadSVGFromURL(resource.src, (objects, options) => {
            const group = fabric.util.groupSVGElements(objects, options);
        prepareAssetObject(group, resource);
        state.canvas.add(group);
        state.canvas.setActiveObject(group);
        renderLayerPanel();
        commitHistory();
        state.canvas.requestRenderAll();
    });
        return;
    }

    loadFabricImage(resource.src, (img) => {
        prepareAssetObject(img, resource);
        state.canvas.add(img);
        state.canvas.setActiveObject(img);
        renderLayerPanel();
        commitHistory();
        state.canvas.requestRenderAll();
    });
}

function prepareAssetObject(object, resource) {
    const maxEdge = Math.min(state.canvas.getWidth(), state.canvas.getHeight()) * 0.24;
    const scale = maxEdge / Math.max(object.width || 1, object.height || 1);

    object.set({
        id: createId("asset"),
        kind: "asset",
        assetName: resource.name,
        layerName: resource.name,
        assetSrc: resource.src,
        assetType: resource.type || "image",
        left: state.canvas.getWidth() / 2,
        top: state.canvas.getHeight() / 2,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale
    });
    object.setCoords();
}

function renderTextPanel() {
    const activeObject = state.canvas.getActiveObject();
    const textObjects = state.canvas.getObjects().filter(isTextObject);
    els.textPanel.innerHTML = "";

    textObjects.forEach((text, index) => {
        if (!text.id) text.set("id", createId("text"));
        state.textObjects.set(text.id, text);

        const card = document.createElement("article");
        card.className = `text-card${activeObject === text ? " is-active" : ""}`;
        card.dataset.textId = text.id;

        const fillMode = text.fillMode || "color";
        const title = text.text?.trim() || `文本框 ${index + 1}`;
        const safeColor = normalizeHex(text.baseFill || text.fill || "#ffffff");
        const presetOptions = renderTextPresetOptions();

        card.innerHTML = `
            <div class="text-card-header">
                <div class="text-card-title">${escapeHTML(title)}</div>
                <label class="toggle-label">
                    <input type="checkbox" data-text-field="visible" ${text.visible ? "checked" : ""}>
                    <span>显示</span>
                </label>
                <button class="icon-button" type="button" data-text-action="delete" title="删除">×</button>
            </div>
            <textarea data-text-field="content">${escapeHTML(text.text || "")}</textarea>
            <label class="full-row">
                <span>预设方案</span>
                <select data-text-field="textPreset">
                    ${optionHTML("", "选择文本预设", "")}
                    ${presetOptions}
                </select>
            </label>
            <div class="text-control-grid">
                <label>
                    <span>字体</span>
                    <select data-text-field="fontFamily">
                        ${FONT_OPTIONS.map((font) => optionHTML(font.value, font.label, text.fontFamily)).join("")}
                    </select>
                </label>
                <label>
                    <span>字号</span>
                    <input type="number" min="1" data-text-field="fontSize" value="${Math.round(text.fontSize || 48)}">
                </label>
                <label>
                    <span>颜色</span>
                    <input type="color" data-text-field="baseFill" value="${safeColor}">
                </label>
            </div>
            <div class="fill-controls">
                <label>
                    <span>填充</span>
                    <select data-text-field="fillMode">
                        ${optionHTML("color", "纯色", fillMode)}
                        ${optionHTML("texture", "纹理", fillMode)}
                        ${optionHTML("gradient", "渐变", fillMode)}
                    </select>
                </label>
                <label class="${fillMode === "texture" ? "" : "is-hidden"}">
                    <span>纹理</span>
                    <select data-text-field="textureName">
                        ${TEXTURES.map((texture) => optionHTML(texture.id, texture.name, text.textureName || TEXTURES[0].id)).join("")}
                    </select>
                </label>
                <label class="${fillMode === "gradient" ? "" : "is-hidden"}">
                    <span>渐变一</span>
                    <input type="color" data-text-field="gradientColor1" value="${normalizeHex(text.gradientColor1 || "#fff2c8")}">
                </label>
                <label class="${fillMode === "gradient" ? "" : "is-hidden"}">
                    <span>渐变二</span>
                    <input type="color" data-text-field="gradientColor2" value="${normalizeHex(text.gradientColor2 || "#b91f31")}">
                </label>
                <label class="full-row ${fillMode === "gradient" ? "" : "is-hidden"}">
                    <span>角度</span>
                    <input type="range" min="0" max="360" step="1" data-text-field="gradientAngle" value="${text.gradientAngle ?? 0}">
                </label>
            </div>
            <div class="text-card-actions">
                <button class="ghost-button" type="button" data-text-action="duplicate">复制</button>
                <button class="tool-button" type="button" data-text-action="savePreset">保存预设</button>
            </div>
        `;

        els.textPanel.appendChild(card);
    });
}
function renderLayerPanel() {
    const objects = getLayerObjects();
    const activeObject = state.canvas.getActiveObject();
    els.layerPanel.innerHTML = "";

    if (!objects.length) {
        const note = document.createElement("div");
        note.className = "empty-panel-note";
        note.textContent = "暂无图层";
        els.layerPanel.appendChild(note);
        return;
    }

    objects.forEach((object) => {
        if (!object.id) object.set("id", createId(object.kind || "object"));
        if (!object.layerName) object.set("layerName", getObjectLayerName(object));

        const row = document.createElement("div");
        const rowClasses = ["layer-row"];
        if (activeObject === object) rowClasses.push("is-active");
        if (object.visible === false) rowClasses.push("layer-hidden");
        if (object.locked) rowClasses.push("layer-locked");
        row.className = rowClasses.join(" ");
        row.dataset.layerId = object.id;
        row.draggable = !object.isBackground;
        row.innerHTML = `
            <span class="layer-grip">${object.isBackground ? "底" : "⋮"}</span>
            <input class="layer-name" data-layer-field="name" value="${escapeHTML(object.layerName)}">
            <button class="layer-button${object.visible === false ? " is-active" : ""}" type="button" data-layer-action="visible" title="显示/隐藏">${object.visible === false ? "隐" : "显"}</button>
            <button class="layer-button${object.locked ? " is-active" : ""}" type="button" data-layer-action="lock" title="锁定/解锁">${object.locked ? "锁" : "开"}</button>
        `;
        els.layerPanel.appendChild(row);
    });
}

function getLayerObjects() {
    return state.canvas.getObjects()
        .filter((object) => object.kind !== "guide" && !object.excludeFromExport)
        .slice()
        .reverse();
}

function getObjectLayerName(object) {
    if (object.layerName) return object.layerName;
    if (object.isBackground) return "背景图";
    if (isTextObject(object)) return object.text?.trim() || "文本框";
    return object.assetName || "素材";
}

function handleLayerPanelInput(event) {
    if (event.target.dataset.layerField !== "name") return;
    const object = getObjectById(event.target.closest(".layer-row")?.dataset.layerId);
    if (!object) return;

    const name = event.target.value.trim() || getObjectLayerName(object);
    object.set("layerName", name);
    if (isTextObject(object)) {
        object.set("assetName", name);
    }
    updateSelectionLabel(object);
    scheduleHistory();
}

function handleLayerPanelClick(event) {
    const row = event.target.closest(".layer-row");
    if (!row) return;

    const object = getObjectById(row.dataset.layerId);
    if (!object) return;

    const action = event.target.dataset.layerAction;
    if (action === "visible") {
        toggleLayerVisibility(object);
        return;
    }
    if (action === "lock") {
        setLayerLocked(object, !object.locked);
        return;
    }

    if (!object.locked) {
        state.canvas.setActiveObject(object);
    } else {
        state.canvas.discardActiveObject();
    }
    updateSelectionLabel(object);
    syncTextPanelSelection();
    renderLayerPanel();
    state.canvas.requestRenderAll();
}

function toggleLayerVisibility(object) {
    object.set("visible", object.visible === false);
    if (object.visible === false && state.canvas.getActiveObject() === object) {
        state.canvas.discardActiveObject();
    }
    renderLayerPanel();
    renderTextPanel();
    state.canvas.requestRenderAll();
    commitHistory();
}

function setLayerLocked(object, locked) {
    object.set({
        locked,
        selectable: !locked,
        evented: !locked,
        lockMovementX: locked,
        lockMovementY: locked,
        lockScalingX: locked,
        lockScalingY: locked,
        lockRotation: locked
    });
    if (locked && state.canvas.getActiveObject() === object) {
        state.canvas.discardActiveObject();
    }
    renderLayerPanel();
    state.canvas.requestRenderAll();
    commitHistory();
}

function handleLayerDragStart(event) {
    const row = event.target.closest(".layer-row");
    if (!row || row.draggable === false) return;
    state.draggedLayerId = row.dataset.layerId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.draggedLayerId);
}

function handleLayerDragOver(event) {
    const row = event.target.closest(".layer-row");
    if (!row || !state.draggedLayerId || row.dataset.layerId === state.draggedLayerId) return;
    event.preventDefault();
    row.classList.add("is-drag-over");
}

function handleLayerDragLeave(event) {
    const row = event.target.closest(".layer-row");
    if (row) row.classList.remove("is-drag-over");
}

function handleLayerDrop(event) {
    const row = event.target.closest(".layer-row");
    if (!row || !state.draggedLayerId) return;
    event.preventDefault();
    els.layerPanel.querySelectorAll(".is-drag-over").forEach((item) => item.classList.remove("is-drag-over"));

    const targetId = row.dataset.layerId;
    if (targetId === state.draggedLayerId) return;

    const topDown = getLayerObjects().filter((object) => !object.isBackground);
    const draggedIndex = topDown.findIndex((object) => object.id === state.draggedLayerId);
    const targetIndex = topDown.findIndex((object) => object.id === targetId);
    if (draggedIndex < 0 || targetIndex < 0) return;

    const [dragged] = topDown.splice(draggedIndex, 1);
    topDown.splice(targetIndex, 0, dragged);
    applyLayerOrder(topDown);
    state.draggedLayerId = "";
    renderLayerPanel();
    state.canvas.requestRenderAll();
    commitHistory();
}

function applyLayerOrder(topDownObjects) {
    if (state.background) {
        state.background.moveTo(0);
    }
    const bottomToTop = topDownObjects.slice().reverse();
    let index = state.background ? 1 : 0;
    bottomToTop.forEach((object) => {
        object.moveTo(index);
        index += 1;
    });
    bringGuidesToFront();
}

function getObjectById(id) {
    if (!id) return null;
    return state.canvas.getObjects().find((object) => object.id === id) || null;
}

function optionHTML(value, label, currentValue) {
    return `<option value="${escapeHTML(value)}" ${value === currentValue ? "selected" : ""}>${escapeHTML(label)}</option>`;
}

function renderTextPresetOptions() {
    const builtIn = TEXT_PRESETS.map((preset) => optionHTML(`builtin:${preset.id}`, preset.name, "")).join("");
    const user = state.textPresets.map((preset) => optionHTML(`user:${preset.id}`, `${preset.name}（已保存）`, "")).join("");
    return `${builtIn}${user}`;
}

function resolveTextPreset(value) {
    if (!value) return null;
    if (value.startsWith("builtin:")) {
        return TEXT_PRESETS.find((item) => item.id === value.slice(8)) || null;
    }
    if (value.startsWith("user:")) {
        return state.textPresets.find((item) => item.id === value.slice(5)) || null;
    }
    return TEXT_PRESETS.find((item) => item.id === value) || null;
}

function applyTextPreset(text, presetId) {
    const preset = resolveTextPreset(presetId);
    if (!text || !preset) return false;

    Object.entries(preset.apply).forEach(([key, value]) => {
        text.set(key, value);
    });
    text.initDimensions?.();
    applyTextFill(text);
    return true;
}

function loadTextPresets() {
    state.textPresets = readJSON(STORAGE_KEYS.textPresets, [])
        .filter((preset) => preset?.id && preset?.name && preset?.apply);
}

function saveTextPresets() {
    writeJSON(STORAGE_KEYS.textPresets, state.textPresets);
}

function createTextPresetFromObject(text) {
    return {
        fontFamily: text.fontFamily || "LXGWWenKai",
        fontWeight: text.fontWeight || "normal",
        fontStyle: text.fontStyle || "normal",
        underline: !!text.underline,
        linethrough: !!text.linethrough,
        fontSize: text.fontSize || 48,
        fillMode: text.fillMode || "color",
        baseFill: text.baseFill || (typeof text.fill === "string" ? text.fill : "#ffffff"),
        textureName: text.textureName || TEXTURES[0].id,
        gradientColor1: text.gradientColor1 || "#fff2c8",
        gradientColor2: text.gradientColor2 || "#b91f31",
        gradientAngle: text.gradientAngle || 0,
        gradientKind: text.gradientKind || "",
        stroke: text.stroke || null,
        strokeWidth: text.strokeWidth || 0,
        shadow: text.shadow ? text.shadow.toObject() : null,
        charSpacing: text.charSpacing || 0,
        lineHeight: text.lineHeight || 1,
        paintFirst: text.paintFirst || "fill",
        scaleX: text.scaleX || 1,
        scaleY: text.scaleY || 1,
        angle: text.angle || 0
    };
}

function saveTextPresetFromObject(text) {
    if (!text) return;
    const baseName = `${text.text?.trim() || text.layerName || "文本预设"} 配置`;
    let name = baseName;
    if (state.textPresets.some((preset) => preset.name === name)) {
        name = `${baseName} ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`;
    }

    state.textPresets.push({
        id: createId("text-preset"),
        name,
        apply: createTextPresetFromObject(text)
    });
    saveTextPresets();
    renderTextPanel();
    syncTextPanelSelection();
    showToast("文本预设已保存");
}

function duplicateTextBox(text) {
    if (!text) return null;
    const clone = addTextBox({
        text: text.text || "文本框",
        left: (text.left || 0) + 32,
        top: (text.top || 0) + 32,
        originX: text.originX || "left",
        originY: text.originY || "top",
        fontSize: text.fontSize || 48,
        fontFamily: text.fontFamily || "LXGWWenKai",
        fill: typeof text.fill === "string" ? text.fill : text.baseFill,
        baseFill: text.baseFill || "#ffffff",
        visible: text.visible !== false,
        fontWeight: text.fontWeight || "normal",
        fontStyle: text.fontStyle || "normal",
        underline: !!text.underline,
        linethrough: !!text.linethrough,
        stroke: text.stroke || null,
        strokeWidth: text.strokeWidth || 0,
        shadow: text.shadow ? text.shadow.toObject() : null,
        scaleX: text.scaleX || 1,
        scaleY: text.scaleY || 1,
        angle: text.angle || 0,
        layerName: `${text.layerName || text.text || "文本框"} 副本`,
        fillMode: text.fillMode || "color",
        textureName: text.textureName || TEXTURES[0].id,
        gradientColor1: text.gradientColor1 || "#fff2c8",
        gradientColor2: text.gradientColor2 || "#b91f31",
        gradientAngle: text.gradientAngle || 0,
        gradientKind: text.gradientKind || "",
        locked: !!text.locked
    });
    clone.set({
        charSpacing: text.charSpacing || 0,
        lineHeight: text.lineHeight || 1,
        paintFirst: text.paintFirst || "fill"
    });
    applyTextFill(clone);
    clone.setCoords();
    state.canvas.setActiveObject(clone);
    renderTextPanel();
    renderLayerPanel();
    updateSelectionLabel(clone);
    commitHistory();
    state.canvas.requestRenderAll();
    return clone;
}

function handleTextPanelInput(event) {
    const field = event.target.dataset.textField;
    if (!field) return;

    const card = event.target.closest(".text-card");
    const text = card ? state.textObjects.get(card.dataset.textId) : null;
    if (!text) return;

    switch (field) {
        case "content":
            text.set("text", event.target.value);
            text.initDimensions();
            break;
        case "visible":
            text.set("visible", event.target.checked);
            break;
        case "fontFamily":
            text.set("fontFamily", event.target.value);
            break;
        case "fontSize":
            text.set("fontSize", parseCanvasDimension(event.target.value, text.fontSize || 48));
            text.initDimensions();
            break;
        case "baseFill":
            text.set("baseFill", event.target.value);
            text.set("gradientKind", "");
            break;
        case "fillMode":
            text.set("fillMode", event.target.value);
            text.set("gradientKind", "");
            renderTextPanel();
            break;
        case "textureName":
            text.set("textureName", event.target.value);
            text.set("gradientKind", "");
            break;
        case "gradientColor1":
        case "gradientColor2":
            text.set(field, event.target.value);
            text.set("gradientKind", "");
            break;
        case "gradientAngle":
            text.set("gradientAngle", parseInt(event.target.value, 10) || 0);
            text.set("gradientKind", "");
            break;
        case "textPreset":
            if (applyTextPreset(text, event.target.value)) {
                renderTextPanel();
            }
            break;
        default:
            break;
    }

    if (["baseFill", "fillMode", "textureName", "gradientColor1", "gradientColor2", "gradientAngle", "content", "fontSize"].includes(field)) {
        applyTextFill(text);
    }

    state.canvas.setActiveObject(text);
    syncTextPanelSelection();
    renderLayerPanel();
    scheduleHistory();
    state.canvas.requestRenderAll();
}

function handleTextPanelClick(event) {
    const card = event.target.closest(".text-card");
    if (!card) return;

    const text = state.textObjects.get(card.dataset.textId);
    if (!text) return;

    const action = event.target.dataset.textAction;
    if (action === "delete") {
        removeTextBox(text);
        return;
    }
    if (action === "duplicate") {
        duplicateTextBox(text);
        return;
    }
    if (action === "savePreset") {
        saveTextPresetFromObject(text);
        return;
    }

    state.canvas.setActiveObject(text);
    syncTextPanelSelection();
    updateSelectionLabel(text);
    state.canvas.requestRenderAll();
}

function handleTextPanelContextMenu(event) {
    const card = event.target.closest(".text-card");
    if (!card) return;

    const text = state.textObjects.get(card.dataset.textId);
    if (!text) return;

    event.preventDefault();
    state.canvas.setActiveObject(text);
    openTextContextMenu(text, event.clientX, event.clientY);
    syncTextPanelSelection();
}

function applyTextFill(text) {
    const mode = text.fillMode || "color";

    if (text.gradientKind === "goldTitle") {
        text.set("fill", createGoldTitleTextGradient(text));
        state.canvas.requestRenderAll();
        return;
    }

    if (mode === "color") {
        text.set("fill", text.baseFill || "#ffffff");
        state.canvas.requestRenderAll();
        return;
    }

    if (mode === "gradient") {
        text.set("fill", createTextGradient(text));
        state.canvas.requestRenderAll();
        return;
    }

    const texture = TEXTURES.find((item) => item.id === text.textureName) || TEXTURES[0];
    fabric.util.loadImage(texture.src, (img) => {
        if (!img || !state.textObjects.has(text.id)) return;
        text.set("fill", new fabric.Pattern({
            source: img,
            repeat: "repeat"
        }));
        text.set("textureName", texture.id);
        state.canvas.requestRenderAll();
    }, null, "anonymous");
}

function createTextGradient(text) {
    const angle = fabric.util.degreesToRadians(parseInt(text.gradientAngle || 0, 10));
    const length = Math.max(text.width || 1, text.height || 1, 1);
    return new fabric.Gradient({
        type: "linear",
        gradientUnits: "pixels",
        coords: {
            x1: 0,
            y1: 0,
            x2: Math.cos(angle) * length,
            y2: Math.sin(angle) * length
        },
        colorStops: [
            { offset: 0, color: text.gradientColor1 || "#fff2c8" },
            { offset: 1, color: text.gradientColor2 || "#b91f31" }
        ]
    });
}

function createGoldTitleTextGradient(text) {
    const height = Math.max(text.height || text.fontSize || 120, 1);
    return new fabric.Gradient({
        type: "linear",
        gradientUnits: "pixels",
        coords: { x1: 0, y1: -height / 2, x2: 0, y2: height / 2 },
        colorStops: [
            { offset: 0, color: "#fffef0" },
            { offset: 0.18, color: "#fff39a" },
            { offset: 0.5, color: "#ffd851" },
            { offset: 0.78, color: "#fff47f" },
            { offset: 1, color: "#e0a42d" }
        ]
    });
}

function removeTextBox(text) {
    if (!text) return;
    state.textObjects.delete(text.id);
    state.canvas.remove(text);
    closeTextContextMenu();
    renderTextPanel();
    renderLayerPanel();
    updateSelectionLabel(null);
    commitHistory();
    state.canvas.requestRenderAll();
}

function handleCanvasContextMenu(event) {
    const target = state.canvas.findTarget(event, true);
    if (!isTextObject(target)) return;

    event.preventDefault();
    state.canvas.setActiveObject(target);
    openTextContextMenu(target, event.clientX, event.clientY);
    syncTextPanelSelection();
}

function openTextContextMenu(text, x, y) {
    state.contextText = text;
    updateContextMenuState();

    const menu = els.textContextMenu;
    menu.hidden = false;
    const bounds = menu.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - bounds.width - 10);
    const top = Math.min(y, window.innerHeight - bounds.height - 10);
    menu.style.left = `${Math.max(10, left)}px`;
    menu.style.top = `${Math.max(10, top)}px`;
}

function closeTextContextMenu() {
    els.textContextMenu.hidden = true;
    state.contextText = null;
}

function updateContextMenuState() {
    const text = state.contextText;
    if (!text) return;

    const activeMap = {
        bold: text.fontWeight === "bold",
        italic: text.fontStyle === "italic",
        underline: !!text.underline,
        strike: !!text.linethrough,
        shadow: !!text.shadow,
        stroke: !!text.stroke && text.strokeWidth > 0
    };

    els.textContextMenu.querySelectorAll("[data-style-action]").forEach((button) => {
        const action = button.dataset.styleAction;
        button.classList.toggle("is-active", !!activeMap[action]);
    });

    els.contextStrokeColor.value = normalizeHex(text.stroke || "#111111");
    els.contextStrokeWidth.value = Math.max(1, Math.round(text.strokeWidth || 3));
}

function handleContextMenuClick(event) {
    const action = event.target.dataset.styleAction;
    if (!action || !state.contextText) return;

    const text = state.contextText;
    switch (action) {
        case "bold":
            text.set("fontWeight", text.fontWeight === "bold" ? "normal" : "bold");
            break;
        case "italic":
            text.set("fontStyle", text.fontStyle === "italic" ? "normal" : "italic");
            break;
        case "underline":
            text.set("underline", !text.underline);
            break;
        case "strike":
            text.set("linethrough", !text.linethrough);
            break;
        case "shadow":
            applyTextShadow(text, !text.shadow);
            break;
        case "stroke":
            toggleTextStroke(text);
            break;
        case "deleteText":
            removeTextBox(text);
            return;
        default:
            break;
    }

    updateContextMenuState();
    renderTextPanel();
    state.canvas.requestRenderAll();
    scheduleHistory();
}

function applyTextShadow(text, enabled) {
    if (!enabled) {
        text.set("shadow", null);
        return;
    }

    text.set("shadow", new fabric.Shadow({
        color: "rgba(20, 12, 5, 0.55)",
        blur: 16,
        offsetX: 5,
        offsetY: 7,
        nonScaling: true
    }));
}

function toggleTextStroke(text) {
    const enabled = !!text.stroke && text.strokeWidth > 0;
    if (enabled) {
        text.set({ stroke: null, strokeWidth: 0 });
        return;
    }

    text.set({
        stroke: els.contextStrokeColor.value || "#111111",
        strokeWidth: parseInt(els.contextStrokeWidth.value, 10) || 3
    });
}

function updateContextStroke() {
    const text = state.contextText;
    if (!text) return;

    text.set({
        stroke: els.contextStrokeColor.value || "#111111",
        strokeWidth: parseInt(els.contextStrokeWidth.value, 10) || 3
    });
    updateContextMenuState();
    state.canvas.requestRenderAll();
}

function handleSelectionChange(event) {
    const target = event.selected?.[0] || event.target;
    updateSelectionLabel(target);
    syncTextPanelSelection({ scrollIntoView: true });
    renderLayerPanel();
}

function handleSelectionCleared() {
    updateSelectionLabel(null);
    syncTextPanelSelection();
    renderLayerPanel();
    closeTextContextMenu();
}

function handleObjectModified(event) {
    if (event.target === state.background) {
        constrainBackgroundImage();
    }
    if (isTextObject(event.target)) {
        renderTextPanel();
    }
    renderLayerPanel();
    updateSelectionLabel(event.target);
    scheduleHistory();
    state.canvas.requestRenderAll();
}

function handleObjectMoving(event) {
    if (event.target === state.background) {
        constrainBackgroundImage();
    }
}

function handleObjectScaling(event) {
    if (event.target === state.background) {
        constrainBackgroundImage();
    }
}

function handleTextChanged(event) {
    const target = event.target;
    if (!isTextObject(target)) return;
    const input = els.textPanel.querySelector(`[data-text-id="${target.id}"] [data-text-field="content"]`);
    if (input) input.value = target.text;
    scheduleHistory();
}

function handleCanvasMutation(event) {
    if (state.history.restoring || event.target?.kind === "guide" || event.target?.excludeFromExport) return;
    renderLayerPanel();
    scheduleHistory();
}

function handleCanvasMouseDown(event) {
    if (event.target || event.e.button !== 0 || event.e.altKey) return;
    beginStagePan(event.e);
}

function prioritizeActiveTextForPointer(event) {
    const active = state.canvas.getActiveObject();
    if (!isTextObject(active) || active.locked || active.isEditing) return;

    const pointer = state.canvas.getPointer(event, true);
    const bounds = active.getBoundingRect(true, true);
    const padding = Math.max(24, active.cornerSize || 13);
    const insideActiveArea = pointer.x >= bounds.left - padding
        && pointer.x <= bounds.left + bounds.width + padding
        && pointer.y >= bounds.top - padding
        && pointer.y <= bounds.top + bounds.height + padding;
    if (!insideActiveArea) return;

    active.bringToFront();
    bringGuidesToFront();
    state.canvas.setActiveObject(active);
    state.canvas.requestRenderAll();
}

function handleViewportPointerDown(event) {
    if (event.target !== els.viewport || event.button !== 0) return;
    beginStagePan(event);
}

function beginStagePan(event) {
    state.view.panning = {
        startX: event.clientX,
        startY: event.clientY,
        panX: state.view.panX,
        panY: state.view.panY
    };
    els.viewport.classList.add("is-panning");
}

function handleStagePointerMove(event) {
    if (!state.view.panning) return;
    state.view.panX = state.view.panning.panX + event.clientX - state.view.panning.startX;
    state.view.panY = state.view.panning.panY + event.clientY - state.view.panning.startY;
    applyStageTransform();
}

function endStagePan() {
    if (!state.view.panning) return;
    state.view.panning = null;
    els.viewport.classList.remove("is-panning");
}

function handleStageWheel(event) {
    if (!state.canvas?.wrapperEl || !els.viewport.contains(event.target)) return;
    event.preventDefault();
    const oldZoom = state.view.zoom;
    const nextZoom = clamp(oldZoom * (event.deltaY < 0 ? 1.1 : 0.9), 0.25, 5);
    if (Math.abs(nextZoom - oldZoom) < 0.001) return;

    const rect = state.canvas.wrapperEl.getBoundingClientRect();
    const pointerX = event.clientX - (rect.left + rect.width / 2);
    const pointerY = event.clientY - (rect.top + rect.height / 2);
    const factor = nextZoom / oldZoom;
    state.view.panX = pointerX - (pointerX - state.view.panX) * factor;
    state.view.panY = pointerY - (pointerY - state.view.panY) * factor;
    state.view.zoom = nextZoom;
    applyStageTransform();
}

function resetCanvasView() {
    state.view.zoom = 1;
    state.view.panX = 0;
    state.view.panY = 0;
    applyStageTransform();
}

function applyStageTransform() {
    if (!state.canvas?.wrapperEl) return;
    state.canvas.wrapperEl.style.transform = `translate(${state.view.panX}px, ${state.view.panY}px) scale(${state.view.zoom})`;
    els.zoomLabel.textContent = `${Math.round(state.view.zoom * 100)}%`;
    state.canvas.calcOffset();
}

function handleAlignToolClick(event) {
    const action = event.target.dataset.align;
    if (!action) return;
    alignSelectedObjects(action);
}

function getSelectedObjects() {
    const active = state.canvas.getActiveObject();
    if (!active) return [];
    if (active.type === "activeSelection") {
        return active.getObjects().filter((object) => !object.locked && object.kind !== "guide");
    }
    return active.locked || active.kind === "guide" ? [] : [active];
}

function alignSelectedObjects(action) {
    const objects = getSelectedObjects();
    if (!objects.length) {
        showToast("请选择可编辑对象");
        return;
    }

    if (action === "distributeX" || action === "distributeY") {
        distributeObjects(objects, action === "distributeX" ? "x" : "y");
    } else {
        objects.forEach((object) => alignObjectToCanvas(object, action));
    }

    objects.forEach((object) => object.setCoords());
    state.canvas.requestRenderAll();
    renderLayerPanel();
    commitHistory();
}

function alignObjectToCanvas(object, action) {
    const canvasWidth = state.canvas.getWidth();
    const canvasHeight = state.canvas.getHeight();
    const center = object.getCenterPoint();
    const bounds = object.getBoundingRect(true, true);

    if (action === "centerX") {
        object.setPositionByOrigin(new fabric.Point(canvasWidth / 2, center.y), "center", "center");
        return;
    }
    if (action === "centerY") {
        object.setPositionByOrigin(new fabric.Point(center.x, canvasHeight / 2), "center", "center");
        return;
    }

    const patch = {};
    if (action === "left") patch.left = object.left + (0 - bounds.left);
    if (action === "right") patch.left = object.left + (canvasWidth - (bounds.left + bounds.width));
    if (action === "top") patch.top = object.top + (0 - bounds.top);
    if (action === "bottom") patch.top = object.top + (canvasHeight - (bounds.top + bounds.height));
    object.set(patch);
}

function distributeObjects(objects, axis) {
    if (objects.length < 3) {
        showToast("等距需要至少 3 个对象");
        return;
    }

    const sorted = objects.slice().sort((a, b) => {
        const ac = a.getCenterPoint();
        const bc = b.getCenterPoint();
        return axis === "x" ? ac.x - bc.x : ac.y - bc.y;
    });
    const first = sorted[0].getCenterPoint();
    const last = sorted[sorted.length - 1].getCenterPoint();
    const start = axis === "x" ? first.x : first.y;
    const end = axis === "x" ? last.x : last.y;
    const gap = (end - start) / (sorted.length - 1);

    sorted.forEach((object, index) => {
        const center = object.getCenterPoint();
        const point = axis === "x"
            ? new fabric.Point(start + gap * index, center.y)
            : new fabric.Point(center.x, start + gap * index);
        object.setPositionByOrigin(point, "center", "center");
    });
}

function toggleGuides() {
    state.guidesVisible = !state.guidesVisible;
    els.toggleGuidesBtn.classList.toggle("is-active", state.guidesVisible);
    updateGuides();
    state.canvas.requestRenderAll();
}

function updateGuides() {
    state.guides.forEach((guide) => state.canvas.remove(guide));
    state.guides = [];
    if (!state.guidesVisible) return;

    const width = state.canvas.getWidth();
    const height = state.canvas.getHeight();
    const guideSpecs = [
        [width / 2, 0, width / 2, height],
        [0, height / 2, width, height / 2],
        [width / 3, 0, width / 3, height],
        [(width * 2) / 3, 0, (width * 2) / 3, height],
        [0, height / 3, width, height / 3],
        [0, (height * 2) / 3, width, (height * 2) / 3]
    ];

    state.guides = guideSpecs.map((points, index) => new fabric.Line(points, {
        kind: "guide",
        id: `guide-${index}`,
        stroke: index < 2 ? "#c99a32" : "#2d6a4f",
        strokeWidth: index < 2 ? 2 : 1,
        strokeDashArray: [10, 8],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        opacity: index < 2 ? 0.85 : 0.55
    }));
    state.guides.forEach((guide) => state.canvas.add(guide));
    bringGuidesToFront();
}

function bringGuidesToFront() {
    state.guides.forEach((guide) => guide.bringToFront());
}

function syncTextPanelSelection(options = {}) {
    const activeObject = state.canvas.getActiveObject();
    let activeCard = null;
    els.textPanel.querySelectorAll(".text-card").forEach((card) => {
        const text = state.textObjects.get(card.dataset.textId);
        const isActive = text === activeObject;
        card.classList.toggle("is-active", isActive);
        if (isActive) activeCard = card;
    });
    if (options.scrollIntoView && activeCard) {
        activeCard.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
}

function updateSelectionLabel(target) {
    if (!target) {
        els.activeObjectLabel.textContent = "未选择对象";
        return;
    }
    if (target === state.background || target.isBackground) {
        els.activeObjectLabel.textContent = "背景图";
        return;
    }
    if (isTextObject(target)) {
        els.activeObjectLabel.textContent = `文本：${target.text || "空文本"}`;
        return;
    }
    els.activeObjectLabel.textContent = target.assetName ? `素材：${target.assetName}` : "已选择对象";
}

function saveResolutionPreset() {
    const name = els.resolutionPresetName.value.trim();
    if (!name) {
        showToast("请输入分辨率方案名");
        return;
    }

    const preset = {
        name,
        width: parseCanvasDimension(els.width.value, state.canvas.getWidth()),
        height: parseCanvasDimension(els.height.value, state.canvas.getHeight())
    };

    const existingIndex = state.resolutionPresets.findIndex((item) => item.name === name);
    if (existingIndex >= 0) {
        state.resolutionPresets[existingIndex] = preset;
    } else {
        state.resolutionPresets.push(preset);
    }

    saveResolutionPresets();
    renderResolutionPresets(`user:${name}`);
    showToast("分辨率方案已保存");
}

function loadSelectedResolutionPreset() {
    const preset = findSelectedResolutionPreset();
    if (!preset) {
        showToast("请选择分辨率方案");
        return;
    }

    setCanvasSize(preset.width, preset.height, { scalePositions: true });
    showToast("分辨率方案已加载");
}

function deleteSelectedResolutionPreset() {
    const value = els.resolutionPresetSelect.value;
    if (!value.startsWith("user:")) {
        showToast("内置方案不可删除");
        return;
    }

    const name = value.slice(5);
    state.resolutionPresets = state.resolutionPresets.filter((preset) => preset.name !== name);
    saveResolutionPresets();
    renderResolutionPresets();
    showToast("分辨率方案已删除");
}

function findSelectedResolutionPreset() {
    const value = els.resolutionPresetSelect.value;
    if (value.startsWith("default:")) {
        return DEFAULT_RESOLUTION_PRESETS[parseInt(value.slice(8), 10)];
    }
    if (value.startsWith("user:")) {
        const name = value.slice(5);
        return state.resolutionPresets.find((preset) => preset.name === name);
    }
    return null;
}

function renderResolutionPresets(selectedValue = "") {
    els.resolutionPresetSelect.innerHTML = "";
    const placeholder = new Option("选择分辨率方案", "");
    els.resolutionPresetSelect.appendChild(placeholder);

    const defaultGroup = document.createElement("optgroup");
    defaultGroup.label = "内置";
    DEFAULT_RESOLUTION_PRESETS.forEach((preset, index) => {
        defaultGroup.appendChild(new Option(preset.name, `default:${index}`));
    });
    els.resolutionPresetSelect.appendChild(defaultGroup);

    const userGroup = document.createElement("optgroup");
    userGroup.label = "已保存";
    state.resolutionPresets.forEach((preset) => {
        userGroup.appendChild(new Option(`${preset.name} (${preset.width} x ${preset.height})`, `user:${preset.name}`));
    });
    els.resolutionPresetSelect.appendChild(userGroup);
    els.resolutionPresetSelect.value = selectedValue;
}

function loadResolutionPresets() {
    state.resolutionPresets = readJSON(STORAGE_KEYS.resolutionPresets, []);
}

function saveResolutionPresets() {
    writeJSON(STORAGE_KEYS.resolutionPresets, state.resolutionPresets);
}

function saveTemplate() {
    const name = els.templateName.value.trim();
    if (!name) {
        showToast("请输入作品方案名");
        return;
    }

    const template = buildTemplateSnapshot(name);
    state.templates[name] = template;
    writeJSON(STORAGE_KEYS.templates, state.templates);
    renderTemplateSelect(name);
    showToast("作品方案已保存");
}

function loadSelectedTemplate() {
    const name = els.templateSelect.value;
    if (!name || !state.templates[name]) {
        showToast("请选择作品方案");
        return;
    }
    loadTemplate(name);
}

function loadTemplate(name) {
    const template = state.templates[name];
    if (!template) return;

    restoreSnapshot(template);
    setTimeout(() => {
        showToast("作品方案已加载");
    }, 50);
}

function deleteSelectedTemplate() {
    const name = els.templateSelect.value;
    if (!name || !state.templates[name]) {
        showToast("请选择作品方案");
        return;
    }

    delete state.templates[name];
    writeJSON(STORAGE_KEYS.templates, state.templates);
    renderTemplateSelect();
    showToast("作品方案已删除");
}

function restoreLoadedObjects() {
    state.canvas.getObjects().forEach((object) => {
        if (!object.id) object.set("id", createId(object.kind || "object"));
        if (!object.layerName) object.set("layerName", getObjectLayerName(object));

        if (object.isBackground || object.kind === "background") {
            state.background = object;
            object.set({
                isBackground: true,
                kind: "background",
                originX: object.originX || "center",
                originY: object.originY || "center"
            });
            object.sendToBack();
        }

        if (isTextObject(object)) {
            object.set({
                kind: "text",
                layerName: object.layerName || object.text || "文本框",
                baseFill: object.baseFill || (typeof object.fill === "string" ? object.fill : "#ffffff"),
                fillMode: object.fillMode || "color",
                textureName: object.textureName || TEXTURES[0].id,
                gradientColor1: object.gradientColor1 || "#fff2c8",
                gradientColor2: object.gradientColor2 || "#b91f31",
                gradientAngle: object.gradientAngle || 0
            });
            state.textObjects.set(object.id, object);
            if (object.gradientKind === "goldTitle" || object.fillMode === "texture" || object.fillMode === "gradient") {
                applyTextFill(object);
            }
        }

        if (object.locked) {
            setLayerLocked(object, true);
        }
    });
    bringGuidesToFront();
}

function loadTemplates() {
    state.templates = readJSON(STORAGE_KEYS.templates, {});
}

function loadDraftSnapshot() {
    const draft = readJSON(STORAGE_KEYS.draft, null);
    if (!draft || !draft.canvas || !draft.json || !Array.isArray(draft.json.objects)) return null;
    return draft;
}

function restoreDraftSnapshot() {
    const draft = loadDraftSnapshot();
    if (!draft) return false;

    restoreSnapshot(draft, {
        skipHistoryReset: true,
        afterRestore: finishCanvasStartup
    });
    return true;
}

function saveDraftSnapshot() {
    if (!state.canvas || state.history.restoring) return;
    writeJSON(STORAGE_KEYS.draft, buildTemplateSnapshot("__draft__"));
}

function renderTemplateSelect(selectedName = "") {
    els.templateSelect.innerHTML = "";
    els.templateSelect.appendChild(new Option("选择作品方案", ""));
    Object.keys(state.templates).forEach((name) => {
        els.templateSelect.appendChild(new Option(name, name));
    });
    els.templateSelect.value = selectedName;
}

function buildTemplateSnapshot(name = "") {
    const json = state.canvas.toJSON(FABRIC_CUSTOM_PROPS);
    json.objects = (json.objects || []).filter((object) => object.kind !== "guide");
    return {
        name: name || els.templateName.value.trim() || `作品_${Date.now()}`,
        savedAt: new Date().toISOString(),
        canvas: {
            width: state.canvas.getWidth(),
            height: state.canvas.getHeight(),
            backgroundColor: state.canvas.backgroundColor
        },
        json
    };
}

function snapshotToString() {
    return JSON.stringify(buildTemplateSnapshot("__history__"));
}

function resetHistory() {
    const snapshot = snapshotToString();
    state.history.enabled = true;
    state.history.restoring = false;
    state.history.undo = [snapshot];
    state.history.redo = [];
    state.history.lastSnapshot = snapshot;
    updateHistoryButtons();
}

function scheduleHistory() {
    if (!state.history.enabled || state.history.restoring) return;
    clearTimeout(state.history.timer);
    state.history.timer = setTimeout(() => commitHistory(), 260);
}

function commitHistory() {
    if (!state.history.enabled || state.history.restoring) return;
    clearTimeout(state.history.timer);
    const snapshot = snapshotToString();
    if (snapshot === state.history.lastSnapshot) {
        saveDraftSnapshot();
        return;
    }
    state.history.undo.push(snapshot);
    if (state.history.undo.length > 80) state.history.undo.shift();
    state.history.redo = [];
    state.history.lastSnapshot = snapshot;
    updateHistoryButtons();
    saveDraftSnapshot();
}

function undoHistory() {
    if (state.history.undo.length <= 1) return;
    const current = state.history.undo.pop();
    state.history.redo.push(current);
    const previous = state.history.undo[state.history.undo.length - 1];
    restoreSnapshot(JSON.parse(previous), { fromHistory: true });
    state.history.lastSnapshot = previous;
    updateHistoryButtons();
}

function redoHistory() {
    if (!state.history.redo.length) return;
    const snapshot = state.history.redo.pop();
    state.history.undo.push(snapshot);
    restoreSnapshot(JSON.parse(snapshot), { fromHistory: true });
    state.history.lastSnapshot = snapshot;
    updateHistoryButtons();
}

function updateHistoryButtons() {
    if (!els.undoBtn || !els.redoBtn) return;
    els.undoBtn.disabled = state.history.undo.length <= 1;
    els.redoBtn.disabled = state.history.redo.length === 0;
}

function exportTemplateJSON() {
    const template = buildTemplateSnapshot();
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `${template.name}.json`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
}

async function importTemplateJSON(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const template = JSON.parse(await file.text());
        validateTemplateJSON(template);
        const name = template.name || file.name.replace(/\.json$/i, "");
        template.name = name;
        state.templates[name] = template;
        writeJSON(STORAGE_KEYS.templates, state.templates);
        renderTemplateSelect(name);
        restoreSnapshot(template);
        showToast("JSON 已导入");
    } catch (error) {
        console.error(error);
        showToast("JSON 导入失败");
    } finally {
        event.target.value = "";
    }
}

function validateTemplateJSON(template) {
    if (!template || typeof template !== "object") throw new Error("Invalid template");
    if (!template.canvas || !template.json) throw new Error("Missing canvas data");
    if (!Array.isArray(template.json.objects)) throw new Error("Missing object list");
}

function restoreSnapshot(template, options = {}) {
    state.history.restoring = true;
    state.background = null;
    state.textObjects.clear();
    state.canvas.clear();
    state.canvas.setWidth(template.canvas.width);
    state.canvas.setHeight(template.canvas.height);
    state.canvas.backgroundColor = template.canvas.backgroundColor || DEFAULT_CANVAS.backgroundColor;

    state.canvas.loadFromJSON(template.json, () => {
        restoreLoadedObjects();
        els.width.value = state.canvas.getWidth();
        els.height.value = state.canvas.getHeight();
        els.bgColor.value = normalizeHex(state.canvas.backgroundColor || DEFAULT_CANVAS.backgroundColor);
        updateCanvasLabels();
        updateGuides();
        adjustCanvasDisplay();
        renderTextPanel();
        renderLayerPanel();
        state.canvas.requestRenderAll();
        state.history.restoring = false;
        if (!options.fromHistory && !options.skipHistoryReset) resetHistory();
        if (!options.fromHistory) saveDraftSnapshot();
        options.afterRestore?.();
    });
}

function loadUserAssets() {
    const assets = readJSON(STORAGE_KEYS.userAssets, []);
    state.userAssets = assets.filter((asset) => asset.src && !asset.temporary);
}

function saveUserAssets() {
    const persistentAssets = state.userAssets.filter((asset) => !asset.temporary);
    writeJSON(STORAGE_KEYS.userAssets, persistentAssets);
}

async function syncAssetsFromServer(options = {}) {
    if (!location.protocol.startsWith("http")) return;

    try {
        const response = await fetch("api/assets");
        if (!response.ok) throw new Error("assets api failed");
        const data = await response.json();
        const serverAssets = (data.assets || []).map((asset) => ({
            id: asset.id || createId("asset"),
            name: asset.name || asset.src.split("/").pop(),
            type: "image",
            src: asset.src,
            uploaded: true,
            thumbnailSrc: asset.thumbnailSrc || asset.src
        }));

        const merged = new Map();
        state.userAssets.forEach((asset) => merged.set(asset.src, asset));
        serverAssets.forEach((asset) => merged.set(asset.src, { ...merged.get(asset.src), ...asset }));
        state.userAssets = [...merged.values()].filter((asset) => asset.src);
        saveUserAssets();
        renderResourceGallery();
        if (!options.silent) showToast("素材索引已刷新");
    } catch (error) {
        console.warn(error);
        if (!options.silent) showToast("素材索引刷新失败");
    }
}

async function deleteUploadedAsset(asset) {
    if (!asset?.src || !asset.src.startsWith("image/uploads/")) return;

    try {
        const response = await fetch(`api/assets?src=${encodeURIComponent(asset.src)}`, { method: "DELETE" });
        if (!response.ok) throw new Error("delete failed");
        state.userAssets = state.userAssets.filter((item) => item.src !== asset.src);
        saveUserAssets();
        renderResourceGallery();
        showToast("素材已删除");
    } catch (error) {
        console.warn(error);
        showToast("素材删除失败");
    }
}

async function cleanupUnusedAssets() {
    try {
        const keep = collectReferencedUploadSources();
        const response = await fetch("api/assets/cleanup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keep })
        });
        if (!response.ok) throw new Error("cleanup failed");
        const data = await response.json();
        const removed = new Set(data.removed || []);
        state.userAssets = state.userAssets.filter((asset) => !removed.has(asset.src));
        saveUserAssets();
        renderResourceGallery();
        showToast(`已清理 ${removed.size} 个文件`);
    } catch (error) {
        console.warn(error);
        showToast("清理无用文件失败");
    }
}

function collectReferencedUploadSources() {
    const keep = new Set();
    const visit = (value) => {
        if (!value) return;
        if (typeof value === "string") {
            if (value.startsWith("image/uploads/")) keep.add(value);
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }
        if (typeof value === "object") {
            Object.values(value).forEach(visit);
        }
    };

    state.userAssets.forEach((asset) => visit(asset.src));
    state.canvas.getObjects().forEach((object) => {
        visit(object.assetSrc);
        visit(object.originalSrc);
        visit(object.getSrc?.());
    });
    Object.values(state.templates).forEach(visit);
    return [...keep];
}

function exportImage() {
    state.canvas.discardActiveObject();
    closeTextContextMenu();
    const guideVisibility = state.guides.map((guide) => guide.visible);
    state.guides.forEach((guide) => guide.set("visible", false));
    state.canvas.requestRenderAll();

    const now = new Date();
    const timestamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
        "_",
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0")
    ].join("");

    const link = document.createElement("a");
    link.download = `xibao_${timestamp}.png`;
    link.href = state.canvas.toDataURL({
        format: "png",
        quality: 1,
        multiplier: 1,
        enableRetinaScaling: false
    });
    document.body.appendChild(link);
    link.click();
    link.remove();
    state.guides.forEach((guide, index) => guide.set("visible", guideVisibility[index]));
    state.canvas.requestRenderAll();
}

function deleteFabricObject(eventData, transform) {
    const target = transform.target;
    if (!target) return false;

    if (target === state.background || target.isBackground) {
        state.background = null;
        els.bgImage.value = "";
        els.bgOpacity.value = "1";
    }

    if (isTextObject(target)) {
        removeTextBox(target);
        return true;
    }

    state.canvas.remove(target);
    renderTextPanel();
    renderLayerPanel();
    updateSelectionLabel(null);
    commitHistory();
    state.canvas.requestRenderAll();
    return true;
}

function renderDeleteIcon(ctx, left, top, styleOverride, fabricObject) {
    const size = 24;
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
    ctx.fillStyle = "#b91f31";
    ctx.beginPath();
    ctx.roundRect(-size / 2, -size / 2, size, size, 6);
    ctx.fill();
    ctx.strokeStyle = "#fffaf0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.lineTo(5, 5);
    ctx.moveTo(5, -5);
    ctx.lineTo(-5, 5);
    ctx.stroke();
    ctx.restore();
}

function handleKeyboard(event) {
    const activeElement = document.activeElement;
    const editingField = activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
    const activeObject = state.canvas.getActiveObject();

    if (event.key === "Escape") {
        closeTextContextMenu();
        return;
    }

    if (!activeObject || editingField || activeObject.isEditing) return;

    if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (isTextObject(activeObject)) {
            removeTextBox(activeObject);
        } else {
            deleteFabricObject(null, { target: activeObject });
        }
        return;
    }

    const movement = event.shiftKey ? 10 : 1;
    const moves = {
        ArrowLeft: [-movement, 0],
        ArrowRight: [movement, 0],
        ArrowUp: [0, -movement],
        ArrowDown: [0, movement]
    };

    if (!moves[event.key]) return;
    event.preventDefault();
    const [dx, dy] = moves[event.key];
    activeObject.set({
        left: activeObject.left + dx,
        top: activeObject.top + dy
    });
    activeObject.setCoords();
    if (activeObject === state.background) constrainBackgroundImage();
    state.canvas.requestRenderAll();
}

function adjustCanvasDisplay() {
    if (!state.canvas || !els.viewport) return;

    const viewportRect = els.viewport.getBoundingClientRect();
    const availableWidth = Math.max(260, viewportRect.width - 48);
    const availableHeight = Math.max(260, viewportRect.height - 48);
    const scale = Math.min(
        availableWidth / state.canvas.getWidth(),
        availableHeight / state.canvas.getHeight(),
        1
    );

    const displayWidth = Math.max(1, state.canvas.getWidth() * scale);
    const displayHeight = Math.max(1, state.canvas.getHeight() * scale);
    state.canvas.setDimensions({ width: displayWidth, height: displayHeight }, { cssOnly: true });

    if (state.canvas.wrapperEl) {
        state.canvas.wrapperEl.style.width = `${displayWidth}px`;
        state.canvas.wrapperEl.style.height = `${displayHeight}px`;
    }
    applyStageTransform();
}

function updateCanvasLabels() {
    const width = state.canvas.getWidth();
    const height = state.canvas.getHeight();
    els.canvasInfo.textContent = `${width} x ${height}`;
    els.width.value = width;
    els.height.value = height;
}

function isTextObject(object) {
    return !!object && ["i-text", "textbox", "text"].includes(object.type);
}

function normalizeHex(value) {
    if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) return value;
    return "#ffffff";
}

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function readJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        console.warn(`读取本地缓存失败: ${key}`, error);
        return fallback;
    }
}

function writeJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`写入本地缓存失败: ${key}`, error);
        showToast("本地缓存写入失败");
    }
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast-message";
    toast.textContent = message;
    els.toastHost.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 2200);
}
