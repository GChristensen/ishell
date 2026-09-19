// Generates landing/img/ishell-demo.svg: the looping animation of the iShell command line
// shown in the hero (translate -> duck -> images, then the prompt clears again).
//
//   node tools/gen-demo.mjs
//
// The SVG is a standalone document (it is loaded through <object> so it can use web fonts).
// Everything is animated with CSS keyframes rather than SMIL: one 24-second timeline, every
// animated element carrying `class="a kN"` where kN is its own @keyframes block of opacity
// windows. Typing is a mask rectangle in the colour of the input bar that steps to the right
// one character at a time -- which only works because the whole prompt is set in a monospace
// face, so a character is exactly 0.6em wide.
//
// Under prefers-reduced-motion the animations are switched off and the elements marked `rm`
// (the second scene, with the search results) stay visible as a still frame.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../img/ishell-demo.svg");

/* ------------------------------------------------------------------ timing */

const IDLE = 1300;   // prompt open and empty, before the command is typed
const CH = 95;       // per character

const SCENES = [
    {
        key: "tr", cmd: "translate espoir from fr to ja", hold: 800, show: 3800,
        desc: [["Translates from one language to another using ", false],
               ["Bing Translator", true], [".", false]]
    },
    {
        key: "duck", cmd: "duck humanism", hold: 1000, show: 4200,
        desc: [["Searches DuckDuckGo for your words.", false]]
    },
    {
        key: "img", cmd: "images magnolia", hold: 900, show: 4200,
        desc: [["Browse pictures from ", false], ["Bing Images", true], [".", false]]
    }
];

const sceneLen = (s) => IDLE + s.cmd.length * CH + s.hold + s.show;
const TOTAL = SCENES.reduce((a, s) => a + sceneLen(s), 0);

/* ------------------------------------------------------------------ geometry */

const POP = { x: 40, y: 108, w: 1120, h: 508 };    // the command popup
const BAR_H = 56;                                   // its input bar
const LIST_W = 300;                                 // suggestion column
const LIST_X = POP.x, LIST_Y = POP.y + BAR_H + 1;
const PREV_X = POP.x + LIST_W, PREV_Y = LIST_Y;
const PREV_W = POP.w - LIST_W, PREV_H = POP.h - BAR_H - 1;

const INPUT_SIZE = 26, INPUT_CW = INPUT_SIZE * 0.6;
const INPUT_X = POP.x + 16, INPUT_BASE = POP.y + 38;

const SUG_SIZE = 13, SUG_CW = SUG_SIZE * 0.6, SUG_LH = 18;
const SUG_TEXT_X = LIST_X + 10 + 16 + 8;
const SUG_COLS = Math.floor((LIST_X + LIST_W - 10 - SUG_TEXT_X) / SUG_CW);

const PV_SIZE = 13, PV_CW = PV_SIZE * 0.6, PV_LH = 20;
const PV_X = PREV_X + 18, PV_TOP = PREV_Y + 14;
const PV_COLS = Math.floor((POP.x + POP.w - 20 - PV_X) / PV_CW);

const C = {
    chrome: "#CDD1D6", chromeLight: "#E7E9EC", chromeLine: "#C4C8CE",
    page: "#F4F5F6", pageInk: "#4A4F56",
    bar: "#D3D6DA", barLine: "#A7ACB2", popupLine: "#8F959C",
    dark: "#2A2C2F", ink: "#15171A", hint: "#6A7078",
    row: "#B9BDC2", rowSel: "#DDE0E3", rowLine: "#9EA3A9",
    prev: "#E4E6E9", prevDim: "#B9BEC4", prevFaint: "#9CA2A9", green: "#8FD3A8"
};

const MONO = "'JetBrains Mono', ui-monospace, 'DejaVu Sans Mono', monospace";

/* ------------------------------------------------------------------ helpers */

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n2 = (v) => Math.round(v * 100) / 100;

let keyframes = [];
let classSeq = 0;

