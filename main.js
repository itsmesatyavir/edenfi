const axios = require('axios');
const userAgents = require('user-agents'); 
const fs = require('fs').promises; 

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m"
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  userInfo: (msg) => console.log(`${colors.white}[✓] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`------------------------------------------------`);
    console.log(`  EdenFi Auto Bot - AirdropScriptFA `);
    console.log(`------------------------------------------------${colors.reset}`);
    console.log();
  }
};

const BASE_URL = 'https://api.edenfi.io/api';
const REFERRAL_ID = '';

async function readTokens() {
  try {
    const data = await fs.readFile('token.txt', 'utf8');
    const tokens = data.split('\n').map(token => token.trim()).filter(token => token);
    if (tokens.length === 0) {
      logger.error('No tokens found in token.txt');
      process.exit(1);
    }
    logger.info(`Loaded ${tokens.length} token(s)`);
    return tokens;
  } catch (error) {
    logger.error(`Failed to read token.txt: ${error.message}`);
    process.exit(1);
  }
}

const getRandomUserAgent = () => {
  return new userAgents().toString();
};

const getHeaders = (token) => ({
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.8',
  'authorization': `Bearer ${token}`,
  'content-type': 'application/json',
  'sec-ch-ua': '"Brave";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'sec-gpc': '1',
  'cookie': `edenfi_referral_id=${REFERRAL_ID}`,
  'Referer': 'https://waitlist.edenfi.io/',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'User-Agent': getRandomUserAgent()
});

async function getUserProfile(token) {
  try {
    logger.loading('Fetching user profile...');
    const response = await axios.get(`${BASE_URL}/users/profile`, { headers: getHeaders(token) });
    const { id, email, username, points, totalReferrals, rank, createdAt } = response.data;
    logger.userInfo(`User ID: ${id}`);
    logger.userInfo(`Email: ${email}`);
    logger.userInfo(`Username: ${username || 'Not set'}`);
    logger.userInfo(`Points: ${points}`);
    logger.userInfo(`Total Referrals: ${totalReferrals}`);
    logger.userInfo(`Rank: ${rank}`);
    logger.userInfo(`Account Created: ${new Date(createdAt).toLocaleString()}\n`);
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch user profile: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function getTasks(token) {
  try {
    logger.loading('Fetching available tasks...');
    const response = await axios.get(`${BASE_URL}/admin/tasks`, { headers: getHeaders(token) });
    logger.info(`Found ${response.data.length} tasks`);
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch tasks: ${error.response?.data?.message || error.message}`);
    return [];
  }
}

async function completeTask(token, taskId) {
  try {
    logger.step(`Completing task ID ${taskId}...`);
    const response = await axios.post(
      `${BASE_URL}/tasks/complete-verification`,
      { taskId },
      { headers: getHeaders(token) }
    );
    logger.success(`Task ${taskId} completed: ${response.data.message}, Points: ${response.data.points}, Total Points: ${response.data.totalPoints}`);
  } catch (error) {
    logger.error(`Failed to complete task ${taskId}: ${error.response?.data?.message || error.message}`);
  }
}

async function processAccount(token, index) {
  logger.step(`Processing account ${index + 1}...\n`);
  
  await getUserProfile(token);

  const tasks = await getTasks(token);

  for (const task of tasks) {
    if (task.isActive && task.maxCompletions > 0) {
      logger.step(`Processing task: ${task.title} (ID: ${task.id}, Points: ${task.points})`);
      await completeTask(token, task.id);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      logger.warn(`Skipping task: ${task.title} (ID: ${task.id}, Active: ${task.isActive})`);
    }
  }
  logger.success(`Finished processing account ${index + 1}`);
}

async function main() {
  logger.banner();

  const tokens = await readTokens();

  for (let i = 0; i < tokens.length; i++) {
    await processAccount(tokens[i], i);
  }

  logger.success('All accounts processed successfully');
}

main().catch((error) => {
  logger.error(`Bot encountered an error: ${error.message}`);
  process.exit(1);
});
