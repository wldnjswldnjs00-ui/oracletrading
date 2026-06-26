/* ============================================================================
 * Ayilon Strategy Engine  —  platform-neutral, user-composed strategies
 * ----------------------------------------------------------------------------
 * Design philosophy (enforced by structure):
 *   • Platform neutrality — the engine never recommends a trade and never
 *     guarantees profit. It only EXECUTES the user's declared logic. Every
 *     decision is traceable to the user's JSON config.
 *   • User sovereignty   — all parameters come from the strategy JSON.
 *   • Logical clarity     — long/short conflicts are resolved by the user's
 *     declared `conflict_resolution` rule, never by hidden heuristics.
 *
 * Pure, dependency-free. Runs identically in the Cloudflare Worker (backend)
 * and the browser (frontend) so params stay in sync across the API boundary.
 *
 * Signal convention:  +1 = long, -1 = short, 0 = neutral.
 * Candle format (OKX): [ts, o, h, l, c, v, ...]  (any order; prep() sorts).
 * ========================================================================== */

// ── series prep ─────────────────────────────────────────────────────────────
function prep(candles) {
  const K = candles.slice().sort((a, b) => (+a[0]) - (+b[0]));
  const n = K.length;
  const o = new Float64Array(n), h = new Float64Array(n), l = new Float64Array(n),
        c = new Float64Array(n), v = new Float64Array(n), t = new Float64Array(n);
  for (let i = 0; i < n; i++) { t[i]=+K[i][0]; o[i]=+K[i][1]; h[i]=+K[i][2]; l[i]=+K[i][3]; c[i]=+K[i][4]; v[i]=+K[i][5]; }
  return { n, t, o, h, l, c, v };
}

// ── math helpers (all return full-length arrays) ────────────────────────────
function ema(src, p) { const n=src.length, a=new Float64Array(n), k=2/(p+1); a[0]=src[0]; for (let i=1;i<n;i++) a[i]=src[i]*k+a[i-1]*(1-k); return a; }
function sma(src, p) { const n=src.length, a=new Float64Array(n); let s=0; for (let i=0;i<n;i++){ s+=src[i]; if(i>=p)s-=src[i-p]; a[i]= i>=p-1 ? s/p : NaN; } return a; }
function stdev(src, p) { const n=src.length, a=new Float64Array(n), m=sma(src,p); for (let i=p-1;i<n;i++){ let s=0; for(let j=i-p+1;j<=i;j++) s+=(src[j]-m[i])**2; a[i]=Math.sqrt(s/p);} return a; }
function rsiArr(c, p) { const n=c.length, a=new Float64Array(n); let g=0,ls=0; for(let i=1;i<=p&&i<n;i++){const d=c[i]-c[i-1]; d>0?g+=d:ls-=d;} g/=p; ls/=p; if(p<n)a[p]=ls===0?100:100-100/(1+g/ls); for(let i=p+1;i<n;i++){const d=c[i]-c[i-1]; g=(g*(p-1)+Math.max(0,d))/p; ls=(ls*(p-1)+Math.max(0,-d))/p; a[i]=ls===0?100:100-100/(1+g/ls);} return a; }
function atrArr(h,l,c,p){ const n=c.length,a=new Float64Array(n); for(let i=1;i<n;i++){const tr=Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])); a[i]=i<=p?(a[i-1]*(i-1)+tr)/i:(a[i-1]*(p-1)+tr)/p;} return a; }
function adxArr(h,l,c,p){ const n=c.length,pm=new Float64Array(n),nm=new Float64Array(n),tr=new Float64Array(n); for(let i=1;i<n;i++){const hd=h[i]-h[i-1],ld=l[i-1]-l[i]; pm[i]=hd>ld&&hd>0?hd:0; nm[i]=ld>hd&&ld>0?ld:0; tr[i]=Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1]));}
  const sT=new Float64Array(n),sP=new Float64Array(n),sN=new Float64Array(n),adx=new Float64Array(n),pdi=new Float64Array(n),ndi=new Float64Array(n);
  for(let i=1;i<n;i++){sT[i]=i<=p?(sT[i-1]*(i-1)+tr[i])/i:(sT[i-1]*(p-1)+tr[i])/p; sP[i]=i<=p?(sP[i-1]*(i-1)+pm[i])/i:(sP[i-1]*(p-1)+pm[i])/p; sN[i]=i<=p?(sN[i-1]*(i-1)+nm[i])/i:(sN[i-1]*(p-1)+nm[i])/p; pdi[i]=sT[i]?100*sP[i]/sT[i]:0; ndi[i]=sT[i]?100*sN[i]/sT[i]:0;}
  for(let i=p;i<n;i++){const dx=(pdi[i]+ndi[i])?100*Math.abs(pdi[i]-ndi[i])/(pdi[i]+ndi[i]):0; adx[i]=i===p?dx:(adx[i-1]*(p-1)+dx)/p;}
  return { adx, pdi, ndi };
}
function rollMax(a,p){const n=a.length,o=new Float64Array(n);for(let i=p-1;i<n;i++){let m=-Infinity;for(let j=i-p+1;j<=i;j++)if(a[j]>m)m=a[j];o[i]=m;}return o;}
function rollMin(a,p){const n=a.length,o=new Float64Array(n);for(let i=p-1;i<n;i++){let m=Infinity;for(let j=i-p+1;j<=i;j++)if(a[j]<m)m=a[j];o[i]=m;}return o;}
const sgn = x => x>0?1:x<0?-1:0;

