const WALLET = 'TBvtft3H8B4Rv4cEHTotyak3Ds2mLur99E';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return corsResponse('', 204);
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'POST') {
      if (path === '/send-verification')  return handleVerification(request, env);
      if (path === '/send-confirmation')  return handleConfirmation(request, env);
      if (path === '/check-email')        return handleCheckEmail(request, env);
      if (path === '/check-username')     return handleCheckUsername(request, env);
      if (path === '/register-user')      return handleRegisterUser(request, env);
      if (path === '/create-payment')     return handleCreatePayment(request, env);
      if (path === '/verify-payment')     return handleVerifyPayment(request, env);
      if (path === '/check-payment')      return handleCheckPayment(request, env);
      if (path === '/save-bot-settings')  return handleSaveBotSettings(request, env);
      if (path === '/bot-status')         return handleBotStatus(request, env);
      if (path === '/bot-control')        return handleBotControl(request, env);
      if (path === '/get-positions')      return handleGetPositions(request, env);
    }

    return corsResponse(JSON.stringify({ error: 'Not found' }), 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(cronCheckPayments(env));
    ctx.waitUntil(runBot(env));
  }
};

// ── CHECK EMAIL ──────────────────────────────────────────────
async function handleCheckEmail(request, env) {
  const { email } = await request.json();
  if (!env.USERS_KV) return json({ available: true });
  const existing = await env.USERS_KV.get('user:' + email.toLowerCase());
  return json({ available: !existing });
}

// ── CHECK USERNAME ───────────────────────────────────────────
async function handleCheckUsername(request, env) {
  const { username } = await request.json();
  if (!env.USERS_KV) return json({ available: true });
  const existing = await env.USERS_KV.get('username:' + username.toLowerCase());
  return json({ available: !existing });
}

// ── REGISTER USER ────────────────────────────────────────────
async function handleRegisterUser(request, env) {
  const { email, username, name, password } = await request.json();
  if (!email || !username) return json({ success: false, error: 'missing_fields' }, 400);

  if (env.USERS_KV) {
    const emailKey    = 'user:'     + email.toLowerCase();
    const usernameKey = 'username:' + username.toLowerCase();
    const emailExists    = await env.USERS_KV.get(emailKey);
    if (emailExists)    return json({ success: false, error: 'email_taken' });
    const usernameExists = await env.USERS_KV.get(usernameKey);
    if (usernameExists) return json({ success: false, error: 'username_taken' });
    await env.USERS_KV.put(emailKey,    JSON.stringify({ email, username, name, password, createdAt: Date.now() }));
    await env.USERS_KV.put(usernameKey, email.toLowerCase());
  }
  return json({ success: true });
}

// ── CREATE PAYMENT (assign unique amount) ────────────────────
async function handleCreatePayment(request, env) {
  const { email, plan, billing, baseAmount } = await request.json();
  if (!email || !plan || !baseAmount) return json({ error: 'Missing fields' }, 400);

  let n = 1;
  if (env.USERS_KV) {
    const stored = await env.USERS_KV.get('payment:counter');
    n = stored ? (parseInt(stored) % 9999) + 1 : 1;
    await env.USERS_KV.put('payment:counter', String(n));
  }

  const uniqueAmount = (parseFloat(baseAmount) + n / 10000).toFixed(4);
  const key = 'pending:' + uniqueAmount;

  if (env.USERS_KV) {
    await env.USERS_KV.put(key, JSON.stringify({
      email: email.toLowerCase(), plan, billing,
      baseAmount: parseFloat(baseAmount),
      uniqueAmount: parseFloat(uniqueAmount),
      createdAt: Date.now(), confirmed: false, txHash: null
    }), { expirationTtl: 86400 });
  }

  return json({ uniqueAmount, wallet: WALLET });
}

// ── CHECK PAYMENT STATUS (polling) ───────────────────────────
async function handleCheckPayment(request, env) {
  const { uniqueAmount } = await request.json();
  if (!uniqueAmount) return json({ confirmed: false });
  if (!env.USERS_KV) return json({ confirmed: false });
  const pending = await env.USERS_KV.get('pending:' + parseFloat(uniqueAmount).toFixed(4), { type: 'json' });
  return json({ confirmed: pending ? pending.confirmed : false, txHash: pending?.txHash || null });
}

