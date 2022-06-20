import {fetchText} from "../../utils.js";

$("#about-changes").html(await fetchText("changes.html"));
$("#about-version").text(`Version: ${chrome.runtime.getManifest().version}`);

$(".donation-link").on("mouseenter", e => $("#scrapyard-logo").prop("src", "images/donation_kitty.png"));
$(".donation-link").on("mouseleave", e => $("#scrapyard-logo").prop("src", "../icons/logo.svg"));
