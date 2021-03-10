import Dexie from "./lib/dexie.js"

const dexie = new Dexie("ishell");

dexie.version(1).stores({
    suggestion_memory: `&input`,
    custom_scripts: `&namespace`,
    command_storage: `&uuid`
});

dexie.on('populate', () => {

});

class StorageIDB {
    constructor() {
    }

    async getSuggestionMemory(input) {
        return dexie.suggestion_memory.where("input").equals(input).first();
    }

    async setSuggestionMemory(memory) {
        const exists = await dexie.suggestion_memory.where("input").equals(memory.input).count();

        if (exists) {
            await dexie.suggestion_memory.where("input").equals(memory.input).modify({
                scores: memory.scores
            });
        }
        else {
            await dexie.suggestion_memory.add(memory);
        }
    }

    async getCommandStorage(uuid) {
        let record = await dexie.command_storage.where("uuid").equals(uuid).first();
        if (record)
            return record.bin;
        return null;
    }

    async setCommandStorage(uuid, bin) {
        const exists = await dexie.command_storage.where("uuid").equals(uuid).count();

        if (exists) {
            await dexie.command_storage.where("uuid").equals(uuid).modify({
                bin: bin
            });
        }
        else {
            await dexie.command_storage.add({uuid, bin});
        }
    }

    async fetchCommandStorage() {
        return dexie.command_storage.toArray();
    }

    async fetchCustomScripts(callback) {
        let args = arguments;
        let namespace = args.length && (typeof callback === "function")? undefined: callback;
        let customScripts = {};

        if (namespace)
            customScripts[args[0]] = await dexie.custom_scripts.where("namespace").equals(args[0]).first();
        else {
            let rows = await dexie.custom_scripts.toArray();
            for (let row of rows)
                customScripts[row.namespace] = row;
        }
        if (namespace) {
            if (args[1])
                args[1](customScripts);
        }
        else {
            if (callback)
                callback(customScripts);
        }

        return customScripts;
    }

    async saveCustomScripts(namespace, scripts, callback) {
        const exists = await dexie.custom_scripts.where("namespace").equals(namespace).count();

        if (exists) {
            await dexie.custom_scripts.where("namespace").equals(namespace).modify({
                scripts
            });
        }
        else {
            await dexie.custom_scripts.add({namespace, scripts});
        }

        if (callback)
            callback();
    }

    async deleteCustomScripts(namespace, callback) {
        await dexie.custom_scripts.where("namespace").equals(namespace).delete();

        if (callback)
            callback();
    }
}

window.DBStorage = new StorageIDB();