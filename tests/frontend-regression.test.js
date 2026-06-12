const assert = require("assert");
const fs = require("fs");
const path = require("path");

const config = require("../js/config.js");
const utils = require("../js/utils.js");

const ROOT = path.resolve(__dirname, "..");
const MOJIBAKE_PATTERNS = [
    "鏂",
    "鏈",
    "瀵",
    "硅",
    "薄",
    "閫",
    "夋",
    "嫨",
    "鐜",
    "囩",
    "柟",
    "妗",
    "浣",
    "搧",
    "绱",
    "潗",
    "鍥",
    "墖",
    "鍔",
    "犺",
    "澶",
    "辫",
    "触",
    "锛",
    "脳",
    "�"
];

function readProjectFile(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function assertNoMojibake(relativePath) {
    const text = readProjectFile(relativePath);
    const hits = MOJIBAKE_PATTERNS.filter((pattern) => text.includes(pattern));
    assert.deepStrictEqual(hits, [], `${relativePath} contains suspicious mojibake: ${hits.join(", ")}`);
}

assert.strictEqual(config.DEFAULT_CANVAS.width, 1920);
assert.strictEqual(config.TEXT_PRESETS[0].name, "金字标题");
assert.ok(config.FONT_OPTIONS.some((font) => font.value === "SimHei" && font.label === "黑体"));
assert.ok(config.FABRIC_CUSTOM_PROPS.includes("gradientKind"));

assert.strictEqual(utils.normalizeHex("#abc123"), "#abc123");
assert.strictEqual(utils.normalizeHex("red"), "#ffffff");
assert.strictEqual(utils.escapeHTML("<喜报 & \"文本\">"), "&lt;喜报 &amp; &quot;文本&quot;&gt;");
assert.strictEqual(utils.isTextObject({ type: "i-text" }), true);
assert.strictEqual(utils.isTextObject({ type: "image" }), false);

["index.html", "script.js", "styles.css", "app.py", "js/config.js", "js/utils.js"].forEach(assertNoMojibake);

assert.match(readProjectFile("index.html"), /<script src="js\/config\.js"><\/script>\s*<script src="js\/utils\.js"><\/script>\s*<script src="script\.js"><\/script>/);

console.log("frontend regression checks passed");
