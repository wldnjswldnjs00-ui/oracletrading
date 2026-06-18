const WALLET = 'TBvtft3H8B4Rv4cEHTotyak3Ds2mLur99E';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const ALLOWED_ORIGINS = [
  'https://oracletrading-01o.pages.dev',
  'http://localhost',
  'http://127.0.0.1'
];
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow all Cloudflare Pages preview deployments for this project
  if (/^https:\/\/[^.]+\.oracletrading-01o\.pages\.dev$/.test(origin)) return true;
  return false;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
    }
    const corsOrigin = origin || ALLOWED_ORIGINS[0];
    if (request.method === 'OPTIONS') {
      return new Response('', { status: 204, headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Vary': 'Origin'
      }});
    }
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'POST') {
      if (path === '/send-verification')  return handleVerification(request, env);
      if (path === '/verify-code')        return handleVerifyCode(request, env);
      if (path === '/send-confirmation')  return handleConfirmation(request, env);
      if (path === '/check-email')        return handleCheckEmail(request, env);
      if (path === '/check-username')     return handleCheckUsername(request, env);
      if (path === '/register-user')      return handleRegisterUser(request, env);
      if (path === '/create-payment')     return handleCreatePayment(request, env);
      if (path === '/verify-payment')     return handleVerifyPayment(request, env);
      if (path === '/check-payment')      return handleCheckPayment(request, env);
      if (path === '/login')             return handleLogin(request, env);
      if (path === '/logout')            return handleLogout(request, env);
      if (path === '/me')                return handleMe(request, env);
      if (path === '/change-password')   return handleChangePassword(request, env);
      if (path === '/reset-password')    return handleResetPassword(request, env);
      if (path === '/update-profile')    return handleUpdateProfile(request, env);
      if (path === '/save-bot-settings') return handleSaveBotSettings(request, env);
      if (path === '/bot-status')           return handleBotStatus(request, env);
      if (path === '/bot-control')          return handleBotControl(request, env);
      if (path === '/send-email-verify')    return handleSendEmailVerify(request, env);
      if (path === '/verify-email-change')  return handleVerifyEmailChange(request, env);
      if (path === '/get-positions')     return handleGetPositions(request, env);
      if (path === '/get-orders')        return handleGetOrders(request, env);
      if (path === '/get-history')       return handleGetHistory(request, env);
      if (path === '/get-account')       return handleGetAccount(request, env);
      if (path === '/admin-users')       return handleAdminUsers(request, env);
      if (path === '/admin-user-detail') return handleAdminUserDetail(request, env);
      if (path === '/delete-account')    return handleDeleteAccount(request, env);
    }

    if (request.method === 'GET') {
      if (path === '/bot-status') return handleBotStatus(request, env);
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
  if (!email) return json({ available: false });
  if (!env.USERS_KV) return json({ available: true });
  const existing = await env.USERS_KV.get('user:' + email.toLowerCase());
  return json({ available: !existing });
}

// ── CHECK USERNAME ───────────────────────────────────────────
async function handleCheckUsername(request, env) {
  const { username } = await request.json();
  if (!username) return json({ available: false });
  if (!env.USERS_KV) return json({ available: true });
  const existing = await env.USERS_KV.get('username:' + username.toLowerCase());
  return json({ available: !existing });
}

// ── REGISTER USER ────────────────────────────────────────────
async function handleRegisterUser(request, env) {
  const { email, username, name, password, code, country } = await request.json();
  if (!email || !username || !code) return json({ success: false, error: 'missing_fields' }, 400);

  // Verify email code server-side — always required
  if (env.USERS_KV) {
    const storedCode = await env.USERS_KV.get('verify:' + email.toLowerCase());
    if (!storedCode || storedCode !== String(code)) {
      return json({ success: false, error: 'invalid_code' });
    }
    await env.USERS_KV.delete('verify:' + email.toLowerCase());
  }

  if (env.USERS_KV) {
    const emailKey    = 'user:'     + email.toLowerCase();
    const usernameKey = 'username:' + username.toLowerCase();
    const emailExists    = await env.USERS_KV.get(emailKey);
    if (emailExists)    return json({ success: false, error: 'email_taken' });
    const usernameExists = await env.USERS_KV.get(usernameKey);
    if (usernameExists) return json({ success: false, error: 'username_taken' });

    // Fix: hash password with SHA-256 before storing (never store plaintext)
    const hashedPw = password ? await hashPassword(password) : null;
    await env.USERS_KV.put(emailKey, JSON.stringify({
      email, username, name, country: country || '',
      password: hashedPw,
      createdAt: Date.now()
    }));
    await env.USERS_KV.put(usernameKey, email.toLowerCase());
  }
  return json({ success: true });
}

// ── VERIFY EMAIL CODE (server-side) ─────────────────────────
async function handleVerifyCode(request, env) {
  const { email, code } = await request.json();
  if (!email || !code) return json({ valid: false });
  if (!env.USERS_KV) return json({ valid: true }); // dev fallback

  // Brute-force protection: max 5 attempts per code, then auto-invalidate
  const attemptsKey = 'rate:code_attempt:' + email.toLowerCase();
  const attempts = await env.USERS_KV.get(attemptsKey, { type: 'json' });
  if ((attempts?.count || 0) >= 5) {
    await env.USERS_KV.delete('verify:' + email.toLowerCase());
    return json({ valid: false, error: 'too_many_attempts' });
  }

  const stored = await env.USERS_KV.get('verify:' + email.toLowerCase());
  const valid = stored === String(code);
  if (!valid) {
    const newCount = (attempts?.count || 0) + 1;
    await env.USERS_KV.put(attemptsKey, JSON.stringify({ count: newCount }), { expirationTtl: 300 });
  } else {
    await env.USERS_KV.delete(attemptsKey);
  }
  return json({ valid });
}

// ── CREATE PAYMENT (assign unique amount) ────────────────────
async function handleCreatePayment(request, env) {
  const body = await request.json();
  const { plan, billing, baseAmount } = body;
  if (!plan || !baseAmount) return json({ error: 'Missing fields' }, 400);

  // Get email from session (preferred) or body fallback
  const session = await requireSession(body, env, request);
  const email = (session && session.email) ? session.email : (body.email || '');
  if (!email) return json({ error: 'unauthorized' }, 401);

  let uniqueAmount, key;
  if (env.USERS_KV) {
    let conflict = true, attempts = 0;
    while (conflict && attempts < 20) {
      const n = Math.floor(Math.random() * 9999) + 1;
      uniqueAmount = (parseFloat(baseAmount) + n / 10000).toFixed(4);
      key = 'pending:' + uniqueAmount;
      conflict = await env.USERS_KV.get(key);
      attempts++;
    }
    if (conflict) return json({ error: 'Payment service busy, please try again' }, 503);
  } else {
    const n = Math.floor(Math.random() * 9999) + 1;
    uniqueAmount = (parseFloat(baseAmount) + n / 10000).toFixed(4);
    key = 'pending:' + uniqueAmount;
  }

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
    const res = await fetch(
      `https://api.trongrid.io/v1/accounts/${WALLET}/transactions/trc20?limit=50&only_to=true&contract_address=${USDT_CONTRACT}&order_by=block_timestamp,desc`,
      { headers: { 'Accept': 'application/json', 'User-Agent': 'AYILON/1.0' } }
    );
    if (!res.ok) return json({ verified: false, error: 'Blockchain query failed' });

    const data = await res.json();
    const txs = data.data || [];

    const tx = txs.find(t => t.transaction_id === txid);
    if (!tx) return json({ verified: false, error: 'Transaction not found. It may not be confirmed yet — please wait 1-3 minutes and try again.' });

    const received = Number(tx.value) / 1_000_000;
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
      const amount = (Number(tx.value) / 1_000_000).toFixed(4);
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
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email' }, 400);
  }

  // Rate limit: max 3 emails per address per 15 min, max 10 per IP per 15 min
  if (env.USERS_KV) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const emailRateKey = 'rate:verify:email:' + email.toLowerCase();
    const ipRateKey    = 'rate:verify:ip:' + ip;
    const [emailRate, ipRate] = await Promise.all([
      env.USERS_KV.get(emailRateKey, { type: 'json' }),
      env.USERS_KV.get(ipRateKey,    { type: 'json' })
    ]);
    if ((emailRate?.count || 0) >= 3) return json({ error: 'Too many code requests. Wait 15 minutes.' }, 429);
    if ((ipRate?.count    || 0) >= 10) return json({ error: 'Too many requests. Wait 15 minutes.' }, 429);
    await Promise.all([
      env.USERS_KV.put(emailRateKey, JSON.stringify({ count: (emailRate?.count || 0) + 1 }), { expirationTtl: 900 }),
      env.USERS_KV.put(ipRateKey,    JSON.stringify({ count: (ipRate?.count    || 0) + 1 }), { expirationTtl: 900 })
    ]);
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));

  // Fix: store code server-side, never return it in the response
  if (env.USERS_KV) {
    await env.USERS_KV.put('verify:' + email.toLowerCase(), code, { expirationTtl: 300 });
  }

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
  return json({ success: true }); // code NOT returned — client must verify via /verify-code
}

