const dexie = new Dexie("ishell");

dexie.version(1).stores({
    suggestion_memory: `&input`,
    custom_scripts: `&namespace`,
    command_storage: `&uuid`
});

dexie.on('populate', () => {

});

class StorageIDB {

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

    async fetchCustomScriptNamespaces() {
        return dexie.custom_scripts.orderBy("namespace").keys();
    }

    async fetchCustomScripts(namespace) {
        let customScripts;

        if (namespace)
            customScripts = await dexie.custom_scripts.where("namespace").equals(namespace).first();
        else {
            customScripts = await dexie.custom_scripts.toArray();
        }

        return customScripts;
    }

    async saveCustomScript(namespace, script) {
        const exists = await dexie.custom_scripts.where("namespace").equals(namespace).count();

        if (exists) {
            await dexie.custom_scripts.where("namespace").equals(namespace).modify({
                script
            });
        }
        else {
            await dexie.custom_scripts.add({namespace, script});
        }
    }

    async deleteCustomScript(namespace) {
        await dexie.custom_scripts.where("namespace").equals(namespace).delete();
    }
}

DBStorage = new StorageIDB();