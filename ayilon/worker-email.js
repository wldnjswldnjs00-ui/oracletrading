const WALLET = 'TBvtft3H8B4Rv4cEHTotyak3Ds2mLur99E';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response('', { status: 204, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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
      if (path === '/verify-2fa-login')  return handleVerify2FALogin(request, env);
      if (path === '/initiate-2fa')      return handleInitiate2FA(request, env);
      if (path === '/confirm-2fa')       return handleConfirm2FA(request, env);
      if (path === '/2fa-status')        return handle2FAStatus(request, env);
      if (path === '/equity-history')    return handleEquityHistory(request, env);
      if (path === '/okx-instruments')   return handleOKXInstruments(request, env);
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
      if (path === '/admin/list-users')  return handleAdminListUsers(request, env);
      if (path === '/admin/set-plan')    return handleAdminSetPlan(request, env);
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
  if (!email || !username || !code) return json({ ok: false, success: false, error: 'missing_fields' }, 400);

  // Verify email code server-side — always required
  if (env.USERS_KV) {
    const storedCode = await env.USERS_KV.get('verify:' + email.toLowerCase());
    if (!storedCode || storedCode !== String(code)) {
      return json({ ok: false, success: false, error: 'invalid_code' });
    }
    await env.USERS_KV.delete('verify:' + email.toLowerCase());
  }

  if (env.USERS_KV) {
    const emailKey    = 'user:'     + email.toLowerCase();
    const usernameKey = 'username:' + username.toLowerCase();
    const emailExists    = await env.USERS_KV.get(emailKey);
    if (emailExists)    return json({ ok: false, success: false, error: 'email_taken' });
    const usernameExists = await env.USERS_KV.get(usernameKey);
    if (usernameExists) return json({ ok: false, success: false, error: 'username_taken' });

    const pwData = password ? await hashPassword(password) : { hash: null, salt: null };
    await env.USERS_KV.put(emailKey, JSON.stringify({
      email, username, name, country: country || '',
      password: pwData.hash, passwordSalt: pwData.salt,
      createdAt: Date.now()
    }));
    await env.USERS_KV.put(usernameKey, email.toLowerCase());
  }
  return json({ ok: true, success: true });
}

// ── VERIFY EMAIL CODE (server-side) ─────────────────────────
async function handleVerifyCode(request, env) {
  const { email, code } = await request.json();
  if (!email || !code) return json({ ok: false, valid: false });
  if (!env.USERS_KV) return json({ ok: true, valid: true }); // dev fallback

  // Brute-force protection: max 5 attempts per code, then auto-invalidate
  const attemptsKey = 'rate:code_attempt:' + email.toLowerCase();
  const attempts = await env.USERS_KV.get(attemptsKey, { type: 'json' });
  if ((attempts?.count || 0) >= 5) {
    await env.USERS_KV.delete('verify:' + email.toLowerCase());
    return json({ ok: false, valid: false, error: 'too_many_attempts' });
  }

  const stored = await env.USERS_KV.get('verify:' + email.toLowerCase());
  const valid = stored === String(code);
  if (!valid) {
    const newCount = (attempts?.count || 0) + 1;
    const ttl = newCount >= 5 ? 3600 : newCount >= 3 ? 900 : 300;
    await env.USERS_KV.put(attemptsKey, JSON.stringify({ count: newCount }), { expirationTtl: ttl });
  } else {
    await env.USERS_KV.delete(attemptsKey);
  }
  return json({ ok: valid, valid });
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
  if (!res.ok) return json({ ok: false, error: 'Failed to send email' }, 500);
  return json({ ok: true, success: true }); // code NOT returned — client must verify via /verify-code
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
  if (!res.ok) return json({ ok: false, error: 'Failed to send email' }, 500);
  return json({ ok: true, success: true });
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

// PBKDF2 password hash with random per-user salt
async function hashPassword(password, existingSalt = null) {
  const salt   = existingSalt || btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const keyMat = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits   = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, keyMat, 256);
  return { hash: btoa(String.fromCharCode(...new Uint8Array(bits))), salt };
}
// Legacy SHA-256 — only used for verifying pre-migration accounts
async function _hashPasswordLegacy(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + ':ayilon_2025'));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

// ════════════════════════════════════════════════════════════
// TOTP (RFC 6238)
// ════════════════════════════════════════════════════════════
const _B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(bytes) {
  let bits = 0, val = 0, out = '';
  for (let i = 0; i < bytes.length; i++) {
    val = (val << 8) | bytes[i]; bits += 8;
    while (bits >= 5) { out += _B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += _B32[(val << (5 - bits)) & 31];
  return out;
}
function base32Decode(str) {
  str = str.toUpperCase().replace(/=+$/, '');
  let bits = 0, val = 0;
  const out = [];
  for (const c of str) {
    const idx = _B32.indexOf(c);
    if (idx < 0) continue;
    val = (val << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(out);
}
function generateTOTPSecret() {
  return base32Encode(crypto.getRandomValues(new Uint8Array(20)));
}
async function verifyTOTP(secret, code, window = 1) {
  const step = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    const counter = step + i;
    const key = await crypto.subtle.importKey('raw', base32Decode(secret),
      { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const buf = new Uint8Array(8);
    let c = counter;
    for (let j = 7; j >= 0; j--) { buf[j] = c & 0xff; c = Math.floor(c / 256); }
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
    const off = sig[19] & 0xf;
    const otp = (((sig[off] & 0x7f) << 24) | (sig[off+1] << 16) | (sig[off+2] << 8) | sig[off+3]) % 1000000;
    if (String(otp).padStart(6, '0') === String(code).trim()) return true;
  }
  return false;
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
  if (!token) return null;

  // D1 first (no KV write limit)
  if (env.BOT_DB) {
    try {
      await ensureDB(env);
      const row = await env.BOT_DB.prepare(
        'SELECT email, username, name FROM sessions WHERE token=? AND expires_at>?'
      ).bind(token, Date.now()).first();
      if (row) return { email: row.email, username: row.username, name: row.name };
    } catch(e) {}
  }

  // KV fallback for sessions created before D1 migration
  if (!env.USERS_KV) return null;
  try {
    const session = await env.USERS_KV.get('session:' + token, { type: 'json' });
    if (session && session.email) return session;
  } catch(e) {}
  return null;
}

async function handleLogin(request, env) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return json({ ok: false, error: 'missing_fields' }, 400);
    if (!env.USERS_KV) return json({ ok: false, error: 'service_unavailable' }, 503);

    const loginRateKey = 'rate:login:' + email.toLowerCase();
    let loginRate = null;
    try { loginRate = await env.USERS_KV.get(loginRateKey, { type: 'json' }); } catch(e) {}
    if ((loginRate?.count || 0) >= 5) return json({ ok: false, error: 'too_many_attempts' }, 429);

    const user = await env.USERS_KV.get('user:' + email.toLowerCase(), { type: 'json' });
    if (!user) {
      try { await env.USERS_KV.put(loginRateKey, JSON.stringify({ count: (loginRate?.count || 0) + 1 }), { expirationTtl: 900 }); } catch(e) {}
      return json({ ok: false, error: 'invalid_credentials' }, 401);
    }

    // Verify password — support both PBKDF2 (new) and legacy SHA-256
    let passwordMatch = false;
    if (user.passwordSalt) {
      const { hash } = await hashPassword(password, user.passwordSalt);
      passwordMatch = user.password === hash;
    } else {
      passwordMatch = user.password === await _hashPasswordLegacy(password);
      if (passwordMatch && env.USERS_KV) {
        // Silently upgrade legacy hash to PBKDF2 on successful login
        try {
          const { hash: newHash, salt: newSalt } = await hashPassword(password);
          user.password = newHash; user.passwordSalt = newSalt;
          await env.USERS_KV.put('user:' + email.toLowerCase(), JSON.stringify(user));
        } catch(e) {}
      }
    }
    if (!passwordMatch) {
      try { await env.USERS_KV.put(loginRateKey, JSON.stringify({ count: (loginRate?.count || 0) + 1 }), { expirationTtl: 900 }); } catch(e) {}
      return json({ ok: false, error: 'invalid_credentials' }, 401);
    }
    try { await env.USERS_KV.delete(loginRateKey); } catch(e) {}

    // Check if user has 2FA enabled
    const tf = user.twoFactor || {};
    const tfMethods = [];
    if (tf.email)  tfMethods.push('email');
    if (tf.totp)   tfMethods.push('totp');
    if (tfMethods.length > 0) {
      await ensureDB(env);
      const challengeToken = crypto.randomUUID();
      let emailCode = null;
      if (tf.email) {
        emailCode = String(Math.floor(100000 + Math.random() * 900000));
        // Send email with code
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'AYILON <onboarding@resend.dev>', to: [user.email],
              subject: 'AYILON Login Verification Code',
              html: `<div style="font-family:sans-serif;padding:24px;"><h2>Login Code</h2><p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#111;">${emailCode}</p><p style="color:#666;">This code expires in 10 minutes.</p></div>`
            })
          });
        } catch(e) {}
      }
      await env.BOT_DB.prepare('INSERT OR REPLACE INTO challenges VALUES (?,?,?,?,?)').bind(
        challengeToken, user.email.toLowerCase(), 'login', emailCode, Date.now() + 600000
      ).run();
      return json({ ok: true, requires2FA: true, methods: tfMethods, challengeToken });
    }

    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + 604800 * 1000; // 7 days

    // Write session to D1 (no KV write limit)
    await ensureDB(env);
    await env.BOT_DB.prepare(
      'INSERT OR REPLACE INTO sessions (token, email, username, name, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(sessionToken, user.email, user.username || '', user.name || '', expiresAt).run();

    return json({ ok: true, sessionToken, email: user.email, username: user.username || '', name: user.name || '' });
  } catch(e) {
    return json({ ok: false, error: 'server_error', detail: String(e) }, 500);
  }
}

