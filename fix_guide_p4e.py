#!/usr/bin/env python3
"""Part 4e: translations for Section 11 trade-example flow steps (s11.f1-f6 name/desc)"""
import json

LANGS = ['ko', 'ja', 'zh', 'vi', 'ru', 'tr', 'es', 'pt', 'id']

# f1: keeps literal "[S급]" per original bug-accurate documentation (do not translate the token itself)
f1_name = {
    'ko': "분석 결과 $100,000에서 [S급] 지지선 발견",
    'ja': "分析の結果、$100,000で[S급]サポートを発見",
    'zh': "分析发现 $100,000 处存在 [S급] 支撑位",
    'vi': "Phân tích phát hiện hỗ trợ [S급] tại $100,000",
    'ru': "Анализ обнаружил уровень поддержки [S급] на $100,000",
    'tr': "Analiz, $100.000'de [S급] destek seviyesi buldu",
    'es': "El análisis encuentra soporte [S급] en $100,000",
    'pt': "A análise encontra suporte [S급] em $100.000",
    'id': "Analisis menemukan support [S급] di $100.000",
}
f1_desc = {
    'ko': "1시간봉과 4시간봉 모두에 존재하는 레벨입니다. 볼륨 프로파일도 이 구간에서 높은 거래량을 확인시켜 줍니다. 등급: S.",
    'ja': "1時間足と4時間足の両方に存在するレベルです。ボリュームプロファイルもこのゾーンで高い出来高を確認しています。グレード: S。",
    'zh': "该水平在1小时和4小时图表上均存在。成交量分布也确认该区域成交量较高。等级：S。",
    'vi': "Mức này xuất hiện trên cả khung 1H và 4H. Hồ sơ khối lượng xác nhận khối lượng cao tại vùng này. Hạng: S.",
    'ru': "Уровень присутствует на графиках 1Ч и 4Ч. Профиль объёма подтверждает высокий объём в этой зоне. Грейд: S.",
    'tr': "Seviye hem 1S hem 4S grafiklerde mevcut. Hacim profili bu bölgede yüksek hacmi doğruluyor. Derece: S.",
    'es': "El nivel existe tanto en 1H como en 4H. El perfil de volumen confirma alto volumen en esta zona. Grado: S.",
    'pt': "O nível existe tanto em 1H quanto em 4H. O perfil de volume confirma alto volume nessa zona. Grau: S.",
    'id': "Level ini ada di grafik 1H maupun 4H. Profil volume mengonfirmasi volume tinggi di zona ini. Grade: S.",
}

f2_name = {
    'ko': "5분봉 모멘텀: 3개 연속 하락 캔들 → LONG 신호",
    'ja': "5分足モメンタム: 3本連続下落キャンドル → LONGシグナル",
    'zh': "5分钟动量：连续3根下跌K线 → LONG信号",
    'vi': "Động lượng 5m: 3 nến giảm liên tiếp → tín hiệu LONG",
    'ru': "Импульс 5м: 3 последовательные падающие свечи → сигнал LONG",
    'tr': "5dk momentum: 3 ardışık düşen mum → LONG sinyali",
    'es': "Momento de 5m: 3 velas bajistas consecutivas → señal LONG",
    'pt': "Momento de 5m: 3 velas de baixa consecutivas → sinal LONG",
    'id': "Momentum 5m: 3 candle turun berturut-turut → sinyal LONG",
}
f2_desc = {
    'ko': "이전 5분봉 저가 = $97,100. SL 거리 = 2.9% → 너무 좁아서 봇이 이번 틱을 건너뜁니다.",
    'ja': "前回の5分足安値 = $97,100。SL距離 = 2.9% → 狭すぎるため、ボットはこのティックをスキップします。",
    'zh': "前一根5分钟K线低点 = $97,100。SL距离 = 2.9% → 太窄，机器人跳过此次信号。",
    'vi': "Đáy nến 5m trước = $97,100. Khoảng cách SL = 2.9% → quá hẹp, bot bỏ qua tick này.",
    'ru': "Минимум предыдущей 5м свечи = $97,100. Расстояние SL = 2.9% → слишком узко, бот пропускает этот тик.",
    'tr': "Önceki 5dk mum dip = $97.100. SL mesafesi = %2.9 → çok dar, bot bu tick'i atlıyor.",
    'es': "Mínimo de la vela 5m anterior = $97,100. Distancia de SL = 2.9% → demasiado ajustada, el bot omite este tick.",
    'pt': "Mínima da vela de 5m anterior = $97.100. Distância do SL = 2,9% → muito apertada, o bot ignora este tick.",
    'id': "Low candle 5m sebelumnya = $97.100. Jarak SL = 2.9% → terlalu sempit, bot melewati tick ini.",
}

