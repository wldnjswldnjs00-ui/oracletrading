#!/usr/bin/env python3
"""Part 4f: translations for Section 12 parameters table (s12.param1-16 / s12.note1-16)"""
import json

LANGS = ['ko', 'ja', 'zh', 'vi', 'ru', 'tr', 'es', 'pt', 'id']

PARAMS = [
    {
        'ko': "최대 포지션 크기", 'ja': "最大ポジションサイズ", 'zh': "最大仓位规模",
        'vi': "Kích thước vị thế tối đa", 'ru': "Максимальный размер позиции",
        'tr': "Maksimum Pozisyon Boyutu", 'es': "Tamaño máximo de posición",
        'pt': "Tamanho máximo de posição", 'id': "Ukuran Posisi Maksimum",
    },
    {
        'ko': "최대 레버리지", 'ja': "最大レバレッジ", 'zh': "最大杠杆",
        'vi': "Đòn bẩy tối đa", 'ru': "Максимальное плечо",
        'tr': "Maksimum Kaldıraç", 'es': "Apalancamiento máximo",
        'pt': "Alavancagem máxima", 'id': "Leverage Maksimum",
    },
    {
        'ko': "진입 횟수", 'ja': "エントリー回数", 'zh': "建仓次数",
        'vi': "Số lần vào lệnh", 'ru': "Количество входов",
        'tr': "Giriş Sayısı", 'es': "Número de entradas",
        'pt': "Número de entradas", 'id': "Jumlah Entry",
    },
    {
        'ko': "진입 비중 분배", 'ja': "エントリーサイジング", 'zh': "建仓资金分配",
        'vi': "Phân bổ khối lượng vào lệnh", 'ru': "Распределение размера входа",
        'tr': "Giriş Boyutlandırma", 'es': "Tamaño de entrada",
        'pt': "Dimensionamento de entrada", 'id': "Pembagian Ukuran Entry",
    },
    {
        'ko': "일일 손실 한도", 'ja': "1日の損失上限", 'zh': "每日亏损限额",
        'vi': "Giới hạn lỗ hàng ngày", 'ru': "Дневной лимит убытков",
        'tr': "Günlük Zarar Limiti", 'es': "Límite de pérdida diaria",
        'pt': "Limite de perda diária", 'id': "Batas Kerugian Harian",
    },
    {
        'ko': "지지/저항 허용오차 (탐지)", 'ja': "サポレジ許容誤差(検出)", 'zh': "支撑/阻力容差（检测）",
        'vi': "Sai số S/R (phát hiện)", 'ru': "Допуск S/R (обнаружение)",
        'tr': "S/D Toleransı (Tespit)", 'es': "Tolerancia S/R (detección)",
        'pt': "Tolerância S/R (detecção)", 'id': "Toleransi S/R (deteksi)",
    },
    {
        'ko': "지지/저항 허용오차 (중복제거)", 'ja': "サポレジ許容誤差(重複除去)", 'zh': "支撑/阻力容差（去重）",
        'vi': "Sai số S/R (lọc trùng)", 'ru': "Допуск S/R (дедупликация)",
        'tr': "S/D Toleransı (Tekilleştirme)", 'es': "Tolerancia S/R (deduplicación)",
        'pt': "Tolerância S/R (deduplicação)", 'id': "Toleransi S/R (dedup)",
    },
    {
        'ko': "진입 터치 허용오차", 'ja': "エントリータッチ許容誤差", 'zh': "建仓触碰容差",
        'vi': "Sai số chạm để vào lệnh", 'ru': "Допуск касания для входа",
        'tr': "Giriş Dokunma Toleransı", 'es': "Tolerancia de toque para entrada",
        'pt': "Tolerância de toque para entrada", 'id': "Toleransi Sentuh Entry",
    },
    {
        'ko': "SL 거리 범위", 'ja': "SL距離範囲", 'zh': "SL距离范围",
        'vi': "Phạm vi khoảng cách SL", 'ru': "Диапазон расстояния SL",
        'tr': "SL Mesafe Aralığı", 'es': "Rango de distancia de SL",
        'pt': "Faixa de distância do SL", 'id': "Rentang Jarak SL",
    },
    {
        'ko': "분할 진입 범위", 'ja': "分割エントリー範囲", 'zh': "分批建仓范围",
        'vi': "Phạm vi vào lệnh phân đoạn", 'ru': "Диапазон частичных входов",
        'tr': "Kısmi Giriş Aralığı", 'es': "Rango de entrada fraccionada",
        'pt': "Faixa de entrada fracionada", 'id': "Rentang Entry Fraksional",
    },
    {
        'ko': "최근성 윈도우", 'ja': "鮮度ウィンドウ", 'zh': "新近度窗口",
        'vi': "Cửa sổ gần đây", 'ru': "Окно актуальности",
        'tr': "Güncellik Penceresi", 'es': "Ventana de recencia",
        'pt': "Janela de recência", 'id': "Jendela Kebaruan",
    },
    {
        'ko': "최대 지지/저항 유효기간", 'ja': "サポレジ最大有効期間", 'zh': "支撑/阻力最大有效期",
        'vi': "Tuổi tối đa của S/R", 'ru': "Максимальный возраст S/R",
        'tr': "Maks. S/D Yaşı", 'es': "Antigüedad máxima de S/R",
        'pt': "Idade máxima de S/R", 'id': "Usia Maks. S/R",
    },
    {
        'ko': "볼륨 프로파일 버킷", 'ja': "ボリュームプロファイルバケット", 'zh': "成交量分布桶数",
        'vi': "Số nhóm hồ sơ khối lượng", 'ru': "Бакеты профиля объёма",
        'tr': "Hacim Profili Kovaları", 'es': "Buckets de perfil de volumen",
        'pt': "Buckets de perfil de volume", 'id': "Bucket Profil Volume",
    },
    {
        'ko': "볼륨 구간 임계값", 'ja': "ボリュームゾーン閾値", 'zh': "成交量区域阈值",
        'vi': "Ngưỡng vùng khối lượng", 'ru': "Порог зоны объёма",
        'tr': "Hacim Bölgesi Eşiği", 'es': "Umbral de zona de volumen",
        'pt': "Limite da zona de volume", 'id': "Ambang Zona Volume",
    },
    {
        'ko': "볼륨 구간 ↔ 지지/저항 중첩", 'ja': "ボリュームゾーン↔サポレジ重複", 'zh': "成交量区域 ↔ 支撑/阻力重叠",
        'vi': "Vùng KL ↔ chồng lấp S/R", 'ru': "Зона объёма ↔ пересечение с S/R",
        'tr': "Hacim Bölgesi ↔ S/D Çakışması", 'es': "Zona de volumen ↔ superposición S/R",
        'pt': "Zona de volume ↔ sobreposição S/R", 'id': "Zona Volume ↔ tumpang tindih S/R",
    },
    {
        'ko': "TP 도달 시 부분 청산", 'ja': "TP到達時の部分決済", 'zh': "触及TP时部分平仓",
        'vi': "Đóng một phần khi đạt TP", 'ru': "Частичное закрытие при достижении TP",
        'tr': "TP'de Kısmi Kapama", 'es': "Cierre parcial al alcanzar TP",
        'pt': "Fechamento parcial ao atingir o TP", 'id': "Penutupan Parsial saat TP",
    },
]