async function handleLogout(request, env) {
  const body = await request.json().catch(() => ({}));
  if (body.sessionToken) {
    if (env.BOT_DB) {
      try { await env.BOT_DB.prepare('DELETE FROM sessions WHERE token=?').bind(body.sessionToken).run(); } catch(e) {}
    }
    if (env.USERS_KV) {
      try { await env.USERS_KV.delete('session:' + body.sessionToken); } catch(e) {}
    }
  }
  return json({ ok: true });
}

async function handleVerify2FALogin(request, env) {
  try {
    const { challengeToken, emailCode, totpCode } = await request.json().catch(() => ({}));
    if (!challengeToken) return json({ ok: false, error: 'missing_token' }, 400);
    await ensureDB(env);
    const challenge = await env.BOT_DB.prepare(
      'SELECT * FROM challenges WHERE token=? AND type=?'
    ).bind(challengeToken, 'login').first();
    if (!challenge || challenge.expires_at < Date.now())
      return json({ ok: false, error: 'challenge_expired' }, 400);

    const user = await env.USERS_KV.get('user:' + challenge.email, { type: 'json' });
    if (!user) return json({ ok: false, error: 'user_not_found' }, 404);
    const tf = user.twoFactor || {};

    if (tf.email) {
      if (!emailCode || String(emailCode).trim() !== String(challenge.code)) {
        return json({ ok: false, error: 'invalid_email_code' }, 401);
      }
    }
    if (tf.totp) {
      if (!totpCode) return json({ ok: false, error: 'missing_totp_code' }, 400);
      const valid = await verifyTOTP(tf.totpSecret, totpCode);
      if (!valid) return json({ ok: false, error: 'invalid_totp_code' }, 401);
    }

    await env.BOT_DB.prepare('DELETE FROM challenges WHERE token=?').bind(challengeToken).run();

    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + 604800 * 1000;
    await env.BOT_DB.prepare(
      'INSERT OR REPLACE INTO sessions (token, email, username, name, expires_at) VALUES (?,?,?,?,?)'
    ).bind(sessionToken, user.email, user.username || '', user.name || '', expiresAt).run();

    return json({ ok: true, sessionToken, email: user.email, username: user.username || '', name: user.name || '' });
  } catch(e) { return json({ ok: false, error: 'server_error' }, 500); }
}

async function handleInitiate2FA(request, env) {
  const body = await request.json().catch(() => ({}));
  const session = await requireSession(body, env, request);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);
  const { method, action } = body; // action: 'enable' or 'disable'
  if (!method || !action) return json({ ok: false, error: 'missing_fields' }, 400);

  await ensureDB(env);
  const challengeToken = crypto.randomUUID();

  if (method === 'email') {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await env.BOT_DB.prepare('INSERT OR REPLACE INTO challenges VALUES (?,?,?,?,?)').bind(
      challengeToken, session.email.toLowerCase(), action === 'enable' ? 'setup_email' : 'disable_email',
      code, Date.now() + 600000
    ).run();
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'AYILON <onboarding@resend.dev>', to: [session.email],
          subject: 'AYILON 2FA Verification Code',
          html: `<div style="font-family:sans-serif;padding:24px;"><h2>${action === 'enable' ? 'Enable' : 'Disable'} Email 2FA</h2><p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#111;">${code}</p><p style="color:#666;">This code expires in 10 minutes.</p></div>`
        })
      });
    } catch(e) {}
    return json({ ok: true, challengeToken });
  }

  if (method === 'totp') {
    if (action === 'enable') {
      const secret = generateTOTPSecret();
      await env.BOT_DB.prepare('INSERT OR REPLACE INTO challenges VALUES (?,?,?,?,?)').bind(
        challengeToken, session.email.toLowerCase(), 'setup_totp', secret, Date.now() + 600000
      ).run();
      const otpAuthUrl = `otpauth://totp/AYILON:${encodeURIComponent(session.email)}?secret=${secret}&issuer=AYILON`;
      return json({ ok: true, challengeToken, secret, otpAuthUrl });
    } else {
      // Disable: just verify current TOTP, no challenge needed
      const challengeToken2 = crypto.randomUUID();
      await env.BOT_DB.prepare('INSERT OR REPLACE INTO challenges VALUES (?,?,?,?,?)').bind(
        challengeToken2, session.email.toLowerCase(), 'disable_totp', null, Date.now() + 300000
      ).run();
      return json({ ok: true, challengeToken: challengeToken2 });
    }
  }
  return json({ ok: false, error: 'invalid_method' }, 400);
}

async function handleConfirm2FA(request, env) {
  const body = await request.json().catch(() => ({}));
  const session = await requireSession(body, env, request);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);
  const { challengeToken, code } = body;
  if (!challengeToken || !code) return json({ ok: false, error: 'missing_fields' }, 400);

  await ensureDB(env);
  const challenge = await env.BOT_DB.prepare(
    'SELECT * FROM challenges WHERE token=? AND email=?'
  ).bind(challengeToken, session.email.toLowerCase()).first();
  if (!challenge || challenge.expires_at < Date.now())
    return json({ ok: false, error: 'challenge_expired' }, 400);

  const user = await env.USERS_KV.get('user:' + session.email.toLowerCase(), { type: 'json' });
  if (!user) return json({ ok: false, error: 'user_not_found' }, 404);

  const tf = { ...(user.twoFactor || {}) };

  if (challenge.type === 'setup_email') {
    if (String(code).trim() !== String(challenge.code)) return json({ ok: false, error: 'invalid_code' }, 401);
    tf.email = true;
  } else if (challenge.type === 'disable_email') {
    if (String(code).trim() !== String(challenge.code)) return json({ ok: false, error: 'invalid_code' }, 401);
    tf.email = false;
  } else if (challenge.type === 'setup_totp') {
    const valid = await verifyTOTP(challenge.code, code);
    if (!valid) return json({ ok: false, error: 'invalid_code' }, 401);
    tf.totp = true; tf.totpSecret = challenge.code;
  } else if (challenge.type === 'disable_totp') {
    const valid = await verifyTOTP(tf.totpSecret || '', code);
    if (!valid) return json({ ok: false, error: 'invalid_code' }, 401);
    tf.totp = false; tf.totpSecret = null;
  }

  user.twoFactor = tf;
  await env.USERS_KV.put('user:' + session.email.toLowerCase(), JSON.stringify(user));
  await env.BOT_DB.prepare('DELETE FROM challenges WHERE token=?').bind(challengeToken).run();
  return json({ ok: true, twoFactor: { email: !!tf.email, totp: !!tf.totp } });
}

async function handle2FAStatus(request, env) {
  const body = await request.json().catch(() => ({}));
  const session = await requireSession(body, env, request);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);
  const user = await env.USERS_KV.get('user:' + session.email.toLowerCase(), { type: 'json' });
  const tf = user?.twoFactor || {};
  return json({ ok: true, twoFactor: { email: !!tf.email, totp: !!tf.totp } });
}

async function handleMe(request, env) {
  const body = await request.json().catch(() => ({}));
  const session = await requireSession(body, env, request);
  if (!session) return json({ authenticated: false }, 401);
  const meUser = await env.USERS_KV.get('user:' + session.email.toLowerCase(), { type: 'json' }).catch(() => null);
  const meTF = meUser?.twoFactor || {};
  return json({ authenticated: true, email: session.email, username: session.username, name: session.name, twoFactor: { email: !!meTF.email, totp: !!meTF.totp } });
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

  let currentMatch = false;
  if (user.passwordSalt) {
    const { hash } = await hashPassword(currentPassword, user.passwordSalt);
    currentMatch = user.password === hash;
  } else {
    currentMatch = user.password === await _hashPasswordLegacy(currentPassword);
  }
  if (!currentMatch) return json({ ok: false, error: 'invalid_current_password' }, 401);
  const { hash: newHash, salt: newSalt } = await hashPassword(newPassword);
  user.password = newHash; user.passwordSalt = newSalt;
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
  const { hash: resetHash, salt: resetSalt } = await hashPassword(newPassword);
  user.password = resetHash; user.passwordSalt = resetSalt;
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
  const VALID_STRATS = ['ha_ema_srsi','ma_ribbon','ma50_bounce','ict_fib_ote'];
  const SCALP_STRATS = ['ma50_bounce'];
  if (body.leverage     !== undefined) body.leverage     = Math.min(Math.max(parseInt(body.leverage)       || 20,   1), 125);
  if (body.posSize      !== undefined) body.posSize      = Math.min(Math.max(parseFloat(body.posSize)      || 40,   1), 100);
  if (body.riskPerTrade !== undefined) body.riskPerTrade = Math.min(Math.max(parseFloat(body.riskPerTrade) ||  2, 0.1),  10);
  if (body.numEntries   !== undefined) body.numEntries   = 1; // single entry only
  if (body.lossLimit    !== undefined) body.lossLimit    = Math.min(Math.max(parseFloat(body.lossLimit)    ||  5, 0.1),  50);
  if (body.mddLimit     !== undefined) body.mddLimit     = Math.min(Math.max(parseFloat(body.mddLimit)     || 30,   5), 100);
  if (body.strategy    && !VALID_STRATS.includes(body.strategy))   body.strategy    = 'ha_ema_srsi';
  if (Array.isArray(body.strategies)) {
    body.strategies = body.strategies.filter(s => VALID_STRATS.includes(s));
    if (body.strategies.length === 0) delete body.strategies;
  }
  if (body.tradingPair) {
    const p = String(body.tradingPair).toUpperCase().trim();
    body.tradingPair = /^[A-Z0-9]{2,15}-USDT-SWAP$/.test(p) ? p : 'BTC-USDT-SWAP';
  }
  if (body.entrySizing && !['equal','weighted','martingale'].includes(body.entrySizing)) body.entrySizing = 'equal';

  const { sessionToken: _, ...configBody } = body;
  // Merge: existing config as base so no field is accidentally wiped
  await env.USERS_KV.put('bot:config:' + session.email, JSON.stringify({ ...existing, ...configBody, clientToken, updatedAt: Date.now() }));
  return json({ ok: true, clientToken });
}

