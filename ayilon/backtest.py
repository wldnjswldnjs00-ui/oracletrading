#!/usr/bin/env python3
"""
BTC-USDT-SWAP OKX Backtester
Ported from JavaScript worker strategy logic.
"""

import requests
import time
import math
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from collections import defaultdict

# ─────────────────────────────────────────────
# 1. DATA FETCHING
# ─────────────────────────────────────────────

BASE_URL = "https://www.okx.com/api/v5/market/candles"

def fetch_candles(inst_id="BTC-USDT-SWAP", bar="1H", total=300):
    """Fetch candles from OKX, paginating with `after` param. Returns DataFrame sorted asc."""
    all_candles = []
    after = None
    while len(all_candles) < total:
        limit = min(300, total - len(all_candles))
        params = {"instId": inst_id, "bar": bar, "limit": limit}
        if after:
            params["after"] = after
        try:
            resp = requests.get(BASE_URL, params=params, timeout=15)
            data = resp.json()
        except Exception as e:
            print(f"  Request error: {e}, retrying in 2s...")
            time.sleep(2)
            continue

        if data.get("code") != "0" or not data.get("data"):
            print(f"  API error or empty: {data.get('msg', '')} code={data.get('code')}")
            break

        batch = data["data"]
        all_candles.extend(batch)
        print(f"  Fetched {len(batch)} {bar} candles (total so far: {len(all_candles)})")

        if len(batch) < limit:
            break  # no more data

        # oldest ts in this batch is last element (newest-first order)
        after = batch[-1][0]
        time.sleep(0.2)

    if not all_candles:
        return pd.DataFrame()

    # OKX candle columns: ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm
    df = pd.DataFrame(all_candles, columns=["ts", "open", "high", "low", "close",
                                             "vol", "volCcy", "volCcyQuote", "confirm"])
    for col in ["ts", "open", "high", "low", "close", "vol"]:
        df[col] = pd.to_numeric(df[col])
    df["ts"] = pd.to_datetime(df["ts"], unit="ms", utc=True)
    df = df.sort_values("ts").reset_index(drop=True)
    return df


def load_all_data():
    print("Fetching 1H candles (~4320)...")
    df_1h = fetch_candles(bar="1H", total=4320)
    print(f"  -> {len(df_1h)} 1H candles loaded\n")

    print("Fetching 4H candles (~1080)...")
    df_4h = fetch_candles(bar="4H", total=1080)
    print(f"  -> {len(df_4h)} 4H candles loaded\n")

    print("Fetching 1D candles (~180)...")
    df_1d = fetch_candles(bar="1D", total=180)
    print(f"  -> {len(df_1d)} 1D candles loaded\n")

    return df_1h, df_4h, df_1d


# ─────────────────────────────────────────────
# 2. STRATEGY FUNCTIONS
# ─────────────────────────────────────────────

def detect_sr(candles_df, n=100):
    """Detect support/resistance levels from last n candles."""
    if len(candles_df) < n:
        sub = candles_df.copy()
    else:
        sub = candles_df.iloc[-n:].copy()

    if sub.empty:
        return {"supports": [], "resistances": []}

    current_price = float(sub["close"].iloc[-1])
    price_step = current_price * 0.003
    tol = 0.003  # 0.3% tolerance

    seen_buckets = set()
    level_data = {}  # bucket -> {price, sup, res, recent_touches}

    recent_start = max(0, len(sub) - 20)

    for idx_pos, (idx, row) in enumerate(sub.iterrows()):
        is_recent = idx_pos >= recent_start

        for price_type, price in [("low", float(row["low"])), ("high", float(row["high"]))]:
            bucket = round(price / price_step)
            if bucket in seen_buckets:
                # still count touches for existing bucket
                if bucket in level_data:
                    ref_price = level_data[bucket]["price"]
                    if ref_price > 0 and abs(price - ref_price) / ref_price <= tol:
                        if price_type == "low":
                            level_data[bucket]["sup"] += 1
                        else:
                            level_data[bucket]["res"] += 1
                        if is_recent:
                            level_data[bucket]["recent"] += 1
                continue

            seen_buckets.add(bucket)
            level_data[bucket] = {
                "price": price,
                "sup": 0,
                "res": 0,
                "recent": 0
            }
            if price_type == "low":
                level_data[bucket]["sup"] = 1
            else:
                level_data[bucket]["res"] = 1
            if is_recent:
                level_data[bucket]["recent"] = 1

    supports = []
    resistances = []

    for bucket, d in level_data.items():
        total_touches = d["sup"] + d["res"]
        if total_touches < 2:
            continue

        price = d["price"]
        entry = {
            "price": price,
            "touches": total_touches,
            "recent": d["recent"],
            "sup": d["sup"],
            "res": d["res"]
        }

        if price <= current_price * 1.005:
            e = dict(entry)
            e["type"] = "support"
            supports.append(e)
        if price >= current_price * 0.995:
            e = dict(entry)
            e["type"] = "resistance"
            resistances.append(e)

    # sort supports desc, top 4; resistances asc, top 4
    supports.sort(key=lambda x: x["price"], reverse=True)
    supports = supports[:4]

    resistances.sort(key=lambda x: x["price"])
    resistances = resistances[:4]

    return {"supports": supports, "resistances": resistances}


