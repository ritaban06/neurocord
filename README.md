# NeuroCord 

A production-ready Discord AI chatbot powered by **GROQ** (llama-3.1-8b-instant), built with **Express.js** and the **Discord Interactions API** (slash commands over HTTP — no WebSocket required).

```
/ask:Explain recursion simply
```

---

## How It Works

1. User types `/ask question:<anything>` in Discord
2. Discord sends an HTTP POST to your server's `/interactions` endpoint
3. The server immediately responds with a **deferred response** (type 5) → Discord shows "Bot is thinking…"
4. The server asynchronously calls **GROQ API** to get the AI response
5. The server PATCHes the original deferred message with the AI reply

This architecture means the server only needs to be alive when Discord is actively sending a request — perfect for Render free tier.

---

## Project Structure

```
neurocord/
├── src/
│   ├── index.js          # Express server & interaction router
│   ├── verify.js         # Discord request signature verification
│   ├── groq.js           # GROQ Chat Completions client
│   ├── discord.js        # Follow-up message helpers
│   └── commands/
│       └── ask.js        # /ask command handler
├── scripts/
│   └── register.js       # One-time slash command registration
├── .env.example          # Environment variable template
├── render.yaml           # Render deployment config
└── package.json
```

---

## Setup Guide

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → give it a name (e.g., "NeuroCord")
3. Navigate to **General Information** and copy your **Application ID** and **Public Key**
4. Navigate to **Bot** → click **Add Bot** → copy the **Bot Token**
5. Under **Bot** → **Privileged Gateway Intents**, enable what you need (none required for slash commands)

### 2. Get a GROQ API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up / log in → **API Keys** → **Create API Key**
3. Copy the key

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Fill in `.env`:

```
DISCORD_PUBLIC_KEY=<from Discord Developer Portal → General Information>
DISCORD_BOT_TOKEN=<from Discord Developer Portal → Bot>
DISCORD_APPLICATION_ID=<from Discord Developer Portal → General Information>
GROQ_API_KEY=<from console.groq.com>
PORT=3000
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Register the /ask Slash Command

Run this **once** to register the slash command with Discord:

```bash
npm run register
```

Output:
```
✅ Registered 1 command(s):
   /ask — Ask the AI anything!
```

> **Note:** Global commands can take up to 1 hour to propagate. For instant testing, add a `DISCORD_GUILD_ID` to `.env` and modify `scripts/register.js` to use the guild-scoped endpoint.

### 6. Run Locally (with ngrok)

```bash
npm start
# In another terminal:
npx ngrok http 3000
```

Copy the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`).

### 7. Set the Interactions Endpoint URL

1. In Discord Developer Portal → your app → **General Information**
2. Paste your URL + `/interactions` into **Interactions Endpoint URL**
   - e.g., `https://abc123.ngrok.io/interactions`
3. Click **Save Changes** — Discord will send a PING. If the endpoint is valid, it saves successfully.

---

## Deploy to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service** → connect your repo
3. Render auto-detects `render.yaml` and configures the service
4. In **Environment**, add your secret values:
   - `DISCORD_PUBLIC_KEY`
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_APPLICATION_ID`
   - `GROQ_API_KEY`
5. Deploy — copy your Render URL (e.g., `https://neurocord.onrender.com`)
6. Set **Interactions Endpoint URL** to `https://neurocord.onrender.com/interactions`

> **Render free tier note:** The service will sleep after 15 minutes of inactivity. It wakes automatically when Discord sends the next interaction — no keep-alive needed since Discord retries.

---

## Invite the Bot to Your Server

In Discord Developer Portal → **OAuth2** → **URL Generator**:
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Send Messages`

Copy the generated URL, open it in a browser, and add the bot to your server.

---

## Usage

```
/ask:What is the meaning of life?
/ask:Write a Python function to reverse a string
/ask:Explain quantum entanglement in simple terms
```