async function handleOKXInstruments(request, env) {
  const body = await request.json().catch(() => ({}));
  const demo = body.demoMode === true;
  try {
    const hdrs = { 'Content-Type': 'application/json' };
    if (demo) hdrs['x-simulated-trading'] = '1';
    const res  = await fetch(`${OKX_BASE}/api/v5/public/instruments?instType=SWAP`, { headers: hdrs });
    const data = await res.json();
    const pairs = (data.data || [])
      .filter(inst => inst.instId.endsWith('-USDT-SWAP') && inst.state === 'live')
      .map(inst => inst.instId)
      .sort();
    return json({ pairs: pairs.length ? pairs : ['BTC-USDT-SWAP', 'ETH-USDT-SWAP'] });
  } catch(e) {
    return json({ pairs: ['BTC-USDT-SWAP', 'ETH-USDT-SWAP'] });
  }
}

async function handleBotStatus(request, env) {
  if (!env.USERS_KV) return json({ running: false, logs: [] });
  const body = request.method === 'GET' ? {} : await request.json().catch(() => ({}));
  const session = await requireSession(body, env, request);
  if (!session) return json({ running: false, logs: [], error: 'unauthorized' }, 401);

  await initDB(env);
  const u = session.email;
  const [config, botStateRow] = await Promise.all([
    env.USERS_KV.get('bot:config:' + u, { type: 'json' }),
    getBotState(env, u)
  ]);
  const _config   = config || {};
  const _logs     = JSON.parse(botStateRow.logs || '[]');
  const _pos      = JSON.parse(botStateRow.position_state || '{}');
  const lastScan  = botStateRow.last_scan || null;
  const alertRaw  = botStateRow.daily_loss_triggered || null;
  const alert     = alertRaw ? JSON.parse(alertRaw) : null;

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

  // D1 running=0 means stop was triggered via dashboard (D1 overrides KV)
  const d1Stopped = botStateRow.running === 0;
  const effectiveRunning = !d1Stopped && _config.running === true;
  const stoppedStrategies = botStateRow.stopped_strategies
    ? JSON.parse(botStateRow.stopped_strategies) : [];
  const allStrategies = _config.strategies || (_config.strategy ? [_config.strategy] : []);
  const activeStrategies = effectiveRunning
    ? allStrategies.filter(s => !stoppedStrategies.includes(s))
    : [];

  return json({
    running: effectiveRunning && activeStrategies.length > 0,
    config: {
      strategy:    _config.strategy    || null,
      strategies:  activeStrategies.length > 0 ? activeStrategies : (_config.strategies || null),
      mode:        _config.mode        || 'live',
      leverage:    _config.leverage    || 20,
      posSize:     _config.posSize     || 40,
      tradingPair: _config.tradingPair || 'BTC-USDT-SWAP'
    },
    logs: _logs, alert, positions: _pos, positionSummary, lastScan, fundingRate, marketData: null,
    winCount:  parseInt(botStateRow.win_count  || '0'),
    lossCount: parseInt(botStateRow.loss_count || '0'),
    totalWinPnl:  parseFloat(botStateRow.total_win_pnl  || '0'),
    totalLossPnl: parseFloat(botStateRow.total_loss_pnl || '0')
  });
}

async function handleBotControl(request, env) {
  try {
  const body = await request.json().catch(() => ({}));
  const { action } = body;
  if (!env.USERS_KV) return json({ ok: false });
  if (!['start', 'stop', 'dismiss', 'resume'].includes(action)) {
    return json({ ok: false, error: 'invalid_action' }, 400);
  }
  const session = await requireSession(body, env, request);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);

  await initDB(env);

  // ── STOP: D1 only — never writes KV (KV daily limit must not be wasted here) ──
  if (action === 'stop') {
    const { strategy: stopStrat } = body;
    if (stopStrat) {
      const botState = await getBotState(env, session.email);
      const currentStopped = JSON.parse(botState.stopped_strategies || '[]');
      if (!currentStopped.includes(stopStrat)) currentStopped.push(stopStrat);
      const cfg = await env.USERS_KV.get('bot:config:' + session.email, { type: 'json' }) || {};
      const allStrats = Array.isArray(cfg.strategies) && cfg.strategies.length > 0
        ? cfg.strategies : [cfg.strategy || 'ha_ema_srsi'];
      const remaining = allStrats.filter(s => !currentStopped.includes(s));
      if (remaining.length === 0) {
        await upsertBotState(env, session.email, { running: 0, stopped_strategies: null });
      } else {
        await upsertBotState(env, session.email, { stopped_strategies: JSON.stringify(currentStopped) });
      }
    } else {
      await upsertBotState(env, session.email, { running: 0, stopped_strategies: null });
    }
    return json({ ok: true, running: false });
  }

  if (action === 'dismiss') {
    await upsertBotState(env, session.email, { daily_loss_triggered: null });
    return json({ ok: true });
  }

  // ── START / RESUME: write KV + reset D1 running flag ──
  const configKey = 'bot:config:' + session.email;
  const config = await env.USERS_KV.get(configKey, { type: 'json' }) || {};

  if (action === 'start') {
    if (!config.apiKey || !config.apiSecret || !config.apiPassphrase) {
      return json({ ok: false, error: 'api_keys_required' });
    }
    config.running = true;
    await upsertBotState(env, session.email, { running: 1, stopped_strategies: null });
  }
  if (action === 'resume') {
    config.running = true;
    await upsertBotState(env, session.email, {
      daily_loss: '{}',
      daily_loss_triggered: null,
      peak_equity: 0,
      running: 1,
      stopped_strategies: null
    });
  }

  let putErr;
  for (let i = 0; i < 3; i++) {
    try {
      await env.USERS_KV.put(configKey, JSON.stringify(config));
      putErr = null;
      break;
    } catch(e) {
      putErr = e;
      await new Promise(r => setTimeout(r, 300 * (i + 1)));
    }
  }
  if (putErr) return json({ ok: false, error: 'KV write failed: ' + putErr.message }, 500);
  return json({ ok: true, running: config.running });
  } catch(e) {
    return json({ ok: false, error: e.message || 'internal_error' }, 500);
  }
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
    const [regular, algo] = await Promise.all([
      okxGet(apiKey, apiSecret, apiPassphrase, `/api/v5/trade/orders-pending?instType=SWAP`, demo),
      okxGet(apiKey, apiSecret, apiPassphrase, `/api/v5/trade/orders-algo-pending?instType=SWAP&ordType=conditional`, demo)
    ]);
    const regularOrders = (regular?.data || []);
    const algoOrders = (algo?.data || []).map(o => ({ ...o, _isAlgo: true }));
    return json({ orders: [...regularOrders, ...algoOrders] });
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
    const { before } = body;
    const qs = before ? `/api/v5/trade/fills?instType=SWAP&limit=50&before=${encodeURIComponent(before)}` : `/api/v5/trade/fills?instType=SWAP&limit=50`;
    const data = await okxGet(apiKey, apiSecret, apiPassphrase, qs, demo);
    const rows = data?.data || [];
    return json({ history: rows, hasMore: rows.length >= 50 });
  } catch(e) { return json({ history: [], hasMore: false, error: e.message }); }
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
    const equity = parseFloat(usdt.eq || 0);
    await ensureDB(env);
    await saveEquitySnapshot(env, session.email, equity);
    return json({
      balance: {
        equity,
        available: parseFloat(usdt.availEq || 0),
        unrealPnl: parseFloat(usdt.upl   || 0),
        mgnRatio:  parseFloat(data?.data?.[0]?.mgnRatio || 0)
      }
    });
  } catch(e) { return json({ balance: null, error: e.message }); }
}

async function handleEquityHistory(request, env) {
  const body = await request.json().catch(() => ({}));
  const session = await requireSession(body, env, request);
  if (!session) return json({ points: [], error: 'unauthorized' }, 401);
  await ensureDB(env);
  const rangeHours = { '1D': 24, '3D': 72, '1W': 168, '1M': 720, '3M': 2160, '1Y': 8760 };
  const hours = rangeHours[body.range || '1M'] || 720;
  const since = Date.now() - hours * 3600 * 1000;
  const rows = await env.BOT_DB.prepare(
    'SELECT date_hour, equity, ts FROM equity_history WHERE email = ? AND ts >= ? ORDER BY ts ASC'
  ).bind(session.email.toLowerCase(), since).all().catch(() => ({ results: [] }));
  return json({ points: (rows.results || []).map(r => ({ ts: r.ts, equity: r.equity, label: r.date_hour })) });
}