f3_name = {
    'ko': "다음 크론: 이전 캔들 저가 = $96,800 → SL 거리 = 3.2% ✓",
    'ja': "次のcron: 前回キャンドル安値 = $96,800 → SL距離 = 3.2% ✓",
    'zh': "下一次cron：前一根K线低点 = $96,800 → SL距离 = 3.2% ✓",
    'vi': "Cron tiếp theo: đáy nến trước = $96,800 → khoảng cách SL = 3.2% ✓",
    'ru': "Следующий cron: минимум предыдущей свечи = $96,800 → расстояние SL = 3.2% ✓",
    'tr': "Sonraki cron: önceki mum dip = $96.800 → SL mesafesi = %3.2 ✓",
    'es': "Siguiente cron: mínimo de vela anterior = $96,800 → distancia de SL = 3.2% ✓",
    'pt': "Próximo cron: mínima da vela anterior = $96.800 → distância do SL = 3,2% ✓",
    'id': "Cron berikutnya: low candle sebelumnya = $96.800 → jarak SL = 3.2% ✓",
}
f3_desc = {
    'ko': "3가지 조건이 모두 충족됩니다. 진입 #1 실행: LONG $400 (0.002 BTC × 5배 = $2,000 노셔널). SL은 $96,800에 설정. TP는 가장 가까운 저항선인 $105,000.",
    'ja': "3つの条件すべてが満たされます。エントリー#1実行: LONG $400(0.002 BTC × 5倍 = $2,000ノーショナル)。SLは$96,800に設定。TPは最も近いレジスタンスである$105,000。",
    'zh': "三个条件全部满足。建仓#1执行：LONG $400（0.002 BTC × 5倍 = $2,000名义价值）。SL设置于$96,800。TP为最近的阻力位$105,000。",
    'vi': "Cả 3 điều kiện đều đạt. Vào lệnh #1: LONG $400 (0.002 BTC × 5x = $2,000 notional). SL đặt tại $96,800. TP là kháng cự gần nhất $105,000.",
    'ru': "Все 3 условия выполнены. Вход #1 размещён: LONG $400 (0.002 BTC × 5x = $2,000 номинал). SL установлен на $96,800. TP — ближайшее сопротивление $105,000.",
    'tr': "3 koşulun tümü karşılanıyor. Giriş #1 açıldı: LONG $400 (0.002 BTC × 5x = $2.000 nominal). SL $96.800'e ayarlandı. TP en yakın direnç olan $105.000.",
    'es': "Se cumplen las 3 condiciones. Entrada #1 colocada: LONG $400 (0.002 BTC × 5x = $2,000 nocional). SL fijado en $96,800. TP en la resistencia más cercana, $105,000.",
    'pt': "As 3 condições são atendidas. Entrada #1 feita: LONG $400 (0,002 BTC × 5x = $2.000 nocional). SL definido em $96.800. TP na resistência mais próxima, $105.000.",
    'id': "Ketiga kondisi terpenuhi. Entry #1 ditempatkan: LONG $400 (0.002 BTC × 5x = $2.000 notional). SL diset di $96.800. TP di resistance terdekat $105.000.",
}

