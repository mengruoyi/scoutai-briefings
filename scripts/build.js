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
  <title>ScoutAI - AI行业情报资讯</title>
  <meta name="description" content="ScoutAI 每日收集AI行业热点，为创业者提供有价值的深度资讯">
  <link rel="stylesheet" href="/assets/css/style.css">
  <link rel="alternate" type="application/rss+xml" title="ScoutAI RSS Feed" href="/feed.xml">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/instantsearch.css@8.0.0/themes/satellite-min.css">
  <style>
    .search-section { background: linear-gradient(135deg, #059669 0%, #0D9488 100%); padding: 40px 20px; margin: -40px -40px 40px -40px; border-radius: 16px 16px 0 0; }
    .search-container { max-width: 700px; margin: 0 auto; }
    .search-title { color: white; text-align: center; font-size: 18px; margin-bottom: 20px; opacity: 0.9; }
    .search-box { position: relative; }
    .search-input { width: 100%; padding: 16px 24px 16px 50px; border: none; border-radius: 30px; font-size: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); outline: none; }
    .search-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 20px; color: #059669; }
    .search-results { margin-top: 30px; display: none; }
    .search-stats { color: #666; font-size: 14px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
    .search-hit { padding: 20px; margin-bottom: 16px; background: #fafafa; border-radius: 12px; border-left: 4px solid #059669; }
    .search-hit:hover { transform: translateX(4px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .search-hit-title { font-size: 16px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
    .search-hit-title a { color: inherit; text-decoration: none; }
    .search-hit-title a:hover { color: #059669; }
    .search-hit-content { color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 8px; }
    .search-hit-meta { font-size: 12px; color: #999; }
    .search-hit-tag { display: inline-block; background: #e8f5e9; color: #059669; padding: 2px 10px; border-radius: 12px; font-size: 12px; margin-right: 8px; }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="container">
      <div class="logo"><span class="logo-icon">🔍</span><h1>ScoutAI</h1></div>
      <p class="tagline">AI行业情报侦察兵 · 深度资讯每日更新</p>
      <div class="stats">
        <span>📊 知识库检索</span>
        <span>🎯 聚焦应用落地</span>
        <span>🇨🇳 中文优先</span>
      </div>
    </div>
  </header>

  <main class="container">
    <div class="search-section">
      <div class="search-container">
        <div class="search-title">🔎 搜索历史资讯</div>
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="search-input" class="search-input" placeholder="输入关键词搜索 AI 资讯...">
        </div>
      </div>
    </div>

    <div id="search-results" class="search-results">
      <div class="search-stats" id="search-stats"></div>
      <div id="hits-container"></div>
      <div id="pagination-container"></div>
    </div>

    <section class="latest-section" id="latest-section">
      <h2 class="section-title">🔥 最新资讯</h2>
      <div class="latest-card">
        <div class="latest-meta">
          <span class="latest-date">${latest ? latest.date : ''}</span>
          <span class="latest-time">${latest ? latest.time : ''}</span>
        </div>
        <h3 class="latest-title">AI行业情报资讯 - ${latest ? latest.date : ''}</h3>
        <p class="latest-desc">本期精选AI行业最新动态、产品发布、开源项目和VC洞察</p>
        <a href="${latest ? latest.url : '#'}" class="btn btn-primary">阅读本期资讯</a>
      </div>
    </section>

    ${history.length > 0 ? `
    <section class="history-section">
      <h2 class="section-title">📚 往期资讯</h2>
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

  <script src="https://cdn.jsdelivr.net/npm/algoliasearch@4.20.0/dist/algoliasearch-lite.umd.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/instantsearch.js@4.60.0/dist/instantsearch.production.min.js"></script>
  <script>
    const searchClient = algoliasearch('CQ8365G2HD', '53f5d3645c26cba90968ac17ee13b03b');
    const search = instantsearch({ indexName: 'scoutai_news', searchClient, routing: true });

    search.addWidget(instantsearch.widgets.searchBox({ container: '#search-input', placeholder: '输入关键词搜索...', showSubmit: false, showReset: false }));

    search.addWidget(instantsearch.widgets.hits({
      container: '#hits-container',
      templates: {
        item: (hit, { html, components }) => html\`
          <div class="search-hit">
            <div class="search-hit-title"><a href="\${hit.url}" target="_blank">\${components.Highlight({ hit, attribute: 'title' })}</a></div>
            <div class="search-hit-content">\${components.Highlight({ hit, attribute: 'content' })}</div>
            <div class="search-hit-meta"><span class="search-hit-tag">\${hit.category}</span><span>\${hit.date} \${hit.time}</span></div>
          </div>\`,
        empty: '没有找到相关资讯'
      }
    }));

    search.addWidget(instantsearch.widgets.stats({ container: '#search-stats', templates: { text: (data) => \`找到 \${data.nbHits} 条相关资讯\` } }));
    search.addWidget(instantsearch.widgets.pagination({ container: '#pagination-container', padding: 2, showFirst: false, showLast: false }));

    search.on('render', () => {
      const query = search.helper.state.query;
      document.getElementById('search-results').style.display = query ? 'block' : 'none';
      document.getElementById('latest-section').style.display = query ? 'none' : 'block';
    });

    search.start();
  </script>
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