// ════════════════════════════════════════════════════════════
// BOT TRADING LOGIC
// ════════════════════════════════════════════════════════════

// Module-level heartbeat map (replaces KV bot:hb:* throttling — no persistence needed)
const _lastHb = new Map();

const OKX_BASE = 'https://www.okx.com';

// ── D1 HELPERS ────────────────────────────────────────────────

let _dbReady = false;
async function initDB(env) {
  if (!env.BOT_DB) return;
  try {
    await env.BOT_DB.prepare(`CREATE TABLE IF NOT EXISTS bot_state (
      email TEXT PRIMARY KEY,
      position_state TEXT DEFAULT '{}',
      logs TEXT DEFAULT '[]',
      peak_equity REAL DEFAULT 0,
      daily_loss TEXT DEFAULT '{}',
      daily_loss_triggered TEXT DEFAULT NULL,
      last_scan TEXT DEFAULT '',
      running INTEGER DEFAULT 1,
      stopped_strategies TEXT DEFAULT NULL
    )`).run();
    await env.BOT_DB.prepare(`CREATE TABLE IF NOT EXISTS entry_locks (
      lock_key TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    )`).run();
    await env.BOT_DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      username TEXT DEFAULT '',
      name TEXT DEFAULT '',
      expires_at INTEGER NOT NULL
    )`).run();
    await env.BOT_DB.prepare(`CREATE TABLE IF NOT EXISTS challenges (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      type TEXT NOT NULL,
      code TEXT,
      expires_at INTEGER NOT NULL
    )`).run();
    await env.BOT_DB.prepare(`CREATE TABLE IF NOT EXISTS equity_history (
      email TEXT NOT NULL,
      date_hour TEXT NOT NULL,
      equity REAL NOT NULL,
      ts INTEGER NOT NULL,
      PRIMARY KEY (email, date_hour)
    )`).run();
    // Add new columns to existing tables (no-op if already present)
    await env.BOT_DB.prepare(`ALTER TABLE bot_state ADD COLUMN running INTEGER DEFAULT 1`).run().catch(() => {});
    await env.BOT_DB.prepare(`ALTER TABLE bot_state ADD COLUMN stopped_strategies TEXT DEFAULT NULL`).run().catch(() => {});
    await env.BOT_DB.prepare(`ALTER TABLE bot_state ADD COLUMN win_count INTEGER DEFAULT 0`).run().catch(() => {});
    await env.BOT_DB.prepare(`ALTER TABLE bot_state ADD COLUMN loss_count INTEGER DEFAULT 0`).run().catch(() => {});
    await env.BOT_DB.prepare(`ALTER TABLE bot_state ADD COLUMN total_win_pnl REAL DEFAULT 0`).run().catch(() => {});
    await env.BOT_DB.prepare(`ALTER TABLE bot_state ADD COLUMN total_loss_pnl REAL DEFAULT 0`).run().catch(() => {});
    await env.BOT_DB.prepare(`ALTER TABLE bot_state ADD COLUMN ny_ref TEXT DEFAULT NULL`).run().catch(() => {});
    _dbReady = true;
  } catch(e) {}
}

async function saveEquitySnapshot(env, email, equity) {
  if (!equity || equity <= 0 || !env.BOT_DB) return;
  const dateHour = new Date().toISOString().slice(0, 13);
  await env.BOT_DB.prepare(
    'INSERT OR REPLACE INTO equity_history (email, date_hour, equity, ts) VALUES (?, ?, ?, ?)'
  ).bind(email.toLowerCase(), dateHour, equity, Date.now()).run().catch(() => {});
}

async function ensureDB(env) {
  if (_dbReady) return;
  await initDB(env);
}

// In-memory cache to avoid repeated D1 reads within the same worker tick
const _botStateCache = new Map(); // email → { row, ts }
const _BOT_STATE_TTL = 10000;    // 10 seconds — covers a single bot execution

async function getBotState(env, email) {
  if (!env.BOT_DB) return {};
  const cached = _botStateCache.get(email);
  if (cached && Date.now() - cached.ts < _BOT_STATE_TTL) return cached.row;
  try {
    const row = await env.BOT_DB.prepare('SELECT * FROM bot_state WHERE email=?').bind(email).first();
    const result = row || {};
    _botStateCache.set(email, { row: result, ts: Date.now() });
    return result;
  } catch { return {}; }
}

async function upsertBotState(env, email, fields) {
  if (!env.BOT_DB) return;
  _botStateCache.delete(email); // invalidate on write
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const setClauses = keys.map(k => `${k}=?`).join(', ');
  const values = keys.map(k => fields[k]);
  await env.BOT_DB.prepare(
    `INSERT INTO bot_state(email,${keys.join(',')}) VALUES(?${',?'.repeat(keys.length)})
     ON CONFLICT(email) DO UPDATE SET ${setClauses}`
  ).bind(email, ...values, ...values).run();
}

async function acquireEntryLock(env, lockKey) {
  if (!env.BOT_DB) return true;
  try {
    const lock = await env.BOT_DB.prepare('SELECT expires_at FROM entry_locks WHERE lock_key=?').bind(lockKey).first();
    if (lock && lock.expires_at > Date.now()) return false;
    await env.BOT_DB.prepare('INSERT OR REPLACE INTO entry_locks(lock_key,expires_at) VALUES(?,?)').bind(lockKey, Date.now() + 60000).run();
    return true;
  } catch { return true; }
}

async function releaseEntryLock(env, lockKey) {
  if (!env.BOT_DB) return;
  try {
    await env.BOT_DB.prepare('DELETE FROM entry_locks WHERE lock_key=?').bind(lockKey).run();
  } catch {}
}

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
  await initDB(env);
  try {
    const { keys } = await env.USERS_KV.list({ prefix: 'bot:config:' });
    for (const key of keys) {
      const email = key.name.slice('bot:config:'.length);
      const cfg = await env.USERS_KV.get(key.name, { type: 'json' });
      if (!cfg || cfg.running !== true) continue;
      // D1 running=0 means stop was requested via dashboard (overrides KV)
      const botStateCheck = await getBotState(env, email);
      if (botStateCheck.running === 0) continue;
      const stoppedViaD1 = JSON.parse(botStateCheck.stopped_strategies || 'null') || [];
      const allStrategies = Array.isArray(cfg.strategies) && cfg.strategies.length > 0
        ? cfg.strategies
        : [cfg.strategy || 'ha_ema_srsi'];
      const strategiesToRun = allStrategies.filter(s => !stoppedViaD1.includes(s));
      if (strategiesToRun.length === 0) continue;
      // Register log buffer — botLog writes here instead of KV during this cron tick
      const logBuf = [];
      _logBufs.set(email, logBuf);
      for (const strat of strategiesToRun) {
        await runBotForUser(env, email, cfg, strat).catch(() => {});
      }
      _logBufs.delete(email);
      // Flush all logs in one D1 write per user per cron tick
      if (logBuf.length > 0) {
        try {
          const existingState = await getBotState(env, email);
          const existing = JSON.parse(existingState.logs || '[]');
          const merged = [...logBuf, ...existing].slice(0, 100);
          await upsertBotState(env, email, { logs: JSON.stringify(merged) });
        } catch(e) {}
      }
    }
  } catch(e) {}
}

async function runBotForUser(env, email, cfg, strategyOverride) {
  try {
    const strategy = strategyOverride || cfg.strategy || 'ha_ema_srsi';
    const { apiKey, apiSecret, apiPassphrase, tradingPair = 'BTC-USDT-SWAP',
      demoMode = false,
      numEntries = 1, entrySizing = 'equal',
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

    // Load bot state from D1 once at start of tick
    const botStateRow = await getBotState(env, email);
    let ps = JSON.parse(botStateRow.position_state || '{}');
    const psModifiedRef = { modified: false };

    // Save last_scan to D1
    await upsertBotState(env, email, { last_scan: new Date().toISOString() });

    // ── Daily loss check ──────────────────────────────────────
    if (lossLimitEnabled) {
      const dlRaw = botStateRow.daily_loss || '{}';
      const dlObj = JSON.parse(dlRaw);
      const dl = (dlObj.date === today) ? dlObj : { pct: 0 };
      if (dl.pct >= lossLimitNorm) {
        cfg.running = false;
        await env.USERS_KV.put('bot:config:' + email, JSON.stringify(cfg));
        await upsertBotState(env, email, {
          daily_loss_triggered: JSON.stringify({
            date: today, loss: (dl.pct * 100).toFixed(2) + '%', triggeredAt: Date.now()
          })
        });
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
    await saveEquitySnapshot(env, email, equity);

    // ── Fix: Max drawdown stop ────────────────────────────────
    // Track peak equity and halt bot if overall drawdown exceeds mddLimit (default 30%)
    const mddLimitRaw = parseFloat(cfg.mddLimit || 30);
    const mddLimit = mddLimitRaw > 1 ? mddLimitRaw / 100 : mddLimitRaw;
    const peakEquity = parseFloat(botStateRow.peak_equity || '0');
    if (peakEquity === 0 || equity > peakEquity) {
      await upsertBotState(env, email, { peak_equity: equity });
    } else if (peakEquity > 0 && (peakEquity - equity) / peakEquity >= mddLimit) {
      cfg.running = false;
      await env.USERS_KV.put('bot:config:' + email, JSON.stringify(cfg));
      await botNotify(env, { notifyEmail, notifyTelegram, telegramToken, telegramChatId, userEmail },
        `⚠️ Max drawdown ${(mddLimit*100).toFixed(0)}% reached ($${peakEquity.toFixed(0)} → $${equity.toFixed(0)}). Bot stopped.`);
      await botLog(env, email, `MDD limit ${(mddLimit*100).toFixed(0)}% triggered: $${peakEquity.toFixed(0)} → $${equity.toFixed(0)} — bot stopped`);
      return;
    }

    // ── Open positions ────────────────────────────────────────
    const posRes = await okxGet(apiKey, apiSecret, apiPassphrase, `/api/v5/account/positions?instId=${tradingPair}`, demoMode);
    const openPos = (posRes?.data || []).filter(p => parseFloat(p.pos) !== 0);
    // Detect whether account is in one-way mode (posSide='net') vs hedge mode (posSide='long'/'short')
    const isOneWayMode = openPos.some(p => p.posSide === 'net');

    // ── Position state already loaded from D1 at start of tick ─

    // ── Stop loss / TP check ─────────────────────────────────
    const hadPosition = !!ps[stateKey]?.direction;
    await checkSL(env, email, apiKey, apiSecret, apiPassphrase, tradingPair, openPos, equity, lossLimitEnabled, lossLimitNorm, numEntries, today, demoMode, ps, stateKey, isOneWayMode, psModifiedRef);
    // If loss-limit fired this tick and closed the position, flush state and skip new entries
    if (hadPosition && !ps[stateKey]?.direction) {
      if (psModifiedRef.modified) await upsertBotState(env, email, { position_state: JSON.stringify(ps) });
      return;
    }

    // ── Fetch all candles in parallel ─────────────────────────
    const candles1H = await getCandles(tradingPair, '1H', 250);
    if (candles1H.length < 20) {
      await botLog(env, email, `Skip: insufficient candle data (1H:${candles1H.length})`);
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

    // ── Sync position state with OKX ─────────────────────────
    if (ps[stateKey]?.direction) {
      const dir = ps[stateKey].direction;
      const matchingPos = openPos.find(p => {
        const amt = parseFloat(p.pos);
        if (dir === 'long')  return amt > 0 && (p.posSide === 'long'  || (p.posSide === 'net' && amt > 0));
        if (dir === 'short') return amt !== 0 && (p.posSide === 'short' || (p.posSide === 'net' && amt < 0));
        return false;
      });
      if (!matchingPos) {
        if (ps[stateKey].tpAlgoId) await cancelSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, ps[stateKey].tpAlgoId, demoMode);
        if (ps[stateKey].slAlgoId) await cancelSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, ps[stateKey].slAlgoId, demoMode);
        // Determine win/loss from close context
        const closedState = ps[stateKey];
        try {
          const avgEntry = closedState.entries?.length
            ? closedState.entries.reduce((s,e) => s + parseFloat(e.price)*parseInt(e.sz), 0) /
              closedState.entries.reduce((s,e) => s + parseInt(e.sz), 0)
            : 0;
          let isWin;
          if (closedState.halfClosed) {
            isWin = true; // already hit TP; remaining is a win
          } else if (closedState.takeProfit && closedState.stopLoss && currentPrice > 0) {
            isWin = Math.abs(currentPrice - closedState.takeProfit) < Math.abs(currentPrice - closedState.stopLoss);
          } else {
            isWin = avgEntry > 0 && (closedState.direction === 'long' ? currentPrice > avgEntry : currentPrice < avgEntry);
          }
          const freshState = await getBotState(env, email);
          const newWin  = parseInt(freshState.win_count  || '0') + (isWin ? 1 : 0);
          const newLoss = parseInt(freshState.loss_count || '0') + (isWin ? 0 : 1);
          // Fetch realized PnL from OKX positions history
          let realizedPnl = 0;
          try {
            const histRes = await okxGet(apiKey, apiSecret, apiPassphrase,
              `/api/v5/account/positions-history?instId=${tradingPair}&limit=1`, demoMode);
            realizedPnl = parseFloat(histRes?.data?.[0]?.realizedPnl || '0');
          } catch(_) {}
          const newWinPnl  = parseFloat(freshState.total_win_pnl  || '0') + (isWin  && realizedPnl > 0 ? realizedPnl  : 0);
          const newLossPnl = parseFloat(freshState.total_loss_pnl || '0') + (!isWin && realizedPnl < 0 ? Math.abs(realizedPnl) : 0);
          await upsertBotState(env, email, { win_count: newWin, loss_count: newLoss, total_win_pnl: newWinPnl, total_loss_pnl: newLossPnl });
          await botLog(env, email, `[${strategy}] Sync: ${tradingPair} closed externally — ${isWin ? '✓ WIN' : '✗ LOSS'} PnL:${realizedPnl.toFixed(2)} (W:${newWin} L:${newLoss})`);
        } catch(e2) {
          await botLog(env, email, `[${strategy}] Sync: cleared ${tradingPair} state — position closed externally`);
        }
        delete ps[stateKey];
        psModifiedRef.modified = true;
      }
    }
    const state = ps[stateKey] || { entries: [], direction: null, takeProfit: null };

    // ── Trailing TP: 10% close every 1% move beyond last TP ──
    if (state.halfClosed && state.lastTPLevel && openPos.length > 0) {
      const TRAIL_STEP = 0.010; // 1% move triggers next 10% close
      const movedEnough = state.direction === 'long'
        ? currentPrice >= state.lastTPLevel * (1 + TRAIL_STEP)
        : currentPrice <= state.lastTPLevel * (1 - TRAIL_STEP);

      if (movedEnough) {
        const totalSz = state.entries.reduce((s, e) => s + parseInt(e.sz), 0);
        const trailContracts = Math.max(1, Math.floor(totalSz * 0.10));
        const trailRes = await okxPost(apiKey, apiSecret, apiPassphrase, '/api/v5/trade/order', {
          instId: tradingPair, tdMode: 'cross',
          side:    state.direction === 'long' ? 'sell' : 'buy',
          ...(isOneWayMode ? {} : { posSide: state.direction === 'long' ? 'long' : 'short' }),
          ordType: 'market', sz: String(trailContracts)
        }, demoMode);

        if (trailRes?.data?.[0]?.ordId) {
          // Fix: track actual remaining contracts (not just fraction) to avoid rounding drift
          const prevRemaining = state.remainingContracts ?? Math.max(1, Math.floor(totalSz / 2));
          const newRemaining  = Math.max(0, prevRemaining - trailContracts);
          const newRemFrac    = newRemaining / totalSz;
          const prevTPLevel   = state.lastTPLevel; // SL will lock in at previous close level

          if (state.tpAlgoId) await cancelSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, state.tpAlgoId, demoMode);
          // Cancel old break-even/trail SL and replace with SL locked at prevTPLevel
          if (state.slAlgoId) await cancelSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, state.slAlgoId, demoMode);
          state.slAlgoId = null;

          state.lastTPLevel        = currentPrice;
          state.remainingContracts = newRemaining;
          state.remainingFrac      = newRemFrac;
          state.tpAlgoId           = null;

          if (newRemaining <= 0) {
            delete ps[stateKey];
            await upsertBotState(env, email, { position_state: JSON.stringify(ps) });
            await botLog(env, email, `[${strategy}] TRAIL +10% @ ${currentPrice} — position fully closed`);
          } else {
            // Place trailing SL at prevTPLevel — locks in profits from last close point
            if (prevTPLevel) {
              const trailSlRes = await placeSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, state.direction, prevTPLevel, String(newRemaining), demoMode, isOneWayMode);
              state.slAlgoId = trailSlRes?.data?.[0]?.algoId ? String(trailSlRes.data[0].algoId) : null;
              if (!state.slAlgoId) await botLog(env, email, `⚠️ Trail SL algo failed — ${newRemaining}cts unprotected`);
            }
            ps[stateKey] = state;
            await upsertBotState(env, email, { position_state: JSON.stringify(ps) });
            await botLog(env, email, `[${strategy}] TRAIL +10% @ ${currentPrice} | SL locked @ ${prevTPLevel?.toFixed(2) ?? 'n/a'} | Rem:${newRemaining}cts`);
          }
        } else {
          await botLog(env, email, `Trail order FAILED @ ${currentPrice}: ${trailRes?.msg || 'unknown'}`);
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

    // ── Entry signal (strategy routing) ──────────────────────
    let signal = null;
    switch (strategy) {
      case 'ha_ema_srsi':  signal = detectSignalHAEmaSRSI(candles1H, currentPrice);  break;
      case 'ma_ribbon':    signal = detectSignalMARibbon(candles1H, currentPrice);   break;
      case 'ma50_bounce':  signal = detectSignalMA50Bounce(candles1H, currentPrice); break;
      case 'ict_fib_ote':  signal = detectSignalICTFibOTE(candles1H, currentPrice);  break;
      default:             signal = detectSignalHAEmaSRSI(candles1H, currentPrice);  break;
    }
    if (!signal) {
      // Heartbeat: log once per 5 min so user can confirm bot is alive
      const hbKey = email + ':' + strategy;
      const lastHbTs = _lastHb.get(hbKey) || 0;
      if (Date.now() - lastHbTs > 5 * 60 * 1000) {
        await botLog(env, email, `[${strategy}] Scan: $${currentPrice.toFixed(0)} — no entry signal`);
        _lastHb.set(hbKey, Date.now());
      }
      return;
    }

    // ── 1H confirmation for SHORT ─────────────────────────────
    if (signal.type === 'short') {
      const h1c    = candles1H[0]?.map(parseFloat);
      const h1Bear = h1c && h1c[4] < h1c[1];
      if (!h1Bear) return; // require bearish candle for short confirmation
    }

    if (state.direction && state.direction !== signal.type) return;

    const entryNum = (state.entries || []).length + 1;
    if (entryNum > 1) return; // single entry only

    // ── TP = fixed 1.5% from entry (swing strategies) ────────
    const tp = signal.type === 'long'
      ? currentPrice * 1.015
      : currentPrice * 0.985;
    const useTP = true;

    // ── R:R filter ───────────────────────────────────────────
    const slDistRR = Math.abs(currentPrice - signal.stopLoss) / currentPrice;
    const tpDistRR = Math.abs(tp - currentPrice) / currentPrice;
    if (tpDistRR / slDistRR < 1.0) {
      await botLog(env, email, `Skip: R:R ${(tpDistRR / slDistRR).toFixed(2)}:1 < 1.0 | TP:${tp.toFixed(0)} SL:${signal.stopLoss.toFixed(0)}`);
      return;
    }

    // ── Fixed Fractional position sizing ─────────────────────
    const riskPct  = parseFloat(riskPerTrade) / 100;
    if (riskPct > 0.05 || safeLeverage > 20) {
      await botLog(env, email, `⚠️ Risk warning: riskPerTrade=${(riskPct*100).toFixed(1)}% lev=${safeLeverage}x`);
    }
    const nEntries  = 1; // single entry only
    const slDist    = Math.abs(currentPrice - signal.stopLoss);        // price distance to SL
    const riskPerCt = slDist * ctVal;                                  // USD loss per contract if SL hit (leverage-independent)
    let totalCts    = riskPerCt > 0 ? Math.floor((equity * riskPct) / riskPerCt) : 0;
    // Leverage-aware cap: margin required per contract = contractValue / leverage
    const capCts    = Math.floor(equity * (posSize / 100) * safeLeverage / (currentPrice * ctVal));
    if (capCts < 1) {
      await botLog(env, email, `Skip: insufficient equity for 1 contract (equity=${equity.toFixed(0)} USDT, need ≥${(currentPrice * ctVal / safeLeverage).toFixed(0)} USDT margin/ct)`);
      return;
    }
    totalCts        = Math.max(1, Math.min(totalCts, capCts));  // at least 1 contract, capped by posSize

    const szContracts = Math.max(1, Math.floor(totalCts / nEntries));
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
    const lockAcquired = await acquireEntryLock(env, lockKey);
    if (!lockAcquired) {
      await botLog(env, email, `Skip: entry lock active — concurrent execution prevented`);
      return;
    }

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
      if (sCode === '51000' || sCode === '51006' || String(sCode) === '1') {
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
        await releaseEntryLock(env, lockKey);
        await okxPost(apiKey, apiSecret, apiPassphrase, '/api/v5/trade/close-position', {
          instId: tradingPair, mgnMode: 'cross',
          posSide: isOneWayMode ? 'net' : (signal.type === 'long' ? 'long' : 'short')
        }, demoMode);
        await botLog(env, email, `Fill unconfirmed — position closed for safety`);
        return;
      }
      // Partial fill guard: if less than 90% filled, close for safety to avoid orphan position
      if (filledSz < szContracts * 0.90) {
        await releaseEntryLock(env, lockKey);
        await okxPost(apiKey, apiSecret, apiPassphrase, '/api/v5/trade/close-position', {
          instId: tradingPair, mgnMode: 'cross',
          posSide: isOneWayMode ? 'net' : (signal.type === 'long' ? 'long' : 'short')
        }, demoMode);
        await botLog(env, email, `Partial fill: ${filledSz}/${szContracts} contracts — position closed for safety`);
        return;
      }
      const actualSz = String(Math.floor(filledSz));
      state.entries.push({ price: fillPrice, sz: actualSz, time: Date.now(), entry: entryNum });
      state.direction = signal.type;
      if (useTP) state.takeProfit = tp;
      if (entryNum === 1) { state.stopLoss = signal.stopLoss; state.strategy = strategy; }

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
          ...(isOneWayMode ? {} : { posSide: signal.type === 'long' ? 'long' : 'short' }),
          ordType: 'conditional', sz: accumSz,
          tpTriggerPx: safetyTpPx, tpOrdPx: '-1'
        }, demoMode);
        state.tpAlgoId = tpAlgoRes?.data?.[0]?.algoId ? String(tpAlgoRes.data[0].algoId) : null;
      }
      const slAlgoRes = await placeSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, signal.type, state.stopLoss || signal.stopLoss, accumSz, demoMode, isOneWayMode);
      state.slAlgoId = slAlgoRes?.data?.[0]?.algoId ? String(slAlgoRes.data[0].algoId) : null;
      if (!state.slAlgoId) await botLog(env, email, '⚠️ Native SL algo failed — SL is software-only this tick');

      ps[stateKey] = state;
      try {
        await upsertBotState(env, email, { position_state: JSON.stringify(ps) });
        await releaseEntryLock(env, lockKey); // release lock only after state saved
      } catch(dbErr) {
        // If D1 write fails, cancel TP/SL algos AND close the position to prevent an orphan
        if (state.tpAlgoId) await cancelSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, state.tpAlgoId, demoMode);
        if (state.slAlgoId) await cancelSLAlgo(apiKey, apiSecret, apiPassphrase, tradingPair, state.slAlgoId, demoMode);
        await okxPost(apiKey, apiSecret, apiPassphrase, '/api/v5/trade/close-position', {
          instId: tradingPair, mgnMode: 'cross',
          posSide: isOneWayMode ? 'net' : (signal.type === 'long' ? 'long' : 'short')
        }, demoMode);
        await botLog(env, email, `[${strategy}] D1 write failed — position closed to prevent orphan: ${dbErr.message}`);
        return;
      }

      const tpStr    = ` | TP:${tp.toFixed(2)}`;
      const gradeStr = signal.grade ? `[Grade ${signal.grade}] ` : '';
      const riskStr  = `risk:${(lossLimitNorm*100).toFixed(0)}%`;
      await botLog(env, email, `[${strategy}] ${signal.type.toUpperCase()} #${entryNum} @ ${fillPrice} | ${gradeStr}L:${signal.level.toFixed(2)} | ${riskStr}${tpStr} | sz:${sz}`);
      await botNotify(env, { notifyEmail, notifyTelegram, telegramToken, telegramChatId, userEmail },
        `${signal.type.toUpperCase()} entry #${entryNum} placed @ ${fillPrice} USDT${tpStr}`);
    } else {
      const errCode = orderRes?.data?.[0]?.sCode || orderRes?.code || '?';
      const errMsg  = orderRes?.data?.[0]?.sMsg || orderRes?.msg || 'unknown';
      await botLog(env, email, `Order FAILED [${errCode}]: ${signal.type.toUpperCase()} @ ${currentPrice} — ${errMsg}`);
    }

    // Flush position state to D1 once if modified during this tick (not already written inline)
    if (psModifiedRef.modified) {
      await upsertBotState(env, email, { position_state: JSON.stringify(ps) });
    }

  } catch(e) {
    await botLog(env, email, 'Bot error: ' + e.message);
  }
}