// One animated element: `windows` are [startMs, endMs) pairs in which it is visible.
function shown(windows) {
    const name = "k" + ++classSeq;
    const pct = (ms) => n2(ms / TOTAL * 100) + "%";
    const stops = [];
    let at0 = windows.some(([a]) => a <= 0);
    stops.push("0%{opacity:" + (at0 ? 1 : 0) + "}");
    for (const [a, b] of windows) {
        if (a > 0) stops.push(pct(a) + "{opacity:1}");
        if (b < TOTAL) stops.push(pct(b) + "{opacity:0}");
    }
    keyframes.push("." + name + "{animation-name:" + name + "}@keyframes " + name + "{" + stops.join("") + "}");
    return "a " + name;
}

// The typing mask / caret: a transform that steps `count` times between `from` and `to`.
function typer(startMs, endMs, count, fromX, toX) {
    const name = "k" + ++classSeq;
    const pct = (ms) => n2(ms / TOTAL * 100) + "%";
    keyframes.push("." + name + "{animation-name:" + name + "}@keyframes " + name + "{"
        + "0%{transform:translateX(" + n2(fromX) + "px)}"
        + pct(startMs) + "{transform:translateX(" + n2(fromX) + "px);animation-timing-function:steps("
        + count + ",start)}"
        + pct(endMs) + "{transform:translateX(" + n2(toX) + "px)}"
        + "}");
    return "t " + name;
}

// Greedy word wrap over a list of [text, kind] segments; returns lines of segments.
function wrap(segs, cols) {
    const lines = [];
    let line = [], len = 0;
    const push = (text, kind) => {
        const last = line[line.length - 1];
        if (last && last.kind === kind) last.text += text;
        else line.push({ text, kind });
        len += text.length;
    };
    for (const [text, kind] of segs) {
        const parts = text.split(/(\s+)/).filter((p) => p !== "");
        for (const part of parts) {
            if (/^\s+$/.test(part)) { if (len > 0) push(part, kind); continue; }
            if (len + part.length > cols && len > 0) {
                while (line.length && /\s+$/.test(line[line.length - 1].text))
                    line[line.length - 1].text = line[line.length - 1].text.replace(/\s+$/, "");
                lines.push(line); line = []; len = 0;
            }
            push(part, kind);
        }
    }
    if (line.length) lines.push(line);
    return lines;
}

// A <text> element whose runs keep the monospace grid (every glyph is `cw` wide).
function runs(x, y, size, cw, segs, styles) {
    let out = `<text x="${n2(x)}" y="${n2(y)}" font-family="${MONO}" font-size="${size}" xml:space="preserve">`;
    let col = 0;
    for (const seg of segs) {
        const st = styles[seg.kind] || "";
        out += `<tspan x="${n2(x + col * cw)}" ${st}>${esc(seg.text)}</tspan>`;
        col += seg.text.length;
    }
    return out + "</text>";
}

/* ------------------------------------------------------------------ suggestions */

const S = (text, kind) => [text, kind];

