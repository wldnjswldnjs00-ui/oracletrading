"""
ETH 전략 백테스트
전략: 신저점/신고점 돌파 후 대형 반전 캔들 + 거래량 급등 → 눌림목 진입

실행 방법:
  pip install requests pandas numpy
  python eth_backtest.py

인터넷이 안되는 환경이면 DEMO_MODE = True 로 설정
"""

import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# ──────────────────────────────────────────
# 설정값 (조정 가능)
# ──────────────────────────────────────────
SYMBOL          = "ETHUSDT"
INTERVAL        = "4h"
DAYS            = 900         # 백테스트 기간 (일)
LOOKBACK        = 20          # 신저점/신고점 판단 기준 봉 수
BODY_MULT       = 1.8         # 반전 캔들 몸통 크기 (평균의 N배)
VOL_MULT        = 1.8         # 거래량 급등 기준 (평균의 N배)
PULLBACK_WINDOW = 10          # 진입 눌림목 대기 봉 수
RR_RATIO        = 2.0         # 목표 R:R 비율
LEVERAGE        = 100         # 레버리지
INITIAL_SEED    = 7.4         # 초기 시드 ($)
DEMO_MODE       = False       # True: 합성 데이터 / False: 바이낸스 실데이터
# ──────────────────────────────────────────


# ── 데이터 수집 ──────────────────────────────

def fetch_binance(symbol=SYMBOL, interval=INTERVAL, days=DAYS):
    print(f"[+] 바이낸스에서 {symbol} {interval} 데이터 수집 중...")
    hours_per_bar = int(interval[:-1])
    target_bars = days * 24 // hours_per_bar
    limit = 1000
    all_klines = []
    end_ms = int(datetime.now().timestamp() * 1000)

    while len(all_klines) < target_bars:
        url = "https://api.binance.com/api/v3/klines"
        params = {"symbol": symbol, "interval": interval,
                  "limit": limit, "endTime": end_ms}
        resp = requests.get(url, params=params, timeout=15)
        data = resp.json()
        if not data or isinstance(data, dict):
            break
        all_klines = data + all_klines
        end_ms = data[0][0] - 1
        if len(data) < limit:
            break

    cols = ["timestamp","open","high","low","close","volume",
            "close_time","quote_vol","trades","buy_base","buy_quote","ignore"]
    df = pd.DataFrame(all_klines, columns=cols)
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    for c in ["open","high","low","close","volume"]:
        df[c] = df[c].astype(float)
    df = df.drop_duplicates("timestamp").sort_values("timestamp").reset_index(drop=True)
    print(f"    → {len(df)}개 봉  ({df['timestamp'].iloc[0].date()} ~ {df['timestamp'].iloc[-1].date()})")
    return df


