import { Candle } from "./coins";

export async function fetchKlines(symbol: string, interval = "1h", limit = 60): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json() as unknown[][];
  return data.map((k: unknown[]) => ({
    time: Math.floor((k[0] as number) / 1000),
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
  }));
}

export async function fetch24hrTicker(symbol: string) {
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}
