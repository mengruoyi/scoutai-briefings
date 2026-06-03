#!/usr/bin/env node
/**
 * ScoutAI Algolia 索引推送脚本 - 简化版
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Algolia 配置
const ALGOLIA_APP_ID = 'CQ8365G2HD';
const ALGOLIA_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY || '';
const ALGOLIA_INDEX_NAME = 'scoutai_news';

const BRIEFING_DIR = path.join(__dirname, '..', 'briefing');

// 读取所有简报文件
function getAllBriefings() {
  if (!fs.existsSync(BRIEFING_DIR)) {
    console.log('⚠️ briefing 目录不存在');
    return [];
  }
  
  const files = fs.readdirSync(BRIEFING_DIR)
    .filter(f => f.endsWith('.html'))
    .sort((a, b) => b.localeCompare(a));
  
  console.log(`📁 找到 ${files.length} 个资讯文件`);
  
  const records = [];
  
  files.forEach(file => {
    const filePath = path.join(BRIEFING_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 解析日期
    const match = file.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
    if (!match) return;
    
    const [, year, month, day, hour, minute] = match;
    const date = `${year}-${month}-${day}`;
    const time = `${hour}:${minute}`;
    
    // 使用简单字符串提取
    const articles = extractArticlesSimple(content, date, time, file);
    records.push(...articles);
  });
  
  return records;
}

// 简单的文章提取
function extractArticlesSimple(html, date, time, filename) {
  const articles = [];
  
  // 分割每个 article
  const parts = html.split('<div class="article">');
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    // 提取标题（兼容 <a class="article-title"> 和 <div class="article-title">）
    const titleMatch = part.match(/class="article-title">([^<]*)/);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();

    // 提取来源
    const sourceMatch = part.match(/<div class="article-meta">([^<]*)/);
    const source = sourceMatch ? sourceMatch[1].trim() : '未知来源';

    // 提取内容（到 </div> 结束，取 article-content 内部）
    const contentMatch = part.match(/<div class="article-content">([\s\S]*?)<\/div>\s*<div class="tags">/);
    const rawContent = contentMatch ? contentMatch[1] : '';
    const content = rawContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000);

    // 提取链接
    const linkMatch = part.match(/class="article-title"\s+href="([^"]*)"/);
    const url = linkMatch ? linkMatch[1] : (part.match(/href="([^"]*)"/) || ['', ''])[1];
    
    // 分类（从来源和内容推断）
    let category = '其他';
    if (source.includes('Product Hunt')) category = '产品发布';
    else if (source.includes('GitHub')) category = '开源项目';
    else if (source.includes('VC') || source.includes('A16Z') || source.includes('a16z') || source.includes('IPO') || source.includes('科创板')) category = 'VC洞察';
    else if (source.includes('Hacker News') || source.includes('TechCrunch') || source.includes('36氪')) category = '科技媒体';
    else if (source.includes('机器之心') || source.includes('量子位') || source.includes('OpenBMB')) category = '科技媒体';
    else if (source.includes('研究') || source.includes('微软') || source.includes('Microsoft')) category = '产品发布';
    else if (source.includes('Anthropic')) category = 'VC洞察';
    
    const objectID = `${filename}-${i}`;
    
    articles.push({
      objectID,
      title,
      source,
      content,
      url,
      category,
      date,
      time,
      filename,
      timestamp: new Date(`${date}T${time}:00`).getTime()
    });
  }
  
  console.log(`  - ${filename}: ${articles.length} 条`);
  
  return articles;
}

// 推送到 Algolia
function pushToAlgolia(records) {
  return new Promise((resolve, reject) => {
    if (!ALGOLIA_API_KEY) {
      reject(new Error('ALGOLIA_ADMIN_API_KEY 环境变量未设置'));
      return;
    }
    
    console.log(`\n📤 推送到 Algolia (${records.length} 条)...`);
    
    const batchBody = {
      requests: records.map(record => ({
        action: 'addObject',
        body: record
      }))
    };
    
    const data = JSON.stringify(batchBody);
    
    const options = {
      hostname: `${ALGOLIA_APP_ID}.algolia.net`,
      path: `/1/indexes/${ALGOLIA_INDEX_NAME}/batch`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-API-Key': ALGOLIA_API_KEY,
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const result = JSON.parse(responseData);
          console.log(`✅ Algolia 推送成功: ${result.objectIDs.length} 条记录`);
          resolve(result);
        } else {
          console.error(`❌ Algolia 错误: ${res.statusCode}`);
          console.error(responseData);
          reject(new Error(`Algolia API error: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`❌ 网络错误: ${error.message}`);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// 主函数
async function main() {
  console.log('🔍 ScoutAI Algolia 索引推送');
  console.log('============================');
  
  if (!ALGOLIA_API_KEY) {
    console.error('❌ 错误: 请设置 ALGOLIA_ADMIN_API_KEY 环境变量');
    console.log('   示例: $env:ALGOLIA_ADMIN_API_KEY="你的AdminAPIKey"');
    process.exit(1);
  }
  
  const records = getAllBriefings();
  
  if (records.length === 0) {
    console.log('⚠️ 没有资讯需要推送');
    return;
  }
  
  try {
    await pushToAlgolia(records);
    console.log('\n🎉 完成！资讯已可搜索');
  } catch (error) {
    console.error('\n❌ 推送失败');
    process.exit(1);
  }
}

main();