def generate_demo_data(days=DAYS, interval=INTERVAL):
    """
    실제 ETH 주요 구간을 모방한 합성 OHLCV 데이터 생성
    주요 구간:
      2022-01: ~3300  → 2022-06: ~1000  (크래시)
      2022-06: ~1000  → 2023-04: ~2100  (반등)
      2023-04: ~2100  → 2023-10: ~1600  (조정)
      2023-10: ~1600  → 2024-03: ~3900  (불장)
      2024-03: ~3900  → 2024-09: ~2300  (조정)
      2024-09: ~2300  → 2024-12: ~4000  (펌핑)
      2024-12: ~4000  → 2025-04: ~1737  (하락)
      2025-04: ~1737  → 현재:    ~2300  (반등)
    """
    print("[+] 합성 데이터 생성 중 (DEMO MODE)...")
    np.random.seed(42)
    hours_per_bar = int(interval[:-1])
    n_bars = days * 24 // hours_per_bar

    # 가격 구간 정의 (일 단위 기준점)
    waypoints = [
        (0,   3300), (180, 1000), (450, 2100),
        (630, 1600), (790, 3900), (970, 2300),
        (1060, 4000),(1200, 1737),(1310, 2300),
    ]

    total_days = days
    day_prices = np.zeros(total_days)
    for i in range(len(waypoints) - 1):
        d0, p0 = waypoints[i]
        d1, p1 = waypoints[i+1]
        seg = d1 - d0
        for d in range(seg):
            idx = d0 + d
            if idx < total_days:
                t = d / seg
                # 로그선형 보간
                day_prices[idx] = np.exp(np.log(p0) * (1-t) + np.log(p1) * t)
    # 나머지
    for i in range(total_days):
        if day_prices[i] == 0:
            day_prices[i] = day_prices[i-1] if i > 0 else 2300

    bars_per_day = 24 // hours_per_bar
    rows = []
    base_time = datetime(2022, 1, 1)

    for bar_i in range(n_bars):
        day_i = bar_i // bars_per_day
        bar_in_day = bar_i % bars_per_day
        ts = base_time + timedelta(days=day_i, hours=bar_in_day * hours_per_bar)

        base_price = day_prices[min(day_i, total_days-1)]
        # 레짐별 변동성
        if day_i < 180:
            vol = 0.025  # 크래시
        elif day_i < 450:
            vol = 0.018  # 반등
        elif day_i < 790:
            vol = 0.015  # 횡보
        else:
            vol = 0.020  # 불장

        ret   = np.random.normal(0, vol)
        open_ = base_price * (1 + np.random.normal(0, vol * 0.3))
        close = open_ * (1 + ret)
        high  = max(open_, close) * (1 + abs(np.random.normal(0, vol * 0.4)))
        low   = min(open_, close) * (1 - abs(np.random.normal(0, vol * 0.4)))

        # 가격 점프 (뉴스 이벤트 모방)
        if np.random.random() < 0.003:
            shock = np.random.choice([-1, 1]) * np.random.uniform(0.04, 0.10)
            close *= (1 + shock)
            high   = max(high, close)
            low    = min(low, close)

        # 거래량 (가격 변동에 비례)
        base_vol = base_price * 50000
        vol_mult = 1 + abs(ret) * 15 + (np.random.exponential(0.3))
        volume   = base_vol * vol_mult

        rows.append([ts, open_, high, max(low, 1), close, volume])

    df = pd.DataFrame(rows, columns=["timestamp","open","high","low","close","volume"])
    print(f"    → {len(df)}개 봉 생성 완료  ({df['timestamp'].iloc[0].date()} ~ {df['timestamp'].iloc[-1].date()})")
    return df


# ── 지표 계산 ────────────────────────────────

def add_indicators(df):
    df = df.copy()
    df["body"]      = abs(df["close"] - df["open"])
    df["is_bull"]   = df["close"] > df["open"]
    df["avg_body"]  = df["body"].rolling(LOOKBACK).mean()
    df["avg_vol"]   = df["volume"].rolling(LOOKBACK).mean()
    df["prev_low"]  = df["low"].rolling(LOOKBACK).min().shift(1)
    df["prev_high"] = df["high"].rolling(LOOKBACK).max().shift(1)
    df["new_low"]   = df["low"] < df["prev_low"]
    df["new_high"]  = df["high"] > df["prev_high"]
    return df


# ── 시그널 탐지 ──────────────────────────────

def find_signals(df):
    signals = []
    used = set()

    for i in range(LOOKBACK + 1, len(df) - PULLBACK_WINDOW - 5):
        if i in used:
            continue

        # ── 롱 시그널: 신저점 돌파 후 대형 양봉 + 거래량 급등 ──
        if df["new_low"].iloc[i]:
            for j in range(i, min(i + 6, len(df) - 1)):
                c = df.iloc[j]
                big_body = c["body"] > BODY_MULT * c["avg_body"]
                big_vol  = c["volume"] > VOL_MULT * c["avg_vol"]
                if c["is_bull"] and big_body and big_vol:
                    body_bot = min(c["open"], c["close"])
                    stop     = c["low"] * 0.995
                    risk     = body_bot - stop
                    if risk <= 0:
                        break
                    signals.append({
                        "type": "LONG", "signal_i": j,
                        "date": df["timestamp"].iloc[j],
                        "entry": body_bot, "stop": stop,
                        "target": body_bot + risk * RR_RATIO,
                        "risk": risk,
                        "vol_ratio":  round(c["volume"] / c["avg_vol"], 1),
                        "body_ratio": round(c["body"] / c["avg_body"], 1),
                    })
                    for k in range(i, j + 1):
                        used.add(k)
                    break

        # ── 숏 시그널: 신고점 돌파 후 대형 음봉 + 거래량 급등 ──
        if df["new_high"].iloc[i]:
            for j in range(i, min(i + 6, len(df) - 1)):
                c = df.iloc[j]
                big_body = c["body"] > BODY_MULT * c["avg_body"]
                big_vol  = c["volume"] > VOL_MULT * c["avg_vol"]
                if not c["is_bull"] and big_body and big_vol:
                    body_top = max(c["open"], c["close"])
                    stop     = c["high"] * 1.005
                    risk     = stop - body_top
                    target   = body_top - risk * RR_RATIO
                    if risk <= 0 or target <= 0:
                        break
                    signals.append({
                        "type": "SHORT", "signal_i": j,
                        "date": df["timestamp"].iloc[j],
                        "entry": body_top, "stop": stop,
                        "target": target,
                        "risk": risk,
                        "vol_ratio":  round(c["volume"] / c["avg_vol"], 1),
                        "body_ratio": round(c["body"] / c["avg_body"], 1),
                    })
                    for k in range(i, j + 1):
                        used.add(k)
                    break

    return signals


