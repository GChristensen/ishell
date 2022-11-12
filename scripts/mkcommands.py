import os
import sys
import json

commands_base = template = sys.argv[1]

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

with open(commands_file, "w", encoding="utf-8") as json_out:
    commands_json = json.dumps(command_modules)
    json_out.write(commands_json)
