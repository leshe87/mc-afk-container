# mc-afk-container（从聊天记录重建）

## 文件清单

| 文件 | 作用 | 用法 |
|---|---|---|
| `Dockerfile` | 容器定义（后补的辅助文件，原仓库里未必长这样）：node:20-slim，装依赖、拷 index.js、开 3000 端口、跑 `node index.js` | `docker build -t mc-afk . && docker run -p 3000:3000 mc-afk` |
| `README.md` | 本文件：来源说明（从聊天记录重建）、内容、已知待修、运行方法 | 阅读 |
| `index.js` | 主程序：Express + mineflayer 多账号 AFK 机器人（从聊天记录逐字恢复，已过 `node --check`）；2 个 bot，版本 1.21.11，18~22 秒做一次防挂机动作，`/` 看状态、`/health` 看数量 | `npm install` 后 `node index.js`；配置用环境变量 MC_BOTS（JSON）或文件里的 HARDCODED_BOTS |
| `package.json` | Node 依赖与启动脚本：express、minecraft-data、mineflayer；`start` 跑 `node index.js` | `npm install` 装依赖；`npm start` 启动 |

GitHub 账号 paowuer87 被暂停，仓库 mc-afk-container 线上打不开，本机也没有副本。
这里的 `index.js` 是从 2026-11-15 主聊天里你贴出的代码逐字恢复的，
`package.json` 和 `Dockerfile` 是后补的辅助文件，原仓库里未必长这样。

## 内容

- `index.js` — Express + mineflayer 多账号 AFK 机器人（逐字恢复，已过 `node --check`）
  - 2 个 bot：falixaaa @ qawqaw.falixsrv.me:25618、falixbbb @ falixbbb.falixsrv.me:21813
  - 版本 1.21.11，`auth: 'offline'`；旧版 minecraft-data 没有 1.21.11 时用 1.21.4 垫片
  - 配置优先级：环境变量 `MC_BOTS`（JSON）> 旧版单账号变量 > `HARDCODED_BOTS`
  - 网页状态：`/` 看各 bot 在线状态，`/health` 看数量；18~22 秒做一次防挂机动作
- `package.json`、`Dockerfile` — 后补的，不保证和原仓库一致，版本请按实际环境钉死

## 已知待修（恢复时没改，保持原样）

- minehut 那个 bot：对外端口应改成 **25565**（25575 只是 Paper 本机监听端口，
  TCPShield 对外只开 25565），且 Minehut 强制正版验证，`auth: 'offline'` 进不去，
  要改 `auth: 'microsoft'` 并用买过 Minecraft Java 版的微软账号登一次。
  买正版小号 / 订 PC Game Pass 二选一，未定；不要用共享号。
- 新版 minecraft-data 已原生支持 1.21.11，装新版的话垫片可以删掉。

## 运行

```bash
npm install
node index.js
```

或用 Docker：`docker build -t mc-afk . && docker run -p 3000:3000 mc-afk`。