// ── SEND CONFIRMATION EMAIL ──────────────────────────────────
async function handleConfirmation(request, env) {
  const body = await request.json();
  const session = await requireSession(body, env, request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  const email = session.email;
  const user = await env.USERS_KV.get('user:' + email, { type: 'json' });
  const sub = user?.subscription;
  if (!sub?.plan) return json({ error: 'No active subscription found' }, 400);
  const plan = sub.plan;
  const billing = sub.billing;
  const amount = sub.amount;
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
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function json(body, status = 200) {
  return corsResponse(JSON.stringify(body), status);
}

function corsResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// Fix: SHA-256 password hash — never store plaintext passwords
async function hashPassword(password) {
  const data = new TextEncoder().encode(password + ':ayilon_2025');
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

// ════════════════════════════════════════════════════════════
// SESSION AUTH
// ════════════════════════════════════════════════════════════

async function requireSession(body, env, request = null) {
  let token = body?.sessionToken;
  // Also accept token from Authorization: Bearer <token> header
  if (!token && request) {
    const auth = request.headers.get('Authorization') || '';
    if (auth.startsWith('Bearer ')) token = auth.slice(7).trim();
  }
  if (!token || !env.USERS_KV) return null;
  const session = await env.USERS_KV.get('session:' + token, { type: 'json' });
  if (!session || !session.email) return null;
  return session;
}

async function handleLogin(request, env) {
  const { email, password } = await request.json();
  if (!email || !password) return json({ ok: false, error: 'missing_fields' }, 400);
  if (!env.USERS_KV) return json({ ok: false, error: 'service_unavailable' }, 503);

  const loginRateKey = 'rate:login:' + email.toLowerCase();
  const loginRate = await env.USERS_KV.get(loginRateKey, { type: 'json' });
  if ((loginRate?.count || 0) >= 5) return json({ ok: false, error: 'too_many_attempts' }, 429);

  const user = await env.USERS_KV.get('user:' + email.toLowerCase(), { type: 'json' });
  if (!user) {
    await env.USERS_KV.put(loginRateKey, JSON.stringify({ count: (loginRate?.count || 0) + 1 }), { expirationTtl: 900 });
    return json({ ok: false, error: 'invalid_credentials' }, 401);
  }

  const hashedPw = await hashPassword(password);
  if (!user.password || user.password !== hashedPw) {
    await env.USERS_KV.put(loginRateKey, JSON.stringify({ count: (loginRate?.count || 0) + 1 }), { expirationTtl: 900 });
    return json({ ok: false, error: 'invalid_credentials' }, 401);
  }
  await env.USERS_KV.delete(loginRateKey);

  const sessionToken = crypto.randomUUID();
  await env.USERS_KV.put('session:' + sessionToken, JSON.stringify({
    email: user.email, username: user.username, name: user.name
  }), { expirationTtl: 604800 }); // 7 days

  return json({ ok: true, sessionToken, email: user.email, username: user.username || '', name: user.name || '' });
}

async function handleLogout(request, env) {
  const body = await request.json().catch(() => ({}));
  if (body.sessionToken && env.USERS_KV) {
    await env.USERS_KV.delete('session:' + body.sessionToken);
  }
  return json({ ok: true });
}

async function handleMe(request, env) {
  const body = await request.json().catch(() => ({}));
  const session = await requireSession(body, env, request);
  if (!session) return json({ authenticated: false }, 401);
  return json({ authenticated: true, email: session.email, username: session.username, name: session.name });
}

async function handleChangePassword(request, env) {
  const body = await request.json();
  const session = await requireSession(body, env, request);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) return json({ ok: false, error: 'missing_fields' }, 400);
  if (newPassword.length < 8) return json({ ok: false, error: 'password_too_short' }, 400);

  const user = await env.USERS_KV.get('user:' + session.email.toLowerCase(), { type: 'json' });
  if (!user) return json({ ok: false, error: 'user_not_found' }, 404);

  if (user.password !== await hashPassword(currentPassword)) {
    return json({ ok: false, error: 'invalid_current_password' }, 401);
  }
  user.password = await hashPassword(newPassword);
  await env.USERS_KV.put('user:' + session.email.toLowerCase(), JSON.stringify(user));
  return json({ ok: true });
}

async function handleResetPassword(request, env) {
  const { email, code, newPassword } = await request.json();
  if (!email || !code || !newPassword) return json({ ok: false, error: 'missing_fields' }, 400);
  if (newPassword.length < 8) return json({ ok: false, error: 'password_too_short' }, 400);
  if (!env.USERS_KV) return json({ ok: false, error: 'service_unavailable' }, 503);

  const attemptsKey = 'rate:code_attempt:' + email.toLowerCase();
  const attempts    = await env.USERS_KV.get(attemptsKey, { type: 'json' });
  if ((attempts?.count || 0) >= 5) {
    await env.USERS_KV.delete('verify:' + email.toLowerCase());
    return json({ ok: false, error: 'too_many_attempts' });
  }
  const stored = await env.USERS_KV.get('verify:' + email.toLowerCase());
  if (!stored || stored !== String(code)) {
    await env.USERS_KV.put(attemptsKey, JSON.stringify({ count: (attempts?.count || 0) + 1 }), { expirationTtl: 300 });
    return json({ ok: false, error: 'invalid_code' });
  }
  await env.USERS_KV.delete('verify:' + email.toLowerCase());
  await env.USERS_KV.delete(attemptsKey);

  const user = await env.USERS_KV.get('user:' + email.toLowerCase(), { type: 'json' });
  if (!user) return json({ ok: false, error: 'user_not_found' });
  user.password = await hashPassword(newPassword);
  await env.USERS_KV.put('user:' + email.toLowerCase(), JSON.stringify(user));
  return json({ ok: true });
}

async function handleUpdateProfile(request, env) {
  const body = await request.json();
  const session = await requireSession(body, env, request);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!env.USERS_KV) return json({ ok: false, error: 'service_unavailable' }, 503);

  const { name, username } = body;
  const emailKey = 'user:' + session.email.toLowerCase();
  const user = await env.USERS_KV.get(emailKey, { type: 'json' });
  if (!user) return json({ ok: false, error: 'user_not_found' }, 404);

  if (username && username.toLowerCase() !== (user.username || '').toLowerCase()) {
    const newKey = 'username:' + username.toLowerCase();
    if (await env.USERS_KV.get(newKey)) return json({ ok: false, error: 'username_taken' });
    if (user.username) await env.USERS_KV.delete('username:' + user.username.toLowerCase());
    await env.USERS_KV.put(newKey, session.email.toLowerCase());
    user.username = username;
  }
  if (name !== undefined) user.name = name;
  await env.USERS_KV.put(emailKey, JSON.stringify(user));
  const token = body?.sessionToken;
  if (token) {
    await env.USERS_KV.put('session:' + token, JSON.stringify({
      email: session.email, username: user.username, name: user.name
    }), { expirationTtl: 604800 });
  }
  return json({ ok: true });
}

// ════════════════════════════════════════════════════════════
// BOT ENDPOINTS
// ════════════════════════════════════════════════════════════

async function handleSaveBotSettings(request, env) {
  const body = await request.json();
  if (!env.USERS_KV) return json({ ok: false });

  const session = await requireSession(body, env, request);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);

  // Preserve existing config — merge so saving strategy doesn't wipe API key and vice versa
  const existing = await env.USERS_KV.get('bot:config:' + session.email, { type: 'json' }) || {};
  const clientToken = existing?.clientToken || crypto.randomUUID();

  // Normalize apiPass → apiPassphrase (dashboard historically sent 'apiPass')
  if (body.apiPass !== undefined && body.apiPassphrase === undefined) {
    body.apiPassphrase = body.apiPass;
    delete body.apiPass;
  }

  // Sanitize numeric config fields — prevent invalid/extreme values reaching runBotForUser
  const VALID_STRATS = ['sr_bounce','rsi_dca','ma_support','ma_crossover','bb_reversion','breakout','ma_ribbon','macd_div','funding_rate','atr_trend'];
  const VALID_PAIRS  = ['BTC-USDT-SWAP','ETH-USDT-SWAP'];
  if (body.leverage     !== undefined) body.leverage     = Math.min(Math.max(parseInt(body.leverage)       || 20,   1), 125);
  if (body.posSize      !== undefined) body.posSize      = Math.min(Math.max(parseFloat(body.posSize)      || 40,   1), 100);
  if (body.riskPerTrade !== undefined) body.riskPerTrade = Math.min(Math.max(parseFloat(body.riskPerTrade) ||  2, 0.1),  10);
  if (body.numEntries   !== undefined) body.numEntries   = Math.min(Math.max(parseInt(body.numEntries)     ||  3,   1),  10);
  if (body.lossLimit    !== undefined) body.lossLimit    = Math.min(Math.max(parseFloat(body.lossLimit)    ||  5, 0.1),  50);
  if (body.mddLimit     !== undefined) body.mddLimit     = Math.min(Math.max(parseFloat(body.mddLimit)     || 30,   5), 100);
  if (body.strategy    && !VALID_STRATS.includes(body.strategy))   body.strategy    = 'sr_bounce';
  if (Array.isArray(body.strategies)) {
    body.strategies = body.strategies.filter(s => VALID_STRATS.includes(s));
    if (body.strategies.length === 0) delete body.strategies;
  }
  if (body.tradingPair && !VALID_PAIRS.includes(body.tradingPair)) body.tradingPair = 'BTC-USDT-SWAP';
  if (body.entrySizing && !['equal','weighted','martingale'].includes(body.entrySizing)) body.entrySizing = 'equal';

  const { sessionToken: _, ...configBody } = body;
  // Merge: existing config as base so no field is accidentally wiped
  await env.USERS_KV.put('bot:config:' + session.email, JSON.stringify({ ...existing, ...configBody, clientToken, updatedAt: Date.now() }));
  return json({ ok: true, clientToken });
}

async function handleBotStatus(request, env) {
  if (!env.USERS_KV) return json({ running: false, logs: [] });
  const body = request.method === 'GET' ? {} : await request.json().catch(() => ({}));
  const session = await requireSession(body, env, request);
  if (!session) return json({ running: false, logs: [], error: 'unauthorized' }, 401);

  const u = session.email;
  const [config, logs, alert, pos, lastScan, marketData] = await Promise.all([
    env.USERS_KV.get('bot:config:'               + u, { type: 'json' }),
    env.USERS_KV.get('bot:logs:'                 + u, { type: 'json' }),
    env.USERS_KV.get('bot:daily_loss_triggered:' + u, { type: 'json' }),
    env.USERS_KV.get('bot:position_state:'       + u, { type: 'json' }),
    env.USERS_KV.get('bot:last_scan:'            + u),
    env.USERS_KV.get('bot:market_data:'          + u, { type: 'json' })
  ]);
  const _config = config || {}, _logs = logs || [], _pos = pos || {};

  // Funding rate — public endpoint, no auth
  let fundingRate = null;
  try {
    const pair = _config.tradingPair || 'BTC-USDT-SWAP';
    const frRes = await fetch(`https://www.okx.com/api/v5/public/funding-rate?instId=${pair}`);
    const frData = await frRes.json();
    const fr = frData?.data?.[0];
    if (fr) fundingRate = {
      rate:     parseFloat(fr.fundingRate),
      nextRate: parseFloat(fr.nextFundingRate),
      nextTime: parseInt(fr.fundingTime)
    };
  } catch {}

  // Build per-strategy position summary
  const positionSummary = {};
  for (const [key, val] of Object.entries(_pos)) {
    if (val?.direction) {
      positionSummary[key] = { direction: val.direction, entries: (val.entries || []).length };
    }
  }

  return json({
    running: _config.running === true,
    config: {
      strategy:    _config.strategy    || null,
      strategies:  _config.strategies  || null,
      mode:        _config.mode        || 'live',
      leverage:    _config.leverage    || 20,
      posSize:     _config.posSize     || 40,
      tradingPair: _config.tradingPair || 'BTC-USDT-SWAP'
    },
    logs: _logs, alert, positions: _pos, positionSummary, lastScan, fundingRate, marketData
  });
}

async function handleBotControl(request, env) {
  const body = await request.json();
  const { action } = body;
  if (!env.USERS_KV) return json({ ok: false });
  if (!['start', 'stop', 'dismiss', 'resume'].includes(action)) {
    return json({ ok: false, error: 'invalid_action' }, 400);
  }
  const session = await requireSession(body, env, request);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);

  const configKey = 'bot:config:' + session.email;
  const config = await env.USERS_KV.get(configKey, { type: 'json' }) || {};

  if (action === 'start') {
    if (!config.apiKey || !config.apiSecret || !config.apiPassphrase) {
      return json({ ok: false, error: 'api_keys_required' });
    }
    config.running = true;
  }
  if (action === 'stop')  config.running = false;
  if (action === 'dismiss') {
    await env.USERS_KV.delete('bot:daily_loss_triggered:' + session.email);
    return json({ ok: true });
  }
  if (action === 'resume') {
    config.running = true;
    await env.USERS_KV.delete('bot:daily_loss_triggered:' + session.email);
    const today = new Date().toDateString();
    await env.USERS_KV.delete('bot:daily_loss:' + session.email + ':' + today);
    await env.USERS_KV.delete('bot:peak_equity:' + session.email);
  }
  await env.USERS_KV.put(configKey, JSON.stringify(config));
  return json({ ok: true, running: config.running });
}

async function handleGetPositions(request, env) {
  if (!env.USERS_KV) return json({ positions: [] });
  const body = await request.json().catch(() => ({}));
  const session = await requireSession(body, env, request);
  if (!session) return json({ positions: [], error: 'unauthorized' }, 401);

  const config = await env.USERS_KV.get('bot:config:' + session.email, { type: 'json' });
  const { apiKey, apiSecret, tradingPair, mode } = config || {};
  const apiPassphrase = config?.apiPassphrase || config?.apiPass;
  if (!apiKey || !apiSecret || !apiPassphrase) return json({ positions: [] });
  const demo = config?.demoMode === true || mode === 'demo';

  try {
    const data = await okxGet(apiKey, apiSecret, apiPassphrase, `/api/v5/account/positions?instType=SWAP`, demo);
    return json({ positions: data?.data || [] });
  } catch(e) { return json({ positions: [], error: e.message }); }
}

async function handleGetOrders(request, env) {
  if (!env.USERS_KV) return json({ orders: [] });
  const body = await request.json().catch(() => ({}));
  const session = await requireSession(body, env, request);
  if (!session) return json({ orders: [], error: 'unauthorized' }, 401);

  const config = await env.USERS_KV.get('bot:config:' + session.email, { type: 'json' });
  const { apiKey, apiSecret, mode } = config || {};
  const apiPassphrase = config?.apiPassphrase || config?.apiPass;
  if (!apiKey || !apiSecret || !apiPassphrase) return json({ orders: [] });
  const demo = config?.demoMode === true || mode === 'demo';

  try {
    const data = await okxGet(apiKey, apiSecret, apiPassphrase, `/api/v5/trade/orders-pending?instType=SWAP`, demo);
    return json({ orders: data?.data || [] });
  } catch(e) { return json({ orders: [], error: e.message }); }
}

