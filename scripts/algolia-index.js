#!/usr/bin/env node
/**
 * ScoutAI Algolia 索引推送脚本
 * 将资讯内容推送到 Algolia 搜索引擎
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Algolia 配置
const ALGOLIA_APP_ID = 'CQ8365G2HD';
const ALGOLIA_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY || ''; // 从环境变量获取
const ALGOLIA_INDEX_NAME = 'scoutai_news';

const BRIEFING_DIR = path.join(__dirname, '..', 'briefing');

// 读取所有简报文件
function getAllBriefings() {
  if (!fs.existsSync(BRIEFING_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(BRIEFING_DIR)
    .filter(f => f.endsWith('.html'))
    .sort((a, b) => b.localeCompare(a));
  
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
    
    // 提取文章数据
    const articles = extractArticles(content, date, time);
    records.push(...articles);
  });
  
  return records;
}

// 从 HTML 中提取文章数据
function extractArticles(html, date, time) {
  const articles = [];
  
  // 简单的正则提取（实际项目中可以用 cheerio）
  const articleRegex = /<div class="article">[\s\S]*?<div class="article-title">(.*?)<\/div>[\s\S]*?<div class="article-source">(.*?)<\/div>[\s\S]*?<div class="article-content">([\s\S]*?)<\/div>/g;
  
  let match;
  let index = 0;
  
  while ((match = articleRegex.exec(html)) !== null) {
    const title = match[1].replace(/<[^>]*>/g, '').trim();
    const source = match[2].replace(/<[^>]*>/g, '').trim();
    const content = match[3]
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000); // 限制长度
    
    // 提取链接
    const linkMatch = match[0].match(/href="([^"]*)"/);
    const url = linkMatch ? linkMatch[1] : '';
    
    // 提取板块
    let category = '其他';
    if (source.includes('Product Hunt')) category = '产品发布';
    else if (source.includes('GitHub')) category = '开源项目';
    else if (source.includes('VC') || source.includes('A16Z')) category = 'VC洞察';
    else if (source.includes('媒体')) category = '科技媒体';
    
    articles.push({
      objectID: `${date}-${time}-${index}`,
      title: title,
      source: source,
      content: content,
      url: url,
      category: category,
      date: date,
      time: time,
      timestamp: new Date(`${date}T${time}:00`).getTime()
    });
    
    index++;
  }
  
  return articles;
}

// 推送到 Algolia
function pushToAlgolia(records) {
  return new Promise((resolve, reject) => {
    if (!ALGOLIA_API_KEY) {
      reject(new Error('ALGOLIA_ADMIN_API_KEY 环境变量未设置'));
      return;
    }
    
    const data = JSON.stringify(records);
    
    const options = {
      hostname: `${ALGOLIA_APP_ID}.algolia.net`,
      path: `/1/indexes/${ALGOLIA_INDEX_NAME}/batch`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-API-Key': ALGOLIA_API_KEY,
        'X-Algolia-Application-Id': ALGOLIA_APP_ID
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Algolia API error: ${res.statusCode} - ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // 构建批量操作请求体
    const batchBody = {
      requests: records.map(record => ({
        action: 'addObject',
        body: record
      }))
    };
    
    req.write(JSON.stringify(batchBody));
    req.end();
  });
}

// 主函数
async function main() {
  console.log('🔍 ScoutAI Algolia 索引推送');
  console.log('============================');
  
  if (!ALGOLIA_API_KEY) {
    console.error('❌ 错误: 请设置 ALGOLIA_ADMIN_API_KEY 环境变量');
    console.log('   示例: set ALGOLIA_ADMIN_API_KEY=你的AdminAPIKey');
    process.exit(1);
  }
  
  console.log('📖 读取资讯文件...');
  const records = getAllBriefings();
  console.log(`✅ 找到 ${records.length} 条资讯`);
  
  if (records.length === 0) {
    console.log('⚠️ 没有资讯需要推送');
    return;
  }
  
  console.log('\n📤 推送到 Algolia...');
  try {
    const result = await pushToAlgolia(records);
    console.log(`✅ 推送成功！`);
    console.log(`   对象ID: ${result.objectIDs ? result.objectIDs.length : 'unknown'} 个`);
    console.log(`   任务ID: ${result.taskID || 'N/A'}`);
  } catch (error) {
    console.error('❌ 推送失败:', error.message);
    process.exit(1);
  }
  
  console.log('\n🎉 完成！资讯已可搜索');
  console.log(`   搜索地址: https://scoutai-briefings.vercel.app`);
}

main();
