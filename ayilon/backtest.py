#!/usr/bin/env python3
"""
AYILON BTC-USDT-SWAP Backtester
OKX API → synthetic fallback (1H GBM, resampled to 4H/1D for consistency).
"""

import time, math, random
import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta

# ─────────────────────────────────────────────
# 1. DATA
# ─────────────────────────────────────────────

def fetch_okx(bar="1H", total=300):
    try:
        import requests
        url = "https://www.okx.com/api/v5/market/candles"
        rows, after = [], None
        while len(rows) < total:
            lim = min(300, total - len(rows))
            p = {"instId": "BTC-USDT-SWAP", "bar": bar, "limit": lim}
            if after: p["after"] = after
            d = requests.get(url, params=p, timeout=10).json()
            if d.get("code") != "0" or not d.get("data"): break
            batch = d["data"]; rows.extend(batch)
            if len(batch) < lim: break
            after = batch[-1][0]; time.sleep(0.2)
        if not rows: return None
        df = pd.DataFrame(rows, columns=["ts","open","high","low","close","vol","a","b","confirm"])
        for c in ["ts","open","high","low","close","vol"]: df[c] = pd.to_numeric(df[c])
        df["ts"] = pd.to_datetime(df["ts"], unit="ms", utc=True)
        return df.sort_values("ts").drop_duplicates("ts").reset_index(drop=True)
    except: return None


def generate_1h_synthetic(n=4380, seed=42):
    """
    GBM with BTC-like stats (ann vol ~90%, drift ~80%).
    Higher vol ensures avg 1H range > 1.5% for volatility gate.
    """
    np.random.seed(seed)
    dt   = 1 / (365.25 * 24)
    mu   = 0.80 * dt
    sig  = 0.90 * math.sqrt(dt)

    end  = datetime(2025, 12, 1, tzinfo=timezone.utc)
    t0   = end - timedelta(hours=n)

    price = 65000.0
    rows  = []
    for i in range(n):
        ret   = mu + sig * np.random.randn()
        close = price * math.exp(ret)
        open_ = price

        # intrabar wicks: realistic via Parkinson vol model
        u = abs(np.random.randn()) * sig * 1.2
        d = abs(np.random.randn()) * sig * 1.2
        high = max(open_, close) * (1 + u)
        low  = min(open_, close) * (1 - d)
        high = min(high, open_ * 1.10)
        low  = max(low,  open_ * 0.90)
        high = max(high, close)
        low  = min(low,  close)

        # volume: higher on big moves
        vol = (4000 + abs(np.random.randn()) * 2500) * (1 + abs(ret) / sig)

        rows.append({"ts": t0 + timedelta(hours=i),
                     "open":  round(open_, 2),
                     "high":  round(high,  2),
                     "low":   round(low,   2),
                     "close": round(close, 2),
                     "vol":   round(vol,   2)})
        price = close

    return pd.DataFrame(rows)


def resample_to(df1h, rule):
    """Resample 1H DataFrame to 4H or 1D via OHLCV aggregation."""
    df = df1h.set_index("ts").resample(rule).agg(
        open=("open","first"), high=("high","max"),
        low=("low","min"),   close=("close","last"),
        vol=("vol","sum")
    ).dropna().reset_index()
    return df


def load_all_data():
    print("Trying OKX API …")
    df1h = fetch_okx("1H", 4320)
    if df1h is not None and len(df1h) > 200:
        print(f"  OKX 1H: {len(df1h)} candles")
        df4h = fetch_okx("4H", 1080)
        df1d = fetch_okx("1D", 180)
        return df1h, df4h, df1d, "OKX live"

    print("  OKX blocked → generating synthetic BTC data")
    df1h = generate_1h_synthetic(4380)
    df4h = resample_to(df1h, "4h")
    df1d = resample_to(df1h, "1D")
    print(f"  1H: {len(df1h)} | 4H: {len(df4h)} | 1D: {len(df1d)}")
    return df1h, df4h, df1d, "synthetic (GBM 90% ann-vol)"


# ─────────────────────────────────────────────
# 2. STRATEGY
# ─────────────────────────────────────────────