async function handleGetHistory(request, env) {
  if (!env.USERS_KV) return json({ history: [] });
  const body = await request.json().catch(() => ({}));
  const session = await requireSession(body, env, request);
  if (!session) return json({ history: [], error: 'unauthorized' }, 401);

  const config = await env.USERS_KV.get('bot:config:' + session.email, { type: 'json' });
  const { apiKey, apiSecret, mode } = config || {};
  const apiPassphrase = config?.apiPassphrase || config?.apiPass;
  if (!apiKey || !apiSecret || !apiPassphrase) return json({ history: [] });
  const demo = config?.demoMode === true || mode === 'demo';

  try {
    const data = await okxGet(apiKey, apiSecret, apiPassphrase, `/api/v5/trade/fills?instType=SWAP&limit=50`, demo);
    return json({ history: data?.data || [] });
  } catch(e) { return json({ history: [], error: e.message }); }
}

async function handleGetAccount(request, env) {
  if (!env.USERS_KV) return json({ balance: null });
  const body = await request.json().catch(() => ({}));
  const session = await requireSession(body, env, request);
  if (!session) return json({ balance: null, error: 'unauthorized' }, 401);

  const config = await env.USERS_KV.get('bot:config:' + session.email, { type: 'json' });
  const { apiKey, apiSecret, apiPassphrase, apiPass, mode } = config || {};
  const resolvedPass = apiPassphrase || apiPass;
  if (!apiKey || !apiSecret || !resolvedPass) return json({ balance: null });
  const demo = config?.demoMode === true || mode === 'demo';

  try {
    const data = await okxGet(apiKey, apiSecret, resolvedPass, `/api/v5/account/balance?ccy=USDT`, demo);
    if (data?.code && data.code !== '0') return json({ balance: null, error: `OKX: ${data.msg || data.code}` });
    const details = data?.data?.[0]?.details || [];
    const usdt = details.find(d => d.ccy === 'USDT') || {};
    return json({
      balance: {
        equity:    parseFloat(usdt.eq    || 0),
        available: parseFloat(usdt.availEq || 0),
        unrealPnl: parseFloat(usdt.upl   || 0),
        mgnRatio:  parseFloat(data?.data?.[0]?.mgnRatio || 0)
      }
    });
  } catch(e) { return json({ balance: null, error: e.message }); }
}

// ════════════════════════════════════════════════════════════
// BOT TRADING LOGIC
// ════════════════════════════════════════════════════════════

const OKX_BASE = 'https://www.okx.com';

async function getCtVal(instId) {
  try {
    const res = await fetch(`${OKX_BASE}/api/v5/public/instruments?instType=SWAP&instId=${instId}`);
    const data = await res.json();
    return parseFloat(data?.data?.[0]?.ctVal || '0.01');
  } catch { return 0.01; }
}

async function getTicker(instId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 600 * attempt));
      const res = await fetch(`${OKX_BASE}/api/v5/market/ticker?instId=${instId}`);
      const data = await res.json();
      const price = parseFloat(data?.data?.[0]?.last || '0');
      if (price > 0) return price;
    } catch {}
  }
  return 0;
}

async function runBot(env) {
  if (!env.USERS_KV) return;
  try {
    const { keys } = await env.USERS_KV.list({ prefix: 'bot:config:' });
    for (const key of keys) {
      const email = key.name.slice('bot:config:'.length);
      const cfg = await env.USERS_KV.get(key.name, { type: 'json' });
      if (!cfg || cfg.running !== true) continue;
      const strategiesToRun = Array.isArray(cfg.strategies) && cfg.strategies.length > 0
        ? cfg.strategies
        : [cfg.strategy || 'sr_bounce'];
      for (const strat of strategiesToRun) {
        await runBotForUser(env, email, cfg, strat).catch(() => {});
      }
    }
  } catch(e) {}
}