NOTES = [
    {
        'ko': "하프-켈리 기본값", 'ja': "ハーフ・ケリーがデフォルト", 'zh': "默认采用半凯利",
        'vi': "Mặc định Half-Kelly", 'ru': "По умолчанию половина Келли",
        'tr': "Varsayılan Half-Kelly", 'es': "Half-Kelly por defecto",
        'pt': "Half-Kelly por padrão", 'id': "Default Half-Kelly",
    },
    {
        'ko': "20배 초과 시 경고 발생", 'ja': "20倍超で警告が発生", 'zh': "超过20倍触发警告",
        'vi': "Cảnh báo khi vượt 20x", 'ru': "Предупреждение выше 20x",
        'tr': "20x üzerinde uyarı tetiklenir", 'es': "Advertencia por encima de 20x",
        'pt': "Aviso acima de 20x", 'id': "Peringatan di atas 20x",
    },
    {
        'ko': "총 40% 초과 시 켈리 경고", 'ja': "総40%超でケリー警告", 'zh': "总计超40%触发凯利警告",
        'vi': "Cảnh báo Kelly khi tổng vượt 40%", 'ru': "Предупреждение Келли выше 40% от общего",
        'tr': "Toplam %40 üzerinde Kelly uyarısı", 'es': "Advertencia de Kelly por encima del 40% total",
        'pt': "Aviso de Kelly acima de 40% do total", 'id': "Peringatan Kelly di atas 40% total",
    },
    {
        'ko': "균등 분배 권장", 'ja': "均等配分を推奨", 'zh': "建议等额分配",
        'vi': "Khuyến nghị chia đều", 'ru': "Рекомендуется равное распределение",
        'tr': "Eşit önerilir", 'es': "Se recomienda equitativo",
        'pt': "Recomendado igualitário", 'id': "Direkomendasikan rata",
    },
    {
        'ko': "기본적으로 활성화됨", 'ja': "デフォルトで有効", 'zh': "默认启用",
        'vi': "Bật theo mặc định", 'ru': "Включено по умолчанию",
        'tr': "Varsayılan olarak etkin", 'es': "Habilitado por defecto",
        'pt': "Ativado por padrão", 'id': "Diaktifkan secara default",
    },
    {
        'ko': "레벨 확인을 위한 터치 밴드", 'ja': "レベル確認用のタッチバンド", 'zh': "用于确认水平的触碰带",
        'vi': "Dải chạm để xác nhận mức", 'ru': "Полоса касания для подтверждения уровня",
        'tr': "Seviye onayı için dokunma bandı", 'es': "Banda de toque para confirmar el nivel",
        'pt': "Faixa de toque para confirmar o nível", 'id': "Band sentuh untuk konfirmasi level",
    },
    {
        'ko': "인접한 중복 레벨 병합", 'ja': "近接する重複レベルを統合", 'zh': "合并相近的重复水平",
        'vi': "Hợp nhất các mức trùng lặp gần nhau", 'ru': "Объединение близких дублирующихся уровней",
        'tr': "Yakın yinelenen seviyeleri birleştirir", 'es': "Combina niveles duplicados cercanos",
        'pt': "Combina níveis duplicados próximos", 'id': "Menggabungkan level duplikat yang berdekatan",
    },
    {
        'ko': "레벨로부터 진입 거리", 'ja': "レベルからのエントリー距離", 'zh': "距水平的建仓距离",
        'vi': "Khoảng cách từ mức để vào lệnh", 'ru': "Расстояние от уровня для входа",
        'tr': "Girişin seviyeye mesafesi", 'es': "Distancia al nivel para la entrada",
        'pt': "Distância do nível para a entrada", 'id': "Jarak dari level untuk entry",
    },
    {
        'ko': "3% 미만 또는 6% 초과 시 건너뜀", 'ja': "3%未満または6%超でスキップ", 'zh': "低于3%或高于6%则跳过",
        'vi': "Dưới 3% hoặc trên 6% = bỏ qua", 'ru': "Менее 3% или более 6% = пропуск",
        'tr': "%3 altı veya %6 üstü = atlanır", 'es': "Menos del 3% o más del 6% = se omite",
        'pt': "Menos de 3% ou mais de 6% = ignorado", 'id': "Di bawah 3% atau di atas 6% = dilewati",
    },
    {
        'ko': "진입 #2/#3의 최초 진입가 대비 최대 편차", 'ja': "#2/#3エントリーの最初のエントリーからの最大ずれ", 'zh': "建仓#2/#3相对首次建仓的最大偏移",
        'vi': "Độ trôi tối đa so với lệnh vào đầu cho #2/#3", 'ru': "Максимальное отклонение от первого входа для №2/№3",
        'tr': "Giriş #2/#3 için ilk girişten maks. sapma", 'es': "Desviación máxima de la primera entrada para la #2/#3",
        'pt': "Desvio máximo da primeira entrada para #2/#3", 'id': "Penyimpangan maks. dari entry pertama untuk #2/#3",
    },
    {
        'ko': "이 범위 내 2회 터치로 충분", 'ja': "この範囲内で2回のタッチで十分", 'zh': "此范围内2次触碰即足够",
        'vi': "2 lần chạm là đủ trong phạm vi này", 'ru': "Двух касаний достаточно в этом диапазоне",
        'tr': "Bu aralıkta 2 dokunuş yeterli", 'es': "2 toques son suficientes en este rango",
        'pt': "2 toques são suficientes nessa faixa", 'id': "2 sentuhan cukup dalam rentang ini",
    },
    {
        'ko': "오래된 레벨은 무시됨", 'ja': "古いレベルは無視されます", 'zh': "忽略过旧的水平",
        'vi': "Các mức cũ hơn bị bỏ qua", 'ru': "Старые уровни игнорируются",
        'tr': "Eski seviyeler göz ardı edilir", 'es': "Los niveles más antiguos se ignoran",
        'pt': "Níveis mais antigos são ignorados", 'id': "Level yang lebih lama diabaikan",
    },
    {
        'ko': "볼륨 구간의 세분화 정도", 'ja': "ボリュームゾーンの粒度", 'zh': "成交量区域的精细度",
        'vi': "Độ chi tiết của vùng khối lượng", 'ru': "Детализация зон объёма",
        'tr': "Hacim bölgelerinin ayrıntı düzeyi", 'es': "Granularidad de las zonas de volumen",
        'pt': "Granularidade das zonas de volume", 'id': "Granularitas zona volume",
    },
    {
        'ko': "구간으로 인정되기 위한 최소 볼륨", 'ja': "ゾーンと認定される最小ボリューム", 'zh': "成为区域所需的最小成交量",
        'vi': "Khối lượng tối thiểu để tính là một vùng", 'ru': "Минимальный объём для признания зоны",
        'tr': "Bölge sayılmak için min. hacim", 'es': "Volumen mínimo para contar como zona",
        'pt': "Volume mínimo para contar como zona", 'id': "Volume minimum untuk dianggap sebagai zona",
    },
    {
        'ko': "구간이 사용되려면 지지/저항과 인접해야 함", 'ja': "ゾーンが使用されるにはサポレジに近接が必要", 'zh': "区域须靠近支撑/阻力方可使用",
        'vi': "Vùng phải gần S/R để được sử dụng", 'ru': "Зона должна быть рядом с S/R, чтобы использоваться",
        'tr': "Bölgenin kullanılması için S/D'ye yakın olması gerekir", 'es': "La zona debe estar cerca de S/R para usarse",
        'pt': "A zona deve estar próxima de S/R para ser usada", 'id': "Zona harus dekat S/R agar dapat digunakan",
    },
    {
        'ko': "이후 SL이 손익분기점으로 이동", 'ja': "その後SLがブレークイーブンに移動", 'zh': "之后SL移至保本点",
        'vi': "Sau đó SL chuyển về điểm hòa vốn", 'ru': "После этого SL переносится в безубыток",
        'tr': "Sonrasında SL başabaşa taşınır", 'es': "Después, el SL se mueve a punto de equilibrio",
        'pt': "Depois, o SL é movido para o ponto de equilíbrio", 'id': "Setelah itu SL dipindah ke breakeven",
    },
]

new_patch = {lang: {} for lang in LANGS}
for lang in LANGS:
    for i, p in enumerate(PARAMS, 1):
        new_patch[lang][f's12.param{i}'] = p[lang]
    for i, n in enumerate(NOTES, 1):
        new_patch[lang][f's12.note{i}'] = n[lang]

with open('/home/user/oracletrading/_p4_part5.json', 'w', encoding='utf-8') as f:
    json.dump(new_patch, f, ensure_ascii=False)
print(f"s12.param/note keys per lang: {len(new_patch['ko'])}")