function suggest(kind, typed) {
    const L = typed.length;
    if (!L) return [];
    if (kind === "tr") {
        if (L <= 9) return [
            { icon: "tr", segs: [S("translate", "n"), S(" (text) (from language) (to language)", "h")] },
            { icon: "tr", segs: [S("translate-page", "n"), S(" (to language)", "h")] },
            { icon: "gen", segs: [S("switch-to-tab", "n"), S(" (tab title)", "h")] },
            { icon: "gen", segs: [S("close-tab", "n"), S(" (tab title)", "h")] }
        ];
        if (L <= 21) {
            const arg = typed.slice(10).trim() || " ";
            return [
                { icon: "tr", segs: [S("translate ", "n"), S(arg, "b"), S(" (from language) (to language)", "h")] },
                { icon: "tr", segs: [S("translate-page ", "n"), S(arg, "b"), S(" (to language)", "h")] }
            ];
        }
        if (L <= 27) return [
            { icon: "tr", segs: [S("translate ", "n"), S("espoir", "b"), S(" from ", "n"), S("French", "b"), S(" (to language)", "h")] },
            { icon: "tr", segs: [S("translate ", "n"), S(typed.slice(10), "b"), S(" (from language)", "h")] },
            { icon: "tr", segs: [S("translate-page ", "n"), S(typed.slice(10), "b"), S(" (to language)", "h")] }
        ];
        return [
            { icon: "tr", segs: [S("translate ", "n"), S("espoir", "b"), S(" from ", "n"), S("French", "b"), S(" to ", "n"), S("Japanese", "b")] },
            { icon: "tr", segs: [S("translate ", "n"), S("espoir", "b"), S(" from ", "n"), S("Afrikaans", "b"), S(" to ", "n"), S("Japanese", "b")] },
            { icon: "tr", segs: [S("translate ", "n"), S(typed.slice(10), "b"), S(" (from language)", "h")] },
            { icon: "tr", segs: [S("translate-page ", "n"), S("espoir from fr", "b"), S(" to ", "n"), S("Japanese", "b")] }
        ];
    }
    if (kind === "duck") {
        if (L <= 4) return [
            { icon: "search", segs: [S("duck", "n"), S(" (query) (as type)", "h")] },
            { icon: "gen", segs: [S("add-setting", "n")] }
        ];
        return [{ icon: "search", segs: [S("duck ", "n"), S(typed.slice(5) || " ", "b"), S(" (as type)", "h")] }];
    }
    if (L <= 6) return [
        { icon: "img", segs: [S("images", "n"), S(" (query)", "h")] },
        { icon: "gen", segs: [S("isdown", "n"), S(" (url)", "h")] }
    ];
    return [{ icon: "img", segs: [S("images ", "n"), S(typed.slice(7) || " ", "b")] }];
}

const ICONS = {
    tr: `<g fill="none" stroke="#2E6F9E" stroke-width="1.4" stroke-linejoin="round">`
        + `<rect x="1" y="2" width="9" height="8" rx="1.5" fill="#D9E8F3"/>`
        + `<rect x="6" y="6" width="9" height="8" rx="1.5" fill="#FFFFFF"/>`
        + `<path d="M8.5 12L10.5 8L12.5 12M9.2 10.8H11.8" stroke-linecap="round"/></g>`,
    search: `<g fill="none" stroke="#B4541F" stroke-width="1.7" stroke-linecap="round">`
        + `<circle cx="7" cy="7" r="5" fill="#F6E1D3"/><path d="M11 11L14.5 14.5"/></g>`,
    img: `<g fill="none" stroke="#3B7A4A" stroke-width="1.4" stroke-linejoin="round">`
        + `<rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="#E2F0E4"/>`
        + `<path d="M2 12L6 8L9 11L11 9L14 12"/><circle cx="11" cy="5.5" r="1.2"/></g>`,
    gen: `<g fill="none" stroke="#5E646C" stroke-width="1.4">`
        + `<rect x="1.5" y="3" width="13" height="10" rx="1.5" fill="#EEF0F2"/><path d="M1.5 6H14.5"/></g>`
};

const SUG_STYLES = {
    n: `fill="${C.ink}"`,
    b: `fill="${C.ink}" font-weight="700"`,
    h: `fill="${C.hint}" font-style="italic"`
};

function suggestionList(items) {
    let out = "", top = LIST_Y;
    for (let i = 0; i < items.length; i++) {
        const lines = wrap(items[i].segs, SUG_COLS);
        const h = 16 + lines.length * SUG_LH;
        out += `<rect x="${LIST_X}" y="${n2(top)}" width="${LIST_W}" height="${n2(h)}" fill="${i === 0 ? C.rowSel : C.row}"/>`;
        out += `<path d="M${LIST_X} ${n2(top + h)}h${LIST_W}" stroke="${C.rowLine}"/>`;
        out += `<g transform="translate(${LIST_X + 10} ${n2(top + 9)})">${ICONS[items[i].icon]}</g>`;
        lines.forEach((line, li) => {
            out += runs(SUG_TEXT_X, top + 8 + SUG_SIZE + li * SUG_LH, SUG_SIZE, SUG_CW, line, SUG_STYLES);
        });
        top += h + 1;
    }
    return out;
}