// ── INDICATOR LIBRARY ───────────────────────────────────────────────────────
// Each: { id, name, category, defaults, compute(D, params) -> Int8Array(-1/0/+1) }
// Adding an indicator = appending one object here (scales to 100+ cleanly).
const INDICATORS = [
  // ── TREND ──
  { id:'ema_cross', name:'EMA Cross', category:'trend', defaults:{fast:20, slow:50},
    compute(D,p){ const f=ema(D.c,p.fast), s=ema(D.c,p.slow), out=new Int8Array(D.n); for(let i=0;i<D.n;i++) out[i]= i<p.slow?0:sgn(f[i]-s[i]); return out; } },
  { id:'sma_cross', name:'SMA Cross', category:'trend', defaults:{fast:10, slow:30},
    compute(D,p){ const f=sma(D.c,p.fast), s=sma(D.c,p.slow), out=new Int8Array(D.n); for(let i=0;i<D.n;i++) out[i]= isNaN(s[i])?0:sgn(f[i]-s[i]); return out; } },
  { id:'macd', name:'MACD', category:'trend', defaults:{fast:12, slow:26, signal:9},
    compute(D,p){ const ef=ema(D.c,p.fast), es=ema(D.c,p.slow), n=D.n, line=new Float64Array(n); for(let i=0;i<n;i++)line[i]=ef[i]-es[i]; const sig=ema(line,p.signal), out=new Int8Array(n); for(let i=0;i<n;i++) out[i]= i<p.slow+p.signal?0:sgn(line[i]-sig[i]); return out; } },
  { id:'adx_di', name:'ADX / DI', category:'trend', defaults:{period:14, min:20},
    compute(D,p){ const {adx,pdi,ndi}=adxArr(D.h,D.l,D.c,p.period), out=new Int8Array(D.n); for(let i=0;i<D.n;i++){ if(adx[i]<p.min){out[i]=0;continue;} out[i]=sgn(pdi[i]-ndi[i]); } return out; } },
  { id:'supertrend', name:'Supertrend', category:'trend', defaults:{period:10, mult:3},
    compute(D,p){ const at=atrArr(D.h,D.l,D.c,p.period), n=D.n, out=new Int8Array(n); let dir=1, up=0, dn=0; for(let i=1;i<n;i++){ const mid=(D.h[i]+D.l[i])/2; let u=mid+p.mult*at[i], d=mid-p.mult*at[i]; if(dir===1){ d=Math.max(d,dn); dir=D.c[i]<d?-1:1; } else { u=Math.min(u,up); dir=D.c[i]>u?1:-1; } up=u; dn=d; out[i]= i<p.period?0:dir; } return out; } },
  { id:'ema_ribbon', name:'EMA Ribbon (정/역배열)', category:'trend', defaults:{e1:5,e2:20,e3:60,e4:120},
    compute(D,p){ const a=ema(D.c,p.e1),b=ema(D.c,p.e2),c=ema(D.c,p.e3),d=ema(D.c,p.e4), out=new Int8Array(D.n); for(let i=0;i<D.n;i++){ if(i<p.e4){out[i]=0;continue;} if(a[i]>b[i]&&b[i]>c[i]&&c[i]>d[i])out[i]=1; else if(a[i]<b[i]&&b[i]<c[i]&&c[i]<d[i])out[i]=-1; else out[i]=0; } return out; } },
  { id:'donchian', name:'Donchian Breakout', category:'trend', defaults:{period:20},
    compute(D,p){ const hh=rollMax(D.h,p.period), ll=rollMin(D.l,p.period), out=new Int8Array(D.n); for(let i=1;i<D.n;i++){ if(i<=p.period){out[i]=0;continue;} if(D.c[i]>hh[i-1])out[i]=1; else if(D.c[i]<ll[i-1])out[i]=-1; else out[i]=0; } return out; } },
  { id:'psar', name:'Parabolic SAR', category:'trend', defaults:{step:0.02, max:0.2},
    compute(D,p){ const n=D.n,out=new Int8Array(n); let dir=1,sar=D.l[0],ep=D.h[0],af=p.step; for(let i=1;i<n;i++){ sar=sar+af*(ep-sar); if(dir===1){ if(D.h[i]>ep){ep=D.h[i];af=Math.min(af+p.step,p.max);} if(D.l[i]<sar){dir=-1;sar=ep;ep=D.l[i];af=p.step;} } else { if(D.l[i]<ep){ep=D.l[i];af=Math.min(af+p.step,p.max);} if(D.h[i]>sar){dir=1;sar=ep;ep=D.h[i];af=p.step;} } out[i]=dir; } return out; } },

  // ── MOMENTUM ──
  { id:'rsi', name:'RSI', category:'momentum', defaults:{period:14, low:30, high:70},
    compute(D,p){ const r=rsiArr(D.c,p.period), out=new Int8Array(D.n); for(let i=0;i<D.n;i++){ if(i<p.period){out[i]=0;continue;} out[i]= r[i]<p.low?1 : r[i]>p.high?-1 : 0; } return out; } },
  { id:'stoch', name:'Stochastic', category:'momentum', defaults:{period:14, low:20, high:80},
    compute(D,p){ const hh=rollMax(D.h,p.period), ll=rollMin(D.l,p.period), out=new Int8Array(D.n); for(let i=p.period-1;i<D.n;i++){ const k=hh[i]===ll[i]?50:100*(D.c[i]-ll[i])/(hh[i]-ll[i]); out[i]= k<p.low?1 : k>p.high?-1 : 0; } return out; } },
  { id:'stochrsi', name:'Stoch RSI', category:'momentum', defaults:{period:14, low:20, high:80},
    compute(D,p){ const r=rsiArr(D.c,p.period), hh=rollMax(r,p.period), ll=rollMin(r,p.period), out=new Int8Array(D.n); for(let i=2*p.period;i<D.n;i++){ const k=hh[i]===ll[i]?50:100*(r[i]-ll[i])/(hh[i]-ll[i]); out[i]= k<p.low?1 : k>p.high?-1 : 0; } return out; } },
  { id:'cci', name:'CCI', category:'momentum', defaults:{period:20, low:-100, high:100},
    compute(D,p){ const n=D.n, tp=new Float64Array(n); for(let i=0;i<n;i++)tp[i]=(D.h[i]+D.l[i]+D.c[i])/3; const m=sma(tp,p.period), out=new Int8Array(n); for(let i=p.period-1;i<n;i++){ let md=0; for(let j=i-p.period+1;j<=i;j++) md+=Math.abs(tp[j]-m[i]); md/=p.period; const cci=md===0?0:(tp[i]-m[i])/(0.015*md); out[i]= cci<p.low?1 : cci>p.high?-1 : 0; } return out; } },
  { id:'williams_r', name:'Williams %R', category:'momentum', defaults:{period:14, low:-80, high:-20},
    compute(D,p){ const hh=rollMax(D.h,p.period), ll=rollMin(D.l,p.period), out=new Int8Array(D.n); for(let i=p.period-1;i<D.n;i++){ const wr=hh[i]===ll[i]?-50:-100*(hh[i]-D.c[i])/(hh[i]-ll[i]); out[i]= wr<p.low?1 : wr>p.high?-1 : 0; } return out; } },
  { id:'roc', name:'Rate of Change', category:'momentum', defaults:{period:12},
    compute(D,p){ const out=new Int8Array(D.n); for(let i=p.period;i<D.n;i++) out[i]=sgn(D.c[i]-D.c[i-p.period]); return out; } },

  // ── VOLATILITY ──
  { id:'bollinger', name:'Bollinger Bands (역추세)', category:'volatility', defaults:{period:20, mult:2},
    compute(D,p){ const m=sma(D.c,p.period), sd=stdev(D.c,p.period), out=new Int8Array(D.n); for(let i=p.period-1;i<D.n;i++){ const up=m[i]+p.mult*sd[i], lo=m[i]-p.mult*sd[i]; out[i]= D.c[i]<lo?1 : D.c[i]>up?-1 : 0; } return out; } },
  { id:'bollinger_break', name:'Bollinger Breakout (추세)', category:'volatility', defaults:{period:20, mult:2},
    compute(D,p){ const m=sma(D.c,p.period), sd=stdev(D.c,p.period), out=new Int8Array(D.n); for(let i=p.period-1;i<D.n;i++){ const up=m[i]+p.mult*sd[i], lo=m[i]-p.mult*sd[i]; out[i]= D.c[i]>up?1 : D.c[i]<lo?-1 : 0; } return out; } },
  { id:'keltner', name:'Keltner Channel', category:'volatility', defaults:{period:20, mult:2},
    compute(D,p){ const m=ema(D.c,p.period), at=atrArr(D.h,D.l,D.c,p.period), out=new Int8Array(D.n); for(let i=p.period;i<D.n;i++){ const up=m[i]+p.mult*at[i], lo=m[i]-p.mult*at[i]; out[i]= D.c[i]>up?1 : D.c[i]<lo?-1 : 0; } return out; } },

  // ── VOLUME ──
  { id:'obv', name:'OBV Trend', category:'volume', defaults:{ema:21},
    compute(D,p){ const n=D.n, obv=new Float64Array(n); for(let i=1;i<n;i++) obv[i]=obv[i-1]+(D.c[i]>D.c[i-1]?D.v[i]:D.c[i]<D.c[i-1]?-D.v[i]:0); const e=ema(obv,p.ema), out=new Int8Array(n); for(let i=p.ema;i<n;i++) out[i]=sgn(obv[i]-e[i]); return out; } },
  { id:'volume_spike', name:'Volume Spike + Direction', category:'volume', defaults:{period:20, mult:1.8},
    compute(D,p){ const va=sma(D.v,p.period), out=new Int8Array(D.n); for(let i=p.period;i<D.n;i++){ if(D.v[i]>va[i]*p.mult) out[i]=sgn(D.c[i]-D.o[i]); else out[i]=0; } return out; } },
  { id:'vwap', name:'Rolling VWAP', category:'volume', defaults:{period:48},
    compute(D,p){ const n=D.n, out=new Int8Array(n); for(let i=p.period-1;i<n;i++){ let pv=0,vv=0; for(let j=i-p.period+1;j<=i;j++){ const tp=(D.h[j]+D.l[j]+D.c[j])/3; pv+=tp*D.v[j]; vv+=D.v[j]; } const vw=vv?pv/vv:D.c[i]; out[i]=sgn(D.c[i]-vw); } return out; } },
];
const REGISTRY = Object.fromEntries(INDICATORS.map(x => [x.id, x]));

