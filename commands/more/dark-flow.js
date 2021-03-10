// These commands are hidden by default and available only through an undocumented easter switch

CmdUtils.CreateCommand({
    name: "dark-flow",
    uuid: "79C0722B-5D25-49A3-AE33-9ACA1152EC9C",
    argument: [{role: "object", nountype: noun_arb_text, label: "URL"}],
    description: "Follow the URL in <a href='https://gchristensen.github.io/dark-flow/'>Dark Flow</a>.",
    icon: "/commands/more/dark-flow.png",
    builtIn: true,
    _hidden: true,
    _namespace: NS_MORE_COMMANDS,
    execute: function execute({object: {text}}) {
        chrome.runtime.sendMessage("dark-flow@firefox", {message: "dark-flow:follow-url", url: text}, null);
    },
    preview: "Follow the URL in Dark Flow"
});