// ── VERIFY PAYMENT (user submits txid) ───────────────────────
async function handleVerifyPayment(request, env) {
  const { txid, uniqueAmount } = await request.json();
  if (!txid || !uniqueAmount) return json({ verified: false, error: 'Missing fields' });

  try {
    // Fetch recent TRC20 transfers to our wallet
    const res = await fetch(
      `https://api.trongrid.io/v1/accounts/${WALLET}/transactions/trc20?limit=50&only_to=true&contract_address=${USDT_CONTRACT}&order_by=block_timestamp,desc`,
      { headers: { 'Accept': 'application/json', 'User-Agent': 'AYILON/1.0' } }
    );
    if (!res.ok) return json({ verified: false, error: 'Blockchain query failed' });

    const data = await res.json();
    const txs = data.data || [];

    // Find the transaction matching this txid
    const tx = txs.find(t => t.transaction_id === txid);
    if (!tx) return json({ verified: false, error: 'Transaction not found. It may not be confirmed yet — please wait 1-3 minutes and try again.' });

    const received = parseInt(tx.value) / 1_000_000;
    const expected = parseFloat(uniqueAmount);

    if (Math.abs(received - expected) > 0.00005) {
      return json({ verified: false, error: `Amount mismatch. Expected ${expected} USDT, received ${received} USDT.` });
    }

    await activateSubscription(env, uniqueAmount, txid);
    return json({ verified: true });

  } catch(e) {
    return json({ verified: false, error: 'Verification error. Please try again.' });
  }
}

// ── CRON: auto-detect incoming payments ──────────────────────
async function cronCheckPayments(env) {
  if (!env.USERS_KV) return;
  try {
    const res = await fetch(
      `https://api.trongrid.io/v1/accounts/${WALLET}/transactions/trc20?limit=20&only_to=true&contract_address=${USDT_CONTRACT}&order_by=block_timestamp,desc`,
      { headers: { 'Accept': 'application/json', 'User-Agent': 'AYILON/1.0' } }
    );
    if (!res.ok) return;
    const data = await res.json();

    for (const tx of (data.data || [])) {
      if (tx.to !== WALLET) continue;
      const amount = (parseInt(tx.value) / 1_000_000).toFixed(4);
      const pending = await env.USERS_KV.get('pending:' + amount, { type: 'json' });
      if (pending && !pending.confirmed) {
        await activateSubscription(env, amount, tx.transaction_id);
      }
    }
  } catch(e) { /* silent */ }
}

// ── ACTIVATE SUBSCRIPTION ────────────────────────────────────
async function activateSubscription(env, uniqueAmount, txHash) {
  if (!env.USERS_KV) return;
  const key = 'pending:' + parseFloat(uniqueAmount).toFixed(4);
  const pending = await env.USERS_KV.get(key, { type: 'json' });
  if (!pending || pending.confirmed) return;

  const emailKey = 'user:' + pending.email;
  let user = await env.USERS_KV.get(emailKey, { type: 'json' }) || {};
  user.subscription = {
    plan: pending.plan, billing: pending.billing,
    amount: pending.baseAmount, uniqueAmount: pending.uniqueAmount,
    activatedAt: new Date().toISOString(), txHash
  };
  await env.USERS_KV.put(emailKey, JSON.stringify(user));

  pending.confirmed = true;
  pending.txHash = txHash;
  await env.USERS_KV.put(key, JSON.stringify(pending), { expirationTtl: 86400 });

  // Send confirmation email
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'AYILON <onboarding@resend.dev>',
        to: [pending.email],
        subject: `Your AYILON ${pending.plan} plan is now active`,
        html: `<div style="background:#000;color:#fff;font-family:Inter,sans-serif;padding:40px;max-width:480px;margin:0 auto;border-radius:12px;"><h1 style="font-size:24px;margin-bottom:8px;">AYILON</h1><p style="color:#a3a3a3;margin-bottom:32px;">Payment Confirmed</p><p style="color:#22c55e;font-size:15px;font-weight:600;margin-bottom:16px;">✓ Your ${pending.plan} plan is now active.</p><p style="color:#525252;font-size:12px;">TxHash: ${txHash}</p><a href="https://oracletrading-01o.pages.dev/dashboard.html" style="display:inline-block;background:#fff;color:#000;padding:12px 28px;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;margin-top:20px;">Go to Dashboard →</a></div>`
      })
    });
  } catch(e) { /* email failure is non-fatal */ }
}

