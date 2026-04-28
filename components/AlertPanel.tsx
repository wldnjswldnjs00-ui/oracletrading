"use client";

import { useState } from "react";
import { Coin, Alert, PriceData } from "@/lib/coins";

interface Props {
  coins: Coin[];
  prices: Record<string, PriceData>;
  alerts: Alert[];
  onSave: (alerts: Alert[]) => void;
  onClose: () => void;
  onTest: () => void;
}

export default function AlertPanel({ coins, prices, alerts, onSave, onClose, onTest }: Props) {
  const [selectedSymbol, setSelectedSymbol] = useState(coins[0].symbol);
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");

  const currentPrice = prices[selectedSymbol]?.price;

  const addAlert = () => {
    const price = parseFloat(targetPrice);
    if (!price || price <= 0) return;

    const newAlert: Alert = {
      id: Date.now().toString(),
      symbol: selectedSymbol,
      targetPrice: price,
      condition,
      triggered: false,
      createdAt: Date.now(),
    };
    onSave([...alerts, newAlert]);
    setTargetPrice("");
  };

  const removeAlert = (id: string) => {
    onSave(alerts.filter((a) => a.id !== id));
  };

  const resetAlert = (id: string) => {
    onSave(alerts.map((a) => (a.id === id ? { ...a, triggered: false } : a)));
  };

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative glass-dark rounded-t-3xl max-h-[85dvh] flex flex-col overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        <div className="px-5 pb-2 flex items-center justify-between">
          <h2 className="text-white text-xl font-semibold">가격 알람</h2>
          <button onClick={onTest} className="text-white/40 text-sm active:text-white/70">
            테스트
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-safe">
          {/* Coin select */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {coins.map((c) => (
              <button
                key={c.symbol}
                onClick={() => setSelectedSymbol(c.symbol)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  selectedSymbol === c.symbol ? "text-white" : "text-white/40 bg-white/5"
                }`}
                style={selectedSymbol === c.symbol ? { backgroundColor: c.color + "44", color: c.color } : {}}
              >
                {c.symbol}
              </button>
            ))}
          </div>

          {/* Current price info */}
          {currentPrice && (
            <div className="bg-white/5 rounded-xl px-4 py-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">현재가</span>
                <span className="text-white font-semibold">${formatPrice(currentPrice)}</span>
              </div>
            </div>
          )}

          {/* Condition */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCondition("above")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                condition === "above" ? "bg-green-500/30 text-green-400" : "bg-white/5 text-white/40"
              }`}
            >
              ↑ 이상 도달 시
            </button>
            <button
              onClick={() => setCondition("below")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                condition === "below" ? "bg-red-500/30 text-red-400" : "bg-white/5 text-white/40"
              }`}
            >
              ↓ 이하 도달 시
            </button>
          </div>

          {/* Price input */}
          <div className="flex gap-2 mb-6">
            <div className="flex-1 bg-white/5 rounded-xl px-4 flex items-center">
              <span className="text-white/30 mr-1">$</span>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="목표 가격 입력"
                className="flex-1 bg-transparent text-white placeholder-white/30 text-base py-3 outline-none"
                inputMode="decimal"
              />
            </div>
            <button
              onClick={addAlert}
              disabled={!targetPrice}
              className="px-5 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-30 active:opacity-70"
              style={{ backgroundColor: coins.find((c) => c.symbol === selectedSymbol)?.color || "#fff" }}
            >
              추가
            </button>
          </div>

          {/* Alert list */}
          {alerts.length === 0 ? (
            <div className="text-center text-white/30 py-8 text-sm">
              설정된 알람이 없습니다
            </div>
          ) : (
            <div className="space-y-2 pb-6">
              <div className="text-white/40 text-xs mb-2">설정된 알람 {alerts.length}개</div>
              {alerts.map((alert) => {
                const coin = coins.find((c) => c.symbol === alert.symbol);
                return (
                  <div
                    key={alert.id}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                      alert.triggered ? "bg-red-500/15 border border-red-500/30" : "bg-white/5"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: coin?.color || "#fff" }}
                    >
                      {alert.symbol[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-semibold">
                        {alert.symbol} {alert.condition === "above" ? "≥" : "≤"} ${formatPrice(alert.targetPrice)}
                      </div>
                      <div className={`text-xs mt-0.5 ${alert.triggered ? "text-red-400" : "text-white/40"}`}>
                        {alert.triggered ? "🔔 알람 발생!" : `${alert.condition === "above" ? "상향" : "하향"} 돌파 시 알람`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {alert.triggered && (
                        <button
                          onClick={() => resetAlert(alert.id)}
                          className="text-white/40 text-xs active:text-white"
                        >
                          재설정
                        </button>
                      )}
                      <button
                        onClick={() => removeAlert(alert.id)}
                        className="text-white/20 text-lg leading-none active:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