# ── 트레이드 시뮬레이션 ───────────────────────

def simulate_trades(df, signals):
    trades = []

    for sig in signals:
        si    = sig["signal_i"]
        stype = sig["type"]
        entry = sig["entry"]
        stop  = sig["stop"]
        tgt   = sig["target"]

        entered    = False
        result     = None
        exit_price = None
        exit_date  = None
        entry_i    = None

        for i in range(si + 1, min(si + PULLBACK_WINDOW + 200, len(df))):
            c = df.iloc[i]
            in_pullback_window = (i <= si + PULLBACK_WINDOW)

            if not entered:
                if not in_pullback_window:
                    result = "NO_ENTRY"
                    break
                triggered = (stype == "LONG"  and c["low"]  <= entry) or \
                            (stype == "SHORT" and c["high"] >= entry)
                if triggered:
                    entered = True
                    entry_i = i
                    # 진입 봉에서 즉시 손절?
                    sl_hit = (stype == "LONG"  and c["low"]  <= stop) or \
                             (stype == "SHORT" and c["high"] >= stop)
                    if sl_hit:
                        result = "LOSS"; exit_price = stop; exit_date = c["timestamp"]
                        break
            else:
                if stype == "LONG":
                    if c["low"] <= stop:
                        result = "LOSS"; exit_price = stop; exit_date = c["timestamp"]; break
                    if c["high"] >= tgt:
                        result = "WIN";  exit_price = tgt;  exit_date = c["timestamp"]; break
                else:
                    if c["high"] >= stop:
                        result = "LOSS"; exit_price = stop; exit_date = c["timestamp"]; break
                    if c["low"] <= tgt:
                        result = "WIN";  exit_price = tgt;  exit_date = c["timestamp"]; break

        if entered and result is None:
            result     = "TIMEOUT"
            exit_price = df["close"].iloc[min(entry_i + 200, len(df)-1)]
            exit_date  = df["timestamp"].iloc[min(entry_i + 200, len(df)-1)]

        if not entered or result in (None, "NO_ENTRY"):
            continue

        if stype == "LONG":
            pnl_pct = (exit_price - entry) / entry
        else:
            pnl_pct = (entry - exit_price) / entry

        trades.append({
            **sig,
            "result":    result,
            "exit_price": exit_price,
            "exit_date":  exit_date,
            "pnl_pct":   pnl_pct,
            "pnl_lev":   pnl_pct * LEVERAGE,
        })

    return trades


# ── 복리 시뮬레이션 ──────────────────────────

def compound_sim(trades, seed=INITIAL_SEED):
    capital = seed
    peak    = seed
    history = [{"cap": seed, "trade": 0}]
    bust_at = None

    for idx, t in enumerate(trades, 1):
        if capital <= 0:
            break
        gain    = capital * t["pnl_lev"]
        capital = max(0.0, capital + gain)
        peak    = max(peak, capital)
        history.append({"cap": capital, "trade": idx})
        if capital == 0 and bust_at is None:
            bust_at = idx

    return capital, peak, history, bust_at


# ── 결과 출력 ────────────────────────────────

