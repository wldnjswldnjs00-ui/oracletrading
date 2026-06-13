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
      strategy = 'daytrading',
      numEntries = 3, entrySizing = 'equal',
      posSize = 40, leverage = 20,
      lossLimitEnabled = true, lossLimit = 5,
      notifyEmail = true, notifyTelegram = false,
      telegramToken, telegramChatId, userEmail } = cfg;
    const srTimeframe = strategy === 'swing' ? '4H' : '1H';
    const srTouch = 3;

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
    const balRes = await okxGet(apiKey, apiSecret, apiPassphrase, '/api/v5/account/balance?ccy=USDT');
    const details = balRes?.data?.[0]?.details || [];
    const equity = parseFloat(details.find(d => d.ccy === 'USDT')?.eq || '0');
    if (equity <= 0) return;

    // ── Open positions ────────────────────────────────────────
    const posRes = await okxGet(apiKey, apiSecret, apiPassphrase, `/api/v5/account/positions?instId=${tradingPair}`);
    const openPos = (posRes?.data || []).filter(p => parseFloat(p.pos) !== 0);

    // ── Stop loss check ───────────────────────────────────────
    await checkSL(env, apiKey, apiSecret, apiPassphrase, tradingPair, openPos, equity, lossLimitEnabled, lossLimit / 100);

    // ── S/R candles ───────────────────────────────────────────
    const srCandles = await getCandles(tradingPair, srTimeframe, 100);
    if (srCandles.length < 20) return;
    const levels = detectSR(srCandles, parseInt(srTouch));
    if (!levels.supports.length && !levels.resistances.length) return;

    // ── 5m entry candles ──────────────────────────────────────
    const c5 = await getCandles(tradingPair, '5m', 20);
    if (c5.length < 3) return;
    const signal = detectSignal(c5, levels);
    if (!signal) return;

    // Max entries reached → skip
    if (openPos.length >= parseInt(numEntries)) return;
    const entryNum = openPos.length + 1;

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
    const currentPrice = parseFloat(c5[0][4]);
    const sz = (entryVal / currentPrice).toFixed(4);

    // ── Place order ───────────────────────────────────────────
    const orderRes = await okxPost(apiKey, apiSecret, apiPassphrase, '/api/v5/trade/order', {
      instId: tradingPair, tdMode: 'cross',
      side: signal.type === 'long' ? 'buy' : 'sell',
      posSide: signal.type === 'long' ? 'long' : 'short',
      ordType: 'market', sz, lever: String(leverage)
    });

    if (orderRes?.data?.[0]?.ordId) {
      const ps = await env.USERS_KV.get('bot:position_state', { type: 'json' }) || {};
      ps[tradingPair] = ps[tradingPair] || { entries: [], stopLoss: null, direction: null };
      ps[tradingPair].entries.push({ price: currentPrice, sz, time: Date.now(), entry: entryNum });
      ps[tradingPair].direction = signal.type;
      ps[tradingPair].stopLoss  = signal.stopLoss;
      await env.USERS_KV.put('bot:position_state', JSON.stringify(ps));
      await botLog(env, `${signal.type.toUpperCase()} #${entryNum}/${numEntries} @ ${currentPrice} | SL: ${signal.stopLoss.toFixed(2)} | sz: ${sz}`);
      await botNotify(env, { notifyEmail, notifyTelegram, telegramToken, telegramChatId, userEmail },
        `${signal.type.toUpperCase()} entry #${entryNum} placed @ ${currentPrice} USDT`);
    }

  } catch(e) {
    await botLog(env, 'Bot error: ' + e.message);
  }
}

// ── STOP LOSS ─────────────────────────────────────────────────
async function checkSL(env, apiKey, secret, pass, pair, openPos, equity, lossLimitEnabled, lossLimitPct) {
  if (!openPos.length) return;
  const ps = await env.USERS_KV.get('bot:position_state', { type: 'json' }) || {};
  const state = ps[pair];
  if (!state?.stopLoss) return;

  const tkRes = await fetch(`${OKX_BASE}/api/v5/market/ticker?instId=${pair}`);
  const tk = await tkRes.json();
  const price = parseFloat(tk?.data?.[0]?.last || '0');
  if (!price) return;

  const hit = state.direction === 'long' ? price <= state.stopLoss : price >= state.stopLoss;
  if (!hit) return;

  await okxPost(apiKey, secret, pass, '/api/v5/trade/close-position', {
    instId: pair, mgnMode: 'cross',
    posSide: state.direction === 'long' ? 'long' : 'short'
  });

  // Track daily loss (estimate from realized PnL)
  if (lossLimitEnabled) {
    const today = new Date().toDateString();
    const dl = await env.USERS_KV.get('bot:daily_loss:' + today, { type: 'json' }) || { pct: 0 };
    const realizedLoss = openPos.reduce((s, p) => s + Math.abs(parseFloat(p.upl || '0')), 0);
    dl.pct = (dl.pct || 0) + realizedLoss / equity;
    await env.USERS_KV.put('bot:daily_loss:' + today, JSON.stringify(dl), { expirationTtl: 86400 });
  }

  delete ps[pair];
  await env.USERS_KV.put('bot:position_state', JSON.stringify(ps));
  await botLog(env, `SL hit @ ${price} — all positions closed`);
}

