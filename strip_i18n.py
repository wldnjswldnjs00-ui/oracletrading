#!/usr/bin/env python3
"""Strip 8 languages (ja, zh, vi, ru, tr, es, pt, id) from ayilon/i18n.js"""

import re

INPUT = '/home/user/oracletrading/ayilon/i18n.js'
REMOVE_LANGS = {'ja', 'zh', 'vi', 'ru', 'tr', 'es', 'pt', 'id'}

with open(INPUT, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Before: {len(lines)} lines")

output = []
skip = False
depth = 0

for line in lines:
    # Task 1: Update comment on line 1
    if output == [] and 'EN / KO / JA' in line:
        line = line.replace(
            'EN / KO / JA / ZH / VI / RU / TR / ES / PT / ID',
            'EN / KO'
        )

    # Task 2: Update LANGS array
    if "var LANGS = ['en', 'ko', 'ja', 'zh', 'vi', 'ru', 'tr', 'es', 'pt', 'id'];" in line:
        line = line.replace(
            "['en', 'ko', 'ja', 'zh', 'vi', 'ru', 'tr', 'es', 'pt', 'id']",
            "['en', 'ko']"
        )

    # Task 3: Remove language blocks inside var T = { ... }
    if not skip:
        # Check if this line starts a language block to remove
        # Pattern: "    xx: {" at the start of a line where xx is in REMOVE_LANGS
        m = re.match(r'^    (\w{2}): \{', line)
        if m and m.group(1) in REMOVE_LANGS:
            skip = True
            depth = 1  # we're now inside this lang block
            # Count extra { and } on this same line (after the opening {)
            rest = line[line.index('{') + 1:]
            depth += rest.count('{') - rest.count('}')
            continue  # skip this line

        output.append(line)
    else:
        # We're inside a block to remove — track depth
        depth += line.count('{') - line.count('}')
        if depth <= 0:
            # We've closed this language block
            skip = False
            depth = 0
            # Don't append this closing line (it's the "}," or "}" of the lang block)

print(f"After: {len(output)} lines")

with open(INPUT, 'w', encoding='utf-8') as f:
    f.writelines(output)

print("Done writing.")
