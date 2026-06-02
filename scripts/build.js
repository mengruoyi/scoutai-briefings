#!/usr/bin/env node
/**
 * ScoutAI 网站构建脚本
 * 生成首页索引和历史简报列表
 */

const fs = require('fs');
const path = require('path');

const BRIEFING_DIR = path.join(__dirname, '..', 'briefing');
const INDEX_FILE = path.join(__dirname, '..', 'index.html');

// 确保briefing目录存在
if (!fs.existsSync(BRIEFING_DIR)) {
  fs.mkdirSync(BRIEFING_DIR, { recursive: true });
}

// 获取所有简报文件
function getBriefings() {
  if (!fs.existsSync(BRIEFING_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(BRIEFING_DIR)
    .filter(f => f.endsWith('.html'))
    .sort((a, b) => b.localeCompare(a)); // 降序排列，最新的在前
  
  return files.map(file => {
    const match = file.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day, hour, minute] = match;
      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00+08:00`);
      return {
        file,
        url: `/briefing/${file}`,
        date: date.toLocaleDateString('zh-CN'),
        time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: date.getTime()
      };
    }
    return null;
  }).filter(Boolean);
}

// 生成首页HTML
function generateIndex(briefings) {
  const latest = briefings[0];
  const history = briefings.slice(1);
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ScoutAI - AI行业情报简报</title>
  <meta name="description" content="ScoutAI 每日收集AI行业热点，为创业者提供有价值的情报简报">
  <link rel="stylesheet" href="/assets/css/style.css">
  <link rel="alternate" type="application/rss+xml" title="ScoutAI RSS Feed" href="/feed.xml">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <div class="logo">
        <span class="logo-icon">🔍</span>
        <h1>ScoutAI</h1>
      </div>
      <p class="tagline">AI行业情报侦察兵 · 每日7:00 & 17:00更新</p>
      <div class="stats">
        <span>📊 已发布 ${briefings.length} 期简报</span>
        <span>🎯 聚焦应用落地</span>
        <span>🇨🇳 中文优先</span>
      </div>
    </div>
  </header>

  <main class="container">
    ${latest ? `
    <!-- 最新简报 -->
    <section class="latest-section">
      <h2 class="section-title">🔥 最新简报</h2>
      <div class="latest-card">
        <div class="latest-meta">
          <span class="latest-date">${latest.date}</span>
          <span class="latest-time">${latest.time}</span>
        </div>
        <h3 class="latest-title">AI行业情报简报 - ${latest.date}</h3>
        <p class="latest-desc">本期精选AI行业最新动态、产品发布、开源项目和VC洞察</p>
        <a href="${latest.url}" class="btn btn-primary">阅读本期简报</a>
      </div>
    </section>
    ` : `
    <section class="latest-section">
      <div class="empty-state">
        <p>暂无简报，请稍后再来查看</p>
      </div>
    </section>
    `}

    ${history.length > 0 ? `
    <!-- 历史简报 -->
    <section class="history-section">
      <h2 class="section-title">📚 历史简报</h2>
      <div class="history-grid">
        ${history.map(b => `
        <article class="history-card">
          <a href="${b.url}" class="history-link">
            <span class="history-date">${b.date}</span>
            <span class="history-time">${b.time}</span>
          </a>
        </article>
        `).join('')}
      </div>
    </section>
    ` : ''}
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>ScoutAI - AI行业情报侦察兵</p>
      <p class="footer-links">
        <a href="/feed.xml">RSS订阅</a>
        <span class="divider">·</span>
        <span>每日7:00 & 17:00更新</span>
      </p>
    </div>
  </footer>

  <script src="/assets/js/main.js"></script>
</body>
</html>`;
}

// 生成RSS Feed
function generateRSS(briefings) {
  const latest = briefings[0];
  const items = briefings.slice(0, 20).map(b => `
    <item>
      <title>ScoutAI简报 - ${b.date} ${b.time}</title>
      <link>https://scoutai.vercel.app${b.url}</link>
      <pubDate>${new Date(b.timestamp).toUTCString()}</pubDate>
      <guid>https://scoutai.vercel.app${b.url}</guid>
      <description>AI行业情报简报 - ${b.date}</description>
    </item>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ScoutAI - AI行业情报简报</title>
    <link>https://scoutai.vercel.app</link>
    <description>每日AI行业热点情报，为创业者提供有价值的行业洞察</description>
    <language>zh-CN</language>
    <lastBuildDate>${latest ? new Date(latest.timestamp).toUTCString() : new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://scoutai.vercel.app/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
}

// 主函数
function main() {
  console.log('🔧 构建 ScoutAI 网站...');
  
  const briefings = getBriefings();
  console.log(`📄 找到 ${briefings.length} 期简报`);
  
  // 生成首页
  const indexHTML = generateIndex(briefings);
  fs.writeFileSync(INDEX_FILE, indexHTML, 'utf-8');
  console.log('✅ 首页已生成: index.html');
  
  // 生成RSS
  const rssXML = generateRSS(briefings);
  fs.writeFileSync(path.join(__dirname, '..', 'feed.xml'), rssXML, 'utf-8');
  console.log('✅ RSS Feed已生成: feed.xml');
  
  console.log('🎉 构建完成!');
}

main();