// ── S/R DETECTION ─────────────────────────────────────────────
function detectSR(candles, minTouches) {
  const tol = 0.003;
  const prices = candles.flatMap(c => [parseFloat(c[2]), parseFloat(c[3])]);
  const currentPrice = parseFloat(candles[0][4]);
  const levels = [];
  const seen = new Set();

  for (const p of prices) {
    const bucket = Math.round(p / (p * tol));
    if (seen.has(bucket)) continue;
    seen.add(bucket);

    let sup = 0, res = 0;
    for (const c of candles) {
      const hi = parseFloat(c[2]), lo = parseFloat(c[3]);
      if (Math.abs(lo - p) / p <= tol) sup++;
      else if (Math.abs(hi - p) / p <= tol) res++;
    }
    const touches = sup + res;
    if (touches >= minTouches) levels.push({ price: p, touches, type: sup >= res ? 'support' : 'resistance' });
  }

  return {
    supports: levels.filter(l => l.type === 'support' && l.price <= currentPrice * 1.005)
                     .sort((a, b) => b.price - a.price).slice(0, 3),
    resistances: levels.filter(l => l.type === 'resistance' && l.price >= currentPrice * 0.995)
                        .sort((a, b) => a.price - b.price).slice(0, 3)
  };
}

// ── ENTRY SIGNAL ──────────────────────────────────────────────
function detectSignal(c5, levels) {
  const [, , , prevLow, prevClose] = c5[1].map(parseFloat);
  const [, prevOpen2, prevHigh2] = c5[1].map(parseFloat);
  const curPrice = parseFloat(c5[0][4]);
  const recentLows  = c5.slice(1, 10).map(c => parseFloat(c[3]));
  const recentHighs = c5.slice(1, 10).map(c => parseFloat(c[2]));
  const swingLow  = Math.min(...recentLows);
  const swingHigh = Math.max(...recentHighs);

  for (const s of levels.supports) {
    if (Math.abs(curPrice - s.price) / s.price > 0.005) continue;
    // Body fully through support (no wick) → skip
    if (prevClose < s.price && Math.abs(prevClose - prevLow) / prevClose < 0.001) continue;
    // Wick: low touched or pierced support but close is above
    if (prevLow <= s.price * 1.002 && prevClose > s.price) {
      return { type: 'long', level: s.price, stopLoss: swingLow * 0.9985 };
    }
  }

  for (const r of levels.resistances) {
    if (Math.abs(curPrice - r.price) / r.price > 0.005) continue;
    // Body fully through resistance → skip
    if (prevClose > r.price && Math.abs(prevHigh2 - prevClose) / prevClose < 0.001) continue;
    // Wick: high touched/pierced resistance but close is below
    if (prevHigh2 >= r.price * 0.998 && prevClose < r.price) {
      return { type: 'short', level: r.price, stopLoss: swingHigh * 1.0015 };
    }
  }

  return null;
}

// ── OKX API ───────────────────────────────────────────────────
async function getCandles(instId, bar, limit) {
  try {
    const res = await fetch(`${OKX_BASE}/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`);
    return (await res.json()).data || [];
  } catch { return []; }
}

async function okxGet(apiKey, secret, pass, path) {
  const ts = new Date().toISOString();
  const sign = await hmac(secret, ts + 'GET' + path);
  const res = await fetch(OKX_BASE + path, {
    headers: okxHeaders(apiKey, sign, ts, pass)
  });
  return res.json();
}

async function okxPost(apiKey, secret, pass, path, body) {
  const ts = new Date().toISOString();
  const bodyStr = JSON.stringify(body);
  const sign = await hmac(secret, ts + 'POST' + path + bodyStr);
  const res = await fetch(OKX_BASE + path, {
    method: 'POST',
    headers: okxHeaders(apiKey, sign, ts, pass),
    body: bodyStr
  });
  return res.json();
}

function okxHeaders(key, sign, ts, pass) {
  return {
    'OK-ACCESS-KEY': key, 'OK-ACCESS-SIGN': sign,
    'OK-ACCESS-TIMESTAMP': ts, 'OK-ACCESS-PASSPHRASE': pass,
    'Content-Type': 'application/json'
  };
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