def grade_levels(sr1h, sr4h):
    """Grade S/R levels by comparing 1H and 4H."""
    tol = 0.005  # 0.5%

    def grade_list(list1h, list4h, level_type):
        graded = []
        for lv in list1h:
            p1 = lv["price"]
            # check if appears on 4H within 0.5%
            match4h = next(
                (x for x in list4h if abs(x["price"] - p1) / p1 <= tol),
                None
            )
            if match4h:
                grade = "S"
            elif lv.get("recent", 0) >= 1:
                grade = "A"
            else:
                grade = "B"
            graded.append({**lv, "grade": grade})

        # also add 4H-only levels with A grade
        for lv4 in list4h:
            p4 = lv4["price"]
            match1h = next(
                (x for x in list1h if abs(x["price"] - p4) / p4 <= tol),
                None
            )
            if not match1h:
                if lv4.get("touches", 0) >= 4 or lv4.get("recent", 0) >= 1:
                    graded.append({**lv4, "grade": "A", "type": level_type})

        # sort
        if level_type == "support":
            graded.sort(key=lambda x: x["price"], reverse=True)
        else:
            graded.sort(key=lambda x: x["price"])

        return graded[:5]

    return {
        "supports": grade_list(sr1h["supports"], sr4h["supports"], "support"),
        "resistances": grade_list(sr1h["resistances"], sr4h["resistances"], "resistance")
    }


def calc_ema(closes_array, period):
    """Calculate EMA. SMA seed for first `period` values."""
    closes = list(closes_array)
    if len(closes) < period:
        return None
    # seed with SMA
    sma = sum(closes[:period]) / period
    k = 2.0 / (period + 1)
    ema = sma
    for price in closes[period:]:
        ema = price * k + ema * (1 - k)
    return ema


def detect_trend(daily_df, current_price):
    """Detect trend direction and strength using EMA20/EMA50."""
    if len(daily_df) < 55:
        return {"dir": "neutral", "strong": False}

    closes = list(daily_df["close"].iloc[-55:])
    ema20 = calc_ema(closes, 20)
    ema50 = calc_ema(closes, 50)

    if ema20 is None or ema50 is None:
        return {"dir": "neutral", "strong": False}

    # slope: ema20 vs ema20 computed from closes shifted 5 back
    closes_shifted = closes[:-5] if len(closes) > 5 else closes
    ema20_5 = calc_ema(closes_shifted, 20)

    if ema20_5 is None or ema20_5 == 0:
        slope = 0
    else:
        slope = abs(ema20 - ema20_5) / ema20_5

    spread = abs(ema20 - ema50) / ema50 if ema50 != 0 else 0
    strong = slope > 0.002 and spread > 0.008

    if current_price > ema20 and ema20 > ema50:
        direction = "up"
    elif current_price < ema20 and ema20 < ema50:
        direction = "down"
    else:
        direction = "neutral"

    return {"dir": direction, "strong": strong}