// ── STOP LOSS / TP CHECK ──────────────────────────────────────
async function checkSL(env, email, apiKey, secret, pass, pair, openPos, equity, lossLimitEnabled, lossLimitNorm, numEntries, today, demo, ps, stateKey, isOneWayMode = false, psModifiedRef = { modified: false }) {
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
        const totalSz = state.entries.reduce((sum, e) => sum + parseInt(e.sz), 0);
        const isScalp = SCALP_STRATS.includes(state.strategy);

        if (isScalp) {
          // Scalp strategies: close 100%, done
          const tpCloseRes = await okxPost(apiKey, secret, pass, '/api/v5/trade/order', {
            instId: pair, tdMode: 'cross',
            side:    state.direction === 'long' ? 'sell' : 'buy',
            ...(isOneWayMode ? {} : { posSide: state.direction === 'long' ? 'long' : 'short' }),
            ordType: 'market', sz: String(totalSz)
          }, demo);
          if (!tpCloseRes?.data?.[0]?.ordId) {
            await botLog(env, email, `TP close FAILED [${tpCloseRes?.code}]: ${tpCloseRes?.msg} — algos preserved`);
            return;
          }
          if (state.tpAlgoId) await cancelSLAlgo(apiKey, secret, pass, pair, state.tpAlgoId, demo);
          if (state.slAlgoId) await cancelSLAlgo(apiKey, secret, pass, pair, state.slAlgoId, demo);
          await botLog(env, email, `[${state.strategy}] TP hit @ ${price} — 100% closed (scalp)`);
          delete ps[actualKey];
          psModifiedRef.modified = true;
          return;
        }

        // Swing strategies: close 50%, lock in 50% of TP1 profit as SL, start trailing
        const halfContracts = Math.max(1, Math.floor(totalSz / 2));
        const tpCloseRes = await okxPost(apiKey, secret, pass, '/api/v5/trade/order', {
          instId: pair, tdMode: 'cross',
          side:    state.direction === 'long' ? 'sell' : 'buy',
          ...(isOneWayMode ? {} : { posSide: state.direction === 'long' ? 'long' : 'short' }),
          ordType: 'market', sz: String(halfContracts)
        }, demo);
        if (!tpCloseRes?.data?.[0]?.ordId) {
          await botLog(env, email, `TP close FAILED [${tpCloseRes?.code}]: ${tpCloseRes?.msg} — algos preserved`);
          return;
        }

        if (state.tpAlgoId) await cancelSLAlgo(apiKey, secret, pass, pair, state.tpAlgoId, demo);
        if (state.slAlgoId) await cancelSLAlgo(apiKey, secret, pass, pair, state.slAlgoId, demo);
        const remContracts = Math.max(0, totalSz - halfContracts);

        const avgEntry = state.entries.reduce((s, e) => s + parseFloat(e.price) * parseInt(e.sz), 0) /
                         state.entries.reduce((s, e) => s + parseInt(e.sz), 0);
        const dist = Math.abs(price - avgEntry);
        const lockedSL = state.direction === 'long' ? avgEntry + dist * 0.5 : avgEntry - dist * 0.5;

        state.halfClosed         = true;
        state.takeProfit         = null;
        state.lastTPLevel        = price;
        state.remainingContracts = remContracts;
        state.remainingFrac      = remContracts > 0 ? remContracts / totalSz : 0;
        state.tpAlgoId           = null;
        state.slAlgoId           = null;

        if (remContracts > 0 && avgEntry > 0) {
          const beSlRes = await placeSLAlgo(apiKey, secret, pass, pair, state.direction, lockedSL, String(remContracts), demo, isOneWayMode);
          state.slAlgoId = beSlRes?.data?.[0]?.algoId ? String(beSlRes.data[0].algoId) : null;
          if (state.slAlgoId) {
            await botLog(env, email, `[${state.strategy}] TP hit @ ${price} — 50% closed | locked SL @ ${lockedSL.toFixed(2)} (+50% TP1 profit) | trailing active`);
          } else {
            await botLog(env, email, `[${state.strategy}] TP hit @ ${price} — 50% closed | ⚠️ locked SL failed | trailing active (no SL protection)`);
          }
        } else {
          await botLog(env, email, `[${state.strategy}] TP hit @ ${price} — 50% closed | trailing active`);
        }

        ps[actualKey] = state;
        psModifiedRef.modified = true;
        return;
      }
    }
  }

  // ── Loss-limit SL: activates only after all entries placed ─
  if (!lossLimitEnabled || !openPos.length) return;
  if ((state.entries?.length || 0) < 1) return;

  const floatPnl     = openPos.reduce((s, p) => s + parseFloat(p.upl || '0'), 0);
  const floatLossPct = floatPnl < 0 ? Math.abs(floatPnl) / (equity || 1) : 0;
  // Load daily_loss from D1 (passed via the bot state row — re-read for freshness)
  const dlStateRow   = await getBotState(env, email);
  const dlRaw        = dlStateRow.daily_loss || '{}';
  const dlObj        = JSON.parse(dlRaw);
  const dl           = (dlObj.date === today) ? dlObj : { date: today, pct: 0 };
  const totalLossPct = (dl.pct || 0) + floatLossPct;

  if (totalLossPct < lossLimitNorm) return;

  const closeRes = await okxPost(apiKey, secret, pass, '/api/v5/trade/close-position', {
    instId: pair, mgnMode: 'cross',
    posSide: isOneWayMode ? 'net' : (state.direction === 'long' ? 'long' : 'short')
  }, demo);
  if (closeRes?.code !== '0') {
    await botLog(env, email, `close-position FAILED [${closeRes?.code}]: ${closeRes?.msg} — retrying next tick`);
    return;
  }

  if (state.tpAlgoId) await cancelSLAlgo(apiKey, secret, pass, pair, state.tpAlgoId, demo);
  if (state.slAlgoId) await cancelSLAlgo(apiKey, secret, pass, pair, state.slAlgoId, demo);

  dl.pct = totalLossPct;
  const newLossCount = parseInt(dlStateRow.loss_count || '0') + 1;
  let dlRealizedPnl = 0;
  try {
    const dlHistRes = await okxGet(apiKey, secret, pass, `/api/v5/account/positions-history?instId=${pair}&limit=1`, demo);
    dlRealizedPnl = parseFloat(dlHistRes?.data?.[0]?.realizedPnl || '0');
  } catch(_) {}
  const newDlLossPnl = parseFloat(dlStateRow.total_loss_pnl || '0') + (dlRealizedPnl < 0 ? Math.abs(dlRealizedPnl) : 0);
  await upsertBotState(env, email, { daily_loss: JSON.stringify({ date: today, pct: totalLossPct }), loss_count: newLossCount, total_loss_pnl: newDlLossPnl });
  delete ps[actualKey];
  psModifiedRef.modified = true;
  await botLog(env, email, `Loss limit ${(totalLossPct*100).toFixed(2)}% reached (float: ${(floatLossPct*100).toFixed(2)}%) — position closed ✗ LOSS (total losses: ${newLossCount})`);
}