def detect_sr(df, n=100):
    if len(df) < 2: return {"supports":[], "resistances":[]}
    sub = df.tail(n).reset_index(drop=True)
    cur  = float(sub["close"].iloc[-1])
    step = cur * 0.003; tol = 0.003
    recent_start = max(0, len(sub) - 20)
    seen, levels = set(), {}

    for i, row in sub.iterrows():
        rec = (i >= recent_start)
        for p, kind in [(float(row["low"]),"sup"),(float(row["high"]),"res")]:
            b = round(p / step)
            if b not in seen:
                seen.add(b); levels[b] = {"price":p,"sup":0,"res":0,"recent":0}
            lv = levels[b]
            if abs(lv["price"] - p) / lv["price"] <= tol:
                lv[kind] += 1
                if rec: lv["recent"] += 1

    sup, res = [], []
    for lv in levels.values():
        if lv["sup"]+lv["res"] < 2: continue
        p = lv["price"]
        e = {**lv, "touches": lv["sup"]+lv["res"]}
        if p <= cur*1.005: sup.append(e)
        if p >= cur*0.995: res.append(e)
    return {
        "supports":    sorted(sup, key=lambda x:x["price"], reverse=True)[:4],
        "resistances": sorted(res, key=lambda x:x["price"])[:4],
    }


def grade_levels(sr1h, sr4h):
    tol = 0.005
    def glist(l1, l4, rev):
        out = []
        for lv in l1:
            p  = lv["price"]
            m4 = next((x for x in l4 if abs(x["price"]-p)/p <= tol), None)
            g  = "S" if m4 else ("A" if lv.get("recent",0) >= 1 else "B")
            out.append({**lv, "grade":g})
        for lv in l4:
            p  = lv["price"]
            m1 = next((x for x in l1 if abs(x["price"]-p)/p <= tol), None)
            if not m1 and (lv.get("touches",0) >= 4 or lv.get("recent",0) >= 1):
                out.append({**lv, "grade":"A"})
        out.sort(key=lambda x:x["price"], reverse=rev)
        return out[:5]
    return {
        "supports":    glist(sr1h["supports"],    sr4h["supports"],    True),
        "resistances": glist(sr1h["resistances"], sr4h["resistances"], False),
    }


def calc_ema(closes, period):
    if len(closes) < period: return None
    k = 2.0/(period+1); ema = sum(closes[:period])/period
    for p in closes[period:]: ema = p*k + ema*(1-k)
    return ema


def detect_trend(df1d, cur):
    if len(df1d) < 55: return {"dir":"neutral","strong":False}
    closes  = list(df1d["close"].tail(55).astype(float))
    ema20   = calc_ema(closes, 20); ema50 = calc_ema(closes, 50)
    if not ema20 or not ema50: return {"dir":"neutral","strong":False}
    e20_5   = calc_ema(closes[:-5], 20) or ema20
    slope   = abs(ema20 - e20_5) / e20_5
    spread  = abs(ema20 - ema50) / ema50
    strong  = slope > 0.002 and spread > 0.008
    if   cur > ema20 > ema50: d = "up"
    elif cur < ema20 < ema50: d = "down"
    else:                      d = "neutral"
    return {"dir":d, "strong":strong}


def detect_signal(last4, levels, cur):
    if len(last4) < 4: return None
    p1,p2,p3 = last4.iloc[-2], last4.iloc[-3], last4.iloc[-4]

    # LONG
    for sup in levels.get("supports",[]):
        sp = sup["price"]
        if (abs(float(p1["low"]  )-sp)/sp <= 0.005 or
            abs(float(p1["close"])-sp)/sp <= 0.005):
            if cur > sp*0.997:
                sl = min(float(p1["low"]),float(p2["low"]),float(p3["low"]))
                if 0.01 <= abs(cur-sl)/cur <= 0.07:
                    return {"type":"long","grade":sup.get("grade","B"),"stop_loss":sl}

    # SHORT
    vols   = [float(p1["vol"]),float(p2["vol"]),float(p3["vol"])]
    v80    = np.percentile(vols, 80)
    swing_hi = max(float(p1["high"]),float(p2["high"]),float(p3["high"]))

    for c in [p1,p2,p3]:
        o,cl,h,lo = float(c["open"]),float(c["close"]),float(c["high"]),float(c["low"])
        rng = h-lo
        if rng==0 or cl>=o: continue
        if (o-cl)/rng < 0.40: continue
        if float(c["vol"]) < v80: continue
        mid50 = h - rng*0.5
        if not (mid50*0.998 <= cur <= swing_hi*1.003): continue
        near_mid = abs(cur-mid50)/mid50 <= 0.005
        near_res = any(
            mid50*0.998 <= r["price"] <= swing_hi*1.003 and
            abs(cur-r["price"])/r["price"] <= 0.005
            for r in levels.get("resistances",[])
        )
        if not (near_mid or near_res): continue
        if not (0.01 <= abs(cur-swing_hi)/cur <= 0.07): continue
        best = "B"
        for r in levels.get("resistances",[]):
            if mid50*0.998 <= r["price"] <= swing_hi*1.003:
                if r.get("grade","B") <= best: best = r.get("grade","B")
        return {"type":"short","grade":best,"stop_loss":swing_hi}

    return None