/* ------------------------------------------------------------------ previews */

const PREV_STYLES = {
    n: `fill="${C.prev}"`,
    b: `fill="${C.prev}" font-weight="700"`,
    dim: `fill="${C.prevDim}"`,
    link: `fill="${C.prev}" text-decoration="underline"`,
    url: `fill="${C.green}"`
};

function previewLines(lines, opts = {}) {
    const x = opts.x ?? PV_X, size = opts.size ?? PV_SIZE, lh = opts.lh ?? PV_LH;
    let out = "", y = (opts.top ?? PV_TOP) + size;
    for (const line of lines) {
        if (line !== null) out += runs(x, y, size, size * 0.6, line, PREV_STYLES);
        y += lh;
    }
    return { svg: out, bottom: y - size };
}

function helpPreview() {
    return previewLines([
        [{ text: "Type the name of a command and press Enter to execute it. Use ", kind: "n" },
         { text: "help", kind: "b" }, { text: " command for assistance.", kind: "n" }],
        null,
        [{ text: "Keyboard Shortcuts", kind: "b" }],
        [{ text: "Ctrl+C - copy preview to clipboard", kind: "dim" }],
        [{ text: "Ctrl+Alt+Enter - add selected command to context menu", kind: "dim" }],
        [{ text: "Ctrl+Alt+\\ - open command history", kind: "dim" }],
        [{ text: "↑/↓ - cycle through command suggestions", kind: "dim" }]
    ]).svg;
}

function descPreview(desc) {
    const segs = desc.map(([text, link]) => [text, link ? "link" : "n"]);
    return previewLines(wrap(segs, PV_COLS)).svg;
}

function translationPreview() {
    return `<text x="${PV_X}" y="${PV_TOP + 42}" font-family="'IBM Plex Sans', system-ui, sans-serif"`
        + ` font-size="44" fill="#F4F5F6">希望</text>`
        + `<text x="${PV_X}" y="${PV_TOP + 78}" font-family="${MONO}" font-size="12"`
        + ` letter-spacing="0.7" fill="${C.prevFaint}">ESPOIR · FRENCH → JAPANESE</text>`;
}

const RESULTS = [
    ["Humanism - Wikipedia", "en.wikipedia.org/wiki/Humanism",
     "A philosophical and ethical stance that puts human agency, reason and evidence at the centre of how we live."],
    ["What Is Humanism? - American Humanist Association", "americanhumanist.org/what-is-humanism",
     "A progressive outlook on life that, without theism, affirms our ability to lead ethical lives."],
    ["Renaissance humanism - Wikipedia", "en.wikipedia.org/wiki/Renaissance_humanism",
     "The revival of classical learning that began in 14th-century Italy and spread across Europe."],
    ["Humanism | Definition, History & Examples - Britannica", "britannica.com/topic/humanism",
     "A system of education and mode of inquiry that grew out of northern Italy."],
    ["What is humanism? - Humanists UK", "humanists.uk/humanism",
     "Thinking for yourself about what is right and wrong, based on reason and respect for others."]
];

function duckPreview() {
    let out = previewLines([[{ text: "Results for ", kind: "n" }, { text: "humanism", kind: "b" },
        { text: ":", kind: "n" }]]).svg;
    const numX = PV_X, textX = PV_X + 26;
    const cols = Math.floor((POP.x + POP.w - 20 - textX) / PV_CW);
    let y = PV_TOP + 34;
    RESULTS.forEach(([title, url, snippet], i) => {
        out += `<text x="${numX}" y="${n2(y + PV_SIZE)}" font-family="${MONO}" font-size="${PV_SIZE}"`
            + ` fill="${C.prevFaint}">${i + 1}.</text>`;
        out += runs(textX, y + PV_SIZE, PV_SIZE, PV_CW, [{ text: title, kind: "link" }], PREV_STYLES);
        out += runs(textX, y + PV_SIZE + 16, 11, 11 * 0.6, [{ text: url, kind: "url" }], PREV_STYLES);
        let ly = y + PV_SIZE + 32;
        for (const line of wrap([[snippet, "dim"]], cols)) {
            out += runs(textX, ly, 12, 12 * 0.6, line, PREV_STYLES);
            ly += 15;
        }
        y = ly + 8;
    });
    return out;
}

