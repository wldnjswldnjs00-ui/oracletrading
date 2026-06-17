#!/usr/bin/env python3
"""Add missing i18n translation keys and HTML data-i18n attributes for:
- Dashboard card titles, h3 notification headings
- Payment page untagged instruction paragraphs
"""
import json, re

I18N_PATH  = '/home/user/oracletrading/ayilon/i18n.js'
DASH_PATH  = '/home/user/oracletrading/ayilon/dashboard.html'
PAY_PATH   = '/home/user/oracletrading/ayilon/payment.html'

LANGS = ['en', 'ko', 'ja', 'zh', 'vi', 'ru', 'tr', 'es', 'pt', 'id']

# ── 1. New translation keys ───────────────────────────────────────────────────
NEW_KEYS = {
    # Dashboard card titles
    'db.card.mybots': {
        'en': 'My Bots', 'ko': '내 봇', 'ja': 'マイBot', 'zh': '我的机器人',
        'vi': 'Bot của tôi', 'ru': 'Мои боты', 'tr': 'Botlarım', 'es': 'Mis bots', 'pt': 'Meus bots', 'id': 'Bot Saya',
    },
    'db.card.strategies': {
        'en': 'Available Strategies', 'ko': '사용 가능한 전략', 'ja': '利用可能な戦略', 'zh': '可用策略',
        'vi': 'Chiến lược có sẵn', 'ru': 'Доступные стратегии', 'tr': 'Kullanılabilir Stratejiler',
        'es': 'Estrategias disponibles', 'pt': 'Estratégias disponíveis', 'id': 'Strategi Tersedia',
    },
    'db.card.equityall': {
        'en': 'Equity Curve (All Time)', 'ko': '자산 곡선 (전체 기간)', 'ja': '資産曲線（全期間）', 'zh': '资产曲线（全时间）',
        'vi': 'Đường vốn (Toàn thời gian)', 'ru': 'Кривая капитала (Всё время)', 'tr': 'Sermaye Eğrisi (Tüm Zamanlar)',
        'es': 'Curva de capital (Todo el tiempo)', 'pt': 'Curva de capital (Desde sempre)', 'id': 'Kurva Ekuitas (Semua Waktu)',
    },
    'db.card.monthlypnl': {
        'en': 'Monthly P&L', 'ko': '월별 손익', 'ja': '月次P&L', 'zh': '月度盈亏',
        'vi': 'Lãi/lỗ theo tháng', 'ru': 'Ежемесячный P&L', 'tr': 'Aylık Kâr/Zarar',
        'es': 'P&L mensual', 'pt': 'P&L mensal', 'id': 'P&L Bulanan',
    },
    'db.card.stratbreakdown': {
        'en': 'Strategy Breakdown', 'ko': '전략별 분석', 'ja': '戦略別内訳', 'zh': '策略分解',
        'vi': 'Phân tích theo chiến lược', 'ru': 'Разбивка по стратегиям', 'tr': 'Strateji Dağılımı',
        'es': 'Desglose de estrategias', 'pt': 'Detalhamento por estratégia', 'id': 'Rincian Strategi',
    },
    'db.card.toppairs': {
        'en': 'Top Pairs', 'ko': '상위 페어', 'ja': 'トップペア', 'zh': '热门交易对',
        'vi': 'Cặp tiền hàng đầu', 'ru': 'Топ пары', 'tr': 'En İyi Pariteler',
        'es': 'Pares principales', 'pt': 'Principais pares', 'id': 'Pasangan Teratas',
    },
    'db.card.apikey': {
        'en': 'OKX API Key', 'ko': 'OKX API 키', 'ja': 'OKX APIキー', 'zh': 'OKX API密钥',
        'vi': 'Khóa API OKX', 'ru': 'OKX API ключ', 'tr': 'OKX API Anahtarı',
        'es': 'Clave API de OKX', 'pt': 'Chave de API OKX', 'id': 'Kunci API OKX',
    },
    'db.card.apisecurity': {
        'en': 'API Security Guidelines', 'ko': 'API 보안 가이드라인', 'ja': 'APIセキュリティガイドライン', 'zh': 'API安全指南',
        'vi': 'Hướng dẫn bảo mật API', 'ru': 'Руководство по безопасности API', 'tr': 'API Güvenlik Yönergeleri',
        'es': 'Pautas de seguridad de API', 'pt': 'Diretrizes de segurança da API', 'id': 'Panduan Keamanan API',
    },
    'db.card.changepw': {
        'en': 'Change Password', 'ko': '비밀번호 변경', 'ja': 'パスワード変更', 'zh': '修改密码',
        'vi': 'Đổi mật khẩu', 'ru': 'Изменить пароль', 'tr': 'Şifre Değiştir',
        'es': 'Cambiar contraseña', 'pt': 'Alterar senha', 'id': 'Ganti Password',
    },
    'db.card.secnotif': {
        'en': 'Security Notifications', 'ko': '보안 알림', 'ja': 'セキュリティ通知', 'zh': '安全通知',
        'vi': 'Thông báo bảo mật', 'ru': 'Уведомления безопасности', 'tr': 'Güvenlik Bildirimleri',
        'es': 'Notificaciones de seguridad', 'pt': 'Notificações de segurança', 'id': 'Notifikasi Keamanan',
    },
    'db.card.profile': {
        'en': 'Profile', 'ko': '프로필', 'ja': 'プロフィール', 'zh': '个人资料',
        'vi': 'Hồ sơ', 'ru': 'Профиль', 'tr': 'Profil',
        'es': 'Perfil', 'pt': 'Perfil', 'id': 'Profil',
    },
    'db.card.subscription': {
        'en': 'Subscription', 'ko': '구독', 'ja': 'サブスクリプション', 'zh': '订阅',
        'vi': 'Đăng ký dịch vụ', 'ru': 'Подписка', 'tr': 'Abonelik',
        'es': 'Suscripción', 'pt': 'Assinatura', 'id': 'Langganan',
    },
    'db.card.twofa': {
        'en': 'Two-Factor Authentication', 'ko': '2단계 인증', 'ja': '二要素認証', 'zh': '双重身份验证',
        'vi': 'Xác thực hai yếu tố', 'ru': 'Двухфакторная аутентификация', 'tr': 'İki Faktörlü Kimlik Doğrulama',
        'es': 'Autenticación de dos factores', 'pt': 'Autenticação de dois fatores', 'id': 'Autentikasi Dua Faktor',
    },
    'db.card.notifpref': {
        'en': 'Notification Preferences', 'ko': '알림 설정', 'ja': '通知設定', 'zh': '通知偏好',
        'vi': 'Tùy chọn thông báo', 'ru': 'Настройки уведомлений', 'tr': 'Bildirim Tercihleri',
        'es': 'Preferencias de notificación', 'pt': 'Preferências de notificação', 'id': 'Preferensi Notifikasi',
    },
    'db.card.botstatus': {
        'en': 'Bot Status', 'ko': '봇 상태', 'ja': 'ボットステータス', 'zh': '机器人状态',
        'vi': 'Trạng thái bot', 'ru': 'Статус бота', 'tr': 'Bot Durumu',
        'es': 'Estado del bot', 'pt': 'Status do bot', 'id': 'Status Bot',
    },
    'db.card.market': {
        'en': 'Market Intelligence', 'ko': '시장 인텔리전스', 'ja': 'マーケットインテリジェンス', 'zh': '市场情报',
        'vi': 'Phân tích thị trường', 'ru': 'Рыночная аналитика', 'tr': 'Piyasa Analizi',
        'es': 'Inteligencia de mercado', 'pt': 'Inteligência de mercado', 'id': 'Analitik Pasar',
    },
    'db.card.risk': {
        'en': 'Risk Management', 'ko': '리스크 관리', 'ja': 'リスク管理', 'zh': '风险管理',
        'vi': 'Quản lý rủi ro', 'ru': 'Управление рисками', 'tr': 'Risk Yönetimi',
        'es': 'Gestión de riesgos', 'pt': 'Gestão de riscos', 'id': 'Manajemen Risiko',
    },
    'db.card.dayloss': {
        'en': 'Daily Loss Limit', 'ko': '일일 손실 한도', 'ja': '1日の損失上限', 'zh': '每日亏损限额',
        'vi': 'Giới hạn lỗ hàng ngày', 'ru': 'Дневной лимит убытков', 'tr': 'Günlük Zarar Limiti',
        'es': 'Límite de pérdida diaria', 'pt': 'Limite de perda diária', 'id': 'Batas Kerugian Harian',
    },
    'db.card.strategy': {
        'en': 'Strategy', 'ko': '전략', 'ja': '戦略', 'zh': '策略',
        'vi': 'Chiến lược', 'ru': 'Стратегия', 'tr': 'Strateji',
        'es': 'Estrategia', 'pt': 'Estratégia', 'id': 'Strategi',
    },
    # Security notification h3 labels
    'db.notif.newdevice': {
        'en': 'New device login alert', 'ko': '새 기기 로그인 알림', 'ja': '新しいデバイスのログインアラート', 'zh': '新设备登录提醒',
        'vi': 'Cảnh báo đăng nhập thiết bị mới', 'ru': 'Уведомление о входе с нового устройства', 'tr': 'Yeni cihaz giriş uyarısı',
        'es': 'Alerta de inicio de sesión en nuevo dispositivo', 'pt': 'Alerta de login em novo dispositivo', 'id': 'Peringatan login perangkat baru',
    },
    'db.notif.apichange': {
        'en': 'API key change alert', 'ko': 'API 키 변경 알림', 'ja': 'APIキー変更アラート', 'zh': 'API密钥更改提醒',
        'vi': 'Cảnh báo thay đổi khóa API', 'ru': 'Уведомление об изменении API ключа', 'tr': 'API anahtarı değişikliği uyarısı',
        'es': 'Alerta de cambio de clave API', 'pt': 'Alerta de alteração da chave de API', 'id': 'Peringatan perubahan kunci API',
    },
    'db.notif.suspicious': {
        'en': 'Suspicious activity alert', 'ko': '의심 활동 알림', 'ja': '不審なアクティビティアラート', 'zh': '可疑活动提醒',
        'vi': 'Cảnh báo hoạt động đáng ngờ', 'ru': 'Уведомление о подозрительной активности', 'tr': 'Şüpheli etkinlik uyarısı',
        'es': 'Alerta de actividad sospechosa', 'pt': 'Alerta de atividade suspeita', 'id': 'Peringatan aktivitas mencurigakan',
    },
    'db.notif.tradeexec': {
        'en': 'Trade execution alerts', 'ko': '거래 실행 알림', 'ja': '取引実行アラート', 'zh': '交易执行提醒',
        'vi': 'Cảnh báo thực thi giao dịch', 'ru': 'Уведомления об исполнении сделок', 'tr': 'İşlem gerçekleştirme uyarıları',
        'es': 'Alertas de ejecución de operaciones', 'pt': 'Alertas de execução de operações', 'id': 'Peringatan eksekusi perdagangan',
    },
    'db.notif.telegram': {
        'en': 'Telegram notifications', 'ko': '텔레그램 알림', 'ja': 'Telegram通知', 'zh': 'Telegram通知',
        'vi': 'Thông báo Telegram', 'ru': 'Уведомления Telegram', 'tr': 'Telegram bildirimleri',
        'es': 'Notificaciones de Telegram', 'pt': 'Notificações do Telegram', 'id': 'Notifikasi Telegram',
    },
    'db.notif.dailyreport': {
        'en': 'Daily email report', 'ko': '일일 이메일 보고서', 'ja': '日次メールレポート', 'zh': '每日邮件报告',
        'vi': 'Báo cáo email hàng ngày', 'ru': 'Ежедневный отчёт по email', 'tr': 'Günlük e-posta raporu',
        'es': 'Informe diario por email', 'pt': 'Relatório diário por email', 'id': 'Laporan email harian',
    },
    'db.notif.stoploss': {
        'en': 'Stop-loss triggered alert', 'ko': '손절 트리거 알림', 'ja': 'ストップロストリガーアラート', 'zh': '止损触发提醒',
        'vi': 'Cảnh báo kích hoạt stop-loss', 'ru': 'Уведомление о срабатывании стоп-лосса', 'tr': 'Zarar durdurma tetikleme uyarısı',
        'es': 'Alerta de stop-loss activado', 'pt': 'Alerta de stop-loss acionado', 'id': 'Peringatan stop-loss terpicu',
    },
    # Payment page missing paragraphs
    'pay.okx.dest': {
        'en': 'On the OKX withdrawal screen, you will be asked to select a destination type. Choose <strong>Exchange</strong> — do <strong>not</strong> select Unhosted Wallet, OKX Users, or OKX Wallet.',
        'ko': 'OKX 출금 화면에서 목적지 유형을 선택하라는 메시지가 표시됩니다. <strong>거래소</strong>를 선택하세요 — 미호스팅 지갑, OKX 사용자, OKX 지갑은 <strong>선택하지 마세요</strong>.',
        'ja': 'OKXの出金画面で目的地の種類を選択するよう求められます。<strong>取引所</strong>を選択してください — Unhosted Wallet、OKX Users、OKX Walletは<strong>選択しないでください</strong>。',
        'zh': '在OKX提款页面，您需要选择目标类型。请选择<strong>交易所</strong>——请<strong>勿</strong>选择未托管钱包、OKX用户或OKX钱包。',
        'vi': 'Trên màn hình rút tiền OKX, bạn sẽ được yêu cầu chọn loại đích. Chọn <strong>Sàn giao dịch</strong> — <strong>không</strong> chọn Ví không lưu ký, Người dùng OKX hoặc Ví OKX.',
        'ru': 'На экране вывода OKX вам предложат выбрать тип назначения. Выберите <strong>Биржа</strong> — <strong>не</strong> выбирайте Unhosted Wallet, OKX Users или OKX Wallet.',
        'tr': 'OKX çekim ekranında bir hedef türü seçmeniz istenecektir. <strong>Borsa</strong>yı seçin — Unhosted Wallet, OKX Users veya OKX Wallet\'ı <strong>seçmeyin</strong>.',
        'es': 'En la pantalla de retiro de OKX, se le pedirá que seleccione un tipo de destino. Elija <strong>Exchange</strong> — <strong>no</strong> seleccione Unhosted Wallet, OKX Users ni OKX Wallet.',
        'pt': 'Na tela de saque da OKX, você será solicitado a selecionar um tipo de destino. Escolha <strong>Exchange</strong> — <strong>não</strong> selecione Unhosted Wallet, OKX Users nem OKX Wallet.',
        'id': 'Di layar penarikan OKX, Anda akan diminta memilih jenis tujuan. Pilih <strong>Exchange</strong> — jangan pilih Unhosted Wallet, OKX Users, atau OKX Wallet.',
    },
    'pay.step1.text': {
        'en': 'Send exactly <strong id="usdtStepAmount">— USDT</strong> to the address above using the <strong>TRC20 (TRON)</strong> network. <strong style="color:#ef4444;">Use the exact amount shown</strong> — this is how we identify your payment. Any other network will result in permanent loss of funds.',
        'ko': '위 주소로 <strong>TRC20 (TRON)</strong> 네트워크를 사용하여 정확히 <strong id="usdtStepAmount">— USDT</strong>를 전송하세요. <strong style="color:#ef4444;">표시된 금액을 정확히 입력하세요</strong> — 이 금액으로 결제를 식별합니다. 다른 네트워크를 사용하면 자금이 영구적으로 손실됩니다.',
        'ja': '上記のアドレスに<strong>TRC20 (TRON)</strong>ネットワークを使用して正確に<strong id="usdtStepAmount">— USDT</strong>を送金してください。<strong style="color:#ef4444;">表示された金額を正確に使用してください</strong>—これで支払いを識別します。他のネットワークを使用すると資金は永久に失われます。',
        'zh': '请使用<strong>TRC20 (TRON)</strong>网络向上方地址精确发送<strong id="usdtStepAmount">— USDT</strong>。<strong style="color:#ef4444;">请使用显示的精确金额</strong>——这是我们识别您付款的方式。使用其他网络将导致资金永久损失。',
        'vi': 'Gửi chính xác <strong id="usdtStepAmount">— USDT</strong> đến địa chỉ trên bằng mạng <strong>TRC20 (TRON)</strong>. <strong style="color:#ef4444;">Sử dụng đúng số tiền được hiển thị</strong> — đây là cách chúng tôi xác định khoản thanh toán của bạn. Bất kỳ mạng nào khác sẽ dẫn đến mất tiền vĩnh viễn.',
        'ru': 'Отправьте ровно <strong id="usdtStepAmount">— USDT</strong> на адрес выше, используя сеть <strong>TRC20 (TRON)</strong>. <strong style="color:#ef4444;">Используйте точную сумму, указанную на экране</strong> — по ней мы идентифицируем ваш платёж. Любая другая сеть приведёт к безвозвратной потере средств.',
        'tr': 'Yukarıdaki adrese <strong>TRC20 (TRON)</strong> ağını kullanarak tam olarak <strong id="usdtStepAmount">— USDT</strong> gönderin. <strong style="color:#ef4444;">Gösterilen tam tutarı kullanın</strong> — ödemenizi bu şekilde tanımlıyoruz. Başka bir ağ kullanılması fonların kalıcı olarak kaybolmasına yol açar.',
        'es': 'Envíe exactamente <strong id="usdtStepAmount">— USDT</strong> a la dirección anterior usando la red <strong>TRC20 (TRON)</strong>. <strong style="color:#ef4444;">Use el monto exacto mostrado</strong> — así identificamos su pago. Cualquier otra red resultará en pérdida permanente de fondos.',
        'pt': 'Envie exatamente <strong id="usdtStepAmount">— USDT</strong> para o endereço acima usando a rede <strong>TRC20 (TRON)</strong>. <strong style="color:#ef4444;">Use o valor exato mostrado</strong> — é assim que identificamos seu pagamento. Qualquer outra rede resultará em perda permanente de fundos.',
        'id': 'Kirim tepat <strong id="usdtStepAmount">— USDT</strong> ke alamat di atas menggunakan jaringan <strong>TRC20 (TRON)</strong>. <strong style="color:#ef4444;">Gunakan jumlah yang tepat sesuai yang ditampilkan</strong> — ini cara kami mengidentifikasi pembayaran Anda. Jaringan lain akan mengakibatkan kehilangan dana secara permanen.',
    },
    'pay.step3.text': {
        'en': 'Paste your <strong>transaction hash (TxID)</strong> below and click Confirm. Your account will be activated automatically.',
        'ko': '아래에 <strong>거래 해시(TxID)</strong>를 붙여넣고 확인을 클릭하세요. 계정이 자동으로 활성화됩니다.',
        'ja': '下に<strong>トランザクションハッシュ（TxID）</strong>を貼り付けて確認をクリックしてください。アカウントは自動的に有効化されます。',
        'zh': '在下方粘贴您的<strong>交易哈希（TxID）</strong>并点击确认。您的账户将自动激活。',
        'vi': 'Dán <strong>mã giao dịch (TxID)</strong> của bạn bên dưới và nhấn Xác nhận. Tài khoản của bạn sẽ được kích hoạt tự động.',
        'ru': 'Вставьте <strong>хеш транзакции (TxID)</strong> ниже и нажмите Подтвердить. Ваш аккаунт будет активирован автоматически.',
        'tr': 'Aşağıya <strong>işlem hash\'ini (TxID)</strong> yapıştırın ve Onayla\'ya tıklayın. Hesabınız otomatik olarak etkinleştirilecektir.',
        'es': 'Pegue su <strong>hash de transacción (TxID)</strong> abajo y haga clic en Confirmar. Su cuenta se activará automáticamente.',
        'pt': 'Cole seu <strong>hash de transação (TxID)</strong> abaixo e clique em Confirmar. Sua conta será ativada automaticamente.',
        'id': 'Tempel <strong>hash transaksi (TxID)</strong> Anda di bawah dan klik Konfirmasi. Akun Anda akan diaktifkan secara otomatis.',
    },
    'pay.ok.desc': {
        'en': 'Your <strong id="successPlan">Pro</strong> plan is now active.<br />Your bots are ready to trade on OKX.',
        'ko': '<strong id="successPlan">Pro</strong> 플랜이 활성화되었습니다.<br />봇이 OKX에서 거래할 준비가 완료되었습니다.',
        'ja': '<strong id="successPlan">Pro</strong>プランが有効になりました。<br />ボットはOKXでの取引準備ができています。',
        'zh': '您的<strong id="successPlan">Pro</strong>计划已激活。<br />您的机器人已准备好在OKX上进行交易。',
        'vi': 'Gói <strong id="successPlan">Pro</strong> của bạn đã được kích hoạt.<br />Bot của bạn đã sẵn sàng giao dịch trên OKX.',
        'ru': 'Ваш план <strong id="successPlan">Pro</strong> активирован.<br />Боты готовы к торговле на OKX.',
        'tr': '<strong id="successPlan">Pro</strong> planınız artık aktif.<br />Botlarınız OKX\'te işlem yapmaya hazır.',
        'es': 'Su plan <strong id="successPlan">Pro</strong> está ahora activo.<br />Sus bots están listos para operar en OKX.',
        'pt': 'Seu plano <strong id="successPlan">Pro</strong> está agora ativo.<br />Seus bots estão prontos para negociar na OKX.',
        'id': 'Paket <strong id="successPlan">Pro</strong> Anda kini aktif.<br />Bot Anda siap trading di OKX.',
    },
}