// ── SEND VERIFICATION EMAIL ──────────────────────────────────
async function handleVerification(request, env) {
  const { email } = await request.json();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email' }, 400);
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'AYILON <onboarding@resend.dev>',
      to: [email],
      subject: 'Your AYILON verification code',
      html: `<div style="background:#000;color:#fff;font-family:Inter,sans-serif;padding:40px;max-width:480px;margin:0 auto;border-radius:12px;"><h1 style="font-size:24px;margin-bottom:8px;">AYILON</h1><p style="color:#a3a3a3;margin-bottom:32px;">Email Verification</p><p style="color:#a3a3a3;margin-bottom:16px;">Your verification code is:</p><div style="background:#111;border:1px solid #333;border-radius:10px;padding:24px;text-align:center;font-size:42px;font-weight:700;letter-spacing:12px;margin-bottom:24px;">${code}</div><p style="color:#525252;font-size:13px;">This code expires in 5 minutes. Do not share it with anyone.</p></div>`
    })
  });
  if (!res.ok) return json({ error: 'Failed to send email' }, 500);
  return json({ success: true, code });
}

// ── SEND CONFIRMATION EMAIL ──────────────────────────────────
async function handleConfirmation(request, env) {
  const { email, plan, billing, amount } = await request.json();
  if (!email || !plan) return json({ error: 'Missing fields' }, 400);
  const billingLabel = billing === 'annual' ? 'Annual' : 'Monthly';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'AYILON <onboarding@resend.dev>',
      to: [email],
      subject: `Your AYILON ${plan} plan is now active`,
      html: `<div style="background:#000;color:#fff;font-family:Inter,sans-serif;padding:40px;max-width:480px;margin:0 auto;border-radius:12px;"><h1 style="font-size:24px;margin-bottom:8px;">AYILON</h1><p style="color:#a3a3a3;margin-bottom:32px;">Payment Confirmed</p><div style="background:#111;border:1px solid #333;border-radius:10px;padding:24px;margin-bottom:24px;"><p style="color:#a3a3a3;font-size:13px;margin-bottom:16px;">ORDER SUMMARY</p><table style="width:100%;font-size:14px;"><tr><td style="color:#a3a3a3;padding:6px 0;">Plan</td><td style="text-align:right;font-weight:600;">${plan}</td></tr><tr><td style="color:#a3a3a3;padding:6px 0;">Billing</td><td style="text-align:right;">${billingLabel}</td></tr><tr><td style="color:#a3a3a3;padding:6px 0;border-top:1px solid #333;">Amount paid</td><td style="text-align:right;font-weight:700;border-top:1px solid #333;">$${amount}</td></tr></table></div><p style="color:#22c55e;font-size:15px;font-weight:600;margin-bottom:16px;">✓ Your bots are ready to trade on OKX.</p><a href="https://oracletrading-01o.pages.dev/dashboard.html" style="display:inline-block;background:#fff;color:#000;padding:12px 28px;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;">Go to Dashboard →</a></div>`
    })
  });
  if (!res.ok) return json({ error: 'Failed to send email' }, 500);
  return json({ success: true });
}

// ── HELPERS ──────────────────────────────────────────────────
function json(body, status = 200) {
  return corsResponse(JSON.stringify(body), status);
}

function corsResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

// ════════════════════════════════════════════════════════════
// BOT ENDPOINTS
// ════════════════════════════════════════════════════════════

async function handleSaveBotSettings(request, env) {
  const body = await request.json();
  if (!env.USERS_KV) return json({ ok: false });
  await env.USERS_KV.put('bot:config', JSON.stringify({ ...body, updatedAt: Date.now() }));
  return json({ ok: true });
}

async function handleBotStatus(request, env) {
  if (!env.USERS_KV) return json({ running: false, logs: [] });
  const config   = await env.USERS_KV.get('bot:config', { type: 'json' }) || {};
  const logs     = await env.USERS_KV.get('bot:logs',   { type: 'json' }) || [];
  const alert    = await env.USERS_KV.get('bot:daily_loss_triggered', { type: 'json' });
  const pos      = await env.USERS_KV.get('bot:position_state', { type: 'json' }) || {};
  const lastScan = await env.USERS_KV.get('bot:last_scan');
  return json({ running: config.running === true, logs, alert, positions: pos, lastScan });
}

