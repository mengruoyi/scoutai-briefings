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
    .search-empty { text-align: center; padding: 40px; color: #999; font-size: 15px; }
    .ais-Pagination { text-align: center; margin-top: 20px; }
    .ais-Pagination-item { display: inline-block; margin: 0 4px; padding: 8px 14px; border-radius: 8px; border: 1px solid #ddd; background: white; color: #059669; cursor: pointer; font-size: 14px; }
    .ais-Pagination-item--selected { background: #059669; color: white; border-color: #059669; }
    .ais-Pagination-link { background: none; border: none; cursor: pointer; color: inherit; font-size: inherit; padding: 0; }
    mark { background: #fef3c7; color: #92400e; padding: 1px 4px; border-radius: 3px; }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a href="/" class="logo" style="text-decoration:none;color:inherit;"><span class="logo-icon">🔍</span><h1>ScoutAI</h1></a>
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
          <input type="text" id="search-input-box" class="search-input" placeholder="输入关键词搜索 AI 资讯..." autocomplete="off">
          <button id="search-submit-btn" class="search-submit-btn" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:#059669;color:white;border:none;border-radius:25px;padding:10px 20px;font-size:14px;cursor:pointer;">搜索</button>
        </div>
      </div>
    </div>

    <div id="search-results" class="search-results">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div class="search-stats" id="search-stats"></div>
        <a href="/" style="color:#059669;text-decoration:none;font-size:14px;font-weight:500;">🏠 返回首页</a>
      </div>
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
            <span class="history-desc">AI行业情报资讯</span>
          </a>
        </article>
        `).join('')}
      </div>
    </section>
    ` : `
    <section class="history-section">
      <h2 class="section-title">📚 往期资讯</h2>
      <div class="empty-state">
        <p>暂无往期资讯，每日 7:00 和 17:00 自动更新</p>
      </div>
    </section>
    `}
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

  <script>
    // Algolia 搜索配置
    const ALGOLIA_APP_ID = 'CQ8365G2HD';
    const ALGOLIA_API_KEY = '53f5d3645c26cba90968ac17ee13b03b';
    const ALGOLIA_INDEX = 'scoutai_news';

    // 使用 fetch 直接调用 Algolia REST API（绕过 DSN 端点）
    async function searchAlgolia(query, page = 0) {
      const url = 'https://cq8365g2hd.algolia.net/1/indexes/' + ALGOLIA_INDEX + '/query';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          hitsPerPage: 20,
          page: page
        })
      });
      return await response.json();
    }

    // 高亮匹配文本
    function highlightText(text, query) {
      if (!query || !text) return text;
      const specialChars = ['.','*','+','?','^','$','{','}','(',')','|','[',']','\\\\'];
      let escaped = '';
      for (let i = 0; i < query.length; i++) {
        escaped += specialChars.includes(query[i]) ? '\\\\' + query[i] : query[i];
      }
      const regex = new RegExp('(' + escaped + ')', 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    }

    // 渲染搜索结果
    function renderResults(data, query) {
      const hitsContainer = document.getElementById('hits-container');
      const statsContainer = document.getElementById('search-stats');
      const paginationContainer = document.getElementById('pagination-container');

      if (!data || !data.hits || data.hits.length === 0) {
        hitsContainer.innerHTML = '<div class="search-empty">没有找到相关资讯</div>';
        statsContainer.textContent = '找到 0 条相关资讯';
        paginationContainer.innerHTML = '';
        document.getElementById('search-results').style.display = 'block';
        document.getElementById('latest-section').style.display = 'none';
        return;
      }

      statsContainer.textContent = '找到 ' + data.nbHits + ' 条相关资讯';

      hitsContainer.innerHTML = data.hits.map(hit => {
        const title = highlightText(hit.title, query);
        const content = highlightText(hit.content ? hit.content.substring(0, 200) : '', query);
        return '<div class="search-hit">' +
          '<div class="search-hit-title"><a href="' + hit.url + '" target="_blank">' + title + '</a></div>' +
          '<div class="search-hit-content">' + content + '</div>' +
          '<div class="search-hit-meta"><span class="search-hit-tag">' + (hit.category || 'AI') + '</span><span>' + (hit.date || '') + ' ' + (hit.time || '') + '</span></div>' +
          '</div>';
      }).join('');

      // 分页
      const totalPages = data.nbPages || 1;
      if (totalPages > 1) {
        let paginationHTML = '';
        const currentPage = data.page || 0;
        const startPage = Math.max(0, currentPage - 2);
        const endPage = Math.min(totalPages -1, currentPage + 2);

        if (currentPage > 0) {
          paginationHTML += '<button class="ais-Pagination-item ais-Pagination-link" data-page="' + (currentPage - 1) + '">‹</button>';
        }
        for (let i = startPage; i <= endPage; i++) {
          paginationHTML += '<button class="ais-Pagination-item ais-Pagination-link' + (i === currentPage ? ' ais-Pagination-item--selected' : '') + '" data-page="' + i + '">' + (i + 1) + '</button>';
        }
        if (currentPage < totalPages - 1) {
          paginationHTML += '<button class="ais-Pagination-item ais-Pagination-link" data-page="' + (currentPage + 1) + '">›</button>';
        }
        paginationContainer.innerHTML = '<div class="ais-Pagination">' + paginationHTML + '</div>';

        // 绑定分页事件
        paginationContainer.querySelectorAll('[data-page]').forEach(btn => {
          btn.addEventListener('click', function() {
            const currentQuery = document.getElementById('search-input-box').value;
            searchAlgolia(currentQuery, parseInt(this.dataset.page)).then(data => {
              renderResults(data, currentQuery);
            });
          });
        });
      } else {
        paginationContainer.innerHTML = '';
      }

      document.getElementById('search-results').style.display = 'block';
      document.getElementById('latest-section').style.display = 'none';
    }

    // 初始化搜索
    document.addEventListener('DOMContentLoaded', function() {
      const searchInput = document.getElementById('search-input-box');
      let debounceTimer = null;

      searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const query = this.value.trim();
        if (!query) {
          document.getElementById('search-results').style.display = 'none';
          document.getElementById('latest-section').style.display = 'block';
          return;
        }
        debounceTimer = setTimeout(function() {
          searchAlgolia(query, 0).then(data => renderResults(data, query));
        }, 300);
      });

      // 回车键直接搜索
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          clearTimeout(debounceTimer);
          const query = this.value.trim();
          if (query) {
            searchAlgolia(query, 0).then(data => renderResults(data, query));
          }
        }
      });

      // 搜索按钮点击
      document.getElementById('search-submit-btn').addEventListener('click', function() {
        const query = searchInput.value.trim();
        if (query) {
          searchAlgolia(query, 0).then(data => renderResults(data, query));
        }
      });
    });
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
