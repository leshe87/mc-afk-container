const express = require('express');
const mineflayer = require('mineflayer');
const app = express();
const PORT = process.env.PORT || 3000;

// 兼容垫片：强制用 1.21.4 解析器兼容 1.21.11
const mcData = require('minecraft-data');
if (!mcData.versionsByMinecraftVersion.pc['1.21.11']) {
    const v1214 = mcData.versionsByMinecraftVersion.pc['1.21.4'];
    if (v1214) {
        mcData.versionsByMinecraftVersion.pc['1.21.11'] = v1214;
        mcData.supportedVersions.pc.push('1.21.11');
    }
}

function botStatus(botState) {
    const online = botState.activeBot && botState.activeBot.entity;
    return {
        id: botState.id,
        username: botState.options.username,
        host: botState.options.host + ':' + botState.options.port,
        version: botState.options.version,
        auth: botState.options.auth,
        status: online ? 'online' : (botState.isReconnecting ? 'reconnecting' : 'offline'),
        lastOnline: botState.lastOnline || null,
        lastEvent: botState.lastEvent || '',
        reconnects: botState.reconnects || 0
    };
}

// 面板：深色玻璃风，和 Falix 面板同一套感觉
// 注意：外层用模板字符串，里面的客户端 JS 只用单引号拼接，不用反引号和 ${}，避免嵌套冲突。
const DASHBOARD_HTML = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MC 挂机机器人</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;min-height:100vh;color:#e8eef7;background:linear-gradient(160deg,#0b1220 0%,#0f1b33 45%,#12263f 100%) fixed}
body::before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(600px 300px at 15% 0%,rgba(56,189,248,.14),transparent 60%),radial-gradient(500px 300px at 90% 10%,rgba(99,102,241,.16),transparent 60%)}
.wrap{position:relative;max-width:1060px;margin:0 auto;padding:28px 18px 60px}
header{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:20px}
h1{font-size:28px;letter-spacing:.5px}
h1 span{color:#38bdf8}
.sub{color:#93a5bd;font-size:13px;margin-top:6px}
.pill{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(10px);font-size:13px}
.dot{width:9px;height:9px;border-radius:50%;background:#94a3b8}
.dot.on{background:#22c55e;box-shadow:0 0 10px #22c55e}
.dot.off{background:#ef4444;box-shadow:0 0 10px #ef4444}
.dot.mid{background:#f59e0b;box-shadow:0 0 10px #f59e0b}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
.card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:18px;backdrop-filter:blur(14px);box-shadow:0 10px 30px rgba(0,0,0,.25)}
.card h2{font-size:17px;display:flex;align-items:center;gap:10px}
.card h2 .id{color:#7d8aa5;font-size:12px;font-weight:400}
.status{margin-left:auto;font-size:12px;padding:4px 10px;border-radius:999px;font-weight:600}
.status.online{background:rgba(34,197,94,.18);color:#4ade80;border:1px solid rgba(34,197,94,.35)}
.status.offline{background:rgba(239,68,68,.16);color:#f87171;border:1px solid rgba(239,68,68,.35)}
.status.reconnecting{background:rgba(245,158,11,.16);color:#fbbf24;border:1px solid rgba(245,158,11,.35)}
.meta{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;color:#aebdd4;font-size:12.5px}
.meta b{color:#e8eef7;font-weight:600}
.note{margin-top:12px;font-size:12.5px;color:#8fa1bd;line-height:1.6;word-break:break-all}
.note.warn{color:#fbbf24}
button{appearance:none;border:0;cursor:pointer;font-size:14px;font-weight:600;padding:10px 16px;border-radius:12px;color:#fff;background:linear-gradient(135deg,#0ea5e9,#6366f1);box-shadow:0 6px 18px rgba(14,165,233,.35)}
button.ghost{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);box-shadow:none;color:#dbe7f5}
@media(max-width:560px){h1{font-size:23px}.wrap{padding:20px 12px 48px}}
</style></head><body><div class="wrap" id="app"><p class="sub">加载中…</p></div>
<script>
function fmtTime(ts){ if(!ts) return "—"; var d=new Date(ts); var p=function(n){return (n<10?"0":"")+n;}; return p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes())+":"+p(d.getSeconds()); }
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function statusText(st){ return st==="online" ? "在线" : st==="reconnecting" ? "重连中" : "离线"; }
function statusDot(st){ return st==="online" ? "on" : st==="reconnecting" ? "mid" : "off"; }
async function load(){
  try {
    var r = await fetch("/api/status");
    var j = await r.json();
    render(j);
  } catch(e){
    document.getElementById("app").innerHTML = '<p class="sub">加载失败：' + esc(e.message) + '</p>';
  }
}
function render(j){
  var bots = j.bots || [];
  var online = bots.filter(function(b){ return b.status==="online"; }).length;
  var html = '<header><div><h1>MC <span>挂机机器人</span></h1>'
    + '<p class="sub">mineflayer 多账号防挂机 · 每 18~22 秒做一次动作 · 上次刷新 ' + fmtTime(Date.now()) + '</p></div>'
    + '<div style="display:flex;gap:10px;align-items:center"><span class="pill"><span class="dot ' + (online===bots.length && bots.length ? "on" : "off") + '"></span>' + online + " / " + bots.length + ' 在线</span>'
    + '<button class="ghost" onclick="load()">刷新</button></div></header>';
  html += '<div class="grid">';
  bots.forEach(function(b){
    html += '<section class="card"><h2>' + esc(b.username) + ' <span class="id">' + esc(b.id) + '</span>'
      + '<span class="status ' + esc(b.status) + '">' + statusText(b.status) + '</span></h2>';
    html += '<div class="meta">';
    html += '<span>服务器 <b>' + esc(b.host) + '</b></span>';
    html += '<span>版本 <b>' + esc(b.version) + '</b></span>';
    html += '<span>登录 <b>' + esc(b.auth) + '</b></span>';
    html += '<span>重连 <b>' + b.reconnects + ' 次</b></span>';
    html += '<span>上次在线 <b>' + fmtTime(b.lastOnline) + '</b></span></div>';
    if(b.lastEvent) html += '<p class="note warn">' + esc(b.lastEvent) + '</p>';
    if(b.auth === "offline" && b.host.indexOf("minehut") !== -1){
      html += '<p class="note">Minehut 强制正版验证，离线号进不去，要改 auth: microsoft 并用买过 Java 版的微软账号登录。</p>';
    }
    html += '</section>';
  });
  html += '</div>';
  document.getElementById("app").innerHTML = html;
}
load();
setInterval(load, 15000);
</script></body></html>`;

app.get('/', (req, res) => {
    res.type('html').send(DASHBOARD_HTML);
});

app.get('/api/status', (req, res) => {
    res.json({
        message: 'Minecraft Multi-AFK 容器正在运行中...',
        bots: bots.map(botStatus)
    });
});

app.get('/health', (req, res) => {
    res.json({ ok: true, botCount: bots.length });
});

// 出口 IP 自查：启动时查一次本机出口 IP（确认部署环境的 IP 归属与类型），失败不影响 bot 运行
// 注意：ip-api.com 免费版不支持 HTTPS，必须用 http://，否则会报 "SSL unavailable for this endpoint"
const http = require('http');
let egressIpInfo = null;
let egressIpFetching = false;
function fetchEgressIp() {
    if (egressIpFetching) return Promise.resolve();
    egressIpFetching = true;
    return new Promise((resolve) => {
        const req = http.get('http://ip-api.com/json/?fields=status,message,query,country,countryCode,regionName,city,isp,org,as,hosting,proxy,mobile', { timeout: 10000 }, (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => {
                try {
                    const j = JSON.parse(data);
                    if (j.status === 'success') {
                        egressIpInfo = j;
                        console.log('[出口IP]', j.query, j.country, j.regionName, j.city, '| ISP:', j.isp, '| 机房:', j.hosting, '代理:', j.proxy, '|', j.as);
                    } else {
                        console.log('[出口IP] 查询失败:', j.message || data);
                    }
                } catch (e) { console.log('[出口IP] 解析失败:', e.message); }
                egressIpFetching = false;
                resolve();
            });
        });
        req.on('timeout', () => { req.destroy(); console.log('[出口IP] 查询超时'); egressIpFetching = false; resolve(); });
        req.on('error', (e) => { console.log('[出口IP] 查询出错:', e.message); egressIpFetching = false; resolve(); });
    });
}
fetchEgressIp();

app.get('/ip', (req, res) => {
    if (egressIpInfo) return res.json(egressIpInfo);
    fetchEgressIp(); // 之前没查到时，访问 /ip 会再试一次
    res.json({ status: 'pending', message: '出口 IP 查询中，稍后刷新重试' });
});

app.listen(PORT, '0.0.0.0', () => console.log(`网页服务已成功绑定端口: ${PORT}`));

/**
 * ==================== 硬编码多账号（方式二） ====================
 * 如果没有设置环境变量 MC_BOTS / MC_HOST，就会使用这里的配置。
 * 直接在这个数组里添加或修改账号即可。
 */
const HARDCODED_BOTS = [
    {
        id: 'falixaaa',
        host: 'qawqaw.falixsrv.me',
        port: 25618,
        username: 'falixaaa',
        version: '1.21.11',
        auth: 'offline'
    },
    {
        id: 'falixbbb',
        host: 'falixbbb.falixsrv.me',
        port: 20015,
        username: 'falixbbb',
        version: '1.21.11',
        auth: 'offline'
    },
    // 继续往下加即可
];

/**
 * 解析多账号配置
 * 优先级：
 * 1. 环境变量 MC_BOTS = JSON 数组字符串（推荐）
 * 2. 旧版单账号环境变量：MC_HOST / MC_PORT / MC_USER / MC_VERSION / MC_AUTH
 * 3. 代码中的 HARDCODED_BOTS 硬编码列表
 */
function loadBotConfigs() {
    const configs = [];

    // 1. 优先使用 MC_BOTS JSON
    if (process.env.MC_BOTS) {
        try {
            const parsed = JSON.parse(process.env.MC_BOTS);
            if (Array.isArray(parsed)) {
                parsed.forEach((item, idx) => {
                    if (item.host && item.username) {
                        configs.push({
                            id: item.id || `bot-${idx + 1}`,
                            host: item.host,
                            port: parseInt(item.port) || 25565,
                            username: item.username,
                            version: item.version || '1.21.1',
                            auth: item.auth || 'offline' // offline / microsoft / mojang
                        });
                    }
                });
            }
        } catch (e) {
            console.error('[配置错误] MC_BOTS JSON 解析失败:', e.message);
        }
    }

    // 2. 兼容旧版单账号环境变量
    if (configs.length === 0) {
        const host = process.env.MC_HOST;
        const username = process.env.MC_USER || 'Container_Bot';
        if (host) {
            configs.push({
                id: 'bot-1',
                host: host,
                port: parseInt(process.env.MC_PORT) || 25565,
                username: username,
                version: process.env.MC_VERSION || '1.21.1',
                auth: process.env.MC_AUTH || 'offline'
            });
        }
    }

    // 3. 如果环境变量都没有，使用代码里硬编码的多账号
    if (configs.length === 0) {
        console.log('[配置] 未检测到环境变量，使用 HARDCODED_BOTS 硬编码账号列表');
        HARDCODED_BOTS.forEach((item, idx) => {
            if (item.host && item.username) {
                configs.push({
                    id: item.id || `bot-${idx + 1}`,
                    host: item.host,
                    port: parseInt(item.port) || 25565,
                    username: item.username,
                    version: item.version || '1.21.1',
                    auth: item.auth || 'offline'
                });
            }
        });
    }

    // 最终兜底（防止硬编码也空）
    if (configs.length === 0) {
        console.warn('[警告] 未检测到任何机器人配置，使用默认单账号示例。');
        configs.push({
            id: 'bot-1',
            host: 'localhost',
            port: 25565,
            username: 'Container_Bot',
            version: '1.21.1',
            auth: 'offline'
        });
    }

    return configs;
}

const botConfigs = loadBotConfigs();
console.log(`[配置] 共加载 ${botConfigs.length} 个账号:`);
botConfigs.forEach(c => console.log(`  - [${c.id}] ${c.username} @ ${c.host}:${c.port} (v${c.version})`));

// 每个 bot 的运行时状态
const bots = botConfigs.map(cfg => ({
    id: cfg.id,
    options: {
        host: cfg.host,
        port: cfg.port,
        username: cfg.username,
        version: cfg.version,
        auth: cfg.auth
    },
    activeBot: null,
    afkTimer: null,
    reconnectTimer: null,
    isReconnecting: false,
    lastOnline: null,
    lastEvent: '',
    reconnects: 0
}));

function cleanUp(botState) {
    if (botState.afkTimer) {
        clearInterval(botState.afkTimer);
        botState.afkTimer = null;
    }
    if (botState.reconnectTimer) {
        clearTimeout(botState.reconnectTimer);
        botState.reconnectTimer = null;
    }
    if (botState.activeBot) {
        try { botState.activeBot.quit(); } catch (e) {}
        botState.activeBot = null;
    }
}

function triggerReconnect(botState, delay) {
    if (botState.isReconnecting) return;
    botState.isReconnecting = true;
    botState.reconnects = (botState.reconnects || 0) + 1;

    cleanUp(botState);
    botState.reconnectTimer = setTimeout(() => {
        botState.isReconnecting = false;
        startBot(botState);
    }, delay);
}

function startBot(botState) {
    if (botState.isReconnecting) return;

    cleanUp(botState);
    const opts = botState.options;
    console.log(`[${botState.id}] [正在连接] ${opts.host}:${opts.port} 用户: ${opts.username}`);

    try {
        botState.activeBot = mineflayer.createBot(opts);
    } catch (err) {
        console.error(`[${botState.id}] [错误] 初始化失败:`, err.message);
        triggerReconnect(botState, 20000);
        return;
    }

    const bot = botState.activeBot;

    bot.on('spawn', () => {
        console.log(`[${botState.id}] [✔ 成功] ${bot.username} 已进入服务器。强化防挂机已启动。`);
        botState.isReconnecting = false;
        botState.lastOnline = Date.now();
        botState.lastEvent = '';

        if (botState.afkTimer) clearInterval(botState.afkTimer);

        // ==================== 强化防挂机 ====================
        botState.afkTimer = setInterval(() => {
            if (!botState.activeBot || !botState.activeBot.entity) return;

            try {
                // 1. 转视角
                const yaw = botState.activeBot.entity.yaw + (Math.random() * 0.8 - 0.4);
                const pitch = Math.max(-1.0, Math.min(1.0, botState.activeBot.entity.pitch + (Math.random() * 0.4 - 0.2)));
                botState.activeBot.look(yaw, pitch, true);

                // 2. 持续向前走一段时间（关键）
                botState.activeBot.setControlState('forward', true);
                botState.activeBot.setControlState('sprint', Math.random() > 0.6);

                const walkTime = 1200 + Math.random() * 600;
                setTimeout(() => {
                    if (botState.activeBot) {
                        botState.activeBot.setControlState('forward', false);
                        botState.activeBot.setControlState('sprint', false);
                    }
                }, walkTime);

                // 3. 偶尔跳跃
                if (Math.random() < 0.35) {
                    botState.activeBot.setControlState('jump', true);
                    setTimeout(() => {
                        if (botState.activeBot) botState.activeBot.setControlState('jump', false);
                    }, 80);
                }

                // 4. 偶尔挥手
                if (Math.random() < 0.4) {
                    botState.activeBot.swingArm('right');
                }

                console.log(`[${botState.id}] [DEBUG] 防挂机动作已执行（行走 ${Math.round(walkTime)}ms）`);
            } catch (err) {
                console.error(`[${botState.id}] [ERROR] 防挂机异常:`, err.message);
            }
        }, 18000 + Math.floor(Math.random() * 4000)); // 18~22 秒，错开不同 bot
    });

    bot.on('end', (reason) => {
        console.log(`[${botState.id}] [❌ 掉线] 原因: ${reason}`);
        botState.lastEvent = '掉线：' + String(reason);

        if (reason === 'socketClosed' || (typeof reason === 'string' && reason.includes('location'))) {
            console.log(`[${botState.id}] [网络保护] 将在 25 秒后重连...`);
            triggerReconnect(botState, 25000);
        } else {
            triggerReconnect(botState, 15000);
        }
    });

    bot.on('error', (err) => {
        console.error(`[${botState.id}] [⚠️ 网络错误]:`, err.message || err);
        botState.lastEvent = '网络错误：' + (err.message || err);
    });

    bot.on('kicked', (reason) => {
        console.warn(`[${botState.id}] [被踢出]`, reason);
        botState.lastEvent = '被踢出：' + String(reason);
    });
}

// 启动所有 bot，错开启动时间避免同时连接造成压力
bots.forEach((botState, index) => {
    const delay = 3000 + index * 2500; // 每个 bot 间隔 2.5 秒启动
    setTimeout(() => startBot(botState), delay);
});

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n正在关闭所有机器人...');
    bots.forEach(cleanUp);
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n收到 SIGTERM，正在关闭所有机器人...');
    bots.forEach(cleanUp);
    process.exit(0);
});