def detect_signal(last4_candles_df, levels, cur_price):
    """Detect long/short signal from last 4 candles."""
    if len(last4_candles_df) < 4:
        return None

    # prev1=iloc[-2], prev2=iloc[-3], prev3=iloc[-4]
    prev1 = last4_candles_df.iloc[-2]
    prev2 = last4_candles_df.iloc[-3]
    prev3 = last4_candles_df.iloc[-4]

    # ── LONG signal ──
    for sup in levels.get("supports", []):
        sp = sup["price"]
        grade = sup.get("grade", "B")
        # prev1 low or close within 0.5% of support
        low_near = abs(float(prev1["low"]) - sp) / sp <= 0.005
        close_near = abs(float(prev1["close"]) - sp) / sp <= 0.005
        if low_near or close_near:
            if cur_price > sp * 0.997:
                swing_low = min(float(prev1["low"]), float(prev2["low"]), float(prev3["low"]))
                sl_dist = abs(cur_price - swing_low) / cur_price
                if 0.01 <= sl_dist <= 0.07:
                    return {
                        "type": "long",
                        "grade": grade,
                        "stop_loss": swing_low,
                        "level_price": sp
                    }

    # ── SHORT signal ──
    for res in levels.get("resistances", []):
        rp = res["price"]
        grade = res.get("grade", "B")
        swing_high = max(float(prev1["high"]), float(prev2["high"]), float(prev3["high"]))

        # find bearish candle in prev1/prev2/prev3 with body/range >= 0.40
        vols = [float(prev1["vol"]), float(prev2["vol"]), float(prev3["vol"])]
        vol_80pct = np.percentile(vols, 80) if len(vols) > 0 else 0

        bear_candle = None
        for candle in [prev1, prev2, prev3]:
            o = float(candle["open"])
            c = float(candle["close"])
            h = float(candle["high"])
            lo = float(candle["low"])
            rng = h - lo
            if rng == 0:
                continue
            body = abs(o - c)
            # bearish: close < open
            if c < o and body / rng >= 0.40:
                v = float(candle["vol"])
                if v >= vol_80pct:
                    bear_candle = candle
                    break

        if bear_candle is None:
            continue

        bh = float(bear_candle["high"])
        bl = float(bear_candle["low"])
        mid50 = bh - (bh - bl) * 0.5

        # cur_price must be in [mid50*0.998, swing_high*1.003]
        if not (mid50 * 0.998 <= cur_price <= swing_high * 1.003):
            continue

        # trigger: within 0.5% of mid50 OR within 0.5% of resistance in zone
        near_mid = abs(cur_price - mid50) / mid50 <= 0.005 if mid50 != 0 else False
        near_res = abs(cur_price - rp) / rp <= 0.005 if rp != 0 else False

        if near_mid or near_res:
            sl_dist = abs(cur_price - swing_high) / cur_price if cur_price != 0 else 0
            if 0.01 <= sl_dist <= 0.07:
                return {
                    "type": "short",
                    "grade": grade,
                    "stop_loss": swing_high,
                    "level_price": rp
                }

    return None


# ─────────────────────────────────────────────
# 3. BACKTESTER
# ─────────────────────────────────────────────

