#!/usr/bin/env python3
"""Final assembly: merge all _p4_part*.json pieces into one patch dict,
replace the live i18n patch block, and add the missing data-guide-i18n
attributes to Section 5 paragraphs, Section 11 flow steps, and Section 12
parameter table cells."""
import json, re

PATH = '/home/user/oracletrading/ayilon/bot-guide.html'
with open(PATH, 'r', encoding='utf-8') as f:
    content = f.read()

LANGS = ['ko', 'ja', 'zh', 'vi', 'ru', 'tr', 'es', 'pt', 'id']

with open('/home/user/oracletrading/_p4_part1.json', 'r', encoding='utf-8') as f:
    part1 = json.load(f)
with open('/home/user/oracletrading/_p4_part2.json', 'r', encoding='utf-8') as f:
    part2 = json.load(f)
with open('/home/user/oracletrading/_p4_part3.json', 'r', encoding='utf-8') as f:
    part3 = json.load(f)
with open('/home/user/oracletrading/_p4_part4.json', 'r', encoding='utf-8') as f:
    part4 = json.load(f)
with open('/home/user/oracletrading/_p4_part5.json', 'r', encoding='utf-8') as f:
    part5 = json.load(f)

merged = {lang: {} for lang in LANGS}
for lang in LANGS:
    merged[lang].update(part1['existing'][lang])
    merged[lang].update(part1['restored_p1b'][lang])
    merged[lang].update(part2[lang])
    merged[lang].update(part3[lang])
    merged[lang].update(part4[lang])
    merged[lang].update(part5[lang])

print(f"Final merged keys per lang: {len(merged['ko'])}")
for lang in LANGS:
    assert len(merged[lang]) == len(merged['ko']), f"Key count mismatch for {lang}"

# ── 1. Insert data-guide-i18n attributes into Section 5 description <p> tags ──
s05_pairs = [
    ('Strategy 1 — RSI Oversold DCA Long', 'd1'),
    ('Strategy 2 — MA Support DCA', 'd2'),
    ('Strategy 3 — S/R Bounce (Default)', 'd3'),
    ('Strategy 4 — MA Crossover + RSI Confirmation', 'd4'),
    ('Strategy 5 — Bollinger Band Mean Reversion', 'd5'),
    ('Strategy 6 — Breakout + Volume Confirmation', 'd6'),
    ('Strategy 7 — MA Ribbon Long', 'd7'),
    ('Strategy 8 — MACD Divergence', 'd8'),
    ('Strategy 9 — Funding Rate Contrarian', 'd9'),
    ('Strategy 10 — ATR Trend Following', 'd10'),
]
s05_originals = {
    'd1': 'Enters a long position when the 14-period RSI on the user-selected timeframe drops to or below 30 (oversold). DCA entries are placed at N-equal intervals between the first entry price and the swing low (SL). Take profit targets the nearest resistance level above entry. <strong>Short side (RSI ≥ 70) is disabled</strong> — momentum can sustain above 70 for extended periods in bull markets.',
    'd2': 'Requires at least 3 of 6 moving averages (10, 20, 50, 100, 200 SMA + 34 EMA) to be in bullish alignment (price above all selected MAs). Enters long when the 5m candle wicks down to the nearest MA and closes above it — a pullback-to-MA bounce. Long only; no short entries.',
    'd3': 'The built-in default strategy. Detects support and resistance levels from 1H/4H candles using swing highs/lows and volume profile. Enters long when the 5m price touches a support level with a bullish bounce candle. Enters short when a bearish impulse candle with above-average volume is followed by a 50% retracement to resistance. SL = swing low (long) / swing high (short) of the 3 preceding 5m candles.',
    'd4': 'Long: 10 EMA crosses above 34 EMA (golden cross) AND RSI ≥ 65 on the signal candle. Short: 10 EMA crosses below 34 EMA (death cross) AND RSI ≤ 35. DCA entries are spaced between the signal candle price and the swing low/high of the preceding 3 candles on the 5m chart. <strong>Note:</strong> RSI condition is checked at the candle that closes the crossover — if RSI has not yet reached the threshold, the bot waits for confirmation on the next candle.',
    'd5': 'Uses a 20-period BB with 2 standard deviations. Enters long when the 5m candle closes below the lower band and the next candle closes back inside the band (re-entry confirmation). Enters short on the mirror condition at the upper band. Trend filter: long entries are skipped when the daily trend is strongly bearish (price below 200 SMA).',
    'd6': 'Identifies the 20-period resistance level on the 1H chart. Enters long when a 5m candle closes above this level with volume ≥ 2× the 20-period average volume. The broken resistance becomes the first DCA reference price. SL = candle low of the breakout bar. Long-biased; short breakdowns available on Premium with an additional RSI filter.',
    'd7': 'Requires 6 MAs (10, 20, 34, 50, 100, 200) to be in full bullish alignment (each MA above the next longer one). Enters long when price touches the shortest MA (10) in the ribbon and the last 3 candles on 5m show a pullback. This strategy only fires in confirmed strong uptrends. Long only.',
    'd8': 'Detects bullish divergence (price makes lower low, MACD histogram makes higher low) for long entries, and bearish divergence for shorts. Divergence is confirmed over the last 10 candles on the user-selected timeframe. Requires an RSI filter (RSI > 40 for longs, RSI &lt; 60 for shorts) to avoid divergence trades in strongly trending markets.',
    'd9': 'Perpetual swap funding rates reveal market sentiment. When the funding rate exceeds <strong>+0.10%</strong> per 8h (the market is heavily long), the bot fades the crowd with a short entry. When it drops below <strong>−0.05%</strong> (heavily short), it enters long. This strategy is checked once per funding interval and does not use 5m signal detection.',
    'd10': 'Requires ADX > 25 (strong trend confirmed) on the 1H chart and price to be in an uptrend (above 50 SMA). Enters long when price pulls back by exactly 1 ATR from the recent high and starts recovering. SL = entry minus 1.5 ATR. Long-biased; short entries require ADX > 30 and price below 50 SMA.',
}