async function handleBotControl(request, env) {
  const { action } = await request.json();
  if (!env.USERS_KV) return json({ ok: false });
  const config = await env.USERS_KV.get('bot:config', { type: 'json' }) || {};
  if (action === 'start') config.running = true;
  if (action === 'stop')  config.running = false;
  if (action === 'dismiss') {
    await env.USERS_KV.delete('bot:daily_loss_triggered');
    return json({ ok: true });
  }
  if (action === 'resume') {
    config.running = true;
    await env.USERS_KV.delete('bot:daily_loss_triggered');
    const today = new Date().toDateString();
    await env.USERS_KV.delete('bot:daily_loss:' + today);
  }
  await env.USERS_KV.put('bot:config', JSON.stringify(config));
  return json({ ok: true, running: config.running });
}

async function handleGetPositions(request, env) {
  const { apiKey, apiSecret, apiPassphrase, instId } = await request.json();
  if (!apiKey || !apiSecret || !apiPassphrase) return json({ positions: [] });
  try {
    const path = instId ? `/api/v5/account/positions?instId=${instId}` : '/api/v5/account/positions';
    const data = await okxGet(apiKey, apiSecret, apiPassphrase, path);
    return json({ positions: data?.data || [] });
  } catch(e) { return json({ positions: [], error: e.message }); }
}

// ════════════════════════════════════════════════════════════
// BOT TRADING LOGIC
// ════════════════════════════════════════════════════════════

const OKX_BASE = 'https://www.okx.com';