class Backtester:
    def __init__(self, equity=10000, pos_pct=0.10, leverage=20, num_entries=2):
        self.initial_equity = equity
        self.equity = equity
        self.pos_pct = pos_pct
        self.leverage = leverage
        self.num_entries = num_entries
        self.trades = []
        self.position = None  # active position dict

    def _find_tp(self, direction, entry_price, levels):
        """Find nearest S/R level beyond entry as TP."""
        if direction == "long":
            candidates = [r["price"] for r in levels.get("resistances", [])
                          if r["price"] > entry_price * 1.002]
            if candidates:
                return min(candidates)
        else:
            candidates = [s["price"] for s in levels.get("supports", [])
                          if s["price"] < entry_price * 0.998]
            if candidates:
                return max(candidates)
        return None

    def _open_position(self, signal, entry_price, candle_time, levels):
        direction = signal["type"]
        grade = signal["grade"]
        stop_loss = signal["stop_loss"]
        tp = self._find_tp(direction, entry_price, levels)

        # sizing
        total_val = self.equity * self.pos_pct
        if direction == "short":
            # weights [1, 2]: entry1 = totalVal/3
            entry1_val = total_val / 3.0
        else:
            # equal entries
            entry1_val = total_val / self.num_entries

        self.position = {
            "direction": direction,
            "grade": grade,
            "entry_price": entry_price,
            "avg_entry": entry_price,
            "stop_loss": stop_loss,
            "take_profit": tp,
            "position_value": entry1_val,  # current active value
            "total_allocated": total_val,
            "entries_done": 1,
            "half_closed": False,
            "open_time": candle_time,
            "levels": levels
        }

    def _close_position(self, exit_price, exit_type, candle_time):
        pos = self.position
        direction = pos["direction"]
        avg_entry = pos["avg_entry"]
        pos_val = pos["position_value"]
        dir_mult = 1 if direction == "long" else -1
        pnl_pct = dir_mult * (exit_price - avg_entry) / avg_entry * self.leverage
        pnl_usd = pnl_pct * pos_val

        self.equity += pnl_usd
        self.trades.append({
            "time": pos["open_time"],
            "close_time": candle_time,
            "direction": direction,
            "entry_price": avg_entry,
            "exit_price": exit_price,
            "pnl_usd": pnl_usd,
            "pnl_pct": pnl_pct * 100,
            "exit_type": exit_type,
            "grade": pos["grade"]
        })
        self.position = None

    def _check_position(self, candle, candle_time):
        """Check SL/TP against current candle. Returns True if position closed."""
        pos = self.position
        direction = pos["direction"]
        sl = pos["stop_loss"]
        tp = pos["take_profit"]
        lo = float(candle["low"])
        hi = float(candle["high"])
        avg_entry = pos["avg_entry"]

        if direction == "long":
            # TP check first
            if tp and hi >= tp:
                if not pos["half_closed"]:
                    # close 50%, move SL to break-even
                    pos["position_value"] *= 0.5
                    pos["stop_loss"] = avg_entry
                    pos["half_closed"] = True
                    return False
                else:
                    self._close_position(tp, "tp", candle_time)
                    return True
            if lo <= sl:
                self._close_position(sl, "sl", candle_time)
                return True
        else:  # short
            if tp and lo <= tp:
                if not pos["half_closed"]:
                    pos["position_value"] *= 0.5
                    pos["stop_loss"] = avg_entry
                    pos["half_closed"] = True
                    return False
                else:
                    self._close_position(tp, "tp", candle_time)
                    return True
            if hi >= sl:
                self._close_position(sl, "sl", candle_time)
                return True

        return False

    def run(self, df_1h, df_4h, df_1d):
        print("\n" + "="*60)
        print("BACKTESTING...")
        print("="*60)

        n_candles = len(df_1h)
        sr_cache = {}  # cache SR computation

        for i in range(100, n_candles):
            candle = df_1h.iloc[i]
            candle_time = candle["ts"]
            cur_price = float(candle["close"])

            if i % 500 == 0:
                print(f"  Progress: candle {i}/{n_candles} | equity=${self.equity:,.2f}")

            # ── Check open position ──
            if self.position is not None:
                closed = self._check_position(candle, candle_time)
                if closed:
                    continue

            # ── Volatility gate ──
            vol_window = df_1h.iloc[max(0, i-20):i]
            if len(vol_window) > 0:
                avg_range_pct = ((vol_window["high"] - vol_window["low"]) / vol_window["low"]).mean()
                if avg_range_pct < 0.015:
                    continue

            # ── S/R computation (every 4 candles) ──
            cache_key = i - (i % 4)
            if cache_key not in sr_cache:
                sub_1h = df_1h.iloc[:i]
                sr1h = detect_sr(sub_1h, n=100)

                # align 4H candles up to current 1H timestamp
                sub_4h = df_4h[df_4h["ts"] <= candle_time]
                sr4h = detect_sr(sub_4h, n=100)

                graded = grade_levels(sr1h, sr4h)
                sr_cache[cache_key] = graded

                # evict old cache entries
                old_keys = [k for k in list(sr_cache.keys()) if k < cache_key - 8]
                for k in old_keys:
                    del sr_cache[k]

            levels = sr_cache[cache_key]

            # ── Signal detection ──
            last4 = df_1h.iloc[max(0, i-3):i+1]
            if len(last4) < 4:
                continue

            signal = detect_signal(last4, levels, cur_price)
            if signal is None:
                continue

            # ── Trend filter ──
            sub_1d = df_1d[df_1d["ts"] <= candle_time]
            trend = detect_trend(sub_1d, cur_price)

            direction = signal["type"]
            # counter-trend: skip
            if trend["dir"] == "up" and direction == "short":
                continue
            if trend["dir"] == "down" and direction == "long":
                continue
            # not strong AND grade not S: skip
            if not trend["strong"] and signal["grade"] != "S":
                continue

            # ── 1H SHORT confirmation ──
            if direction == "short":
                c_open = float(candle["open"])
                c_close = float(candle["close"])
                bearish_candle = c_close < c_open

                near_res = any(
                    abs(cur_price - r["price"]) / r["price"] <= 0.01
                    for r in levels.get("resistances", [])
                )
                if not (bearish_candle or near_res):
                    continue

            # ── Skip if already in position ──
            if self.position is not None:
                continue

            # ── Open position ──
            self._open_position(signal, cur_price, candle_time, levels)

        # close any open position at end
        if self.position is not None:
            last_candle = df_1h.iloc[-1]
            self._close_position(
                float(last_candle["close"]), "end_of_data", last_candle["ts"]
            )

        print(f"  Done! Final equity: ${self.equity:,.2f}")
        return self.trades