# ─────────────────────────────────────────────
# 3. BACKTESTER
# ─────────────────────────────────────────────

class Backtester:
    def __init__(self, equity=10000, pos_pct=0.10, leverage=20, num_entries=2):
        self.eq0 = self.eq = equity
        self.pos_pct = pos_pct; self.lev = leverage
        self.n_ent = num_entries; self.trades = []; self.pos = None

    def _tp(self, d, entry, lvls):
        if d == "long":
            c = [r["price"] for r in lvls.get("resistances",[]) if r["price"] > entry*1.002]
            return min(c) if c else None
        c = [s["price"] for s in lvls.get("supports",[]) if s["price"] < entry*0.998]
        return max(c) if c else None

    def _close(self, xp, xt, t):
        p = self.pos; dm = 1 if p["d"]=="long" else -1
        pnl = dm*(xp-p["e"])/p["e"]*self.lev*p["v"]
        self.eq += pnl
        self.trades.append({"time":p["t0"],"direction":p["d"],"grade":p["g"],
                            "entry":p["e"],"exit":xp,"pnl_usd":pnl,"exit_type":xt})
        self.pos = None

    def _check(self, c, t):
        p = self.pos
        lo,hi = float(c["low"]),float(c["high"])
        if p["d"] == "long":
            if p["tp"] and hi >= p["tp"]:
                if not p["h"]: p["v"]*=0.5; p["sl"]=p["e"]; p["h"]=True
                else: self._close(p["tp"],"tp",t); return True
            if lo <= p["sl"]: self._close(p["sl"],"sl",t); return True
        else:
            if p["tp"] and lo <= p["tp"]:
                if not p["h"]: p["v"]*=0.5; p["sl"]=p["e"]; p["h"]=True
                else: self._close(p["tp"],"tp",t); return True
            if hi >= p["sl"]: self._close(p["sl"],"sl",t); return True
        return False

    def run(self, df1h, df4h, df1d):
        n = len(df1h); cache = {}
        print(f"\nBacktesting {n} 1H candles …")

        # pre-index 4H and 1D by timestamp for fast slicing
        df4h_ts = df4h.set_index("ts") if not df4h.empty else df4h
        df1d_ts = df1d.set_index("ts") if not df1d.empty else df1d

        for i in range(100, n):
            c = df1h.iloc[i]; t = c["ts"]; price = float(c["close"])
            if i % 500 == 0:
                print(f"  [{i}/{n}] eq=${self.eq:,.0f}  trades={len(self.trades)}")

            if self.pos:
                if self._check(c, t): continue

            # vol gate
            w = df1h.iloc[max(0,i-20):i]
            if ((w["high"]-w["low"])/w["low"]).mean() < 0.015: continue

            # S/R cache (every 4 candles)
            ck = i-(i%4)
            if ck not in cache:
                sr1h = detect_sr(df1h.iloc[:i], 100)
                sub4 = df4h[df4h["ts"] <= t] if not df4h.empty else df4h
                sr4h = detect_sr(sub4, 100)
                cache[ck] = grade_levels(sr1h, sr4h)
                for k in [k for k in cache if k < ck-8]: del cache[k]
            lvls = cache[ck]

            sig = detect_signal(df1h.iloc[max(0,i-3):i+1], lvls, price)
            if not sig: continue

            sub1d = df1d[df1d["ts"] <= t] if not df1d.empty else df1d
            trend = detect_trend(sub1d, price)
            d = sig["type"]
            if trend["dir"]=="up"   and d=="short": continue
            if trend["dir"]=="down" and d=="long":  continue
            if not trend["strong"] and sig["grade"]!="S": continue

            if d == "short":
                if float(c["close"]) >= float(c["open"]):
                    if not any(abs(price-r["price"])/r["price"]<=0.01
                               for r in lvls.get("resistances",[])): continue

            if self.pos: continue

            tp = self._tp(d, price, lvls)
            if tp is None: continue

            val = self.eq * self.pos_pct / (3 if d=="short" else self.n_ent)
            self.pos = {"d":d,"g":sig["grade"],"e":price,"sl":sig["stop_loss"],
                        "tp":tp,"v":val,"h":False,"t0":t}

        if self.pos:
            last = df1h.iloc[-1]
            self._close(float(last["close"]),"end_of_data",last["ts"])
        return self.trades