async function runBot(env) {
  if (!env.USERS_KV) return;
  try {
    const cfg = await env.USERS_KV.get('bot:config', { type: 'json' });
    if (!cfg || cfg.running !== true) return;

    const { apiKey, apiSecret, apiPassphrase, tradingPair = 'BTC-USDT-SWAP',
      strategy = 'daytrading', demoMode = false,
      numEntries = 3, entrySizing = 'equal',
      posSize = 40, leverage = 20,
      lossLimitEnabled = true, lossLimit = 5,
      notifyEmail = true, notifyTelegram = false,
      telegramToken, telegramChatId, userEmail } = cfg;

    if (!apiKey || !apiSecret || !apiPassphrase) return;

    // ── Update last scan time ─────────────────────────────────
    await env.USERS_KV.put('bot:last_scan', new Date().toISOString());

    // ── Daily loss check ──────────────────────────────────────
    if (lossLimitEnabled) {
      const today = new Date().toDateString();
      const dl = await env.USERS_KV.get('bot:daily_loss:' + today, { type: 'json' }) || { pct: 0 };
      if (dl.pct >= lossLimit / 100) {
        cfg.running = false;
        await env.USERS_KV.put('bot:config', JSON.stringify(cfg));
        await env.USERS_KV.put('bot:daily_loss_triggered', JSON.stringify({
          date: today, loss: (dl.pct * 100).toFixed(2) + '%', triggeredAt: Date.now()
        }));
        await botNotify(env, { notifyEmail, notifyTelegram, telegramToken, telegramChatId, userEmail },
          `Daily loss limit reached: ${(dl.pct * 100).toFixed(2)}%. Bot paused.`);
        return;
      }
    }

    // ── Account equity ────────────────────────────────────────
    const balRes = await okxGet(apiKey, apiSecret, apiPassphrase, '/api/v5/account/balance?ccy=USDT', demoMode);
    const details = balRes?.data?.[0]?.details || [];
    const equity = parseFloat(details.find(d => d.ccy === 'USDT')?.eq || '0');
    if (equity <= 0) return;

    // ── Open positions ────────────────────────────────────────
    const posRes = await okxGet(apiKey, apiSecret, apiPassphrase, `/api/v5/account/positions?instId=${tradingPair}`, demoMode);
    const openPos = (posRes?.data || []).filter(p => parseFloat(p.pos) !== 0);

    // ── Stop loss check ───────────────────────────────────────
    await checkSL(env, apiKey, apiSecret, apiPassphrase, tradingPair, openPos, equity, lossLimitEnabled, lossLimit / 100, demoMode);

    // ── S/R candles: 1H + 4H + 매물대 combined ───────────────
    const [candles1H, candles4H] = await Promise.all([
      getCandles(tradingPair, '1H', 100),
      getCandles(tradingPair, '4H', 100)
    ]);
    if (candles1H.length < 20 && candles4H.length < 20) return;
    const currentPrice = parseFloat((await (await fetch(`${OKX_BASE}/api/v5/market/ticker?instId=${tradingPair}`)).json())?.data?.[0]?.last || '0');
    const srLevels  = mergeLevels(
      candles1H.length >= 20 ? detectSR(candles1H) : { supports: [], resistances: [] },
      candles4H.length >= 20 ? detectSR(candles4H) : { supports: [], resistances: [] }
    );
    const volLevels = detectVolumeZones(candles4H.length >= 20 ? candles4H : candles1H, currentPrice);
    const levels    = mergeLevels(srLevels, volLevels);
    if (!levels.supports.length && !levels.resistances.length) return;

    // ── 5m entry candles ──────────────────────────────────────
    const c5 = await getCandles(tradingPair, '5m', 20);
    if (c5.length < 4) return;
    const signal = detectSignal(c5, levels);
    if (!signal) return;

    // ── Position state ────────────────────────────────────────
    const ps = await env.USERS_KV.get('bot:position_state', { type: 'json' }) || {};
    const state = ps[tradingPair] || { entries: [], stopLoss: null, direction: null, takeProfit: null };

    // If existing position in OPPOSITE direction → skip (no flip)
    if (state.direction && state.direction !== signal.type) return;

    // Max entries reached → skip
    const entryNum = (state.entries || []).length + 1;
    if (entryNum > parseInt(numEntries)) return;

    // Additional entries must stay within 2% of the first entry price
    // Prevents chasing price down/up with leverage (liquidation risk)
    if (entryNum > 1 && state.entries.length > 0) {
      const firstEntryPrice = state.entries[0].price;
      const drift = Math.abs(currentPrice - firstEntryPrice) / firstEntryPrice;
      if (drift > 0.02) return; // price moved too far from original entry
    }

    // ── TP = next S/R level in trade direction ────────────────
    const tp = signal.type === 'long'
      ? levels.resistances[0]?.price   // nearest resistance above
      : levels.supports[0]?.price;     // nearest support below
    const useTP = tp && (signal.type === 'long' ? tp > currentPrice * 1.005 : tp < currentPrice * 0.995);

    // ── Kelly criterion warning ───────────────────────────────
    const totalPct = (posSize / 100) * entryNum / parseInt(numEntries);
    const kellyWarn = totalPct > 0.4 || parseInt(leverage) > 20;
    if (kellyWarn) await botLog(env, `⚠️ Kelly warning: pos=${(totalPct*100).toFixed(0)}% lev=${leverage}x`);

    // ── Calculate size ────────────────────────────────────────
    const totalVal = equity * (posSize / 100);
    let entryVal;
    if (entrySizing === 'martingale' && entryNum > 1) {
      entryVal = (totalVal / parseInt(numEntries)) * Math.pow(2, entryNum - 1);
    } else {
      entryVal = totalVal / parseInt(numEntries);
    }
    const sz = (entryVal / currentPrice).toFixed(4);

    // ── Place order ───────────────────────────────────────────
    const orderRes = await okxPost(apiKey, apiSecret, apiPassphrase, '/api/v5/trade/order', {
      instId: tradingPair, tdMode: 'cross',
      side: signal.type === 'long' ? 'buy' : 'sell',
      posSide: signal.type === 'long' ? 'long' : 'short',
      ordType: 'market', sz, lever: String(leverage)
    }, demoMode);

    if (orderRes?.data?.[0]?.ordId) {
      state.entries.push({ price: currentPrice, sz, time: Date.now(), entry: entryNum });
      state.direction  = signal.type;
      // Keep first entry SL; update TP to latest level
      if (!state.stopLoss) state.stopLoss = signal.stopLoss;
      if (useTP) state.takeProfit = tp;
      ps[tradingPair] = state;
      await env.USERS_KV.put('bot:position_state', JSON.stringify(ps));
      const tpStr = useTP ? ` | TP: ${tp.toFixed(2)}` : '';
      await botLog(env, `${signal.type.toUpperCase()} #${entryNum}/${numEntries} @ ${currentPrice} | SL: ${state.stopLoss.toFixed(2)}${tpStr} | sz: ${sz}`);
      await botNotify(env, { notifyEmail, notifyTelegram, telegramToken, telegramChatId, userEmail },
        `${signal.type.toUpperCase()} entry #${entryNum} placed @ ${currentPrice} USDT${tpStr}`);
    }

  } catch(e) {
    await botLog(env, 'Bot error: ' + e.message);
  }
}