f4_name = {
    'ko': "$99,500까지 하락 → 진입 #2 트리거",
    'ja': "$99,500まで下落 → エントリー#2発動",
    'zh': "价格跌至$99,500 → 触发建仓#2",
    'vi': "Giá giảm xuống $99,500 → kích hoạt vào lệnh #2",
    'ru': "Цена опускается до $99,500 → срабатывает вход #2",
    'tr': "Fiyat $99.500'e düşüyor → Giriş #2 tetiklendi",
    'es': "El precio cae a $99,500 → se activa la Entrada #2",
    'pt': "O preço cai para $99.500 → Entrada #2 acionada",
    'id': "Harga turun ke $99.500 → Entry #2 terpicu",
}
f4_desc = {
    'ko': "여전히 첫 진입가($100,000) 대비 ±2% 범위 안입니다. 지지선에서 신호가 재발생합니다. 진입 #2: $400 추가. 평균 진입가 ≈ $99,750.",
    'ja': "依然として最初のエントリー価格($100,000)の±2%以内です。サポートでシグナルが再発します。エントリー#2: さらに$400。平均エントリー ≈ $99,750。",
    'zh': "仍在首次建仓价（$100,000）±2%范围内。信号在支撑位再次触发。建仓#2：再加$400。平均建仓价≈$99,750。",
    'vi': "Vẫn trong phạm vi ±2% so với lệnh vào đầu tiên ($100,000). Tín hiệu kích hoạt lại tại hỗ trợ. Vào lệnh #2: thêm $400. Giá vào trung bình ≈ $99,750.",
    'ru': "Всё ещё в пределах ±2% от первого входа ($100,000). Сигнал срабатывает повторно на уровне поддержки. Вход #2: ещё $400. Средняя цена входа ≈ $99,750.",
    'tr': "Hâlâ ilk girişin ($100.000) ±%2 aralığında. Sinyal destekte yeniden tetikleniyor. Giriş #2: $400 daha. Ortalama giriş ≈ $99.750.",
    'es': "Sigue dentro del ±2% de la primera entrada ($100,000). La señal se reactiva en el soporte. Entrada #2: $400 más. Entrada promedio ≈ $99,750.",
    'pt': "Ainda dentro de ±2% da primeira entrada ($100.000). O sinal é reativado no suporte. Entrada #2: mais $400. Entrada média ≈ $99.750.",
    'id': "Masih dalam ±2% dari entry pertama ($100.000). Sinyal terpicu lagi di support. Entry #2: tambahan $400. Rata-rata entry ≈ $99.750.",
}

f5_name = {
    'ko': "가격 회복, $105,000에서 TP 도달 → 부분 청산",
    'ja': "価格が回復し、$105,000でTPに到達 → 部分決済",
    'zh': "价格反弹，$105,000触及TP → 部分平仓",
    'vi': "Giá hồi phục, chạm TP tại $105,000 → đóng một phần",
    'ru': "Цена восстанавливается, достигает TP на $105,000 → частичное закрытие",
    'tr': "Fiyat toparlanıyor, $105.000'de TP'ye ulaşıyor → kısmi kapama",
    'es': "El precio se recupera, alcanza TP en $105,000 → cierre parcial",
    'pt': "O preço se recupera, atinge o TP em $105.000 → fechamento parcial",
    'id': "Harga rebound, mencapai TP di $105.000 → penutupan parsial",
}
f5_desc = {
    'ko': "전체 포지션의 50%가 $105,000에서 청산됩니다. 첫 절반의 수익: 약 $260. SL은 손익분기점($99,750)으로 이동합니다.",
    'ja': "全ポジションの50%が$105,000で決済されます。前半の利益: 約$260。SLはブレークイーブン($99,750)に移動します。",
    'zh': "总仓位的50%在$105,000平仓。前半部分盈利：约$260。SL移至保本点（$99,750）。",
    'vi': "50% tổng vị thế đóng tại $105,000. Lợi nhuận nửa đầu: ~$260. SL chuyển về điểm hòa vốn ($99,750).",
    'ru': "50% всей позиции закрывается на $105,000. Прибыль на первой половине: ~$260. SL переносится в безубыток ($99,750).",
    'tr': "Toplam pozisyonun %50'si $105.000'de kapatılıyor. İlk yarıdaki kâr: ~$260. SL başabaşa ($99.750) taşınıyor.",
    'es': "Se cierra el 50% de la posición total en $105,000. Ganancia de la primera mitad: ~$260. El SL se mueve a punto de equilibrio ($99,750).",
    'pt': "50% da posição total é fechada em $105.000. Lucro da primeira metade: ~$260. O SL é movido para o ponto de equilíbrio ($99.750).",
    'id': "50% dari total posisi ditutup di $105.000. Profit dari setengah pertama: ~$260. SL dipindah ke breakeven ($99.750).",
}