async function runBotForUser(env, email, cfg, strategyOverride) {
  try {
    const strategy = strategyOverride || cfg.strategy || 'sr_bounce';
    const { apiKey, apiSecret, apiPassphrase, tradingPair = 'BTC-USDT-SWAP',
      demoMode = false,
      numEntries = 3, entrySizing = 'equal',
      posSize = 40, riskPerTrade = 2, leverage = 20,
      lossLimitEnabled = true, lossLimit = 2,
      notifyEmail = true, notifyTelegram = false,
      telegramToken, telegramChatId, userEmail } = cfg;
    if (!apiKey || !apiSecret || !apiPassphrase) return;
    if (!['BTC-USDT-SWAP', 'ETH-USDT-SWAP'].includes(tradingPair)) return;
    const stateKey = tradingPair + ':' + strategy;

    // Always derive plan from actual subscription — never trust client-provided value
    const userRecord = await env.USERS_KV.get('user:' + email, { type: 'json' }) || {};
    const plan = userRecord.subscription?.plan || 'starter';

    const lossLimitNorm = parseFloat(lossLimit) > 1 ? parseFloat(lossLimit) / 100 : parseFloat(lossLimit) || 0.05;
    const today = new Date().toDateString();
    // Fix: cap leverage at 50x regardless of user input
    const safeLeverage = Math.min(parseInt(leverage) || 20, 50);

    await env.USERS_KV.put('bot:last_scan:' + email, new Date().toISOString());

    // ── Daily loss check ──────────────────────────────────────
    if (lossLimitEnabled) {
      const dl = await env.USERS_KV.get('bot:daily_loss:' + email + ':' + today, { type: 'json' }) || { pct: 0 };
      if (dl.pct >= lossLimitNorm) {
        cfg.running = false;
        await env.USERS_KV.put('bot:config:' + email, JSON.stringify(cfg));
        await env.USERS_KV.put('bot:daily_loss_triggered:' + email, JSON.stringify({
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
    if (equity <= 0) {
      await botLog(env, email, `Skip: USDT equity=0 in trading account. ${demoMode ? 'Demo: check OKX demo unified account has funds.' : 'Transfer USDT to trading account on OKX.'}`);
      return;
    }

    // ── Fix: Max drawdown stop ────────────────────────────────
    // Track peak equity and halt bot if overall drawdown exceeds mddLimit (default 30%)
    const mddLimitRaw = parseFloat(cfg.mddLimit || 30);
    const mddLimit = mddLimitRaw > 1 ? mddLimitRaw / 100 : mddLimitRaw;
    const peakData = await env.USERS_KV.get('bot:peak_equity:' + email, { type: 'json' });
    if (!peakData || equity > peakData.peak) {
      await env.USERS_KV.put('bot:peak_equity:' + email, JSON.stringify({ peak: equity, date: new Date().toISOString() }));
    } else if (peakData.peak > 0 && (peakData.peak - equity) / peakData.peak >= mddLimit) {
      cfg.running = false;
      await env.USERS_KV.put('bot:config:' + email, JSON.stringify(cfg));
      await botNotify(env, { notifyEmail, notifyTelegram, telegramToken, telegramChatId, userEmail },
        `⚠️ Max drawdown ${(mddLimit*100).toFixed(0)}% reached ($${peakData.peak.toFixed(0)} → $${equity.toFixed(0)}). Bot stopped.`);
      await botLog(env, email, `MDD limit ${(mddLimit*100).toFixed(0)}% triggered: $${peakData.peak.toFixed(0)} → $${equity.toFixed(0)} — bot stopped`);
      return;
    }

    // ── Open positions ────────────────────────────────────────
    const posRes = await okxGet(apiKey, apiSecret, apiPassphrase, `/api/v5/account/positions?instId=${tradingPair}`, demoMode);
    const openPos = (posRes?.data || []).filter(p => parseFloat(p.pos) !== 0);

    // ── Position state (loaded before checkSL to prevent race condition) ────
    let ps = await env.USERS_KV.get('bot:position_state:' + email, { type: 'json' }) || {};

    // ── Stop loss / TP check ─────────────────────────────────
    const hadPosition = !!ps[stateKey]?.direction;
    await checkSL(env, email, apiKey, apiSecret, apiPassphrase, tradingPair, openPos, equity, lossLimitEnabled, lossLimitNorm, numEntries, today, demoMode, ps, stateKey);
    // If loss-limit fired this tick and closed the position, skip new entries until next cron
    if (hadPosition && !ps[stateKey]?.direction) return;

    // ── Fetch all candles in parallel ─────────────────────────
    const [candles1H, candles4H, candlesD, c5] = await Promise.all([
      getCandles(tradingPair, '1H', 100),
      getCandles(tradingPair, '4H', 100),
      getCandles(tradingPair, '1D', 60),
      getCandles(tradingPair, '5m', 25)
    ]);
    if (candles1H.length < 20 && candles4H.length < 20) {
      await botLog(env, email, `Skip: insufficient candle data (1H:${candles1H.length} 4H:${candles4H.length})`);
      return;
    }
    if (c5.length < 4) {
      await botLog(env, email, `Skip: insufficient 5m candles (got ${c5.length}, need 4)`);
      return;
    }
    const [currentPrice, ctVal] = await Promise.all([
      getTicker(tradingPair),
      getCtVal(tradingPair)
    ]);
    if (!currentPrice || currentPrice <= 0) {
      await botLog(env, email, `Skip: failed to fetch current price for ${tradingPair} (3 retries)`);
      return;
    }

    const trend   = detectTrend(candlesD, currentPrice);
    const sr1H    = candles1H.length >= 20 ? detectSR(candles1H) : { supports: [], resistances: [] };
    const sr4H    = candles4H.length >= 20 ? detectSR(candles4H) : { supports: [], resistances: [] };
    const srLevels  = gradeLevels(sr1H, sr4H);
    const rawVol    = detectVolumeZones(candles4H.length >= 20 ? candles4H : candles1H, currentPrice);
    const volLevels = filterVolBySR(rawVol, srLevels);
    const levels    = mergeLevels(srLevels, volLevels);
    if (!levels.supports.length && !levels.resistances.length) return;

    try {
      await env.USERS_KV.put('bot:market_data:' + email, JSON.stringify({
        price: currentPrice, trend: trend.dir, trendStrong: trend.strong, levels, updatedAt: Date.now()
      }), { expirationTtl: 300 });
    } catch {}

    // ── Sync position state with OKX ─────────────────────────
    if (ps[stateKey]?.direction) {
      const dir = ps[stateKey].direction;
      const matchingPos = openPos.find(p =>
        dir === 'long'  ? (p.posSide === 'long'  && parseFloat(p.pos) > 0) :
        dir === 'short' ? (p.posSide === 'short' && parseFloat(p.pos) !== 0) : false
      );
      if (!matchingPos) {
        if (ps[stateKey].tpAlgoId) await cancelSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, ps[stateKey].tpAlgoId, demoMode);
        if (ps[stateKey].slAlgoId) await cancelSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, ps[stateKey].slAlgoId, demoMode);
        await botLog(env, email, `[${strategy}] Sync: cleared ${tradingPair} state — position closed externally`);
        delete ps[stateKey];
        await env.USERS_KV.put('bot:position_state:' + email, JSON.stringify(ps));
      }
    }
    const state = ps[stateKey] || { entries: [], direction: null, takeProfit: null };

    // ── Trailing TP: 10% close at each subsequent S/R level ───
    if (state.halfClosed && state.lastTPLevel && openPos.length > 0) {
      const TOUCH = 0.004;
      const nextLv = state.direction === 'long'
        ? levels.resistances.find(r => r.price > state.lastTPLevel * 1.001 && Math.abs(currentPrice - r.price) / r.price <= TOUCH)
        : levels.supports.find(r =>   r.price < state.lastTPLevel * 0.999 && Math.abs(currentPrice - r.price) / r.price <= TOUCH);

      if (nextLv) {
        const totalSz = state.entries.reduce((s, e) => s + parseInt(e.sz), 0);
        const trailContracts = Math.max(1, Math.floor(totalSz * 0.10));
        const trailRes = await okxPost(apiKey, apiSecret, apiPassphrase, '/api/v5/trade/order', {
          instId: tradingPair, tdMode: 'cross',
          side:    state.direction === 'long' ? 'sell' : 'buy',
          posSide: state.direction === 'long' ? 'long'  : 'short',
          ordType: 'market', sz: String(trailContracts)
        }, demoMode);

        if (trailRes?.data?.[0]?.ordId) {
          // Fix: track actual remaining contracts (not just fraction) to avoid rounding drift
          const prevRemaining = state.remainingContracts ?? Math.max(1, Math.floor(totalSz / 2));
          const newRemaining  = Math.max(0, prevRemaining - trailContracts);
          const newRemFrac    = newRemaining / totalSz;

          if (state.tpAlgoId) await cancelSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, state.tpAlgoId, demoMode);
          state.lastTPLevel        = nextLv.price;
          state.remainingContracts = newRemaining;
          state.remainingFrac      = newRemFrac;
          state.tpAlgoId           = null;

          if (newRemaining <= 0) {
            delete ps[stateKey];
            await env.USERS_KV.put('bot:position_state:' + email, JSON.stringify(ps));
            await botLog(env, email, `[${strategy}] TRAIL +10% @ ${currentPrice} | L:${nextLv.price.toFixed(2)} — position fully closed`);
          } else {
            ps[stateKey] = state;
            await env.USERS_KV.put('bot:position_state:' + email, JSON.stringify(ps));
            await botLog(env, email, `[${strategy}] TRAIL +10% @ ${currentPrice} | L:${nextLv.price.toFixed(2)} | Rem:${newRemaining}cts`);
          }
        } else {
          await botLog(env, email, `Trail order FAILED @ ${nextLv.price.toFixed(2)}: ${trailRes?.msg || 'unknown'}`);
        }
        return;
      }
    }

    // ── Volatility gate ───────────────────────────────────────
    if (candles1H.length >= 20) {
      const slice20 = candles1H.slice(0, 20);
      const h1High  = Math.max(...slice20.map(c => parseFloat(c[2])));
      const h1Low   = Math.min(...slice20.map(c => parseFloat(c[3])));
      if ((h1High - h1Low) / (h1Low || 1) < 0.010) return;
    }

    // ── Funding rate gate + capture ──────────────────────────
    let capturedFR = null;
    try {
      const frRes  = await fetch(`${OKX_BASE}/api/v5/public/funding-rate?instId=${tradingPair}`);
      const frData = await frRes.json();
      if (!frData?.data?.[0]) throw new Error('empty funding rate response');
      capturedFR = parseFloat(frData.data[0].fundingRate);
      // Skip only if funding rate is truly extreme (> 0.3%/8h)
      if (strategy !== 'funding_rate' && Math.abs(capturedFR) > 0.003) {
        await botLog(env, email, `Skip: funding rate ${(capturedFR * 100).toFixed(4)}%/8h > 0.3% — no new entries`);
        return;
      }
    } catch(frErr) {
      // Don't block on funding rate fetch failure — log and continue
      await botLog(env, email, `Warn: could not fetch funding rate (${frErr.message}) — proceeding`);
    }

    // ── Plan-based strategy gate ──────────────────────────────
    const midStrategies     = ['ma_crossover', 'bb_reversion', 'breakout', 'ma_ribbon'];
    const premiumStrategies = ['macd_div', 'funding_rate', 'atr_trend'];
    if (midStrategies.includes(strategy) && plan === 'starter') {
      await botLog(env, email, `Skip: strategy '${strategy}' requires Pro plan or higher`);
      return;
    }
    if (premiumStrategies.includes(strategy) && plan !== 'elite') {
      await botLog(env, email, `Skip: strategy '${strategy}' requires Elite plan`);
      return;
    }

    // ── Entry signal (strategy routing) ──────────────────────
    let signal = null;
    switch (strategy) {
      case 'rsi_dca':      signal = detectSignalRSIDCA(candles1H, levels, currentPrice);             break;
      case 'ma_support':   signal = detectSignalMASupport(candles1H, currentPrice);                 break;
      case 'ma_crossover': signal = detectSignalMACrossover(c5, candles1H, currentPrice);           break;
      case 'bb_reversion': signal = detectSignalBBReversion(c5, currentPrice, trend);               break;
      case 'breakout':     signal = detectSignalBreakout(candles1H, c5, currentPrice);              break;
      case 'ma_ribbon':    signal = detectSignalMARibbon(candles1H, currentPrice);                  break;
      case 'macd_div':     signal = detectSignalMACDDiv(candles1H, c5, currentPrice);               break;
      case 'funding_rate': signal = detectSignalFundingRate(capturedFR, currentPrice, levels);      break;
      case 'atr_trend':    signal = detectSignalATRTrend(candles1H, c5, currentPrice);              break;
      default:             signal = detectSignal(c5, levels); // 'sr_bounce' or legacy 'daytrading'
    }
    if (!signal) {
      // Heartbeat: log once per 5 min so user can confirm bot is alive
      const hbKey = 'bot:hb:' + email + ':' + strategy;
      const lastHb = parseInt(await env.USERS_KV.get(hbKey) || '0');
      if (Date.now() - lastHb > 5 * 60 * 1000) {
        await botLog(env, email, `[${strategy}] Scan: $${currentPrice.toFixed(0)} — no entry signal`);
        await env.USERS_KV.put(hbKey, String(Date.now()));
      }
      return;
    }

    // ── Trend strength + direction filter ────────────────────
    // funding_rate and rsi_dca are contrarian/mean-reversion — skip trend direction filter
    const skipTrendFilter = strategy === 'funding_rate' || strategy === 'rsi_dca';
    if (!skipTrendFilter) {
      if (trend.dir === 'up'   && signal.type === 'short') { await botLog(env, email, `[${strategy}] Skip: trend UP but signal is SHORT`); return; }
      if (trend.dir === 'down' && signal.type === 'long')  { await botLog(env, email, `[${strategy}] Skip: trend DOWN but signal is LONG`); return; }
      if (!trend.strong && signal.grade === 'B') { await botLog(env, email, `[${strategy}] Skip: weak trend + B-grade signal`); return; }
    }

    // ── 1H confirmation for SHORT ─────────────────────────────
    if (signal.type === 'short') {
      const h1c    = candles1H[0]?.map(parseFloat);
      const h1Bear = h1c && h1c[4] < h1c[1];
      const h1NRes = sr1H.resistances.some(r => Math.abs(currentPrice - r.price) / r.price <= 0.015);
      if (!h1Bear && !h1NRes) return; // need at least one: bearish candle OR near resistance
    }

    if (state.direction && state.direction !== signal.type) return;

    const entryNum = (state.entries || []).length + 1;
    if (entryNum > parseInt(numEntries)) return;

    if (entryNum > 1 && state.entries.length > 0) {
      const firstEntry = state.entries[0].price;
      const storedSL   = state.stopLoss || signal.stopLoss;
      const totalZone  = Math.abs(firstEntry - storedSL);
      if (totalZone > 0) {
        const gap = totalZone / Math.max(parseInt(numEntries) - 1, 1);
        const expectedPx = signal.type === 'long'
          ? firstEntry - gap * (entryNum - 1)
          : firstEntry + gap * (entryNum - 1);
        if (Math.abs(currentPrice - expectedPx) > gap * 0.6) {
          await botLog(env, email, `DCA #${entryNum} skip: price ${currentPrice.toFixed(2)} not near expected ${expectedPx.toFixed(2)} (±${(gap * 0.6).toFixed(2)})`);
          return;
        }
      }
    }

    // ── TP = next S/R level in trade direction (RSI DCA uses fixed 1.5% fallback) ────
    let tp = signal.type === 'long'
      ? levels.resistances[0]?.price
      : levels.supports[0]?.price;
    if (strategy === 'rsi_dca') {
      const fixedTP = signal.type === 'long'
        ? currentPrice * 1.015
        : currentPrice * 0.985;
      tp = (tp && signal.type === 'long' ? Math.max(tp, fixedTP) : tp && Math.min(tp, fixedTP)) || fixedTP;
    }
    const useTP = tp && (signal.type === 'long' ? tp > currentPrice * 1.003 : tp < currentPrice * 0.997);

    // ── R:R filter ───────────────────────────────────────────
    const slDistRR = Math.abs(currentPrice - signal.stopLoss) / currentPrice;
    const tpDistRR = useTP ? Math.abs(tp - currentPrice) / currentPrice : 0;
    const minRR = strategy === 'rsi_dca' ? 0.8 : 1.0;
    if (!useTP || tpDistRR / slDistRR < minRR) {
      await botLog(env, email, `Skip: R:R ${useTP ? (tpDistRR / slDistRR).toFixed(2) : 'n/a'}:1 < ${minRR} | TP:${tp?.toFixed(0) ?? 'none'} SL:${signal.stopLoss.toFixed(0)}`);
      return;
    }

    // ── Fixed Fractional position sizing ─────────────────────
    const riskPct  = parseFloat(riskPerTrade) / 100;
    if (riskPct > 0.05 || safeLeverage > 20) {
      await botLog(env, email, `⚠️ Risk warning: riskPerTrade=${(riskPct*100).toFixed(1)}% lev=${safeLeverage}x`);
    }
    const nEntries  = parseInt(numEntries);
    const slDist    = Math.abs(currentPrice - signal.stopLoss);        // price distance to SL
    const riskPerCt = slDist * ctVal;                                  // USD loss per contract if SL hit (leverage-independent)
    let totalCts    = riskPerCt > 0 ? Math.floor((equity * riskPct) / riskPerCt) : 0;
    // Leverage-aware cap: margin required per contract = contractValue / leverage
    const capCts    = Math.floor(equity * (posSize / 100) * safeLeverage / (currentPrice * ctVal));
    if (capCts < 1) {
      await botLog(env, email, `Skip: insufficient equity for 1 contract (equity=${equity.toFixed(0)} USDT, need ≥${(currentPrice * ctVal / safeLeverage).toFixed(0)} USDT margin/ct)`);
      return;
    }
    totalCts        = Math.max(nEntries, Math.min(totalCts, capCts));  // at least 1 per entry, capped by posSize

    let szContracts;
    if (entrySizing === 'martingale' && entryNum > 1) {
      const base = Math.max(1, Math.floor(totalCts / nEntries));
      szContracts = base * Math.pow(2, entryNum - 1);
      szContracts = Math.min(szContracts, Math.floor(equity * 0.40 * safeLeverage / (currentPrice * ctVal)));
      await botLog(env, email, `⚠️ MARTINGALE #${entryNum}: ${Math.pow(2, entryNum-1)}× size (${szContracts} cts) — high risk`);
    } else if (entrySizing === 'weighted' && nEntries >= 2) {
      const weights = Array.from({ length: nEntries }, (_, i) => i === 0 ? 1 : 2);
      const totalW  = weights.reduce((a, b) => a + b, 0);
      szContracts   = Math.max(1, Math.floor(totalCts * weights[entryNum - 1] / totalW));
    } else {
      szContracts = Math.max(1, Math.floor(totalCts / nEntries));
    }
    if (szContracts < 1) {
      await botLog(env, email, `Skip: position too small (< 1 contract): risk=${(riskPct*100).toFixed(1)}% SL-dist=${slDist.toFixed(2)}`);
      return;
    }
    const sz = String(szContracts);

    // ── Set OKX leverage (capped at 50x, first entry only) ───
    if (entryNum === 1) {
      const levRes = await okxPost(apiKey, apiSecret, apiPassphrase, '/api/v5/account/set-leverage', {
        instId: tradingPair, lever: String(safeLeverage), mgnMode: 'cross'
      }, demoMode);
      if (levRes?.code !== '0') {
        await botLog(env, email, `⚠️ Leverage set FAILED [${levRes?.code}]: ${levRes?.msg} — aborting entry`);
        return;
      }
    }

    // ── Entry lock: prevent duplicate orders from concurrent cron instances ──
    const lockKey = 'bot:entry_lock:' + email + ':' + tradingPair;
    const existingLock = await env.USERS_KV.get(lockKey);
    if (existingLock) {
      await botLog(env, email, `Skip: entry lock active — concurrent execution prevented`);
      return;
    }
    await env.USERS_KV.put(lockKey, '1', { expirationTtl: 60 });

    // ── Place market order ────────────────────────────────────
    // Try hedge mode first, fall back to one-way (net) if account is in one-way mode
    let orderRes = await okxPost(apiKey, apiSecret, apiPassphrase, '/api/v5/trade/order', {
      instId: tradingPair, tdMode: 'cross',
      side: signal.type === 'long' ? 'buy' : 'sell',
      posSide: signal.type === 'long' ? 'long' : 'short',
      ordType: 'market', sz
    }, demoMode);

    // If hedge mode rejected (position mode mismatch), retry without posSide (one-way mode)
    if (orderRes?.code !== '0' && !orderRes?.data?.[0]?.ordId) {
      const sCode = orderRes?.data?.[0]?.sCode || orderRes?.code;
      if (sCode === '51000' || sCode === '51006' || sCode === 1 || sCode === '1') {
        orderRes = await okxPost(apiKey, apiSecret, apiPassphrase, '/api/v5/trade/order', {
          instId: tradingPair, tdMode: 'cross',
          side: signal.type === 'long' ? 'buy' : 'sell',
          ordType: 'market', sz
        }, demoMode);
      }
    }

    if (orderRes?.data?.[0]?.ordId) {
      const { price: fillPrice, filledSz, confirmed: fillConfirmed } = await queryFillPrice(apiKey, apiSecret, apiPassphrase, tradingPair, orderRes.data[0].ordId, currentPrice, szContracts, demoMode);
      if (!fillConfirmed) {
        await env.USERS_KV.delete(lockKey).catch(() => {});
        await okxPost(apiKey, apiSecret, apiPassphrase, '/api/v5/trade/close-position', {
          instId: tradingPair, mgnMode: 'cross',
          posSide: signal.type === 'long' ? 'long' : 'short'
        }, demoMode);
        await botLog(env, email, `Fill unconfirmed — position closed for safety`);
        return;
      }
      // Partial fill guard: if less than 90% filled, don't track — state mismatch risk
      if (filledSz < szContracts * 0.90) {
        await env.USERS_KV.delete(lockKey).catch(() => {});
        await botLog(env, email, `Partial fill: ${filledSz}/${szContracts} contracts — skipping state update`);
        return;
      }
      const actualSz = String(Math.floor(filledSz));
      state.entries.push({ price: fillPrice, sz: actualSz, time: Date.now(), entry: entryNum });
      state.direction = signal.type;
      if (useTP) state.takeProfit = tp;
      if (entryNum === 1) state.stopLoss = signal.stopLoss;

      if (state.tpAlgoId) await cancelSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, state.tpAlgoId, demoMode);
      if (state.slAlgoId) await cancelSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, state.slAlgoId, demoMode);
      state.slAlgoId = null;
      const accumSz = String(state.entries.reduce((s, e) => s + parseInt(e.sz), 0));

      // Native TP + SL algos: exchange-level protection if cron stops running
      state.tpAlgoId = null;
      state.slAlgoId = null;
      if (useTP) {
        const safetyTpPx = signal.type === 'long'
          ? (tp * 1.003).toFixed(2)
          : (tp * 0.997).toFixed(2);
        const tpAlgoRes = await okxPost(apiKey, apiSecret, apiPassphrase, '/api/v5/trade/order-algo', {
          instId: tradingPair, tdMode: 'cross',
          side:    signal.type === 'long' ? 'sell' : 'buy',
          posSide: signal.type === 'long' ? 'long'  : 'short',
          ordType: 'conditional', sz: accumSz,
          tpTriggerPx: safetyTpPx, tpOrdPx: '-1'
        }, demoMode);
        state.tpAlgoId = tpAlgoRes?.data?.[0]?.algoId ? String(tpAlgoRes.data[0].algoId) : null;
      }
      const slAlgoRes = await placeSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, signal.type, state.stopLoss || signal.stopLoss, accumSz, demoMode);
      state.slAlgoId = slAlgoRes?.data?.[0]?.algoId ? String(slAlgoRes.data[0].algoId) : null;
      if (!state.slAlgoId) await botLog(env, email, '⚠️ Native SL algo failed — SL is software-only this tick');

      ps[stateKey] = state;
      try {
        await env.USERS_KV.put('bot:position_state:' + email, JSON.stringify(ps));
        await env.USERS_KV.delete(lockKey).catch(() => {}); // release lock only after state saved
      } catch(kvErr) {
        // If KV write fails, cancel TP/SL algos AND close the position to prevent an orphan
        if (state.tpAlgoId) await cancelSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, state.tpAlgoId, demoMode);
        if (state.slAlgoId) await cancelSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, state.slAlgoId, demoMode);
        await okxPost(apiKey, apiSecret, apiPassphrase, '/api/v5/trade/close-position', {
          instId: tradingPair, mgnMode: 'cross',
          posSide: signal.type === 'long' ? 'long' : 'short'
        }, demoMode);
        await botLog(env, email, `[${strategy}] KV write failed — position closed to prevent orphan: ${kvErr.message}`);
        return;
      }

      const tpStr    = useTP ? ` | TP:${tp.toFixed(2)}` : '';
      const gradeStr = signal.grade ? `[Grade ${signal.grade}] ` : '';
      const trendStr = trend.dir !== 'neutral' ? ` | trend:${trend.dir}${trend.strong ? '' : '(w)'}` : '';
      const riskStr  = `risk:${(lossLimitNorm*100).toFixed(0)}%@${numEntries}x`;
      await botLog(env, email, `[${strategy}] ${signal.type.toUpperCase()} #${entryNum}/${numEntries} @ ${fillPrice} | ${gradeStr}L:${signal.level.toFixed(2)} | ${riskStr}${tpStr}${trendStr} | sz:${sz}`);
      await botNotify(env, { notifyEmail, notifyTelegram, telegramToken, telegramChatId, userEmail },
        `${signal.type.toUpperCase()} entry #${entryNum} placed @ ${fillPrice} USDT${tpStr}`);
    } else {
      const errCode = orderRes?.data?.[0]?.sCode || orderRes?.code || '?';
      const errMsg  = orderRes?.data?.[0]?.sMsg || orderRes?.msg || 'unknown';
      await botLog(env, email, `Order FAILED [${errCode}]: ${signal.type.toUpperCase()} @ ${currentPrice} — ${errMsg}`);
    }

  } catch(e) {
    await botLog(env, email, 'Bot error: ' + e.message);
  }
}

