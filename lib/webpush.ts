// Edge-compatible Web Push (RFC 8291 / RFC 8188) using Web Crypto API only

// TypeScript 5.x Uint8Array is generic; crypto.subtle expects ArrayBuffer explicitly
function ab(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function b64u(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64uDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

function u32be(n: number): Uint8Array {
  return new Uint8Array([n >>> 24, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey("raw", ab(ikm), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: ab(salt), info: ab(info) }, baseKey, length * 8);
  return new Uint8Array(bits);
}

async function vapidJwt(
  audience: string,
  vapidPublicB64: string,
  vapidPrivateB64: string,
  email: string
): Promise<string> {
  const header = b64u(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const exp = Math.floor(Date.now() / 1000) + 43200;
  const claims = b64u(new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub: email })));
  const sigInput = new TextEncoder().encode(`${header}.${claims}`);

  // Reconstruct JWK from raw keys
  const pubRaw = b64uDecode(vapidPublicB64); // 65 bytes: 04 || x || y
  const privRaw = b64uDecode(vapidPrivateB64); // 32 bytes

  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: b64u(privRaw),
    x: b64u(pubRaw.slice(1, 33)),
    y: b64u(pubRaw.slice(33, 65)),
  };

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, ab(sigInput));

  return `${header}.${claims}.${b64u(sig)}`;
}

async function encryptPayload(
  sub: PushSubscription,
  plaintext: string
): Promise<{ body: Uint8Array; salt: Uint8Array; dh: Uint8Array }> {
  const ua_public_raw = b64uDecode(sub.keys.p256dh);
  const auth_secret = b64uDecode(sub.keys.auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Ephemeral P-256 key pair
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const dh_public_raw = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));

  // Import recipient public key
  const ua_key = await crypto.subtle.importKey("raw", ab(ua_public_raw), { name: "ECDH", namedCurve: "P-256" }, false, []);

  // ECDH shared secret
  const dh_secret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: ua_key }, ephemeral.privateKey, 256));

  // RFC 8291 key derivation
  const context = concat(
    new TextEncoder().encode("WebPush: info\x00"),
    ua_public_raw,
    dh_public_raw
  );

  const prk = await hkdf(auth_secret, dh_secret, context, 32);
  const cek = await hkdf(salt, prk, new TextEncoder().encode("Content-Encoding: aes128gcm\x00"), 16);
  const nonce = await hkdf(salt, prk, new TextEncoder().encode("Content-Encoding: nonce\x00"), 12);

  // Encrypt with AES-128-GCM
  const encKey = await crypto.subtle.importKey("raw", ab(cek), "AES-GCM", false, ["encrypt"]);
  const data = new TextEncoder().encode(plaintext);
  // Padding: content || 0x02 (record delimiter for last record)
  const padded = concat(data, new Uint8Array([2]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: ab(nonce) }, encKey, ab(padded)));

  // RFC 8188 header: salt (16) | rs (4) | idlen (1) | sender_pub (65)
  const rs = 4096;
  const header = concat(salt, u32be(rs), new Uint8Array([dh_public_raw.length]), dh_public_raw);
  const body = concat(header, ciphertext);

  return { body, salt, dh: dh_public_raw };
}

export async function sendPushNotification(
  sub: PushSubscription,
  payload: string,
  vapidPublic: string,
  vapidPrivate: string,
  vapidEmail: string
): Promise<number> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await vapidJwt(audience, vapidPublic, vapidPrivate, vapidEmail);
  const { body } = await encryptPayload(sub, payload);

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPublic}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
    },
    body: ab(body),
  });

  return res.status;
}
