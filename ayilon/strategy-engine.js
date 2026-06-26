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
function wma(src,p){ const n=src.length,a=new Float64Array(n); for(let i=p-1;i<n;i++){ let num=0,den=0; for(let k=0;k<p;k++){ const wt=p-k; num+=src[i-k]*wt; den+=wt; } a[i]=num/den; } return a; }
function dema(src,p){ const e1=ema(src,p),e2=ema(e1,p),n=src.length,a=new Float64Array(n); for(let i=0;i<n;i++)a[i]=2*e1[i]-e2[i]; return a; }
function tema(src,p){ const e1=ema(src,p),e2=ema(e1,p),e3=ema(e2,p),n=src.length,a=new Float64Array(n); for(let i=0;i<n;i++)a[i]=3*e1[i]-3*e2[i]+e3[i]; return a; }
function linregSlope(src,p){ const n=src.length,a=new Float64Array(n),xm=(p-1)/2; let sxx=0; for(let k=0;k<p;k++)sxx+=(k-xm)*(k-xm); for(let i=p-1;i<n;i++){ let ym=0; for(let k=0;k<p;k++)ym+=src[i-p+1+k]; ym/=p; let sxy=0; for(let k=0;k<p;k++)sxy+=(k-xm)*(src[i-p+1+k]-ym); a[i]=sxx?sxy/sxx:0; } return a; }
function cmoArr(c,p){ const n=c.length,a=new Float64Array(n); for(let i=p;i<n;i++){ let up=0,dn=0; for(let j=i-p+1;j<=i;j++){ const d=c[j]-c[j-1]; if(d>0)up+=d; else dn-=d; } a[i]=(up+dn)===0?0:100*(up-dn)/(up+dn); } return a; }

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
  // ── extended set ──
  { id:'mfi', name:'Money Flow Index', category:'momentum', defaults:{period:14, low:20, high:80},
    compute(D,p){ const n=D.n,o=new Int8Array(n); let pf=new Float64Array(n),nf=new Float64Array(n); for(let i=1;i<n;i++){ const tp=(D.h[i]+D.l[i]+D.c[i])/3, tpp=(D.h[i-1]+D.l[i-1]+D.c[i-1])/3, mf=tp*D.v[i]; if(tp>tpp)pf[i]=mf; else if(tp<tpp)nf[i]=mf; } for(let i=p.period;i<n;i++){ let sp=0,sn=0; for(let j=i-p.period+1;j<=i;j++){sp+=pf[j];sn+=nf[j];} const mr=sn===0?100:100-100/(1+sp/sn); o[i]= mr<p.low?1: mr>p.high?-1:0; } return o; } },
  { id:'cmf', name:'Chaikin Money Flow', category:'volume', defaults:{period:20},
    compute(D,p){ const n=D.n,o=new Int8Array(n),mfv=new Float64Array(n); for(let i=0;i<n;i++){ const r=D.h[i]-D.l[i]; mfv[i]= r>0 ? ((D.c[i]-D.l[i])-(D.h[i]-D.c[i]))/r*D.v[i] : 0; } for(let i=p.period-1;i<n;i++){ let sm=0,sv=0; for(let j=i-p.period+1;j<=i;j++){sm+=mfv[j];sv+=D.v[j];} o[i]= sv>0? sgn(sm/sv):0; } return o; } },
  { id:'aroon', name:'Aroon', category:'trend', defaults:{period:25},
    compute(D,p){ const n=D.n,o=new Int8Array(n); for(let i=p.period;i<n;i++){ let hi=-Infinity,lo=Infinity,hb=0,lb=0; for(let k=0;k<=p.period;k++){ const idx=i-k; if(D.h[idx]>hi){hi=D.h[idx];hb=k;} if(D.l[idx]<lo){lo=D.l[idx];lb=k;} } const up=100*(p.period-hb)/p.period, dn=100*(p.period-lb)/p.period; o[i]=sgn(up-dn); } return o; } },
  { id:'trix', name:'TRIX', category:'momentum', defaults:{period:15},
    compute(D,p){ const e1=ema(D.c,p.period),e2=ema(e1,p.period),e3=ema(e2,p.period),n=D.n,o=new Int8Array(n); for(let i=1;i<n;i++){ const t= e3[i-1]!==0?(e3[i]-e3[i-1])/e3[i-1]:0; o[i]= i<3*p.period?0:sgn(t); } return o; } },
  { id:'awesome', name:'Awesome Oscillator', category:'momentum', defaults:{fast:5, slow:34},
    compute(D,p){ const n=D.n,med=new Float64Array(n); for(let i=0;i<n;i++)med[i]=(D.h[i]+D.l[i])/2; const f=sma(med,p.fast),s=sma(med,p.slow),o=new Int8Array(n); for(let i=p.slow;i<n;i++)o[i]=sgn(f[i]-s[i]); return o; } },
  { id:'dpo', name:'Detrended Price Osc', category:'momentum', defaults:{period:20},
    compute(D,p){ const m=sma(D.c,p.period),n=D.n,o=new Int8Array(n),sh=Math.floor(p.period/2)+1; for(let i=p.period;i<n;i++){ if(i-sh<0)continue; o[i]=sgn(D.c[i-sh]-m[i]); } return o; } },
  { id:'vortex', name:'Vortex', category:'trend', defaults:{period:14},
    compute(D,p){ const n=D.n,vp=new Float64Array(n),vm=new Float64Array(n),tr=new Float64Array(n); for(let i=1;i<n;i++){ vp[i]=Math.abs(D.h[i]-D.l[i-1]); vm[i]=Math.abs(D.l[i]-D.h[i-1]); tr[i]=Math.max(D.h[i]-D.l[i],Math.abs(D.h[i]-D.c[i-1]),Math.abs(D.l[i]-D.c[i-1])); } const o=new Int8Array(n); for(let i=p.period;i<n;i++){ let sp=0,sm=0,st=0; for(let j=i-p.period+1;j<=i;j++){sp+=vp[j];sm+=vm[j];st+=tr[j];} o[i]= st>0? sgn(sp-sm):0; } return o; } },
  { id:'momentum', name:'Momentum', category:'momentum', defaults:{period:10},
    compute(D,p){ const o=new Int8Array(D.n); for(let i=p.period;i<D.n;i++)o[i]=sgn(D.c[i]-D.c[i-p.period]); return o; } },
  { id:'ema_slope', name:'EMA Slope', category:'trend', defaults:{period:50, lookback:3},
    compute(D,p){ const e=ema(D.c,p.period),n=D.n,o=new Int8Array(n); for(let i=p.period+p.lookback;i<n;i++)o[i]=sgn(e[i]-e[i-p.lookback]); return o; } },
  { id:'hma', name:'Hull MA Trend', category:'trend', defaults:{period:20},
    compute(D,p){ const half=Math.max(1,Math.round(p.period/2)), sq=Math.max(1,Math.round(Math.sqrt(p.period))), n=D.n;
      const w1=wma(D.c,half), w2=wma(D.c,p.period), raw=new Float64Array(n); for(let i=0;i<n;i++)raw[i]=2*w1[i]-w2[i]; const hh=wma(raw,sq),o=new Int8Array(n);
      for(let i=p.period+sq;i<n;i++)o[i]=sgn(hh[i]-hh[i-1]); return o; } },

  // ── extended TREND ──
  { id:'wma_cross', name:'WMA Cross', category:'trend', defaults:{fast:10, slow:30},
    compute(D,p){ const f=wma(D.c,p.fast),s=wma(D.c,p.slow),o=new Int8Array(D.n); for(let i=p.slow;i<D.n;i++)o[i]=sgn(f[i]-s[i]); return o; } },
  { id:'dema_cross', name:'DEMA Cross', category:'trend', defaults:{fast:10, slow:30},
    compute(D,p){ const f=dema(D.c,p.fast),s=dema(D.c,p.slow),o=new Int8Array(D.n); for(let i=p.slow*2;i<D.n;i++)o[i]=sgn(f[i]-s[i]); return o; } },
  { id:'tema_cross', name:'TEMA Cross', category:'trend', defaults:{fast:10, slow:30},
    compute(D,p){ const f=tema(D.c,p.fast),s=tema(D.c,p.slow),o=new Int8Array(D.n); for(let i=p.slow*3;i<D.n;i++)o[i]=sgn(f[i]-s[i]); return o; } },
  { id:'ema200', name:'EMA200 Regime', category:'trend', defaults:{period:200},
    compute(D,p){ const e=ema(D.c,p.period),o=new Int8Array(D.n); for(let i=p.period;i<D.n;i++)o[i]=sgn(D.c[i]-e[i]); return o; } },
  { id:'price_vs_sma', name:'Price vs SMA', category:'trend', defaults:{period:50},
    compute(D,p){ const s=sma(D.c,p.period),o=new Int8Array(D.n); for(let i=p.period-1;i<D.n;i++)o[i]=sgn(D.c[i]-s[i]); return o; } },
  { id:'linreg_slope', name:'Linear Regression Slope', category:'trend', defaults:{period:20},
    compute(D,p){ const sl=linregSlope(D.c,p.period),o=new Int8Array(D.n); for(let i=p.period-1;i<D.n;i++)o[i]=sgn(sl[i]); return o; } },
  { id:'ichimoku', name:'Ichimoku TK Cross', category:'trend', defaults:{tenkan:9, kijun:26},
    compute(D,p){ const n=D.n,th=rollMax(D.h,p.tenkan),tl=rollMin(D.l,p.tenkan),kh=rollMax(D.h,p.kijun),kl=rollMin(D.l,p.kijun),o=new Int8Array(n); for(let i=p.kijun;i<n;i++){ const ten=(th[i]+tl[i])/2, kij=(kh[i]+kl[i])/2; o[i]= (D.c[i]>kij)?sgn(ten-kij):(D.c[i]<kij?sgn(ten-kij):0); } return o; } },
  { id:'kijun', name:'Kijun-sen Base', category:'trend', defaults:{period:26},
    compute(D,p){ const kh=rollMax(D.h,p.period),kl=rollMin(D.l,p.period),o=new Int8Array(D.n); for(let i=p.period-1;i<D.n;i++)o[i]=sgn(D.c[i]-(kh[i]+kl[i])/2); return o; } },
  { id:'kst', name:'KST', category:'trend', defaults:{},
    compute(D,p){ const n=D.n,c=D.c,o=new Int8Array(n); const roc=(per)=>{const a=new Float64Array(n);for(let i=per;i<n;i++)a[i]=c[i-per]!==0?100*(c[i]-c[i-per])/c[i-per]:0;return a;}; const r1=sma(roc(10),10),r2=sma(roc(15),10),r3=sma(roc(20),10),r4=sma(roc(30),15),kst=new Float64Array(n); for(let i=0;i<n;i++)kst[i]=r1[i]+2*r2[i]+3*r3[i]+4*r4[i]; const sig=sma(kst,9); for(let i=60;i<n;i++)o[i]=sgn(kst[i]-sig[i]); return o; } },
  { id:'aroon_osc', name:'Aroon Oscillator', category:'trend', defaults:{period:25, thresh:30},
    compute(D,p){ const n=D.n,o=new Int8Array(n); for(let i=p.period;i<n;i++){ let hi=-Infinity,lo=Infinity,hb=0,lb=0; for(let k=0;k<=p.period;k++){ const idx=i-k; if(D.h[idx]>hi){hi=D.h[idx];hb=k;} if(D.l[idx]<lo){lo=D.l[idx];lb=k;} } const osc=100*(lb-hb)/p.period; o[i]= osc>p.thresh?1: osc<-p.thresh?-1:0; } return o; } },
  { id:'dpo_slope', name:'DPO Slope', category:'trend', defaults:{period:20},
    compute(D,p){ const m=sma(D.c,p.period),n=D.n,o=new Int8Array(n),sh=Math.floor(p.period/2)+1; const dp=new Float64Array(n); for(let i=p.period;i<n;i++){ if(i-sh<0)continue; dp[i]=D.c[i-sh]-m[i]; } for(let i=p.period+1;i<n;i++)o[i]=sgn(dp[i]-dp[i-1]); return o; } },
  { id:'guppy', name:'Guppy MMA', category:'trend', defaults:{},
    compute(D,p){ const n=D.n,o=new Int8Array(n); const sh=[ema(D.c,3),ema(D.c,5),ema(D.c,8),ema(D.c,10),ema(D.c,12),ema(D.c,15)]; const ln=[ema(D.c,30),ema(D.c,35),ema(D.c,40),ema(D.c,45),ema(D.c,50),ema(D.c,60)]; for(let i=60;i<n;i++){ let smin=Infinity,smax=-Infinity,lmin=Infinity,lmax=-Infinity; for(const e of sh){smin=Math.min(smin,e[i]);smax=Math.max(smax,e[i]);} for(const e of ln){lmin=Math.min(lmin,e[i]);lmax=Math.max(lmax,e[i]);} o[i]= smin>lmax?1: smax<lmin?-1:0; } return o; } },

  // ── extended MOMENTUM ──
  { id:'ppo', name:'PPO', category:'momentum', defaults:{fast:12, slow:26, signal:9},
    compute(D,p){ const ef=ema(D.c,p.fast),es=ema(D.c,p.slow),n=D.n,ppo=new Float64Array(n); for(let i=0;i<n;i++)ppo[i]=es[i]?100*(ef[i]-es[i])/es[i]:0; const sig=ema(ppo,p.signal),o=new Int8Array(n); for(let i=p.slow+p.signal;i<n;i++)o[i]=sgn(ppo[i]-sig[i]); return o; } },
  { id:'cmo', name:'Chande Momentum (CMO)', category:'momentum', defaults:{period:14, thresh:50},
    compute(D,p){ const cm=cmoArr(D.c,p.period),o=new Int8Array(D.n); for(let i=p.period;i<D.n;i++)o[i]= cm[i]<-p.thresh?1: cm[i]>p.thresh?-1:0; return o; } },
  { id:'tsi', name:'True Strength Index', category:'momentum', defaults:{long:25, short:13, signal:13},
    compute(D,p){ const n=D.n,m=new Float64Array(n),am=new Float64Array(n); for(let i=1;i<n;i++){m[i]=D.c[i]-D.c[i-1];am[i]=Math.abs(m[i]);} const e1=ema(m,p.long),e2=ema(e1,p.short),a1=ema(am,p.long),a2=ema(a1,p.short),tsi=new Float64Array(n); for(let i=0;i<n;i++)tsi[i]=a2[i]?100*e2[i]/a2[i]:0; const sig=ema(tsi,p.signal),o=new Int8Array(n); for(let i=p.long+p.short+p.signal;i<n;i++)o[i]=sgn(tsi[i]-sig[i]); return o; } },
  { id:'uo', name:'Ultimate Oscillator', category:'momentum', defaults:{low:30, high:70},
    compute(D,p){ const n=D.n,bp=new Float64Array(n),tr=new Float64Array(n); for(let i=1;i<n;i++){ const minL=Math.min(D.l[i],D.c[i-1]), maxH=Math.max(D.h[i],D.c[i-1]); bp[i]=D.c[i]-minL; tr[i]=maxH-minL; } const o=new Int8Array(n); const avg=(per,i)=>{let sb=0,st=0;for(let j=i-per+1;j<=i;j++){sb+=bp[j];st+=tr[j];}return st?sb/st:0;}; for(let i=28;i<n;i++){ const uo=100*(4*avg(7,i)+2*avg(14,i)+avg(28,i))/7; o[i]= uo<p.low?1: uo>p.high?-1:0; } return o; } },
  { id:'rvi', name:'Relative Vigor Index', category:'momentum', defaults:{period:10},
    compute(D,p){ const n=D.n,num=new Float64Array(n),den=new Float64Array(n); for(let i=3;i<n;i++){ const co=(i)=>D.c[i]-D.o[i], hl=(i)=>D.h[i]-D.l[i]; num[i]=(co(i)+2*co(i-1)+2*co(i-2)+co(i-3))/6; den[i]=(hl(i)+2*hl(i-1)+2*hl(i-2)+hl(i-3))/6; } const sn=sma(num,p.period),sd=sma(den,p.period),rvi=new Float64Array(n); for(let i=0;i<n;i++)rvi[i]=sd[i]?sn[i]/sd[i]:0; const sig=new Float64Array(n); for(let i=3;i<n;i++)sig[i]=(rvi[i]+2*rvi[i-1]+2*rvi[i-2]+rvi[i-3])/6; const o=new Int8Array(n); for(let i=p.period+4;i<n;i++)o[i]=sgn(rvi[i]-sig[i]); return o; } },
  { id:'kdj', name:'KDJ', category:'momentum', defaults:{period:9},
    compute(D,p){ const n=D.n,hh=rollMax(D.h,p.period),ll=rollMin(D.l,p.period),k=new Float64Array(n),d=new Float64Array(n),o=new Int8Array(n); let kp=50,dp=50; for(let i=p.period-1;i<n;i++){ const rsv=hh[i]===ll[i]?50:100*(D.c[i]-ll[i])/(hh[i]-ll[i]); kp=(2/3)*kp+(1/3)*rsv; dp=(2/3)*dp+(1/3)*kp; k[i]=kp;d[i]=dp; const j=3*kp-2*dp; o[i]= j<0?1: j>100?-1: sgn(kp-dp); } return o; } },
  { id:'fisher', name:'Fisher Transform', category:'momentum', defaults:{period:10},
    compute(D,p){ const n=D.n,hh=rollMax(D.h,p.period),ll=rollMin(D.l,p.period),o=new Int8Array(n); let v=0,fish=0,fp=0; for(let i=p.period-1;i<n;i++){ const mp=(D.h[i]+D.l[i])/2; let x=hh[i]===ll[i]?0:2*((mp-ll[i])/(hh[i]-ll[i])-0.5); v=0.33*x+0.67*v; v=Math.max(-0.999,Math.min(0.999,v)); fp=fish; fish=0.5*Math.log((1+v)/(1-v))+0.5*fish; o[i]=sgn(fish-fp); } return o; } },
  { id:'bop', name:'Balance of Power', category:'momentum', defaults:{period:14},
    compute(D,p){ const n=D.n,b=new Float64Array(n); for(let i=0;i<n;i++){ const r=D.h[i]-D.l[i]; b[i]= r>0?(D.c[i]-D.o[i])/r:0; } const s=sma(b,p.period),o=new Int8Array(n); for(let i=p.period-1;i<n;i++)o[i]=sgn(s[i]); return o; } },
  { id:'coppock', name:'Coppock Curve', category:'momentum', defaults:{roc1:14, roc2:11, wma:10},
    compute(D,p){ const n=D.n,c=D.c,roc=(per)=>{const a=new Float64Array(n);for(let i=per;i<n;i++)a[i]=c[i-per]!==0?100*(c[i]-c[i-per])/c[i-per]:0;return a;}; const r1=roc(p.roc1),r2=roc(p.roc2),s=new Float64Array(n); for(let i=0;i<n;i++)s[i]=r1[i]+r2[i]; const cop=wma(s,p.wma),o=new Int8Array(n); for(let i=p.roc1+p.wma;i<n;i++)o[i]=sgn(cop[i]-cop[i-1]); return o; } },
  { id:'elder_ray', name:'Elder Ray', category:'momentum', defaults:{period:13},
    compute(D,p){ const e=ema(D.c,p.period),n=D.n,o=new Int8Array(n); for(let i=p.period;i<n;i++){ const bull=D.h[i]-e[i], bear=D.l[i]-e[i]; o[i]= (bull>0&&bear>0)?1: (bull<0&&bear<0)?-1:0; } return o; } },
  { id:'rsi_mid', name:'RSI Midline (50)', category:'momentum', defaults:{period:14},
    compute(D,p){ const r=rsiArr(D.c,p.period),o=new Int8Array(D.n); for(let i=p.period;i<D.n;i++)o[i]=sgn(r[i]-50); return o; } },
  { id:'stoch_cross', name:'Stochastic %K/%D Cross', category:'momentum', defaults:{period:14, smooth:3},
    compute(D,p){ const n=D.n,hh=rollMax(D.h,p.period),ll=rollMin(D.l,p.period),kr=new Float64Array(n); for(let i=p.period-1;i<n;i++)kr[i]=hh[i]===ll[i]?50:100*(D.c[i]-ll[i])/(hh[i]-ll[i]); const k=sma(kr,p.smooth),d=sma(k,p.smooth),o=new Int8Array(n); for(let i=p.period+2*p.smooth;i<n;i++)o[i]=sgn(k[i]-d[i]); return o; } },

  // ── extended VOLATILITY ──
  { id:'bb_squeeze', name:'Bollinger Squeeze Breakout', category:'volatility', defaults:{period:20, mult:2, lookback:50},
    compute(D,p){ const m=sma(D.c,p.period),sd=stdev(D.c,p.period),n=D.n,width=new Float64Array(n); for(let i=p.period-1;i<n;i++)width[i]=m[i]?(2*p.mult*sd[i])/m[i]:0; const minW=rollMin(width,p.lookback),o=new Int8Array(n); for(let i=p.lookback;i<n;i++){ const up=m[i]+p.mult*sd[i],lo=m[i]-p.mult*sd[i]; if(Math.abs(width[i]-minW[i])<1e-9){ o[i]= D.c[i]>up?1: D.c[i]<lo?-1:0; } else o[i]= D.c[i]>up?1: D.c[i]<lo?-1:0; } return o; } },
  { id:'chandelier', name:'Chandelier Exit', category:'volatility', defaults:{period:22, mult:3},
    compute(D,p){ const at=atrArr(D.h,D.l,D.c,p.period),hh=rollMax(D.h,p.period),ll=rollMin(D.l,p.period),n=D.n,o=new Int8Array(n); let dir=1; for(let i=p.period;i<n;i++){ const longStop=hh[i]-p.mult*at[i], shortStop=ll[i]+p.mult*at[i]; if(D.c[i]<longStop)dir=-1; else if(D.c[i]>shortStop)dir=1; o[i]=dir; } return o; } },
  { id:'choppiness', name:'Choppiness Filter', category:'volatility', defaults:{period:14, thresh:50},
    compute(D,p){ const at=atrArr(D.h,D.l,D.c,1),hh=rollMax(D.h,p.period),ll=rollMin(D.l,p.period),n=D.n,o=new Int8Array(n); for(let i=p.period;i<n;i++){ let sumtr=0; for(let j=i-p.period+1;j<=i;j++)sumtr+=at[j]; const rng=hh[i]-ll[i]; if(rng<=0){o[i]=0;continue;} const ci=100*Math.log10(sumtr/rng)/Math.log10(p.period); o[i]= ci<p.thresh? sgn(D.c[i]-D.c[i-p.period]) : 0; } return o; } },
  { id:'atr_breakout', name:'ATR Channel Breakout', category:'volatility', defaults:{period:20, mult:1.5},
    compute(D,p){ const e=ema(D.c,p.period),at=atrArr(D.h,D.l,D.c,p.period),n=D.n,o=new Int8Array(n); for(let i=p.period;i<n;i++){ if(D.c[i]>e[i-1]+p.mult*at[i-1])o[i]=1; else if(D.c[i]<e[i-1]-p.mult*at[i-1])o[i]=-1; else o[i]=0; } return o; } },
  { id:'std_regime', name:'Volatility Regime (StDev)', category:'volatility', defaults:{period:20, lookback:100},
    compute(D,p){ const sd=stdev(D.c,p.period),avg=sma(sd,p.lookback),n=D.n,o=new Int8Array(n); for(let i=p.lookback;i<n;i++){ if(sd[i]>avg[i]) o[i]=sgn(D.c[i]-D.c[i-1]); else o[i]=0; } return o; } },

  // ── extended VOLUME ──
  { id:'ad_line', name:'Accumulation/Distribution', category:'volume', defaults:{ema:21},
    compute(D,p){ const n=D.n,ad=new Float64Array(n); for(let i=0;i<n;i++){ const r=D.h[i]-D.l[i]; const mfm= r>0?((D.c[i]-D.l[i])-(D.h[i]-D.c[i]))/r:0; ad[i]=(i?ad[i-1]:0)+mfm*D.v[i]; } const e=ema(ad,p.ema),o=new Int8Array(n); for(let i=p.ema;i<n;i++)o[i]=sgn(ad[i]-e[i]); return o; } },
  { id:'chaikin_osc', name:'Chaikin Oscillator', category:'volume', defaults:{fast:3, slow:10},
    compute(D,p){ const n=D.n,ad=new Float64Array(n); for(let i=0;i<n;i++){ const r=D.h[i]-D.l[i]; const mfm= r>0?((D.c[i]-D.l[i])-(D.h[i]-D.c[i]))/r:0; ad[i]=(i?ad[i-1]:0)+mfm*D.v[i]; } const ef=ema(ad,p.fast),es=ema(ad,p.slow),o=new Int8Array(n); for(let i=p.slow;i<n;i++)o[i]=sgn(ef[i]-es[i]); return o; } },
  { id:'force_index', name:'Force Index', category:'volume', defaults:{period:13},
    compute(D,p){ const n=D.n,fi=new Float64Array(n); for(let i=1;i<n;i++)fi[i]=(D.c[i]-D.c[i-1])*D.v[i]; const e=ema(fi,p.period),o=new Int8Array(n); for(let i=p.period;i<n;i++)o[i]=sgn(e[i]); return o; } },
  { id:'eom', name:'Ease of Movement', category:'volume', defaults:{period:14},
    compute(D,p){ const n=D.n,em=new Float64Array(n); for(let i=1;i<n;i++){ const dm=((D.h[i]+D.l[i])/2)-((D.h[i-1]+D.l[i-1])/2), br=D.v[i]?(D.v[i]/100000000)/(D.h[i]-D.l[i]||1):0; em[i]=br?dm/br:0; } const s=sma(em,p.period),o=new Int8Array(n); for(let i=p.period;i<n;i++)o[i]=sgn(s[i]); return o; } },
  { id:'vpt', name:'Volume Price Trend', category:'volume', defaults:{ema:21},
    compute(D,p){ const n=D.n,vpt=new Float64Array(n); for(let i=1;i<n;i++)vpt[i]=vpt[i-1]+D.v[i]*(D.c[i-1]?(D.c[i]-D.c[i-1])/D.c[i-1]:0); const e=ema(vpt,p.ema),o=new Int8Array(n); for(let i=p.ema;i<n;i++)o[i]=sgn(vpt[i]-e[i]); return o; } },
  { id:'klinger', name:'Klinger Oscillator', category:'volume', defaults:{fast:34, slow:55, signal:13},
    compute(D,p){ const n=D.n,vf=new Float64Array(n); let trend=0,prevHLC=0; for(let i=1;i<n;i++){ const hlc=D.h[i]+D.l[i]+D.c[i]; const t= hlc>prevHLC?1:-1; prevHLC=hlc; trend=t; vf[i]=D.v[i]*trend; } const ef=ema(vf,p.fast),es=ema(vf,p.slow),ko=new Float64Array(n); for(let i=0;i<n;i++)ko[i]=ef[i]-es[i]; const sig=ema(ko,p.signal),o=new Int8Array(n); for(let i=p.slow+p.signal;i<n;i++)o[i]=sgn(ko[i]-sig[i]); return o; } },
  { id:'nvi', name:'Negative Volume Index', category:'volume', defaults:{ema:255},
    compute(D,p){ const n=D.n,nvi=new Float64Array(n); nvi[0]=1000; for(let i=1;i<n;i++){ nvi[i]= D.v[i]<D.v[i-1] ? nvi[i-1]*(1+(D.c[i-1]?(D.c[i]-D.c[i-1])/D.c[i-1]:0)) : nvi[i-1]; } const e=ema(nvi,p.ema),o=new Int8Array(n); for(let i=p.ema;i<n;i++)o[i]=sgn(nvi[i]-e[i]); return o; } },

  // ── presets & extra TREND ──
  { id:'golden_cross', name:'Golden/Death Cross (50/200)', category:'trend', defaults:{fast:50, slow:200},
    compute(D,p){ const f=sma(D.c,p.fast),s=sma(D.c,p.slow),o=new Int8Array(D.n); for(let i=p.slow-1;i<D.n;i++)o[i]=sgn(f[i]-s[i]); return o; } },
  { id:'ema_9_21', name:'EMA 9/21 Cross', category:'trend', defaults:{fast:9, slow:21},
    compute(D,p){ const f=ema(D.c,p.fast),s=ema(D.c,p.slow),o=new Int8Array(D.n); for(let i=p.slow;i<D.n;i++)o[i]=sgn(f[i]-s[i]); return o; } },
  { id:'ema_21_55', name:'EMA 21/55 Cross', category:'trend', defaults:{fast:21, slow:55},
    compute(D,p){ const f=ema(D.c,p.fast),s=ema(D.c,p.slow),o=new Int8Array(D.n); for(let i=p.slow;i<D.n;i++)o[i]=sgn(f[i]-s[i]); return o; } },
  { id:'zlema', name:'Zero-Lag EMA Slope', category:'trend', defaults:{period:21},
    compute(D,p){ const n=D.n,lag=Math.floor((p.period-1)/2),adj=new Float64Array(n); for(let i=0;i<n;i++)adj[i]=2*D.c[i]-D.c[Math.max(0,i-lag)]; const z=ema(adj,p.period),o=new Int8Array(n); for(let i=p.period;i<n;i++)o[i]=sgn(z[i]-z[i-1]); return o; } },
  { id:'alma', name:'ALMA Slope', category:'trend', defaults:{period:21},
    compute(D,p){ const n=D.n,m=Math.floor(0.85*(p.period-1)),s=p.period/6,o=new Int8Array(n),al=new Float64Array(n); const w=new Float64Array(p.period); let ws=0; for(let k=0;k<p.period;k++){ w[k]=Math.exp(-((k-m)*(k-m))/(2*s*s)); ws+=w[k]; } for(let i=p.period-1;i<n;i++){ let sum=0; for(let k=0;k<p.period;k++)sum+=D.c[i-p.period+1+k]*w[k]; al[i]=sum/ws; } for(let i=p.period;i<n;i++)o[i]=sgn(al[i]-al[i-1]); return o; } },
  { id:'t3', name:'T3 Slope', category:'trend', defaults:{period:10, a:0.7},
    compute(D,p){ const a=p.a,c1=-a*a*a,c2=3*a*a+3*a*a*a,c3=-6*a*a-3*a-3*a*a*a,c4=1+3*a+a*a*a+3*a*a; const e1=ema(D.c,p.period),e2=ema(e1,p.period),e3=ema(e2,p.period),e4=ema(e3,p.period),e5=ema(e4,p.period),e6=ema(e5,p.period),n=D.n,t=new Float64Array(n); for(let i=0;i<n;i++)t[i]=c1*e6[i]+c2*e5[i]+c3*e4[i]+c4*e3[i]; const o=new Int8Array(n); for(let i=p.period*3;i<n;i++)o[i]=sgn(t[i]-t[i-1]); return o; } },
  { id:'vidya', name:'VIDYA (CMO-weighted)', category:'trend', defaults:{period:14, cmo:9},
    compute(D,p){ const cm=cmoArr(D.c,p.cmo),n=D.n,sc=2/(p.period+1),v=new Float64Array(n); v[0]=D.c[0]; for(let i=1;i<n;i++){ const k=sc*Math.abs(cm[i])/100; v[i]=D.c[i]*k+v[i-1]*(1-k); } const o=new Int8Array(n); for(let i=p.cmo+1;i<n;i++)o[i]=sgn(D.c[i]-v[i]); return o; } },
  { id:'mcginley', name:'McGinley Dynamic', category:'trend', defaults:{period:14},
    compute(D,p){ const n=D.n,md=new Float64Array(n); md[0]=D.c[0]; for(let i=1;i<n;i++){ const prev=md[i-1]||D.c[i]; const ratio=prev?D.c[i]/prev:1; md[i]=prev+(D.c[i]-prev)/(p.period*Math.pow(ratio,4)||1); } const o=new Int8Array(n); for(let i=p.period;i<n;i++)o[i]=sgn(D.c[i]-md[i]); return o; } },
  { id:'gann_hilo', name:'Gann HiLo Activator', category:'trend', defaults:{period:10},
    compute(D,p){ const sh=sma(D.h,p.period),sl=sma(D.l,p.period),n=D.n,o=new Int8Array(n); let dir=1; for(let i=p.period;i<n;i++){ if(D.c[i]>sh[i-1])dir=1; else if(D.c[i]<sl[i-1])dir=-1; o[i]=dir; } return o; } },
  { id:'ttm_trend', name:'TTM Trend', category:'trend', defaults:{period:6},
    compute(D,p){ const n=D.n,o=new Int8Array(n); for(let i=p.period;i<n;i++){ let s=0; for(let j=i-p.period+1;j<=i;j++)s+=(D.h[j]+D.l[j])/2; const avg=s/p.period; o[i]=sgn(D.c[i]-avg); } return o; } },

  // ── presets & extra MOMENTUM ──
  { id:'rsi_2', name:'RSI-2 (Connors)', category:'momentum', defaults:{period:2, low:10, high:90},
    compute(D,p){ const r=rsiArr(D.c,p.period),o=new Int8Array(D.n); for(let i=p.period;i<D.n;i++)o[i]= r[i]<p.low?1: r[i]>p.high?-1:0; return o; } },
  { id:'rsi_21', name:'RSI-21 (Swing)', category:'momentum', defaults:{period:21, low:40, high:60},
    compute(D,p){ const r=rsiArr(D.c,p.period),o=new Int8Array(D.n); for(let i=p.period;i<D.n;i++)o[i]= r[i]<p.low?1: r[i]>p.high?-1:0; return o; } },
  { id:'rsi_ema_cross', name:'RSI vs EMA Cross', category:'momentum', defaults:{period:14, ema:9},
    compute(D,p){ const r=rsiArr(D.c,p.period),e=ema(r,p.ema),o=new Int8Array(D.n); for(let i=p.period+p.ema;i<D.n;i++)o[i]=sgn(r[i]-e[i]); return o; } },
  { id:'macd_hist', name:'MACD Histogram Slope', category:'momentum', defaults:{fast:12, slow:26, signal:9},
    compute(D,p){ const ef=ema(D.c,p.fast),es=ema(D.c,p.slow),n=D.n,line=new Float64Array(n); for(let i=0;i<n;i++)line[i]=ef[i]-es[i]; const sig=ema(line,p.signal),h=new Float64Array(n); for(let i=0;i<n;i++)h[i]=line[i]-sig[i]; const o=new Int8Array(n); for(let i=p.slow+p.signal+1;i<n;i++)o[i]=sgn(h[i]-h[i-1]); return o; } },
  { id:'dmi_cross', name:'DI Cross (no filter)', category:'momentum', defaults:{period:14},
    compute(D,p){ const {pdi,ndi}=adxArr(D.h,D.l,D.c,p.period),o=new Int8Array(D.n); for(let i=p.period;i<D.n;i++)o[i]=sgn(pdi[i]-ndi[i]); return o; } },
  { id:'pmo', name:'Price Momentum Oscillator', category:'momentum', defaults:{s1:35, s2:20, signal:10},
    compute(D,p){ const n=D.n,roc=new Float64Array(n); for(let i=1;i<n;i++)roc[i]=D.c[i-1]?100*(D.c[i]-D.c[i-1])/D.c[i-1]:0; const sm1=ema(roc,p.s1),pmo=new Float64Array(n); for(let i=0;i<n;i++)pmo[i]=10*sm1[i]; const sm=ema(pmo,p.s2),sig=ema(sm,p.signal),o=new Int8Array(n); for(let i=p.s1+p.s2+p.signal;i<n;i++)o[i]=sgn(sm[i]-sig[i]); return o; } },
  { id:'smi', name:'Stochastic Momentum Index', category:'momentum', defaults:{period:14, smooth:3, low:-40, high:40},
    compute(D,p){ const n=D.n,hh=rollMax(D.h,p.period),ll=rollMin(D.l,p.period),m=new Float64Array(n),d=new Float64Array(n); for(let i=p.period-1;i<n;i++){ const md=(hh[i]+ll[i])/2; m[i]=D.c[i]-md; d[i]=hh[i]-ll[i]; } const em=ema(ema(m,p.smooth),p.smooth),ed=ema(ema(d,p.smooth),p.smooth),o=new Int8Array(n); for(let i=p.period+2*p.smooth;i<n;i++){ const smi=ed[i]?100*em[i]/(ed[i]/2):0; o[i]= smi<p.low?1: smi>p.high?-1:0; } return o; } },
  { id:'stc', name:'Schaff Trend Cycle', category:'momentum', defaults:{fast:23, slow:50, cycle:10},
    compute(D,p){ const ef=ema(D.c,p.fast),es=ema(D.c,p.slow),n=D.n,macd=new Float64Array(n); for(let i=0;i<n;i++)macd[i]=ef[i]-es[i]; const mn=rollMin(macd,p.cycle),mx=rollMax(macd,p.cycle),k=new Float64Array(n); for(let i=p.cycle-1;i<n;i++)k[i]=(mx[i]-mn[i])?100*(macd[i]-mn[i])/(mx[i]-mn[i]):0; const d=ema(k,3),o=new Int8Array(n); for(let i=p.slow+p.cycle;i<n;i++)o[i]= d[i]>25&&d[i]>d[i-1]?1: d[i]<75&&d[i]<d[i-1]?-1:0; return o; } },
  { id:'qqe', name:'QQE (smoothed RSI)', category:'momentum', defaults:{period:14, smooth:5},
    compute(D,p){ const r=rsiArr(D.c,p.period),sr=ema(r,p.smooth),o=new Int8Array(D.n); for(let i=p.period+p.smooth;i<D.n;i++)o[i]=sgn(sr[i]-50); return o; } },

  // ── presets & extra VOLATILITY ──
  { id:'keltner_squeeze', name:'Keltner/BB Squeeze', category:'volatility', defaults:{period:20, bbMult:2, kcMult:1.5},
    compute(D,p){ const m=sma(D.c,p.period),sd=stdev(D.c,p.period),at=atrArr(D.h,D.l,D.c,p.period),n=D.n,o=new Int8Array(n); for(let i=p.period;i<n;i++){ const bbUp=m[i]+p.bbMult*sd[i],bbLo=m[i]-p.bbMult*sd[i],kcUp=m[i]+p.kcMult*at[i],kcLo=m[i]-p.kcMult*at[i]; const squeeze= bbUp<kcUp&&bbLo>kcLo; if(!squeeze) o[i]=sgn(D.c[i]-m[i]); else o[i]=0; } return o; } },
  { id:'donchian_mid', name:'Donchian Midline', category:'volatility', defaults:{period:20},
    compute(D,p){ const hh=rollMax(D.h,p.period),ll=rollMin(D.l,p.period),o=new Int8Array(D.n); for(let i=p.period-1;i<D.n;i++)o[i]=sgn(D.c[i]-(hh[i]+ll[i])/2); return o; } },
  { id:'rvi_vol', name:'Relative Volatility Index', category:'volatility', defaults:{period:14, low:40, high:60},
    compute(D,p){ const n=D.n,sd=stdev(D.c,p.period),u=new Float64Array(n),dn=new Float64Array(n); for(let i=1;i<n;i++){ if(D.c[i]>D.c[i-1])u[i]=sd[i]; else if(D.c[i]<D.c[i-1])dn[i]=sd[i]; } const eu=ema(u,p.period),ed=ema(dn,p.period),o=new Int8Array(n); for(let i=2*p.period;i<n;i++){ const rvi=(eu[i]+ed[i])?100*eu[i]/(eu[i]+ed[i]):50; o[i]= rvi<p.low?-1: rvi>p.high?1:0; } return o; } },

  // ── presets & extra VOLUME ──
  { id:'pvo', name:'Percentage Volume Oscillator', category:'volume', defaults:{fast:12, slow:26, signal:9},
    compute(D,p){ const ef=ema(D.v,p.fast),es=ema(D.v,p.slow),n=D.n,pvo=new Float64Array(n); for(let i=0;i<n;i++)pvo[i]=es[i]?100*(ef[i]-es[i])/es[i]:0; const sig=ema(pvo,p.signal),o=new Int8Array(n); for(let i=p.slow+p.signal;i<n;i++) o[i]= pvo[i]>sig[i] ? sgn(D.c[i]-D.o[i]) : 0; return o; } },
  { id:'volume_osc', name:'Volume Oscillator', category:'volume', defaults:{fast:5, slow:20},
    compute(D,p){ const f=sma(D.v,p.fast),s=sma(D.v,p.slow),n=D.n,o=new Int8Array(n); for(let i=p.slow-1;i<n;i++) o[i]= f[i]>s[i] ? sgn(D.c[i]-D.o[i]) : 0; return o; } },
  { id:'mfi_cross', name:'MFI Midline (50)', category:'volume', defaults:{period:14},
    compute(D,p){ const n=D.n,pf=new Float64Array(n),nf=new Float64Array(n); for(let i=1;i<n;i++){ const tp=(D.h[i]+D.l[i]+D.c[i])/3, tpp=(D.h[i-1]+D.l[i-1]+D.c[i-1])/3, mf=tp*D.v[i]; if(tp>tpp)pf[i]=mf; else if(tp<tpp)nf[i]=mf; } const o=new Int8Array(n); for(let i=p.period;i<n;i++){ let sp=0,sn=0; for(let j=i-p.period+1;j<=i;j++){sp+=pf[j];sn+=nf[j];} const mr=sn===0?100:100-100/(1+sp/sn); o[i]=sgn(mr-50); } return o; } },

  // ── final set → 100+ ──
  { id:'heikin_ashi', name:'Heikin Ashi Trend', category:'trend', defaults:{},
    compute(D,p){ const n=D.n,haC=new Float64Array(n),haO=new Float64Array(n),o=new Int8Array(n); for(let i=0;i<n;i++){ haC[i]=(D.o[i]+D.h[i]+D.l[i]+D.c[i])/4; haO[i]= i===0?(D.o[i]+D.c[i])/2:(haO[i-1]+haC[i-1])/2; o[i]=sgn(haC[i]-haO[i]); } return o; } },
  { id:'alligator', name:'Williams Alligator', category:'trend', defaults:{jaw:13, teeth:8, lips:5},
    compute(D,p){ const md=new Float64Array(D.n); for(let i=0;i<D.n;i++)md[i]=(D.h[i]+D.l[i])/2; const smma=(src,per)=>{ const a=new Float64Array(src.length); a[per-1]=0; let s=0; for(let i=0;i<per;i++)s+=src[i]; a[per-1]=s/per; for(let i=per;i<src.length;i++)a[i]=(a[i-1]*(per-1)+src[i])/per; return a; }; const j=smma(md,p.jaw),t=smma(md,p.teeth),l=smma(md,p.lips),n=D.n,o=new Int8Array(n); for(let i=p.jaw;i<n;i++){ if(l[i]>t[i]&&t[i]>j[i])o[i]=1; else if(l[i]<t[i]&&t[i]<j[i])o[i]=-1; else o[i]=0; } return o; } },
  { id:'demarker', name:'DeMarker', category:'momentum', defaults:{period:14, low:0.3, high:0.7},
    compute(D,p){ const n=D.n,dmax=new Float64Array(n),dmin=new Float64Array(n); for(let i=1;i<n;i++){ dmax[i]=D.h[i]>D.h[i-1]?D.h[i]-D.h[i-1]:0; dmin[i]=D.l[i]<D.l[i-1]?D.l[i-1]-D.l[i]:0; } const sx=sma(dmax,p.period),sn=sma(dmin,p.period),o=new Int8Array(n); for(let i=p.period;i<n;i++){ const dem=(sx[i]+sn[i])?sx[i]/(sx[i]+sn[i]):0.5; o[i]= dem<p.low?1: dem>p.high?-1:0; } return o; } },
  { id:'stochrsi_cross', name:'Stoch RSI %K/%D Cross', category:'momentum', defaults:{period:14, smooth:3},
    compute(D,p){ const r=rsiArr(D.c,p.period),hh=rollMax(r,p.period),ll=rollMin(r,p.period),n=D.n,kr=new Float64Array(n); for(let i=2*p.period;i<n;i++)kr[i]=hh[i]===ll[i]?50:100*(r[i]-ll[i])/(hh[i]-ll[i]); const k=sma(kr,p.smooth),d=sma(k,p.smooth),o=new Int8Array(n); for(let i=2*p.period+2*p.smooth;i<n;i++)o[i]=sgn(k[i]-d[i]); return o; } },
  { id:'zscore', name:'Z-Score Reversion', category:'volatility', defaults:{period:20, thresh:2},
    compute(D,p){ const m=sma(D.c,p.period),sd=stdev(D.c,p.period),o=new Int8Array(D.n); for(let i=p.period-1;i<D.n;i++){ const z=sd[i]?(D.c[i]-m[i])/sd[i]:0; o[i]= z<-p.thresh?1: z>p.thresh?-1:0; } return o; } },
  { id:'zscore_trend', name:'Z-Score Breakout', category:'volatility', defaults:{period:20, thresh:1},
    compute(D,p){ const m=sma(D.c,p.period),sd=stdev(D.c,p.period),o=new Int8Array(D.n); for(let i=p.period-1;i<D.n;i++){ const z=sd[i]?(D.c[i]-m[i])/sd[i]:0; o[i]= z>p.thresh?1: z<-p.thresh?-1:0; } return o; } },
  { id:'obv_slope', name:'OBV Slope', category:'volume', defaults:{lookback:5},
    compute(D,p){ const n=D.n,obv=new Float64Array(n); for(let i=1;i<n;i++)obv[i]=obv[i-1]+(D.c[i]>D.c[i-1]?D.v[i]:D.c[i]<D.c[i-1]?-D.v[i]:0); const o=new Int8Array(n); for(let i=p.lookback;i<n;i++)o[i]=sgn(obv[i]-obv[i-p.lookback]); return o; } },
  { id:'vwap_bands', name:'VWAP Band Reversion', category:'volume', defaults:{period:48, mult:1.5},
    compute(D,p){ const n=D.n,o=new Int8Array(n); for(let i=p.period-1;i<n;i++){ let pv=0,vv=0; for(let j=i-p.period+1;j<=i;j++){ const tp=(D.h[j]+D.l[j]+D.c[j])/3; pv+=tp*D.v[j]; vv+=D.v[j]; } const vw=vv?pv/vv:D.c[i]; let sq=0; for(let j=i-p.period+1;j<=i;j++){ const tp=(D.h[j]+D.l[j]+D.c[j])/3; sq+=(tp-vw)*(tp-vw); } const sd=Math.sqrt(sq/p.period); o[i]= D.c[i]<vw-p.mult*sd?1: D.c[i]>vw+p.mult*sd?-1:0; } return o; } },
  { id:'frama', name:'FRAMA Trend', category:'trend', defaults:{period:16},
    compute(D,p){ const n=D.n,per=p.period%2?p.period+1:p.period,half=per/2,fr=new Float64Array(n); fr[per-1]=D.c[per-1]; for(let i=per-1;i<n;i++){ let h1=-Infinity,l1=Infinity,h2=-Infinity,l2=Infinity,h3=-Infinity,l3=Infinity; for(let k=0;k<half;k++){ const a=D.h[i-k],b=D.l[i-k]; if(a>h1)h1=a; if(b<l1)l1=b; } for(let k=half;k<per;k++){ const a=D.h[i-k],b=D.l[i-k]; if(a>h2)h2=a; if(b<l2)l2=b; } for(let k=0;k<per;k++){ const a=D.h[i-k],b=D.l[i-k]; if(a>h3)h3=a; if(b<l3)l3=b; } const n1=(h1-l1)/half,n2=(h2-l2)/half,n3=(h3-l3)/per; let dim=1; if(n1>0&&n2>0&&n3>0)dim=(Math.log(n1+n2)-Math.log(n3))/Math.log(2); const al=Math.max(0.01,Math.min(1,Math.exp(-4.6*(dim-1)))); fr[i]= i>per-1?(al*D.c[i]+(1-al)*fr[i-1]):D.c[i]; } const o=new Int8Array(n); for(let i=per;i<n;i++)o[i]=sgn(D.c[i]-fr[i]); return o; } },
  { id:'trix_signal', name:'TRIX Signal Cross', category:'momentum', defaults:{period:15, signal:9},
    compute(D,p){ const e1=ema(D.c,p.period),e2=ema(e1,p.period),e3=ema(e2,p.period),n=D.n,tr=new Float64Array(n); for(let i=1;i<n;i++)tr[i]=e3[i-1]!==0?10000*(e3[i]-e3[i-1])/e3[i-1]:0; const sig=ema(tr,p.signal),o=new Int8Array(n); for(let i=3*p.period+p.signal;i<n;i++)o[i]=sgn(tr[i]-sig[i]); return o; } },
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
  // Partial-exit LADDER: each leg fires once and closes size_pct of the ORIGINAL
  // position; the remainder rides on to later legs. Models "TP 30%, then 10% of
  // the rest, SL 20% then hold, ..." — any sequenced partial exit the user wants.
  const ladder = (strat.exit_rules || []).map((r, i) => ({
    idx: i, type: (r.type || 'TP').toUpperCase(),
    pct:  Math.abs(parseFloat(r.price_pct) || 0) / 100,                     // trigger distance from entry
    size: Math.min(1, Math.max(0, (parseFloat(r.size_pct) ?? 100) / 100)), // fraction of ORIGINAL to close
  })).filter(r => r.pct > 0 && r.size > 0 && (r.type === 'TP' || r.type === 'SL'));
  let eq = opts.cap ?? 10000, peak = eq, mdd = 0, wins = 0, n = 0;
  const trades = []; let pos = null;

  function closeChunk(exitPx, frac) {                  // frac = fraction of ORIGINAL notional
    const qty = pos.notionalOrig * frac;
    const xp  = pos.dir === 1 ? exitPx * (1 - slip) : exitPx * (1 + slip);
    const ret = pos.dir === 1 ? (xp - pos.entry) / pos.entry : (pos.entry - xp) / pos.entry;
    const pnl = ret * qty - qty * FEE;                 // exit fee on the closed chunk
    eq += pnl; if (eq > peak) peak = eq; mdd = Math.max(mdd, (peak - eq) / peak);
    pos.realized += pnl; pos.remaining -= frac;
  }
  function finishTrade() { if (pos.realized > 0) wins++; n++; trades.push({ dir: pos.dir, pnl: pos.realized }); pos = null; }

  for (let i = 1; i < D.n; i++) {
    if (pos) {
      const fav = pos.dir === 1 ? (D.h[i] - pos.entry) / pos.entry : (pos.entry - D.l[i]) / pos.entry; // favorable extreme this bar
      const adv = pos.dir === 1 ? (pos.entry - D.l[i]) / pos.entry : (D.h[i] - pos.entry) / pos.entry; // adverse extreme this bar
      // SL legs first (conservative), then TP legs, each in the user's order
      const order = ladder.filter(r => r.type === 'SL').concat(ladder.filter(r => r.type === 'TP'));
      for (const r of order) {
        if (pos.fired.has(r.idx) || pos.remaining <= 1e-9) continue;
        let trigPx = null;
        if (r.type === 'SL' && adv >= r.pct)      trigPx = pos.dir === 1 ? pos.entry * (1 - r.pct) : pos.entry * (1 + r.pct);
        else if (r.type === 'TP' && fav >= r.pct) trigPx = pos.dir === 1 ? pos.entry * (1 + r.pct) : pos.entry * (1 - r.pct);
        if (trigPx != null) { closeChunk(trigPx, Math.min(r.size, pos.remaining)); pos.fired.add(r.idx); }
      }
      if (pos && pos.remaining <= 1e-9) finishTrade();
      else if (pos && final[i] === -pos.dir) { closeChunk(D.c[i], pos.remaining); finishTrade(); } // reverse signal closes the rest
    }
    if (!pos && final[i] !== 0) {                       // enter on a fresh signal
      const entry = D.c[i] * (final[i] === 1 ? 1 + slip : 1 - slip);
      const notionalOrig = eq * sizePct * lev;
      eq -= notionalOrig * FEE;                         // entry fee
      pos = { dir: final[i], entry, notionalOrig, remaining: 1.0, realized: 0, fired: new Set() };
    }
  }
  if (pos && pos.remaining > 1e-9) { closeChunk(D.c[D.n - 1], pos.remaining); finishTrade(); } // mark-to-market any open remainder at EOD so stats are complete
  const yrs = D.n > 1 ? (D.t[D.n - 1] - D.t[0]) / (365.25 * 24 * 3600 * 1000) : 0;
  const cap = opts.cap ?? 10000, totRet = (eq / cap - 1) * 100;
  return {
    trades: n, winRate: n ? wins / n * 100 : 0, totalReturn: totRet,
    annualReturn: yrs > 0 && eq > 0 ? ((eq / cap) ** (1 / yrs) - 1) * 100 : 0,
    maxDrawdown: mdd * 100, finalEquity: eq, years: yrs, openPosition: !!pos,
  };
}

// ── exports (ESM for worker/browser-module, CommonJS for node tests) ────────
const ENGINE = { prep, listIndicators, computeSignals, resolveBar, evaluateStrategy, validateStrategy, backtestStrategy, INDICATORS, REGISTRY };
if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE;
if (typeof window !== 'undefined') window.StrategyEngine = ENGINE;
export default ENGINE;
