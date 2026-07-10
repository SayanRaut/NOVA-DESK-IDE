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

// 1. Mock Google OAuth Login
app.post('/auth/google', (req, res) => {
  // In a real app, you would verify the Google ID token here.
  // For this implementation, we simulate successful login.
  const { email, name } = req.body;
  
  if (!email) return res.status(400).json({ error: 'Email required' });

  const db = getDb();
  
  // Create user and give 100,000 free tokens if they don't exist
  if (!db.users[email]) {
    db.users[email] = {
      name: name || email.split('@')[0],
      email,
      credits: 100000, // 100k free tokens
      createdAt: new Date().toISOString()
    };
    saveDb(db);
  }

  // Generate JWT token
  const token = jwt.sign({ email, name: db.users[email].name }, JWT_SECRET, { expiresIn: '7d' });
  
  res.json({
    token,
    user: db.users[email]
  });
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