// ── STOP LOSS ─────────────────────────────────────────────────
async function checkSL(env, apiKey, secret, pass, pair, openPos, equity, lossLimitEnabled, lossLimitPct, demo = false) {
  if (!openPos.length) return;
  const ps = await env.USERS_KV.get('bot:position_state', { type: 'json' }) || {};
  const state = ps[pair];
  if (!state?.stopLoss) return;

  const tkRes = await fetch(`${OKX_BASE}/api/v5/market/ticker?instId=${pair}`);
  const tk = await tkRes.json();
  const price = parseFloat(tk?.data?.[0]?.last || '0');
  if (!price) return;

  const slHit = state.direction === 'long' ? price <= state.stopLoss : price >= state.stopLoss;
  const tpHit = state.takeProfit
    ? (state.direction === 'long' ? price >= state.takeProfit : price <= state.takeProfit)
    : false;

  if (!slHit && !tpHit) return;

  // ── TP hit: close 50%, move SL to break-even, let rest run ──
  if (tpHit && !state.halfClosed) {
    const totalSz = state.entries.reduce((sum, e) => sum + parseFloat(e.sz), 0);
    const halfSz  = (totalSz / 2).toFixed(4);
    const avgEntry = state.entries.reduce((sum, e) => sum + e.price * parseFloat(e.sz), 0) / totalSz;

    await okxPost(apiKey, secret, pass, '/api/v5/trade/order', {
      instId: pair, tdMode: 'cross',
      side:    state.direction === 'long' ? 'sell' : 'buy',
      posSide: state.direction === 'long' ? 'long' : 'short',
      ordType: 'market', sz: halfSz
    }, demo);

    state.halfClosed  = true;
    state.stopLoss    = avgEntry;  // SL → break-even
    state.takeProfit  = null;      // no fixed TP for second half
    ps[pair] = state;
    await env.USERS_KV.put('bot:position_state', JSON.stringify(ps));
    await botLog(env, `TP hit @ ${price} — 50% closed, SL moved to break-even ${avgEntry.toFixed(2)}`);
    return;
  }

  // ── SL hit (or second-half running past SL): close all ───────
  await okxPost(apiKey, secret, pass, '/api/v5/trade/close-position', {
    instId: pair, mgnMode: 'cross',
    posSide: state.direction === 'long' ? 'long' : 'short'
  }, demo);

  // Track daily loss on SL hit only
  if (slHit && lossLimitEnabled) {
    const today = new Date().toDateString();
    const dl = await env.USERS_KV.get('bot:daily_loss:' + today, { type: 'json' }) || { pct: 0 };
    const realizedLoss = openPos.reduce((s, p) => s + Math.abs(parseFloat(p.upl || '0')), 0);
    dl.pct = (dl.pct || 0) + realizedLoss / equity;
    await env.USERS_KV.put('bot:daily_loss:' + today, JSON.stringify(dl), { expirationTtl: 86400 });
  }

  delete ps[pair];
  await env.USERS_KV.put('bot:position_state', JSON.stringify(ps));
  const reason = state.halfClosed ? `SL(break-even) hit @ ${price}` : `SL hit @ ${price}`;
  await botLog(env, `${reason} — remaining position closed`);
}