const TILES = [
    { bg: "#2F4A2E", petal: "#F7F4EE", leaf: "#4E7A3E", edge: "#D8D2C4", tf: "translate(0 2)" },
    { bg: "#C98FA9", petal: "#F2C4D6", leaf: "#6E8F4A", edge: "#B8708F", tf: "translate(-14 -4) scale(1.3)" },
    { bg: "#3E5A2F", petal: "#FBFAF6", leaf: "#6B8E3A", edge: "#DAD4C6", tf: "translate(12 6) scale(0.8)" },
    { bg: "#24361F", petal: "#FFFDF7", leaf: "#3F6A34", edge: "#E3DAC4", tf: "translate(-8 -6) scale(1.2)" },
    { bg: "#F1F2EE", petal: "#FFFFFF", leaf: "#5A7F42", edge: "#CFC8B8", tf: "translate(0 0)" },
    { bg: "#EEF0EC", petal: "#FDFBF4", leaf: "#4F7A3C", edge: "#C9C1AE", tf: "translate(6 -2) scale(0.9)" },
    { bg: "#577A47", petal: "#EEDDE6", leaf: "#2E4E27", edge: "#C9A3B6", tf: "translate(-6 0) scale(1.1)" },
    { bg: "#EDE4D8", petal: "#E9A9C2", leaf: "#6A8B4C", edge: "#C77F9C", tf: "translate(4 4) scale(0.95)" },
    { bg: "#1F2E1C", petal: "#F4EFE4", leaf: "#3E6232", edge: "#D2C9B5", tf: "translate(0 -4) scale(1.15)" },
    { bg: "#DCE6D4", petal: "#FFFFFF", leaf: "#557C3F", edge: "#CEC6B4", tf: "translate(-10 2) scale(1.05)" },
    { bg: "#35502D", petal: "#F8E7EE", leaf: "#5C8440", edge: "#D0A9BA", tf: "translate(8 -6) scale(1.2)" },
    { bg: "#F5F1EA", petal: "#E6B3C8", leaf: "#628446", edge: "#C07A97", tf: "translate(0 4) scale(0.85)" }
];

function flower(t) {
    const petal = (rot) => `<ellipse cx="50" cy="24" rx="9" ry="20" fill="${t.petal}" stroke="${t.edge}"`
        + ` stroke-width="0.8"${rot ? ` transform="rotate(${rot} 50 40)"` : ""}/>`;
    return `<rect width="100" height="76" fill="${t.bg}"/><g transform="${t.tf}">`
        + `<ellipse cx="30" cy="58" rx="22" ry="8" fill="${t.leaf}" transform="rotate(-24 30 58)"/>`
        + `<ellipse cx="72" cy="60" rx="20" ry="7" fill="${t.leaf}" transform="rotate(20 72 60)"/>`
        + [0, 60, 120, 180, 240, 300].map(petal).join("")
        + `<circle cx="50" cy="40" r="6" fill="#D9B24A"/></g>`;
}

