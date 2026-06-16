#!/usr/bin/env python3
"""Part 2: Add data-guide-i18n attrs + translations for sections 2, 3, 4, 10, 13"""
import json

with open('/home/user/oracletrading/ayilon/bot-guide.html', 'r', encoding='utf-8') as f:
    content = f.read()

# ═══════════════════════════════════════════════════════════════════════════════
# HTML attribute additions
# ═══════════════════════════════════════════════════════════════════════════════

html_attrs = [
    # SECTION 2
    (
        '  <p>The bot fetches <strong>100 candles each</strong> from the 1H and 4H timeframes simultaneously.',
        '  <p data-guide-i18n="s02.p1">The bot fetches <strong>100 candles each</strong> from the 1H and 4H timeframes simultaneously.'
    ),
    (
        '  <h3>Touch Counting Algorithm</h3>',
        '  <h3 data-guide-i18n="s02.h1">Touch Counting Algorithm</h3>'
    ),
    (
        '  <p>For each candidate price level, the bot counts how many candles touched it.',
        '  <p data-guide-i18n="s02.p2">For each candidate price level, the bot counts how many candles touched it.'
    ),
    (
        '  <div class="callout blue">\n    <div class="callout-label">Recency Weighting</div>',
        '  <div class="callout blue" data-guide-i18n="s02.callout1">\n    <div class="callout-label">Recency Weighting</div>'
    ),
    (
        '  <h3>Level Deduplication</h3>',
        '  <h3 data-guide-i18n="s02.h2">Level Deduplication</h3>'
    ),
    (
        '  <p>After collecting all valid levels, nearby duplicates are merged.',
        '  <p data-guide-i18n="s02.p3">After collecting all valid levels, nearby duplicates are merged.'
    ),
    (
        '  <h3>Final Level Pool</h3>',
        '  <h3 data-guide-i18n="s02.h3">Final Level Pool</h3>'
    ),
    (
        '  <p>After grading and merging 1H + 4H levels,',
        '  <p data-guide-i18n="s02.p4">After grading and merging 1H + 4H levels,'
    ),
    # SECTION 3
    (
        '  <p>Every detected level is assigned a grade based on how many timeframes confirm it',
        '  <p data-guide-i18n="s03.p1">Every detected level is assigned a grade based on how many timeframes confirm it'
    ),
    (
        '      <div class="card-desc">Level appears on <strong>both 1H and 4H</strong>',
        '      <div class="card-desc" data-guide-i18n="s03.card1">Level appears on <strong>both 1H and 4H</strong>'
    ),
    (
        '      <div class="card-desc">4H level with <strong>4+ touches</strong>',
        '      <div class="card-desc" data-guide-i18n="s03.card2">4H level with <strong>4+ touches</strong>'
    ),
    (
        '      <div class="card-desc">1H-only level, older touches, minimum 2 confirmations.',
        '      <div class="card-desc" data-guide-i18n="s03.card3">1H-only level, older touches, minimum 2 confirmations.'
    ),
    (
        '  <h3>Grading Logic</h3>',
        '  <h3 data-guide-i18n="s03.h1">Grading Logic</h3>'
    ),
    (
        '  <div class="callout">\n    <div class="callout-label">Log Format</div>',
        '  <div class="callout" data-guide-i18n="s03.callout1">\n    <div class="callout-label">Log Format</div>'
    ),
    # SECTION 4
    (
        '  <p>On top of price-based S/R, the bot builds a <strong>volume profile</strong>',
        '  <p data-guide-i18n="s04.p1">On top of price-based S/R, the bot builds a <strong>volume profile</strong>'
    ),
    (
        '  <h3>How It Works</h3>\n  <ol>',
        '  <h3 data-guide-i18n="s04.h1">How It Works</h3>\n  <ol data-guide-i18n="s04.ol">'
    ),
    (
        '  <div class="callout yellow">\n    <div class="callout-label">Noise Filter — Critical Rule</div>',
        '  <div class="callout yellow" data-guide-i18n="s04.callout1">\n    <div class="callout-label">Noise Filter — Critical Rule</div>'
    ),
    (
        '  <p>After filtering, up to <strong>3 volume-confirmed supports',
        '  <p data-guide-i18n="s04.p2">After filtering, up to <strong>3 volume-confirmed supports'
    ),
    # SECTION 10
    (
        '  <p>The daily loss limit is a circuit breaker',
        '  <p data-guide-i18n="s10.p1">The daily loss limit is a circuit breaker'
    ),
    (
        '  <h3>What Happens When Limit Is Hit</h3>\n  <ol>',
        '  <h3 data-guide-i18n="s10.h1">What Happens When Limit Is Hit</h3>\n  <ol data-guide-i18n="s10.ol">'
    ),
    (
        '  <h3>How to Resume</h3>',
        '  <h3 data-guide-i18n="s10.h2">How to Resume</h3>'
    ),
    (
        '  <p>From the dashboard, you can either:</p>\n  <ul>',
        '  <p data-guide-i18n="s10.p2">From the dashboard, you can either:</p>\n  <ul data-guide-i18n="s10.ul">'
    ),
    # SECTION 13
    (
        '  <p>Demo Mode routes all API calls to OKX',
        '  <p data-guide-i18n="s13.p1">Demo Mode routes all API calls to OKX'
    ),
    (
        '  <h3>How It Works</h3>\n  <p>When Demo Mode is enabled',
        '  <h3 data-guide-i18n="s13.h1">How It Works</h3>\n  <p data-guide-i18n="s13.p2">When Demo Mode is enabled'
    ),
    (
        '  <div class="callout yellow">\n    <div class="callout-label">Important — Separate API Keys Required</div>',
        '  <div class="callout yellow" data-guide-i18n="s13.callout1">\n    <div class="callout-label">Important — Separate API Keys Required</div>'
    ),
    (
        '  <h3>Recommended Usage</h3>',
        '  <h3 data-guide-i18n="s13.h2">Recommended Usage</h3>'
    ),
    (
        '  <p>Run Demo Mode for at least 2',
        '  <p data-guide-i18n="s13.p3">Run Demo Mode for at least 2'
    ),
]

for old, new in html_attrs:
    assert old in content, f"NOT FOUND: {repr(old[:70])}"
    content = content.replace(old, new, 1)

print(f"Added {len(html_attrs)} data-guide-i18n attributes")

# ═══════════════════════════════════════════════════════════════════════════════
# Translations
# ═══════════════════════════════════════════════════════════════════════════════

patch = {lang: {} for lang in ['ko','ja','zh','vi','ru','tr','es','pt','id']}

