const express = require('express');
const cors = require('cors');
require('dotenv').config();
const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 3000;


// --------------------
// INIT GROQ
// --------------------
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// --------------------
// SIMPLE CORS (LOCAL DEV)
// --------------------
app.use(cors());              // allow all origins
app.options('*', cors());     // allow preflight requests

// --------------------
app.use(express.json());

// --------------------
// ROOT ROUTE (so no "Cannot GET /")
// --------------------
app.get('/', (req, res) => {
  res.send('✅ Backend is running');
});

// --------------------
// ESTIMATE CALORIES + PROTEIN
// --------------------
app.post('/estimate', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Meal description is required' });
    }

    const prompt = `
You are a nutrition expert.

Estimate TOTAL CALORIES and PROTEIN for this meal:
"${description}"

Rules:
- Protein must be in grams (number only)
- Calories must be numbers
- Be realistic
- Sum breakdown to totals

Return ONLY valid JSON.

JSON format:
{
  "totalCalories": number,
  "totalProtein": number,
  "confidence": "high" | "medium" | "low",
  "breakdown": [
    { "item": string, "calories": number, "protein": number }
  ]
}
`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 350
    });

    const text = completion.choices[0].message.content.trim();

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('Invalid AI response:', text);
      return res.status(500).json({ error: 'Invalid AI response format' });
    }

    const result = JSON.parse(match[0]);
    res.json(result);

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Estimation failed' });
  }
});

// --------------------
// HEALTH CHECK
// --------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend healthy' });
});

// --------------------
// START SERVER
// --------------------
app.listen(PORT, () => {
  console.log('--------------------------------');
  console.log('🚀 Backend running locally');
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`❤️  http://localhost:${PORT}/health`);
  console.log(`📮 POST http://localhost:${PORT}/estimate`);
  console.log('--------------------------------');
});