# ── 2. Inject new keys into i18n.js ──────────────────────────────────────────
with open(I18N_PATH, 'r', encoding='utf-8') as f:
    i18n_src = f.read()

# Find the closing `};` of the T object to inject before
# We'll add new keys at the end of each language object
# Strategy: find each language block end and insert new keys before the closing `}`
# The T object ends with the last language then `};`
# We'll add to each lang by finding `'db.logout':` (last known db key per lang) or use regex

for lang in LANGS:
    for key, vals in NEW_KEYS.items():
        val = vals[lang]
        # Escape for JS single-quoted string: escape single quotes and backslashes
        val_escaped = val.replace('\\', '\\\\').replace("'", "\\'")
        new_entry = f"      '{key}': '{val_escaped}',"
        if f"'{key}'" in i18n_src:
            continue  # key already exists, skip
        # Not present — insert it. Find a reliable anchor in this language's block.
        # Use the lang-specific 'db.logout' key as insertion anchor
        anchor = f"      'db.logout':"
        # Find which language block this is in by finding the pattern within the lang block
        # Language blocks are separated by `  en: {` / `  ko: {` patterns
        lang_block_start = i18n_src.find(f'  {lang}:')
        if lang_block_start == -1:
            print(f"WARNING: lang block not found for {lang}")
            continue
        next_lang_start = len(i18n_src)
        for other_lang in LANGS:
            if other_lang == lang:
                continue
            pos = i18n_src.find(f'  {other_lang}:', lang_block_start + 1)
            if pos != -1 and pos < next_lang_start:
                next_lang_start = pos
        lang_block = i18n_src[lang_block_start:next_lang_start]
        # Find 'db.logout' within this language block
        anchor_in_block = lang_block.find("'db.logout':")
        if anchor_in_block == -1:
            print(f"WARNING: db.logout not found for {lang}")
            continue
        # Insert after the db.logout line
        abs_anchor = lang_block_start + anchor_in_block
        eol = i18n_src.find('\n', abs_anchor)
        i18n_src = i18n_src[:eol+1] + new_entry + '\n' + i18n_src[eol+1:]

