import os
import re
import sys
import json

commands_base = sys.argv[1]

project_dir = os.path.dirname(os.path.dirname(__file__))
addon_dir = os.path.join(project_dir, "addon")
commands_dir = os.path.join(addon_dir, commands_base)
commands_file = os.path.join(addon_dir, commands_base + ".json")

command_modules = []

for root, dirs, files in os.walk(commands_dir):
    for file in files:
        if file.endswith(".js"):
            full_path = os.path.join(root, file)
            relative_path = full_path.replace(addon_dir, "", 1)
            relative_path = relative_path.replace("\\", "/")
            command_modules.append(relative_path)

if commands_base == "commands":
    commands_json = json.dumps(command_modules, indent=8)
    commands_json = commands_json.replace("]", "    ]")
    cmdmanager_file = os.path.join(addon_dir, "cmdmanager.js")
    cmdmanager_js = ""

    with open(cmdmanager_file, "r", encoding="utf-8") as javascript_in:
        cmdmanager_js = javascript_in.read()

    match = re.search(r"#builtinCommandFiles = \[[^]]+];", cmdmanager_js, re.DOTALL)

    if match:
        existing_commands = match[0]
        new_commands = "#builtinCommandFiles = " + commands_json + ";"

        if new_commands != existing_commands:
            cmdmanager_js = cmdmanager_js.replace(existing_commands, new_commands, 1)

            with open(cmdmanager_file, "w", encoding="utf-8") as javascript_out:
                javascript_out.write(cmdmanager_js)
    else:
        print("ERROR: User command definition not found!")
else:
    commands_json = json.dumps(command_modules)
    existing_commands = ""

    with open(commands_file, "r", encoding="utf-8") as json_in:
        existing_commands = json_in.read()

    if commands_json != existing_commands:
        with open(commands_file, "w", encoding="utf-8") as json_out:
            json_out.write(commands_json)