# ── Section 2 ─────────────────────────────────────────────────────────────────
for lang, vals in {
    'ko': {
        's02.p1': '봇은 1H 및 4H 타임프레임에서 동시에 <strong>각 100개의 캔들</strong>을 가져옵니다. 이 캔들들의 모든 고점과 저점을 스캔하여 지지 및 저항 레벨을 식별합니다.',
        's02.h1': '터치 카운팅 알고리즘',
        's02.p2': '각 후보 가격 레벨에 대해 봇은 몇 개의 캔들이 터치했는지 계산합니다. 캔들의 고점 또는 저점이 레벨의 <code>±0.3%</code> 허용 범위 내에 있으면 "터치"로 간주합니다.',
        's02.callout1': '<div class="callout-label">최근성 가중치</div>레벨의 필요 터치 수는 터치가 <strong>얼마나 최근</strong>인지에 따라 달라집니다. 최근 가격 반응이 오래된 것보다 더 중요하다는 실제 시장 관찰을 반영합니다.',
        's02.h2': '레벨 중복 제거',
        's02.p3': '유효한 레벨이 수집된 후 가까운 중복 레벨이 병합됩니다. 서로 <strong>0.5%</strong> 이내에 있는 두 레벨은 같은 존으로 간주합니다. 타임프레임당 상위 4개의 지지(현재가 아래)와 상위 4개의 저항(현재가 위)이 유지됩니다.',
        's02.h3': '최종 레벨 풀',
        's02.p4': '1H + 4H 레벨을 등급화하고 병합한 후, 최종 세트는 현재가에 근접한 순서로 정렬된 <strong>5개의 지지 + 5개의 저항</strong>으로 제한됩니다.',
    },
    'ja': {
        's02.p1': 'ボットは1Hと4Hのタイムフレームから同時に<strong>各100本のローソク足</strong>を取得します。これらのローソク足のすべての高値と安値をスキャンしてサポート/レジスタンスレベルを特定します。',
        's02.h1': 'タッチカウントアルゴリズム',
        's02.p2': '各候補価格レベルについて、ボットは何本のローソク足がタッチしたかを数えます。ローソク足の高値または安値がそのレベルの<code>±0.3%</code>許容バンド内にある場合、「タッチ」とみなします。',
        's02.callout1': '<div class="callout-label">直近重み付け</div>レベルの必要タッチ数は、そのタッチが<strong>どれだけ最近</strong>かによって異なります。最近の価格反応が古いものより重要だという実際の市場観察を反映しています。',
        's02.h2': 'レベルの重複排除',
        's02.p3': 'すべての有効なレベルを収集した後、近くの重複が統合されます。互いに<strong>0.5%</strong>以内にある2つのレベルは同じゾーンとみなします。タイムフレームごとに上位4つのサポート（価格より下）と上位4つのレジスタンス（価格より上）が保持されます。',
        's02.h3': '最終レベルプール',
        's02.p4': '1Hと4Hのレベルをグレード付けして統合した後、最終セットは現在価格に近い順にソートされた<strong>5サポート + 5レジスタンス</strong>に上限が設けられます。',
    },
    'zh': {
        's02.p1': '机器人同时从1H和4H时间周期各获取<strong>100根K线</strong>，扫描所有K线的高低点以识别支撑和阻力位。',
        's02.h1': '触及计数算法',
        's02.p2': '对于每个候选价格位，机器人统计有多少根K线触及该位置。若K线的高点或低点在该位置的<code>±0.3%</code>容差带内，即视为"触及"。',
        's02.callout1': '<div class="callout-label">近期加权</div>一个级别所需的触及次数取决于这些触及的<strong>近期程度</strong>，反映了近期价格反应比旧反应更具参考价值的市场规律。',
        's02.h2': '级别去重',
        's02.p3': '收集所有有效级别后，将合并相邻的重复级别。相互距离在<strong>0.5%</strong>以内的两个级别视为同一区间。每个时间周期保留最靠近当前价格的4个支撑位和4个阻力位。',
        's02.h3': '最终级别池',
        's02.p4': '对1H和4H级别评分并合并后，最终集合上限为<strong>5个支撑 + 5个阻力</strong>，按与当前价格的接近程度排序。',
    },
    'vi': {
        's02.p1': 'Bot lấy đồng thời <strong>100 nến từ mỗi</strong> khung thời gian 1H và 4H, quét tất cả giá cao và thấp để xác định mức hỗ trợ và kháng cự.',
        's02.h1': 'Thuật toán đếm số lần chạm',
        's02.p2': 'Với mỗi mức giá ứng viên, bot đếm bao nhiêu nến đã chạm nó. Một nến "chạm" mức nếu giá cao hoặc thấp của nó nằm trong biên sai số <code>±0.3%</code> của mức đó.',
        's02.callout1': '<div class="callout-label">Trọng số theo độ gần đây</div>Số lần chạm yêu cầu của một mức phụ thuộc vào <strong>mức độ gần đây</strong> của các lần chạm đó, phản ánh thực tế rằng các phản ứng giá gần đây có trọng số cao hơn.',
        's02.h2': 'Loại bỏ mức trùng lặp',
        's02.p3': 'Sau khi thu thập tất cả mức hợp lệ, các mức gần nhau sẽ được hợp nhất. Hai mức trong phạm vi <strong>0.5%</strong> của nhau được coi là cùng một vùng. Giữ lại 4 hỗ trợ và 4 kháng cự hàng đầu mỗi khung thời gian.',
        's02.h3': 'Tập hợp mức cuối cùng',
        's02.p4': 'Sau khi phân loại và hợp nhất các mức 1H + 4H, tập hợp cuối được giới hạn ở <strong>5 hỗ trợ + 5 kháng cự</strong>, sắp xếp theo độ gần với giá hiện tại.',
    },
    'ru': {
        's02.p1': 'Бот одновременно получает <strong>по 100 свечей</strong> с таймфреймов 1H и 4H и сканирует все максимумы и минимумы для определения уровней поддержки и сопротивления.',
        's02.h1': 'Алгоритм подсчёта касаний',
        's02.p2': 'Для каждого уровня-кандидата бот считает, сколько свечей коснулось его. Свеча считается «касанием», если её максимум или минимум находится в пределах <code>±0.3%</code> от уровня.',
        's02.callout1': '<div class="callout-label">Взвешивание по давности</div>Необходимое количество касаний зависит от <strong>свежести</strong> этих касаний, отражая реальное наблюдение: недавние реакции цены весомее старых.',
        's02.h2': 'Дедупликация уровней',
        's02.p3': 'После сбора всех валидных уровней близкие дубликаты объединяются. Два уровня в пределах <strong>0.5%</strong> друг от друга считаются одной зоной. На каждом таймфрейме оставляются 4 лучших поддержки и 4 лучших сопротивления.',
        's02.h3': 'Финальный пул уровней',
        's02.p4': 'После грейдирования и объединения уровней 1H + 4H итоговый набор ограничен <strong>5 поддержками + 5 сопротивлениями</strong>, отсортированными по близости к текущей цене.',
    },
    'tr': {
        's02.p1': 'Bot, 1H ve 4H zaman dilimlerinden eş zamanlı olarak <strong>her birinden 100 mum</strong> çeker ve destek/direnç seviyelerini belirlemek için tüm yüksek ve düşük fiyatları tarar.',
        's02.h1': 'Dokunma Sayım Algoritması',
        's02.p2': 'Her aday fiyat seviyesi için bot, kaç mumun dokunduğunu sayar. Bir mumun yüksek veya düşük değeri seviyenin <code>±0.3%</code> tolerans bandı içindeyse "dokunma" sayılır.',
        's02.callout1': '<div class="callout-label">Yakınlık Ağırlıklandırması</div>Bir seviyenin gerektirdiği dokunma sayısı, bu dokunmaların <strong>ne kadar yakın tarihli</strong> olduğuna bağlıdır. Yakın tarihli fiyat tepkilerinin daha fazla ağırlık taşıdığı gerçeğini yansıtır.',
        's02.h2': 'Seviye Tekilleştirme',
        's02.p3': 'Geçerli tüm seviyeler toplandıktan sonra yakın kopyalar birleştirilir. Birbirine <strong>%0.5</strong> yakın iki seviye aynı bölge sayılır. Her zaman dilimi başına en iyi 4 destek ve 4 direnç tutulur.',
        's02.h3': 'Son Seviye Havuzu',
        's02.p4': '1H + 4H seviyeleri derecelendirip birleştirdikten sonra, nihai set mevcut fiyata yakınlığa göre sıralanmış <strong>5 destek + 5 direnç</strong> ile sınırlandırılır.',
    },
    'es': {
        's02.p1': 'El bot obtiene <strong>100 velas de cada</strong> uno de los marcos temporales 1H y 4H simultáneamente, escaneando todos los máximos y mínimos para identificar niveles de soporte y resistencia.',
        's02.h1': 'Algoritmo de Conteo de Toques',
        's02.p2': 'Para cada nivel de precio candidato, el bot cuenta cuántas velas lo tocaron. Una vela "toca" un nivel si su máximo o mínimo está dentro de una banda de tolerancia de <code>±0.3%</code> de ese nivel.',
        's02.callout1': '<div class="callout-label">Ponderación por Recencia</div>El conteo de toques requerido de un nivel depende de <strong>cuán recientes</strong> son esos toques, reflejando que las reacciones de precio recientes tienen más peso que las antiguas.',
        's02.h2': 'Deduplicación de Niveles',
        's02.p3': 'Después de recopilar todos los niveles válidos, los duplicados cercanos se fusionan. Dos niveles dentro del <strong>0.5%</strong> entre sí se consideran la misma zona. Se mantienen los 4 mejores soportes y 4 mejores resistencias por marco temporal.',
        's02.h3': 'Conjunto Final de Niveles',
        's02.p4': 'Tras clasificar y fusionar los niveles 1H + 4H, el conjunto final se limita a <strong>5 soportes + 5 resistencias</strong>, ordenados por proximidad al precio actual.',
    },
    'pt': {
        's02.p1': 'O bot busca <strong>100 velas de cada</strong> um dos timeframes 1H e 4H simultaneamente, varrendo todos os máximos e mínimos para identificar níveis de suporte e resistência.',
        's02.h1': 'Algoritmo de Contagem de Toques',
        's02.p2': 'Para cada nível de preço candidato, o bot conta quantas velas o tocaram. Uma vela "toca" um nível se seu máximo ou mínimo estiver dentro de uma banda de tolerância de <code>±0.3%</code> desse nível.',
        's02.callout1': '<div class="callout-label">Ponderação por Recência</div>A contagem de toques necessária de um nível depende de <strong>quão recentes</strong> são esses toques, refletindo que reações de preço recentes têm mais peso do que antigas.',
        's02.h2': 'Deduplicação de Níveis',
        's02.p3': 'Após coletar todos os níveis válidos, duplicatas próximas são mescladas. Dois níveis dentro de <strong>0.5%</strong> entre si são considerados a mesma zona. Os 4 melhores suportes e 4 melhores resistências por timeframe são mantidos.',
        's02.h3': 'Pool Final de Níveis',
        's02.p4': 'Após classificar e mesclar os níveis 1H + 4H, o conjunto final é limitado a <strong>5 suportes + 5 resistências</strong>, ordenados por proximidade ao preço atual.',
    },
    'id': {
        's02.p1': 'Bot mengambil <strong>100 lilin dari masing-masing</strong> timeframe 1H dan 4H secara bersamaan, memindai semua harga tertinggi dan terendah untuk mengidentifikasi level support dan resistance.',
        's02.h1': 'Algoritma Penghitungan Sentuhan',
        's02.p2': 'Untuk setiap level harga kandidat, bot menghitung berapa banyak lilin yang menyentuhnya. Sebuah lilin "menyentuh" level jika tinggi atau rendahnya berada dalam band toleransi <code>±0.3%</code> dari level tersebut.',
        's02.callout1': '<div class="callout-label">Pembobotan Recency</div>Jumlah sentuhan yang diperlukan suatu level bergantung pada <strong>seberapa baru</strong> sentuhan tersebut, mencerminkan bahwa reaksi harga terbaru memiliki bobot lebih besar.',
        's02.h2': 'Deduplikasi Level',
        's02.p3': 'Setelah mengumpulkan semua level yang valid, duplikat terdekat digabungkan. Dua level dalam jarak <strong>0.5%</strong> satu sama lain dianggap zona yang sama. 4 support dan 4 resistance terbaik per timeframe dipertahankan.',
        's02.h3': 'Pool Level Akhir',
        's02.p4': 'Setelah menilai dan menggabungkan level 1H + 4H, set akhir dibatasi hingga <strong>5 support + 5 resistance</strong>, diurutkan berdasarkan kedekatan dengan harga saat ini.',
    },
}.items():
    patch[lang].update(vals)

