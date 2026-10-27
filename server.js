require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const GUILD_ID = process.env.DISCORD_GUILD_ID || '1462764372219920511';
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const ROOT = __dirname;
const CONFIG_DIR = path.join(ROOT, 'config');

app.use(cors());
app.use(express.json());
app.use(express.static(ROOT, { extensions: ['html'] }));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.GuildMember, Partials.User]
});

let readyAt = null;
let lastError = null;

function readJson(fileName, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, fileName), 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function getTeamConfig() {
  const data = readJson('team.json', []);
  if (Array.isArray(data)) return data;
  return data.team || data.members || data.teamMembers || [];
}

function presenceIsOnline(member) {
  return member?.presence?.status && member.presence.status !== 'offline';
}

async function getGuild() {
  if (!client.isReady()) return null;
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return null;
  try {
    await guild.members.fetch({ withPresences: true });
  } catch (error) {
    // Keep cached members if Discord rejects a full fetch.
  }
  return guild;
}

async function buildStats() {
  const guild = await getGuild();
  if (!guild) {
    return {
      ready: false,
      members: null,
      online: null,
      guildName: null,
      guildIcon: null,
      updatedAt: new Date().toISOString(),
      error: lastError || 'Bot is not connected to the configured server.'
    };
  }

  const members = guild.memberCount ?? guild.members.cache.size;
  const online = guild.members.cache.filter(member => presenceIsOnline(member)).size;

  return {
    ready: true,
    members,
    online,
    guildName: guild.name,
    guildIcon: guild.iconURL({ extension: 'png', size: 256 }) || null,
    updatedAt: new Date().toISOString(),
    error: null
  };
}

async function buildTeam() {
  const configured = getTeamConfig();
  const guild = await getGuild();

  return Promise.all(configured.map(async member => {
    const id = String(member.id || member.discordId || '');
    let avatar = member.avatar || '';
    let username = member.name || 'ERROR MEMBER';
    let displayName = member.name || 'ERROR MEMBER';
    let profile = member.profile || (id ? `https://discord.com/users/${id}` : 'https://discord.com');

    if (guild && id) {
      try {
        const discordMember = await guild.members.fetch(id);
        username = discordMember.user.username || username;
        displayName = discordMember.displayName || discordMember.user.globalName || username || displayName;
        avatar = discordMember.displayAvatarURL({ extension: 'png', size: 256, forceStatic: false });
        profile = `https://discord.com/users/${id}`;
      } catch (error) {
        // Keep configured values if a member cannot be fetched.
      }
    }

    return {
      ...member,
      id,
      name: displayName,
      username,
      avatar,
      profile
    };
  }));
}

app.get('/api/health', async (req, res) => {
  res.json({
    ok: true,
    botReady: client.isReady(),
    guildId: GUILD_ID,
    readyAt,
    error: lastError
  });
});

app.get('/api/discord/stats', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await buildStats());
  } catch (error) {
    lastError = error.message;
    res.status(503).json({ ready: false, members: null, online: null, error: error.message });
  }
});

app.get('/api/team', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ ready: client.isReady(), members: await buildTeam() });
  } catch (error) {
    lastError = error.message;
    res.status(503).json({ ready: false, members: getTeamConfig(), error: error.message });
  }
});

app.get('/api/data', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const [stats, team] = await Promise.all([buildStats(), buildTeam()]);
    res.json({ stats, team });
  } catch (error) {
    lastError = error.message;
    res.status(503).json({ stats: { ready: false, members: null, online: null }, team: getTeamConfig(), error: error.message });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

client.once('ready', async () => {
  readyAt = new Date().toISOString();
  lastError = null;
  console.log(`[DISCORD] Logged in as ${client.user.tag}`);
  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) console.log(`[DISCORD] Connected to ${guild.name} (${guild.id})`);
  else console.warn(`[DISCORD] Bot is online but not connected to guild ${GUILD_ID}`);
});

client.on('error', error => {
  lastError = error.message;
  console.error('[DISCORD ERROR]', error);
});

process.on('unhandledRejection', error => {
  lastError = error?.message || String(error);
  console.error('[UNHANDLED]', error);
});

app.listen(PORT, () => {
  console.log(`[WEB] ERRORS LOUNGE running at http://localhost:${PORT}`);
  if (!TOKEN) console.warn('[SETUP] DISCORD_BOT_TOKEN is missing. Add it to .env before starting the bot connection.');
});

if (TOKEN) {
  client.login(TOKEN).catch(error => {
    lastError = error.message;
    console.error('[DISCORD LOGIN FAILED]', error.message);
  });
}
