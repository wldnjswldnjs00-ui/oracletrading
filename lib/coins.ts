export interface Coin {
  symbol: string;
  name: string;
  binanceSymbol: string;
  color: string;
}

export const COINS: Coin[] = [
  { symbol: "BTC", name: "Bitcoin", binanceSymbol: "BTCUSDT", color: "#F7931A" },
  { symbol: "ETH", name: "Ethereum", binanceSymbol: "ETHUSDT", color: "#627EEA" },
  { symbol: "SOL", name: "Solana", binanceSymbol: "SOLUSDT", color: "#9945FF" },
  { symbol: "XRP", name: "Ripple", binanceSymbol: "XRPUSDT", color: "#00AAE4" },
  { symbol: "BNB", name: "BNB", binanceSymbol: "BNBUSDT", color: "#F3BA2F" },
  { symbol: "DOGE", name: "Dogecoin", binanceSymbol: "DOGEUSDT", color: "#C2A633" },
];

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export interface Alert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: "above" | "below";
  triggered: boolean;
  createdAt: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
