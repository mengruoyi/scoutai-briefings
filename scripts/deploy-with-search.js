#!/usr/bin/env node
/**
 * ScoutAI 完整部署脚本（含搜索索引）
 * 1. 构建网站
 * 2. 推送数据到 Algolia
 * 3. 推送到 GitHub
 * 4. Vercel 自动部署
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

// 配置
const REPO_PATH = path.resolve(__dirname, '..');
const GITHUB_REPO = 'mengruoyi/scoutai-briefings';
const BRIEFING_DIR = path.join(REPO_PATH, 'briefing');

// Algolia 配置
const ALGOLIA_APP_ID = 'CQ8365G2HD';
const ALGOLIA_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY || '';
const ALGOLIA_INDEX_NAME = 'scoutai_news';

function log(message) {
  console.log(message);
}

function runCommand(cmd, cwd = REPO_PATH) {
  try {
    return execSync(cmd, { 
      cwd, 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (error) {
    throw new Error(`命令执行失败: ${cmd}\n${error.message}`);
  }
}

// 步骤1: 构建网站
function buildWebsite() {
  log('\n🔧 步骤1: 构建网站...');
  runCommand('node scripts/build.js');
  log('✅ 网站构建成功');
}

// 读取所有资讯
function getAllBriefings() {
  if (!fs.existsSync(BRIEFING_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(BRIEFING_DIR)
    .filter(f => f.endsWith('.html'))
    .sort((a, b) => b.localeCompare(a));
  
  const records = [];
  
  files.forEach((file, fileIndex) => {
    const filePath = path.join(BRIEFING_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const match = file.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
    if (!match) return;
    
    const [, year, month, day, hour, minute] = match;
    const date = `${year}-${month}-${day}`;
    const time = `${hour}:${minute}`;
    
    const articles = extractArticles(content, date, time, fileIndex);
    records.push(...articles);
  });
  
  return records;
}

function extractArticles(html, date, time, fileIndex) {
  const articles = [];
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
      .substring(0, 3000);
    
    const linkMatch = match[0].match(/href="([^"]*)"/);
    const url = linkMatch ? linkMatch[1] : '';
    
    let category = '其他';
    if (source.includes('Product Hunt')) category = '产品发布';
    else if (source.includes('GitHub')) category = '开源项目';
    else if (source.includes('VC') || source.includes('A16Z')) category = 'VC洞察';
    else if (source.includes('媒体')) category = '科技媒体';
    
    articles.push({
      objectID: `${date}-${fileIndex}-${index}`,
      title,
      source,
      content,
      url,
      category,
      date,
      time,
      timestamp: new Date(`${date}T${time}:00`).getTime()
    });
    
    index++;
  }
  
  return articles;
}

// 步骤2: 推送到 Algolia
function pushToAlgolia(records) {
  return new Promise((resolve, reject) => {
    if (!ALGOLIA_API_KEY) {
      reject(new Error('ALGOLIA_ADMIN_API_KEY 环境变量未设置'));
      return;
    }
    
    log(`\n📤 步骤2: 推送 ${records.length} 条资讯到 Algolia...`);
    
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
          log(`✅ Algolia 推送成功: ${result.objectIDs.length} 条记录`);
          resolve(result);
        } else {
          reject(new Error(`Algolia API error: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 步骤3: 推送到 GitHub
function pushToGitHub() {
  log('\n📦 步骤3: 推送到 GitHub...');
  
  // 检查是否有变更
  const status = runCommand('git status --porcelain');
  if (!status.trim()) {
    log('⚠️ 没有变更需要提交');
    return;
  }
  
  runCommand('git add .');
  
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  runCommand(`git commit -m "Update news ${timestamp}"`);
  
  try {
    runCommand('git push origin main');
    log('✅ GitHub 推送成功');
  } catch (error) {
    log('⚠️ 推送失败，尝试使用 token...');
    const token = process.env.GH_TOKEN;
    if (token) {
      runCommand(`git push https://x-access-token:${token}@github.com/${GITHUB_REPO}.git main`);
      log('✅ GitHub 推送成功 (使用 token)');
    } else {
      throw error;
    }
  }
}

// 主函数
async function main() {
  log('='.repeat(50));
  log('🚀 ScoutAI 完整部署（含搜索）');
  log('='.repeat(50));
  
  try {
    // 步骤1: 构建
    buildWebsite();
    
    // 步骤2: 推送 Algolia
    const records = getAllBriefings();
    if (records.length > 0 && ALGOLIA_API_KEY) {
      await pushToAlgolia(records);
    } else if (!ALGOLIA_API_KEY) {
      log('\n⚠️ 跳过 Algolia: ALGOLIA_ADMIN_API_KEY 未设置');
      log('   设置方式: set ALGOLIA_ADMIN_API_KEY=你的AdminAPIKey');
    }
    
    // 步骤3: 推送 GitHub
    pushToGitHub();
    
    log('\n' + '='.repeat(50));
    log('🎉 部署完成！');
    log(`🌐 网站: https://scoutai-briefings.vercel.app`);
    log(`🔍 搜索: 已启用 Algolia 搜索`);
    log('='.repeat(50));
    
  } catch (error) {
    log(`\n❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

main();
