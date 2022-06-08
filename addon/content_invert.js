(function () {

// the css we are going to inject
var css = 'html {filter: invert(100%);}',
    head = document.getElementsByTagName('head')[0],
    style = document.createElement('style');

// a hack, so you can "invert back" clicking the bookmarklet again
if (!window.counter) {
    window.counter = 1;
}
else {
    window.counter++;
    if (window.counter % 2 == 0) {
        var css = 'html {-webkit-filter: invert(0%); -moz-filter:    invert(0%); -o-filter: invert(0%); -ms-filter: invert(0%); }'
    }
}

style.type = 'text/css';
if (style.styleSheet) {
    style.styleSheet.cssText = css;
}
else {
    style.appendChild(document.createTextNode(css));
}

//injecting the css to the head
head.appendChild(style);

function invert(rgb) {
    rgb = Array.prototype.join.call(arguments).match(/(-?[0-9.]+)/g);
    for (var i = 0; i < rgb.length; i++) {
        rgb[i] = (i === 3? 1: 255) - rgb[i];
    }
    return rgb;
}

document.body.style.backgroundColor = "rgb(" + invert(window.getComputedStyle(document.body, null).getPropertyValue('background-color')).join(",") + ")";
})();