// ── S/R DETECTION (recency-weighted touch count) ──────────────
// Recent candles (within RECENT_N): 2 touches = valid
// Older candles: 3 touches = valid
// Candles beyond MAX_AGE are ignored (stale levels)
function detectSR(candles) {
  const RECENT_N = 20;   // within 20 candles → 2 touches ok
  const MAX_AGE  = 100;  // beyond 100 candles → ignore
  const TOL      = 0.003;

  const activeCandles = candles.slice(0, MAX_AGE);
  const currentPrice  = parseFloat(candles[0][4]);
  const levels        = [];
  const seen          = new Set();

  const prices = activeCandles.flatMap(c => [parseFloat(c[2]), parseFloat(c[3])]);

  for (const p of prices) {
    const bucket = Math.round(p / (p * TOL));
    if (seen.has(bucket)) continue;
    seen.add(bucket);

    let sup = 0, res = 0, recentTouches = 0;
    activeCandles.forEach((c, idx) => {
      const hi = parseFloat(c[2]), lo = parseFloat(c[3]);
      const touchedSup = Math.abs(lo - p) / p <= TOL;
      const touchedRes = Math.abs(hi - p) / p <= TOL;
      if (touchedSup) { sup++; if (idx < RECENT_N) recentTouches++; }
      if (touchedRes) { res++; if (idx < RECENT_N) recentTouches++; }
    });

    const touches  = sup + res;
    const required = recentTouches >= 1 ? 2 : 3; // recent level → 2 touches ok
    if (touches >= required) {
      levels.push({ price: p, touches, recentTouches, type: sup >= res ? 'support' : 'resistance' });
    }
  }

  return {
    supports:    levels.filter(l => l.type === 'support'    && l.price <= currentPrice * 1.005)
                       .sort((a, b) => b.price - a.price).slice(0, 4),
    resistances: levels.filter(l => l.type === 'resistance' && l.price >= currentPrice * 0.995)
                       .sort((a, b) => a.price - b.price).slice(0, 4)
  };
}
  };
}

// ── MERGE 1H + 4H LEVELS (deduplicate within 0.5%) ────────────
function mergeLevels(a, b) {
  const tol = 0.005;
  function dedup(arr) {
    const out = [];
    for (const lv of arr) {
      if (!out.some(o => Math.abs(o.price - lv.price) / lv.price <= tol)) out.push(lv);
    }
    return out;
  }
  return {
    supports: dedup([...a.supports, ...b.supports]).sort((x, y) => y.price - x.price).slice(0, 5),
    resistances: dedup([...a.resistances, ...b.resistances]).sort((x, y) => x.price - y.price).slice(0, 5)
  };
}

// ── ENTRY SIGNAL ──────────────────────────────────────────────
// Rising price touches resistance → SHORT
// Falling price touches support → LONG
// Only enter if prev 5m candle SL distance is 3-6%
function detectSignal(c5, levels) {
  if (c5.length < 4) return null;

  const cur   = c5[0].map(parseFloat);
  const prev1 = c5[1].map(parseFloat);
  const prev2 = c5[2].map(parseFloat);
  const prev3 = c5[3].map(parseFloat);

  const curPrice = cur[4];
  const prevHigh = prev1[2];
  const prevLow  = prev1[3];

  const rising  = prev1[4] > prev2[4] && prev2[4] > prev3[4];
  const falling = prev1[4] < prev2[4] && prev2[4] < prev3[4];

  const TOUCH_TOL = 0.004;
  const SL_MIN    = 0.03;
  const SL_MAX    = 0.06;

  for (const s of levels.supports) {
    if (!falling) continue;
    if (Math.abs(curPrice - s.price) / s.price > TOUCH_TOL) continue;
    const slDist = (curPrice - prevLow) / curPrice;
    if (slDist < SL_MIN || slDist > SL_MAX) continue;
    return { type: 'long', level: s.price, stopLoss: prevLow };
  }

  for (const r of levels.resistances) {
    if (!rising) continue;
    if (Math.abs(curPrice - r.price) / r.price > TOUCH_TOL) continue;
    const slDist = (prevHigh - curPrice) / curPrice;
    if (slDist < SL_MIN || slDist > SL_MAX) continue;
    return { type: 'short', level: r.price, stopLoss: prevHigh };
  }

  return null;
}

