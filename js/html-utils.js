/**
 * Artifex - HTML utilities
 */

var HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, function (ch) { return HTML_ESCAPE_MAP[ch]; });
}

var _reLineSep = new RegExp(String.fromCharCode(0x2028), 'g');
var _reParaSep = new RegExp(String.fromCharCode(0x2029), 'g');

function escapeJsStr(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\0/g, '\\0')
        .replace(_reLineSep, '\\u2028')
        .replace(_reParaSep, '\\u2029')
        .replace(/</g, '\\x3c')
        .replace(/>/g, '\\x3e');
}

var HtmlUtils = { escapeHtml: escapeHtml, escapeJsStr: escapeJsStr };

if (typeof window !== 'undefined') {
    window.HtmlUtils = HtmlUtils;
    if (typeof window.escapeHtml !== 'function') {
        window.escapeHtml = escapeHtml;
    }
}
