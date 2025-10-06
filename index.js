const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { nanoid } = require('nanoid');
const db = require('./db');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

// create paste
app.post('/api/pastes', (req, res) => {
  const { title, content, privacy='public', password=null, expiresIn=null } = req.body;
  if(!content) return res.status(400).json({ error: 'content-required' });
  const id = nanoid(8);
  const now = Date.now();
  let expiresAt = null;
  if(expiresIn && typeof expiresIn === 'number') expiresAt = now + expiresIn;
  const stmt = db.prepare('INSERT INTO pastes (id,title,content,privacy,password,createdAt,expiresAt) VALUES (?,?,?,?,?,?,?)');
  stmt.run(id, title||'', content, privacy, password, now, expiresAt);
  res.json({ id, url: `/p/${id}` });
});

// get paste metadata
app.get('/api/pastes/:id', (req, res) => {
  const id = req.params.id;
  const stmt = db.prepare('SELECT id,title,privacy,createdAt,expiresAt FROM pastes WHERE id = ?');
  const row = stmt.get(id);
  if(!row) return res.status(404).json({ error:'not-found' });
  if(row.expiresAt && Date.now()>row.expiresAt) return res.status(410).json({ error:'expired' });
  res.json(row);
});

// view content (handles private)
app.get('/api/pastes/:id/view', (req, res) => {
  const id = req.params.id; const pw = req.query.pw || null;
  const stmt = db.prepare('SELECT * FROM pastes WHERE id = ?');
  const row = stmt.get(id);
  if(!row) return res.status(404).json({ error:'not-found' });
  if(row.expiresAt && Date.now()>row.expiresAt) return res.status(410).json({ error:'expired' });
  if(row.privacy === 'private'){
    if(!pw || pw !== row.password) return res.status(401).json({ error:'unauthorized' });
  }
  res.json({ id: row.id, title: row.title, content: row.content, createdAt: row.createdAt });
});

// simple public view page (server-side render minimal)
app.get('/p/:id', (req, res) => {
  const id = req.params.id;
  const stmt = db.prepare('SELECT id,title,content,privacy,createdAt,expiresAt FROM pastes WHERE id = ?');
  const row = stmt.get(id);
  if(!row) return res.status(404).send('Not found');
  if(row.expiresAt && Date.now()>row.expiresAt) return res.status(410).send('Expired');
  if(row.privacy === 'private'){
    // show a simple password form
    res.send(`<!doctype html><html><body><h3>Private paste</h3><form method="GET" action="/p/${id}/view"><input name="pw" placeholder="password"/><button>View</button></form></body></html>`);
    return;
  }
  res.send(`<!doctype html><html><head><meta charset="utf-8"></head><body><h2>${escapeHtml(row.title||'(no title)')}</h2><pre>${escapeHtml(row.content)}</pre></body></html>`);
});

app.get('/p/:id/view', (req, res) => {
  const id = req.params.id; const pw = req.query.pw || null;
  const stmt = db.prepare('SELECT * FROM pastes WHERE id = ?');
  const row = stmt.get(id);
  if(!row) return res.status(404).send('Not found');
  if(row.expiresAt && Date.now()>row.expiresAt) return res.status(410).send('Expired');
  if(row.privacy === 'private'){
    if(!pw || pw !== row.password) return res.status(401).send('Unauthorized');
  }
  res.send(`<!doctype html><html><head><meta charset="utf-8"></head><body><h2>${escapeHtml(row.title||'(no title)')}</h2><pre>${escapeHtml(row.content)}</pre></body></html>`);
});

function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log('Server running on', PORT));