// ════════════════════════════════════════════════════════════
// INDICATORS
// ════════════════════════════════════════════════════════════

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


function calcHACandles(candles) {
  // candles: newest first [ts, open, high, low, close, vol]
  const rev = [...candles].reverse();
  const ha = [];
  for (let i = 0; i < rev.length; i++) {
    const o = parseFloat(rev[i][1]), h = parseFloat(rev[i][2]);
    const l = parseFloat(rev[i][3]), c = parseFloat(rev[i][4]);
    const haClose = (o + h + l + c) / 4;
    const haOpen  = i === 0 ? (o + c) / 2 : (ha[i-1][1] + ha[i-1][4]) / 2;
    const haHigh  = Math.max(h, haOpen, haClose);
    const haLow   = Math.min(l, haOpen, haClose);
    ha.push([rev[i][0], haOpen, haHigh, haLow, haClose, rev[i][5]]);
  }
  ha.reverse();
  return ha;
}

function calcEMA200(closes) {
  // closes: newest first, returns most recent EMA value
  if (closes.length < 200) return null;
  const rev = [...closes].reverse();
  const k = 2 / 201;
  let ema = rev.slice(0, 200).reduce((s, v) => s + v, 0) / 200;
  for (let i = 200; i < rev.length; i++) {
    ema = rev[i] * k + ema * (1 - k);
  }
  return ema;
}

