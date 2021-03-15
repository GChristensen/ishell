if (location.href.includes("github")) {

    document.addEventListener("DOMContentLoaded", function(){
        let nav = document.getElementById("nav-container");
        nav.parentNode.removeChild(nav);
    });


}