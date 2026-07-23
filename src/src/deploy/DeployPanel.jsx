/**
 * DeployPanel — 部署配置与执行面板
 *
 * 支持：
 *   - Vercel 一键部署（需要 Token）
 *   - Netlify 部署
 *   - 下载 HTML（始终可用）
 *   - 部署历史查看
 */

import React, { useState, useCallback } from 'react';
import {
  DEPLOY_TARGET, DEPLOY_STATUS,
  deploy, getDeployToken, setDeployToken, hasDeployToken,
  getDeployHistory, clearDeployHistory,
} from './deployService.js';

export default function DeployPanel({
  html,
  onDeployComplete,
  isDeploying,
  setIsDeploying,
}) {
  const [target, setTarget] = useState(DEPLOY_TARGET.DOWNLOAD);
  const [vercelToken, setVercelToken] = useState(getDeployToken(DEPLOY_TARGET.VERCEL));
  const [netlifyToken, setNetlifyToken] = useState(getDeployToken(DEPLOY_TARGET.NETLIFY));
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [deployStatus, setDeployStatus] = useState(DEPLOY_STATUS.IDLE);
  const [deployLog, setDeployLog] = useState([]);
  const [deployResult, setDeployResult] = useState(null);
  const [history, setHistory] = useState(getDeployHistory);
  const [projectName, setProjectName] = useState('my-bifrost-site');

  const log = useCallback((status, msg) => {
    setDeployStatus(status);
    setDeployLog(prev => [...prev, { status, msg, time: new Date().toLocaleTimeString() }]);
  }, []);

  const handleDeploy = useCallback(async () => {
    if (!html) return;

    // 保存 Token
    if (target === DEPLOY_TARGET.VERCEL && vercelToken) {
      setDeployToken(DEPLOY_TARGET.VERCEL, vercelToken);
    }
    if (target === DEPLOY_TARGET.NETLIFY && netlifyToken) {
      setDeployToken(DEPLOY_TARGET.NETLIFY, netlifyToken);
    }

    setDeployLog([]);
    setDeployResult(null);
    setIsDeploying?.(true);

    try {
      const result = await deploy(html, target, {
        projectName,
        onProgress: (status, msg) => log(status, msg),
      });

      setDeployResult(result);
      setHistory(getDeployHistory());
      onDeployComplete?.(result);
    } catch (err) {
      log(DEPLOY_STATUS.FAILED, err.message);
    } finally {
      setIsDeploying?.(false);
    }
  }, [html, target, vercelToken, netlifyToken, projectName, log, onDeployComplete, setIsDeploying]);

  const handleCopy = useCallback((text) => {
    navigator.clipboard?.writeText(text);
  }, []);

  const targetConfigs = [
    {
      id:    DEPLOY_TARGET.DOWNLOAD,
      label: 'Download HTML',
      icon:  '⬇',
      desc:  'Always available. Download as a single HTML file.',
      color: '#64748b',
      needsToken: false,
    },
    {
      id:    DEPLOY_TARGET.VERCEL,
      label: 'Vercel',
      icon:  '▲',
      desc:  'Deploy to a live URL on Vercel. Requires API token.',
      color: '#ffffff',
      needsToken: true,
      tokenKey:   DEPLOY_TARGET.VERCEL,
      tokenLabel: 'Vercel API Token',
      tokenHint:  'Get from vercel.com/account/tokens',
      tokenValue: vercelToken,
      setToken:   setVercelToken,
    },
    {
      id:    DEPLOY_TARGET.NETLIFY,
      label: 'Netlify',
      icon:  '⬡',
      desc:  'Deploy to Netlify. Requires Personal Access Token.',
      color: '#00ad9f',
      needsToken: true,
      tokenKey:   DEPLOY_TARGET.NETLIFY,
      tokenLabel: 'Netlify Access Token',
      tokenHint:  'Get from app.netlify.com/user/applications',
      tokenValue: netlifyToken,
      setToken:   setNetlifyToken,
    },
  ];

  const selectedConfig = targetConfigs.find(c => c.id === target);

  return (
    <div className="deploy-panel">
      <div className="deploy-panel-header">
        <span className="deploy-panel-icon">🚀</span>
        <span className="deploy-panel-title">Deploy Your Website</span>
      </div>

      {/* ── Target Selection ─────────────────────────── */}
      <div className="deploy-targets">
        {targetConfigs.map(cfg => (
          <button
            key={cfg.id}
            className={`deploy-target-btn ${target === cfg.id ? 'is-active' : ''}`}
            onClick={() => { setTarget(cfg.id); setDeployLog([]); setDeployResult(null); }}
            style={target === cfg.id ? { borderColor: cfg.color } : {}}
          >
            <span className="deploy-target-icon" style={{ color: cfg.color }}>{cfg.icon}</span>
            <span className="deploy-target-label">{cfg.label}</span>
            {cfg.needsToken && hasDeployToken(cfg.id) && (
              <span className="deploy-target-badge">Connected</span>
            )}
          </button>
        ))}
      </div>

      <p className="deploy-target-desc">{selectedConfig?.desc}</p>

      {/* ── Project Name ─────────────────────────────── */}
      {target !== DEPLOY_TARGET.DOWNLOAD && (
        <div className="deploy-field">
          <label className="deploy-field-label">Project Name</label>
          <input
            className="deploy-field-input"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="my-bifrost-site"
          />
        </div>
      )}

      {/* ── Token Input ──────────────────────────────── */}
      {selectedConfig?.needsToken && (
        <div className="deploy-field">
          <div className="deploy-field-header">
            <label className="deploy-field-label">{selectedConfig.tokenLabel}</label>
            <button
              className="deploy-token-toggle"
              onClick={() => setShowTokenInput(v => !v)}
            >
              {showTokenInput ? 'Hide' : 'Edit'}
            </button>
          </div>
          {showTokenInput ? (
            <input
              className="deploy-field-input deploy-field-input--password"
              type="password"
              placeholder={`Paste your ${selectedConfig.tokenLabel}...`}
              value={selectedConfig.tokenValue}
              onChange={e => selectedConfig.setToken(e.target.value)}
            />
          ) : (
            <div className="deploy-token-status">
              {hasDeployToken(selectedConfig.id)
                ? <span className="deploy-token-ok">✓ Token saved</span>
                : <span className="deploy-token-missing">⚠ Token required — click Edit to add</span>
              }
              <a
                href={selectedConfig.tokenHint.includes('vercel') ? 'https://vercel.com/account/tokens' : 'https://app.netlify.com/user/applications'}
                target="_blank"
                rel="noreferrer"
                className="deploy-token-link"
              >
                Get token ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Deploy Button ─────────────────────────────── */}
      <button
        className={`deploy-btn ${isDeploying ? 'is-loading' : ''}`}
        onClick={handleDeploy}
        disabled={isDeploying || !html}
      >
        {isDeploying ? (
          <><span className="deploy-btn-spinner" />Deploying...</>
        ) : (
          <>{selectedConfig?.icon} Deploy to {selectedConfig?.label}</>
        )}
      </button>

      {/* ── Deploy Log ────────────────────────────────── */}
      {deployLog.length > 0 && (
        <div className="deploy-log">
          {deployLog.map((entry, i) => (
            <div key={i} className={`deploy-log-line deploy-log-line--${entry.status}`}>
              <span className="deploy-log-time">{entry.time}</span>
              <span className="deploy-log-msg">{entry.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Deploy Result ─────────────────────────────── */}
      {deployResult && (
        <div className="deploy-result">
          <div className="deploy-result-badge">
            {deployResult.platform === 'download' ? '⬇ Downloaded' : '✓ Live'}
          </div>
          <div className="deploy-result-url">
            <span className="deploy-result-url-icon">🔗</span>
            <span className="deploy-result-url-text">{deployResult.url}</span>
            {deployResult.platform !== 'download' && (
              <>
                <button
                  className="deploy-result-copy"
                  onClick={() => handleCopy(deployResult.url)}
                >
                  Copy
                </button>
                <a
                  href={deployResult.url}
                  target="_blank"
                  rel="noreferrer"
                  className="deploy-result-open"
                >
                  Open ↗
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Deploy History ────────────────────────────── */}
      {history.length > 0 && (
        <div className="deploy-history">
          <div className="deploy-history-header">
            <span className="deploy-history-title">Deployment History</span>
            <button
              className="deploy-history-clear"
              onClick={() => { clearDeployHistory(); setHistory([]); }}
            >
              Clear
            </button>
          </div>
          <div className="deploy-history-list">
            {history.slice(0, 5).map((rec, i) => (
              <div key={i} className="deploy-history-item">
                <span className="deploy-history-platform">
                  {rec.platform === 'vercel' ? '▲' : rec.platform === 'netlify' ? '⬡' : '⬇'}
                </span>
                <span className="deploy-history-url">{rec.url}</span>
                <span className="deploy-history-time">
                  {new Date(rec.deployedAt).toLocaleDateString()}
                </span>
                {rec.platform !== 'download' && (
                  <a href={rec.url} target="_blank" rel="noreferrer" className="deploy-history-link">↗</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