function calcStochRSI(closes, rsiLen = 14, stochLen = 14, kSmooth = 3, dSmooth = 3) {
  // closes: newest first. Need enough candles.
  if (closes.length < rsiLen + stochLen + kSmooth + dSmooth + 5) return null;
  const rev = [...closes].reverse(); // oldest first
  // Compute RSI series (oldest first)
  let gains = 0, losses = 0;
  for (let i = 1; i <= rsiLen; i++) {
    const d = rev[i] - rev[i-1];
    if (d > 0) gains += d; else losses -= d;
  }
  let ag = gains / rsiLen, al = losses / rsiLen;
  const rsiSeries = [];
  for (let i = rsiLen; i < rev.length; i++) {
    const rs = al === 0 ? 100 : ag / al;
    rsiSeries.push(100 - 100 / (1 + rs));
    if (i < rev.length - 1) {
      const d = rev[i+1] - rev[i];
      ag = (ag * (rsiLen - 1) + Math.max(d, 0)) / rsiLen;
      al = (al * (rsiLen - 1) + Math.max(-d, 0)) / rsiLen;
    }
  }
  if (rsiSeries.length < stochLen) return null;
  // Stochastic of RSI
  const stochSeries = [];
  for (let i = stochLen - 1; i < rsiSeries.length; i++) {
    const slice = rsiSeries.slice(i - stochLen + 1, i + 1);
    const hi = Math.max(...slice), lo = Math.min(...slice);
    stochSeries.push(hi === lo ? 50 : (rsiSeries[i] - lo) / (hi - lo) * 100);
  }
  if (stochSeries.length < kSmooth + dSmooth) return null;
  // K line = SMA(stoch, kSmooth)
  const kSeries = [];
  for (let i = kSmooth - 1; i < stochSeries.length; i++) {
    kSeries.push(stochSeries.slice(i - kSmooth + 1, i + 1).reduce((s,v) => s+v, 0) / kSmooth);
  }
  if (kSeries.length < dSmooth + 1) return null;
  // D line = SMA(K, dSmooth)
  const dSeries = [];
  for (let i = dSmooth - 1; i < kSeries.length; i++) {
    dSeries.push(kSeries.slice(i - dSmooth + 1, i + 1).reduce((s,v) => s+v, 0) / dSmooth);
  }
  // Return most recent 2 values (newest = last in series)
  const k0 = kSeries[kSeries.length - 1], k1 = kSeries[kSeries.length - 2];
  const d0 = dSeries[dSeries.length - 1], d1 = dSeries[dSeries.length - 2];
  return { k: k0, kPrev: k1, d: d0, dPrev: d1 };
}