f6_name = {
    'ko': "가격이 $108,000까지 상승 후 $99,750로 되돌림",
    'ja': "価格が$108,000まで上昇後、$99,750まで下落",
    'zh': "价格上探$108,000后回落至$99,750",
    'vi': "Giá đẩy lên $108,000 rồi quay về $99,750",
    'ru': "Цена поднимается до $108,000, затем откатывается к $99,750",
    'tr': "Fiyat $108.000'e çıkıp $99.750'e geri çekiliyor",
    'es': "El precio sube a $108,000 y luego retrocede a $99,750",
    'pt': "O preço sobe para $108.000 e depois recua para $99.750",
    'id': "Harga naik ke $108.000 lalu turun kembali ke $99.750",
}
f6_desc = {
    'ko': "SL(손익분기점)이 도달됩니다. 남은 50%가 $99,750에서 청산됩니다. 두 번째 절반의 순손익: 약 $0(수수료 제외). 전체 거래 총수익: 약 +$260.",
    'ja': "SL(ブレークイーブン)に到達します。残り50%が$99,750で決済されます。後半の純損益: 約$0(手数料除く)。トレード全体の総利益: 約+$260。",
    'zh': "触及SL（保本点）。剩余50%在$99,750平仓。后半部分净盈亏：约$0（不含手续费）。整笔交易总利润：约+$260。",
    'vi': "Chạm SL (hòa vốn). 50% còn lại đóng tại $99,750. Lãi/lỗ ròng nửa sau: ~$0 (chưa trừ phí). Tổng lợi nhuận giao dịch: ~+$260.",
    'ru': "Срабатывает SL (безубыток). Оставшиеся 50% закрываются на $99,750. Чистый результат второй половины: ~$0 (без учёта комиссий). Итог по сделке: ~+$260 прибыли.",
    'tr': "SL (başabaş) tetikleniyor. Kalan %50, $99.750'de kapatılıyor. İkinci yarıdaki net sonuç: ~$0 (ücretler hariç). Toplam işlem: ~+$260 kâr.",
    'es': "Se alcanza el SL (punto de equilibrio). El 50% restante se cierra en $99,750. Resultado neto de la segunda mitad: ~$0 (sin comisiones). Total de la operación: ~+$260 de ganancia.",
    'pt': "O SL (ponto de equilíbrio) é atingido. Os 50% restantes são fechados em $99.750. Resultado líquido da segunda metade: ~$0 (sem taxas). Total da operação: ~+$260 de lucro.",
    'id': "SL (breakeven) tersentuh. Sisa 50% ditutup di $99.750. Hasil bersih setengah kedua: ~$0 (belum termasuk fee). Total trade: ~+$260 profit.",
}

NAMES_DESCS = [
    (f1_name, f1_desc), (f2_name, f2_desc), (f3_name, f3_desc),
    (f4_name, f4_desc), (f5_name, f5_desc), (f6_name, f6_desc),
]

new_patch = {lang: {} for lang in LANGS}
for lang in LANGS:
    for i, (name, desc) in enumerate(NAMES_DESCS, 1):
        new_patch[lang][f's11.f{i}.name'] = name[lang]
        new_patch[lang][f's11.f{i}.desc'] = desc[lang]

with open('/home/user/oracletrading/_p4_part4.json', 'w', encoding='utf-8') as f:
    json.dump(new_patch, f, ensure_ascii=False)
print(f"s11.f1-6 name/desc keys per lang: {len(new_patch['ko'])}")
