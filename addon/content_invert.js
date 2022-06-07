(function () {

// the css we are going to inject
var __invertCss = 'html {filter: invert(100%);}',
    __invertHead = document.getElementsByTagName('head')[0],
    __invertStyle = document.createElement('style');

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

__invertStyle.type = 'text/css';
if (__invertStyle.styleSheet) {
    __invertStyle.styleSheet.cssText = __invertCss;
}
else {
    __invertStyle.appendChild(document.createTextNode(__invertCss));
}

//injecting the css to the head
__invertHead.appendChild(__invertStyle);

function invert(rgb) {
    rgb = Array.prototype.join.call(arguments).match(/(-?[0-9.]+)/g);
    for (var i = 0; i < rgb.length; i++) {
        rgb[i] = (i === 3? 1: 255) - rgb[i];
    }
    return rgb;
}

document.body.style.backgroundColor = "rgb(" + invert(window.getComputedStyle(document.body, null).getPropertyValue('background-color')).join(",") + ")";
})();