function imagesPreview() {
    const gap = 8, cols = 4;
    const areaW = POP.x + POP.w - 20 - PV_X;
    const tw = Math.floor((areaW - gap * (cols - 1)) / cols), th = 146;
    let out = "";
    // pager
    out += `<rect x="${PV_X}" y="${PV_TOP + 2}" width="26" height="20" rx="3" fill="#45484C"/>`
        + `<text x="${PV_X + 13}" y="${PV_TOP + 17}" font-family="${MONO}" font-size="12"`
        + ` fill="#C3C7CC" text-anchor="middle">‹</text>`
        + `<text x="${n2(PV_X + areaW / 2)}" y="${PV_TOP + 17}" font-family="${MONO}" font-size="13"`
        + ` font-weight="700" fill="${C.prev}" text-anchor="middle">1 ~ 14</text>`
        + `<rect x="${n2(PV_X + areaW - 26)}" y="${PV_TOP + 2}" width="26" height="20" rx="3" fill="#45484C"/>`
        + `<text x="${n2(PV_X + areaW - 13)}" y="${PV_TOP + 17}" font-family="${MONO}" font-size="12"`
        + ` fill="#C3C7CC" text-anchor="middle">›</text>`;
    TILES.forEach((t, i) => {
        const x = PV_X + (i % cols) * (tw + gap);
        const y = PV_TOP + 32 + Math.floor(i / cols) * (th + gap);
        out += `<svg x="${n2(x)}" y="${n2(y)}" width="${tw}" height="${th}" viewBox="0 0 100 76"`
            + ` preserveAspectRatio="xMidYMid slice">${flower(t)}</svg>`;
        out += `<rect x="${n2(x)}" y="${n2(y)}" width="14" height="14" fill="${C.bar}"/>`
            + `<text x="${n2(x + 7)}" y="${n2(y + 11)}" font-family="${MONO}" font-size="10"`
            + ` fill="${C.ink}" text-anchor="middle">${"abcdefghijkl"[i]}</text>`;
    });
    return out;
}

/* ------------------------------------------------------------------ the document */

const inputParts = [], listParts = [], previewParts = [];
const idleWindows = [];
let off = 0;

for (const scene of SCENES) {
    const len = scene.cmd.length;
    const doneAt = off + IDLE + len * CH;
    const end = off + sceneLen(scene);
    const width = len * INPUT_CW;

    idleWindows.push([off, off + IDLE]);

    // typed command: a mask in the colour of the input bar uncovers it character by character
    const rm = scene.key === "duck" ? " rm" : "";
    inputParts.push(`<g class="${shown([[off + IDLE, end]])}${rm}" clip-path="url(#inputClip)">`
        + `<text x="${INPUT_X}" y="${INPUT_BASE}" font-family="${MONO}" font-size="${INPUT_SIZE}"`
        + ` fill="${C.ink}" xml:space="preserve">${esc(scene.cmd)}</text>`
        + `<rect class="${typer(off + IDLE, doneAt, len, 0, width)}" style="transform:translateX(${n2(width)}px)"`
        + ` x="${INPUT_X}" y="${POP.y + 1}" width="${POP.w - 17}" height="${BAR_H - 2}" fill="${C.bar}"/>`
        + `<g class="${typer(off + IDLE, doneAt, len, 0, width)}" style="transform:translateX(${n2(width)}px)">`
        + `<rect class="caret" x="${INPUT_X + 1}" y="${POP.y + 14}" width="2" height="30" fill="${C.ink}"/></g>`
        + `</g>`);

    // suggestions: one group per typed character
    for (let i = 1; i <= len; i++) {
        const from = off + IDLE + (i - 1) * CH;
        const to = i === len ? end : from + CH;
        const marked = scene.key === "duck" && i === len ? " rm" : "";
        listParts.push(`<g class="${shown([[from, to]])}${marked}">`
            + suggestionList(suggest(scene.key, scene.cmd.slice(0, i))) + `</g>`);
    }

    // preview: the command description, then its result
    previewParts.push(`<g class="${shown([[off + IDLE, doneAt + scene.hold]])}">${descPreview(scene.desc)}</g>`);
    const result = scene.key === "tr" ? translationPreview()
        : scene.key === "duck" ? duckPreview() : imagesPreview();
    previewParts.push(`<g class="${shown([[doneAt + scene.hold, end]])}${scene.key === "duck" ? " rm" : ""}">`
        + result + `</g>`);

    off = end;
}

