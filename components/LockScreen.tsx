"use client";

import { useState, useEffect, useCallback } from "react";
import { COINS, PriceData, Alert, Coin } from "@/lib/coins";
import { registerServiceWorker, subscribeToPush, savePushSubscription, sendTestNotification, triggerPriceAlert } from "@/lib/push";
import PriceChart from "./PriceChart";
import AlertPanel from "./AlertPanel";

export default function LockScreen() {
  const [time, setTime] = useState(new Date());
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [selectedCoin, setSelectedCoin] = useState<Coin>(COINS[0]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [pushReady, setPushReady] = useState(false);
  const [swReg, setSwReg] = useState<ServiceWorkerRegistration | null>(null);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Service Worker + Push
  useEffect(() => {
    registerServiceWorker().then(async (reg) => {
      if (!reg) return;
      setSwReg(reg);
      const sub = await subscribeToPush(reg);
      if (sub) {
        await savePushSubscription(sub);
        setPushReady(true);
      }
    });
  }, []);

  // Load alerts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("oracle-alerts");
    if (saved) setAlerts(JSON.parse(saved));
  }, []);

  const saveAlerts = useCallback((newAlerts: Alert[]) => {
    setAlerts(newAlerts);
    localStorage.setItem("oracle-alerts", JSON.stringify(newAlerts));
  }, []);

  // Binance WebSocket for real-time prices
  useEffect(() => {
    const streams = COINS.map((c) => `${c.binanceSymbol.toLowerCase()}@ticker`).join("/");
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const d = msg.data;
      if (!d) return;
      const coin = COINS.find((c) => c.binanceSymbol === d.s);
      if (!coin) return;

      setPrices((prev) => ({
        ...prev,
        [coin.symbol]: {
          symbol: coin.symbol,
          price: parseFloat(d.c),
          change24h: parseFloat(d.P),
          high24h: parseFloat(d.h),
          low24h: parseFloat(d.l),
          volume24h: parseFloat(d.v),
        },
      }));
    };

    return () => ws.close();
  }, []);

  // Check alerts
  useEffect(() => {
    if (!prices || !alerts.length) return;

    alerts.forEach(async (alert) => {
      if (alert.triggered) return;
      const price = prices[alert.symbol]?.price;
      if (!price) return;

      const hit =
        (alert.condition === "above" && price >= alert.targetPrice) ||
        (alert.condition === "below" && price <= alert.targetPrice);

      if (hit) {
        const updated = alerts.map((a) =>
          a.id === alert.id ? { ...a, triggered: true } : a
        );
        saveAlerts(updated);
        await triggerPriceAlert(alert.symbol, alert.targetPrice, alert.condition);

        // Local sound fallback
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.6);
        } catch {}
      }
    });
  }, [prices, alerts, saveAlerts]);

  const currentPrice = prices[selectedCoin.symbol];
  const isUp = (currentPrice?.change24h ?? 0) >= 0;

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });

  const formatDate = (d: Date) =>
    d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (p >= 1) return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
    return p.toLocaleString("en-US", { maximumFractionDigits: 5 });
  };

  return (
    <div className="relative w-full h-dvh flex flex-col overflow-hidden bg-black select-none">
      {/* Background gradient */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${selectedCoin.color}22 0%, transparent 60%), #000`,
        }}
      />

      {/* Status bar */}
      <div className="relative z-10 flex justify-between items-center px-6 pt-3 pb-1">
        <span className="text-white text-sm font-semibold">
          {time.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}
        </span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${pushReady ? "bg-green-400" : "bg-gray-600"}`} />
          <span className="text-white text-xs opacity-60">{pushReady ? "알람 ON" : "알람 OFF"}</span>
        </div>
      </div>

      {/* Time & Date */}
      <div className="relative z-10 text-center pt-4 pb-2">
        <div className="text-white font-thin leading-none" style={{ fontSize: "clamp(64px, 18vw, 80px)" }}>
          {formatTime(time)}
        </div>
        <div className="text-white/70 text-base mt-1">{formatDate(time)}</div>
      </div>

      {/* Selected coin big price */}
      <div className="relative z-10 text-center py-2">
        <div className="flex items-center justify-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: selectedCoin.color }}
          >
            {selectedCoin.symbol[0]}
          </div>
          <span className="text-white/60 text-lg">{selectedCoin.name}</span>
        </div>
        <div
          className={`text-4xl font-semibold mt-1 transition-colors ${isUp ? "text-green-400" : "text-red-400"}`}
        >
          ${currentPrice ? formatPrice(currentPrice.price) : "---"}
        </div>
        <div className={`text-base mt-0.5 ${isUp ? "text-green-400" : "text-red-400"}`}>
          {currentPrice ? `${isUp ? "+" : ""}${currentPrice.change24h.toFixed(2)}%` : "---"}
        </div>
      </div>

      {/* Chart */}
      <div className="relative z-10 flex-1 mx-3 my-1 min-h-0">
        <div className="glass-dark rounded-2xl h-full overflow-hidden">
          <PriceChart symbol={selectedCoin.binanceSymbol} color={selectedCoin.color} />
        </div>
      </div>

      {/* Coin selector */}
      <div className="relative z-10 px-3 py-2">
        <div className="glass rounded-2xl p-2">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {COINS.map((coin) => {
              const p = prices[coin.symbol];
              const up = (p?.change24h ?? 0) >= 0;
              return (
                <button
                  key={coin.symbol}
                  onClick={() => setSelectedCoin(coin)}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl transition-all ${
                    selectedCoin.symbol === coin.symbol
                      ? "bg-white/20"
                      : "bg-white/5 active:bg-white/15"
                  }`}
                >
                  <span className="text-white text-xs font-semibold">{coin.symbol}</span>
                  <span className={`text-xs mt-0.5 ${up ? "text-green-400" : "text-red-400"}`}>
                    {p ? `${up ? "+" : ""}${p.change24h.toFixed(1)}%` : "..."}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alert button */}
      <div className="relative z-10 px-3 pb-4">
        <button
          onClick={() => setShowAlertPanel(true)}
          className="w-full glass rounded-2xl py-3 flex items-center justify-center gap-2 active:opacity-70 transition-opacity"
        >
          <span className="text-2xl">🔔</span>
          <span className="text-white font-medium">가격 알람 설정</span>
          {alerts.filter((a) => !a.triggered).length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {alerts.filter((a) => !a.triggered).length}
            </span>
          )}
        </button>
      </div>

      {/* Alert Panel */}
      {showAlertPanel && (
        <AlertPanel
          coins={COINS}
          prices={prices}
          alerts={alerts}
          onSave={saveAlerts}
          onClose={() => setShowAlertPanel(false)}
          onTest={() => sendTestNotification()}
        />
      )}
    </div>
  );
}