// ── VOLUME PROFILE (매물대) ────────────────────────────────────
function detectVolumeZones(candles, currentPrice) {
  if (candles.length < 20) return { supports: [], resistances: [] };
  const BUCKETS = 50;
  const minP = Math.min(...candles.map(c => parseFloat(c[3])));
  const maxP = Math.max(...candles.map(c => parseFloat(c[2])));
  const step = (maxP - minP) / BUCKETS;
  const vols = new Array(BUCKETS).fill(0);
  for (const c of candles) {
    const lo = parseFloat(c[3]), hi = parseFloat(c[2]), vol = parseFloat(c[5]);
    const b0 = Math.max(0, Math.floor((lo - minP) / step));
    const b1 = Math.min(BUCKETS - 1, Math.ceil((hi - minP) / step));
    for (let b = b0; b <= b1; b++) vols[b] += vol;
  }
  const avgVol = vols.reduce((s, v) => s + v, 0) / BUCKETS;
  const zones  = [];
  for (let b = 0; b < BUCKETS; b++) {
    if (vols[b] < avgVol * 2) continue;
    const zonePrice = minP + (b + 0.5) * step;
    zones.push({ price: zonePrice, touches: Math.round(vols[b] / avgVol), type: zonePrice <= currentPrice ? 'support' : 'resistance' });
  }
  return {
    supports:    zones.filter(z => z.type === 'support').sort((a, b) => b.price - a.price).slice(0, 3),
    resistances: zones.filter(z => z.type === 'resistance').sort((a, b) => a.price - b.price).slice(0, 3)
  };
}

// ── OKX API ───────────────────────────────────────────────────
async function getCandles(instId, bar, limit) {
  try {
    const res = await fetch(`${OKX_BASE}/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`);
    return (await res.json()).data || [];
  } catch { return []; }
}

async function okxGet(apiKey, secret, pass, path, demo = false) {
  const ts = new Date().toISOString();
  const sign = await hmac(secret, ts + 'GET' + path);
  const res = await fetch(OKX_BASE + path, {
    headers: okxHeaders(apiKey, sign, ts, pass, demo)
  });
  return res.json();
}

async function okxPost(apiKey, secret, pass, path, body, demo = false) {
  const ts = new Date().toISOString();
  const bodyStr = JSON.stringify(body);
  const sign = await hmac(secret, ts + 'POST' + path + bodyStr);
  const res = await fetch(OKX_BASE + path, {
    method: 'POST',
    headers: okxHeaders(apiKey, sign, ts, pass, demo),
    body: bodyStr
  });
  return res.json();
}

function okxHeaders(key, sign, ts, pass, demo = false) {
  const h = {
    'OK-ACCESS-KEY': key, 'OK-ACCESS-SIGN': sign,
    'OK-ACCESS-TIMESTAMP': ts, 'OK-ACCESS-PASSPHRASE': pass,
    'Content-Type': 'application/json'
  };
  if (demo) h['x-simulated-trading'] = '1';
  return h;
}

async function hmac(secret, message) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// ── BOT LOG & NOTIFY ──────────────────────────────────────────
async function botLog(env, msg) {
  if (!env.USERS_KV) return;
  const logs = await env.USERS_KV.get('bot:logs', { type: 'json' }) || [];
  logs.unshift({ time: new Date().toISOString(), msg });
  if (logs.length > 100) logs.splice(100);
  await env.USERS_KV.put('bot:logs', JSON.stringify(logs));
}

async function botNotify(env, cfg, msg) {
  if (cfg.notifyEmail && cfg.userEmail) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'AYILON <onboarding@resend.dev>',
          to: [cfg.userEmail],
          subject: 'AYILON Bot Alert',
          html: `<div style="background:#000;color:#fff;font-family:Inter,sans-serif;padding:40px;max-width:480px;border-radius:12px;"><h2 style="margin-bottom:8px;">AYILON Bot</h2><p style="color:#a3a3a3;margin-bottom:24px;">${msg}</p><a href="https://oracletrading-01o.pages.dev/dashboard.html" style="display:inline-block;background:#fff;color:#000;padding:12px 24px;border-radius:8px;font-weight:600;text-decoration:none;">Dashboard →</a></div>`
        })
      });
    } catch {}
  }
  if (cfg.notifyTelegram && cfg.telegramToken && cfg.telegramChatId) {
    try {
      await fetch(`https://api.telegram.org/bot${cfg.telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: cfg.telegramChatId, text: `🤖 AYILON Bot\n\n${msg}` })
      });
    } catch {}
  }
}
