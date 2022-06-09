
$(() => shellSettings.load(settings => onDocumentLoad(settings)));

async function onDocumentLoad(settings) {
    let commandList = $("#context-menu-commands");
    
    for (let cmd of CmdManager.contextMenuCommands) {
        commandList.append(`<tr id="${cmd.uuid}">
            <td class="remove-item" title="Remove item">&#xD7;</td>
            <td class="item-icon"><img height="16px" width="16px" src="${cmd.icon}"/></td>
            <td class="item-label"><input type="text" name="label" title="Menu item label" value="${Utils.escapeHtml(cmd.label)}"/></td>
            <td><input type="text" name="command" title="Menu item command" value="${Utils.escapeHtml(cmd.command)}" disabled/></td>
            <td class="execute-item"><input type="checkbox" name="execute" title="Execute" ${cmd.execute ? "checked" : ""}/>
            <img src="icons/execute.png" title="Execute"/></td>
        </tr>`);
    }

    $("#context-menu-commands .remove-item").click((e) => {
        let tr = e.target.parentNode;
        if (confirm("Do you really want to delete \"" + $(tr).find("input[name='label']").val() + "\"?")) {
            let cm = CmdManager.getContextMenuCommand($(tr).find("input[name='command']").val());
            let i = CmdManager.contextMenuCommands.indexOf(cm);
            CmdManager.contextMenuCommands.splice(i, 1);
            tr.parentNode.removeChild(tr);
            CmdManager.createContextMenu();
            shellSettings.set("context_menu_commands", CmdManager.contextMenuCommands);
        }
    });

    $("#context-menu-commands input[name='label']").blur((e) => {
        let tr = e.target.parentNode.parentNode;
        if (e.target.value) {
            let cm = CmdManager.getContextMenuCommand($(tr).find("input[name='command']").val());
            cm.label = e.target.value;
            CmdManager.createContextMenu();
            shellSettings.set("context_menu_commands", CmdManager.contextMenuCommands);
        }
    });

    $("#context-menu-commands input[name='execute']").change((e) => {
        let tr = e.target.parentNode.parentNode;
        let cm = CmdManager.getContextMenuCommand($(tr).find("input[name='command']").val());
        cm.execute = e.target.checked;
        shellSettings.set("context_menu_commands", CmdManager.contextMenuCommands);
    });


    let cmHistorySwitch = $("#cm-history-switch");
    cmHistorySwitch.prop("checked", !settings.remember_context_menu_commands());
    cmHistorySwitch.change((e) => {
        settings.remember_context_menu_commands(!e.target.checked)
    });

}