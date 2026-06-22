/**
 * Deploy Service — 真实部署集成
 *
 * 支持多个部署目标：
 *   1. Vercel  — 生产级部署，需要 Token
 *   2. Netlify — 备用部署平台，需要 Token
 *   3. Local   — 本地服务器预览（Electron 环境）
 *   4. Download — 下载 HTML（始终可用的 fallback）
 */

/* ═══════════════════════════════════════════════════════
   部署目标定义
   ═══════════════════════════════════════════════════════ */

export const DEPLOY_TARGET = {
  VERCEL:   'vercel',
  NETLIFY:  'netlify',
  DOWNLOAD: 'download',
};

export const DEPLOY_STATUS = {
  IDLE:       'idle',
  PREPARING:  'preparing',
  UPLOADING:  'uploading',
  BUILDING:   'building',
  READY:      'ready',
  FAILED:     'failed',
};

/* ═══════════════════════════════════════════════════════
   Token 管理 (localStorage)
   ═══════════════════════════════════════════════════════ */

export function getDeployToken(target) {
  return localStorage.getItem(`bifrost_deploy_token_${target}`) || '';
}

export function setDeployToken(target, token) {
  localStorage.setItem(`bifrost_deploy_token_${target}`, token);
}

export function hasDeployToken(target) {
  return !!getDeployToken(target);
}

/* ═══════════════════════════════════════════════════════
   Vercel 部署
   ═══════════════════════════════════════════════════════ */

/**
 * 部署到 Vercel
 * @param {string} html - 完整的 HTML 内容
 * @param {string} token - Vercel API Token
 * @param {object} opts - { projectName, onProgress }
 * @returns {Promise<{url: string, deployId: string}>}
 */
export async function deployToVercel(html, token, opts = {}) {
  const { projectName = `bifrost-site-${Date.now()}`, onProgress } = opts;

  onProgress?.('preparing', 'Preparing deployment files...');

  // 生成唯一项目名
  const safeName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  const finalName = `${safeName}-${Math.random().toString(36).slice(2, 7)}`;

  onProgress?.('uploading', 'Uploading to Vercel...');

  // Vercel Deploy API v13
  const deployPayload = {
    name: finalName,
    files: [
      {
        file: 'index.html',
        data: html,
        encoding: 'utf8',
      },
    ],
    projectSettings: {
      framework: null,
    },
    target: 'production',
  };

  const resp = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(deployPayload),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    const message = errData.error?.message || `Vercel API error ${resp.status}`;

    if (resp.status === 401) throw new Error('Invalid Vercel token. Please check your API token in Settings.');
    if (resp.status === 403) throw new Error('Vercel token lacks deployment permissions. Ensure your token has "Deploy" scope.');
    if (resp.status === 429) throw new Error('Rate limited by Vercel. Please wait a moment and try again.');
    throw new Error(message);
  }

  const data = await resp.json();

  onProgress?.('building', `Building deployment: ${data.id}...`);

  // 轮询部署状态
  const deployUrl = await pollVercelDeployment(data.id, token, onProgress);

  return {
    url:      deployUrl,
    deployId: data.id,
    platform: 'vercel',
  };
}

/**
 * 轮询 Vercel 部署状态直到完成
 */
async function pollVercelDeployment(deployId, token, onProgress, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    await delay(2000);

    const resp = await fetch(`https://api.vercel.com/v13/deployments/${deployId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!resp.ok) continue;

    const data = await resp.json();
    const state = data.readyState || data.status;

    onProgress?.('building', `Deployment status: ${state} (${i + 1}/${maxAttempts})`);

    if (state === 'READY') {
      return `https://${data.url}`;
    }
    if (state === 'ERROR' || state === 'CANCELED') {
      throw new Error(`Deployment failed with state: ${state}`);
    }
  }

  throw new Error('Deployment timed out. Check Vercel dashboard for status.');
}

/* ═══════════════════════════════════════════════════════
   Netlify 部署
   ═══════════════════════════════════════════════════════ */

/**
 * 部署到 Netlify (Drag & Drop API)
 * @param {string} html
 * @param {string} token - Netlify Personal Access Token
 * @param {object} opts
 */
