// Jest setup file: provide DOMParser and XMLSerializer for Node.js
const { JSDOM } = require("jsdom");
const jsdom = new JSDOM();
global.DOMParser = jsdom.window.DOMParser;
global.XMLSerializer = jsdom.window.XMLSerializer;
