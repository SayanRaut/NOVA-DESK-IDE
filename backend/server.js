const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'reagen-super-secret-key-2026';
const MASTER_GEMINI_KEY = process.env.MASTER_GEMINI_KEY || ''; // The developer's master key
const DB_FILE = path.join(__dirname, 'db.json');

// Simple JSON Database
function getDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 0. Root Health Check (So you don't get "Cannot GET /" in the browser)
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Reagen AI Backend is up and running!' });
});

// 1. Mock Google OAuth Login UI
app.get('/auth/google/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sign in - Google Accounts</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f2f5; margin: 0; }
        .card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; color: #4285f4; margin-bottom: 8px; }
        h1 { font-size: 20px; color: #202124; font-weight: 400; margin-bottom: 24px; }
        input { width: 100%; padding: 12px; margin-bottom: 16px; border: 1px solid #dadce0; border-radius: 4px; box-sizing: border-box; font-size: 16px; }
        button { background: #1a73e8; color: white; border: none; padding: 10px 24px; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 8px; }
        button:hover { background: #1557b0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">G</div>
        <h1>Sign in to Reagen AI</h1>
        <p style="color: #5f6368; font-size: 14px; margin-bottom: 32px;">Choose an account to continue</p>
        <form action="/auth/google/callback" method="POST">
          <input type="email" name="email" placeholder="Email or phone" required>
          <input type="text" name="name" placeholder="Full Name (optional)">
          <div style="text-align: right;">
            <button type="submit">Next</button>
          </div>
        </form>
      </div>
    </body>
    </html>
  `);
});

// 2. Mock Google OAuth Callback
app.post('/auth/google/callback', express.urlencoded({ extended: true }), (req, res) => {
  const { email, name } = req.body;
  
  if (!email) return res.status(400).send('Email required');

  const db = getDb();
  
  if (!db.users[email]) {
    db.users[email] = {
      name: name || email.split('@')[0],
      email,
      credits: 100000,
      createdAt: new Date().toISOString()
    };
    saveDb(db);
  }

  const token = jwt.sign({ email, name: db.users[email].name }, JWT_SECRET, { expiresIn: '7d' });
  const userParam = encodeURIComponent(JSON.stringify(db.users[email]));
  
  // Redirect back to the Electron app using the custom protocol
  res.redirect(`reagen://auth?token=${token}&user=${userParam}`);
});

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden: Invalid token' });
    req.user = user;
    next();
  });
}

// 2. Chat Endpoint (Proxy to Gemini)
app.post('/api/chat', authenticateToken, async (req, res) => {
  const { messages, model, stream } = req.body;
  const email = req.user.email;
  const db = getDb();
  const user = db.users[email];

  if (!user || user.credits <= 0) {
    return res.status(402).json({ error: 'Insufficient credits. Please upgrade your plan.' });
  }

  if (!MASTER_GEMINI_KEY) {
    return res.status(500).json({ error: 'Backend misconfiguration: Master API key not set' });
  }

  // Format messages for Gemini
  const systemMsg = messages.find((m) => m.role === 'system');
  const nonSystemMsgs = messages.filter((m) => m.role !== 'system');

  const contents = nonSystemMsgs.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = { contents };
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const geminiModel = model || 'gemini-3.1-pro';
  const apiUrl = stream 
    ? `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${MASTER_GEMINI_KEY}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${MASTER_GEMINI_KEY}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    if (stream) {
      // Proxy SSE stream back to Electron
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // We'll estimate token usage for streams since Gemini doesn't always send it mid-stream
      let estimatedTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        estimatedTokens += Math.ceil(chunk.length / 4); // rough estimate: 4 chars per token
        res.write(chunk);
      }
      
      // Deduct credits
      user.credits = Math.max(0, user.credits - estimatedTokens);
      saveDb(db);
      
      res.end();
    } else {
      // Standard JSON response
      const data = await response.json();
      
      // Deduct exact tokens
      const totalTokens = data.usageMetadata?.totalTokenCount || 0;
      user.credits = Math.max(0, user.credits - totalTokens);
      saveDb(db);
      
      res.json(data);
    }
  } catch (error) {
    console.error('LLM Proxy Error:', error);
    res.status(500).json({ error: 'Internal server error while contacting AI provider' });
  }
});

// 3. User Profile Endpoint
app.get('/api/me', authenticateToken, (req, res) => {
  const db = getDb();
  const user = db.users[req.user.email];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Reagen AI Backend running on http://localhost:${PORT}`);
  console.log(`MASTER_GEMINI_KEY configured: ${!!MASTER_GEMINI_KEY}`);
});
