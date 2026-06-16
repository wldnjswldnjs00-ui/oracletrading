#!/usr/bin/env python3
"""Part 1: Fix s08 Korean callout + s01 flow-desc translations"""
import json

with open('/home/user/oracletrading/ayilon/bot-guide.html', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Fix Section 8 Korean callout (critical: shows Korean in ALL languages) ──
OLD_S08 = '''  <div class="callout blue">
    <div class="callout-label">Key Concept — "반 익절" explained</div>
    <strong>"50%"는 수익률이 아닙니다 — 포지션 수량의 절반을 청산하는 것입니다.</strong><br><br>
    예: 0.01 BTC 롱 → 다음 저항선 도달 → 0.005 BTC 청산 (나머지 0.005 BTC는 계속 보유).<br>
    TP 트리거는 "50% 수익"이 아니라 <strong>다음 S/R 레벨 도달</strong>입니다.<br>
    이동폭은 <strong>현물(spot) 기준</strong>이며 보통 3~8%. 5배 레버리지 적용 시 실제 포지션 수익률은 15~40%입니다.
  </div>'''

NEW_S08 = '''  <div class="callout blue" data-guide-i18n="s08.callout">
    <div class="callout-label">Key Concept — "Half-Close" explained</div>
    <strong>"50%" is not a profit percentage — it means closing half the position quantity.</strong><br><br>
    e.g. Long 0.01 BTC → next resistance hit → close 0.005 BTC (hold remaining 0.005 BTC).<br>
    TP trigger is <strong>next S/R level reached</strong>, not "50% profit".<br>
    Spot move is typically 3–8%. At 5× leverage, actual position profit is 15–40%.
  </div>'''

assert OLD_S08 in content, "s08 callout not found!"
content = content.replace(OLD_S08, NEW_S08)

# ── 2. Add data-guide-i18n to Section 1 flow-descs ──────────────────────────
replacements = [
    (
        '        <div class="flow-desc">Cloudflare Workers scheduled event fires. Bot reads config from KV store and checks if <code>running = true</code>.</div>',
        '        <div class="flow-desc" data-guide-i18n="s01.f1.desc">Cloudflare Workers scheduled event fires. Bot reads config from KV store and checks if <code>running = true</code>.</div>'
    ),
    (
        '        <div class="flow-desc">If today\'s realized loss already exceeds the user-set limit, bot halts immediately and sends alert.</div>',
        '        <div class="flow-desc" data-guide-i18n="s01.f2.desc">If today\'s realized loss already exceeds the user-set limit, bot halts immediately and sends alert.</div>'
    ),
    (
        '        <div class="flow-desc">Fetches 100 × 1H candles and 100 × 4H candles. Detects support/resistance levels with recency-weighted touch counting.</div>',
        '        <div class="flow-desc" data-guide-i18n="s01.f3.desc">Fetches 100 × 1H candles and 100 × 4H candles. Detects support/resistance levels with recency-weighted touch counting.</div>'
    ),
    (
        '        <div class="flow-desc">Grades each level S/A/B based on timeframe confluence. Adds volume profile zones that overlap with S/R levels (±1%).</div>',
        '        <div class="flow-desc" data-guide-i18n="s01.f4.desc">Grades each level S/A/B based on timeframe confluence. Adds volume profile zones that overlap with S/R levels (±1%).</div>'
    ),
    (
        '        <div class="flow-desc">Checks if current price is touching a level, 3-candle momentum confirms direction, and SL distance is 3–6%.</div>',
        '        <div class="flow-desc" data-guide-i18n="s01.f5.desc">Checks if current price is touching a level, 3-candle momentum confirms direction, and SL distance is 3–6%.</div>'
    ),
    (
        '        <div class="flow-desc">If all conditions pass, places a market order via OKX API. Records entry in KV state.</div>',
        '        <div class="flow-desc" data-guide-i18n="s01.f6.desc">If all conditions pass, places a market order via OKX API. Records entry in KV state.</div>'
    ),
    (
        '        <div class="flow-desc">On every tick: checks if price has hit TP (→ 50% partial close, SL to break-even) or SL (→ full close).</div>',
        '        <div class="flow-desc" data-guide-i18n="s01.f7.desc">On every tick: checks if price has hit TP (→ 50% partial close, SL to break-even) or SL (→ full close).</div>'
    ),
]

for old, new in replacements:
    assert old in content, f"Not found: {old[:60]}"
    content = content.replace(old, new)

# ── 3. Build GT_PATCH data for s08.callout + s01.f*.desc ─────────────────────

def s08(label, main, ex, tp, move):
    return (f'<div class="callout-label">{label}</div>'
            f'<strong>{main}</strong><br><br>'
            f'{ex}<br>'
            f'TP trigger is <strong>{tp}</strong>.<br>'
            f'{move}')

# s08.callout translations
s08_vals = {
    'ko': ('<div class="callout-label">핵심 개념 — "반 익절" 설명</div>'
           '<strong>"50%"는 수익률이 아닙니다 — 포지션 수량의 절반을 청산하는 것입니다.</strong><br><br>'
           '예: 0.01 BTC 롱 → 다음 저항선 도달 → 0.005 BTC 청산 (나머지 0.005 BTC는 계속 보유).<br>'
           'TP 트리거는 "50% 수익"이 아니라 <strong>다음 S/R 레벨 도달</strong>입니다.<br>'
           '이동폭은 <strong>현물(spot) 기준</strong>이며 보통 3~8%. 5배 레버리지 적용 시 실제 포지션 수익률은 15~40%입니다.'),
    'ja': ('<div class="callout-label">重要概念 — 「半分利確」の説明</div>'
           '<strong>「50%」は利益率ではありません — ポジション数量の半分を決済することです。</strong><br><br>'
           '例：0.01 BTC ロング → 次のレジスタンス到達 → 0.005 BTC 決済（残り0.005 BTCは保持）<br>'
           'TPトリガーは「50%の利益」ではなく <strong>次のS/Rレベル到達</strong>です。<br>'
           'スポット基準の値動きは通常3〜8%。5倍レバレッジ時の実際のポジション利益率は15〜40%です。'),
    'zh': ('<div class="callout-label">核心概念 — "半仓止盈"说明</div>'
           '<strong>"50%"不是利润率 — 而是平掉一半持仓数量。</strong><br><br>'
           '例：多头持有0.01 BTC → 触及下一阻力位 → 平仓0.005 BTC（剩余0.005 BTC继续持有）<br>'
           'TP触发条件是 <strong>到达下一个S/R位</strong>，而非"50%盈利"。<br>'
           '现货波动幅度通常为3~8%。5倍杠杆下实际持仓盈利率为15~40%。'),
    'vi': ('<div class="callout-label">Khái niệm cốt lõi — Giải thích "Đóng nửa vị thế"</div>'
           '<strong>"50%" không phải tỷ lệ lợi nhuận — mà là đóng nửa số lượng vị thế.</strong><br><br>'
           'Ví dụ: Long 0.01 BTC → chạm kháng cự tiếp theo → đóng 0.005 BTC (giữ 0.005 BTC còn lại).<br>'
           'TP kích hoạt khi <strong>chạm mức S/R tiếp theo</strong>, không phải "lợi nhuận 50%".<br>'
           'Biên độ giá spot thường 3–8%. Với đòn bẩy 5×, lợi nhuận vị thế thực tế là 15–40%.'),
    'ru': ('<div class="callout-label">Ключевая концепция — объяснение "частичного закрытия"</div>'
           '<strong>"50%" — это не процент прибыли, а закрытие половины объёма позиции.</strong><br><br>'
           'Пример: лонг 0.01 BTC → следующий уровень сопротивления достигнут → закрыть 0.005 BTC (удержать 0.005 BTC).<br>'
           'TP срабатывает при <strong>достижении следующего уровня S/R</strong>, а не при "50% прибыли".<br>'
           'Движение спот-цены обычно 3–8%. При 5× плечо реальная прибыль позиции составляет 15–40%.'),
    'tr': ('<div class="callout-label">Temel Kavram — "Yarı Kapatma" açıklaması</div>'
           '<strong>"50%", kâr oranı değildir — pozisyon miktarının yarısını kapatmak demektir.</strong><br><br>'
           'Örn: 0.01 BTC long → sonraki direnç seviyesine ulaşıldı → 0.005 BTC kapatıldı (kalan 0.005 BTC tutulmaya devam eder).<br>'
           'TP tetikleyicisi <strong>sonraki S/R seviyesine ulaşılmasıdır</strong>, "50% kâr" değildir.<br>'
           'Spot hareket tipik olarak 3–8%\'dir. 5× kaldıraçla gerçek pozisyon kârı 15–40%\'tir.'),
    'es': ('<div class="callout-label">Concepto clave — Explicación del "Cierre parcial"</div>'
           '<strong>"50%" no es un porcentaje de ganancia — significa cerrar la mitad de la cantidad de la posición.</strong><br><br>'
           'Ej: Long 0.01 BTC → siguiente resistencia alcanzada → cerrar 0.005 BTC (mantener los 0.005 BTC restantes).<br>'
           'El TP se activa cuando se <strong>alcanza el siguiente nivel S/R</strong>, no cuando se obtiene "50% de ganancia".<br>'
           'El movimiento spot es típicamente 3–8%. Con apalancamiento 5×, la ganancia real de la posición es 15–40%.'),
    'pt': ('<div class="callout-label">Conceito-chave — Explicação do "Fechamento parcial"</div>'
           '<strong>"50%" não é uma porcentagem de lucro — significa fechar metade da quantidade da posição.</strong><br><br>'
           'Ex: Long 0.01 BTC → próxima resistência atingida → fechar 0.005 BTC (manter os 0.005 BTC restantes).<br>'
           'O TP é ativado quando o <strong>próximo nível S/R é atingido</strong>, não quando se obtém "50% de lucro".<br>'
           'O movimento spot é tipicamente 3–8%. Com alavancagem 5×, o lucro real da posição é 15–40%.'),
    'id': ('<div class="callout-label">Konsep Utama — Penjelasan "Penutupan Setengah Posisi"</div>'
           '<strong>"50%" bukan persentase keuntungan — melainkan menutup setengah jumlah posisi.</strong><br><br>'
           'Contoh: Long 0.01 BTC → mencapai resistansi berikutnya → tutup 0.005 BTC (tahan 0.005 BTC sisanya).<br>'
           'TP dipicu saat <strong>level S/R berikutnya tercapai</strong>, bukan "50% profit".<br>'
           'Pergerakan spot biasanya 3–8%. Dengan leverage 5×, keuntungan posisi aktual adalah 15–40%.'),
}

# s01.f*.desc translations per language
f_descs = {
    'ko': [
        'Cloudflare Workers 스케줄 이벤트가 실행됩니다. 봇은 KV 스토어에서 설정을 읽고 <code>running = true</code>인지 확인합니다.',
        '오늘의 실현 손실이 설정된 한도를 초과하면 봇이 즉시 멈추고 알림을 전송합니다.',
        '1H 캔들 100개와 4H 캔들 100개를 가져옵니다. 최근성 가중치 터치 카운팅으로 지지/저항 레벨을 감지합니다.',
        '타임프레임 합류도를 기반으로 각 레벨을 S/A/B로 등급화합니다. S/R 레벨과 ±1% 이내에서 겹치는 거래량 프로파일 존을 추가합니다.',
        '현재 가격이 레벨을 터치하는지, 3캔들 모멘텀이 방향을 확인하는지, SL 거리가 3–6%인지 확인합니다.',
        '모든 조건이 통과되면 OKX API를 통해 시장가 주문을 실행합니다. KV 상태에 진입 기록을 저장합니다.',
        '매 틱마다: 가격이 TP에 도달했는지(→ 50% 부분 청산, SL을 본절로 이동) 또는 SL에 도달했는지(→ 전체 청산) 확인합니다.',
    ],
    'ja': [
        'Cloudflare Workersのスケジュールイベントが起動します。ボットはKVストアから設定を読み込み、<code>running = true</code>を確認します。',
        '本日の実現損失が設定の上限を既に超えている場合、ボットは直ちに停止してアラートを送信します。',
        '1Hローソク足100本と4Hローソク足100本を取得します。直近重み付けのタッチカウントでS/Rレベルを検出します。',
        'タイムフレームの合流に基づいて各レベルをS/A/Bにグレード付けします。S/Rレベルから±1%以内の出来高プロファイルゾーンを追加します。',
        '現在価格がレベルを触れているか、3本足のモメンタムが方向を確認しているか、SL距離が3〜6%かをチェックします。',
        '全条件が揃えば、OKX APIでマーケット注文を発注します。エントリーをKVステートに記録します。',
        '毎ティック：価格がTP到達（→ 50%部分決済、SLをブレークイーブンへ移動）またはSL到達（→ 全決済）を確認します。',
    ],
    'zh': [
        'Cloudflare Workers计划事件触发。机器人从KV存储读取配置并检查<code>running = true</code>。',
        '若今日已实现亏损超过用户设定的限额，机器人立即停止并发送提醒。',
        '同时获取1H和4H各100根K线，用近期加权触及计数法识别支撑/阻力位。',
        '根据时间周期共振为每个级别评分S/A/B，并添加与S/R级别重叠（±1%）的成交量分布区间。',
        '检查当前价格是否触及某个级别、3根K线动能是否确认方向，以及SL距离是否在3–6%之间。',
        '若所有条件通过，通过OKX API发出市价单，并将入场记录写入KV状态。',
        '每次心跳：检查价格是否触及TP（→ 50%部分平仓，SL移至保本价）或触及SL（→ 全部平仓）。',
    ],
    'vi': [
        'Sự kiện cron theo lịch của Cloudflare Workers kích hoạt. Bot đọc cấu hình từ KV store và kiểm tra <code>running = true</code>.',
        'Nếu lỗ đã thực hiện hôm nay vượt quá giới hạn người dùng đặt, bot dừng ngay và gửi cảnh báo.',
        'Lấy 100 nến 1H và 100 nến 4H. Phát hiện mức hỗ trợ/kháng cự với phương pháp đếm số lần chạm có trọng số theo độ gần đây.',
        'Phân loại mỗi mức S/A/B dựa trên sự hội tụ khung thời gian. Thêm vùng khối lượng trùng khớp với mức S/R (±1%).',
        'Kiểm tra giá hiện tại có chạm mức không, động lượng 3 nến xác nhận hướng, và khoảng cách SL 3–6%.',
        'Nếu tất cả điều kiện đạt, đặt lệnh thị trường qua OKX API. Ghi lần vào lệnh vào trạng thái KV.',
        'Mỗi tick: kiểm tra giá chạm TP (→ đóng 50%, SL về hòa vốn) hay SL (→ đóng toàn bộ).',
    ],
    'ru': [
        'Запускается запланированное событие Cloudflare Workers. Бот считывает конфигурацию из KV-хранилища и проверяет <code>running = true</code>.',
        'Если сегодняшний реализованный убыток уже превысил установленный лимит, бот немедленно останавливается и отправляет оповещение.',
        'Получает 100 свечей 1H и 100 свечей 4H. Определяет уровни S/R методом взвешенного подсчёта касаний с учётом давности.',
        'Присваивает каждому уровню оценку S/A/B на основе подтверждения несколькими таймфреймами. Добавляет зоны объёма, совпадающие с S/R-уровнями (±1%).',
        'Проверяет, касается ли текущая цена уровня, подтверждает ли моментум 3 свечей направление и находится ли расстояние SL в диапазоне 3–6%.',
        'При выполнении всех условий размещает рыночный ордер через OKX API. Записывает вход в KV-состояние.',
        'На каждом тике: проверяет достижение TP (→ 50% частичное закрытие, SL на безубыток) или SL (→ полное закрытие).',
    ],
    'tr': [
        'Cloudflare Workers zamanlanmış olayı tetiklenir. Bot, KV deposundan yapılandırmayı okur ve <code>running = true</code> olup olmadığını kontrol eder.',
        'Bugünün gerçekleşen kaybı zaten kullanıcı tarafından belirlenen limiti aşmışsa, bot derhal durur ve uyarı gönderir.',
        '100 adet 1S mum ve 100 adet 4S mum çeker. Yakınlık ağırlıklı dokunma sayımı ile destek/direnç seviyeleri tespit edilir.',
        'Her seviyeyi zaman dilimi uyumuna göre S/A/B olarak derecelendirir. S/R seviyeleriyle örtüşen (±1%) hacim profil bölgeleri eklenir.',
        'Mevcut fiyatın bir seviyeye dokunup dokunmadığını, 3 mumlu momentumun yönü onaylayıp onaylamadığını ve SL mesafesinin 3–6% arasında olup olmadığını kontrol eder.',
        'Tüm koşullar sağlanırsa OKX API aracılığıyla piyasa emri verilir. Giriş KV durumuna kaydedilir.',
        'Her tik\'te: fiyatın TP\'ye ulaşıp ulaşmadığını (→ %50 kısmi kapatma, SL başabaşa taşınır) veya SL\'ye ulaşıp ulaşmadığını (→ tam kapatma) kontrol eder.',
    ],
    'es': [
        'El evento programado de Cloudflare Workers se activa. El bot lee la configuración del KV store y verifica si <code>running = true</code>.',
        'Si la pérdida realizada hoy ya supera el límite establecido, el bot se detiene inmediatamente y envía una alerta.',
        'Obtiene 100 velas 1H y 100 velas 4H. Detecta niveles de soporte/resistencia con conteo de toques ponderado por recencia.',
        'Clasifica cada nivel S/A/B según la confluencia de marcos temporales. Añade zonas de perfil de volumen que se superponen con niveles S/R (±1%).',
        'Verifica si el precio actual está tocando un nivel, el momentum de 3 velas confirma la dirección y la distancia SL es 3–6%.',
        'Si todas las condiciones se cumplen, coloca una orden de mercado via API de OKX. Registra la entrada en el estado KV.',
        'En cada tick: verifica si el precio ha alcanzado el TP (→ 50% cierre parcial, SL al punto de equilibrio) o el SL (→ cierre total).',
    ],
    'pt': [
        'O evento agendado do Cloudflare Workers é disparado. O bot lê a configuração do KV store e verifica se <code>running = true</code>.',
        'Se a perda realizada hoje já excede o limite definido, o bot para imediatamente e envia um alerta.',
        'Busca 100 velas 1H e 100 velas 4H. Detecta níveis de suporte/resistência com contagem de toques ponderada por recência.',
        'Classifica cada nível S/A/B com base na confluência de timeframes. Adiciona zonas de perfil de volume que se sobrepõem a níveis S/R (±1%).',
        'Verifica se o preço atual está tocando um nível, o momentum de 3 velas confirma a direção e a distância SL é 3–6%.',
        'Se todas as condições passam, coloca uma ordem de mercado via API da OKX. Registra a entrada no estado KV.',
        'Em cada tick: verifica se o preço atingiu o TP (→ 50% fechamento parcial, SL ao break-even) ou SL (→ fechamento total).',
    ],
    'id': [
        'Event terjadwal Cloudflare Workers terpicu. Bot membaca konfigurasi dari KV store dan memeriksa <code>running = true</code>.',
        'Jika kerugian terealisasi hari ini sudah melebihi batas yang ditetapkan pengguna, bot langsung berhenti dan mengirim peringatan.',
        'Mengambil 100 lilin 1H dan 100 lilin 4H. Mendeteksi level support/resistance dengan penghitungan sentuhan berbobot recency.',
        'Menilai setiap level S/A/B berdasarkan konfluensi timeframe. Menambahkan zona profil volume yang tumpang tindih dengan level S/R (±1%).',
        'Memeriksa apakah harga saat ini menyentuh level, momentum 3 lilin mengonfirmasi arah, dan jarak SL 3–6%.',
        'Jika semua kondisi terpenuhi, menempatkan market order melalui OKX API. Mencatat entri di KV state.',
        'Setiap tick: memeriksa apakah harga telah mencapai TP (→ 50% penutupan parsial, SL ke break-even) atau SL (→ penutupan penuh).',
    ],
}

# Build the patch dict
patch = {}
for lang in ['ko','ja','zh','vi','ru','tr','es','pt','id']:
    patch[lang] = {}
    patch[lang]['s08.callout'] = s08_vals[lang]
    descs = f_descs[lang]
    for i, desc in enumerate(descs, 1):
        patch[lang][f's01.f{i}.desc'] = desc

# Serialize to JSON (handles escaping of quotes, special chars)
patch_json = json.dumps(patch, ensure_ascii=False, indent=2)

# ── 4. Inject GT_PATCH script block before </body> ───────────────────────────
patch_script = f'''
<script>
(function () {{
  var GT_PATCH = {patch_json};
  // Wait for GT to be defined by the main script above
  function applyPatch() {{
    if (typeof GT === 'undefined') return;
    for (var lang in GT_PATCH) {{
      if (GT[lang]) {{
        var keys = GT_PATCH[lang];
        for (var k in keys) GT[lang][k] = keys[k];
      }}
    }}
  }}
  // GT is defined synchronously in the previous script block, so just call it
  applyPatch();
}})();
</script>
'''

assert '</body>' in content, "</body> not found!"
content = content.replace('</body>', patch_script + '</body>')

with open('/home/user/oracletrading/ayilon/bot-guide.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Part 1 done. Changes applied:")
print("  - s08 Korean callout fixed (replaced with English + data-guide-i18n)")
print("  - s01.f1–f7.desc attributes added")
print("  - GT_PATCH injected with s08.callout + s01.f*.desc in 9 languages")
