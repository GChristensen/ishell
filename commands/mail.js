CmdUtils.CreateCommand({
    name: "email",
    uuid: "65947074-CF99-4114-827E-0FC7CB348CE1",
    arguments: [{role: "object", nountype: noun_arb_text, label: "body"},
                {role: "goal",   nountype: noun_type_contact, label: "contact"},
                {role: "time",   nountype: {default: 0, secondary: 1}, label: "account"}
    ],
    description: "Compose an email with the current selection as body using <a href='http://gmail.com'>Gmail</a>.",
    help: `<span class="syntax">Syntax</span>
            <ul class="syntax">
                <li><b>email</b> <b>this</b> <b>to</b> <i>email address</i> [<b>at</b> <i>account</i>]</li>
            </ul>
            <span class="arguments">Arguments</span><br>
            <ul class="syntax">
                <li>- <b>this</b> - mandatory keyword used as substitution for the selection, an arbitrary text may be used
                    instead<br></li>
                <li>- <i>email address</i> - recipient's address: a valid email address<br></li>
                <li>- <i>account</i> - gmail account: {<b>default</b>, <b>secondary</b>}<br></li>
            </ul>
            <span class="arguments">Example</span>
            <ul class="syntax">
                <li><b>email</b> <b>this</b> <b>to</b> <i>user@example.com</i> <b>at</b> <i>secondary</i></li>
            </ul>`,
    builtIn: true,
    _namespace: "Mail",
    author: "g/christensen",
    icon: "/res/icons/email.png",
    preview: function(pblock, args) {
        let desc = "Send ";

        if (args.object && args.object.text)
            desc += "\"" + args.object.summary + "\" ";
        else
            desc += "empty message ";

        if (args.goal && args.goal.text)
            desc += "to &lt;" + args.goal.text + "&gt; ";

        if (args.time && args.time.text)
            desc += "at the " + args.source.text + " account.";
        else
            desc += "at the default account.";

        pblock.innerHTML = desc;
    },
    execute: async function(args) {
        let gmail = "https://mail.google.com/mail/u/"
        let gmail_compose = "?ui=2&view=cm";

        let user = args.source && args.source.data? args.source.data: "0";

        let url = gmail + user + "/" + gmail_compose;

        // if (args.instrument && args.instrument.text)
        //     url += "&su=" + encodeURIComponent(args.object.text);

        if (args.object.text)
             url += "&body=" + encodeURIComponent(args.object.text);

        if (args.goal && args.goal.text) {
            url += "&to=" + encodeURIComponent(args.goal.text);
            const bin = await Utils.makeBin(__STORED_EMAIL_UUID);

            let contacts = bin.contacts();
            if (!contacts)
                contacts = [];

            if (!contacts.find(c => c.toLowerCase() === args.goal.text.toLowerCase())) {
                contacts.push(args.goal.text);
                bin.contacts(contacts);
            }
        }

        CmdUtils.addTab(url);
    }
});