// ── STOP LOSS / TP CHECK ──────────────────────────────────────
async function checkSL(env, email, apiKey, secret, pass, pair, openPos, equity, lossLimitEnabled, lossLimitNorm, numEntries, today, demo, ps, stateKey) {
  const actualKey = stateKey || pair;
  const state = ps[actualKey];
  if (!state?.direction) return;
  if (!state.entries?.length) return;

  // ── TP check (software backup to native TP algo) ──────────
  if (state.takeProfit && openPos.length > 0 && !state.halfClosed) {
    let price = 0;
    try {
      const tkRes = await fetch(`${OKX_BASE}/api/v5/market/ticker?instId=${pair}`);
      const tk = await tkRes.json();
      price = parseFloat(tk?.data?.[0]?.last || '0');
    } catch(e) {
      await botLog(env, email, `checkSL: ticker fetch failed for ${pair} — ${e.message}`);
    }
    if (price > 0) {
      const tpHit = state.direction === 'long' ? price >= state.takeProfit : price <= state.takeProfit;
      if (tpHit) {
        const totalSz       = state.entries.reduce((sum, e) => sum + parseInt(e.sz), 0);
        const halfContracts = Math.max(1, Math.floor(totalSz / 2));
        const avgEntry      = state.entries.reduce((sum, e) => sum + e.price * parseInt(e.sz), 0) / totalSz;

        const tpCloseRes = await okxPost(apiKey, secret, pass, '/api/v5/trade/order', {
          instId: pair, tdMode: 'cross',
          side:    state.direction === 'long' ? 'sell' : 'buy',
          posSide: state.direction === 'long' ? 'long' : 'short',
          ordType: 'market', sz: String(halfContracts)
        }, demo);
        if (!tpCloseRes?.data?.[0]?.ordId) {
          await botLog(env, email, `TP close FAILED [${tpCloseRes?.code}]: ${tpCloseRes?.msg} — algos preserved`);
          return;
        }

        if (state.tpAlgoId) await cancelSLAlgo(apiKey, secret, pass, pair, state.tpAlgoId, demo);
        if (state.slAlgoId) await cancelSLAlgo(apiKey, secret, pass, pair, state.slAlgoId, demo);
        const remContracts = Math.max(0, totalSz - halfContracts);

        state.halfClosed         = true;
        state.takeProfit         = null;
        state.lastTPLevel        = price;
        state.remainingContracts = remContracts;
        state.remainingFrac      = remContracts > 0 ? remContracts / totalSz : 0;
        state.tpAlgoId           = null;
        state.slAlgoId           = null;
        ps[actualKey] = state;
        await env.USERS_KV.put('bot:position_state:' + email, JSON.stringify(ps));
        await botLog(env, email, `TP hit @ ${price} — 50% closed | trailing 10% active`);
        return;
      }
    }
  }

  // ── Loss-limit SL: activates only after all entries placed ─
  if (!lossLimitEnabled || !openPos.length) return;
  if ((state.entries?.length || 0) < parseInt(numEntries)) return;

  const floatPnl     = openPos.reduce((s, p) => s + parseFloat(p.upl || '0'), 0);
  const floatLossPct = floatPnl < 0 ? Math.abs(floatPnl) / (equity || 1) : 0;
  const dl           = await env.USERS_KV.get('bot:daily_loss:' + email + ':' + today, { type: 'json' }) || { pct: 0 };
  const totalLossPct = (dl.pct || 0) + floatLossPct;

  if (totalLossPct < lossLimitNorm) return;

  const closeRes = await okxPost(apiKey, secret, pass, '/api/v5/trade/close-position', {
    instId: pair, mgnMode: 'cross',
    posSide: state.direction === 'long' ? 'long' : 'short'
  }, demo);
  if (closeRes?.code !== '0') {
    await botLog(env, email, `close-position FAILED [${closeRes?.code}]: ${closeRes?.msg} — retrying next tick`);
    return;
  }

  if (state.tpAlgoId) await cancelSLAlgo(apiKey, secret, pass, pair, state.tpAlgoId, demo);
  if (state.slAlgoId) await cancelSLAlgo(apiKey, secret, pass, pair, state.slAlgoId, demo);

  dl.pct = totalLossPct;
  await env.USERS_KV.put('bot:daily_loss:' + email + ':' + today, JSON.stringify(dl), { expirationTtl: 86400 });
  delete ps[actualKey];
  await env.USERS_KV.put('bot:position_state:' + email, JSON.stringify(ps));
  await botLog(env, email, `Loss limit ${(totalLossPct*100).toFixed(2)}% reached (float: ${(floatLossPct*100).toFixed(2)}%) — position closed`);
}

// ════════════════════════════════════════════════════════════
// INDICATORS
// ════════════════════════════════════════════════════════════

function _ema(closes, period) {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let e = closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < closes.length; i++) e = closes[i] * k + e * (1 - k);
  return e;
}

function _sma(closes, period) {
  if (closes.length < period) return null;
  return closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
}

function calcRSI(candles, period = 14) {
  const closes = candles.map(c => parseFloat(c[4])).reverse(); // oldest first
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgG = gains / period, avgL = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (period - 1) + Math.max(0, d)) / period;
    avgL = (avgL * (period - 1) + Math.max(0, -d)) / period;
  }
  if (avgL === 0) return 100;
  return 100 - 100 / (1 + avgG / avgL);
}

