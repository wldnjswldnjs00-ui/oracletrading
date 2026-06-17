/* AYILON — Internationalization (EN / KO) */
(function () {
  var LANG_KEY = 'ayilon_lang';
  var LANGS = ['en', 'ko'];

  /* ── Inject dropdown CSS ── */
  (function () {
    if (document.getElementById('ayilon-i18n-css')) return;
    var s = document.createElement('style');
    s.id = 'ayilon-i18n-css';
    s.textContent = [
      '.lang-switcher{position:relative!important;display:inline-flex!important;align-items:center!important;gap:0!important;}',
      '.lang-btn{display:none!important;}',
      '.lang-dd{position:relative;display:inline-flex;}',
      '.lang-dd-btn{display:flex;align-items:center;gap:5px;background:none;border:1px solid rgba(255,255,255,.15);color:#fff;font-size:11px;font-weight:600;letter-spacing:.06em;padding:5px 10px;border-radius:6px;cursor:pointer;font-family:Inter,sans-serif;transition:border-color .2s,background .2s;white-space:nowrap;}',
      '.lang-dd-btn:hover{border-color:rgba(255,255,255,.4);background:rgba(255,255,255,.04);}',
      '.lang-dd-chev{flex-shrink:0;transition:transform .22s;display:inline-block;margin-left:1px;}',
      '.lang-dd.open .lang-dd-chev{transform:rotate(180deg);}',
      '.lang-dd-menu{display:none;position:absolute;top:calc(100% + 6px);right:0;background:#111;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:4px;z-index:9999;min-width:68px;box-shadow:0 8px 32px rgba(0,0,0,.7);}',
      '.lang-dd.open .lang-dd-menu{display:block;}',
      '.lang-dd-item{display:block;width:100%;padding:8px 14px;background:none;border:none;color:#a3a3a3;font-size:11px;font-weight:600;letter-spacing:.06em;text-align:left;cursor:pointer;font-family:Inter,sans-serif;border-radius:5px;transition:background .15s,color .15s;}',
      '.lang-dd-item:hover{background:rgba(255,255,255,.07);color:#fff;}',
      '.lang-dd-item.active{color:#fff;background:rgba(255,255,255,.06);}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  })();

  var T = {
    en: {
      /* ── SHARED NAV ── */
      'nav.features':   'Features',
      'nav.how':        'How It Works',
      'nav.pricing':    'Pricing',
      'nav.botguide':   'Bot Guide',
      'nav.login':      'Log In',
      'nav.getstarted': 'Get Started',
      'nav.dashboard':  'Dashboard →',
      'nav.about':      'About',
      'nav.faq':        'FAQ',
      'nav.back':       '← Back to Home',
      'nav.backpricing':'← Back to Pricing',
      'nav.nosignup':   "Don't have an account? Sign Up →",
      'nav.haveaccount':'Already have an account? Log In →',

      /* ── MOBILE MENU ── */
      'mobile.features':   'Features',
      'mobile.how':        'How It Works',
      'mobile.pricing':    'Pricing',
      'mobile.botguide':   'Bot Guide',
      'mobile.login':      'Log In',
      'mobile.getstarted': 'Get Started →',

      /* ── INDEX: HERO ── */
      'hero.badge':    'Automated Crypto Trading — 24/7',
      'hero.title1':   'The end',
      'hero.title2':   'of effort.',
      'hero.desc':     "Connect your OKX API key. AYILON's algorithmic bots trade 24/7 on your behalf — no downloads, no setup, no effort.",
      'hero.cta1':     'Automate My Account →',
      'hero.cta2':     'See How It Works',
      'hero.tagline':  'Set, forget, grow.',

      /* ── INDEX: STATS ── */
      'stats.vol.label':    'Total Volume Traded',
      'stats.bots.label':   'Active Bots',
      'stats.traders.label':'Traders Worldwide',
      'stats.uptime.label': 'Server Uptime',

      /* ── INDEX: FEATURES ── */
      'feat.tag':   'Core Features',
      'feat.title': 'Everything you need to automate trading',
      'feat.desc':  'From strategy selection to execution and profit tracking — AYILON handles it all while you sleep.',
      'feat.1.title': 'Automated Trading',
      'feat.1.desc':  'Algorithmic bots that never stop. 24/7/365 market monitoring with instant execution at the optimal moment.',
      'feat.2.title': 'OKX Integration',
      'feat.2.desc':  'Connect to OKX in seconds via API key. Your funds stay on the exchange — AYILON only trades, never withdraws.',
      'feat.3.title': 'Multiple Strategies',
      'feat.3.desc':  'Support/resistance entries, fractional DCA, fixed-fractional position sizing — proven strategies configurable in one click.',
      'feat.4.title': 'Backtesting',
      'feat.4.desc':  'Simulate strategy performance on historical data before committing real capital. Verify before you deploy.',
      'feat.5.title': 'Real-Time Alerts',
      'feat.5.desc':  'Instant notifications for fills, stop-losses, and profit targets via email and Telegram.',
      'feat.6.title': 'Asset Protection',
      'feat.6.desc':  'API keys stored with trading-only permissions. Withdrawal access is never requested — your funds stay yours.',

      /* ── INDEX: HOW IT WORKS ── */
      'how.tag':         'How It Works',
      'how.title':       'Up and running in 4 steps',
      'how.step1.title': 'Create Account',
      'how.step1.desc':  'Sign up with your email in under 30 seconds.',
      'how.step2.title': 'Connect OKX',
      'how.step2.desc':  'Paste your OKX API key and secret. Read + trade permissions only.',
      'how.step3.title': 'Choose Strategy',
      'how.step3.desc':  'Pick a strategy, select your pairs, and set your capital allocation.',
      'how.step4.title': 'Let It Run',
      'how.step4.desc':  'Hit start. Your bot trades 24/7 on AYILON\'s servers — nothing to install or maintain.',

      /* ── INDEX: EXCHANGES ── */
      'exch.header': 'Supported Exchange',

      /* ── INDEX: STRATEGY ── */
      'strat.tag':   'Our Approach',
      'strat.title': 'Institutional-grade logic. Now yours.',
      'strat.desc':  'The same logic that works in a bull market works in a bear market. AYILON identifies institutional S/R levels and enters in the direction the market is already moving — long from support, short from resistance.',
      'strat.f1.tag':  'Multi-Touch S/R Detection',
      'strat.f1.desc': 'Levels are only validated after 3+ confirmed price reactions. The algorithm measures wick precision and body rejection — not just proximity. No guesswork, no lagging indicators.',
      'strat.f2.tag':  'Wick-Only Entry Filter',
      'strat.f2.desc': 'Entry triggers only on 5m wick contact with the level — never on a body breakout. The same technique used by institutional desks to get filled at exact levels without chasing.',
      'strat.f3.tag':  'Volume Pattern Confirmation',
      'strat.f3.desc': 'Volume spikes at the level confirm institutional participation. Low-volume touches are skipped — they signal retail noise, not real support. Only high-conviction setups are taken.',
      'strat.f4.tag':  'Ranging Market Filter',
      'strat.f4.desc': 'Detects choppy, low-structure phases and pauses trading automatically. Prevents the repeated stop-losses that destroy most bots during consolidation. Trades only when structure is clear.',
      'strat.risk.title': 'The algorithm that learned not to lose first.',
      'strat.risk.desc':  'Every position is monitored in real time. Fixed fractional position sizing, dynamic stop-loss adjustment, and circuit breakers that automatically pause trading during extreme market conditions — because protecting your capital always comes before making profit.',
      'strat.chart.entrylogic': 'ENTRY LOGIC',
      'strat.chart.resistance': 'RESISTANCE',
      'strat.chart.support':    'SUPPORT',

      /* ── INDEX: PRICING ── */
      'price.tag':         'Pricing',
      'price.title':       'Simple, transparent pricing',
      'price.desc':        'No hidden fees. Your trading profit — 100% yours.',
      'price.toggle.mo':   'Monthly',
      'price.toggle.yr':   'Annual',
      'price.toggle.save': 'Save up to 15%',
      'price.cta':         'Get Started',
      'price.plan.starter': 'Starter',
      'price.plan.pro':     'Pro',
      'price.plan.elite':   'Elite',
      'price.period':       '/ month',
      'price.billed.yr':    'Billed {amount}/yr',
      'price.save.badge':   'Save {pct}%',
      'price.starter.f1':   '1 active trading bot',
      'price.starter.f2':   'OKX perpetual swaps',
      'price.starter.f3':   '3 strategies: RSI DCA · MA Support · S/R Bounce',
      'price.starter.f4':   'Real-time dashboard',
      'price.starter.f5':   'Email notifications',
      'price.starter.f6':   'Fixed Fractional risk sizing',
      'price.pro.f1':       '5 active trading bots',
      'price.pro.f2':       'OKX perpetual swaps',
      'price.pro.f3':       '7 strategies: all Starter + MA Crossover · Bollinger Band · Breakout + Volume · MA Ribbon',
      'price.pro.f4':       'Backtesting engine',
      'price.pro.f5':       'Email & Telegram alerts',
      'price.pro.f6':       'Custom entry sizing: equal / weighted / martingale',
      'price.pro.f7':       'Priority support',
      'price.elite.f1':     'Unlimited trading bots',
      'price.elite.f2':     'OKX perpetual swaps',
      'price.elite.f3':     'All 10 strategies: MACD Divergence · Funding Rate · ATR Trend + all Pro',
      'price.elite.f4':     'Full analytics suite',
      'price.elite.f5':     'Email, Telegram & SMS alerts',
      'price.elite.f6':     'Dedicated account manager',
      'price.elite.f7':     '24/7 premium support',

      /* ── INDEX: STRATEGY COMPARE ── */
      'strat.compare.title': 'Strategy availability by plan',
      'strat.col.strategy':  'Strategy',
      'strat.col.dir':       'Direction',
      'strat.col.risk':      'Risk',
      'strat.dir.long':      'Long Only',
      'strat.dir.ls':        'Long / Short',
      'strat.dir.lb':        'Long Bias',
      'strat.risk.low':      'Low',
      'strat.risk.med':      'Medium',
      'strat.risk.high':     'High',
      'strat.1':             'RSI Oversold DCA Long',
      'strat.2':             'MA Support DCA',
      'strat.3':             'S/R Bounce',
      'strat.4':             'MA Crossover + RSI',
      'strat.5':             'Bollinger Band Mean Reversion',
      'strat.6':             'Breakout + Volume',
      'strat.7':             'MA Ribbon Long',
      'strat.8':             'MACD Divergence',
      'strat.9':             'Funding Rate Contrarian',
      'strat.10':            'ATR Trend Following',

      /* ── INDEX: REFERRAL ── */
      'ref.tag':   'Special Offer',
      'ref.title': 'Elite plan. Free forever.',
      'ref.desc':  'Sign up for OKX through our referral link, complete your registration, and unlock permanent lifetime Elite access at absolutely no cost.',
      'ref.s1':    'Open an OKX account via our referral link',
      'ref.s2':    'Complete identity verification on OKX',
      'ref.s3':    'Contact AYILON support with your OKX UID',
      'ref.cta':   'Open OKX Account →',
      'ref.code':  'Referral code: AYILON',

      /* ── INDEX: FAQ ── */
      'faq.tag':   'FAQ',
      'faq.title': 'Everything you need to know',
      'faq.q1': 'What is AYILON?',
      'faq.a1': 'AYILON is a fully automated crypto trading platform that runs bots on your OKX account 24/7. You connect your API key, and the bot handles everything — entries, exits, and position management — while you sleep.',
      'faq.q2': 'Is my money safe? Does AYILON hold my funds?',
      'faq.a2': 'No — AYILON never holds or touches your funds. All trades happen directly on your OKX account via an API key that you create and control. We strongly recommend enabling Trade-only permissions (no Withdraw access) on your API key so that funds can never leave your exchange account.',
      'faq.q3': 'What exchanges are supported?',
      'faq.a3': 'Currently AYILON supports OKX. Support for Binance, Bybit, and other major exchanges is on our roadmap.',
      'faq.q4': 'What trading strategies are available?',
      'faq.a4': 'AYILON offers 10 trading strategies available across plan tiers. Starter includes RSI Oversold DCA, MA Support DCA, and S/R Bounce. Pro adds MA Crossover + RSI, Bollinger Band Reversion, Breakout + Volume, and MA Ribbon Long. Elite unlocks all 10 strategies, including MACD Divergence, Funding Rate Contrarian, and ATR Trend Following.',
      'faq.q5': 'Do I need any trading experience?',
      'faq.a5': 'No. AYILON is built for everyone — from complete beginners to experienced traders. Each bot comes with default parameters tuned for safety. Advanced users can customise leverage, position size, and stop-loss levels.',
      'faq.q6': 'Can I get a refund?',
      'faq.a6': 'Yes — if you have not yet connected an API key and your request is within 7 days of purchase, you are eligible for a full refund. After 7 days or after connecting an API key, only cancellation is available.',
      'faq.q7': 'How do I cancel my subscription?',
      'faq.a7': 'Go to Dashboard → My Account → Subscription and click "Cancel Subscription." Your access continues until the end of the current billing period.',
      'faq.q8': 'What is the minimum amount to start?',
      'faq.a8': 'There is no minimum set by AYILON. OKX has minimum order sizes per pair (typically $5–$10). For bots to work effectively we recommend starting with at least $500–$1,000 per active bot.',
      'faq.q9': 'Is there a demo or trial mode?',
      'faq.a9': 'Yes — you can connect OKX\'s Demo Trading account (free virtual $100,000 USDT) to test any strategy risk-free before going live. Demo mode is available on all plans.',

      /* ── INDEX: CTA ── */
      'cta.title':    'Nothing to Everything.',
      'cta.subtitle': 'Simply, more.',
      'cta.btn':      'Automate My Account →',

      /* ── SHARED FOOTER ── */
      'footer.product':   'Product',
      'footer.support':   'Support',
      'footer.company':   'Company',
      'footer.tagline':   'Creating profit from nothing. Automated crypto trading platform powered by algorithmic intelligence.',
      'footer.copy':      '© 2026 AYILON. All rights reserved.',
      'footer.risk':      'Trading involves risk. Past performance does not guarantee future results.',
      'footer.features':  'Features',
      'footer.pricing':   'Pricing',
      'footer.how':       'How It Works',
      'footer.botguide':  'Bot Guide',
      'footer.logic':     'Trading Logic',
      'footer.dashboard': 'Dashboard',
      'footer.about':     'About Us',
      'footer.getstarted':'Get Started',
      'footer.aboutco':   'About',
      'footer.privacy':   'Privacy Policy',
      'footer.terms':     'Terms of Service',
      'footer.home':      'Home',
      'footer.upgrade':   'Upgrade',

      /* ── ABOUT ── */
      'about.hero.tag':   'About AYILON',
      'about.hero.title1':'We build the bots.',
      'about.hero.title2':'You keep the profits.',
      'about.hero.desc':  'AYILON was built on one belief: algorithmic trading should not be reserved for hedge funds and institutions. Anyone with an exchange account should have access to the same tools.',
      'about.mission.label': 'Our Mission',
      'about.mission.title': 'Democratise automated trading',
      'about.mission.p1':    'For years, quantitative trading strategies were locked behind proprietary infrastructure that only large firms could afford to build and maintain.',
      'about.mission.p2':    'We built AYILON to change that. By combining institutional-grade bot logic with a simple, clean interface and direct OKX integration, we make it possible for anyone to put their portfolio on autopilot.',
      'about.mission.p3':    'No coding. No servers. No watching charts. Just set your strategy, connect your API key, and let the bot work.',
      'about.stat1.label':   'Bots run continuously — even while you sleep',
      'about.stat2.label':   'Support & Resistance detection across 1H + 4H timeframes',
      'about.stat3.label':   'AYILON never holds or touches your funds',
      'about.values.tag':    'What we stand for',
      'about.values.title':  'Built on three principles',
      'about.v1.title': 'Transparency',
      'about.v1.desc':  'No black-box algorithms. Every strategy we offer is clearly documented — you know exactly what the bot is doing, why, and when. Your trades, your data, your decisions.',
      'about.v2.title': 'Security First',
      'about.v2.desc':  'We never hold your funds. API keys are encrypted at rest. We recommend — and enforce — trade-only API permissions so that no withdrawal is ever possible through our platform.',
      'about.v3.title': 'Simplicity',
      'about.v3.desc':  'Powerful tools don\'t have to be complicated. We obsess over the interface so you can focus on results, not settings. If it takes more than three clicks to start a bot, we\'ve failed.',
      'about.tech.tag':   'Technology',
      'about.tech.title': 'Infrastructure built for reliability',
      'about.tech1.name': 'Cloudflare Workers',
      'about.tech1.desc': 'Bot logic runs on Cloudflare\'s global edge network — sub-millisecond execution, zero cold starts, 99.9%+ uptime. No single point of failure.',
      'about.tech2.name': 'OKX API v5',
      'about.tech2.desc': 'Direct integration with OKX\'s latest REST and WebSocket API. Real-time orderbook data, instant order placement, and live position monitoring.',
      'about.tech3.name': 'Cloudflare KV',
      'about.tech3.desc': 'User data, bot configurations, and trade history are stored in Cloudflare KV — a globally distributed key-value store with low-latency reads worldwide.',
      'about.tech4.name': 'Resend',
      'about.tech4.desc': 'Transactional emails — verification codes, subscription confirmations, trade alerts — delivered reliably via Resend\'s developer-first email API.',
      'about.cta.title':    'Ready to start?',
      'about.cta.subtitle': 'Join traders who let AYILON run their strategy around the clock.',
      'about.cta.btn1':     'Create Account →',
      'about.cta.btn2':     'View Plans',
      'about.cta.btn3':     'Read Bot Guide',

      /* ── LOGIN ── */
      'login.title':       'Log In',
      'login.noaccount':   "Don't have an account?",
      'login.signup':      'Sign up',
      'login.email':       'Email',
      'login.email.ph':    'you@example.com',
      'login.password':    'Password',
      'login.password.ph': 'Enter your password',
      'login.show':        'Show',
      'login.forgot':      'Forgot your password?',
      'login.submit':      'Log In',
      'login.error':       'Incorrect email or password.',
      'login.2fa.title':   'Two-Factor Auth',
      'login.2fa.sub':     'Select your verification method.',
      'login.2fa.email.title': 'Email Code',
      'login.2fa.email.desc':  'Send a 6-digit code to your email address',
      'login.2fa.app.title':   'Authenticator App',
      'login.2fa.app.desc':    'Enter the code from Google or Microsoft Authenticator',
      'login.otp.title':       'Enter Code',
      'login.otp.verify':      'Verify & Sign In',
      'login.otp.resend':      "Didn't receive a code?",
      'login.otp.resendlink':  'Resend',
      'login.forgot.title':    'Reset Password',
      'login.forgot.sub':      'Enter your registered email address.',
      'login.forgot.send':     'Send Verification →',
      'login.forgot.notfound': 'Email address not found.',
      'login.newpw.title': 'New Password',
      'login.newpw.sub':   'Enter your new password below.',
      'login.newpw.new':   'New Password',
      'login.newpw.new.ph':'8+ characters',
      'login.newpw.confirm':'Confirm Password',
      'login.newpw.confirm.ph':'Re-enter new password',
      'login.newpw.submit':'Reset Password',
      'login.newpw.ok':    'Password reset successfully. Please log in.',

      /* ── SIGNUP ── */
      'signup.title':    'Create your account',
      'signup.haveacct': 'Already have an account?',
      'signup.loginlink':'Log in',
      'signup.name':     'Full Name',
      'signup.name.ph':  'John Doe',
      'signup.username': 'Username',
      'signup.username.ph':   'e.g. ayilon_trader',
      'signup.username.hint': 'Letters, numbers and _ only (2–20 characters)',
      'signup.email':    'Email (used as login ID)',
      'signup.email.ph': 'you@example.com',
      'signup.sendcode': 'Send Code',
      'signup.codeph':   'Enter 6-digit code',
      'signup.codehint': 'Enter the 6-digit code sent to your email',
      'signup.verify':   'Verify',
      'signup.expired':  'Expired',
      'signup.pw':       'Password',
      'signup.pw.ph':    '8+ characters, letters + numbers + symbols',
      'signup.show':     'Show',
      'signup.pw.hint':  'Use letters, numbers, and special characters (8+ chars)',
      'signup.pw.weak':  'Password is too weak',
      'signup.pw.mod':   'Moderate password strength',
      'signup.pw.strong':'✓ Strong password',
      'signup.pw2':      'Confirm Password',
      'signup.pw2.ph':   'Re-enter your password',
      'signup.pw.match': '✓ Passwords match',
      'signup.pw.nomatch':'Passwords do not match',
      'signup.terms.all':'Agree to all',
      'signup.terms.tos':'Terms of Service',
      'signup.terms.req':'(required)',
      'signup.terms.priv':'Privacy Policy',
      'signup.terms.mkt': 'Receive marketing communications (optional)',
      'signup.submit':    'Create Account',
      'signup.err.email': 'Please verify your email first.',
      'signup.err.user':  'Please choose a valid, available username.',
      'signup.err.pw':    'Passwords do not match.',
      'signup.err.terms': 'Please agree to the required terms.',
      'signup.err.taken': 'This email is already registered. Please log in instead.',
      'signup.ok':        'Account created successfully!',

      /* ── PAYMENT ── */
      'pay.summary':    'Order Summary',
      'pay.monthly':    'Monthly',
      'pay.annual':     'Annual',
      'pay.total':      'Total due today',
      'pay.title':      'Payment Details',
      'pay.method':     'USDT (TRC20)',
      'pay.method.desc':'Tether on TRON network · 0% fees',
      'pay.email':      'Email Address',
      'pay.email.ph':   'you@example.com',
      'pay.email.hint': 'Payment confirmation will be sent to this address.',
      'pay.amount':     'Amount to Send (exact)',
      'pay.generating': 'Generating your unique payment amount...',
      'pay.unique':     'Your unique payment ID — send this exact amount',
      'pay.fee.sub':    'Subscription amount',
      'pay.fee.net':    'TRC20 network fee (charged by OKX)',
      'pay.fee.total':  'Total to have in your OKX account',
      'pay.wallet':     'Deposit Address',
      'pay.copy':       '📋 Copy Address',
      'pay.copied':     'Copied!',
      'pay.okx.notice': '💰 Withdrawing from OKX?',
      'pay.step1.num':  '1',
      'pay.step2.num':  '2',
      'pay.step3.num':  '3',
      'pay.step2.text': 'Wait for the transaction to confirm on the TRON blockchain (usually 1–3 minutes).',
      'pay.txid':       'Transaction Hash (TxID)',
      'pay.txid.ph':    'Paste your TxID here (64 characters)',
      'pay.monitoring': '⦿ Monitoring blockchain for your payment...',
      'pay.submit':     'Verify Transaction →',
      'pay.processing': 'Processing your payment...',
      'pay.ok.title':   'Payment Confirmed',
      'pay.ok.btn':     'Go to Dashboard →',

      /* ── DASHBOARD SIDEBAR ── */
      'db.main':        'Main',
      'db.dashboard':   'Dashboard',
      'db.bots':        'Bot Manager',
      'db.positions':   'Positions',
      'db.analytics':   'Analytics',
      'db.performance': 'Performance',
      'db.history':     'Trade History',
      'db.settings':    'Settings',
      'db.api':         'API Integration',
      'db.botsettings': 'Bot Settings',
      'db.security':    'Security',
      'db.myaccount':   'My Account',
      'db.help':        'Help',
      'db.botguide':    'Bot Guide',
      'db.noplan':      'No active plan',
      'db.upgrade':     'Upgrade',
      'db.logout':      'Log Out',
      'pay.ok.desc': 'Your <strong id="successPlan">Pro</strong> plan is now active.<br />Your bots are ready to trade on OKX.',
      'pay.step3.text': 'Paste your <strong>transaction hash (TxID)</strong> below and click Confirm. Your account will be activated automatically.',
      'pay.step1.text': 'Send exactly <strong id="usdtStepAmount">— USDT</strong> to the address above using the <strong>TRC20 (TRON)</strong> network. <strong style="color:#ef4444;">Use the exact amount shown</strong> — this is how we identify your payment. Any other network will result in permanent loss of funds.',
      'pay.okx.dest': 'On the OKX withdrawal screen, you will be asked to select a destination type. Choose <strong>Exchange</strong> — do <strong>not</strong> select Unhosted Wallet, OKX Users, or OKX Wallet.',
      'db.notif.stoploss': 'Stop-loss triggered alert',
      'db.notif.dailyreport': 'Daily email report',
      'db.notif.telegram': 'Telegram notifications',
      'db.notif.tradeexec': 'Trade execution alerts',
      'db.notif.suspicious': 'Suspicious activity alert',
      'db.notif.apichange': 'API key change alert',
      'db.notif.newdevice': 'New device login alert',
      'db.card.strategy': 'Strategy',
      'db.card.dayloss': 'Daily Loss Limit',
      'db.card.risk': 'Risk Management',
      'db.card.market': 'Market Intelligence',
      'db.card.botstatus': 'Bot Status',
      'db.card.notifpref': 'Notification Preferences',
      'db.card.twofa': 'Two-Factor Authentication',
      'db.card.subscription': 'Subscription',
      'db.card.profile': 'Profile',
      'db.card.secnotif': 'Security Notifications',
      'db.card.changepw': 'Change Password',
      'db.card.apisecurity': 'API Security Guidelines',
      'db.card.apikey': 'OKX API Key',
      'db.card.toppairs': 'Top Pairs',
      'db.card.stratbreakdown': 'Strategy Breakdown',
      'db.card.monthlypnl': 'Monthly P&L',
      'db.card.equityall': 'Equity Curve (All Time)',
      'db.card.strategies': 'Available Strategies',
      'db.card.mybots': 'My Bots',

      /* ── DASHBOARD OVERVIEW ── */
      'db.ov.badge':    'Bot Running',
      'db.ov.upnl':     'Total Unrealized P&L',
      'db.ov.winrate':  'Win Rate',
      'db.ov.today':    "Today's P&L",
      'db.ov.activebots':'Active Bots',
      'db.ov.equity':   'Equity Curve',
      'db.ov.openpos':  'Open Positions',
      'db.ov.viewall':  'View all',
      'db.ov.pair':     'Pair',
      'db.ov.side':     'Side',
      'db.ov.entry':    'Entry',
      'db.ov.mark':     'Mark',
      'db.ov.size':     'Size',
      'db.ov.upnl2':    'Unrealized PnL',
      'db.ov.roe':      'ROE',
      'db.ov.exch':     'Exchange',
      'db.ov.long':     'LONG',
      'db.ov.short':    'SHORT',
      'db.ov.stats':    'Trade Statistics',
      'db.ov.wins':     'Winning Trades',
      'db.ov.losses':   'Losing Trades',
      'db.ov.avgwin':   'Avg. Win',
      'db.ov.avgloss':  'Avg. Loss',
      'db.ov.rr':       'Risk / Reward',
      'db.ov.recent':   'Recent Trades',
      'db.ov.result':   'Result',
      'db.ov.time':     'Time',
      'db.ov.win':      'Win',
      'db.ov.loss':     'Loss',

      /* ── 404 ── */
      '404.label': 'Page Not Found',
      '404.title': "You've gone off the grid.",
      '404.desc':  "The page you're looking for doesn't exist — or it may have moved. Let's get you back on track.",
      '404.home':  'Back to Home',
      '404.dash':  'Go to Dashboard',
      /* ── INDEX: SLOGANS & TRUST ── */
      'slogan.marquee':      'Nothing to Everything.',
      'slogan.trust.tag':    'Asset Protection',
      'slogan.trust.title':  'We trade. You keep.',
      'slogan.trust.desc':   'Your funds never leave your OKX account. AYILON connects via API key with trade-only permissions — withdrawal access is never requested. Your capital stays exactly where you put it.',
      'trust.item1.desc':    'AYILON never touches your funds. Trade permissions only — no withdraw, no transfer.',
      'trust.item2.title':   'Encrypted API storage',
      'trust.item2.desc':    'Your API keys are encrypted at rest and in transit. Never shared with third parties.',
      'trust.item3.title':   '24/7 monitoring',
      'trust.item3.desc':    'Real-time position monitoring with automatic circuit breakers on extreme market conditions.',
      'slogan.art':          'The art of doing nothing.',
      'slogan.reengineered': 'Your money, re-engineered.',

      'legal_disclaimer': 'AYILON is a software tool, not a registered investment advisor or asset manager. Cryptocurrency trading involves substantial risk of loss. Past performance is not indicative of future results. AYILON does not hold your funds. All trading decisions are executed by algorithms you configure — not by AYILON. By using this service you acknowledge that all investment decisions and their consequences are your sole responsibility.',
    },

    /* ════════════════════════════════════════
       KOREAN (한국어)
    ════════════════════════════════════════ */
    ko: {
      'nav.features':   '주요 기능',
      'nav.how':        '작동 방식',
      'nav.pricing':    '요금제',
      'nav.botguide':   '봇 가이드',
      'nav.login':      '로그인',
      'nav.getstarted': '시작하기',
      'nav.dashboard':  '대시보드 →',
      'nav.about':      '소개',
      'nav.faq':        'FAQ',
      'nav.back':       '← 홈으로',
      'nav.backpricing':'← 요금제로 돌아가기',
      'nav.nosignup':   '계정이 없으신가요? 회원가입 →',
      'nav.haveaccount':'이미 계정이 있으신가요? 로그인 →',

      'mobile.features':   '주요 기능',
      'mobile.how':        '작동 방식',
      'mobile.pricing':    '요금제',
      'mobile.botguide':   '봇 가이드',
      'mobile.login':      '로그인',
      'mobile.getstarted': '시작하기 →',

      'hero.badge':  '자동화 암호화폐 거래 — 24시간',
      'hero.title1': '노력의',
      'hero.title2': '종말.',
      'hero.desc':   'OKX API 키를 연결하세요. AYILON의 알고리즘 봇이 24/7 대신 거래합니다 — 다운로드, 설정, 노력 없이.',
      'hero.cta1':   '내 계좌, 자동화하기',
      'hero.cta2':   '작동 방식 보기',
      'hero.tagline': '설정하고, 잊으세요. 그리고 성장하세요.',

      'stats.vol.label':    '총 거래량',
      'stats.bots.label':   '활성 봇',
      'stats.traders.label':'전 세계 트레이더',
      'stats.uptime.label': '서버 가동률',

      'feat.tag':   '핵심 기능',
      'feat.title': '자동 거래에 필요한 모든 것',
      'feat.desc':  '전략 선택부터 실행, 수익 추적까지 — 당신이 자는 동안 AYILON이 모든 것을 처리합니다.',
      'feat.1.title': '자동화 거래',
      'feat.1.desc':  '쉬지 않는 알고리즘 봇. 최적의 순간에 즉각 실행하며 24시간 365일 시장을 모니터링합니다.',
      'feat.2.title': 'OKX 연동',
      'feat.2.desc':  'API 키로 OKX에 즉시 연결. 자금은 거래소에 그대로 — AYILON은 거래만 할 뿐 출금하지 않습니다.',
      'feat.3.title': '다양한 전략',
      'feat.3.desc':  '지지/저항 진입, 분할 매수, 고정비율 포지션 사이징 — 검증된 전략을 클릭 한 번으로 설정 가능.',
      'feat.4.title': '백테스팅',
      'feat.4.desc':  '실제 자본을 투입하기 전에 과거 데이터로 전략 성과를 시뮬레이션하세요.',
      'feat.5.title': '실시간 알림',
      'feat.5.desc':  '체결, 스탑로스, 목표 수익 달성 시 이메일 및 텔레그램으로 즉각 알림.',
      'feat.6.title': '자산 보호',
      'feat.6.desc':  'API 키는 거래 전용 권한으로 저장됩니다. 출금 권한은 절대 요청하지 않으며 자금은 항상 안전합니다.',

      'how.tag':         '작동 방식',
      'how.title':       '4단계로 시작하기',
      'how.step1.title': '계정 생성',
      'how.step1.desc':  '30초 이내에 이메일로 가입하세요.',
      'how.step2.title': 'OKX 연결',
      'how.step2.desc':  'OKX API 키와 시크릿을 붙여넣으세요. 조회 + 거래 권한만 필요합니다.',
      'how.step3.title': '전략 선택',
      'how.step3.desc':  '전략을 선택하고 거래 쌍과 자본 비율을 설정하세요.',
      'how.step4.title': '자동 운영',
      'how.step4.desc':  '시작 버튼을 누르세요. 봇은 AYILON 서버에서 24시간 거래합니다 — 설치나 관리 불필요.',

      'exch.header': '지원 거래소',

      'strat.tag':   '우리의 접근 방식',
      'strat.title': '기관이 쓰는 로직, 이제 당신 것.',
      'strat.desc':  '상승장에서도 하락장에서도 동일한 로직이 작동합니다. AYILON은 기관 수준의 지지/저항 레벨을 식별하여 시장 방향으로 진입합니다.',
      'strat.f1.tag':  '다중 터치 S/R 감지',
      'strat.f1.desc': '레벨은 3회 이상 가격 반응이 확인된 후에만 유효합니다. 알고리즘은 근접성이 아닌 심지 정밀도와 바디 거부를 측정합니다.',
      'strat.f2.tag':  '심지 전용 진입 필터',
      'strat.f2.desc': '5분 봉 심지가 레벨에 닿을 때만 진입 — 바디 돌파 시에는 절대 진입하지 않습니다. 기관 데스크에서 사용하는 기법과 동일합니다.',
      'strat.f3.tag':  '거래량 패턴 확인',
      'strat.f3.desc': '레벨에서의 거래량 급증은 기관 참여를 확인합니다. 거래량이 낮은 터치는 건너뜁니다 — 확신이 높은 셋업만 취합니다.',
      'strat.f4.tag':  '횡보 시장 필터',
      'strat.f4.desc': '불규칙하고 구조가 없는 국면을 감지하여 자동으로 거래를 일시 중지합니다. 구조가 명확할 때만 거래합니다.',
      'strat.risk.title': '잃지 않는 법부터 배운 알고리즘.',
      'strat.risk.desc':  '모든 포지션을 실시간 모니터링합니다. 고정비율 포지션 사이징, 동적 스탑로스 조정, 극단적 시장 상황에서 자동 일시 중지 — 수익보다 자본 보호가 먼저입니다.',
      'strat.chart.entrylogic': '진입 로직',
      'strat.chart.resistance': '저항',
      'strat.chart.support':    '지지',

      'price.tag':         '요금제',
      'price.title':       '단순하고 투명한 요금',
      'price.desc':        '숨겨진 수수료 없음. 거래 수익은 100% 당신 것.',
      'price.toggle.mo':   '월간',
      'price.toggle.yr':   '연간',
      'price.toggle.save': '최대 15% 절약',
      'price.cta':         '시작하기',
      'price.plan.starter': '스타터',
      'price.plan.pro':     '프로',
      'price.plan.elite':   '엘리트',
      'price.period':       '/ 월',
      'price.billed.yr':    '연 {amount} 청구',
      'price.save.badge':   '{pct}% 절약',
      'price.starter.f1':   '활성 봇 1개',
      'price.starter.f2':   'OKX 무기한 선물',
      'price.starter.f3':   '전략 3가지: RSI DCA · MA 지지 · S/R 바운스',
      'price.starter.f4':   '실시간 대시보드',
      'price.starter.f5':   '이메일 알림',
      'price.starter.f6':   '고정비율 리스크 사이징',
      'price.pro.f1':       '활성 봇 5개',
      'price.pro.f2':       'OKX 거래소 연동',
      'price.pro.f3':       '전략 7가지: 스타터 포함 + MA 크로스 · 볼린저밴드 · 브레이크아웃 + 거래량 · MA 리본',
      'price.pro.f4':       '백테스팅 엔진',
      'price.pro.f5':       '이메일 & 텔레그램 알림',
      'price.pro.f6':       '진입 사이징 설정: 균등 / 가중 / 마틴게일',
      'price.pro.f7':       '우선 지원',
      'price.elite.f1':     '무제한 트레이딩 봇',
      'price.elite.f2':     'OKX 무기한 선물',
      'price.elite.f3':     '전략 10가지 전부: MACD 다이버전스 · 펀딩비 역추세 · ATR 추세 + Pro 전부',
      'price.elite.f4':     '전체 애널리틱스 스위트',
      'price.elite.f5':     '이메일, 텔레그램 & SMS 알림',
      'price.elite.f6':     '전담 계정 매니저',
      'price.elite.f7':     '24시간 프리미엄 지원',

      'strat.compare.title': '플랜별 이용 가능한 전략',
      'strat.col.strategy':  '전략',
      'strat.col.dir':       '방향',
      'strat.col.risk':      '리스크',
      'strat.dir.long':      '롱 전용',
      'strat.dir.ls':        '롱 / 숏',
      'strat.dir.lb':        '롱 위주',
      'strat.risk.low':      '낮음',
      'strat.risk.med':      '보통',
      'strat.risk.high':     '높음',
      'strat.1':             'RSI 과매도 DCA 롱',
      'strat.2':             'MA 지지 DCA',
      'strat.3':             'S/R 바운스',
      'strat.4':             'MA 크로스 + RSI',
      'strat.5':             '볼린저밴드 평균회귀',
      'strat.6':             '브레이크아웃 + 거래량',
      'strat.7':             'MA 리본 롱',
      'strat.8':             'MACD 다이버전스',
      'strat.9':             '펀딩비 역추세',
      'strat.10':            'ATR 추세 추종',

      'ref.tag':   '특별 혜택',
      'ref.title': '최고 등급을, 영원히 무료로.',
      'ref.desc':  '추천 링크로 OKX에 가입하고 인증을 완료하면 평생 Elite 플랜을 무료로 이용할 수 있습니다.',
      'ref.s1':    '추천 링크로 OKX 계정 개설',
      'ref.s2':    'OKX 본인인증 완료',
      'ref.s3':    'OKX UID와 함께 AYILON 고객지원 문의',
      'ref.cta':   'OKX 계정 개설하기 →',
      'ref.code':  '추천 코드: AYILON',

      'faq.tag':   '자주 묻는 질문',
      'faq.title': '알아야 할 모든 것',
      'faq.q1': 'AYILON이 무엇인가요?',
      'faq.a1': 'AYILON은 24시간 OKX 계정에서 봇을 실행하는 완전 자동화 암호화폐 거래 플랫폼입니다. API 키를 연결하면 봇이 모든 것을 처리합니다 — 진입, 청산, 포지션 관리까지.',
      'faq.q2': '내 자금은 안전한가요? AYILON이 자금을 보유하나요?',
      'faq.a2': '아닙니다 — AYILON은 절대 자금을 보유하거나 건드리지 않습니다. 모든 거래는 당신이 생성하고 제어하는 API 키를 통해 OKX 계정에서 직접 이루어집니다.',
      'faq.q3': '어떤 거래소를 지원하나요?',
      'faq.a3': '현재 AYILON은 OKX를 지원합니다. Binance, Bybit 등 주요 거래소 지원이 로드맵에 있습니다.',
      'faq.q4': '어떤 거래 전략을 사용하나요?',
      'faq.a4': 'AYILON은 플랜 등급에 따라 10가지 거래 전략을 제공합니다. 스타터에는 RSI 과매도 DCA, MA 지지 DCA, S/R 바운스가 포함됩니다. 프로는 MA 크로스오버 + RSI, 볼린저밴드 평균회귀, 브레이크아웃 + 거래량, MA 리본 롱을 추가합니다. 엘리트는 MACD 다이버전스, 펀딩비 역추세, ATR 추세 추종을 포함한 전략 10가지 전부를 이용할 수 있습니다.',
      'faq.q5': '거래 경험이 필요한가요?',
      'faq.a5': '아닙니다. AYILON은 완전 초보자부터 경험 많은 트레이더까지 모두를 위해 만들어졌습니다. 각 봇에는 안전을 위한 기본 파라미터가 설정되어 있습니다.',
      'faq.q6': '환불이 가능한가요?',
      'faq.a6': '네 — API 키를 아직 연결하지 않았고 구매 후 7일 이내라면 전액 환불이 가능합니다. 7일 이후 또는 API 키 연결 후에는 취소(청구 기간 종료)만 가능합니다.',
      'faq.q7': '구독을 어떻게 취소하나요?',
      'faq.a7': '대시보드 → 내 계정 → 구독에서 "구독 취소"를 클릭하세요. 현재 청구 기간이 끝날 때까지 이용 가능합니다.',
      'faq.q8': '최소 투자금은 얼마인가요?',
      'faq.a8': 'AYILON이 정한 최솟값은 없습니다. OKX 최소 주문 규모를 고려하면 봇당 $500–$1,000 이상 시작을 권장합니다.',
      'faq.q9': '데모 또는 체험 모드가 있나요?',
      'faq.a9': '네 — OKX 데모 트레이딩 계정(무료 가상 $100,000 USDT)을 연결하여 실전 전에 전략을 리스크 없이 테스트할 수 있습니다.',

      'cta.title':    '무에서 유로.',
      'cta.subtitle': '간단히, 더 많은 것을.',
      'cta.btn':      '내 계좌, 자동화하기',

      'footer.product':   '제품',
      'footer.support':   '지원',
      'footer.company':   '회사',
      'footer.tagline':   '아무것도 없이 수익을 창출합니다. 알고리즘 인텔리전스로 구동되는 자동화 암호화폐 거래 플랫폼.',
      'footer.copy':      '© 2026 AYILON. All rights reserved.',
      'footer.risk':      '거래에는 위험이 따릅니다. 과거 성과가 미래 결과를 보장하지 않습니다.',
      'footer.features':  '주요 기능',
      'footer.pricing':   '요금제',
      'footer.how':       '작동 방식',
      'footer.botguide':  '봇 가이드',
      'footer.logic':     '거래 로직',
      'footer.dashboard': '대시보드',
      'footer.about':     '회사 소개',
      'footer.getstarted':'시작하기',
      'footer.aboutco':   '소개',
      'footer.privacy':   '개인정보처리방침',
      'footer.terms':     '이용약관',
      'footer.home':      '홈',
      'footer.upgrade':   '업그레이드',

      'about.hero.tag':   'AYILON 소개',
      'about.hero.title1':'우리가 봇을 만들면,',
      'about.hero.title2':'수익은 당신의 것.',
      'about.hero.desc':  'AYILON은 하나의 신념에서 시작되었습니다: 알고리즘 거래는 헤지펀드와 기관만의 것이 아닙니다. 거래소 계정이 있는 누구나 동일한 도구를 이용할 수 있어야 합니다.',
      'about.mission.label': '우리의 미션',
      'about.mission.title': '자동화 거래의 민주화',
      'about.mission.p1':    '수년간 퀀트 트레이딩 전략은 대형 기관만이 구축하고 유지할 수 있는 독점 인프라 뒤에 잠겨 있었습니다.',
      'about.mission.p2':    '우리는 AYILON으로 그것을 바꾸기 위해 만들었습니다. 기관급 봇 로직과 직관적인 인터페이스, OKX 직접 연동을 결합하여 누구나 포트폴리오를 자동 운영할 수 있도록 합니다.',
      'about.mission.p3':    '코딩 불필요. 서버 불필요. 차트 감시 불필요. 전략을 설정하고 API 키를 연결하면 봇이 알아서 합니다.',
      'about.stat1.label':   '당신이 자는 동안에도 봇은 쉬지 않습니다',
      'about.stat2.label':   '1H + 4H 타임프레임의 지지/저항 감지',
      'about.stat3.label':   'AYILON은 절대 자금을 보유하거나 건드리지 않습니다',
      'about.values.tag':    '우리가 지향하는 것',
      'about.values.title':  '세 가지 원칙 위에 구축됨',
      'about.v1.title': '투명성',
      'about.v1.desc':  '블랙박스 알고리즘 없음. 제공하는 모든 전략은 명확하게 문서화되어 있습니다 — 봇이 언제, 왜, 무엇을 하는지 정확히 알 수 있습니다.',
      'about.v2.title': '보안 최우선',
      'about.v2.desc':  '자금을 보유하지 않습니다. API 키는 암호화하여 저장합니다. 거래 전용 API 권한을 권장하며 강제합니다 — 플랫폼을 통한 출금은 절대 불가능합니다.',
      'about.v3.title': '단순함',
      'about.v3.desc':  '강력한 도구라고 복잡할 필요는 없습니다. 결과에 집중할 수 있도록 인터페이스에 집착합니다. 봇 시작에 3번 이상의 클릭이 필요하다면 우리는 실패한 것입니다.',
      'about.tech.tag':   '기술',
      'about.tech.title': '안정성을 위한 인프라',
      'about.tech1.name': 'Cloudflare Workers',
      'about.tech1.desc': '봇 로직은 Cloudflare의 글로벌 엣지 네트워크에서 실행됩니다 — 서브밀리초 실행, 콜드 스타트 없음, 99.9%+ 가동률. 단일 장애점 없음.',
      'about.tech2.name': 'OKX API v5',
      'about.tech2.desc': 'OKX의 최신 REST 및 WebSocket API와 직접 연동. 실시간 오더북 데이터, 즉각적인 주문 체결, 실시간 포지션 모니터링.',
      'about.tech3.name': 'Cloudflare KV',
      'about.tech3.desc': '사용자 데이터, 봇 설정, 거래 내역은 전 세계에 분산된 Cloudflare KV에 저장됩니다.',
      'about.tech4.name': 'Resend',
      'about.tech4.desc': '인증 코드, 구독 확인, 거래 알림 등 트랜잭션 이메일을 Resend를 통해 안정적으로 전송합니다.',
      'about.cta.title':    '시작할 준비가 되셨나요?',
      'about.cta.subtitle': 'AYILON이 전략을 24시간 운영하는 트레이더들과 함께하세요.',
      'about.cta.btn1':     '계정 만들기 →',
      'about.cta.btn2':     '요금제 보기',
      'about.cta.btn3':     '봇 가이드 읽기',

      'login.title':       '로그인',
      'login.noaccount':   '계정이 없으신가요?',
      'login.signup':      '회원가입',
      'login.email':       '이메일',
      'login.email.ph':    'you@example.com',
      'login.password':    '비밀번호',
      'login.password.ph': '비밀번호 입력',
      'login.show':        '표시',
      'login.forgot':      '비밀번호를 잊으셨나요?',
      'login.submit':      '로그인',
      'login.error':       '이메일 또는 비밀번호가 올바르지 않습니다.',
      'login.2fa.title':   '2단계 인증',
      'login.2fa.sub':     '인증 방법을 선택하세요.',
      'login.2fa.email.title': '이메일 코드',
      'login.2fa.email.desc':  '이메일 주소로 6자리 코드를 전송합니다',
      'login.2fa.app.title':   '인증앱',
      'login.2fa.app.desc':    'Google 또는 Microsoft Authenticator의 코드를 입력하세요',
      'login.otp.title':       '코드 입력',
      'login.otp.verify':      '확인 및 로그인',
      'login.otp.resend':      '코드를 받지 못하셨나요?',
      'login.otp.resendlink':  '재전송',
      'login.forgot.title':    '비밀번호 재설정',
      'login.forgot.sub':      '등록된 이메일 주소를 입력하세요.',
      'login.forgot.send':     '인증 코드 전송 →',
      'login.forgot.notfound': '이메일 주소를 찾을 수 없습니다.',
      'login.newpw.title':     '새 비밀번호',
      'login.newpw.sub':       '새 비밀번호를 입력하세요.',
      'login.newpw.new':       '새 비밀번호',
      'login.newpw.new.ph':    '8자 이상',
      'login.newpw.confirm':   '비밀번호 확인',
      'login.newpw.confirm.ph':'새 비밀번호 재입력',
      'login.newpw.submit':    '비밀번호 재설정',
      'login.newpw.ok':        '비밀번호가 재설정되었습니다. 로그인해 주세요.',

      'signup.title':         '계정 만들기',
      'signup.haveacct':      '이미 계정이 있으신가요?',
      'signup.loginlink':     '로그인',
      'signup.name':          '이름',
      'signup.name.ph':       '홍길동',
      'signup.username':      '사용자명',
      'signup.username.ph':   '예: ayilon_trader',
      'signup.username.hint': '영문, 숫자, _ 만 사용 가능 (2–20자)',
      'signup.email':         '이메일 (로그인 ID로 사용)',
      'signup.email.ph':      'you@example.com',
      'signup.sendcode':      '코드 전송',
      'signup.codeph':        '6자리 코드 입력',
      'signup.codehint':      '이메일로 전송된 6자리 코드를 입력하세요',
      'signup.verify':        '인증',
      'signup.expired':       '만료됨',
      'signup.pw':            '비밀번호',
      'signup.pw.ph':         '8자 이상, 영문 + 숫자 + 특수문자',
      'signup.show':          '표시',
      'signup.pw.hint':       '영문, 숫자, 특수문자 포함 (8자 이상)',
      'signup.pw.weak':       '비밀번호가 너무 약합니다',
      'signup.pw.mod':        '보통 수준의 비밀번호',
      'signup.pw.strong':     '✓ 강력한 비밀번호',
      'signup.pw2':           '비밀번호 확인',
      'signup.pw2.ph':        '비밀번호 재입력',
      'signup.pw.match':      '✓ 비밀번호 일치',
      'signup.pw.nomatch':    '비밀번호가 일치하지 않습니다',
      'signup.terms.all':     '전체 동의',
      'signup.terms.tos':     '이용약관',
      'signup.terms.req':     '(필수)',
      'signup.terms.priv':    '개인정보처리방침',
      'signup.terms.mkt':     '마케팅 정보 수신 동의 (선택)',
      'signup.submit':        '계정 만들기',
      'signup.err.email':     '이메일 인증을 먼저 완료해 주세요.',
      'signup.err.user':      '사용 가능한 유효한 사용자명을 선택해 주세요.',
      'signup.err.pw':        '비밀번호가 일치하지 않습니다.',
      'signup.err.terms':     '필수 약관에 동의해 주세요.',
      'signup.err.taken':     '이미 등록된 이메일입니다. 로그인해 주세요.',
      'signup.ok':            '계정이 생성되었습니다!',

      'pay.summary':    '주문 요약',
      'pay.monthly':    '월간',
      'pay.annual':     '연간',
      'pay.total':      '오늘 결제 금액',
      'pay.title':      '결제 정보',
      'pay.method':     'USDT (TRC20)',
      'pay.method.desc':'TRON 네트워크의 테더 · 수수료 0%',
      'pay.email':      '이메일 주소',
      'pay.email.ph':   'you@example.com',
      'pay.email.hint': '결제 확인 이메일이 이 주소로 전송됩니다.',
      'pay.amount':     '전송할 금액 (정확히)',
      'pay.generating': '고유 결제 금액을 생성 중...',
      'pay.unique':     '고유 결제 ID — 이 정확한 금액을 전송하세요',
      'pay.fee.sub':    '구독 금액',
      'pay.fee.net':    'TRC20 네트워크 수수료 (OKX 청구)',
      'pay.fee.total':  'OKX 계정에 필요한 총 금액',
      'pay.wallet':     '입금 주소',
      'pay.copy':       '📋 주소 복사',
      'pay.copied':     '복사됨!',
      'pay.okx.notice': '💰 OKX에서 출금하시나요?',
      'pay.step1.num':  '1',
      'pay.step2.num':  '2',
      'pay.step3.num':  '3',
      'pay.step2.text': 'TRON 블록체인에서 거래 확인을 기다리세요 (보통 1–3분).',
      'pay.txid':       '트랜잭션 해시 (TxID)',
      'pay.txid.ph':    'TxID를 여기에 붙여넣으세요 (64자)',
      'pay.monitoring': '⦿ 블록체인에서 결제를 모니터링 중...',
      'pay.submit':     '트랜잭션 확인 →',
      'pay.processing': '결제를 처리 중...',
      'pay.ok.title':   '결제 확인됨',
      'pay.ok.btn':     '대시보드로 이동 →',

      'db.main':        '메인',
      'db.dashboard':   '대시보드',
      'db.bots':        '봇 관리',
      'db.positions':   '포지션',
      'db.analytics':   '분석',
      'db.performance': '성과',
      'db.history':     '거래 내역',
      'db.settings':    '설정',
      'db.api':         'API 연동',
      'db.botsettings': '봇 설정',
      'db.security':    '보안',
      'db.myaccount':   '내 계정',
      'db.help':        '도움말',
      'db.botguide':    '봇 가이드',
      'db.noplan':      '활성 플랜 없음',
      'db.upgrade':     '업그레이드',
      'db.logout':      '로그아웃',
      'db.card.mybots': '내 봇',
      'db.card.strategies': '사용 가능한 전략',
      'db.card.equityall': '자산 곡선 (전체 기간)',
      'db.card.monthlypnl': '월별 손익',
      'db.card.stratbreakdown': '전략별 분석',
      'db.card.toppairs': '상위 페어',
      'db.card.apikey': 'OKX API 키',
      'db.card.apisecurity': 'API 보안 가이드라인',
      'db.card.changepw': '비밀번호 변경',
      'db.card.secnotif': '보안 알림',
      'db.card.profile': '프로필',
      'db.card.subscription': '구독',
      'db.card.twofa': '2단계 인증',
      'db.card.notifpref': '알림 설정',
      'db.card.botstatus': '봇 상태',
      'db.card.market': '시장 인텔리전스',
      'db.card.risk': '리스크 관리',
      'db.card.dayloss': '일일 손실 한도',
      'db.card.strategy': '전략',
      'db.notif.newdevice': '새 기기 로그인 알림',
      'db.notif.apichange': 'API 키 변경 알림',
      'db.notif.suspicious': '의심 활동 알림',
      'db.notif.tradeexec': '거래 실행 알림',
      'db.notif.telegram': '텔레그램 알림',
      'db.notif.dailyreport': '일일 이메일 보고서',
      'db.notif.stoploss': '손절 트리거 알림',
      'pay.okx.dest': 'OKX 출금 화면에서 목적지 유형을 선택하라는 메시지가 표시됩니다. <strong>거래소</strong>를 선택하세요 — 미호스팅 지갑, OKX 사용자, OKX 지갑은 <strong>선택하지 마세요</strong>.',
      'pay.step1.text': '위 주소로 <strong>TRC20 (TRON)</strong> 네트워크를 사용하여 정확히 <strong id="usdtStepAmount">— USDT</strong>를 전송하세요. <strong style="color:#ef4444;">표시된 금액을 정확히 입력하세요</strong> — 이 금액으로 결제를 식별합니다. 다른 네트워크를 사용하면 자금이 영구적으로 손실됩니다.',
      'pay.step3.text': '아래에 <strong>거래 해시(TxID)</strong>를 붙여넣고 확인을 클릭하세요. 계정이 자동으로 활성화됩니다.',
      'pay.ok.desc': '<strong id="successPlan">Pro</strong> 플랜이 활성화되었습니다.<br />봇이 OKX에서 거래할 준비가 완료되었습니다.',

      'db.ov.badge':    '봇 실행 중',
      'db.ov.upnl':     '총 미실현 손익',
      'db.ov.winrate':  '승률',
      'db.ov.today':    '오늘의 손익',
      'db.ov.activebots':'활성 봇',
      'db.ov.equity':   '자산 곡선',
      'db.ov.openpos':  '열린 포지션',
      'db.ov.viewall':  '전체 보기',
      'db.ov.pair':     '거래 쌍',
      'db.ov.side':     '방향',
      'db.ov.entry':    '진입가',
      'db.ov.mark':     '현재가',
      'db.ov.size':     '수량',
      'db.ov.upnl2':    '미실현 손익',
      'db.ov.roe':      'ROE',
      'db.ov.exch':     '거래소',
      'db.ov.long':     '롱',
      'db.ov.short':    '숏',
      'db.ov.stats':    '거래 통계',
      'db.ov.wins':     '수익 거래',
      'db.ov.losses':   '손실 거래',
      'db.ov.avgwin':   '평균 수익',
      'db.ov.avgloss':  '평균 손실',
      'db.ov.rr':       '리스크/리워드',
      'db.ov.recent':   '최근 거래',
      'db.ov.result':   '결과',
      'db.ov.time':     '시간',
      'db.ov.win':      '수익',
      'db.ov.loss':     '손실',

      '404.label': '페이지를 찾을 수 없음',
      '404.title': '경로를 벗어났습니다.',
      '404.desc':  '찾으시는 페이지가 존재하지 않거나 이동했을 수 있습니다. 다시 안내해 드리겠습니다.',
      '404.home':  '홈으로',
      '404.dash':  '대시보드로',
      /* ── INDEX: SLOGANS & TRUST ── */
      'slogan.marquee':      '무에서 유로.',
      'slogan.trust.tag':    '자산 보호',
      'slogan.trust.title':  '거래는 우리가. 보관은 당신이.',
      'slogan.trust.desc':   '당신의 자금은 OKX 계정을 절대 떠나지 않습니다. AYILON은 거래 전용 권한의 API 키로 연결되며 — 출금 권한은 절대 요청하지 않습니다. 자본은 항상 당신이 넣어둔 곳에 있습니다.',
      'trust.item1.desc':    'AYILON은 자금을 절대 건드리지 않습니다. 거래 권한만 — 출금도, 이체도 없습니다.',
      'trust.item2.title':   '암호화된 API 저장',
      'trust.item2.desc':    'API 키는 저장 및 전송 중 암호화됩니다. 제3자와 절대 공유되지 않습니다.',
      'trust.item3.title':   '24/7 모니터링',
      'trust.item3.desc':    '실시간 포지션 모니터링과 극단적 시장 상황에서 자동 서킷 브레이커.',
      'slogan.art':          '아무것도 하지 않는 미학.',
      'slogan.reengineered': '당신의 돈, 재설계되었습니다.',

      'legal_disclaimer': 'AYILON은 소프트웨어 도구이며, 자본시장법상 투자자문업·투자일임업 등록 사업자가 아닙니다. 암호화폐 거래는 원금 손실의 위험이 수반되며, 과거 성과는 미래 결과를 보장하지 않습니다. AYILON은 사용자의 자금을 보관하거나 투자 판단을 대신하지 않습니다. 투자에 관한 최종 결정 및 손익에 대한 책임은 이용자 본인에게 있습니다.',
    },

    /* ════════════════════════════════════════
       JAPANESE (日本語)
    ════════════════════════════════════════ */

    /* ════════════════════════════════════════
       CHINESE SIMPLIFIED (简体中文)
    ════════════════════════════════════════ */
    /* ════════════════════════════════════════
       VIETNAMESE (Tiếng Việt)
    ════════════════════════════════════════ */

    /* ════════════════════════════════════════
       RUSSIAN (Русский)
    ════════════════════════════════════════ */
    /* ════════════════════════════════════════
       TURKISH (Türkçe)
    ════════════════════════════════════════ */

    /* ════════════════════════════════════════
       SPANISH (Español)
    ════════════════════════════════════════ */

    /* ════════════════════════════════════════
       PORTUGUESE (Português)
    ════════════════════════════════════════ */

    /* ════════════════════════════════════════
       INDONESIAN (Bahasa Indonesia)
    ════════════════════════════════════════ */

  };

  /* ────────────────────────────────────────
     Build accordion dropdown HTML
  ──────────────────────────────────────── */
  function buildDropdown(currentLang) {
    var chev = '<svg class="lang-dd-chev" width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,3 4.5,6.5 7.5,3"/></svg>';
    var items = LANGS.map(function (l) {
      return '<button class="lang-dd-item' + (l === currentLang ? ' active' : '') + '" onclick="setLanguage(\'' + l + '\')">' + l.toUpperCase() + '</button>';
    }).join('');
    return '<div class="lang-dd">' +
      '<button class="lang-dd-btn" onclick="window.__toggleLangDd(this,event)">' +
        '<span class="lang-dd-label">' + currentLang.toUpperCase() + '</span>' + chev +
      '</button>' +
      '<div class="lang-dd-menu">' + items + '</div>' +
    '</div>';
  }

  /* ────────────────────────────────────────
     Apply translations to the current page
  ──────────────────────────────────────── */
  function apply(lang) {
    lang = LANGS.indexOf(lang) >= 0 ? lang : 'en';
    var dict = T[lang] || T['en'];

    /* text content */
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) el.textContent = dict[key];
    });

    /* innerHTML (for elements with nested tags) */
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (dict[key] !== undefined) el.innerHTML = dict[key];
    });

    /* placeholder attributes */
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-ph');
      if (dict[key] !== undefined) el.placeholder = dict[key];
    });

    /* update dropdown: label + active item */
    document.querySelectorAll('.lang-dd').forEach(function (dd) {
      var label = dd.querySelector('.lang-dd-label');
      if (label) label.textContent = lang.toUpperCase();
      dd.querySelectorAll('.lang-dd-item').forEach(function (item) {
        item.classList.toggle('active', item.textContent.trim().toLowerCase() === lang);
      });
    });

    /* html lang attribute */
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;

    localStorage.setItem(LANG_KEY, lang);

    /* re-render dynamically-generated pricing period note if on annual view */
    if (typeof window.setPeriod === 'function' && window.__currentPeriod) {
      window.setPeriod(window.__currentPeriod);
    }
  }

  /* ── Toggle handler (attached to window so inline onclick works) ── */
  window.__toggleLangDd = function (btn, e) {
    if (e) e.stopPropagation();
    var dd = btn.closest('.lang-dd');
    if (!dd) return;
    var isOpen = dd.classList.contains('open');
    /* close all first */
    document.querySelectorAll('.lang-dd.open').forEach(function (d) { d.classList.remove('open'); });
  };

  /* Auto-apply on DOM ready */
  function init() {
    var lang = localStorage.getItem(LANG_KEY) || 'en';
    /* Replace .lang-switcher contents with accordion dropdown */
    document.querySelectorAll('.lang-switcher').forEach(function (sw) {
      sw.innerHTML = buildDropdown(lang);
    });
    apply(lang);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