with open(I18N_PATH, 'w', encoding='utf-8') as f:
    f.write(i18n_src)

# Verify
added = sum(1 for k in NEW_KEYS if f"'{k}'" in i18n_src)
print(f"Added {added}/{len(NEW_KEYS)} new keys to i18n.js")

# ── 3. Add data-i18n attributes to dashboard.html card titles and h3s ────────
with open(DASH_PATH, 'r', encoding='utf-8') as f:
    dash = f.read()

dash_replacements = [
    ('<span class="card-title">Win Rate</span>', '<span class="card-title" data-i18n="db.ov.winrate">Win Rate</span>'),
    ('<span class="card-title">My Bots</span>', '<span class="card-title" data-i18n="db.card.mybots">My Bots</span>'),
    ('<span class="card-title">Available Strategies</span>', '<span class="card-title" data-i18n="db.card.strategies">Available Strategies</span>'),
    ('<span class="card-title">Equity Curve (All Time)</span>', '<span class="card-title" data-i18n="db.card.equityall">Equity Curve (All Time)</span>'),
    ('<span class="card-title">Monthly P&amp;L</span>', '<span class="card-title" data-i18n="db.card.monthlypnl">Monthly P&amp;L</span>'),
    ('<span class="card-title">Strategy Breakdown</span>', '<span class="card-title" data-i18n="db.card.stratbreakdown">Strategy Breakdown</span>'),
    ('<span class="card-title">Top Pairs</span>', '<span class="card-title" data-i18n="db.card.toppairs">Top Pairs</span>'),
    ('<span class="card-title">OKX API Key</span>', '<span class="card-title" data-i18n="db.card.apikey">OKX API Key</span>'),
    ('<span class="card-title">API Security Guidelines</span>', '<span class="card-title" data-i18n="db.card.apisecurity">API Security Guidelines</span>'),
    ('<span class="card-title">Change Password</span>', '<span class="card-title" data-i18n="db.card.changepw">Change Password</span>'),
    ('<span class="card-title">Security Notifications</span>', '<span class="card-title" data-i18n="db.card.secnotif">Security Notifications</span>'),
    ('<span class="card-title">Profile</span>', '<span class="card-title" data-i18n="db.card.profile">Profile</span>'),
    ('<span class="card-title">Subscription</span>', '<span class="card-title" data-i18n="db.card.subscription">Subscription</span>'),
    ('<span class="card-title">Two-Factor Authentication</span>', '<span class="card-title" data-i18n="db.card.twofa">Two-Factor Authentication</span>'),
    ('<span class="card-title">Notification Preferences</span>', '<span class="card-title" data-i18n="db.card.notifpref">Notification Preferences</span>'),
    ('<span class="card-title">Bot Status</span>', '<span class="card-title" data-i18n="db.card.botstatus">Bot Status</span>'),
    ('<span class="card-title">Market Intelligence</span>', '<span class="card-title" data-i18n="db.card.market">Market Intelligence</span>'),
    ('<span class="card-title">Risk Management</span>', '<span class="card-title" data-i18n="db.card.risk">Risk Management</span>'),
    ('<span class="card-title">Daily Loss Limit</span>', '<span class="card-title" data-i18n="db.card.dayloss">Daily Loss Limit</span>'),
    ('<span class="card-title">Strategy</span>', '<span class="card-title" data-i18n="db.card.strategy">Strategy</span>'),
    # Security notification h3s
    ('<h3>New device login alert</h3>', '<h3 data-i18n="db.notif.newdevice">New device login alert</h3>'),
    ('<h3>API key change alert</h3>', '<h3 data-i18n="db.notif.apichange">API key change alert</h3>'),
    ('<h3>Suspicious activity alert</h3>', '<h3 data-i18n="db.notif.suspicious">Suspicious activity alert</h3>'),
    ('<h3>Trade execution alerts</h3>', '<h3 data-i18n="db.notif.tradeexec">Trade execution alerts</h3>'),
    ('<h3>Telegram notifications</h3>', '<h3 data-i18n="db.notif.telegram">Telegram notifications</h3>'),
    ('<h3>Daily email report</h3>', '<h3 data-i18n="db.notif.dailyreport">Daily email report</h3>'),
    ('<h3>Stop-loss triggered alert</h3>', '<h3 data-i18n="db.notif.stoploss">Stop-loss triggered alert</h3>'),
]