# ── Section 3 ─────────────────────────────────────────────────────────────────
for lang, vals in {
    'ko': {
        's03.p1': '감지된 모든 레벨은 몇 개의 타임프레임이 확인하는지와 터치 이력이 얼마나 강한지에 따라 등급이 부여됩니다. 등급은 각 거래와 함께 기록되어 시간이 지남에 따라 등급별 성과를 추적할 수 있습니다.',
        's03.card1': '레벨이 0.5% 허용 범위 내에서 <strong>1H와 4H 모두</strong>에 나타납니다. 최고 합류도. 가장 강한 신호.',
        's03.card2': '<strong>4번 이상 터치</strong>된 4H 레벨, 또는 <strong>최근 1번 이상 터치</strong>(최근 20개 캔들 이내)된 레벨.',
        's03.card3': '1H 전용 레벨, 오래된 터치, 최소 2회 확인. 신뢰도 낮음 — 여전히 거래되며 별도 기록됩니다.',
        's03.h1': '등급 부여 로직',
        's03.callout1': '<div class="callout-label">로그 형식</div>각 거래 로그에 등급이 표시됩니다: <code>LONG #1/3 @ 105000 | [S급] L:104800 | SL:101200 | TP:108500 | sz:0.0042</code>',
    },
    'ja': {
        's03.p1': '検出されたすべてのレベルは、何タイムフレームで確認されているか、タッチ履歴の強さに基づいてグレードが付けられます。グレードは各取引とともに記録され、層別のパフォーマンスを経時的に追跡できます。',
        's03.card1': 'レベルが0.5%の許容範囲内で<strong>1Hと4H両方</strong>に現れます。最高の合流度。最強のシグナル。',
        's03.card2': '<strong>4回以上タッチ</strong>された4Hレベル、または<strong>最近1回以上タッチ</strong>（直近20本以内）されたレベル。',
        's03.card3': '1H専用レベル、古いタッチ、最低2回の確認。信頼性低め — 引き続き取引され、別途記録されます。',
        's03.h1': 'グレーディングロジック',
        's03.callout1': '<div class="callout-label">ログ形式</div>各取引ログにグレードが表示されます: <code>LONG #1/3 @ 105000 | [S급] L:104800 | SL:101200 | TP:108500 | sz:0.0042</code>',
    },
    'zh': {
        's03.p1': '每个检测到的级别根据多少个时间周期确认它以及触及历史的强度来分级。等级随每笔交易一起记录，便于随时间追踪各级别的表现。',
        's03.card1': '级别在0.5%容差内<strong>同时出现在1H和4H</strong>上。最高共振度，最强信号。',
        's03.card2': '4H级别有<strong>4次以上触及</strong>，或任何级别在最近20根K线内有<strong>至少1次触及</strong>。',
        's03.card3': '仅在1H出现、触及较旧、最低2次确认。置信度较低——仍可交易，单独记录。',
        's03.h1': '评级逻辑',
        's03.callout1': '<div class="callout-label">日志格式</div>每条交易日志显示等级: <code>LONG #1/3 @ 105000 | [S급] L:104800 | SL:101200 | TP:108500 | sz:0.0042</code>',
    },
    'vi': {
        's03.p1': 'Mỗi mức phát hiện được xếp loại dựa trên số khung thời gian xác nhận và độ mạnh của lịch sử chạm. Xếp loại được ghi lại với mỗi giao dịch để theo dõi hiệu suất theo cấp độ.',
        's03.card1': 'Mức xuất hiện trên <strong>cả 1H và 4H</strong> trong phạm vi 0.5%. Hội tụ cao nhất. Tín hiệu mạnh nhất.',
        's03.card2': 'Mức 4H với <strong>4+ lần chạm</strong>, HOẶC bất kỳ mức nào có <strong>ít nhất 1 lần chạm gần đây</strong> (trong 20 nến gần nhất).',
        's03.card3': 'Mức chỉ có trên 1H, lần chạm cũ, tối thiểu 2 xác nhận. Độ tin cậy thấp hơn — vẫn giao dịch được, ghi lại riêng.',
        's03.h1': 'Logic phân loại',
        's03.callout1': '<div class="callout-label">Định dạng nhật ký</div>Mỗi nhật ký giao dịch hiển thị xếp loại: <code>LONG #1/3 @ 105000 | [S급] L:104800 | SL:101200 | TP:108500 | sz:0.0042</code>',
    },
    'ru': {
        's03.p1': 'Каждому обнаруженному уровню присваивается оценка в зависимости от количества подтверждающих таймфреймов и силы истории касаний. Оценка записывается вместе с каждой сделкой для отслеживания результативности по классам.',
        's03.card1': 'Уровень присутствует <strong>как на 1H, так и на 4H</strong> в пределах 0.5%. Наибольшая конвергенция. Сильнейший сигнал.',
        's03.card2': 'Уровень 4H с <strong>4+ касаниями</strong>, ИЛИ любой уровень хотя бы с <strong>1 недавним касанием</strong> (в последних 20 свечах).',
        's03.card3': 'Уровень только 1H, старые касания, минимум 2 подтверждения. Меньшая уверенность — торгуется, записывается отдельно.',
        's03.h1': 'Логика грейдирования',
        's03.callout1': '<div class="callout-label">Формат лога</div>Каждый торговый лог показывает оценку: <code>LONG #1/3 @ 105000 | [S급] L:104800 | SL:101200 | TP:108500 | sz:0.0042</code>',
    },
    'tr': {
        's03.p1': 'Tespit edilen her seviye, kaç zaman diliminin onayladığına ve dokunma geçmişinin ne kadar güçlü olduğuna göre derecelendirilir. Derece her işlemle birlikte kaydedilir.',
        's03.card1': 'Seviye, 0.5% tolerans dahilinde <strong>hem 1S hem 4S\'te</strong> görünür. En yüksek uyum. En güçlü sinyal.',
        's03.card2': '<strong>4+ dokunmalı</strong> 4S seviyesi VEYA son 20 mumda <strong>en az 1 yakın tarihli dokunma</strong>ya sahip herhangi bir seviye.',
        's03.card3': 'Yalnızca 1S seviyesi, eski dokunmalar, minimum 2 onay. Daha düşük güven — hâlâ işlem yapılır, ayrıca kaydedilir.',
        's03.h1': 'Derecelendirme Mantığı',
        's03.callout1': '<div class="callout-label">Günlük Formatı</div>Her işlem günlüğü dereceyi gösterir: <code>LONG #1/3 @ 105000 | [S급] L:104800 | SL:101200 | TP:108500 | sz:0.0042</code>',
    },
    'es': {
        's03.p1': 'Cada nivel detectado recibe una calificación basada en cuántos marcos temporales lo confirman y cuán fuerte es el historial de toques. La calificación se registra con cada operación para seguir el rendimiento por nivel.',
        's03.card1': 'El nivel aparece en <strong>ambos 1H y 4H</strong> dentro del 0.5% de tolerancia. Mayor confluencia. Señal más fuerte.',
        's03.card2': 'Nivel 4H con <strong>4+ toques</strong>, O cualquier nivel con <strong>al menos 1 toque reciente</strong> (dentro de las últimas 20 velas).',
        's03.card3': 'Nivel solo de 1H, toques antiguos, mínimo 2 confirmaciones. Menor confianza — se opera igualmente, registrado por separado.',
        's03.h1': 'Lógica de Calificación',
        's03.callout1': '<div class="callout-label">Formato de Registro</div>Cada registro de operación muestra la calificación: <code>LONG #1/3 @ 105000 | [S급] L:104800 | SL:101200 | TP:108500 | sz:0.0042</code>',
    },
    'pt': {
        's03.p1': 'Cada nível detectado recebe uma classificação com base em quantos timeframes o confirmam e na força do histórico de toques. A classificação é registrada com cada operação para acompanhar o desempenho por nível.',
        's03.card1': 'Nível aparece em <strong>ambos 1H e 4H</strong> dentro de 0.5% de tolerância. Maior confluência. Sinal mais forte.',
        's03.card2': 'Nível 4H com <strong>4+ toques</strong>, OU qualquer nível com <strong>pelo menos 1 toque recente</strong> (dentro das últimas 20 velas).',
        's03.card3': 'Nível apenas de 1H, toques antigos, mínimo 2 confirmações. Menor confiança — ainda operado, registrado separadamente.',
        's03.h1': 'Lógica de Classificação',
        's03.callout1': '<div class="callout-label">Formato de Registro</div>Cada registro de operação mostra a classificação: <code>LONG #1/3 @ 105000 | [S급] L:104800 | SL:101200 | TP:108500 | sz:0.0042</code>',
    },
    'id': {
        's03.p1': 'Setiap level yang terdeteksi diberi peringkat berdasarkan berapa banyak timeframe yang mengonfirmasinya dan seberapa kuat riwayat sentuhannya. Peringkat dicatat bersama setiap perdagangan untuk melacak kinerja per tingkat.',
        's03.card1': 'Level muncul di <strong>1H maupun 4H</strong> dalam toleransi 0.5%. Konfluensi tertinggi. Sinyal terkuat.',
        's03.card2': 'Level 4H dengan <strong>4+ sentuhan</strong>, ATAU level mana pun dengan <strong>setidaknya 1 sentuhan terbaru</strong> (dalam 20 lilin terakhir).',
        's03.card3': 'Level hanya 1H, sentuhan lama, minimal 2 konfirmasi. Kepercayaan lebih rendah — masih diperdagangkan, dicatat secara terpisah.',
        's03.h1': 'Logika Penilaian',
        's03.callout1': '<div class="callout-label">Format Log</div>Setiap log perdagangan menampilkan peringkat: <code>LONG #1/3 @ 105000 | [S급] L:104800 | SL:101200 | TP:108500 | sz:0.0042</code>',
    },
}.items():
    patch[lang].update(vals)