# ─────────────────────────────────────────────
# 4. STATISTICS
# ─────────────────────────────────────────────

def print_statistics(trades, initial_equity, df_1h):
    print("\n" + "="*60)
    print("BACKTEST RESULTS")
    print("="*60)

    if not trades:
        print("No trades executed.")
        return

    df = pd.DataFrame(trades)
    df["time"] = pd.to_datetime(df["time"], utc=True)
    df["close_time"] = pd.to_datetime(df["close_time"], utc=True)

    total_trades = len(df)
    winners = df[df["pnl_usd"] > 0]
    win_rate = len(winners) / total_trades * 100

    final_equity = initial_equity + df["pnl_usd"].sum()
    total_return_pct = (final_equity - initial_equity) / initial_equity * 100

    # date range from df_1h
    start_date = df_1h["ts"].iloc[100]
    end_date = df_1h["ts"].iloc[-1]
    days = (end_date - start_date).total_seconds() / 86400
    years = days / 365.25
    ann_return = ((final_equity / initial_equity) ** (1 / years) - 1) * 100 if years > 0 and final_equity > 0 else 0

    weeks = days / 7
    months = days / 30.44

    avg_per_week = total_trades / weeks if weeks > 0 else 0
    avg_per_month = total_trades / months if months > 0 else 0

    print(f"\nPeriod: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')} ({int(days)} days)")
    print(f"Initial equity : ${initial_equity:>12,.2f}")
    print(f"Final equity   : ${final_equity:>12,.2f}")
    print(f"\nTotal trades   : {total_trades}")
    print(f"Win rate       : {win_rate:.1f}%")
    print(f"Total return   : {total_return_pct:+.2f}%")
    print(f"Ann. return    : {ann_return:+.2f}%")
    print(f"Avg trades/wk  : {avg_per_week:.2f}")
    print(f"Avg trades/mo  : {avg_per_month:.2f}")

    # Grade breakdown
    print("\n── Grade Breakdown ──")
    for grade in ["S", "A", "B"]:
        g_df = df[df["grade"] == grade]
        if len(g_df) == 0:
            continue
        g_wr = len(g_df[g_df["pnl_usd"] > 0]) / len(g_df) * 100
        g_pnl = g_df["pnl_usd"].sum()
        print(f"  Grade {grade}: {len(g_df)} trades | WR={g_wr:.1f}% | PnL=${g_pnl:+,.2f}")

    # Exit type breakdown
    print("\n── Exit Type Breakdown ──")
    for etype in df["exit_type"].unique():
        e_df = df[df["exit_type"] == etype]
        print(f"  {etype:<20}: {len(e_df)} trades | PnL=${e_df['pnl_usd'].sum():+,.2f}")

    # Monthly breakdown
    print("\n── Monthly Breakdown ──")
    df["month"] = df["time"].dt.to_period("M")
    monthly = df.groupby("month", observed=True).apply(
        lambda g: pd.Series({
            "trades": len(g),
            "wins": int((g["pnl_usd"] > 0).sum()),
            "pnl_usd": g["pnl_usd"].sum()
        })
    ).reset_index()
    monthly["win_pct"] = monthly["wins"] / monthly["trades"] * 100
    monthly["return_pct"] = monthly["pnl_usd"] / initial_equity * 100

    print(f"  {'Month':<10} {'Trades':>7} {'Win%':>7} {'Return%':>9} {'PnL$':>10}")
    print(f"  {'-'*10} {'-'*7} {'-'*7} {'-'*9} {'-'*10}")
    for _, row in monthly.iterrows():
        print(f"  {str(row['month']):<10} {int(row['trades']):>7} "
              f"{row['win_pct']:>6.1f}% {row['return_pct']:>8.2f}% "
              f"${row['pnl_usd']:>9,.2f}")

    # Weekly breakdown (last 8 weeks)
    print("\n── Weekly Breakdown (last 8 weeks) ──")
    df["week"] = df["time"].dt.to_period("W")
    weekly = df.groupby("week", observed=True).apply(
        lambda g: pd.Series({
            "trades": len(g),
            "wins": int((g["pnl_usd"] > 0).sum()),
            "pnl_usd": g["pnl_usd"].sum()
        })
    ).reset_index()
    weekly["win_pct"] = weekly["wins"] / weekly["trades"] * 100
    weekly = weekly.tail(8)

    print(f"  {'Week':<22} {'Trades':>7} {'Win%':>7} {'PnL$':>10}")
    print(f"  {'-'*22} {'-'*7} {'-'*7} {'-'*10}")
    for _, row in weekly.iterrows():
        print(f"  {str(row['week']):<22} {int(row['trades']):>7} "
              f"{row['win_pct']:>6.1f}% ${row['pnl_usd']:>9,.2f}")

    # Trade list (last 20)
    print("\n── Last 20 Trades ──")
    print(f"  {'Time':<20} {'Dir':<6} {'Grade':<6} {'Entry':>10} {'Exit':>10} "
          f"{'PnL$':>9} {'Type':<15}")
    print(f"  {'-'*20} {'-'*6} {'-'*6} {'-'*10} {'-'*10} {'-'*9} {'-'*15}")
    for _, t in df.tail(20).iterrows():
        print(f"  {t['time'].strftime('%Y-%m-%d %H:%M'):<20} "
              f"{t['direction']:<6} {t['grade']:<6} "
              f"{t['entry_price']:>10,.2f} {t['exit_price']:>10,.2f} "
              f"${t['pnl_usd']:>8,.2f} {t['exit_type']:<15}")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("OKX BTC-USDT-SWAP Backtester")
    print("="*60)

    # 1. Fetch data
    df_1h, df_4h, df_1d = load_all_data()

    if df_1h.empty:
        print("ERROR: No 1H data fetched. Exiting.")
        exit(1)

    print(f"\nData summary:")
    print(f"  1H: {len(df_1h)} candles | {df_1h['ts'].iloc[0]} -> {df_1h['ts'].iloc[-1]}")
    print(f"  4H: {len(df_4h)} candles | {df_4h['ts'].iloc[0]} -> {df_4h['ts'].iloc[-1]}")
    print(f"  1D: {len(df_1d)} candles | {df_1d['ts'].iloc[0]} -> {df_1d['ts'].iloc[-1]}")

    # 2. Run backtest
    bt = Backtester(equity=10000, pos_pct=0.10, leverage=20, num_entries=2)
    trades = bt.run(df_1h, df_4h, df_1d)

    # 3. Print stats
    print_statistics(trades, bt.initial_equity, df_1h)
    print("\nDone.")
