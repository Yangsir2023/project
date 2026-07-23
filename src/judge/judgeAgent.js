/**
 * judgeAgent.js — VLM-as-a-Judge for Bifrost generated websites
 * =================================================================
 * Dual-track evaluation (supports RQ1 "trust / co-creation"):
 *   - Human track : 5-point Likert questionnaire (HITL, unchanged)
 *   - AI track    : this module scores the generated page with a VLM
 *
 * Design principles (minimal & safe):
 *   1. NEVER throws to the caller. Every failure degrades gracefully:
 *        - no `html2canvas`  → text-only scoring (judge from HTML markup)
 *        - no API key / net  → neutral scores (overall = 3) with ok:false
 *   2. Reuses the existing Gemini endpoint — no new API, no new secret.
 *   3. Structured scores are written to a local telemetry sink so they can
 *      later be exported to CSV and correlated with the human Likert scores.
 *   4. Zero-intrusion: callers trigger it fire-and-forget (`.catch()`),
 *      so it never blocks or changes the main generation / deploy flow.
 *
 * Opt-in only: App.jsx triggers it behind `localStorage.bifrost_judge === '1'`.
 */

/* ────────────────────────────────────────────────────────────────────
   Local telemetry sink (self-contained, no external dependency)
   Appends every judge event to localStorage['bifrost_user_actions'] as a
   JSON array. Mirrors the project's action-log convention; the array can be
   exported to CSV for "human Likert score vs AI overall score" correlation.
   ──────────────────────────────────────────────────────────────────── */
const TELEMETRY_KEY = 'bifrost_user_actions';

export function logAction(type, detail) {
  try {
    const raw = localStorage.getItem(TELEMETRY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) throw new Error('corrupt telemetry');
    arr.push({
      type,
      detail,
      ts: new Date().toISOString(),
    });
    // keep at most the latest 500 events to bound storage
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(arr.slice(-500)));
  } catch (e) {
    // telemetry must never break the app
    console.warn('[Judge] telemetry write skipped:', e && e.message);
  }
}

/* ────────────────────────────────────────────────────────────────────
   HTML → PNG screenshot (best-effort, degrades to null)
   Uses html2canvas loaded via dynamic import so the module works even when
   the dependency is absent. Renders the generated HTML inside a detached,
   off-screen iframe (srcdoc) to isolate its styles from the host app.
   ──────────────────────────────────────────────────────────────────── */
export async function renderHtmlToPng(htmlString) {
  let iframe = null;
  try {
    const html2canvas = (await import(/* @vite-ignore */ 'html2canvas')).default
      || (await import(/* @vite-ignore */ 'html2canvas'));
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;left:-10000px;top:0;width:1000px;height:0;overflow:hidden;';
    iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-same-origin');
    iframe.style.cssText = 'width:1000px;height:1400px;border:0;background:#fff;';
    host.appendChild(iframe);
    document.body.appendChild(host);

    iframe.srcdoc = htmlString;
    // wait for the iframe document to load (with a safety timeout)
    await new Promise((resolve) => {
      iframe.onload = resolve;
      setTimeout(resolve, 600);
    });

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const target = doc && (doc.documentElement || doc.body);
    if (!target) throw new Error('iframe document unavailable');

    const canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
      width: 1000,
      windowWidth: 1000,
      logging: false,
      scale: 1,
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.warn('[Judge] screenshot unavailable, falling back to text:', e && e.message);
    return null;
  } finally {
    if (iframe && iframe.parentNode) iframe.parentNode.remove();
  }
}

/* ────────────────────────────────────────────────────────────────────
   VLM prompt + calls (REST and SDK paths both supported)
   ──────────────────────────────────────────────────────────────────── */
const JUDGE_MODEL = 'gemini-2.5-flash';

const JUDGE_PROMPT = `You are a senior UI/UX reviewer. Score the website on 5 dimensions, each as an integer 1–5 (5 = best):
- layout    : structural clarity, alignment and spacing
- aesthetics: visual polish, colour harmony, professionalism
- overlap   : absence of element overlap / clipping (5 = none)
- contrast  : text/background readability
- overall   : general quality
Respond ONLY with strict JSON, no markdown, e.g.:
{"layout":4,"aesthetics":4,"overlap":5,"contrast":4,"overall":4}`;

