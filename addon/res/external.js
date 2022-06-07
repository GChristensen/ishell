if (location.href.includes("github")) {

    function loadScript(file, onload) {
        let head = document.getElementsByTagName('head')[0];
        let script = document.createElement('script');
        script.src = '/ishell/' + file;
        script.onload = onload;
        head.appendChild(script);
    }

    document.addEventListener("DOMContentLoaded", function() {
        let nav = document.getElementById("nav-container");
        nav.parentNode.removeChild(nav);

        if (location.href.includes("tutorial"))
            loadScript("lib/jquery.js", () => loadScript("lib/jquery.toc.js"));
    });

}