function calcBB(candles, period = 20, mult = 2) {
  const closes = candles.map(c => parseFloat(c[4]));
  if (closes.length < period) return null;
  const slice = closes.slice(0, period);
  const mid = slice.reduce((s, v) => s + v, 0) / period;
  const std = Math.sqrt(slice.reduce((s, v) => s + (v - mid) ** 2, 0) / period);
  return { upper: mid + mult * std, mid, lower: mid - mult * std };
}

function calcMACD(candles, fast = 12, slow = 26, sig = 9) {
  const closes = candles.map(c => parseFloat(c[4])).reverse(); // oldest first
  if (closes.length < slow + sig + 2) return null;

  // Build MACD line in O(N) with running EMAs
  const kF = 2 / (fast + 1), kS = 2 / (slow + 1);
  let eF = 0, eS = 0;
  const macdArr = [];
  for (let i = 0; i < closes.length; i++) {
    eF = i < fast ? (eF * i + closes[i]) / (i + 1) : closes[i] * kF + eF * (1 - kF);
    eS = i < slow ? (eS * i + closes[i]) / (i + 1) : closes[i] * kS + eS * (1 - kS);
    if (i >= slow - 1) macdArr.push(eF - eS);
  }
  if (macdArr.length < sig + 2) return null;

  // Signal line: single forward pass — prevSigEMA is the exact prior bar value
  const kSig = 2 / (sig + 1);
  let sigEMA = macdArr.slice(0, sig).reduce((s, v) => s + v, 0) / sig;
  let prevSigEMA = sigEMA;
  for (let i = sig; i < macdArr.length; i++) {
    prevSigEMA = sigEMA;
    sigEMA = macdArr[i] * kSig + sigEMA * (1 - kSig);
  }
  return {
    histogram:     macdArr[macdArr.length - 1] - sigEMA,
    prevHistogram: macdArr[macdArr.length - 2] - prevSigEMA
  };
}

function calcATR(candles, period = 14) {
  if (candles.length < period + 1) return null;
  let tr = 0;
  for (let i = 0; i < period; i++) {
    const hi = parseFloat(candles[i][2]), lo = parseFloat(candles[i][3]);
    const pc = parseFloat(candles[i + 1][4]);
    tr += Math.max(hi - lo, Math.abs(hi - pc), Math.abs(lo - pc));
  }
  return tr / period;
}

function calcADX(candles, period = 14) {
  if (candles.length < period * 2 + 1) return null;
  const c = candles.slice().reverse(); // oldest-first
  const wk = 1 / period; // Wilder smoothing

  let smTR = 0, smPDM = 0, smNDM = 0;
  for (let i = 1; i <= period; i++) {
    const hi = parseFloat(c[i][2]), lo = parseFloat(c[i][3]), pc = parseFloat(c[i-1][4]);
    smTR  += Math.max(hi - lo, Math.abs(hi - pc), Math.abs(lo - pc));
    const up = hi - parseFloat(c[i-1][2]), dn = parseFloat(c[i-1][3]) - lo;
    smPDM += (up > dn && up > 0) ? up : 0;
    smNDM += (dn > up && dn > 0) ? dn : 0;
  }
  let pDI = smTR > 0 ? 100 * smPDM / smTR : 0;
  let nDI = smTR > 0 ? 100 * smNDM / smTR : 0;
  let adx  = (pDI + nDI) > 0 ? Math.abs(pDI - nDI) / (pDI + nDI) * 100 : 0;

  for (let i = period + 1; i < c.length; i++) {
    const hi = parseFloat(c[i][2]), lo = parseFloat(c[i][3]), pc = parseFloat(c[i-1][4]);
    const tr = Math.max(hi - lo, Math.abs(hi - pc), Math.abs(lo - pc));
    const up = hi - parseFloat(c[i-1][2]), dn = parseFloat(c[i-1][3]) - lo;
    smTR  = smTR  * (1 - wk) + tr;
    smPDM = smPDM * (1 - wk) + ((up > dn && up > 0) ? up : 0);
    smNDM = smNDM * (1 - wk) + ((dn > up && dn > 0) ? dn : 0);
    pDI = smTR > 0 ? 100 * smPDM / smTR : 0;
    nDI = smTR > 0 ? 100 * smNDM / smTR : 0;
    const dx = (pDI + nDI) > 0 ? Math.abs(pDI - nDI) / (pDI + nDI) * 100 : 0;
    adx = adx * (1 - wk) + dx * wk;
  }
  return { adx, plusDI: pDI, minusDI: nDI };
}

// ════════════════════════════════════════════════════════════
// STRATEGY SIGNAL FUNCTIONS
// ════════════════════════════════════════════════════════════

function detectSignalRSIDCA(candles1H, levels, currentPrice) {
  const rsi = calcRSI(candles1H, 14);
  if (!rsi) return null;
  const px = currentPrice || parseFloat(candles1H[0][4]);

  // LONG: oversold (RSI < 40)
  if (rsi < 40) {
    const swingLow = Math.min(...candles1H.slice(0, 5).map(c => parseFloat(c[3])));
    const slDist = (px - swingLow) / px;
    if (slDist >= 0.005 && slDist <= 0.10) {
      const support = levels.supports[0];
      return { type: 'long', level: support?.price || px, grade: rsi < 30 ? 'S' : 'A', stopLoss: swingLow, strategy: 'rsi_dca' };
    }
  }

  // SHORT: overbought (RSI > 65)
  if (rsi > 65) {
    const swingHigh = Math.max(...candles1H.slice(0, 5).map(c => parseFloat(c[2])));
    const slDist = (swingHigh - px) / px;
    if (slDist >= 0.005 && slDist <= 0.10) {
      const resistance = levels.resistances[0];
      return { type: 'short', level: resistance?.price || px, grade: rsi > 75 ? 'S' : 'A', stopLoss: swingHigh, strategy: 'rsi_dca' };
    }
  }

  return null;
}

function detectSignalMASupport(candles1H, currentPrice) {
  const closes = candles1H.map(c => parseFloat(c[4]));
  const periods = [10, 20, 34, 50, 100, 200];
  const mas = periods.map(p => ({ p, v: _sma(closes, p) })).filter(m => m.v && m.v < currentPrice);
  if (mas.length < 3) return null;
  const nearMA = mas.find(m => Math.abs(currentPrice - m.v) / currentPrice <= 0.005);
  if (!nearMA) return null;
  const swingLow = Math.min(...candles1H.slice(0, 5).map(c => parseFloat(c[3])));
  const slDist = (currentPrice - swingLow) / currentPrice;
  if (slDist < 0.005 || slDist > 0.12) return null;
  return { type: 'long', level: nearMA.v, grade: 'A', stopLoss: swingLow, strategy: 'ma_support' };
}

function detectSignalMACrossover(candles5m, candles1H, currentPrice) {
  const closes = candles1H.map(c => parseFloat(c[4])).reverse(); // oldest-first for EMA
  if (closes.length < 36) return null;
  const ema10c = _ema(closes, 10), ema34c = _ema(closes, 34);
  const ema10p = _ema(closes.slice(0, closes.length - 1), 10), ema34p = _ema(closes.slice(0, closes.length - 1), 34);
  if (!ema10c || !ema34c || !ema10p || !ema34p) return null;
  const rsi = calcRSI(candles1H, 14);
  if (!rsi) return null;
  const lows5m  = candles5m.slice(0, 4).map(c => parseFloat(c[3]));
  const highs5m = candles5m.slice(0, 4).map(c => parseFloat(c[2]));
  if (ema10c > ema34c && ema10p <= ema34p && rsi >= 50 && rsi < 70) {
    const sl = Math.min(...lows5m);
    const d = (currentPrice - sl) / currentPrice;
    if (d < 0.005 || d > 0.10) return null;
    return { type: 'long', level: ema10c, grade: 'A', stopLoss: sl, strategy: 'ma_crossover' };
  }
  if (ema10c < ema34c && ema10p >= ema34p && rsi <= 50 && rsi > 30) {
    const sl = Math.max(...highs5m);
    const d = (sl - currentPrice) / currentPrice;
    if (d < 0.005 || d > 0.10) return null;
    return { type: 'short', level: ema10c, grade: 'A', stopLoss: sl, strategy: 'ma_crossover' };
  }
  return null;
}

function detectSignalBBReversion(candles5m, currentPrice, trend) {
  const bb = calcBB(candles5m, 20, 2);
  if (!bb) return null;
  if (candles5m.length < 3) return null;
  const prev = candles5m[1].map(parseFloat), cur = candles5m[0].map(parseFloat);
  if (prev[4] < bb.lower && cur[4] > bb.lower && trend.dir !== 'down') {
    const sl = Math.min(...candles5m.slice(0, 4).map(c => parseFloat(c[3])));
    const d = (currentPrice - sl) / currentPrice;
    if (d < 0.005 || d > 0.12) return null;
    return { type: 'long', level: bb.lower, grade: 'A', stopLoss: sl, strategy: 'bb_reversion' };
  }
  if (prev[4] > bb.upper && cur[4] < bb.upper && trend.dir !== 'up') {
    const sl = Math.max(...candles5m.slice(0, 4).map(c => parseFloat(c[2])));
    const d = (sl - currentPrice) / currentPrice;
    if (d < 0.005 || d > 0.12) return null;
    return { type: 'short', level: bb.upper, grade: 'A', stopLoss: sl, strategy: 'bb_reversion' };
  }
  return null;
}

function detectSignalBreakout(candles1H, candles5m, currentPrice) {
  if (candles1H.length < 22 || candles5m.length < 22) return null;
  const res20  = Math.max(...candles1H.slice(1, 21).map(c => parseFloat(c[2])));
  const sup20  = Math.min(...candles1H.slice(1, 21).map(c => parseFloat(c[3])));
  const prev5m = candles5m[1]?.map(parseFloat);
  const cur5m  = candles5m[0]?.map(parseFloat);
  if (!prev5m || !cur5m) return null;
  const avgVol = candles5m.slice(1, 21).map(c => parseFloat(c[5])).reduce((s, v) => s + v, 0) / 20;
  if (parseFloat(cur5m[5]) < avgVol * 1.5) return null;

  if (prev5m[4] <= res20 && currentPrice > res20 * 1.001) {
    const sl = prev5m[3];
    const d = (currentPrice - sl) / currentPrice;
    if (d < 0.003 || d > 0.08) return null;
    return { type: 'long', level: res20, grade: 'S', stopLoss: sl, strategy: 'breakout' };
  }
  if (prev5m[4] >= sup20 && currentPrice < sup20 * 0.999) {
    const sl = prev5m[2];  // prev candle high is SL for short breakdown
    const d = (sl - currentPrice) / currentPrice;
    if (d < 0.003 || d > 0.08) return null;
    return { type: 'short', level: sup20, grade: 'S', stopLoss: sl, strategy: 'breakout' };
  }
  return null;
}

function detectSignalMARibbon(candles1H, currentPrice) {
  const closes = candles1H.map(c => parseFloat(c[4]));
  // Only require 4 core MAs to be aligned (drop 100/200 — too slow for daily signals)
  const mas = [10, 20, 50, 100].map(p => ({ p, v: _sma(closes, p) })).filter(m => m.v);
  if (mas.length < 4) return null;
  const sorted = [...mas].sort((a, b) => a.p - b.p); // ascending period
  // Bullish: price > MA10 > MA20 > MA50 > MA100
  const bullish = currentPrice > sorted[0].v && sorted.every((m, i) => i === 0 || sorted[i-1].v > m.v);
  // Bearish: price < MA10 < MA20 < MA50 < MA100
  const bearish = currentPrice < sorted[0].v && sorted.every((m, i) => i === 0 || sorted[i-1].v < m.v);
  if (!bullish && !bearish) return null;
  // Price within 1% of fastest MA (pullback entry)
  if (Math.abs(currentPrice - sorted[0].v) / currentPrice > 0.010) return null;
  const sl = bullish
    ? Math.min(...candles1H.slice(0, 5).map(c => parseFloat(c[3])))
    : Math.max(...candles1H.slice(0, 5).map(c => parseFloat(c[2])));
  const d = Math.abs(currentPrice - sl) / currentPrice;
  if (d < 0.005 || d > 0.12) return null;
  return bullish
    ? { type: 'long',  level: sorted[0].v, grade: 'A', stopLoss: sl, strategy: 'ma_ribbon' }
    : { type: 'short', level: sorted[0].v, grade: 'A', stopLoss: sl, strategy: 'ma_ribbon' };
}