async function callVLMWithImage(apiKey, pngDataUrl, htmlString) {
  const base64 = pngDataUrl ? pngDataUrl.split(',')[1] : null;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${JUDGE_MODEL}:generateContent?key=${apiKey}`;
  const text =
    JUDGE_PROMPT +
    (pngDataUrl
      ? ''
      : `\n\nNo screenshot available. Judge from this HTML markup instead:\n${htmlString.slice(0, 4000)}`);
  const parts = [{ text }];
  if (base64) parts.push({ inline_data: { mime_type: 'image/png', data: base64 } });
  const payload = {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.error?.message || `API ${resp.status}`);
  }
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callVLMWithSDK(model, pngDataUrl, htmlString) {
  // model: @google/generative-ai GenerativeModel with generateContent
  const base64 = pngDataUrl ? pngDataUrl.split(',')[1] : null;
  const text =
    JUDGE_PROMPT +
    (pngDataUrl
      ? ''
      : `\n\nNo screenshot available. Judge from this HTML markup instead:\n${htmlString.slice(0, 4000)}`);
  const parts = [{ text }];
  if (base64) parts.push({ inlineData: { mimeType: 'image/png', data: base64 } });
  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
  });
  return result.response.text();
}

/* ── Robust score parser: always returns 1–5 integers ── */
function parseScores(raw) {
  let ok = true;
  let error;
  let obj = {};
  try {
    let s = (raw || '').trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    const m = s.match(/\{[\s\S]*\}/);
    if (m) obj = JSON.parse(m[0]);
    else throw new Error('no JSON object found');
  } catch (e) {
    ok = false;
    error = e && e.message;
  }
  const clamp = (v) => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) return 3;
    return Math.min(5, Math.max(1, n));
  };
  const layout = clamp(obj.layout);
  const aesthetics = clamp(obj.aesthetics);
  const overlap = clamp(obj.overlap);
  const contrast = clamp(obj.contrast);
  const overall =
    obj.overall != null
      ? clamp(obj.overall)
      : clamp(Math.round((layout + aesthetics + overlap + contrast) / 4));
  return { layout, aesthetics, overlap, contrast, overall, ok, error };
}

/* ────────────────────────────────────────────────────────────────────
   Main entry
   judgeVisual(model, htmlString, opts) → Promise<{
     layout, aesthetics, overlap, contrast, overall,   // each 1–5 integer
     imageAvailable: boolean,                          // screenshot succeeded?
     ok: boolean, error?: string                       // ok:false => degraded
   }>
   opts:
     apiKey   : Gemini REST key (App.jsx real path, recommended)
     log      : write telemetry? (default true)
     screenshot: try screenshot first? (default true)
     meta     : extra fields merged into the telemetry record
   ──────────────────────────────────────────────────────────────────── */
export async function judgeVisual(model, htmlString, opts = {}) {
  const { apiKey = null, log = true, screenshot = true, meta = {} } = opts;
  const writeTelemetry = (record) => {
    if (log !== false) {
      try {
        logAction('VISUAL_JUDGE', { ...record, ...meta });
      } catch (_) {
        /* never break caller */
      }
    }
  };

  try {
    let imageAvailable = false;
    let png = null;
    if (screenshot) {
      png = await renderHtmlToPng(htmlString);
      imageAvailable = !!png;
    }

    let raw = '';
    if (model && typeof model.generateContent === 'function') {
      raw = await callVLMWithSDK(model, png, htmlString);
    } else if (apiKey) {
      raw = await callVLMWithImage(apiKey, png, htmlString);
    } else {
      // no model, no key → neutral offline score, still log the attempt
      const scores = { layout: 3, aesthetics: 3, overlap: 3, contrast: 3, overall: 3 };
      writeTelemetry({ ...scores, imageAvailable: false, ok: false, error: 'no-api-key' });
      return { ...scores, imageAvailable: false, ok: false, error: 'no-api-key' };
    }

    const scores = parseScores(raw);
    const result = { ...scores, imageAvailable, ok: scores.ok };
    writeTelemetry(result);
    return result;
  } catch (e) {
    const fallback = {
      layout: 3, aesthetics: 3, overlap: 3, contrast: 3, overall: 3,
      imageAvailable: false, ok: false, error: (e && e.message) || 'unknown',
    };
    writeTelemetry(fallback);
    return fallback;
  }
}

export default judgeVisual;
