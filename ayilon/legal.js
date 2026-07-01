/* Shared content + renderer for AYILON legal/about pages in 6 languages.
   Each page includes this file, sets window.LEGAL_PAGE, and calls renderLegal(). */
(function () {
  const U = 'Last updated: 29 June 2026';
  const CT = 'support@ayilon.com';
  const mail = '<a href="mailto:' + CT + '">' + CT + '</a>';

  // Section shapes: {h, p} | {h, li:[...]} | {note} | {cards:[{n,h,p}]} | {cta:{href,label}}
  const L = {
    terms: {
      en: { t: 'Terms of Service & Competition Rules', u: U, intro: 'AYILON Arena ("AYILON", "we") runs a global trading competition where participants compete using their own real exchange accounts. By creating an account or joining a competition you agree to these Terms.', sec: [
        { h: '1. Eligibility', li: ['You must be at least 18 and legally permitted to trade crypto derivatives in your jurisdiction.', 'Participation requires a verified email and a connected read-only exchange API key.', 'To be eligible for prizes, your exchange account must (a) be registered through AYILON\'s referral link, and (b) hold at least the published minimum balance at the start of the season.'] },
        { h: '2. The competition', li: ['Entry is free. No entry fee, no purchase required.', 'You connect a read-only API key. AYILON reads only equity, profit and volume — we cannot trade, transfer or withdraw.', 'Rankings are computed automatically across categories (return %, profit, volume) over weekly and monthly seasons. Weekly seasons start every Monday 00:00 UTC; monthly on the 1st.', 'Deposits and withdrawals during a season are excluded from performance to keep rankings fair.'] },
        { h: '3. Prizes', li: ['The prize pool is funded from AYILON\'s trading rewards and grows as the league grows. Each prize is a real share of that pool — never more than the funded amount.', 'Prizes go to the top eligible participants in each category at season end. Winning more than one category is allowed.', 'We may adjust the funded percentage, split, categories and schedule, and may withhold prizes where abuse is suspected.'] },
        { h: '4. Fair play', p: 'Prohibited and grounds for disqualification and permanent ban: operating multiple accounts for advantage, opposite-side hedging between linked accounts, wash trading or self-dealing to inflate volume, market manipulation, exploiting bugs, or misrepresenting results. AYILON\'s determinations on eligibility and fair play are final.' },
        { h: '5. Risk & no advice', note: 'Trading crypto derivatives carries a high risk of loss, including your entire principal. AYILON is a competition and analytics platform only. We do not provide investment advice, manage funds, or guarantee profit. Every trade and every result is your own decision and responsibility. Leaderboards show participants\' own real trading and are not a recommendation.' },
        { h: '6. Your exchange account & keys', p: 'You are responsible for creating read-only keys with no IP restriction so the service can read your stats. You may disconnect at any time, which stops all data access and removes you from active leaderboards.' },
        { h: '7. Limitation of liability', p: 'The service is provided "as is". To the maximum extent permitted by law, AYILON is not liable for trading losses, exchange outages, data inaccuracies, or any indirect or consequential damages.' },
        { h: '8. Changes & termination', p: 'We may update these Terms or modify, suspend or discontinue any part of the service at any time. Continued use after changes constitutes acceptance.' },
        { h: '9. Contact', p: 'Questions about these Terms: ' + mail }
      ]},
      ko: { t: '이용약관 & 대회 규정', u: '최종 수정: 2026년 6월 29일', intro: 'AYILON Arena("AYILON", "회사")는 참가자가 자신의 실제 거래소 계정으로 경쟁하는 글로벌 트레이딩 대회를 운영합니다. 계정을 만들거나 대회에 참가하면 본 약관에 동의하는 것으로 간주됩니다.', sec: [
        { h: '1. 참가 자격', li: ['만 18세 이상이며 거주 지역에서 암호화폐 파생상품 거래가 합법적으로 허용되어야 합니다.', '참가에는 이메일 인증과 읽기 전용 거래소 API 키 연결이 필요합니다.', '상금 대상이 되려면 거래소 계정이 (a) AYILON 추천 링크로 가입되어 있고, (b) 시즌 시작 시점에 공지된 최소 잔고 이상을 보유해야 합니다.'] },
        { h: '2. 대회 방식', li: ['참가는 무료입니다. 참가비도, 구매도 필요 없습니다.', '읽기 전용 API 키를 연결합니다. AYILON은 평가금·수익·거래량만 읽으며 매매·이체·출금은 할 수 없습니다.', '순위는 부문별(수익률·수익금·거래량)로 주간·월간 시즌에 걸쳐 자동 집계됩니다. 주간 시즌은 매주 월요일 00:00 UTC, 월간은 매월 1일에 시작합니다.', '시즌 중 입출금은 순위 공정성을 위해 성과에서 제외됩니다.'] },
        { h: '3. 상금', li: ['상금 풀은 AYILON의 거래보상에서 적립되며 리그가 커질수록 함께 커집니다. 각 상금은 실제 풀의 일정 비율이며, 적립된 금액을 절대 초과하지 않습니다.', '상금은 시즌 종료 시 각 부문의 상위 자격 참가자에게 지급됩니다. 여러 부문 동시 우승도 가능합니다.', '회사는 적립 비율·배분·부문·일정을 조정할 수 있으며, 부정행위가 의심되면 상금을 보류할 수 있습니다.'] },
        { h: '4. 공정성', p: '다음은 금지되며 실격 및 영구 정지 사유입니다: 유리함을 위한 다중 계정 운영, 연결된 계정 간 양방향 헤지, 거래량을 부풀리기 위한 워시 트레이딩·자전거래, 시세 조종, 버그 악용, 결과 조작. 자격 및 공정성에 대한 AYILON의 판단이 최종입니다.' },
        { h: '5. 위험 고지 & 투자자문 아님', note: '암호화폐 파생상품 거래는 원금 전액을 포함한 큰 손실 위험이 있습니다. AYILON은 대회·분석 플랫폼일 뿐입니다. 투자 자문을 제공하거나 자금을 운용하거나 수익을 보장하지 않습니다. 모든 거래와 결과는 참가자 본인의 결정과 책임입니다. 리더보드는 참가자 본인의 실거래이며 특정 방식을 권유하지 않습니다.' },
        { h: '6. 거래소 계정 & 키', p: '서비스가 통계를 읽을 수 있도록 IP 제한 없는 읽기 전용 키를 만들 책임은 본인에게 있습니다. 언제든 연결을 해제할 수 있으며, 해제 시 모든 데이터 접근이 중단되고 활성 리더보드에서 제거됩니다.' },
        { h: '7. 책임의 제한', p: '서비스는 "있는 그대로" 제공됩니다. 법이 허용하는 최대 범위에서 AYILON은 거래 손실, 거래소 장애, 데이터 부정확성, 기타 간접·결과적 손해에 대해 책임지지 않습니다.' },
        { h: '8. 변경 & 종료', p: '회사는 언제든 본 약관을 변경하거나 서비스의 일부를 수정·중단·종료할 수 있습니다. 변경 후 계속 사용하면 동의한 것으로 간주됩니다.' },
        { h: '9. 문의', p: '약관 관련 문의: ' + mail }
      ]},
      zh: { t: '服务条款与赛事规则', u: '最后更新：2026年6月29日', intro: 'AYILON Arena（“AYILON”“我们”）运营一个全球交易赛事，参赛者使用自己的真实交易所账户竞争。创建账户或参赛即表示您同意本条款。', sec: [
        { h: '1. 参赛资格', li: ['您须年满18岁，且在您所在司法辖区可合法交易加密衍生品。', '参赛需验证邮箱并连接只读交易所API密钥。', '若要获得奖金，您的交易所账户须（a）通过AYILON推荐链接注册，且（b）在赛季开始时持有不低于公布的最低余额。'] },
        { h: '2. 赛事方式', li: ['免费参赛。无报名费，无需购买。', '连接只读API密钥。AYILON仅读取净值、盈亏和交易量——无法交易、转账或提现。', '排名按类别（收益率、盈利额、交易量）在周赛和月赛中自动计算。周赛每周一00:00 UTC开始，月赛每月1日开始。', '赛季内的充值与提现将从业绩中排除，以保证排名公平。'] },
        { h: '3. 奖金', li: ['奖池来自AYILON的交易返佣，随联赛成长而增加。每份奖金都是奖池的真实比例份额，绝不超过已注资金额。', '奖金在赛季结束时发给各类别的顶尖合格参赛者。允许同时赢得多个类别。', '我们可调整注资比例、分配、类别和赛程，并在怀疑作弊时扣发奖金。'] },
        { h: '4. 公平竞赛', p: '以下行为被禁止，将导致取消资格并永久封禁：为获取优势运营多账户、关联账户间反向对冲、为刷量进行对敲/自成交、市场操纵、利用漏洞或伪造结果。AYILON对资格与公平的判定为最终决定。' },
        { h: '5. 风险提示与非投资建议', note: '交易加密衍生品有极高亏损风险，可能损失全部本金。AYILON仅为赛事与分析平台，不提供投资建议、不管理资金、不保证盈利。每一笔交易及其结果均为您自己的决定与责任。排行榜展示参赛者本人的真实交易，并非任何策略推荐。' },
        { h: '6. 您的交易所账户与密钥', p: '您有责任创建无IP限制的只读密钥，以便服务读取您的数据。您可随时断开连接，届时将停止所有数据访问并从活跃排行榜移除。' },
        { h: '7. 责任限制', p: '服务按“现状”提供。在法律允许的最大范围内，AYILON对交易亏损、交易所中断、数据不准确或任何间接或后果性损害概不负责。' },
        { h: '8. 变更与终止', p: '我们可随时更新本条款或修改、暂停、终止服务的任何部分。变更后继续使用即视为接受。' },
        { h: '9. 联系', p: '有关本条款的问题：' + mail }
      ]},
      es: { t: 'Términos de servicio y reglas del torneo', u: 'Última actualización: 29 de junio de 2026', intro: 'AYILON Arena ("AYILON", "nosotros") organiza un torneo global de trading donde los participantes compiten con sus propias cuentas reales de exchange. Al crear una cuenta o participar, aceptas estos Términos.', sec: [
        { h: '1. Elegibilidad', li: ['Debes tener al menos 18 años y estar legalmente autorizado a operar derivados cripto en tu jurisdicción.', 'La participación requiere un email verificado y una clave API de solo lectura conectada.', 'Para optar a premios, tu cuenta de exchange debe (a) estar registrada mediante el enlace de referido de AYILON y (b) tener al menos el saldo mínimo publicado al inicio de la temporada.'] },
        { h: '2. El torneo', li: ['La entrada es gratuita. Sin cuota ni compra.', 'Conectas una clave API de solo lectura. AYILON lee solo capital, beneficio y volumen — no puede operar, transferir ni retirar.', 'Los rankings se calculan automáticamente por categorías (rentabilidad %, beneficio, volumen) en temporadas semanales y mensuales. Las semanales empiezan cada lunes a las 00:00 UTC; las mensuales, el día 1.', 'Los depósitos y retiros durante una temporada se excluyen del rendimiento para mantener la equidad.'] },
        { h: '3. Premios', li: ['El bote se financia con las recompensas de trading de AYILON y crece con la liga. Cada premio es una parte real del bote — nunca más de lo financiado.', 'Los premios van a los mejores participantes elegibles de cada categoría al final de la temporada. Se permite ganar más de una categoría.', 'Podemos ajustar el porcentaje financiado, el reparto, las categorías y el calendario, y retener premios ante sospecha de abuso.'] },
        { h: '4. Juego limpio', p: 'Prohibido y motivo de descalificación y baneo permanente: operar varias cuentas para obtener ventaja, cobertura en sentido opuesto entre cuentas vinculadas, wash trading o autooperaciones para inflar volumen, manipulación del mercado, explotar errores o falsear resultados. Las decisiones de AYILON sobre elegibilidad y juego limpio son definitivas.' },
        { h: '5. Riesgo y sin asesoramiento', note: 'Operar derivados cripto conlleva un alto riesgo de pérdida, incluido todo tu capital. AYILON es solo una plataforma de torneo y análisis. No damos asesoramiento de inversión, no gestionamos fondos ni garantizamos beneficios. Cada operación y resultado es tu propia decisión y responsabilidad. Las clasificaciones muestran el trading real de los participantes y no son una recomendación.' },
        { h: '6. Tu cuenta y claves', p: 'Eres responsable de crear claves de solo lectura sin restricción de IP para que el servicio lea tus estadísticas. Puedes desconectar en cualquier momento, lo que detiene todo acceso a datos y te retira de las clasificaciones activas.' },
        { h: '7. Limitación de responsabilidad', p: 'El servicio se ofrece "tal cual". En la máxima medida legal, AYILON no es responsable de pérdidas de trading, caídas del exchange, inexactitudes de datos ni daños indirectos o consecuentes.' },
        { h: '8. Cambios y terminación', p: 'Podemos actualizar estos Términos o modificar, suspender o discontinuar cualquier parte del servicio en cualquier momento. El uso continuado tras los cambios implica aceptación.' },
        { h: '9. Contacto', p: 'Preguntas sobre estos Términos: ' + mail }
      ]},
      vi: { t: 'Điều khoản dịch vụ & Luật giải đấu', u: 'Cập nhật lần cuối: 29/06/2026', intro: 'AYILON Arena ("AYILON", "chúng tôi") tổ chức một giải giao dịch toàn cầu, nơi người tham gia thi đấu bằng tài khoản sàn thực của mình. Bằng việc tạo tài khoản hoặc tham gia, bạn đồng ý với các Điều khoản này.', sec: [
        { h: '1. Điều kiện tham gia', li: ['Bạn phải từ 18 tuổi trở lên và được phép giao dịch phái sinh crypto theo pháp luật nơi bạn ở.', 'Tham gia cần email đã xác minh và một khóa API chỉ đọc được kết nối.', 'Để đủ điều kiện nhận thưởng, tài khoản sàn của bạn phải (a) đăng ký qua liên kết giới thiệu của AYILON, và (b) có số dư tối thiểu công bố khi mùa giải bắt đầu.'] },
        { h: '2. Giải đấu', li: ['Tham gia miễn phí. Không phí, không cần mua.', 'Bạn kết nối khóa API chỉ đọc. AYILON chỉ đọc tài sản, lợi nhuận và khối lượng — không thể giao dịch, chuyển hay rút.', 'Xếp hạng được tính tự động theo các hạng mục (lợi nhuận %, tiền lãi, khối lượng) qua mùa tuần và tháng. Mùa tuần bắt đầu mỗi Thứ Hai 00:00 UTC; mùa tháng vào ngày 1.', 'Nạp và rút trong mùa giải bị loại khỏi thành tích để đảm bảo công bằng.'] },
        { h: '3. Giải thưởng', li: ['Quỹ thưởng đến từ phần thưởng giao dịch của AYILON và tăng theo quy mô giải. Mỗi giải là một phần thực tế của quỹ — không bao giờ vượt số đã cấp.', 'Giải thưởng trao cho những người đủ điều kiện đứng đầu mỗi hạng mục khi kết thúc mùa. Được phép thắng nhiều hạng mục.', 'Chúng tôi có thể điều chỉnh tỷ lệ cấp quỹ, cách chia, hạng mục và lịch, và có thể giữ lại giải khi nghi ngờ gian lận.'] },
        { h: '4. Chơi công bằng', p: 'Bị cấm và là căn cứ loại tư cách, cấm vĩnh viễn: dùng nhiều tài khoản để trục lợi, phòng hộ ngược chiều giữa các tài khoản liên kết, wash trading/tự khớp để thổi khối lượng, thao túng thị trường, khai thác lỗi hoặc làm sai lệch kết quả. Quyết định của AYILON về điều kiện và công bằng là quyết định cuối cùng.' },
        { h: '5. Rủi ro & không phải tư vấn', note: 'Giao dịch phái sinh crypto có rủi ro thua lỗ cao, kể cả toàn bộ vốn. AYILON chỉ là nền tảng giải đấu và phân tích. Chúng tôi không tư vấn đầu tư, không quản lý vốn, không đảm bảo lợi nhuận. Mọi giao dịch và kết quả là quyết định và trách nhiệm của bạn. Bảng xếp hạng hiển thị giao dịch thật của người tham gia và không phải khuyến nghị.' },
        { h: '6. Tài khoản sàn & khóa', p: 'Bạn có trách nhiệm tạo khóa chỉ đọc không giới hạn IP để dịch vụ đọc số liệu của bạn. Bạn có thể ngắt kết nối bất cứ lúc nào, khi đó mọi truy cập dữ liệu dừng lại và bạn bị gỡ khỏi bảng xếp hạng đang hoạt động.' },
        { h: '7. Giới hạn trách nhiệm', p: 'Dịch vụ được cung cấp "nguyên trạng". Trong phạm vi pháp luật cho phép, AYILON không chịu trách nhiệm cho thua lỗ giao dịch, sự cố sàn, dữ liệu sai lệch hay bất kỳ thiệt hại gián tiếp nào.' },
        { h: '8. Thay đổi & chấm dứt', p: 'Chúng tôi có thể cập nhật Điều khoản hoặc sửa đổi, tạm dừng, ngừng bất kỳ phần nào của dịch vụ bất cứ lúc nào. Tiếp tục sử dụng sau thay đổi nghĩa là chấp nhận.' },
        { h: '9. Liên hệ', p: 'Câu hỏi về Điều khoản: ' + mail }
      ]},
      ru: { t: 'Условия использования и правила турнира', u: 'Последнее обновление: 29 июня 2026', intro: 'AYILON Arena («AYILON», «мы») проводит глобальный торговый турнир, где участники соревнуются на своих реальных биржевых счетах. Создавая аккаунт или участвуя, вы соглашаетесь с этими Условиями.', sec: [
        { h: '1. Право на участие', li: ['Вам должно быть не менее 18 лет и вы должны иметь право торговать крипто-деривативами в своей юрисдикции.', 'Для участия нужны подтверждённая почта и подключённый ключ API «только чтение».', 'Для права на призы ваш биржевой счёт должен (a) быть зарегистрирован по реферальной ссылке AYILON и (b) иметь не менее опубликованного минимального баланса на старте сезона.'] },
        { h: '2. Турнир', li: ['Участие бесплатно. Без взносов и покупок.', 'Вы подключаете ключ «только чтение». AYILON читает только капитал, прибыль и объём — не может торговать, переводить или выводить.', 'Рейтинги считаются автоматически по категориям (доходность %, прибыль, объём) в недельных и месячных сезонах. Недельные начинаются каждый понедельник в 00:00 UTC, месячные — 1-го числа.', 'Пополнения и выводы в течение сезона исключаются из результата для честности.'] },
        { h: '3. Призы', li: ['Призовой фонд формируется из торговых вознаграждений AYILON и растёт вместе с лигой. Каждый приз — реальная доля фонда, никогда не больше профинансированной суммы.', 'Призы получают лучшие подходящие участники в каждой категории в конце сезона. Победа в нескольких категориях разрешена.', 'Мы можем менять процент финансирования, распределение, категории и расписание и удерживать призы при подозрении в злоупотреблении.'] },
        { h: '4. Честная игра', p: 'Запрещено и ведёт к дисквалификации и вечной блокировке: несколько аккаунтов ради преимущества, встречный хедж между связанными аккаунтами, wash-trading/самосделки для накрутки объёма, манипуляции рынком, эксплуатация багов или искажение результатов. Решения AYILON по праву на участие и честной игре окончательны.' },
        { h: '5. Риск и отсутствие советов', note: 'Торговля крипто-деривативами связана с высоким риском убытков, вплоть до всего капитала. AYILON — только платформа турнира и аналитики. Мы не даём инвестсоветов, не управляем средствами и не гарантируем прибыль. Каждая сделка и результат — ваше решение и ответственность. Таблицы показывают реальную торговлю участников и не являются рекомендацией.' },
        { h: '6. Ваш счёт и ключи', p: 'Вы отвечаете за создание ключей «только чтение» без ограничения по IP, чтобы сервис читал вашу статистику. Вы можете отключиться в любой момент — это остановит доступ к данным и уберёт вас из активных таблиц.' },
        { h: '7. Ограничение ответственности', p: 'Сервис предоставляется «как есть». В максимально допустимой законом степени AYILON не несёт ответственности за торговые убытки, сбои биржи, неточности данных и любой косвенный ущерб.' },
        { h: '8. Изменения и прекращение', p: 'Мы можем обновлять эти Условия или изменять, приостанавливать, прекращать любую часть сервиса в любое время. Продолжение использования означает согласие.' },
        { h: '9. Контакты', p: 'Вопросы по Условиям: ' + mail }
      ]}
    },
    privacy: {
      en: { t: 'Privacy Policy', u: U, intro: 'This policy explains what AYILON Arena collects, why, and how we handle it. By using the service you agree to this policy.', sec: [
        { h: '1. What we collect', li: ['Account info: email, nickname, country, and a securely hashed password.', 'Exchange data (read-only): the API key you connect, your exchange UID, and the equity, profit/loss and volume we read to compute rankings. These keys cannot trade, transfer or withdraw.', 'Technical: a session token stored in your browser to keep you signed in, and the IP/device signals used to detect multi-account abuse.'] },
        { h: '2. How we use it', li: ['To run the competition: compute scores, build leaderboards and award prizes.', 'To verify your email and secure your account.', 'To verify, where applicable, that your exchange account is under AYILON\'s referral for prize eligibility, and to detect fair-play abuse.'] },
        { h: '3. What is shown publicly', p: 'Leaderboards and the Hall of Fame display your nickname, country and competition stats (rank, return, profit, volume). Your email, API keys and account identifiers are never shown publicly.' },
        { h: '4. Sharing', p: 'We do not sell your personal data. We use third-party providers only to operate the service (hosting and email delivery), and exchange APIs to read your competition stats.' },
        { h: '5. Security & retention', p: 'Passwords are hashed. API keys are read-only. We retain your data while your account is active. You can disconnect your key any time to stop all access, and delete your account to remove your data.' },
        { h: '6. Your choices', li: ['Disconnect your API key — stops all reading immediately and removes you from active leaderboards.', 'Change your nickname any time.', 'Request account deletion via the contact below.'] },
        { h: '7. Contact', p: 'Privacy questions or deletion requests: ' + mail }
      ]},
      ko: { t: '개인정보 처리방침', u: '최종 수정: 2026년 6월 29일', intro: '본 방침은 AYILON Arena가 무엇을 수집하고, 왜, 어떻게 처리하는지 설명합니다. 서비스를 이용하면 본 방침에 동의하는 것으로 간주됩니다.', sec: [
        { h: '1. 수집 항목', li: ['계정 정보: 이메일, 닉네임, 국가, 안전하게 해시된 비밀번호.', '거래소 데이터(읽기 전용): 연결한 API 키, 거래소 UID, 순위 계산을 위해 읽는 평가금·손익·거래량. 이 키는 매매·이체·출금이 불가합니다.', '기술 정보: 로그인 유지를 위한 세션 토큰, 다중 계정 부정행위 탐지를 위한 IP·기기 신호.'] },
        { h: '2. 이용 목적', li: ['대회 운영: 점수 계산, 리더보드 구성, 상금 지급.', '이메일 인증 및 계정 보안.', '해당되는 경우 거래소 계정이 AYILON 추천으로 가입되었는지 확인(상금 자격) 및 공정성 위반 탐지.'] },
        { h: '3. 공개되는 정보', p: '리더보드와 명예의 전당에는 닉네임, 국가, 대회 성과(순위·수익률·수익금·거래량)가 표시됩니다. 이메일, API 키, 계정 식별자는 절대 공개되지 않습니다.' },
        { h: '4. 제3자 제공', p: '개인정보를 판매하지 않습니다. 서비스 운영을 위한 제공업체(호스팅, 인증 메일 발송)와 대회 통계를 읽기 위한 거래소 API만 이용합니다.' },
        { h: '5. 보안 & 보관', p: '비밀번호는 해시 처리됩니다. API 키는 읽기 전용입니다. 계정이 활성인 동안 데이터를 보관합니다. 언제든 키 연결을 해제해 모든 접근을 중단하고, 계정을 삭제해 데이터를 제거할 수 있습니다.' },
        { h: '6. 이용자의 선택', li: ['API 키 연결 해제 — 즉시 모든 읽기를 중단하고 활성 리더보드에서 제거.', '언제든 닉네임 변경.', '아래 연락처로 계정 삭제 요청.'] },
        { h: '7. 문의', p: '개인정보 문의 또는 삭제 요청: ' + mail }
      ]},
      zh: { t: '隐私政策', u: '最后更新：2026年6月29日', intro: '本政策说明 AYILON Arena 收集什么、为何收集以及如何处理。使用本服务即表示您同意本政策。', sec: [
        { h: '1. 我们收集什么', li: ['账户信息：邮箱、昵称、国家和安全哈希后的密码。', '交易所数据（只读）：您连接的API密钥、交易所UID，以及用于计算排名的净值、盈亏和交易量。这些密钥无法交易、转账或提现。', '技术信息：用于保持登录的会话令牌，以及用于检测多账户作弊的IP/设备信号。'] },
        { h: '2. 我们如何使用', li: ['运营赛事：计算分数、生成排行榜、发放奖金。', '验证邮箱并保护账户安全。', '在适用时核实您的交易所账户是否通过AYILON推荐注册（奖金资格），并检测违规行为。'] },
        { h: '3. 公开显示的内容', p: '排行榜和名人堂显示您的昵称、国家和赛事数据（排名、收益率、盈利额、交易量）。您的邮箱、API密钥和账户标识符绝不公开。' },
        { h: '4. 共享', p: '我们不出售您的个人数据。仅使用第三方提供商运营服务（托管与验证邮件发送），以及交易所API读取您的赛事数据。' },
        { h: '5. 安全与保留', p: '密码经过哈希处理。API密钥为只读。账户活跃期间保留数据。您可随时断开密钥以停止所有访问，或删除账户以移除数据。' },
        { h: '6. 您的选择', li: ['断开API密钥——立即停止所有读取并从活跃排行榜移除。', '随时更改昵称。', '通过下方联系方式请求删除账户。'] },
        { h: '7. 联系', p: '隐私问题或删除请求：' + mail }
      ]},
      es: { t: 'Política de privacidad', u: 'Última actualización: 29 de junio de 2026', intro: 'Esta política explica qué recopila AYILON Arena, por qué y cómo lo tratamos. Al usar el servicio aceptas esta política.', sec: [
        { h: '1. Qué recopilamos', li: ['Datos de cuenta: email, apodo, país y una contraseña con hash seguro.', 'Datos del exchange (solo lectura): la clave API que conectas, tu UID y el capital, beneficio/pérdida y volumen que leemos para calcular rankings. Estas claves no pueden operar, transferir ni retirar.', 'Técnicos: un token de sesión en tu navegador y las señales de IP/dispositivo usadas para detectar abuso multicuenta.'] },
        { h: '2. Cómo lo usamos', li: ['Para el torneo: calcular puntuaciones, crear clasificaciones y otorgar premios.', 'Para verificar tu email y proteger tu cuenta.', 'Para verificar, cuando aplique, que tu cuenta está bajo el referido de AYILON (elegibilidad) y detectar abusos.'] },
        { h: '3. Qué se muestra públicamente', p: 'Las clasificaciones y el Salón de la Fama muestran tu apodo, país y estadísticas (puesto, rentabilidad, beneficio, volumen). Tu email, claves API e identificadores nunca se muestran.' },
        { h: '4. Compartición', p: 'No vendemos tus datos personales. Usamos proveedores externos solo para operar el servicio (hosting y envío de emails) y las APIs del exchange para leer tus estadísticas.' },
        { h: '5. Seguridad y retención', p: 'Las contraseñas se cifran con hash. Las claves API son de solo lectura. Conservamos tus datos mientras tu cuenta esté activa. Puedes desconectar la clave para detener todo acceso y eliminar tu cuenta.' },
        { h: '6. Tus opciones', li: ['Desconectar tu clave API — detiene toda lectura y te retira de las clasificaciones.', 'Cambiar tu apodo cuando quieras.', 'Solicitar eliminación de cuenta en el contacto de abajo.'] },
        { h: '7. Contacto', p: 'Preguntas de privacidad o eliminación: ' + mail }
      ]},
      vi: { t: 'Chính sách quyền riêng tư', u: 'Cập nhật lần cuối: 29/06/2026', intro: 'Chính sách này giải thích AYILON Arena thu thập gì, vì sao và xử lý thế nào. Bằng việc dùng dịch vụ, bạn đồng ý với chính sách này.', sec: [
        { h: '1. Chúng tôi thu thập gì', li: ['Thông tin tài khoản: email, biệt danh, quốc gia và mật khẩu được băm an toàn.', 'Dữ liệu sàn (chỉ đọc): khóa API bạn kết nối, UID sàn, và tài sản, lãi/lỗ, khối lượng chúng tôi đọc để tính xếp hạng. Các khóa này không thể giao dịch, chuyển hay rút.', 'Kỹ thuật: token phiên lưu trong trình duyệt để duy trì đăng nhập, và tín hiệu IP/thiết bị dùng để phát hiện gian lận nhiều tài khoản.'] },
        { h: '2. Cách chúng tôi dùng', li: ['Vận hành giải: tính điểm, lập bảng xếp hạng và trao thưởng.', 'Xác minh email và bảo mật tài khoản.', 'Khi áp dụng, xác minh tài khoản sàn của bạn thuộc giới thiệu của AYILON (điều kiện nhận thưởng) và phát hiện gian lận.'] },
        { h: '3. Nội dung hiển thị công khai', p: 'Bảng xếp hạng và Đại sảnh Danh vọng hiển thị biệt danh, quốc gia và số liệu thi đấu (hạng, lợi nhuận, tiền lãi, khối lượng). Email, khóa API và định danh tài khoản không bao giờ hiển thị công khai.' },
        { h: '4. Chia sẻ', p: 'Chúng tôi không bán dữ liệu cá nhân. Chỉ dùng nhà cung cấp bên thứ ba để vận hành dịch vụ (lưu trữ và gửi email) và API sàn để đọc số liệu thi đấu của bạn.' },
        { h: '5. Bảo mật & lưu giữ', p: 'Mật khẩu được băm. Khóa API chỉ đọc. Chúng tôi giữ dữ liệu khi tài khoản còn hoạt động. Bạn có thể ngắt khóa bất cứ lúc nào để dừng mọi truy cập và xóa tài khoản để gỡ dữ liệu.' },
        { h: '6. Lựa chọn của bạn', li: ['Ngắt khóa API — dừng mọi việc đọc ngay và gỡ khỏi bảng xếp hạng.', 'Đổi biệt danh bất cứ lúc nào.', 'Yêu cầu xóa tài khoản qua liên hệ bên dưới.'] },
        { h: '7. Liên hệ', p: 'Câu hỏi quyền riêng tư hoặc xóa dữ liệu: ' + mail }
      ]},
      ru: { t: 'Политика конфиденциальности', u: 'Последнее обновление: 29 июня 2026', intro: 'Эта политика объясняет, что собирает AYILON Arena, зачем и как мы это обрабатываем. Используя сервис, вы соглашаетесь с политикой.', sec: [
        { h: '1. Что мы собираем', li: ['Данные аккаунта: почта, никнейм, страна и надёжно хешированный пароль.', 'Биржевые данные (только чтение): подключённый ключ API, ваш UID и капитал, прибыль/убыток и объём, которые мы читаем для рейтингов. Эти ключи не могут торговать, переводить или выводить.', 'Технические: токен сессии в браузере и сигналы IP/устройства для выявления мультиаккаунт-злоупотреблений.'] },
        { h: '2. Как мы это используем', li: ['Для турнира: подсчёт очков, таблицы лидеров и выдача призов.', 'Для подтверждения почты и защиты аккаунта.', 'Где применимо — проверка, что счёт под рефералом AYILON (право на приз), и выявление нарушений.'] },
        { h: '3. Что показывается публично', p: 'В таблицах и Зале славы показаны ваш никнейм, страна и статистика (место, доходность, прибыль, объём). Почта, ключи API и идентификаторы аккаунта никогда не показываются.' },
        { h: '4. Передача', p: 'Мы не продаём ваши данные. Сторонних провайдеров используем только для работы сервиса (хостинг и отправка писем) и API бирж — для чтения вашей статистики.' },
        { h: '5. Безопасность и хранение', p: 'Пароли хешируются. Ключи API только для чтения. Данные храним, пока аккаунт активен. Вы можете отключить ключ, чтобы остановить доступ, и удалить аккаунт, чтобы стереть данные.' },
        { h: '6. Ваш выбор', li: ['Отключить ключ API — мгновенно останавливает чтение и убирает из таблиц.', 'Менять никнейм в любое время.', 'Запросить удаление аккаунта по контакту ниже.'] },
        { h: '7. Контакты', p: 'Вопросы о конфиденциальности или удалении: ' + mail }
      ]}
    },
    about: {
      en: { t: 'About — AYILON Arena', h1: 'Prove your edge.<br><b>Compete</b> for the prize.', intro: 'AYILON Arena is a global real-money trading league. Traders worldwide compete on their own exchange accounts — and the best rise to the top of the board.', sec: [
        { h: 'How it works', cards: [{ n: 'STEP 01', h: 'Sign up via AYILON', p: 'Create an OKX account through the AYILON referral link.' }, { n: 'STEP 02', h: 'Connect read-only', p: 'Link a read-only API key. We can never touch your funds.' }, { n: 'STEP 03', h: 'Trade & climb', p: 'Your stats are scored automatically onto the leaderboard.' }] },
        { h: 'Three categories', p: 'Compete on return %, profit and volume — each on both weekly and monthly seasons. Miss one board, still win another. New weekly seasons start every Monday 00:00 UTC.' },
        { h: 'Why it\'s safe', p: 'Entry is free, and you connect a read-only key — AYILON only reads your stats and can never trade, transfer or withdraw. Your money stays in your own exchange account the whole time.' },
        { cta: { href: '/', label: 'Enter the Arena →' } },
        { note: 'Trading involves risk of loss of principal. AYILON Arena is a competition platform and does not provide investment advice or guarantee profit. All trading decisions and outcomes are solely the participant\'s responsibility.' }
      ]},
      ko: { t: '소개 — AYILON Arena', h1: '실력을 증명하고,<br><b>상금</b>에 도전하세요.', intro: 'AYILON Arena는 글로벌 실전 트레이딩 리그입니다. 전 세계 트레이더가 자신의 거래소 계정으로 경쟁하고, 최고가 리더보드 상단에 오릅니다.', sec: [
        { h: '진행 방식', cards: [{ n: 'STEP 01', h: 'AYILON 추천으로 가입', p: 'AYILON 추천 링크로 OKX 계정을 만드세요.' }, { n: 'STEP 02', h: '읽기 전용 연결', p: '읽기 전용 API 키를 연결합니다. 자금은 절대 건드릴 수 없습니다.' }, { n: 'STEP 03', h: '거래하고 순위 오르기', p: '통계가 자동 집계되어 리더보드에 반영됩니다.' }] },
        { h: '세 가지 부문', p: '수익률·수익금·거래량 — 각 부문이 주간·월간으로 모두 열립니다. 한 부문을 놓쳐도 다른 부문에서 우승할 수 있습니다. 주간 시즌은 매주 월요일 00:00 UTC에 시작합니다.' },
        { h: '안전한 이유', p: '참가는 무료이며 읽기 전용 키만 연결합니다. AYILON은 통계만 읽을 뿐 매매·이체·출금을 할 수 없습니다. 자금은 처음부터 끝까지 당신의 거래소 계정에 그대로 있습니다.' },
        { cta: { href: '/', label: '아레나 입장 →' } },
        { note: '트레이딩에는 원금 손실 위험이 있습니다. AYILON Arena는 대회 플랫폼이며 투자 자문이나 수익을 보장하지 않습니다. 모든 거래 결정과 결과는 전적으로 참가자 본인의 책임입니다.' }
      ]},
      zh: { t: '关于 — AYILON Arena', h1: '证明你的实力，<br><b>争夺</b>奖金。', intro: 'AYILON Arena 是全球真金交易联赛。世界各地的交易者用自己的交易所账户竞争——最强者登顶排行榜。', sec: [
        { h: '如何运作', cards: [{ n: 'STEP 01', h: '通过AYILON注册', p: '用AYILON推荐链接创建OKX账户。' }, { n: 'STEP 02', h: '只读连接', p: '连接只读API密钥。我们永远碰不到你的资金。' }, { n: 'STEP 03', h: '交易并攀升', p: '你的数据自动计入排行榜。' }] },
        { h: '三个类别', p: '在收益率、盈利额和交易量上竞争——每项都有周赛和月赛。错过一个榜，仍可赢另一个。周赛每周一00:00 UTC开始。' },
        { h: '为何安全', p: '免费参赛，你连接的是只读密钥——AYILON只读取数据，永远无法交易、转账或提现。你的资金始终留在你自己的交易所账户中。' },
        { cta: { href: '/', label: '进入竞技场 →' } },
        { note: '交易存在本金亏损风险。AYILON Arena 是赛事平台，不提供投资建议或保证盈利。所有交易决定与结果均由参赛者自行负责。' }
      ]},
      es: { t: 'Acerca de — AYILON Arena', h1: 'Demuestra tu ventaja.<br><b>Compite</b> por el premio.', intro: 'AYILON Arena es una liga global de trading con dinero real. Traders de todo el mundo compiten con sus propias cuentas — y los mejores llegan a lo más alto.', sec: [
        { h: 'Cómo funciona', cards: [{ n: 'STEP 01', h: 'Regístrate vía AYILON', p: 'Crea una cuenta OKX con el enlace de referido de AYILON.' }, { n: 'STEP 02', h: 'Conexión solo lectura', p: 'Vincula una clave de solo lectura. Nunca tocamos tus fondos.' }, { n: 'STEP 03', h: 'Opera y sube', p: 'Tus estadísticas se puntúan automáticamente en la clasificación.' }] },
        { h: 'Tres categorías', p: 'Compite en rentabilidad %, beneficio y volumen — cada una en temporadas semanales y mensuales. Si fallas en una, aún puedes ganar otra. Las semanales empiezan cada lunes 00:00 UTC.' },
        { h: 'Por qué es seguro', p: 'La entrada es gratis y conectas una clave de solo lectura — AYILON solo lee tus estadísticas y nunca puede operar, transferir ni retirar. Tu dinero permanece en tu cuenta todo el tiempo.' },
        { cta: { href: '/', label: 'Entrar a la Arena →' } },
        { note: 'Operar implica riesgo de pérdida del capital. AYILON Arena es una plataforma de torneo y no da asesoramiento de inversión ni garantiza beneficios. Todas las decisiones y resultados son responsabilidad del participante.' }
      ]},
      vi: { t: 'Giới thiệu — AYILON Arena', h1: 'Chứng minh bản lĩnh.<br><b>Tranh</b> giải thưởng.', intro: 'AYILON Arena là giải giao dịch tiền thật toàn cầu. Trader khắp thế giới thi đấu bằng tài khoản sàn của mình — người giỏi nhất lên đỉnh bảng.', sec: [
        { h: 'Cách hoạt động', cards: [{ n: 'STEP 01', h: 'Đăng ký qua AYILON', p: 'Tạo tài khoản OKX bằng liên kết giới thiệu của AYILON.' }, { n: 'STEP 02', h: 'Kết nối chỉ đọc', p: 'Liên kết khóa API chỉ đọc. Chúng tôi không bao giờ chạm vào tiền của bạn.' }, { n: 'STEP 03', h: 'Giao dịch & thăng hạng', p: 'Số liệu của bạn được tính tự động lên bảng xếp hạng.' }] },
        { h: 'Ba hạng mục', p: 'Thi đấu ở lợi nhuận %, tiền lãi và khối lượng — mỗi hạng mục đều có mùa tuần và tháng. Lỡ một bảng vẫn thắng bảng khác. Mùa tuần mới bắt đầu mỗi Thứ Hai 00:00 UTC.' },
        { h: 'Vì sao an toàn', p: 'Tham gia miễn phí và bạn kết nối khóa chỉ đọc — AYILON chỉ đọc số liệu, không thể giao dịch, chuyển hay rút. Tiền của bạn luôn nằm trong tài khoản sàn của bạn.' },
        { cta: { href: '/', label: 'Vào Đấu trường →' } },
        { note: 'Giao dịch có rủi ro mất vốn. AYILON Arena là nền tảng giải đấu, không tư vấn đầu tư hay đảm bảo lợi nhuận. Mọi quyết định và kết quả do người tham gia tự chịu trách nhiệm.' }
      ]},
      ru: { t: 'О нас — AYILON Arena', h1: 'Докажи мастерство.<br><b>Борись</b> за приз.', intro: 'AYILON Arena — глобальная лига трейдинга на реальные деньги. Трейдеры со всего мира соревнуются на своих биржевых счетах, и лучшие поднимаются на вершину.', sec: [
        { h: 'Как это работает', cards: [{ n: 'STEP 01', h: 'Регистрация через AYILON', p: 'Создайте счёт OKX по реферальной ссылке AYILON.' }, { n: 'STEP 02', h: 'Подключение «только чтение»', p: 'Подключите ключ «только чтение». Мы никогда не касаемся ваших средств.' }, { n: 'STEP 03', h: 'Торгуй и поднимайся', p: 'Ваша статистика автоматически попадает в таблицу лидеров.' }] },
        { h: 'Три категории', p: 'Соревнуйтесь в доходности %, прибыли и объёме — каждая в недельных и месячных сезонах. Пропустили одну — выиграете другую. Недельные сезоны начинаются каждый понедельник в 00:00 UTC.' },
        { h: 'Почему это безопасно', p: 'Участие бесплатно, вы подключаете ключ «только чтение» — AYILON лишь читает статистику и не может торговать, переводить или выводить. Ваши деньги всё время остаются на вашем счёте.' },
        { cta: { href: '/', label: 'Войти на Арену →' } },
        { note: 'Трейдинг сопряжён с риском потери капитала. AYILON Arena — платформа турнира, не даёт инвестсоветов и не гарантирует прибыль. Все решения и результаты — ответственность участника.' }
      ]}
    }
  };

  const LANGS = [['en', 'English'], ['ko', '한국어'], ['zh', '中文'], ['es', 'Español'], ['vi', 'Tiếng Việt'], ['ru', 'Русский']];

  function esc(s) { return s; } // content is trusted (authored here)
  function sectionHtml(s) {
    let h = '';
    if (s.h) h += '<h2>' + s.h + '</h2>';
    if (s.intro) h += '<p class="lead">' + s.intro + '</p>';
    if (s.p) h += '<p>' + s.p + '</p>';
    if (s.li) h += '<ul>' + s.li.map(x => '<li>' + x + '</li>').join('') + '</ul>';
    if (s.note) h += '<div class="note">' + s.note + '</div>';
    if (s.cards) h += '<div class="grid">' + s.cards.map(c => '<div class="card">' + (c.n ? '<div class="n">' + c.n + '</div>' : '') + '<h3>' + c.h + '</h3><p>' + c.p + '</p></div>').join('') + '</div>';
    if (s.cta) h += '<a class="btn" href="' + s.cta.href + '">' + s.cta.label + '</a>';
    return h;
  }

  window.renderLegal = function () {
    const page = window.LEGAL_PAGE;
    const data = L[page]; if (!data) return;
    let lang = localStorage.getItem('ayilon_lang') || (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (!data[lang]) lang = 'en';
    const d = data[lang];
    document.title = d.t + (page === 'about' ? '' : ' — AYILON Arena');
    document.documentElement.lang = lang;
    let html = '';
    if (page === 'about') { html += '<h1>' + d.h1 + '</h1>'; if (d.intro) html += '<p class="lead">' + d.intro + '</p>'; }
    else { html += '<h1>' + d.t + '</h1>'; if (d.u) html += '<div class="upd">' + d.u + '</div>'; if (d.intro) html += '<p>' + d.intro + '</p>'; }
    html += d.sec.map(sectionHtml).join('');
    document.getElementById('legal').innerHTML = html;
    const sel = document.getElementById('legalLang');
    if (sel) sel.value = lang;
  };

  window.buildLegalLangSel = function () {
    const sel = document.getElementById('legalLang'); if (!sel) return;
    sel.innerHTML = LANGS.map(([v, n]) => '<option value="' + v + '">' + n + '</option>').join('');
    sel.addEventListener('change', function () { localStorage.setItem('ayilon_lang', sel.value); renderLegal(); });
  };
})();
