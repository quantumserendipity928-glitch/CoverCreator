(function (global) {
    "use strict";

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

    const utils = {
        isTextObject,
        normalizeHex,
        escapeHTML
    };

    global.CoverCreatorUtils = utils;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = utils;
    }
})(typeof window !== "undefined" ? window : globalThis);
