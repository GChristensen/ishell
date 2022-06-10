export function setupHelp(clickee, help) {
    var toggler = jQuery(clickee).click(function toggleHelp() {
        jQuery(help)[(this.off ^= 1)? "slideUp": "slideDown"]();
        [this.textContent, this.bin] = [this.bin, this.textContent];
    })[0];
    toggler.textContent = "Show help";
    toggler.bin = "Hide help";
    toggler.off = true;
}