# ─────────────────────────────────────────────
# 4. STATISTICS
# ─────────────────────────────────────────────

def print_stats(trades, eq0, df1h, src):
    SEP = "="*62
    print(f"\n{SEP}")
    print(f"  AYILON BTC-USDT-SWAP  │  {src}")
    print(SEP)
    if not trades:
        print("  No trades executed."); return

    df = pd.DataFrame(trades)
    df["time"] = pd.to_datetime(df["time"], utc=True)
    tot  = len(df); wins = (df["pnl_usd"]>0).sum()
    wr   = wins/tot*100; pnl_s = df["pnl_usd"].sum()
    fin  = eq0+pnl_s; ret = pnl_s/eq0*100

    t0 = df1h["ts"].iloc[100]; t1 = df1h["ts"].iloc[-1]
    days  = max((t1-t0).days, 1); years = days/365.25
    ann   = ((fin/eq0)**(1/years)-1)*100 if years>0 else 0
    tpw   = tot/(days/7); tpm = tot/(days/30.44)

    print(f"  Period        : {t0.strftime('%Y-%m-%d')} → {t1.strftime('%Y-%m-%d')} ({days}d)")
    print(f"  Init equity   : ${eq0:>10,.2f}")
    print(f"  Final equity  : ${fin:>10,.2f}")
    print(f"  Total PnL     : ${pnl_s:>+10,.2f}")
    print(f"  Total return  : {ret:>+8.2f}%")
    print(f"  Ann. return   : {ann:>+8.2f}%")
    print(f"  Total trades  : {tot}")
    print(f"  Win rate      : {wr:.1f}%")
    print(f"  Trades/week   : {tpw:.1f}")
    print(f"  Trades/month  : {tpm:.1f}")

    max_dd = 0; peak = eq0; run_eq = eq0
    for pnl in df["pnl_usd"]:
        run_eq += pnl
        if run_eq > peak: peak = run_eq
        dd = (peak-run_eq)/peak*100
        if dd > max_dd: max_dd = dd
    print(f"  Max drawdown  : {max_dd:.1f}%")

    print("\n  ─ Grade ─")
    for g in ["S","A","B"]:
        s = df[df["grade"]==g]
        if s.empty: continue
        gwr = (s["pnl_usd"]>0).sum()/len(s)*100
        print(f"    {g}: {len(s):3d} trades | WR {gwr:.0f}% | PnL ${s['pnl_usd'].sum():+,.0f}")

    print("\n  ─ Direction ─")
    for d in ["long","short"]:
        s = df[df["direction"]==d]
        if s.empty: continue
        dwr = (s["pnl_usd"]>0).sum()/len(s)*100
        print(f"    {d.upper():5s}: {len(s):3d} trades | WR {dwr:.0f}% | PnL ${s['pnl_usd'].sum():+,.0f}")

    print("\n  ─ Monthly ─")
    df["mo"] = df["time"].dt.to_period("M")
    print(f"  {'Month':<9}  {'#':>4}  {'Win%':>5}  {'Ret%':>7}")
    print(f"  {'-'*9}  {'-'*4}  {'-'*5}  {'-'*7}")
    for mo, g in df.groupby("mo"):
        mwr = (g["pnl_usd"]>0).sum()/len(g)*100
        mr  = g["pnl_usd"].sum()/eq0*100
        print(f"  {str(mo):<9}  {len(g):>4}  {mwr:>4.0f}%  {mr:>+6.2f}%")

    print("\n  ─ Weekly (last 8) ─")
    df["wk"] = df["time"].dt.to_period("W")
    grps = list(df.groupby("wk"))[-8:]
    print(f"  {'Week':<14}  {'#':>4}  {'Win%':>5}  {'PnL$':>8}")
    print(f"  {'-'*14}  {'-'*4}  {'-'*5}  {'-'*8}")
    for wk, g in grps:
        wwr = (g["pnl_usd"]>0).sum()/len(g)*100
        print(f"  {str(wk):<14}  {len(g):>4}  {wwr:>4.0f}%  ${g['pnl_usd'].sum():>+7,.0f}")

    print(SEP)


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("="*62)
    print("  AYILON BTC-USDT-SWAP Backtester  v2")
    print("="*62)

    df1h, df4h, df1d, src = load_all_data()
    if len(df1h) < 110:
        print("Not enough data."); exit(1)

    bt     = Backtester(equity=10000, pos_pct=0.10, leverage=20, num_entries=2)
    trades = bt.run(df1h, df4h, df1d)
    print_stats(trades, bt.eq0, df1h, src)
