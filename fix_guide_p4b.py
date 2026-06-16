#!/usr/bin/env python3
"""Part 4b: restore sections 2,3,4,10,13 keys lost from fix_guide_p2.py"""
import json

with open('/home/user/oracletrading/_p4_part1.json', 'r', encoding='utf-8') as f:
    state = json.load(f)

LANGS = ['ko', 'ja', 'zh', 'vi', 'ru', 'tr', 'es', 'pt', 'id']
restored_p2 = {lang: {} for lang in LANGS}

# ── Section 2 ──────────────────────────────────────────────────────────
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
    restored_p2[lang].update(vals)

# ── Section 3 ──────────────────────────────────────────────────────────
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
    restored_p2[lang].update(vals)

with open('/home/user/oracletrading/_p4_part2.json', 'w', encoding='utf-8') as f:
    json.dump(restored_p2, f, ensure_ascii=False)
print(f"Section 2+3 restored keys per lang: {len(restored_p2['ko'])}")