export async function deployToNetlify(html, token, opts = {}) {
  const { onProgress } = opts;

  onProgress?.('preparing', 'Preparing Netlify deployment...');

  // Step 1: 创建新 site
  const siteResp = await fetch('https://api.netlify.com/api/v1/sites', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ name: `bifrost-${Date.now()}` }),
  });

  if (!siteResp.ok) {
    const errData = await siteResp.json().catch(() => ({}));
    if (siteResp.status === 401) throw new Error('Invalid Netlify token.');
    throw new Error(errData.message || `Netlify API error ${siteResp.status}`);
  }

  const siteData = await siteResp.json();
  const siteId   = siteData.id;

  onProgress?.('uploading', `Uploading to Netlify site ${siteId}...`);

  // Step 2: 上传文件（使用 zip 或 raw file API）
  const htmlBytes = new TextEncoder().encode(html);
  const sha1      = await computeSHA1(html);

  const deployResp = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/zip',
    },
    body: await createSimpleZip('index.html', htmlBytes),
  });

  if (!deployResp.ok) {
    const errData = await deployResp.json().catch(() => ({}));
    throw new Error(errData.message || `Netlify deploy error ${deployResp.status}`);
  }

  const deployData = await deployResp.json();

  onProgress?.('ready', 'Netlify deployment complete!');

  return {
    url:      `https://${siteData.subdomain}.netlify.app`,
    deployId: deployData.id,
    platform: 'netlify',
  };
}

/* ═══════════════════════════════════════════════════════
   下载部署（始终可用）
   ═══════════════════════════════════════════════════════ */

export function deployAsDownload(html, filename = 'bifrost-site.html') {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    url:      `file://${filename}`,
    deployId: `local_${Date.now()}`,
    platform: 'download',
  };
}

/* ═══════════════════════════════════════════════════════
   统一部署入口
   ═══════════════════════════════════════════════════════ */

/**
 * 主部署函数 — 根据 target 自动选择部署方式
 * @param {string} html
 * @param {string} target - DEPLOY_TARGET.*
 * @param {object} opts - { onProgress, projectName }
 */
export async function deploy(html, target = DEPLOY_TARGET.DOWNLOAD, opts = {}) {
  const { onProgress } = opts;

  onProgress?.(DEPLOY_STATUS.PREPARING, 'Starting deployment...');

  try {
    let result;

    switch (target) {
      case DEPLOY_TARGET.VERCEL: {
        const token = getDeployToken(DEPLOY_TARGET.VERCEL);
        if (!token) throw new Error('Vercel token not set. Please add your Vercel API token in Settings.');
        result = await deployToVercel(html, token, opts);
        break;
      }

      case DEPLOY_TARGET.NETLIFY: {
        const token = getDeployToken(DEPLOY_TARGET.NETLIFY);
        if (!token) throw new Error('Netlify token not set. Please add your Netlify Personal Access Token in Settings.');
        result = await deployToNetlify(html, token, opts);
        break;
      }

      case DEPLOY_TARGET.DOWNLOAD:
      default:
        result = deployAsDownload(html, opts.filename);
        break;
    }

    onProgress?.(DEPLOY_STATUS.READY, 'Deployment complete!');

    // 保存部署记录到 localStorage
    saveDeployRecord(result);

    return result;

  } catch (err) {
    onProgress?.(DEPLOY_STATUS.FAILED, `Deploy failed: ${err.message}`);
    throw err;
  }
}

/* ═══════════════════════════════════════════════════════
   部署历史记录
   ═══════════════════════════════════════════════════════ */

export function saveDeployRecord(result) {
  const records = getDeployHistory();
  records.unshift({
    ...result,
    deployedAt: Date.now(),
    label: result.url,
  });
  // 只保留最近 10 条
  localStorage.setItem('bifrost_deploy_history', JSON.stringify(records.slice(0, 10)));
}

export function getDeployHistory() {
  try {
    return JSON.parse(localStorage.getItem('bifrost_deploy_history') || '[]');
  } catch {
    return [];
  }
}

export function clearDeployHistory() {
  localStorage.removeItem('bifrost_deploy_history');
}

/* ═══════════════════════════════════════════════════════
   工具函数
   ═══════════════════════════════════════════════════════ */

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function computeSHA1(text) {
  const data    = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 创建最简单的 ZIP 文件（单文件）
 * 使用 CompressionStream（Chrome 80+ / Electron 支持）
 * 如果不支持，退而返回原始字节
 */
async function createSimpleZip(filename, content) {
  // 构造简单的 ZIP Local File Header
  const encoder     = new TextEncoder();
  const nameBytes   = encoder.encode(filename);
  const contentLen  = content.length;

  // Local file header signature
  const header = new Uint8Array([
    0x50, 0x4B, 0x03, 0x04,  // signature
    0x14, 0x00,               // version needed (2.0)
    0x00, 0x00,               // flags
    0x00, 0x00,               // compression (stored)
    0x00, 0x00, 0x00, 0x00,   // mod time, mod date
    0x00, 0x00, 0x00, 0x00,   // CRC-32 (0 for now)
    ...i32le(contentLen),     // compressed size
    ...i32le(contentLen),     // uncompressed size
    ...i16le(nameBytes.length), // file name length
    0x00, 0x00,               // extra field length
    ...nameBytes,             // file name
  ]);

  const buf = new Uint8Array(header.length + contentLen);
  buf.set(header, 0);
  buf.set(content, header.length);

  return buf.buffer;
}

function i16le(n) { return [n & 0xff, (n >> 8) & 0xff]; }
function i32le(n) { return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]; }
