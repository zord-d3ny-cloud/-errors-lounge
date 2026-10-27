ERRORS LOUNGE — LIVE DISCORD WEBSITE
====================================

This version includes a small Node/Express backend that connects to your Discord bot.
It provides:
- Live guild member count from the bot-connected server
- Live online member count from Discord presences
- Real Discord team avatars for configured Discord IDs
- Automatic website refresh every 10 seconds
- Existing editable JSON config files for team, games, events, rules and achievements

IMPORTANT SECURITY
------------------
NEVER paste your Discord bot token into chat, HTML, JavaScript, GitHub, or the config folder.
The token belongs only in the local .env file.
If a token was previously exposed, reset it in the Discord Developer Portal first.

SETUP
-----
1. Install Node.js 20+.
2. Open this folder in VS Code / Terminal.
3. Run:
   npm install
4. Create a file named .env in this same folder.
5. Copy the contents of .env.example into .env.
6. Replace PASTE_YOUR_NEW_BOT_TOKEN_HERE with your NEW bot token.
7. Keep DISCORD_GUILD_ID as 1462764372219920511 unless your server changes.
8. Run:
   npm start
9. Open:
   http://localhost:3000

DISCORD BOT SETTINGS
--------------------
The bot must be added to the ERRORS LOUNGE server.
Enable these Privileged Gateway Intents in Discord Developer Portal > Bot:
- SERVER MEMBERS INTENT
- PRESENCE INTENT

The bot only needs normal server access to read members/presences.
Do not give it Administrator just for this website.

CONFIG EDITING
--------------
Edit these files without changing website code:
- config/team.json
- config/games.json
- config/events.json
- config/rules.json
- config/achievements.json

After saving a config file, refresh the page if needed. The frontend also polls the JSON config files.

TEAM AVATARS
------------
Team members are matched by Discord ID from config/team.json.
When the bot can fetch that member, the site uses the member's real current Discord avatar.
If a member is not found, the configured avatar/default fallback is used.

LIVE STATS
----------
The website calls the local backend at /api/discord/stats.
The backend asks the Discord bot for the current guild data, so no public Discord token is exposed to the browser.

PRODUCTION
----------
For production hosting, run this Node app on a server/VPS and keep .env private.
Do not upload .env or node_modules.
