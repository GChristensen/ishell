cmdAPI.createCommand({
    name: "my-command",
    uuid: "%%UUID%%",
    arguments: [{role: "object",     nountype: noun_arb_text, label: "text"},
        //{role: "subject",    nountype: noun_arb_text, label: "text"}, // for
        //{role: "goal",       nountype: noun_arb_text, label: "text"}, // to
        //{role: "source",     nountype: noun_arb_text, label: "text"}, // from
        //{role: "location",   nountype: noun_arb_text, label: "text"}, // near
        //{role: "time",       nountype: noun_arb_text, label: "text"}, // at
        //{role: "instrument", nountype: noun_arb_text, label: "text"}, // with
        //{role: "format",     nountype: noun_arb_text, label: "text"}, // in
        //{role: "modifier",   nountype: noun_arb_text, label: "text"}, // of
        //{role: "alias",      nountype: noun_arb_text, label: "text"}, // as
        //{role: "cause",      nountype: noun_arb_text, label: "text"}, // by
        //{role: "dependency", nountype: noun_arb_text, label: "text"}, // on
    ],
    description: "A short description of your command.",
    help: "This text is displayed at the command list page.",
    author: "Your Name",
    icon: "http://example.com/favicon.ico",
    previewDelay: 1000,

    //load(storage) {},
    //init(doc /* popup document */, storage) {},

    preview(pblock, args, storage) {

    },

    execute(args, storage) {

    }
});
