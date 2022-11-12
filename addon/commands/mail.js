export const namespace = new AnnotatedCommandNamespace(CommandNamespace.MAIL);

class MailBase {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: this._objectLabel || "body"}; // object
        //args[FOR]    = {nountype: noun_arb_text, label: "text"}; // subject
        args[TO]     = {nountype: noun_type_contact, label: "contact"}; // goal
        //args[FROM]   = {nountype: noun_arb_text, label: "text"}; // source
        //args[NEAR]   = {nountype: noun_arb_text, label: "text"}; // location
        args[AT]     = {nountype: {default: 0, secondary: 1}, label: "account"}; // time
        //args[WITH]   = {nountype: noun_arb_text, label: "text"}; // instrument
        //args[IN]     = {nountype: noun_arb_text, label: "text"}; // format
        //args[OF]     = {nountype: noun_arb_text, label: "text"}; // modifier
        //args[AS]     = {nountype: noun_arb_text, label: "text"}; // alias
        //args[BY]     = {nountype: noun_arb_text, label: "text"}; // cause
        //args[ON]     = {nountype: noun_arb_text, label: "text"}; // dependency
    }

    preview({OBJECT, TO: {text: addr}, AT: {text: account}}, display) {
        let desc = this._desc(OBJECT);

        if (addr)
            desc += "to &lt;<b>" + addr + "</b>&gt; ";

        if (account)
            desc += "at the " + account + " account.";
        else
            desc += "at the default account.";

        display.text(desc);
    }

    async execute({OBJECT, TO: {text: addr}, AT}) {
        let gmail = "https://mail.google.com/mail/u/"
        let gmailCompose = "?ui=2&view=cm";

        let user = AT?.data? AT.data: "0";
        let url = gmail + user + "/" + gmailCompose;

        url += this._url(OBJECT);

        if (addr) {
            url += "&to=" + encodeURIComponent(addr);
            const bin = await Utils.makeBin(noun_type_contact.BIN_UUID);

            let contacts = bin.contacts() || [];

            if (!contacts.find(c => c.toLowerCase() === addr.toLowerCase())) {
                contacts.push(addr);
                bin.contacts(contacts);
            }
        }

        CmdUtils.addTab(url);
    }
}

/**
 # Syntax
 - **email** **this** **to** *email address* [**at** *account*]

 # Arguments
 - **this** - the mandatory keyword used as a substitution for the selection, an arbitrary text may be used instead
 - *email address* - recipient's address: a valid email address
 - *account* - gmail account: {**default**, **secondary**}

 # Example
 - **email** **this** **to** *user&#64;example.com **at** *secondary*

 @command
 @markdown
 @author g/christensen
 @icon /ui/icons/email.png
 @description Compose an email with the current selection as the body using <a href='http://gmail.com'>Gmail</a>.
 @uuid 65947074-CF99-4114-827E-0FC7CB348CE1
 */
export class Email extends MailBase {
    _desc(OBJECT) {
        let desc = "Send ";

        if (OBJECT.text)
            desc += "\"" + OBJECT.summary + "\" ";
        else
            desc += "empty message ";

        return desc;
    }

    _url({text: body}) {
        if (body)
            return "&body=" + encodeURIComponent(body);
        return "";
    }
}

/**
 # Syntax
 - **compose** *message subject* **to** *email address* [**at** *account*]

 # Arguments
 - *email address* - recipient's address: a valid email address
 - *account* - gmail account: {**default**, **secondary**}

 # Example
 - **compose** *shopping list* **to** *user&#64;example.com* **at** *secondary*
 
 @command
 @markdown
 @author g/christensen
 @icon /ui/icons/email.png
 @description Compose an empty email with the given subject using <a href='http://gmail.com'>Gmail</a>.
 @uuid 2C25DC63-66E0-493D-B750-D33B55999EDB
 */
export class Compose extends MailBase {
    _desc(OBJECT) {
        let desc = "Compose email ";

        if (OBJECT.text)
            desc += "with subject: \"" + OBJECT.summary + "\" ";

        return desc;
    }

    _url({text: subject}) {
        if (subject)
            return "&su=" + encodeURIComponent(subject);
        return "";
    }

    get _objectLabel() {
        return "subject";
    }
}

/**
 # Syntax
 - **forget-email** [**all** | *email address*] [**with** *regex*]

 # Arguments
 - *email address* - recipient's address: a valid email address. All email are forgotten in the keyword **all** is used.
 - *regex* - forget emails that match the specified regex.

 # Examples
 - **forget-email** *user&#64;example.com*
 - **forget-email** **with** users?
 - **forget-email** **all**

 @command
 @markdown
 @author g/christensen
 @icon /ui/icons/email.png
 @description Compose an empty email with the given subject using <a href='http://gmail.com'>Gmail</a>.
 @uuid C1B5C976-2BBE-4DD6-95E9-A65CC84E1B51
 */
export class ForgetEmail {
    constructor(args) {
        args[OBJECT] = {nountype: noun_type_contact, label: "contact"}; // object
        args[WITH]   = {nountype: noun_arb_text, label: "regex"}; // instrument
    }

    preview({OBJECT: {text: addr}, WITH: {text: regex}}, display) {
        if (addr) {
            if (addr.toLowerCase() === "all")
                display.text("Forget all emails.");
            else
                display.text(`Forget &lt;<b>${addr}</b>&gt;.`);
        }
        else if (regex) {
            display.text("Forget all emails containing \"" + regex + "\".");
        }
        else
            display.text(this.description);
    }

    async execute({OBJECT: {text: addr}, WITH: {text: regex}}) {
        const bin = await Utils.makeBin(noun_type_contact.BIN_UUID);
        const contacts = bin.contacts() || [];

        if (addr) {
            if (addr.toLowerCase() === "all")
                bin.contacts([]);
            else {
                let em;
                if (em = contacts.find(c => {
                    return c.toLowerCase() === addr.toLowerCase()
                })) {
                    contacts.splice(contacts.indexOf(em), 1);
                    bin.contacts(contacts);
                }
            }
        }
        else if (regex) {
            let matcher = RegExp(regex, "i");
            bin.contacts(contacts.filter(c => !c.match(matcher)));
        }
    }
}