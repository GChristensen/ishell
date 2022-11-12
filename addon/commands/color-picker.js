import {loadCSS, loadScript} from "../utils_browser.js";

export const namespace = new AnnotatedCommandNamespace(CommandNamespace.UTILITY);

/**
    # Syntax
    **color-picker** [color] [**as** *format*]

    # Arguments
    - *color* - a color in any valid web format. The current selection is used if omitted.
    - *format* - format of the output color value that replaces the current selection. One of the following strings: *hex*, *rgb*, *hsv*, *hsl*.

    # Example
    **color-picker** **as** *rgb*

    @command
    @markdown
    @delay 1000
    @icon /ui/icons/color-picker.png
    @description A color picker based on the <a href="https://seballot.github.io/spectrum/" target="_blank">spectrum</a> library.
    @uuid 3A0EC4EA-4C9D-445C-A540-AF0017A9BF01
 */
export class ColorPicker {
    #color;

    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "color"}; // object
        args[AS] = {nountype: ["hex", "rgb", "hsv", "hsl"], label: "format"}; // alias
    }

    async preview({OBJECT: {text: color}, AS: {text: format}}, display, storage) {
        const doc = display.ownerDocument;
        loadCSS(doc, "__spectrum_css__", "../lib/spectrum/spectrum.css");
        await loadScript(doc, "__spectrum__", "../lib/spectrum/spectrum.js");

        color = color || "";
        display.set(`<input id="color-picker" value="${color}" style="display: none"/>`);

        const picker = doc.defaultView.$("#color-picker");

        picker.spectrum({
            type: "flat",
            showInput: true,
            showInitial: true,
            localStorageKey: "spectrum-colors",
            move: color => this.#color = this.#colorToString(color, format)
        });

        const pickerColor = picker.spectrum("get");
        if (pickerColor)
            this.#color = this.#colorToString(pickerColor, format);
    }

    #colorToString(color, format) {
        switch (format) {
            case "rgb":
                return color.toRgbString();
            case "hsv":
                return color.toHsvString();
            case "hsl":
                return color.toHslString();
            default:
                return color.toHexString();
        }
    }

    execute() {
        if (this.#color)
            cmdAPI.setSelection(this.#color);
    }
}