function detectSignalMACDDiv(candles1H, candles5m, currentPrice) {
  const macdData = calcMACD(candles1H);
  const rsi = calcRSI(candles1H, 14);
  if (!macdData || !rsi) return null;
  const lows  = candles1H.slice(0, 10).map(c => parseFloat(c[3]));
  const highs = candles1H.slice(0, 10).map(c => parseFloat(c[2]));
  const nearLow  = Math.abs(currentPrice - Math.min(...lows))  / currentPrice <= 0.02;
  const nearHigh = Math.abs(currentPrice - Math.max(...highs)) / currentPrice <= 0.02;
  if (nearLow && macdData.histogram > macdData.prevHistogram && rsi > 40) {
    const sl = Math.min(...candles5m.slice(0, 4).map(c => parseFloat(c[3])));
    const d = (currentPrice - sl) / currentPrice;
    if (d < 0.005 || d > 0.12) return null;
    return { type: 'long', level: currentPrice, grade: 'A', stopLoss: sl, strategy: 'macd_div' };
  }
  if (nearHigh && macdData.histogram < macdData.prevHistogram && rsi < 60) {
    const sl = Math.max(...candles5m.slice(0, 4).map(c => parseFloat(c[2])));
    const d = (sl - currentPrice) / currentPrice;
    if (d < 0.005 || d > 0.12) return null;
    return { type: 'short', level: currentPrice, grade: 'A', stopLoss: sl, strategy: 'macd_div' };
  }
  return null;
}

function detectSignalFundingRate(fr, currentPrice, levels) {
  if (fr === null || fr === undefined) return null;
  if (fr >= 0.001) {
    const sl = currentPrice * 1.025;
    return { type: 'short', level: currentPrice, grade: 'A', stopLoss: sl, strategy: 'funding_rate' };
  }
  if (fr <= -0.0005) {
    const sl = currentPrice * 0.975;
    return { type: 'long', level: currentPrice, grade: 'A', stopLoss: sl, strategy: 'funding_rate' };
  }
  return null;
}

function detectSignalATRTrend(candles1H, candles5m, currentPrice) {
  if (candles1H.length < 60) return null;
  const adxData = calcADX(candles1H, 14);
  if (!adxData || adxData.adx < 25) return null;
  const closes = candles1H.map(c => parseFloat(c[4]));
  const sma50  = _sma(closes, 50);
  const atr    = calcATR(candles1H, 14);
  if (!sma50 || !atr) return null;

  if (currentPrice > sma50 && adxData.plusDI > adxData.minusDI) {
    const recentHigh = Math.max(...candles1H.slice(0, 5).map(c => parseFloat(c[2])));
    const pullback = recentHigh - currentPrice;
    if (pullback < atr * 0.5 || pullback > atr * 2.0) return null;
    const sl = currentPrice - atr * 1.5;
    const d = (currentPrice - sl) / currentPrice;
    if (d < 0.005 || d > 0.12) return null;
    return { type: 'long', level: currentPrice, grade: 'A', stopLoss: sl, strategy: 'atr_trend' };
  }
  if (currentPrice < sma50 && adxData.minusDI > adxData.plusDI) {
    const recentLow = Math.min(...candles1H.slice(0, 5).map(c => parseFloat(c[3])));
    const bounce = currentPrice - recentLow;
    if (bounce < atr * 0.5 || bounce > atr * 2.0) return null;
    const sl = currentPrice + atr * 1.5;
    const d = (sl - currentPrice) / currentPrice;
    if (d < 0.005 || d > 0.12) return null;
    return { type: 'short', level: currentPrice, grade: 'A', stopLoss: sl, strategy: 'atr_trend' };
  }
  return null;
}

// ── DAILY TREND FILTER (EMA20 / EMA50) ───────────────────────
function detectTrend(candles, currentPrice) {
  if (candles.length < 55) return { dir: 'neutral', strong: false };
  const closes   = candles.slice(0, 55).map(c => parseFloat(c[4])).reverse();
  const closes5  = candles.slice(5, 60).map(c => parseFloat(c[4])).reverse();
  const ema20    = calcEMA(closes, 20);
  const ema50    = calcEMA(closes, 50);
  if (!ema20 || !ema50) return { dir: 'neutral', strong: false };
  const ema20_5  = closes5.length >= 20 ? calcEMA(closes5, 20) : ema20;

  const slope  = Math.abs(ema20 - ema20_5) / (ema20_5 || 1);
  const spread = Math.abs(ema20 - ema50)   / (ema50   || 1);
  const strong = slope > 0.002 && spread > 0.008;

  let dir;
  if (currentPrice > ema20 && ema20 > ema50)      dir = 'up';
  else if (currentPrice < ema20 && ema20 < ema50) dir = 'down';
  else                                              dir = 'neutral';

  return { dir, strong };
}

function calcEMA(closes, period) {
  if (!closes.length || closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

// ── S/R DETECTION ─────────────────────────────────────────────
function detectSR(candles) {
  const RECENT_N = 20;
  const MAX_AGE  = 100;
  const TOL      = 0.003;

  const activeCandles = candles.slice(0, MAX_AGE);
  const currentPrice  = parseFloat(candles[0][4]);
  const levels        = [];
  const seen          = new Set();

  const priceStep = currentPrice * TOL;
  const prices = activeCandles.flatMap(c => [parseFloat(c[2]), parseFloat(c[3])]);

  for (const p of prices) {
    const bucket = Math.round(p / priceStep);
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

    if (sup + res >= 2) {
      // Fix: a level with nearly equal sup/res touches is a flip zone — include in both
      const type = sup >= res ? 'support' : 'resistance';
      levels.push({ price: p, touches: sup + res, recentTouches, type });
      // If touches are close (flip level), add as both types
      if (sup > 0 && res > 0 && Math.abs(sup - res) <= 1) {
        levels.push({ price: p, touches: sup + res, recentTouches, type: type === 'support' ? 'resistance' : 'support' });
      }
    }
  }

  return {
    supports:    levels.filter(l => l.type === 'support'    && l.price <= currentPrice * 1.005)
                       .sort((a, b) => b.price - a.price).slice(0, 4),
    resistances: levels.filter(l => l.type === 'resistance' && l.price >= currentPrice * 0.995)
                       .sort((a, b) => a.price - b.price).slice(0, 4)
  };
}

// ── GRADE LEVELS: S/A/B tier ──────────────────────────────────
function gradeLevels(sr1H, sr4H) {
  const CONFLUENT_TOL = 0.005;
  const result = [];

  for (const lv4 of [...sr4H.supports, ...sr4H.resistances]) {
    const match1H = [...sr1H.supports, ...sr1H.resistances].find(
      l => Math.abs(l.price - lv4.price) / lv4.price <= CONFLUENT_TOL && l.type === lv4.type
    );
    let grade;
    if (match1H) {
      grade = 'S';
    } else if (lv4.touches >= 4 || lv4.recentTouches >= 1) {
      grade = 'A';
    } else {
      grade = 'B';
    }
    result.push({ ...lv4, grade });
  }

  for (const lv1 of [...sr1H.supports, ...sr1H.resistances]) {
    const already = result.some(
      r => Math.abs(r.price - lv1.price) / lv1.price <= CONFLUENT_TOL && r.type === lv1.type
    );
    if (already) continue;
    const grade = lv1.recentTouches >= 1 ? 'A' : 'B';
    result.push({ ...lv1, grade });
  }

  return {
    supports:    result.filter(l => l.type === 'support').sort((a, b) => b.price - a.price).slice(0, 5),
    resistances: result.filter(l => l.type === 'resistance').sort((a, b) => a.price - b.price).slice(0, 5)
  };
}

// ── FILTER VOLUME ZONES ───────────────────────────────────────
function filterVolBySR(volZones, srLevels) {
  const TOL = 0.01;
  const allSR = [...srLevels.supports, ...srLevels.resistances];
  function nearSR(zones) {
    return zones.filter(z => allSR.some(sr => Math.abs(sr.price - z.price) / z.price <= TOL));
  }
  return { supports: nearSR(volZones.supports), resistances: nearSR(volZones.resistances) };
}

// ── MERGE LEVELS ──────────────────────────────────────────────
function mergeLevels(a, b) {
  const tol = 0.005;
  function dedup(arr) {
    const out = [];
    for (const lv of arr) {
      if (!out.some(o => Math.abs(o.price - lv.price) / lv.price <= tol)) {
        out.push({ grade: 'B', ...lv });
      }
    }
    return out;
  }
  return {
    supports: dedup([...a.supports, ...b.supports]).sort((x, y) => y.price - x.price).slice(0, 5),
    resistances: dedup([...a.resistances, ...b.resistances]).sort((x, y) => x.price - y.price).slice(0, 5)
  };
}

// ── ENTRY SIGNAL ──────────────────────────────────────────────
// LONG:  prev candle touches support → current candle bouncing (bullish close)
// SHORT: bearish impulse + high volume → price retraces to 50% or resistance → enter short
function detectSignal(c5, levels) {
  if (c5.length < 4) return null;

  // Fix: only use confirmed (closed) candles — index 8 is OKX confirm field
  if (c5[1][8] !== '1' || c5[2][8] !== '1' || c5[3][8] !== '1') return null;

  const cur   = c5[0].map(parseFloat); // current forming candle
  const prev1 = c5[1].map(parseFloat);
  const prev2 = c5[2].map(parseFloat);
  const prev3 = c5[3].map(parseFloat);

  const curPrice = cur[4];

  // 80th-percentile volume threshold
  const allClosedVols = c5.slice(1).map(c => parseFloat(c[5])).sort((a, b) => a - b);
  const vol80th = allClosedVols[Math.floor(allClosedVols.length * 0.80)] ?? 0;

  const swingLow  = Math.min(prev1[3], prev2[3], prev3[3]);
  const swingHigh = Math.max(prev1[2], prev2[2], prev3[2]);

  const TOUCH_TOL = 0.006;
  const SL_MIN    = 0.008;
  const SL_MAX    = 0.08;

  // ── LONG: support touch → bounce entry ───────────────────────
  for (const s of levels.supports) {
    const byWick  = Math.abs(prev1[3] - s.price) / s.price <= TOUCH_TOL;
    const byClose = Math.abs(prev1[4] - s.price) / s.price <= TOUCH_TOL;
    if (!byWick && !byClose) continue;
    if (curPrice < s.price * 0.997) continue;

    // Fix: require current candle to be bullish (close > open) — bounce confirmation
    if (curPrice <= cur[1]) continue; // still falling, no bounce

    const slDist = Math.abs(curPrice - swingLow) / curPrice;
    if (slDist < SL_MIN || slDist > SL_MAX) continue;
    return { type: 'long', level: s.price, grade: s.grade || 'B', stopLoss: swingLow };
  }

  // ── SHORT: resistance touch → rejection entry ─────────────────
  for (const r of levels.resistances) {
    const byWick  = Math.abs(prev1[2] - r.price) / r.price <= TOUCH_TOL;
    const byClose = Math.abs(prev1[4] - r.price) / r.price <= TOUCH_TOL;
    if (!byWick && !byClose) continue;
    if (curPrice > r.price * 1.003) continue;
    if (curPrice >= cur[1]) continue; // still rising, no rejection
    const slDist = Math.abs(swingHigh - curPrice) / curPrice;
    if (slDist < SL_MIN || slDist > SL_MAX) continue;
    return { type: 'short', level: r.price, grade: r.grade || 'B', stopLoss: swingHigh };
  }

  // ── SHORT: bearish impulse + volume → retracement entry ──────
  for (const bear of [prev1, prev2, prev3]) {
    const bO = bear[1], bC = bear[4], bH = bear[2], bL = bear[3], bV = bear[5];
    const range = bH - bL;
    if (range <= 0) continue;
    if ((bO - bC) / range < 0.35) continue;  // loosened from 0.40
    if (bV < vol80th * 0.8) continue;         // loosened from vol80th

    const mid50 = bH - range * 0.50;
    if (curPrice < mid50 * 0.998) continue;
    if (curPrice > swingHigh * 1.003) continue;

    const slDist = Math.abs(swingHigh - curPrice) / curPrice;
    if (slDist < SL_MIN || slDist > SL_MAX) continue;

    const atMid50 = Math.abs(curPrice - mid50) / mid50 <= TOUCH_TOL * 1.5;
    const nearRes = levels.resistances.find(r =>
      r.price >= mid50 * 0.998 && r.price <= swingHigh * 1.003 &&
      Math.abs(curPrice - r.price) / r.price <= TOUCH_TOL
    );
    if (!atMid50 && !nearRes) continue;
    return { type: 'short', level: bH, grade: nearRes ? nearRes.grade : 'A', stopLoss: swingHigh };
  }

  return null;
}

// ── VOLUME PROFILE ────────────────────────────────────────────
function detectVolumeZones(candles, currentPrice) {
  if (candles.length < 20) return { supports: [], resistances: [] };
  const BUCKETS = 50;
  const minP = Math.min(...candles.map(c => parseFloat(c[3])));
  const maxP = Math.max(...candles.map(c => parseFloat(c[2])));
  const step = (maxP - minP) / BUCKETS;
  if (step <= 0) return { supports: [], resistances: [] };
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

// ── NATIVE ALGO ORDERS ────────────────────────────────────────
async function placeSLAlgo(apiKey, secret, pass, pair, direction, slPrice, sz, demo = false) {
  return okxPost(apiKey, secret, pass, '/api/v5/trade/order-algo', {
    instId: pair, tdMode: 'cross',
    side:         direction === 'long' ? 'sell' : 'buy',
    posSide:      direction === 'long' ? 'long' : 'short',
    ordType:      'conditional',
    sz:           String(sz),
    slTriggerPx:  parseFloat(slPrice).toFixed(2),
    slOrdPx:      '-1'
  }, demo);
}

async function cancelSLAlgo(apiKey, secret, pass, pair, algoId, demo = false) {
  return okxPost(apiKey, secret, pass, '/api/v5/trade/cancel-algos',
    [{ algoId: String(algoId), instId: pair }], demo);
}

async function queryFillPrice(apiKey, secret, pass, pair, ordId, fallbackPx, requestedSz, demo = false) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 500 * attempt));
      const res    = await okxGet(apiKey, secret, pass, `/api/v5/trade/order?instId=${pair}&ordId=${ordId}`, demo);
      const d      = res?.data?.[0];
      const px     = parseFloat(d?.avgPx    || '0');
      const filled = parseFloat(d?.accFillSz || '0');
      if (px > 0 && filled > 0) return { price: px, filledSz: filled, confirmed: true };
    } catch {}
  }
  return { price: fallbackPx, filledSz: requestedSz, confirmed: false };
}

