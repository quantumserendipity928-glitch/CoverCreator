(function (global) {
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

    const config = {
        STORAGE_KEYS,
        DEFAULT_CANVAS,
        BUILTIN_ASSETS,
        TEXTURES,
        FONT_OPTIONS,
        TEXT_PRESETS,
        DEFAULT_RESOLUTION_PRESETS,
        FABRIC_CUSTOM_PROPS
    };

    global.CoverCreatorConfig = config;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = config;
    }
})(typeof window !== "undefined" ? window : globalThis);
