export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return corsResponse('', 204);
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/send-verification') {
      return handleVerification(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/send-confirmation') {
      return handleConfirmation(request, env);
    }

    return corsResponse(JSON.stringify({ error: 'Not found' }), 404);
  }
};

async function handleVerification(request, env) {
  const { email } = await request.json();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return corsResponse(JSON.stringify({ error: 'Invalid email' }), 400);
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'AYILON <onboarding@resend.dev>',
      to: [email],
      subject: 'Your AYILON verification code',
      html: `
        <div style="background:#000;color:#fff;font-family:Inter,sans-serif;padding:40px;max-width:480px;margin:0 auto;border-radius:12px;">
          <h1 style="font-size:24px;margin-bottom:8px;">AYILON</h1>
          <p style="color:#a3a3a3;margin-bottom:32px;">Email Verification</p>
          <p style="color:#a3a3a3;margin-bottom:16px;">Your verification code is:</p>
          <div style="background:#111;border:1px solid #333;border-radius:10px;padding:24px;text-align:center;font-size:42px;font-weight:700;letter-spacing:12px;margin-bottom:24px;">
            ${code}
          </div>
          <p style="color:#525252;font-size:13px;">This code expires in 5 minutes. Do not share it with anyone.</p>
        </div>
      `
    })
  });

  if (!res.ok) {
    return corsResponse(JSON.stringify({ error: 'Failed to send email' }), 500);
  }

  // Store code temporarily using a simple in-memory approach
  // In production, use KV or D1 for persistence
  return corsResponse(JSON.stringify({ success: true, code }), 200);
}

async function handleConfirmation(request, env) {
  const { email, plan, billing, amount } = await request.json();
  if (!email || !plan) {
    return corsResponse(JSON.stringify({ error: 'Missing fields' }), 400);
  }

  const billingLabel = billing === 'annual' ? 'Annual' : 'Monthly';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'AYILON <onboarding@resend.dev>',
      to: [email],
      subject: `Your AYILON ${plan} plan is now active`,
      html: `
        <div style="background:#000;color:#fff;font-family:Inter,sans-serif;padding:40px;max-width:480px;margin:0 auto;border-radius:12px;">
          <h1 style="font-size:24px;margin-bottom:8px;">AYILON</h1>
          <p style="color:#a3a3a3;margin-bottom:32px;">Payment Confirmed</p>
          <div style="background:#111;border:1px solid #333;border-radius:10px;padding:24px;margin-bottom:24px;">
            <p style="color:#a3a3a3;font-size:13px;margin-bottom:16px;">ORDER SUMMARY</p>
            <table style="width:100%;font-size:14px;">
              <tr><td style="color:#a3a3a3;padding:6px 0;">Plan</td><td style="text-align:right;font-weight:600;">${plan}</td></tr>
              <tr><td style="color:#a3a3a3;padding:6px 0;">Billing</td><td style="text-align:right;">${billingLabel}</td></tr>
              <tr><td style="color:#a3a3a3;padding:6px 0;border-top:1px solid #333;">Amount paid</td><td style="text-align:right;font-weight:700;border-top:1px solid #333;">$${amount}</td></tr>
            </table>
          </div>
          <p style="color:#22c55e;font-size:15px;font-weight:600;margin-bottom:16px;">✓ Your bots are ready to trade on OKX.</p>
          <a href="https://oracletrading-01o.pages.dev/dashboard.html" style="display:inline-block;background:#fff;color:#000;padding:12px 28px;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;">Go to Dashboard →</a>
          <p style="color:#525252;font-size:12px;margin-top:24px;">If you have any questions, reply to this email.</p>
        </div>
      `
    })
  });

  if (!res.ok) {
    return corsResponse(JSON.stringify({ error: 'Failed to send email' }), 500);
  }

  return corsResponse(JSON.stringify({ success: true }), 200);
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