for key, original in s05_originals.items():
    old = f'<p>{original}</p>'
    new = f'<p data-guide-i18n="s05.{key}">{original}</p>'
    assert old in content, f"s05.{key} paragraph not found verbatim"
    content = content.replace(old, new, 1)

# ── 2. Insert data-guide-i18n attributes into Section 11 flow steps ──
s11_steps = [
    ('Analysis finds [S급] support at $100,000',
     'Level exists on both 1H and 4H. Volume profile confirms high volume at this zone. Grade: S.', 1),
    ('5m momentum: 3 consecutive falling candles → LONG signal',
     'Prev 5m candle low = $97,100. SL distance = 2.9% → too tight, bot skips this tick.', 2),
    ('Next cron: prev candle low = $96,800 → SL distance = 3.2% ✓',
     'All 3 conditions pass. Entry #1 placed: LONG $400 (0.002 BTC × 5× = $2,000 notional). SL set at $96,800. TP = nearest resistance at $105,000.', 3),
    ('Price dips to $99,500 → Entry #2 triggered',
     'Still within ±2% of first entry ($100,000). Signal re-triggers at support. Entry #2: $400 more. Avg entry ≈ $99,750.', 4),
    ('Price recovers, hits TP at $105,000 → Partial close',
     '50% of total position closed at $105,000. Profit on first half: ~$260. SL moved to break-even ($99,750).', 5),
    ('Price pushes to $108,000 then pulls back to $99,750',
     'SL (break-even) hit. Remaining 50% closed at $99,750. Net on second half: ~$0 (minus fees). Total trade: +~$260 profit.', 6),
]
for name, desc, i in s11_steps:
    old_name = f'<div class="flow-name">{name}</div>'
    new_name = f'<div class="flow-name" data-guide-i18n="s11.f{i}.name">{name}</div>'
    assert old_name in content, f"s11.f{i}.name not found verbatim"
    content = content.replace(old_name, new_name, 1)

    old_desc = f'<div class="flow-desc">{desc}</div>'
    new_desc = f'<div class="flow-desc" data-guide-i18n="s11.f{i}.desc">{desc}</div>'
    assert old_desc in content, f"s11.f{i}.desc not found verbatim"
    content = content.replace(old_desc, new_desc, 1)

# ── 3. Insert data-guide-i18n attributes into Section 12 parameter table ──
s12_rows = [
    ('Max Position Size', 'Half-Kelly default', 1),
    ('Max Leverage', 'Warning triggers above 20×', 2),
    ('Number of Entries', 'Kelly warning above 40% total', 3),
    ('Entry Sizing', 'Equal recommended', 4),
    ('Daily Loss Limit', 'Enabled by default', 5),
    ('S/R tolerance (detection)', 'Touch band for level confirmation', 6),
    ('S/R tolerance (dedup)', 'Merge nearby duplicate levels', 7),
    ('Entry touch tolerance', 'Distance from level for entry', 8),
    ('SL distance range', 'Below 3% or above 6% = skip', 9),
    ('Fractional entry range', 'Max drift from first entry for #2/#3', 10),
    ('Recency window', '2 touches sufficient within this range', 11),
    ('Max S/R age', 'Older levels ignored', 12),
    ('Volume profile buckets', 'Granularity of volume zones', 13),
    ('Volume zone threshold', 'Min volume to count as a zone', 14),
    ('Vol zone ↔ S/R overlap', 'Zone must be near S/R to be used', 15),
    ('Partial close on TP', 'SL moves to break-even after', 16),
]
for param, note, i in s12_rows:
    old_param = f'<td class="td-label">{param}</td>'
    new_param = f'<td class="td-label" data-guide-i18n="s12.param{i}">{param}</td>'
    assert old_param in content, f"s12.param{i} not found verbatim"
    content = content.replace(old_param, new_param, 1)

    old_note = f'<td>{note}</td>'
    new_note = f'<td data-guide-i18n="s12.note{i}">{note}</td>'
    assert old_note in content, f"s12.note{i} not found verbatim"
    content = content.replace(old_note, new_note, 1)

# ── 4. Replace the patch block with the fully merged dict ──
patch_json = json.dumps(merged, ensure_ascii=False)
marker_start = "  (function(p) {\n    for (var l in p) { if (GT[l]) { var d = p[l]; for (var k in d) GT[l][k] = d[k]; } }\n  }("
marker_end = "));\n"
start_idx = content.find(marker_start)
assert start_idx != -1, "patch function marker not found"
rest_start = start_idx + len(marker_start)
end_idx = content.find(marker_end, rest_start)
assert end_idx != -1, "patch end marker not found"

content = content[:rest_start] + patch_json + content[end_idx:]

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done: HTML attributes inserted and patch block replaced with merged dict.")