# ── Section 4 ─────────────────────────────────────────────────────────────────
for lang, vals in {
    'ko': {
        's04.p1': '가격 기반 S/R 외에도, 봇은 4H 캔들에서 <strong>거래량 프로파일</strong>을 구축하여 시장이 역사적으로 상당한 시간과 에너지를 투자한 고거래량 가격 클러스터를 찾습니다.',
        's04.h1': '작동 방식',
        's04.ol': '<li>4H 가격 범위(100개 캔들) 전체를 <strong>50개의 동일한 버킷</strong>으로 나눕니다.</li><li>각 캔들의 거래량이 해당 캔들이 걸쳐 있는 버킷에 비례하여 분배됩니다.</li><li>평균의 <strong>2배 이상</strong> 거래량을 가진 버킷이 고거래량 존으로 표시됩니다.</li><li>각 존은 현재가 아래(지지) 또는 위(저항)로 분류됩니다.</li>',
        's04.callout1': '<div class="callout-label">노이즈 필터 — 핵심 규칙</div>거래량 존은 기존 S/R 레벨의 <strong>±1%</strong> 이내에 있을 때만 포함됩니다. 이는 가격 구조 뒷받침 없는 고립된 거래량 스파이크를 봇이 쫓지 않도록 방지합니다.',
        's04.p2': '필터링 후 최대 <strong>3개의 거래량 확인된 지지 + 3개의 저항</strong>이 메인 레벨 풀에 병합됩니다. 이 거래량 기반 S/R 레벨은 최종 신호 결정에서 추가 가중치를 갖습니다.',
    },
    'ja': {
        's04.p1': '価格ベースのS/Rに加えて、ボットは4Hローソク足から<strong>出来高プロファイル</strong>を構築し、市場が歴史的に多くの時間とエネルギーを費やした高出来高価格クラスターを見つけます。',
        's04.h1': '仕組み',
        's04.ol': '<li>4Hの価格レンジ（100本）全体を<strong>50の等しいバケット</strong>に分割します。</li><li>各ローソク足の出来高が、そのローソク足がまたがるバケットに比例して分配されます。</li><li>平均の<strong>2倍以上</strong>の出来高を持つバケットが高出来高ゾーンとしてフラグ付けされます。</li><li>各ゾーンは現在価格より下（サポート）または上（レジスタンス）に分類されます。</li>',
        's04.callout1': '<div class="callout-label">ノイズフィルター — 重要ルール</div>出来高ゾーンは既存のS/Rレベルの<strong>±1%</strong>以内にある場合のみ含まれます。これにより、価格構造の裏付けのない孤立した出来高スパイクをボットが追わないようにします。',
        's04.p2': 'フィルタリング後、最大<strong>3つの出来高確認済みサポート + 3つのレジスタンス</strong>がメインレベルプールに統合されます。これらの出来高基盤のS/Rレベルは最終シグナル決定において追加の重みを持ちます。',
    },
    'zh': {
        's04.p1': '除价格型S/R外，机器人还从4H K线构建<strong>成交量分布</strong>，寻找市场历史上花费大量时间和精力的高成交量价格集群。',
        's04.h1': '工作原理',
        's04.ol': '<li>将4H价格区间（100根K线）平均划分为<strong>50个等分桶</strong>。</li><li>每根K线的成交量按其覆盖的桶比例分配。</li><li>成交量<strong>≥ 平均值2倍</strong>的桶被标记为高成交量区间。</li><li>每个区间根据当前价格分类为支撑（价格以下）或阻力（价格以上）。</li>',
        's04.callout1': '<div class="callout-label">噪音过滤 — 关键规则</div>成交量区间<strong>仅在</strong>与现有S/R级别<strong>±1%</strong>范围内时才被纳入，防止机器人追逐没有价格结构支撑的孤立成交量异常。',
        's04.p2': '过滤后，最多<strong>3个成交量确认的支撑 + 3个阻力</strong>被合并入主级别池。这些有成交量支撑的S/R级别在最终信号决策中具有额外权重。',
    },
    'vi': {
        's04.p1': 'Ngoài S/R dựa trên giá, bot còn xây dựng <strong>hồ sơ khối lượng</strong> từ nến 4H để tìm các cụm giá có khối lượng cao mà thị trường đã tập trung nhiều thời gian và năng lượng.',
        's04.h1': 'Cách hoạt động',
        's04.ol': '<li>Toàn bộ phạm vi giá 4H (100 nến) được chia thành <strong>50 nhóm bằng nhau</strong>.</li><li>Khối lượng của mỗi nến được phân phối theo tỷ lệ trên các nhóm mà nến đó bao phủ.</li><li>Các nhóm có khối lượng <strong>≥ 2× trung bình</strong> được đánh dấu là vùng khối lượng cao.</li><li>Mỗi vùng được phân loại là hỗ trợ (dưới giá hiện tại) hoặc kháng cự (trên giá).</li>',
        's04.callout1': '<div class="callout-label">Bộ lọc nhiễu — Quy tắc quan trọng</div>Vùng khối lượng <strong>chỉ được đưa vào</strong> nếu nằm trong phạm vi <strong>±1%</strong> của mức S/R hiện có, ngăn bot chạy theo các đột biến khối lượng cô lập không có cấu trúc giá hỗ trợ.',
        's04.p2': 'Sau khi lọc, tối đa <strong>3 hỗ trợ + 3 kháng cự được xác nhận bằng khối lượng</strong> được hợp nhất vào pool mức chính. Các mức S/R có khối lượng hỗ trợ này có trọng số thêm trong quyết định tín hiệu cuối cùng.',
    },
    'ru': {
        's04.p1': 'Помимо S/R по цене, бот строит <strong>профиль объёма</strong> на основе свечей 4H, чтобы найти кластеры с высоким объёмом, где рынок исторически провёл значительное время и энергию.',
        's04.h1': 'Принцип работы',
        's04.ol': '<li>Весь ценовой диапазон 4H (100 свечей) делится на <strong>50 равных корзин</strong>.</li><li>Объём каждой свечи распределяется пропорционально по корзинам, которые она охватывает.</li><li>Корзины с объёмом <strong>≥ 2× среднего</strong> помечаются как зоны высокого объёма.</li><li>Каждая зона классифицируется как поддержка (ниже текущей цены) или сопротивление (выше).</li>',
        's04.callout1': '<div class="callout-label">Фильтр шума — Ключевое правило</div>Зоны объёма включаются <strong>только</strong> если они находятся в пределах <strong>±1%</strong> от существующего уровня S/R, предотвращая погоню бота за изолированными всплесками объёма без ценовой структуры.',
        's04.p2': 'После фильтрации до <strong>3 подтверждённых объёмом поддержек + 3 сопротивлений</strong> добавляются в основной пул уровней. Эти уровни S/R с объёмным подтверждением имеют дополнительный вес в финальном сигнале.',
    },
    'tr': {
        's04.p1': 'Fiyat tabanlı S/R\'ye ek olarak, bot 4S mumlardan <strong>hacim profili</strong> oluşturarak piyasanın tarihsel olarak önemli zaman ve enerji harcadığı yüksek hacimli fiyat kümelerini bulur.',
        's04.h1': 'Nasıl Çalışır',
        's04.ol': '<li>4S\'nin tüm fiyat aralığı (100 mum) <strong>50 eşit kovaya</strong> bölünür.</li><li>Her mumun hacmi, o mumun kapsadığı kovaların tamamına orantılı olarak dağıtılır.</li><li>Ortalamadan <strong>2× veya daha fazla</strong> hacme sahip kovalar yüksek hacimli bölge olarak işaretlenir.</li><li>Her bölge, destek (mevcut fiyatın altında) veya direnç (üzerinde) olarak sınıflandırılır.</li>',
        's04.callout1': '<div class="callout-label">Gürültü Filtresi — Kritik Kural</div>Hacim bölgeleri yalnızca mevcut bir S/R seviyesinin <strong>±%1</strong> içinde kalıyorsa dahil edilir. Bu, botun fiyat yapısı olmayan izole hacim artışlarını takip etmesini önler.',
        's04.p2': 'Filtrelemenin ardından en fazla <strong>3 hacim onaylı destek + 3 direnç</strong> ana seviye havuzuna eklenir. Bu hacim destekli S/R seviyeleri, nihai sinyal kararında ek ağırlık taşır.',
    },
    'es': {
        's04.p1': 'Además del S/R basado en precio, el bot construye un <strong>perfil de volumen</strong> a partir de velas 4H para encontrar clústeres de precios de alto volumen donde el mercado ha pasado históricamente tiempo y energía significativos.',
        's04.h1': 'Cómo Funciona',
        's04.ol': '<li>El rango completo de precios 4H (100 velas) se divide en <strong>50 cubos iguales</strong>.</li><li>El volumen de cada vela se distribuye proporcionalmente entre los cubos que abarca.</li><li>Los cubos con volumen <strong>≥ 2× el promedio</strong> se marcan como zonas de alto volumen.</li><li>Cada zona se clasifica como soporte (debajo del precio actual) o resistencia (encima).</li>',
        's04.callout1': '<div class="callout-label">Filtro de Ruido — Regla Crítica</div>Las zonas de volumen <strong>solo se incluyen</strong> si caen dentro del <strong>±1%</strong> de un nivel S/R existente, evitando que el bot persiga picos de volumen aislados sin respaldo de estructura de precio.',
        's04.p2': 'Tras el filtrado, hasta <strong>3 soportes + 3 resistencias confirmados por volumen</strong> se fusionan en el pool principal de niveles. Estos niveles S/R respaldados por volumen tienen peso adicional en la decisión final de señal.',
    },
    'pt': {
        's04.p1': 'Além do S/R baseado em preço, o bot constrói um <strong>perfil de volume</strong> a partir de velas 4H para encontrar clusters de preço de alto volume onde o mercado historicamente passou tempo e energia significativos.',
        's04.h1': 'Como Funciona',
        's04.ol': '<li>O intervalo de preço completo do 4H (100 velas) é dividido em <strong>50 baldes iguais</strong>.</li><li>O volume de cada vela é distribuído proporcionalmente pelos baldes que abrange.</li><li>Baldes com volume <strong>≥ 2× a média</strong> são sinalizados como zonas de alto volume.</li><li>Cada zona é classificada como suporte (abaixo do preço atual) ou resistência (acima).</li>',
        's04.callout1': '<div class="callout-label">Filtro de Ruído — Regra Crítica</div>As zonas de volume <strong>só são incluídas</strong> se estiverem dentro de <strong>±1%</strong> de um nível S/R existente, evitando que o bot persiga picos de volume isolados sem suporte de estrutura de preço.',
        's04.p2': 'Após a filtragem, até <strong>3 suportes + 3 resistências confirmados por volume</strong> são mesclados no pool principal de níveis. Esses níveis S/R com suporte de volume têm peso extra na decisão final de sinal.',
    },
    'id': {
        's04.p1': 'Selain S/R berbasis harga, bot membangun <strong>profil volume</strong> dari lilin 4H untuk menemukan kluster harga bervolume tinggi di mana pasar secara historis menghabiskan waktu dan energi yang signifikan.',
        's04.h1': 'Cara Kerjanya',
        's04.ol': '<li>Seluruh rentang harga 4H (100 lilin) dibagi menjadi <strong>50 ember yang sama</strong>.</li><li>Volume setiap lilin didistribusikan secara proporsional ke ember yang dicakupnya.</li><li>Ember dengan volume <strong>≥ 2× rata-rata</strong> ditandai sebagai zona volume tinggi.</li><li>Setiap zona diklasifikasikan sebagai support (di bawah harga saat ini) atau resistance (di atas).</li>',
        's04.callout1': '<div class="callout-label">Filter Noise — Aturan Penting</div>Zona volume <strong>hanya disertakan</strong> jika berada dalam <strong>±1%</strong> dari level S/R yang ada, mencegah bot mengejar lonjakan volume terisolasi yang tidak didukung struktur harga.',
        's04.p2': 'Setelah penyaringan, hingga <strong>3 support + 3 resistance yang dikonfirmasi volume</strong> digabungkan ke pool level utama. Level S/R berbasis volume ini memiliki bobot ekstra dalam keputusan sinyal akhir.',
    },
}.items():
    patch[lang].update(vals)

