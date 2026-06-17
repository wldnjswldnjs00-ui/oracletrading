#!/usr/bin/env python3
"""Strip 8 languages (ja, zh, vi, ru, tr, es, pt, id) from ayilon/bot-guide.html

The file has:
1. A var GT = { ko: {...}, ja: {...}, ... }; block (no 'en' key here)
2. An i18n patch block: (function(p){...}({...JSON...}));
   which also has keys for the same languages.

We keep only 'ko', remove the rest.
"""

import re
import json

INPUT = '/home/user/oracletrading/ayilon/bot-guide.html'
REMOVE_LANGS = {'ja', 'zh', 'vi', 'ru', 'tr', 'es', 'pt', 'id'}

with open(INPUT, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Before: {len(lines)} lines")

# ── STEP 1: Remove language blocks from var GT = { ... } ──────────────────
# The GT object uses 4-space indent for the lang keys: "    ko: {"
# We need to remove all blocks except 'ko'

output = []
skip = False
depth = 0
in_GT = False
gt_closed = False

for line in lines:
    # Detect start of var GT block
    if 'var GT = {' in line and not gt_closed:
        in_GT = True
        output.append(line)
        continue

    if in_GT and not gt_closed:
        if not skip:
            # Check if this line starts a language block to remove
            m = re.match(r'^    (\w{2,}): \{', line)
            if m and m.group(1) in REMOVE_LANGS:
                skip = True
                # Count depth from this opening line
                depth = line.count('{') - line.count('}')
                continue  # skip this line

            output.append(line)

            # Track when the GT block closes
            # The GT object closes with "  };" at depth 0
            if line.strip() == '};':
                gt_closed = True
                in_GT = False
        else:
            # Inside a block to remove — track brace depth
            depth += line.count('{') - line.count('}')
            if depth <= 0:
                # We've exited this language block
                skip = False
                depth = 0
                # The closing line ("},") is part of the removed block — skip it
    else:
        output.append(line)

print(f"After GT strip: {len(output)} lines")

# ── STEP 2: Handle the i18n patch JSON ────────────────────────────────────
# The patch is a single-line JSON inside }({ ... }));
# Find and update it

final = []
patch_pattern = re.compile(r'^  \}\(\{(.+)\}\)\);$')

for line in output:
    m = patch_pattern.match(line)
    if m:
        raw_json = '{' + m.group(1) + '}'
        try:
            patch_dict = json.loads(raw_json)
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            final.append(line)
            continue

        # Remove the 8 languages
        for lang in REMOVE_LANGS:
            patch_dict.pop(lang, None)

        print(f"Patch dict keys after strip: {list(patch_dict.keys())}")

        # Serialize back to compact JSON (no spaces after separators)
        new_json = json.dumps(patch_dict, ensure_ascii=False, separators=(',', ':'))
        # Reconstruct the line
        new_line = '  }(' + new_json + '));\n'
        final.append(new_line)
    else:
        final.append(line)

print(f"After patch strip: {len(final)} lines")

with open(INPUT, 'w', encoding='utf-8') as f:
    f.writelines(final)

print("Done writing.")