function detectSignalHAEmaSRSI(candles, currentPrice) {
  if (candles.length < 210) return null;
  const closes = candles.map(c => parseFloat(c[4]));
  const ema200  = calcEMA200(closes);
  if (!ema200) return null;
  const srsi = calcStochRSI(closes);
  if (!srsi) return null;
  const ha = calcHACandles(candles);
  if (ha.length < 3) return null;

  const haC  = ha[0]; // current HA candle
  const haP  = ha[1]; // previous HA candle
  const haOpen  = haC[1], haHigh = haC[2], haLow = haC[3], haClose = haC[4];
  const pOpen   = haP[1], pClose = haP[4];
  const haBody  = Math.abs(haClose - haOpen);
  const pBody   = Math.abs(pClose - pOpen);
  const range   = haHigh - haLow;
  const lowerWick = Math.min(haOpen, haClose) - haLow;
  const upperWick = haHigh - Math.max(haOpen, haClose);

  // LONG: price above 200 EMA, StochRSI K crosses above D from oversold (<20), strong HA bullish candle
  const kCrossUp = srsi.kPrev < srsi.dPrev && srsi.k >= srsi.d && srsi.kPrev < 30;
  const strongBull = haClose > haOpen && haBody > pBody * 0.8 && lowerWick < haBody * 0.15;
  if (currentPrice > ema200 && kCrossUp && strongBull) {
    const swingLow = Math.min(...candles.slice(1, 8).map(c => parseFloat(c[3])));
    if (swingLow >= currentPrice) return null;
    return { type: 'long', level: currentPrice, grade: 'S', stopLoss: swingLow, strategy: 'ha_ema_srsi' };
  }

  // SHORT: price below 200 EMA, StochRSI K crosses below D from overbought (>70), strong HA bearish candle
  const kCrossDown = srsi.kPrev > srsi.dPrev && srsi.k <= srsi.d && srsi.kPrev > 70;
  const strongBear = haClose < haOpen && haBody > pBody * 0.8 && upperWick < haBody * 0.15;
  if (currentPrice < ema200 && kCrossDown && strongBear) {
    const swingHigh = Math.max(...candles.slice(1, 8).map(c => parseFloat(c[2])));
    if (swingHigh <= currentPrice) return null;
    return { type: 'short', level: currentPrice, grade: 'S', stopLoss: swingHigh, strategy: 'ha_ema_srsi' };
  }

  return null;
}



function detectSignalMA50Bounce(candles1H, currentPrice) {
  const closes = candles1H.map(c => parseFloat(c[4]));
  if (closes.length < 205) return null;
  const sma50 = _sma(closes, 50);
  const sma200 = _sma(closes, 200);
  if (!sma50 || !sma200) return null;
  const distTo50 = Math.abs(currentPrice - sma50) / currentPrice;
  if (distTo50 > 0.012) return null;
  const recentAbove = candles1H.slice(1, 11).filter(c => parseFloat(c[4]) > sma50).length;
  const recentBelow = candles1H.slice(1, 11).filter(c => parseFloat(c[4]) < sma50).length;
  const bodies = candles1H.slice(0, 3).map(c => Math.abs(parseFloat(c[4]) - parseFloat(c[1])) / parseFloat(c[1]));
  const isNarrow = bodies.every(b => b <= 0.008);
  const rsi = calcRSI(candles1H, 14);
  if (!rsi) return null;
  if (sma50 > sma200 && recentAbove >= 7 && currentPrice >= sma50 && isNarrow && rsi >= 35 && rsi <= 65) {
    const sl = Math.min(...candles1H.slice(0, 5).map(c => parseFloat(c[3])));
    const d = (currentPrice - sl) / currentPrice;
    if (d < 0.003 || d > 0.08) return null;
    return { type: 'long', level: currentPrice, grade: 'A', stopLoss: sl, strategy: 'ma50_bounce' };
  }
  if (sma50 < sma200 && recentBelow >= 7 && currentPrice <= sma50 && isNarrow && rsi >= 35 && rsi <= 65) {
    const sl = Math.max(...candles1H.slice(0, 5).map(c => parseFloat(c[2])));
    const d = (sl - currentPrice) / currentPrice;
    if (d < 0.003 || d > 0.08) return null;
    return { type: 'short', level: currentPrice, grade: 'A', stopLoss: sl, strategy: 'ma50_bounce' };
  }
  return null;
}

function detectSignalICTFibOTE(candles1H, currentPrice) {
  if (candles1H.length < 55) return null;
  const swing = candles1H.slice(1, 51);
  const swingHigh = Math.max(...swing.map(c => parseFloat(c[2])));
  const swingLow  = Math.min(...swing.map(c => parseFloat(c[3])));
  const range = swingHigh - swingLow;
  if (range <= 0) return null;
  const oteBot = swingLow  + range * 0.21;
  const oteTop = swingLow  + range * 0.38;
  const prBot  = swingHigh - range * 0.38;
  const prTop  = swingHigh - range * 0.21;
  const curCandle = candles1H[0];
  const isBullish = parseFloat(curCandle[4]) > parseFloat(curCandle[1]);
  const isBearish = parseFloat(curCandle[4]) < parseFloat(curCandle[1]);
  const rsi = calcRSI(candles1H, 14);
  if (!rsi) return null;
  if (currentPrice >= oteBot && currentPrice <= oteTop && isBullish && rsi < 55) {
    const sl = swingLow * 0.999;
    const d = (currentPrice - sl) / currentPrice;
    if (d < 0.005 || d > 0.15) return null;
    return { type: 'long', level: currentPrice, grade: 'A', stopLoss: sl, strategy: 'ict_fib_ote' };
  }
  if (currentPrice >= prBot && currentPrice <= prTop && isBearish && rsi > 45) {
    const sl = swingHigh * 1.001;
    const d = (sl - currentPrice) / currentPrice;
    if (d < 0.005 || d > 0.15) return null;
    return { type: 'short', level: currentPrice, grade: 'A', stopLoss: sl, strategy: 'ict_fib_ote' };
  }
  return null;
}

// ── NATIVE ALGO ORDERS ────────────────────────────────────────
async function placeSLAlgo(apiKey, secret, pass, pair, direction, slPrice, sz, demo = false, isOneWayMode = false) {
  return okxPost(apiKey, secret, pass, '/api/v5/trade/order-algo', {
    instId: pair, tdMode: 'cross',
    side:         direction === 'long' ? 'sell' : 'buy',
    ...(isOneWayMode ? {} : { posSide: direction === 'long' ? 'long' : 'short' }),
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

  const targetEmailLower = targetEmail.toLowerCase();
  const [botConfig, adminBotState] = await Promise.all([
    env.USERS_KV.get('bot:config:' + targetEmailLower, { type: 'json' }),
    getBotState(env, targetEmailLower)
  ]);
  const botLogs  = JSON.parse(adminBotState.logs || '[]');
  const positions = JSON.parse(adminBotState.position_state || '{}');

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

const ADMIN_EMAIL_CONST = 'wldnjswldnjs00@gmail.com';

async function handleAdminListUsers(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const session = await requireSession(body, env, request);
    if (!session || session.email !== ADMIN_EMAIL_CONST) return json({ ok: false, error: 'forbidden' }, 403);

    const { keys } = await env.USERS_KV.list({ prefix: 'user:' });
    const users = [];
    for (const key of keys) {
      try {
        const u = await env.USERS_KV.get(key.name, { type: 'json' });
        if (!u) continue;
        const email = key.name.slice('user:'.length);
        const cfg = await env.USERS_KV.get('bot:config:' + email, { type: 'json' });
        const botState = await getBotState(env, email);
        const sub = u.subscription || {};
        users.push({
          email,
          plan: sub.plan || 'free',
          planExpiresAt: sub.expiresAt || null,
          createdAt: u.createdAt || null,
          botRunning: cfg?.running === true && botState.running !== 0,
          verified: u.verified || false,
        });
      } catch(e) {}
    }
    return json({ ok: true, users });
  } catch(e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

async function handleAdminSetPlan(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const session = await requireSession(body, env, request);
    if (!session || session.email !== ADMIN_EMAIL_CONST) return json({ ok: false, error: 'forbidden' }, 403);

    const { email, plan } = body;
    if (!email || !plan) return json({ ok: false, error: 'email and plan required' }, 400);
    if (!['starter', 'pro', 'elite'].includes(plan)) return json({ ok: false, error: 'invalid plan' }, 400);

    const userKey = 'user:' + email;
    const u = await env.USERS_KV.get(userKey, { type: 'json' });
    if (!u) return json({ ok: false, error: 'user not found' }, 404);

    const expiresAt = plan === 'free' ? null : Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    u.subscription = { plan, expiresAt, grantedBy: 'admin', grantedAt: Date.now() };
    await env.USERS_KV.put(userKey, JSON.stringify(u));
    return json({ ok: true });
  } catch(e) {
    return json({ ok: false, error: e.message }, 500);
  }
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
  ];
  if (body.sessionToken) dels.push(env.USERS_KV.delete('session:' + body.sessionToken));
  if (user?.username)    dels.push(env.USERS_KV.delete('username:' + user.username.toLowerCase()));
  await Promise.all(dels);
  // Delete D1 bot_state and entry_locks rows
  if (env.BOT_DB) {
    try {
      await env.BOT_DB.prepare('DELETE FROM bot_state WHERE email=?').bind(email).run();
      await env.BOT_DB.prepare('DELETE FROM entry_locks WHERE lock_key LIKE ?').bind('bot:entry_lock:' + email + ':%').run();
    } catch(e) {}
  }
  return json({ ok: true });
}

// ── BOT LOG & NOTIFY ──────────────────────────────────────────
// Module-level log buffer map: email → array, active during cron execution
const _logBufs = new Map();

async function botLog(env, email, msg) {
  const buf = _logBufs.get(email);
  if (buf) {
    buf.unshift({ time: new Date().toISOString(), msg });
    return;
  }
  // Fallback: direct D1 write (used outside cron context)
  try {
    const stateRow = await getBotState(env, email);
    const logs = JSON.parse(stateRow.logs || '[]');
    logs.unshift({ time: new Date().toISOString(), msg });
    if (logs.length > 200) {
      logs.splice(199);
      logs.push({ time: new Date().toISOString(), msg: '— older entries removed (200 log limit) —' });
    }
    await upsertBotState(env, email, { logs: JSON.stringify(logs) });
  } catch(e) {}
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