# ── Section 10 ────────────────────────────────────────────────────────────────
for lang, vals in {
    'ko': {
        's10.p1': '일일 손실 한도는 나쁜 날 이후 봇의 거래를 중단시켜 일련의 손실이 복리로 쌓여 치명적인 드로다운으로 이어지는 것을 방지하는 서킷 브레이커입니다.',
        's10.h1': '한도 초과 시 처리 과정',
        's10.ol': '<li>봇이 설정에서 <code>running = false</code>로 설정합니다</li><li>대시보드에 알림 배너가 나타납니다</li><li>이메일로 알림이 전송됩니다 (Telegram 설정 시 포함)</li><li>수동으로 재개하기 전까지 추가 주문이 실행되지 않습니다</li>',
        's10.h2': '재개 방법',
        's10.p2': '대시보드에서 다음 중 선택할 수 있습니다:',
        's10.ul': '<li><strong>무시:</strong> 알림을 숨기고 오늘의 손실 카운터를 리셋하지 않고 봇을 다시 활성화합니다 (다음 SL 발생 시 한도가 다시 트리거됩니다)</li><li><strong>재개:</strong> 봇을 다시 활성화하고 오늘의 손실 카운터를 리셋합니다 (새로운 시작)</li>',
    },
    'ja': {
        's10.p1': '日次損失上限は、悪い日の後にボットの取引を停止するサーキットブレーカーで、一連の損失が複利で積み重なり壊滅的なドローダウンになるのを防ぎます。',
        's10.h1': '上限到達時の処理',
        's10.ol': '<li>ボットが設定で<code>running = false</code>に設定します</li><li>ダッシュボードにアラートバナーが表示されます</li><li>メール（Telegram設定時はTelegramも）で通知が送信されます</li><li>手動で再開するまで追加の注文は行われません</li>',
        's10.h2': '再開方法',
        's10.p2': 'ダッシュボードから次のいずれかを選択できます：',
        's10.ul': '<li><strong>非表示：</strong>アラートを隠し、本日の損失カウンターをリセットせずにボットを再有効化します（次のSL発生で上限が再トリガーされます）</li><li><strong>再開：</strong>ボットを再有効化し、本日の損失カウンターをリセットします（再スタート）</li>',
    },
    'zh': {
        's10.p1': '日亏损限额是一个熔断器，在亏损日后停止机器人交易，防止连续亏损复利放大为灾难性回撤。',
        's10.h1': '触及限额时的处理流程',
        's10.ol': '<li>机器人在配置中设置<code>running = false</code></li><li>仪表板显示警告横幅</li><li>通过邮件发送通知（如已配置Telegram则同步发送）</li><li>在手动恢复之前不再下任何订单</li>',
        's10.h2': '如何恢复',
        's10.p2': '在仪表板中，您可以选择：',
        's10.ul': '<li><strong>忽略：</strong>隐藏警告并重新启用机器人，但不重置今日亏损计数器（下次触及SL将再次触发限额）</li><li><strong>恢复：</strong>重新启用机器人并重置今日亏损计数器（全新开始）</li>',
    },
    'vi': {
        's10.p1': 'Giới hạn lỗ ngày là bộ ngắt mạch ngừng bot giao dịch sau một ngày tệ, ngăn chuỗi thua lỗ tích lũy thành rủi ro thảm khốc.',
        's10.h1': 'Xử lý khi chạm giới hạn',
        's10.ol': '<li>Bot đặt <code>running = false</code> trong cấu hình</li><li>Banner cảnh báo xuất hiện trên bảng điều khiển</li><li>Thông báo gửi qua email (và Telegram nếu đã cấu hình)</li><li>Không đặt thêm lệnh nào cho đến khi tiếp tục thủ công</li>',
        's10.h2': 'Cách tiếp tục',
        's10.p2': 'Từ bảng điều khiển, bạn có thể:',
        's10.ul': '<li><strong>Bỏ qua:</strong> Ẩn cảnh báo và bật lại bot mà <em>không</em> đặt lại bộ đếm lỗ hôm nay (lần SL tiếp theo sẽ kích hoạt lại giới hạn)</li><li><strong>Tiếp tục:</strong> Bật lại bot và đặt lại bộ đếm lỗ hôm nay (bắt đầu mới)</li>',
    },
    'ru': {
        's10.p1': 'Дневной лимит убытков — это автоматический выключатель, который останавливает торговлю бота после неудачного дня, предотвращая накопление убытков и катастрофическую просадку.',
        's10.h1': 'Действия при достижении лимита',
        's10.ol': '<li>Бот устанавливает <code>running = false</code> в конфигурации</li><li>На дашборде появляется предупреждающий баннер</li><li>Уведомление отправляется по email (и Telegram, если настроен)</li><li>Никакие новые ордера не размещаются до ручного возобновления</li>',
        's10.h2': 'Как возобновить торговлю',
        's10.p2': 'С дашборда можно:',
        's10.ul': '<li><strong>Закрыть предупреждение:</strong> Скрывает баннер и повторно активирует бота <em>без</em> сброса счётчика убытков (следующий SL снова сработает)</li><li><strong>Возобновить:</strong> Повторно активирует бота и сбрасывает счётчик дневных убытков (с чистого листа)</li>',
    },
    'tr': {
        's10.p1': 'Günlük zarar limiti, kötü bir günün ardından botun işlem yapmasını durduran ve bir dizi kaybın bileşik artarak felaket düzeyinde bir düşüşe dönüşmesini önleyen bir devre kesici mekanizmasıdır.',
        's10.h1': 'Limit Aşıldığında Yapılanlar',
        's10.ol': '<li>Bot yapılandırmada <code>running = false</code> olarak ayarlar</li><li>Panoda uyarı bandı görünür</li><li>E-posta (ve Telegram yapılandırılmışsa) yoluyla bildirim gönderilir</li><li>Manuel olarak devam ettirilinceye kadar başka emir verilmez</li>',
        's10.h2': 'Nasıl Devam Edilir',
        's10.p2': 'Panodan şunlardan birini seçebilirsiniz:',
        's10.ul': '<li><strong>Kapat:</strong> Uyarıyı gizler ve bugünün zarar sayacını sıfırlamadan botu yeniden etkinleştirir (bir sonraki SL yeniden tetiklenecektir)</li><li><strong>Devam Et:</strong> Botu yeniden etkinleştirir ve bugünün zarar sayacını sıfırlar (temiz başlangıç)</li>',
    },
    'es': {
        's10.p1': 'El límite de pérdida diaria es un cortacircuitos que detiene al bot de operar después de un mal día, evitando que una serie de pérdidas se componga en un drawdown catastrófico.',
        's10.h1': 'Qué Sucede Cuando Se Alcanza el Límite',
        's10.ol': '<li>El bot establece <code>running = false</code> en la configuración</li><li>Aparece un banner de alerta en el panel</li><li>Se envía notificación por correo electrónico (y Telegram si está configurado)</li><li>No se colocan más órdenes hasta que se reanude manualmente</li>',
        's10.h2': 'Cómo Reanudar',
        's10.p2': 'Desde el panel, puede:',
        's10.ul': '<li><strong>Ignorar:</strong> Oculta la alerta y reactiva el bot <em>sin</em> resetear el contador de pérdidas de hoy (el próximo SL volverá a activar el límite)</li><li><strong>Reanudar:</strong> Reactiva el bot y resetea el contador de pérdidas de hoy (comienzo limpio)</li>',
    },
    'pt': {
        's10.p1': 'O limite de perda diária é um disjuntor que interrompe o bot de operar após um dia ruim, evitando que uma série de perdas se acumule em um drawdown catastrófico.',
        's10.h1': 'O Que Acontece Quando o Limite É Atingido',
        's10.ol': '<li>O bot define <code>running = false</code> na configuração</li><li>Um banner de alerta aparece no painel</li><li>Notificação enviada por email (e Telegram se configurado)</li><li>Nenhuma ordem adicional é colocada até retomada manual</li>',
        's10.h2': 'Como Retomar',
        's10.p2': 'No painel, você pode:',
        's10.ul': '<li><strong>Ignorar:</strong> Oculta o alerta e reativa o bot <em>sem</em> resetar o contador de perdas de hoje (o próximo SL acionará o limite novamente)</li><li><strong>Retomar:</strong> Reativa o bot e reseta o contador de perdas de hoje (recomeço)</li>',
    },
    'id': {
        's10.p1': 'Batas kerugian harian adalah pemutus sirkuit yang menghentikan bot dari trading setelah hari buruk, mencegah serangkaian kerugian yang berakumulasi menjadi drawdown yang bencana.',
        's10.h1': 'Yang Terjadi Saat Batas Tercapai',
        's10.ol': '<li>Bot mengatur <code>running = false</code> di konfigurasi</li><li>Banner peringatan muncul di dasbor</li><li>Notifikasi dikirim via email (dan Telegram jika dikonfigurasi)</li><li>Tidak ada order lebih lanjut hingga dilanjutkan secara manual</li>',
        's10.h2': 'Cara Melanjutkan',
        's10.p2': 'Dari dasbor, Anda dapat:',
        's10.ul': '<li><strong>Abaikan:</strong> Sembunyikan peringatan dan aktifkan kembali bot <em>tanpa</em> mereset penghitung kerugian hari ini (SL berikutnya akan memicu batas lagi)</li><li><strong>Lanjutkan:</strong> Aktifkan kembali bot dan reset penghitung kerugian hari ini (mulai baru)</li>',
    },
}.items():
    patch[lang].update(vals)

