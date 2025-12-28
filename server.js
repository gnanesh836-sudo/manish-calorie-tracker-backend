const express = require('express');
const cors = require('cors');
require('dotenv').config();
const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.use(cors());
app.use(express.json());

// --------------------
// ESTIMATE CALORIES (GROQ)
// --------------------
app.post('/estimate', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Meal description is required' });
    }

    const prompt = `
You are a nutrition expert.

Estimate calories for the meal:
"${description}"

Return ONLY valid JSON.
No explanations.
No extra text.

JSON format:
{
  "totalCalories": number,
  "confidence": "high|medium|low",
  "breakdown": [
    {"item": string, "calories": number}
  ]
}
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 300
    });

    const text = completion.choices[0].message.content.trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Invalid Groq response:', text);
      return res.status(500).json({ error: 'Invalid response format from Groq' });
    }

    const result = JSON.parse(jsonMatch[0]);

    if (
      typeof result.totalCalories !== 'number' ||
      !result.confidence ||
      !Array.isArray(result.breakdown)
    ) {
      return res.status(500).json({ error: 'Invalid calorie estimate structure' });
    }

    res.json(result);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Groq estimation failed' });
  }
});

// --------------------
// HEALTH CHECK
// --------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server running with Groq AI' });
});

// --------------------
// START SERVER
// --------------------
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`POST http://localhost:${PORT}/estimate`);
  console.log(`GET  http://localhost:${PORT}/health`);
  console.log('Using Groq AI (cloud, free tier)');
});