changed_dash = 0
for old, new in dash_replacements:
    if old in dash:
        dash = dash.replace(old, new, 1)
        changed_dash += 1
    else:
        print(f"WARNING: not found in dashboard.html: {old[:60]}")

with open(DASH_PATH, 'w', encoding='utf-8') as f:
    f.write(dash)
print(f"dashboard.html: {changed_dash}/{len(dash_replacements)} card title/h3 replacements done")

# ── 4. Add data-i18n(-html) attributes to payment.html ───────────────────────
with open(PAY_PATH, 'r', encoding='utf-8') as f:
    pay = f.read()

pay_replacements = [
    (
        '<p>On the OKX withdrawal screen, you will be asked to select a destination type. Choose <strong>Exchange</strong> — do <strong>not</strong> select Unhosted Wallet, OKX Users, or OKX Wallet.</p>',
        '<p data-i18n-html="pay.okx.dest">On the OKX withdrawal screen, you will be asked to select a destination type. Choose <strong>Exchange</strong> — do <strong>not</strong> select Unhosted Wallet, OKX Users, or OKX Wallet.</p>',
    ),
    (
        '<p>Send exactly <strong id="usdtStepAmount">— USDT</strong> to the address above using the <strong>TRC20 (TRON)</strong> network. <strong style="color:#ef4444;">Use the exact amount shown</strong> — this is how we identify your payment. Any other network will result in permanent loss of funds.</p>',
        '<p data-i18n-html="pay.step1.text">Send exactly <strong id="usdtStepAmount">— USDT</strong> to the address above using the <strong>TRC20 (TRON)</strong> network. <strong style="color:#ef4444;">Use the exact amount shown</strong> — this is how we identify your payment. Any other network will result in permanent loss of funds.</p>',
    ),
    (
        '<p>Paste your <strong>transaction hash (TxID)</strong> below and click Confirm. Your account will be activated automatically.</p>',
        '<p data-i18n-html="pay.step3.text">Paste your <strong>transaction hash (TxID)</strong> below and click Confirm. Your account will be activated automatically.</p>',
    ),
    (
        '<p>Your <strong id="successPlan">Pro</strong> plan is now active.<br />Your bots are ready to trade on OKX.</p>',
        '<p data-i18n-html="pay.ok.desc">Your <strong id="successPlan">Pro</strong> plan is now active.<br />Your bots are ready to trade on OKX.</p>',
    ),
]

changed_pay = 0
for old, new in pay_replacements:
    if old in pay:
        pay = pay.replace(old, new, 1)
        changed_pay += 1
    else:
        print(f"WARNING: not found in payment.html: {old[:80]}")

with open(PAY_PATH, 'w', encoding='utf-8') as f:
    f.write(pay)
print(f"payment.html: {changed_pay}/{len(pay_replacements)} paragraph tags added")
print("Done.")