// ── PUBLIC: indicator catalog for the UI ────────────────────────────────────
function listIndicators() {
  return INDICATORS.map(x => ({ id:x.id, name:x.name, category:x.category, defaults:{...x.defaults} }));
}

// ── per-indicator signals for a strategy config ─────────────────────────────
function computeSignals(D, indicatorConfigs) {
  return indicatorConfigs.map(cfg => {
    const def = REGISTRY[cfg.id];
    if (!def) return { id: cfg.id, missing: true, sig: new Int8Array(D.n) };
    const params = { ...def.defaults, ...(cfg.params || {}) };
    return { id: cfg.id, weight: cfg.weight ?? 1, sig: def.compute(D, params) };
  });
}

// ── CONFLICT RESOLUTION (user-declared rule, never hidden heuristics) ───────
// rule ∈ MAJORITY | WEIGHTED | AND_GATE | PRIORITY_ORDER
function resolveBar(votes, rule, priorityOrder) {
  // votes: [{id, weight, v(-1/0/1)}]
  const active = votes.filter(x => x.v !== 0);
  if (active.length === 0) return 0;
  switch (rule) {
    case 'AND_GATE': {                 // every non-neutral indicator must agree
      const dir = active[0].v;
      return active.every(x => x.v === dir) ? dir : 0;   // any disagreement → stand aside
    }
    case 'PRIORITY_ORDER': {           // first indicator (by user order) that has a signal wins
      const order = priorityOrder && priorityOrder.length ? priorityOrder : votes.map(x => x.id);
      for (const id of order) { const x = votes.find(v => v.id === id); if (x && x.v !== 0) return x.v; }
      return 0;
    }
    case 'WEIGHTED': {                 // weighted vote sum
      let s = 0; for (const x of active) s += x.weight * x.v; return sgn(s);
    }
    case 'MAJORITY':
    default: {                         // simple majority of votes (ties → neutral)
      let s = 0; for (const x of active) s += sgn(x.v); return sgn(s);
    }
  }
}