// ── OKX API ───────────────────────────────────────────────────
async function getCandles(instId, bar, limit) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${OKX_BASE}/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`);
      const data = (await res.json()).data || [];
      if (data.length > 0) return data;
    } catch {}
    if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
  }
  return [];
}

async function okxGet(apiKey, secret, pass, path, demo = false) {
  const ts = new Date().toISOString();
  const sign = await hmac(secret, ts + 'GET' + path);
  const res = await fetch(OKX_BASE + path, {
    headers: okxHeaders(apiKey, sign, ts, pass, demo)
  });
  if (!res.ok) throw new Error(`OKX HTTP ${res.status} on GET ${path}`);
  try {
    return await res.json();
  } catch(e) {
    throw new Error(`OKX non-JSON response on GET ${path}: ${e.message}`);
  }
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
  if (!res.ok) throw new Error(`OKX HTTP ${res.status} on POST ${path}`);
  try {
    return await res.json();
  } catch(e) {
    throw new Error(`OKX non-JSON response on POST ${path}: ${e.message}`);
  }
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

// ════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ════════════════════════════════════════════════════════════

async function handleAdminUsers(request, env) {
  const body = await request.json();
  const session = await requireSession(body, env, request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (session.email.toLowerCase() !== 'wldnjswldnjs00@gmail.com') return json({ error: 'forbidden' }, 403);
  if (!env.USERS_KV) return json({ users: [] });

  const { keys } = await env.USERS_KV.list({ prefix: 'user:' });
  const users = [];
  for (const key of keys) {
    const user = await env.USERS_KV.get(key.name, { type: 'json' });
    if (user) {
      users.push({
        email: user.email,
        username: user.username || '',
        name: user.name || '',
        country: user.country || '',
        plan: user.subscription?.plan || 'none',
        createdAt: user.createdAt || null
      });
    }
  }
  return json({ users });
}

async function handleSendEmailVerify(request, env) {
  const body = await request.json();
  const session = await requireSession(body, env, request);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!env.USERS_KV) return json({ ok: false, error: 'service_unavailable' }, 503);

  const { newEmail } = body;
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
    return json({ ok: false, error: 'invalid_email' }, 400);

  const existing = await env.USERS_KV.get('user:' + newEmail.toLowerCase(), { type: 'json' });
  if (existing) return json({ ok: false, error: 'email_taken' }, 409);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await env.USERS_KV.put(
    'email_change:' + session.email,
    JSON.stringify({ code, newEmail, ts: Date.now() }),
    { expirationTtl: 600 }
  );

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'AYILON <onboarding@resend.dev>',
        to: [newEmail],
        subject: 'AYILON — 이메일 변경 인증 코드',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#000;color:#fff;padding:40px 32px;border-radius:12px;">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">이메일 변경 인증</h2>
          <p style="color:#a3a3a3;font-size:14px;margin-bottom:24px;">아래 6자리 코드를 입력하여 이메일을 변경하세요. 코드는 10분간 유효합니다.</p>
          <div style="background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:20px;text-align:center;font-size:32px;font-weight:700;letter-spacing:0.15em;">${code}</div>
          <p style="color:#525252;font-size:12px;margin-top:20px;">본인이 요청하지 않은 경우 이 이메일을 무시하세요.</p>
        </div>`
      })
    });
  } catch(e) {}

  return json({ ok: true });
}

async function handleVerifyEmailChange(request, env) {
  const body = await request.json();
  const session = await requireSession(body, env, request);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!env.USERS_KV) return json({ ok: false, error: 'service_unavailable' }, 503);

  const { code, newEmail } = body;
  const stored = await env.USERS_KV.get('email_change:' + session.email, { type: 'json' });
  if (!stored) return json({ ok: false, error: 'code_expired' }, 400);
  if (stored.code !== String(code) || stored.newEmail !== newEmail)
    return json({ ok: false, error: 'invalid_code' }, 400);
  if (Date.now() - stored.ts > 600000) return json({ ok: false, error: 'code_expired' }, 400);

  // Move user data from old email key to new email key
  const oldKey = 'user:' + session.email.toLowerCase();
  const newKey = 'user:' + newEmail.toLowerCase();
  const userData = await env.USERS_KV.get(oldKey, { type: 'json' });
  if (userData) {
    userData.email = newEmail;
    const updates = [
      env.USERS_KV.put(newKey, JSON.stringify(userData)),
      env.USERS_KV.delete(oldKey),
      env.USERS_KV.delete('email_change:' + session.email)
    ];
    if (userData.username) {
      updates.push(env.USERS_KV.put('username:' + userData.username.toLowerCase(), newEmail.toLowerCase()));
    }
    await Promise.all(updates);
    // Update session to new email
    const sessionKey = 'session:' + (body.sessionToken || request.headers.get('Authorization')?.slice(7)?.trim() || '');
    const sessionData = await env.USERS_KV.get(sessionKey, { type: 'json' });
    if (sessionData) {
      sessionData.email = newEmail;
      await env.USERS_KV.put(sessionKey, JSON.stringify(sessionData));
    }
  }

  return json({ ok: true, newEmail });
}

async function handleAdminUserDetail(request, env) {
  const body = await request.json();
  const session = await requireSession(body, env, request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (session.email.toLowerCase() !== 'wldnjswldnjs00@gmail.com') return json({ error: 'forbidden' }, 403);
  if (!env.USERS_KV) return json({ error: 'service_unavailable' }, 503);

  const { targetEmail } = body;
  if (!targetEmail) return json({ error: 'missing_email' }, 400);

  const user = await env.USERS_KV.get('user:' + targetEmail.toLowerCase(), { type: 'json' });
  if (!user) return json({ error: 'user_not_found' }, 404);

  const [botConfig, botLogs, positions] = await Promise.all([
    env.USERS_KV.get('bot:config:'         + targetEmail.toLowerCase(), { type: 'json' }),
    env.USERS_KV.get('bot:logs:'           + targetEmail.toLowerCase(), { type: 'json' }),
    env.USERS_KV.get('bot:position_state:' + targetEmail.toLowerCase(), { type: 'json' })
  ]);

  let config = botConfig ? { ...botConfig } : null;
  if (config?.apiKey)        config.apiKey        = '••••' + config.apiKey.slice(-4);
  if (config?.apiSecret)     config.apiSecret     = '••••••••';
  if (config?.apiPassphrase) config.apiPassphrase = '••••••••';

  return json({
    user: {
      email: user.email,
      username: user.username || '',
      name: user.name || '',
      country: user.country || '',
      plan: user.subscription?.plan || 'none',
      subscription: user.subscription || null,
      createdAt: user.createdAt || null
    },
    botConfig: config,
    botLogs: botLogs || [],
    positions: positions || {}
  });
}

async function handleDeleteAccount(request, env) {
  const body = await request.json();
  const session = await requireSession(body, env, request);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!body.confirm) return json({ ok: false, error: 'confirm_required' }, 400);
  if (!env.USERS_KV) return json({ ok: false, error: 'service_unavailable' }, 503);

  const email = session.email.toLowerCase();
  const user = await env.USERS_KV.get('user:' + email, { type: 'json' });

  const dels = [
    env.USERS_KV.delete('user:' + email),
    env.USERS_KV.delete('bot:config:' + email),
    env.USERS_KV.delete('bot:logs:' + email),
    env.USERS_KV.delete('bot:position_state:' + email),
    env.USERS_KV.delete('bot:peak_equity:' + email),
    env.USERS_KV.delete('bot:daily_loss_triggered:' + email),
  ];
  if (body.sessionToken) dels.push(env.USERS_KV.delete('session:' + body.sessionToken));
  if (user?.username)    dels.push(env.USERS_KV.delete('username:' + user.username.toLowerCase()));
  await Promise.all(dels);
  return json({ ok: true });
}

// ── BOT LOG & NOTIFY ──────────────────────────────────────────
async function botLog(env, email, msg) {
  if (!env.USERS_KV) return;
  const logs = await env.USERS_KV.get('bot:logs:' + email, { type: 'json' }) || [];
  logs.unshift({ time: new Date().toISOString(), msg });
  if (logs.length > 100) logs.splice(100);
  await env.USERS_KV.put('bot:logs:' + email, JSON.stringify(logs));
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
          html: `<div style="background:#000;color:#fff;font-family:Inter,sans-serif;padding:40px;max-width:480px;border-radius:12px;"><h2 style="margin-bottom:8px;">AYILON Bot</h2><p style="color:#a3a3a3;margin-bottom:24px;">${escapeHtml(msg)}</p><a href="https://oracletrading-01o.pages.dev/dashboard.html" style="display:inline-block;background:#fff;color:#000;padding:12px 24px;border-radius:8px;font-weight:600;text-decoration:none;">Dashboard →</a></div>`
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