const help = `<g class="${shown(idleWindows)}">${helpPreview()}</g>`;
const pillDark = `<g class="${shown(idleWindows)}">`
    + `<rect x="1038" y="53" width="94" height="26" rx="5" fill="${C.dark}" stroke="#9EA3A9"/>`
    + `<text x="1085" y="70" font-family="${MONO}" font-size="12" fill="#F4F5F6"`
    + ` text-anchor="middle">Ctrl+Space</text></g>`;

const logo = `<g transform="translate(1146 58) scale(0.00849)">`
    + `<rect x="190.61" y="226.58" width="2227.67" height="1871.61" fill="#333333"/>`
    + `<path fill="#B3B3B3" d="M484.76 0l1622.63 0c273.93,0 484.76,210.65 484.76,484.77l0 1306.48c0,273.93 -210.65,484.76 -484.76,484.76l-1622.63 0c-273.93,0 -484.76,-210.65 -484.76,-484.76l0 -1306.48c0,-273.94 210.65,-484.77 484.76,-484.77l0 0zm1791.25 1791.46c0,-442.54 0,-864.01 0,-1306.52 0,-84.3 -63.29,-168.6 -168.61,-168.6 -674.35,0 -969.3,0 -1622.63,0 -84.3,0 -168.6,63.28 -168.6,168.6l0 1306.52 0 0c0,84.27 63.28,168.57 168.6,168.57 569.03,0 1053.6,0 1622.63,0 84.3,0 168.61,-63.28 168.61,-168.57l0 0z"/>`
    + `<polygon fill="#FFFFFF" points="1285.68,1718.58 1285.68,1506.18 2023.12,1506.18 2023.12,1718.58"/>`
    + `<path fill="#FFFFFF" d="M1508.58 1064.37c0,16.91 -0.66,31.49 -2,43.79 -1.31,12.26 -2.98,22.55 -5.31,31.17 -2.33,8.29 -5.32,14.95 -8.62,19.9 -3.64,4.65 -7.64,8.32 -12.3,10.28l-745.38 369.55c-8.94,4.66 -16.58,6.66 -23.24,6 -6.62,-0.69 -11.93,-4.33 -15.89,-10.94 -4.33,-6.33 -7.31,-15.93 -8.98,-28.55 -1.64,-12.59 -2.33,-28.84 -2.33,-48.08 0,-26.54 0.37,-47.78 1.35,-63.39 0.98,-15.56 2.98,-27.86 5.31,-36.8 2.65,-9.27 6.29,-15.93 10.94,-19.9 4.3,-4.33 10.62,-7.96 18.26,-11.28l559.28 -262.77 -548.71 -254.76c-10.25,-4.62 -18.55,-8.95 -24.54,-13.61 -6.29,-4.62 -10.94,-11.6 -14.26,-20.87 -2.98,-9.64 -5.31,-22.23 -6.29,-38.15 -0.98,-15.93 -1.35,-37.5 -1.35,-64.71 0,-23.89 0.69,-42.81 2.33,-56.4 1.67,-13.61 4.66,-23.21 8.98,-29.17 3.97,-5.97 9.27,-8.29 15.89,-7.64 6.66,0.33 14.3,2.98 23.24,7.64l746.4 372.52c8.29,3.97 14.91,14.26 19.9,31.17 4.98,16.94 7.31,41.82 7.31,74.99z"/></g>`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 640" width="1200" height="640">
<style><![CDATA[
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap");
.a,.t{animation-duration:${n2(TOTAL / 1000)}s;animation-iteration-count:infinite;animation-timing-function:steps(1,end);animation-fill-mode:both}
.a{opacity:0}
.caret{animation:caret-blink 1.1s steps(1) infinite}
@keyframes caret-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
${keyframes.join("\n")}
@media (prefers-reduced-motion: reduce){
.a,.t,.caret{animation:none!important}
.a{opacity:0}
.rm{opacity:1}
}
]]></style>
<defs>
<clipPath id="inputClip"><rect x="${POP.x + 1}" y="${POP.y + 1}" width="${POP.w - 2}" height="${BAR_H - 2}"/></clipPath>
<clipPath id="previewClip"><rect x="${PREV_X}" y="${PREV_Y}" width="${PREV_W}" height="${PREV_H}"/></clipPath>
<filter id="popShadow" x="-20%" y="-20%" width="140%" height="160%">
<feDropShadow dx="0" dy="26" stdDeviation="18" flood-color="#141619" flood-opacity="0.45"/>
</filter>
</defs>

