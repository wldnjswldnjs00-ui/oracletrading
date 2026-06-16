#!/usr/bin/env python3
"""Part 4g: fix a bug in fix_guide_p3.py where it added the s11.p1
data-guide-i18n attribute to the HTML but never added the s11.p1
translation to the patch dict, leaving s11.p1 untranslated in all
9 languages. Adds the missing key directly to bot-guide.html's patch block."""
import json, re

PATH = '/home/user/oracletrading/ayilon/bot-guide.html'
with open(PATH, 'r', encoding='utf-8') as f:
    content = f.read()

LANGS = ['ko', 'ja', 'zh', 'vi', 'ru', 'tr', 'es', 'pt', 'id']

s11_p1 = {
    'ko': "기본 설정으로 진행되는 BTC-USDT-SWAP 완전한 LONG 거래를 단계별로 살펴봅니다:",
    'ja': "デフォルト設定でのBTC-USDT-SWAP完全なLONGトレードのウォークスルー:",
    'zh': "在默认设置下，逐步演示一笔完整的BTC-USDT-SWAP LONG交易：",
    'vi': "Hướng dẫn chi tiết một giao dịch LONG hoàn chỉnh trên BTC-USDT-SWAP với cài đặt mặc định:",
    'ru': "Разбор полной сделки LONG по BTC-USDT-SWAP с настройками по умолчанию:",
    'tr': "Varsayılan ayarlarla BTC-USDT-SWAP üzerinde tam bir LONG işleminin adım adım anlatımı:",
    'es': "Recorrido de una operación LONG completa en BTC-USDT-SWAP con la configuración predeterminada:",
    'pt': "Passo a passo de uma operação LONG completa em BTC-USDT-SWAP com configurações padrão:",
    'id': "Penjelasan langkah demi langkah trade LONG lengkap di BTC-USDT-SWAP dengan pengaturan default:",
}

m = re.search(r'// i18n patch.*?\}\((\{.*?\})\)\);', content, re.S)
assert m, "Could not find current patch block"
existing_patch = json.loads(m.group(1))

for lang in LANGS:
    assert 's11.p1' not in existing_patch[lang], f"s11.p1 already present for {lang}, unexpected"
    existing_patch[lang]['s11.p1'] = s11_p1[lang]

patch_json = json.dumps(existing_patch, ensure_ascii=False)
marker_start = "  (function(p) {\n    for (var l in p) { if (GT[l]) { var d = p[l]; for (var k in d) GT[l][k] = d[k]; } }\n  }("
marker_end = "));\n"
start_idx = content.find(marker_start)
assert start_idx != -1
rest_start = start_idx + len(marker_start)
end_idx = content.find(marker_end, rest_start)
assert end_idx != -1

content = content[:rest_start] + patch_json + content[end_idx:]

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Added s11.p1 for all {len(LANGS)} languages. New key count per lang: {len(existing_patch['ko'])}")
