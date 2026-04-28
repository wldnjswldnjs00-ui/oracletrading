export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return reg;
}

export async function subscribeToPush(reg: ServiceWorkerRegistration) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const existingSub = await reg.pushManager.getSubscription();
  if (existingSub) return existingSub;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
  return sub;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function savePushSubscription(sub: PushSubscription) {
  await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
}

export async function sendTestNotification() {
  await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "🔔 Oracle Trading",
      body: "알람이 설정되었습니다. 가격 도달 시 이렇게 알려드려요!",
    }),
  });
}

export async function triggerPriceAlert(symbol: string, price: number, condition: string) {
  await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `🚨 ${symbol} 가격 알람!`,
      body: `${symbol}이(가) $${price.toLocaleString()} ${condition === "above" ? "이상" : "이하"}에 도달했습니다!`,
    }),
  });
}