// ── evaluate a full strategy → final per-bar signal ─────────────────────────
function evaluateStrategy(candles, strat) {
  const D = prep(candles);
  const sigs = computeSignals(D, strat.indicators || []);
  const rule = strat.conflict_resolution || 'MAJORITY';
  const final = new Int8Array(D.n);
  for (let i = 0; i < D.n; i++) {
    const votes = sigs.map(s => ({ id: s.id, weight: s.weight ?? 1, v: s.sig[i] || 0 }));
    final[i] = resolveBar(votes, rule, strat.priority_order);
  }
  return { D, perIndicator: sigs, final };
}

// ── STRATEGY VALIDATOR — warns before activation, never blocks silently ─────
function validateStrategy(candles, strat) {
  const warnings = [];
  const inds = strat.indicators || [];
  if (inds.length === 0) warnings.push({ level:'error', code:'NO_INDICATORS', msg:'지표가 없습니다. 최소 1개를 추가하세요.' });
  for (const c of inds) if (!REGISTRY[c.id]) warnings.push({ level:'error', code:'UNKNOWN_INDICATOR', msg:`알 수 없는 지표: ${c.id}` });
  const rule = strat.conflict_resolution || 'MAJORITY';
  if (!['MAJORITY','WEIGHTED','AND_GATE','PRIORITY_ORDER'].includes(rule))
    warnings.push({ level:'error', code:'BAD_RULE', msg:`충돌 규칙이 올바르지 않습니다: ${rule}` });

  const { D, final } = evaluateStrategy(candles, strat);
  let nonNeutral = 0, flips = 0, prev = 0, conflictBars = 0;
  // recompute conflicts (bars where indicators disagreed and rule produced 0 despite active signals)
  const sigs = computeSignals(D, inds);
  for (let i = 0; i < D.n; i++) {
    if (final[i] !== 0) nonNeutral++;
    if (final[i] !== 0 && prev !== 0 && final[i] !== prev) flips++;
    if (final[i] !== 0) prev = final[i];
    const votes = sigs.map(s => s.sig[i] || 0);
    const hasL = votes.includes(1), hasS = votes.includes(-1);
    if (hasL && hasS && final[i] === 0) conflictBars++;
  }
  const signalRate = D.n ? nonNeutral / D.n : 0;
  const flipRate   = nonNeutral ? flips / nonNeutral : 0;
  const conflictRate = D.n ? conflictBars / D.n : 0;

  if (signalRate < 0.005) warnings.push({ level:'warn', code:'NEVER_TRADES', msg:'설정이 거의 신호를 내지 않습니다 (AND_GATE에서 지표들이 계속 충돌할 수 있음). 규칙 완화를 고려하세요.' });
  if (flipRate > 0.5)     warnings.push({ level:'warn', code:'OVER_TRADING', msg:`신호 방향이 너무 자주 뒤집힙니다 (전환율 ${(flipRate*100).toFixed(0)}%). 노이즈/과매매 위험 — 지표를 줄이거나 추세 필터를 추가하세요.` });
  if (rule === 'AND_GATE' && conflictRate > 0.3) warnings.push({ level:'warn', code:'HIGH_CONFLICT', msg:`지표 충돌이 잦습니다 (${(conflictRate*100).toFixed(0)}%). AND_GATE라 대부분 관망합니다.` });
  if (inds.length >= 8)   warnings.push({ level:'info', code:'MANY_INDICATORS', msg:`지표 ${inds.length}개 — 많을수록 신호가 희석됩니다(특히 MAJORITY). weight나 PRIORITY_ORDER 사용을 권장.` });

  return { warnings, stats:{ bars:D.n, signalRate, flipRate, conflictRate, indicators: inds.length } };
}