# ── Section 13 ────────────────────────────────────────────────────────────────
for lang, vals in {
    'ko': {
        's13.p1': '데모 모드는 모든 API 호출을 OKX의 <strong>페이퍼 트레이딩 환경</strong>으로 라우팅합니다. 모든 분석 로직, 주문 실행, SL/TP 모니터링이 동일하게 실행되지만 실제 자금은 사용되지 않습니다.',
        's13.h1': '작동 방식',
        's13.p2': '데모 모드가 활성화되면 봇은 모든 OKX API 요청에 <code>x-simulated-trading: 1</code> 헤더를 추가합니다. OKX 서버가 이 요청을 자동으로 시뮬레이션 거래 시스템으로 라우팅합니다.',
        's13.callout1': '<div class="callout-label">중요 — 별도의 API 키 필요</div>OKX 데모 트레이딩은 라이브 계정과 <strong>다른 API 키 세트</strong>를 사용합니다. OKX에 로그인하여 "데모 트레이딩"으로 이동하고 새 API 키를 생성해야 합니다. 데모 API 키는 라이브 API에서 작동하지 않으며 반대도 마찬가지입니다.',
        's13.h2': '권장 사용법',
        's13.p3': '라이브 거래로 전환하기 전에 최소 2–4주 동안 데모 모드를 실행하세요. 이를 통해 재정적 위험 없이 다양한 시장 조건에서 봇의 진입 및 청산 행동이 기대와 일치하는지 확인할 수 있습니다.',
    },
    'ja': {
        's13.p1': 'デモモードはすべてのAPI呼び出しをOKXの<strong>ペーパートレーディング環境</strong>にルーティングします。すべての分析ロジック、注文配置、SL/TPモニタリングは同様に動作しますが、実際の資金は使用されません。',
        's13.h1': '仕組み',
        's13.p2': 'デモモードが有効な場合、ボットはすべてのOKX APIリクエストに<code>x-simulated-trading: 1</code>ヘッダーを追加します。OKXサーバーがこれらのリクエストを自動的にシミュレーション取引システムにルーティングします。',
        's13.callout1': '<div class="callout-label">重要 — 別のAPIキーが必要</div>OKXデモトレーディングはライブアカウントとは<strong>異なるAPIキーセット</strong>を使用します。OKXにログインし、「デモトレーディング」に移動して新しいAPIキーを作成する必要があります。デモAPIキーはライブAPIでは機能せず、逆も同様です。',
        's13.h2': '推奨使用法',
        's13.p3': 'ライブ取引に切り替える前に、少なくとも2〜4週間デモモードを実行してください。これにより、財務リスクなしに様々な市場条件でボットのエントリーと決済の動作が期待通りかを確認できます。',
    },
    'zh': {
        's13.p1': '模拟交易模式将所有API调用路由至OKX的<strong>纸交易环境</strong>。所有分析逻辑、下单和止损/止盈监控均与实盘完全相同，但不使用真实资金。',
        's13.h1': '工作原理',
        's13.p2': '启用模拟交易模式后，机器人会在每次OKX API请求中添加<code>x-simulated-trading: 1</code>请求头，OKX服务器自动将这些请求路由至模拟交易系统。',
        's13.callout1': '<div class="callout-label">重要 — 需要独立API密钥</div>OKX模拟交易使用与实盘账户<strong>不同的API密钥组</strong>。您必须登录OKX，进入"模拟交易"并在那里创建新的API密钥。模拟API密钥无法用于实盘API，反之亦然。',
        's13.h2': '推荐用法',
        's13.p3': '切换至实盘交易前，请至少运行模拟交易模式2–4周，以便在没有财务风险的情况下验证机器人在不同市场条件下的进出场行为符合预期。',
    },
    'vi': {
        's13.p1': 'Chế độ Demo định tuyến tất cả các cuộc gọi API đến <strong>môi trường giao dịch giấy</strong> của OKX. Tất cả logic phân tích, đặt lệnh và giám sát SL/TP hoạt động giống hệt — nhưng không dùng tiền thật.',
        's13.h1': 'Cách hoạt động',
        's13.p2': 'Khi Chế độ Demo được bật, bot thêm header <code>x-simulated-trading: 1</code> vào mọi yêu cầu OKX API. Server OKX tự động định tuyến các yêu cầu này đến hệ thống giao dịch mô phỏng.',
        's13.callout1': '<div class="callout-label">Quan trọng — Cần API Key riêng biệt</div>OKX Demo Trading dùng <strong>bộ API key khác</strong> với tài khoản thật. Bạn phải đăng nhập OKX, vào "Demo Trading" và tạo API key mới ở đó. API key demo sẽ không hoạt động với API thật và ngược lại.',
        's13.h2': 'Khuyến nghị sử dụng',
        's13.p3': 'Chạy Chế độ Demo ít nhất 2–4 tuần trước khi chuyển sang giao dịch thật. Điều này giúp xác nhận hành vi vào lệnh và thoát lệnh của bot khớp với kỳ vọng trong các điều kiện thị trường khác nhau mà không có rủi ro tài chính.',
    },
    'ru': {
        's13.p1': 'Демо-режим направляет все API-вызовы в <strong>среду бумажной торговли</strong> OKX. Вся логика анализа, размещения ордеров и мониторинга SL/TP работает идентично — но реальные деньги не используются.',
        's13.h1': 'Принцип работы',
        's13.p2': 'При включённом демо-режиме бот добавляет заголовок <code>x-simulated-trading: 1</code> к каждому запросу OKX API. Сервер OKX автоматически направляет эти запросы в их систему симулированной торговли.',
        's13.callout1': '<div class="callout-label">Важно — Требуются отдельные API-ключи</div>OKX Demo Trading использует <strong>отдельный набор API-ключей</strong> от реального аккаунта. Необходимо войти в OKX, перейти в «Demo Trading» и создать там новый API-ключ. Демо-ключ не работает с реальным API и наоборот.',
        's13.h2': 'Рекомендации по использованию',
        's13.p3': 'Запустите демо-режим не менее 2–4 недель перед переключением на реальную торговлю. Это позволит убедиться, что поведение бота при входе и выходе из сделок соответствует ожиданиям при различных рыночных условиях без финансового риска.',
    },
    'tr': {
        's13.p1': 'Demo Modu, tüm API çağrılarını OKX\'in <strong>kağıt işlem ortamına</strong> yönlendirir. Tüm analiz mantığı, emir yerleştirme ve SL/TP izleme aynı şekilde çalışır — ancak gerçek para kullanılmaz.',
        's13.h1': 'Nasıl Çalışır',
        's13.p2': 'Demo Modu etkinleştirildiğinde, bot her OKX API isteğine <code>x-simulated-trading: 1</code> başlığını ekler. OKX\'in sunucusu bu istekleri otomatik olarak simüle edilmiş işlem sistemine yönlendirir.',
        's13.callout1': '<div class="callout-label">Önemli — Ayrı API Anahtarları Gerekli</div>OKX Demo Ticareti, canlı hesabınızdakinden <strong>farklı bir API anahtarı seti</strong> kullanır. OKX\'e giriş yapmanız, "Demo Ticaret"e gitmeniz ve orada yeni bir API anahtarı oluşturmanız gerekir. Demo API anahtarı canlı API\'de çalışmaz ve bunun tersi de geçerlidir.',
        's13.h2': 'Önerilen Kullanım',
        's13.p3': 'Canlı ticarete geçmeden önce en az 2–4 hafta Demo Modu çalıştırın. Bu, botun giriş ve çıkış davranışının finansal risk almadan farklı piyasa koşullarında beklentilerinizle örtüşüp örtüşmediğini doğrulamanızı sağlar.',
    },
    'es': {
        's13.p1': 'El modo demo enruta todas las llamadas API al <strong>entorno de paper trading</strong> de OKX. Toda la lógica de análisis, colocación de órdenes y monitoreo SL/TP funciona de manera idéntica — pero no se usa dinero real.',
        's13.h1': 'Cómo Funciona',
        's13.p2': 'Cuando el modo demo está habilitado, el bot añade el encabezado <code>x-simulated-trading: 1</code> a cada solicitud de la API de OKX. El servidor de OKX enruta automáticamente estas solicitudes a su sistema de trading simulado.',
        's13.callout1': '<div class="callout-label">Importante — Se Requieren API Keys Separadas</div>OKX Demo Trading utiliza un <strong>conjunto diferente de API keys</strong> de su cuenta real. Debe iniciar sesión en OKX, navegar a "Demo Trading" y crear una nueva API key allí. La API key demo no funcionará en la API real y viceversa.',
        's13.h2': 'Uso Recomendado',
        's13.p3': 'Ejecute el modo demo durante al menos 2–4 semanas antes de cambiar a trading real. Esto le permite verificar que el comportamiento de entrada y salida del bot coincide con sus expectativas en diferentes condiciones de mercado sin riesgo financiero.',
    },
    'pt': {
        's13.p1': 'O modo Demo roteia todas as chamadas de API para o <strong>ambiente de paper trading</strong> da OKX. Toda a lógica de análise, colocação de ordens e monitoramento de SL/TP funciona de forma idêntica — mas nenhum dinheiro real é usado.',
        's13.h1': 'Como Funciona',
        's13.p2': 'Quando o modo Demo está habilitado, o bot adiciona o cabeçalho <code>x-simulated-trading: 1</code> a cada solicitação da API da OKX. O servidor da OKX roteia essas solicitações automaticamente para seu sistema de trading simulado.',
        's13.callout1': '<div class="callout-label">Importante — API Keys Separadas Necessárias</div>O OKX Demo Trading usa um <strong>conjunto diferente de API keys</strong> da sua conta real. Você deve fazer login na OKX, navegar até "Demo Trading" e criar uma nova API key lá. A API key demo não funcionará na API real e vice-versa.',
        's13.h2': 'Uso Recomendado',
        's13.p3': 'Execute o modo Demo por pelo menos 2–4 semanas antes de mudar para trading real. Isso permite verificar que o comportamento de entrada e saída do bot corresponde às suas expectativas em diferentes condições de mercado sem risco financeiro.',
    },
    'id': {
        's13.p1': 'Mode Demo merutekan semua panggilan API ke <strong>lingkungan paper trading</strong> OKX. Semua logika analisis, penempatan order, dan pemantauan SL/TP berjalan identik — tetapi tidak ada uang nyata yang digunakan.',
        's13.h1': 'Cara Kerjanya',
        's13.p2': 'Saat Mode Demo diaktifkan, bot menambahkan header <code>x-simulated-trading: 1</code> ke setiap permintaan OKX API. Server OKX secara otomatis merutekan permintaan ini ke sistem trading simulasi mereka.',
        's13.callout1': '<div class="callout-label">Penting — API Key Terpisah Diperlukan</div>OKX Demo Trading menggunakan <strong>set API key yang berbeda</strong> dari akun live Anda. Anda harus login ke OKX, navigasi ke "Demo Trading", dan membuat API key baru di sana. API key demo tidak akan berfungsi di API live, dan sebaliknya.',
        's13.h2': 'Penggunaan yang Disarankan',
        's13.p3': 'Jalankan Mode Demo selama setidaknya 2–4 minggu sebelum beralih ke trading nyata. Ini memungkinkan Anda memverifikasi bahwa perilaku masuk dan keluar bot sesuai dengan ekspektasi Anda dalam berbagai kondisi pasar tanpa risiko finansial.',
    },
}.items():
    patch[lang].update(vals)