def print_results(trades, df):
    if not trades:
        print("⚠ 시그널 없음"); return

    dt = pd.DataFrame(trades)
    wins    = dt[dt["result"] == "WIN"]
    losses  = dt[dt["result"] == "LOSS"]
    timeout = dt[dt["result"] == "TIMEOUT"]

    total    = len(dt)
    wr       = len(wins) / total * 100
    avg_win  = wins["pnl_pct"].mean()   * 100 if len(wins)   else 0
    avg_loss = losses["pnl_pct"].mean() * 100 if len(losses) else 0
    ev       = (wr/100 * avg_win) + ((1 - wr/100) * avg_loss)

    final, peak, history, bust_at = compound_sim(trades)

    w = 56
    print("\n" + "═"*w)
    print(f"  ETH 전략 백테스트 결과  ({'DEMO' if DEMO_MODE else '실데이터'})")
    print("═"*w)
    print(f"  기간       {dt['date'].min().date()} ~ {dt['exit_date'].max().date()}")
    print(f"  레버리지   {LEVERAGE}배   R:R = 1:{RR_RATIO}")
    print(f"  조건       신저/신고 {LOOKBACK}봉 | 몸통 ×{BODY_MULT} | 거래량 ×{VOL_MULT}")
    print("─"*w)
    print(f"  총 거래    {total}회  (롱 {len(dt[dt['type']=='LONG'])}  숏 {len(dt[dt['type']=='SHORT'])})")
    print(f"  승률       {wr:.1f}%   ({len(wins)}승 / {len(losses)}패 / {len(timeout)}타임아웃)")
    print(f"  평균 익절  +{avg_win:.2f}%  |  평균 손절  {avg_loss:.2f}%")
    print(f"  기대값     {ev:+.2f}% / 트레이드")
    print("─"*w)

    # 롱/숏 분리 승률
    for t in ["LONG","SHORT"]:
        g = dt[dt["type"]==t]
        if g.empty: continue
        w_ = g[g["result"]=="WIN"]
        print(f"  [{t:5s}]  승률 {len(w_)/len(g)*100:.1f}%  ({len(w_)}/{len(g)})")

    print("─"*w)
    print(f"\n  ── 복리 시뮬레이션 (${INITIAL_SEED} 시드 × {LEVERAGE}배) ──")
    print(f"  최종 시드  ${final:>14,.2f}")
    print(f"  최고점     ${peak:>14,.2f}")

    if bust_at:
        print(f"  ⚠ {bust_at}번째 거래에서 청산 → 시드 소멸")
    else:
        roi = (final / INITIAL_SEED - 1) * 100
        print(f"  총 수익률  {roi:>13,.0f}%")

    # 연도별 승률
    print("\n  ── 연도별 승률 ──")
    dt["year"] = dt["date"].dt.year
    for yr, g in dt.groupby("year"):
        gw = g[g["result"]=="WIN"]
        print(f"  {yr}년  {len(gw)/len(g)*100:4.1f}%  ({len(gw)}/{len(g)})")

    # TOP 트레이드
    print("\n  ── 최고 수익 트레이드 ──")
    for _, r in dt.nlargest(5, "pnl_pct").iterrows():
        print(f"  {r['date'].date()}  {r['type']:5s}  "
              f"{r['entry']:8.1f} → {r['exit_price']:8.1f}  "
              f"{r['pnl_pct']*100:+6.1f}%  [{r['result']}]  "
              f"거래량×{r['vol_ratio']} 몸통×{r['body_ratio']}")

    print("\n  ── 최대 손실 트레이드 ──")
    for _, r in dt.nsmallest(5, "pnl_pct").iterrows():
        print(f"  {r['date'].date()}  {r['type']:5s}  "
              f"{r['entry']:8.1f} → {r['exit_price']:8.1f}  "
              f"{r['pnl_pct']*100:+6.1f}%  [{r['result']}]  "
              f"거래량×{r['vol_ratio']} 몸통×{r['body_ratio']}")

    print("═"*w + "\n")


# ── 메인 ─────────────────────────────────────

if __name__ == "__main__":
    if DEMO_MODE:
        df = generate_demo_data()
    else:
        df = fetch_binance()

    df = add_indicators(df)

    print(f"[+] 시그널 탐지 중...")
    signals = find_signals(df)
    long_s  = sum(1 for s in signals if s["type"] == "LONG")
    short_s = sum(1 for s in signals if s["type"] == "SHORT")
    print(f"    → 총 {len(signals)}개  (롱 {long_s}  숏 {short_s})")

    print(f"[+] 트레이드 시뮬레이션 중...")
    trades = simulate_trades(df, signals)
    print(f"    → 실제 진입 {len(trades)}회")

    print_results(trades, df)