// ── CONSISTENCY BACKTEST (verification only — NOT profit optimization) ──────
// Confirms the user's logic behaves as intended and produces the disclosure
// stats (win rate / return) that the accountability gate must show. Uses the
// user's own position_sizing and exit_rules.
function backtestStrategy(candles, strat, opts = {}) {
  const slip = opts.slip ?? 0.0005, FEE = opts.fee ?? 0.0005;
  const { D, final } = evaluateStrategy(candles, strat);
  const sizePct = (strat.position_sizing?.fixed_pct ?? 10) / 100;          // % of equity as margin
  const lev = strat.position_sizing?.leverage ?? 1;
  const exits = (strat.exit_rules || []).slice().sort((a,b)=>(a.type==='SL'?-1:1)); // check SL first
  let eq = opts.cap ?? 10000, peak = eq, mdd = 0, wins = 0, n = 0;
  const trades = []; let pos = null;

  for (let i = 1; i < D.n; i++) {
    if (pos) {
      let exitPx = null;
      const move = pos.dir === 1 ? (D.h[i]-pos.entry)/pos.entry : (pos.entry-D.l[i])/pos.entry;     // best favorable
      const adv  = pos.dir === 1 ? (pos.entry-D.l[i])/pos.entry : (D.h[i]-pos.entry)/pos.entry;     // worst adverse
      for (const r of exits) {
        if (r.type === 'SL' && adv >= (r.price_pct/100)) { exitPx = pos.dir===1 ? pos.entry*(1-r.price_pct/100) : pos.entry*(1+r.price_pct/100); break; }
        if (r.type === 'TP' && move >= (r.price_pct/100)) { exitPx = pos.dir===1 ? pos.entry*(1+r.price_pct/100) : pos.entry*(1-r.price_pct/100); break; }
      }
      // also exit if the strategy signal flips against the position
      if (exitPx === null && final[i] === -pos.dir) exitPx = D.c[i];
      if (exitPx !== null) {
        const xp = pos.dir===1 ? exitPx*(1-slip) : exitPx*(1+slip);
        const ret = pos.dir===1 ? (xp-pos.entry)/pos.entry : (pos.entry-xp)/pos.entry;
        const pnl = ret*pos.notional - pos.notional*FEE;
        eq += pnl; if(eq>peak)peak=eq; mdd=Math.max(mdd,(peak-eq)/peak); if(pnl>0)wins++; n++;
        trades.push({ dir:pos.dir, ret, pnl }); pos = null;
      }
    }
    if (!pos && final[i] !== 0) {                       // enter on a fresh signal
      const entry = D.c[i]*(final[i]===1?1+slip:1-slip);
      const notional = eq*sizePct*lev;
      eq -= notional*FEE;
      pos = { dir: final[i], entry, notional };
    }
  }
  const yrs = D.n>1 ? (D.t[D.n-1]-D.t[0])/(365.25*24*3600*1000) : 0;
  const totRet = (eq/(opts.cap??10000)-1)*100;
  return {
    trades: n, winRate: n? wins/n*100 : 0, totalReturn: totRet,
    annualReturn: yrs>0 && eq>0 ? ((eq/(opts.cap??10000))**(1/yrs)-1)*100 : 0,
    maxDrawdown: mdd*100, finalEquity: eq, years: yrs,
  };
}

// ── exports (ESM for worker/browser-module, CommonJS for node tests) ────────
const ENGINE = { prep, listIndicators, computeSignals, resolveBar, evaluateStrategy, validateStrategy, backtestStrategy, INDICATORS, REGISTRY };
if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE;
if (typeof window !== 'undefined') window.StrategyEngine = ENGINE;
export default ENGINE;
