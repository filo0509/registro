"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unescape = void 0;
var matchHtmlEntity = /&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34);/g;
var htmlEntities = {
  '&amp;': '&',
  '&#38;': '&',
  '&lt;': '<',
  '&#60;': '<',
  '&gt;': '>',
  '&#62;': '>',
  '&apos;': "'",
  '&#39;': "'",
  '&quot;': '"',
  '&#34;': '"'
};

var unescapeHtmlEntity = function unescapeHtmlEntity(m) {
  return htmlEntities[m];
};

var unescape = function unescape(text) {
  return text.replace(matchHtmlEntity, unescapeHtmlEntity);
};

exports.unescape = unescape;