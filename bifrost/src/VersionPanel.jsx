import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

function formatTime(value) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function VersionPanel({ open, versions, currentVersionId, onClose, onRestore }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!open || !chartRef.current) return undefined;

    const chart = echarts.init(chartRef.current);
    const nodes = versions.map((version, index) => ({
      id: String(version.id),
      name: `v${index + 1}`,
      x: 40 + index * 46,
      y: 48,
      symbolSize: version.id === currentVersionId ? 30 : 22,
      itemStyle: {
        color: version.id === currentVersionId ? '#0070f3' : '#10b981',
      },
    }));
    const links = versions.slice(1).map((version, index) => ({
      source: String(versions[index].id),
      target: String(version.id),
    }));

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { show: true },
      animationDuration: 400,
      series: [{
        type: 'graph',
        layout: 'none',
        roam: false,
        label: { show: true, color: '#111827', fontSize: 11 },
        lineStyle: { color: '#0070f3', width: 2 },
        data: nodes,
        links,
      }],
    });

    chart.on('click', (params) => {
      const match = versions.find((version) => String(version.id) === params.data?.id);
      if (match) onRestore(match);
    });

    const resize = () => chart.resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
    };
  }, [currentVersionId, onRestore, open, versions]);

  return (
    <aside className={`version-panel ${open ? 'open' : ''}`}>
      <header>
        <div>
          <p>Version Graph</p>
          <h2>History</h2>
        </div>
        <button type="button" onClick={onClose}>Close</button>
      </header>

      <div className="version-chart" ref={chartRef}>
        {versions.length === 0 && <span>No versions yet</span>}
      </div>

      <div className="timeline">
        {versions.length === 0 ? (
          <div className="empty-history">Generate a website to create the first version.</div>
        ) : versions.map((version, index) => (
          <article className={`version-node ${version.id === currentVersionId ? 'active' : ''}`} key={version.id}>
            <div>
              <strong>v{index + 1}</strong>
              <time>{formatTime(version.timestamp)}</time>
            </div>
            <p>{version.prompt.slice(0, 50)}{version.prompt.length > 50 ? '...' : ''}</p>
            <button type="button" onClick={() => onRestore(version)}>Restore</button>
          </article>
        ))}
      </div>
    </aside>
  );
}

export default VersionPanel;
