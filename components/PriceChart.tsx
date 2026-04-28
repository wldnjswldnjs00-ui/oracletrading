"use client";

import { useEffect, useRef, useState } from "react";
import { fetchKlines } from "@/lib/binance";
import { Candle } from "@/lib/coins";

interface Props {
  symbol: string;
  color: string;
}

const INTERVALS = [
  { label: "1분", value: "1m" },
  { label: "15분", value: "15m" },
  { label: "1시간", value: "1h" },
  { label: "4시간", value: "4h" },
  { label: "1일", value: "1d" },
];

export default function PriceChart({ symbol, color }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<any>(null);
  const [interval, setInterval] = useState("1h");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const currentSymbol = useRef(symbol);
  const currentInterval = useRef(interval);

  // Load chart library and create chart
  useEffect(() => {
    let destroyed = false;

    async function initChart() {
      const { createChart, CandlestickSeries } = await import("lightweight-charts");
      if (destroyed || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        layout: {
          background: { color: "transparent" },
          textColor: "rgba(255,255,255,0.5)",
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        crosshair: {
          vertLine: { color: "rgba(255,255,255,0.2)" },
          horzLine: { color: "rgba(255,255,255,0.2)" },
        },
        rightPriceScale: {
          borderColor: "transparent",
          textColor: "rgba(255,255,255,0.4)",
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: "transparent",
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (time: number) => {
            const d = new Date(time * 1000);
            if (currentInterval.current === "1d") {
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }
            return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
          },
        },
        handleScroll: true,
        handleScale: true,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });

      const series = (chart as any).addSeries(CandlestickSeries, {
        upColor: "#30d158",
        downColor: "#ff453a",
        borderUpColor: "#30d158",
        borderDownColor: "#ff453a",
        wickUpColor: "#30d158",
        wickDownColor: "#ff453a",
      });

      chartRef.current = chart;
      candleSeriesRef.current = series;

      // Resize observer
      const ro = new ResizeObserver(() => {
        if (containerRef.current) {
          chart.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      });
      ro.observe(containerRef.current);

      return () => ro.disconnect();
    }

    initChart();
    return () => {
      destroyed = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
      }
    };
  }, []);

  // Fetch candles when symbol/interval changes
  useEffect(() => {
    currentSymbol.current = symbol;
    currentInterval.current = interval;
    setLoading(true);

    fetchKlines(symbol, interval, 100).then((data) => {
      if (currentSymbol.current !== symbol || currentInterval.current !== interval) return;
      setCandles(data);
      setLoading(false);
      if (candleSeriesRef.current && data.length > 0) {
        candleSeriesRef.current.setData(
          data.map((c) => ({
            time: c.time as import("lightweight-charts").UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );
        chartRef.current?.timeScale().fitContent();
      }
    });
  }, [symbol, interval]);

  // Real-time WebSocket update for current candle
  useEffect(() => {
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
    );
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      const k = msg.k;
      if (!k || !candleSeriesRef.current) return;
      const candle = {
        time: Math.floor(k.t / 1000) as import("lightweight-charts").UTCTimestamp,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
      };
      candleSeriesRef.current.update(candle);
    };
    return () => ws.close();
  }, [symbol, interval]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Interval selector */}
      <div className="flex gap-1 px-3 pt-2 pb-1">
        {INTERVALS.map((iv) => (
          <button
            key={iv.value}
            onClick={() => setInterval(iv.value)}
            className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
              interval === iv.value
                ? "text-white font-semibold"
                : "text-white/40 active:text-white/70"
            }`}
            style={interval === iv.value ? { backgroundColor: color + "55" } : {}}
          >
            {iv.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div ref={containerRef} className="flex-1 w-full relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: color, borderTopColor: "transparent" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