# ═══════════════════════════════════════════════════════════════════════════════
# Inject patch inside existing IIFE (same approach as part 1)
# ═══════════════════════════════════════════════════════════════════════════════
patch_json = json.dumps(patch, ensure_ascii=False)
IIFE_PATCH_MARKER = '  // i18n patch: additional keys not in the main GT object\n'
assert IIFE_PATCH_MARKER in content, "Part 1 patch marker not found!"

# Replace existing patch block with extended one
old_patch_start = '  // i18n patch: additional keys not in the main GT object\n  (function(p) {\n'
old_patch_end_marker = '  function captureOriginals()'

start = content.find(old_patch_start)
end = content.find(old_patch_end_marker, start)
assert start != -1 and end != -1

new_patch_block = (
    '  // i18n patch: additional keys not in the main GT object\n'
    '  (function(p) {\n'
    '    for (var l in p) { if (GT[l]) { var d = p[l]; for (var k in d) GT[l][k] = d[k]; } }\n'
    f'  }}({patch_json}));\n\n'
)

content = content[:start] + new_patch_block + content[end:]

with open('/home/user/oracletrading/ayilon/bot-guide.html', 'w', encoding='utf-8') as f:
    f.write(content)

total_keys = sum(len(v) for v in patch.values())
print(f"Part 2 done.")
print(f"  - {len(html_attrs)} data-guide-i18n attrs added to sections 2,3,4,10,13")
print(f"  - GT patch updated with {total_keys} total keys across {len(patch)} languages")