CmdUtils.CreateCommand({
    name: "compose",
    uuid: "2C25DC63-66E0-493D-B750-D33B55999EDB",
    arguments: [{role: "object", nountype: noun_arb_text, label: "subject"},
                {role: "goal", nountype: noun_type_contact, label: "contact"},
                {role: "time",   nountype: {default: 0, secondary: 1}, label: "account"}
    ],
    description: "Compose an empty email with the given subject using <a href='http://gmail.com'>Gmail</a>.",
    help: `<span class="syntax">Syntax</span>
            <ul class="syntax">
                <li><b>compose</b> <i>message subject</i> <b>to</b> <i>email address</i> [<b>at</b> <i>account</i>]</li>
            </ul>
            <span class="arguments">Arguments</span><br>
            <ul class="syntax">
                <li>- <i>email address</i> - recipient's address: a valid email address</li>
                <li>- <i>account</i> - gmail account: {<b>default</b>, <b>secondary</b>}<br></li>
            </ul>
            <span class="arguments">Example</span>
            <ul class="syntax">
                <li><b>compose</b> <i>shopping list</i> <b>to</b> <i>user@example.com</i> <b>at</b> <i>secondary</i>`,
    builtIn: true,
    _namespace: "Mail",
    author: "g/christensen",
    icon: "/res/icons/email.png",
    preview: function(pblock, args) {
        let desc = "Compose email to ";

        if (args.goal && args.goal.text)
            desc += "&lt;" + args.goal.text + "&gt; ";
        else
            desc += "nobody ";

        if (args.object && args.object.text)
            desc += "with subject: \"" + args.object.summary + "\" ";

        if (args.time && args.time.text)
            desc += "at the " + args.time.text + " account.";
        else
            desc += "at the default account.";

        pblock.innerHTML = desc;
    },
    execute: async function(args) {
        let gmail = "https://mail.google.com/mail/u/"
        let gmail_compose = "?ui=2&view=cm";

        let user = args.time && args.time.data? args.time.data: "0";

        let url = gmail + user + "/" + gmail_compose;

        if (args.object && args.object.text)
             url += "&su=" + encodeURIComponent(args.object.text);

        //if (args.object.text)
        //    url += "&body=" + encodeURIComponent(args.object.text);

        if (args.goal && args.goal.text) {
            url += "&to=" + encodeURIComponent(args.goal.text);
            const bin = await Utils.makeBin(__STORED_EMAIL_UUID)
            let contacts = bin.contacts();
            if (!contacts)
                contacts = [];

            if (!contacts.find(c => c.toLowerCase() === args.goal.text.toLowerCase())) {
                contacts.push(args.goal.text);
                bin.contacts(contacts);
            }
        }

        CmdUtils.addTab(url);
    }
});

CmdUtils.CreateCommand({
    name: "forget-email",
    uuid: "C1B5C976-2BBE-4DD6-95E9-A65CC84E1B51",
    arguments: [{role: "object", nountype: noun_type_contact, label: "email"}],
    description: "Do not show the specified email in suggestions anymore.",
    builtIn: true,
    _namespace: "Mail",
    author: "g/christensen",
    icon: "/res/icons/forget-email.png",
    preview: function(pblock, args) {
        if (args.object.text) {
            pblock.innerHTML = "Forget " + args.object.text + ".";
        }
        else
            pblock.innerHTML = this.description;
    },
    execute: async function(args) {
        if (args.object.text) {
            const bin = await Utils.makeBin(__STORED_EMAIL_UUID);

            let contacts = bin.contacts();
            if (!contacts)
                contacts = [];

            let em;
            if (em = contacts.find(c => {
                return c.toLowerCase() === args.object.text.toLowerCase()
            })) {
                contacts.splice(contacts.indexOf(em), 1);
                bin.contacts(contacts);
            }
        }
    }
});

CmdUtils.CreateCommand({
    name: "forget-emails",
    uuid: "8CF164B7-1505-47BE-8DDD-7D1E3781ABF1",
    arguments: [{role: "object", nountype: noun_arb_text, label: "pattern"}],
    description: "Forget multiple emails at once.",
    help: `<span class="syntax">Syntax</span>
        <ul class="syntax">
            <li><b>forget-emails</b> {<b>all</b> | <i>pattern</i>}</li>
        </ul>
        <span class="arguments">Arguments</span><br>
        <ul class="syntax">
            <li>- <b>all</b> - forget all emails</li>
            <li>- <i>pattern</i> - forget emails containing this string (may be a regular expression)</li>
        </ul>`,
    builtIn: true,
    _namespace: "Mail",
    author: "g/christensen",
    icon: "/res/icons/forget-email.png",
    preview: function(pblock, args) {
        if (args.object.text) {
            if (args.object.text.toLowerCase() === "all")
                pblock.innerHTML = "Forget all emails.";
            else
                pblock.innerHTML = "Forget all emails containing \"" + args.object.text + "\".";
        }
        else
            pblock.innerHTML = this.description;
    },
    execute: async function(args) {
        if (args.object.text) {
            const bin = await Utils.makeBin(__STORED_EMAIL_UUID);
            let contacts = bin.contacts();
            if (!contacts)
                contacts = [];

            if (args.object.text.toLowerCase() === "all")
                bin.contacts([]);
            else {
                let matcher = RegExp(args.object.text, "i");
                bin.contacts(contacts.filter(c => !c.match(matcher)));
            }
        }
    }
});