<!-- browser window -->
<rect width="1200" height="640" fill="${C.page}"/>
<rect width="1200" height="44" fill="${C.chrome}"/>
<path d="M12 44V16a8 8 0 0 1 8-8h216a8 8 0 0 1 8 8v28Z" fill="${C.chromeLight}"/>
<rect x="26" y="19" width="14" height="14" rx="4" fill="#A9AEB5"/>
<text x="50" y="31" font-family="'IBM Plex Sans', system-ui, sans-serif" font-size="13" fill="#2A2D31">Reading list</text>
<g fill="none" stroke="${C.pageInk}" stroke-width="1.4" stroke-linecap="round">
<path d="M222 21L232 31M232 21L222 31"/><path d="M262 26H274M268 20V32"/>
</g>
<rect y="44" width="1200" height="48" fill="${C.chromeLight}"/>
<path d="M0 92H1200" stroke="${C.chromeLine}"/>
<g fill="none" stroke="${C.pageInk}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
<path d="M40 68H28M33 63L28 68L33 73"/><path d="M64 68H76M71 63L76 68L71 73"/>
<path d="M112 68a6 6 0 1 1-1.8-4.3M111 61V65H107"/>
</g>
<rect x="140" y="52" width="880" height="32" rx="6" fill="#F6F7F8" stroke="${C.chromeLine}"/>
<text x="152" y="72" font-family="'IBM Plex Sans', system-ui, sans-serif" font-size="13" fill="${C.pageInk}">example.org/reading</text>
<rect x="1038" y="53" width="94" height="26" rx="5" fill="#F6F7F8" stroke="#9EA3A9"/>
<text x="1085" y="70" font-family="${MONO}" font-size="12" fill="${C.pageInk}" text-anchor="middle">Ctrl+Space</text>
${pillDark}
${logo}

<!-- the page behind the prompt -->
<rect x="64" y="126" width="420" height="22" rx="4" fill="#DDE0E3"/>
<rect x="64" y="162" width="680" height="10" rx="3" fill="#E4E6E9"/>
<rect x="64" y="186" width="640" height="10" rx="3" fill="#E4E6E9"/>
<rect x="64" y="210" width="700" height="10" rx="3" fill="#E4E6E9"/>
<rect x="64" y="234" width="520" height="10" rx="3" fill="#E4E6E9"/>

<!-- the command popup -->
<g filter="url(#popShadow)">
<rect x="${POP.x}" y="${POP.y}" width="${POP.w}" height="${POP.h}" rx="6" fill="${C.dark}" stroke="${C.popupLine}"/>
</g>
<path d="M${POP.x + 1} ${POP.y + 7}a6 6 0 0 1 6-6h${POP.w - 14}a6 6 0 0 1 6 6v${BAR_H - 7}H${POP.x + 1}Z" fill="${C.bar}"/>
<path d="M${POP.x} ${POP.y + BAR_H}h${POP.w}" stroke="${C.barLine}"/>

${inputParts.join("\n")}

<!-- suggestions -->
${listParts.join("\n")}

<!-- preview -->
<g clip-path="url(#previewClip)">
${help}
${previewParts.join("\n")}
</g>
</svg>
`;

await writeFile(OUT, svg, "utf8");
console.log(`${path.relative(process.cwd(), OUT)}: ${Buffer.byteLength(svg)} bytes, `
    + `${SCENES.length} scenes, ${classSeq} animations, ${n2(TOTAL / 1000)}s loop`);
