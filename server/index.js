import dotenv from 'dotenv';
import express from 'express';
import { encodingForModel, getEncoding } from 'js-tiktoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '127.0.0.1';
const encodingCache = new Map();

app.use(express.json({ limit: '64kb' }));

app.get('/api/config', (_req, res) => {
  res.json({
    model: getModel(),
  });
});

app.post('/api/optimise', async (req, res) => {
  const { prompt, purpose = 'General', tone = 'Natural', detail = 'Balanced', answers = [] } = req.body || {};

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is missing from the environment.' });
  }

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Please provide a rough prompt to optimise.' });
  }

  try {
    const result = await optimisePrompt({ prompt, purpose, tone, detail, answers });
    return res.json(result);
  } catch (error) {
    console.error('Prompt optimisation failed:', error);
    return res.status(500).json({
      error: 'The OpenAI request failed. Check your API key, model, and network access.',
    });
  }
});

app.post('/api/questions', async (req, res) => {
  const { prompt, purpose = 'General', tone = 'Natural', detail = 'Balanced' } = req.body || {};

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is missing from the environment.' });
  }

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Please provide a rough prompt before asking questions.' });
  }

  try {
    const result = await generateQuestions({ prompt, purpose, tone, detail });
    return res.json(result);
  } catch (error) {
    console.error('Question generation failed:', error);
    return res.status(500).json({
      error: 'The OpenAI request failed. Check your API key, model, and network access.',
    });
  }
});

app.use(express.static(path.join(rootDir, 'dist')));

app.get('*splat', (_req, res) => {
  res.sendFile(path.join(rootDir, 'dist', 'index.html'));
});

const server = app.listen(port, host, () => {
  console.log(`Prompt Optimiser running on http://${host}:${port}`);
});

server.ref();

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

async function generateQuestions({ prompt, purpose, tone, detail }) {
  const response = await callResponsesApi({
    systemText: `You help users improve rough prompts by asking useful questions before rewriting them.

Principles:
- Prefer clear task design over persona prompting.
- Ask only questions that would materially improve the final prompt.
- Focus on Goal, Task, Context, Format, Constraints & Tone, and useful review checks.
- If the rough prompt is already clear, ask fewer questions.
- Keep the wording plain and practical.
- Use British English.

Return only valid JSON with this shape:
{
  "questions": [
    {
      "id": "short-kebab-case-id",
      "element": "Goal" | "Task" | "Context" | "Format" | "Constraints & Tone" | "Checks",
      "question": "string",
      "placeholder": "string",
      "required": true
    }
  ],
  "analysis": ["string"]
}`,
    userText: `Purpose: ${purpose}
Tone: ${tone}
Detail level: ${detail}

Rough prompt:
${prompt}`,
  });

  const text = extractResponseText(response);
  const parsed = parseJsonResult(text);
  const questions = normaliseQuestions(parsed.questions);

  return {
    questions,
    analysis: normaliseStringArray(parsed.analysis).slice(0, 4),
    tokenUsage: normaliseTokenUsage(response.usage),
  };
}

async function optimisePrompt({ prompt, purpose, tone, detail, answers }) {
  const usefulAnswers = normaliseAnswers(answers);
  const answerText = usefulAnswers.length
    ? usefulAnswers.map((answer) => `${answer.element} - ${answer.question}\n${answer.answer}`).join('\n\n')
    : 'No follow-up answers were provided.';

  const response = await callResponsesApi({
    systemText: `You optimise prompts using modern prompt design.

Principles:
- Prefer clear task framing over vague persona prompting.
- Include Role only when it materially improves style, perspective, or audience framing.
- Include Goal, Task, Context, Format, and Constraints & Tone only when useful for the prompt's complexity, ambiguity, and required precision.
- Preserve the user's intent.
- Treat follow-up answers as the user's source of truth.
- Increase clarity and specificity.
- Remove ambiguity.
- Keep simple prompts concise.
- Avoid magic incantations and over-engineering.
- Ask for concise method, checks, assumptions, or verification only when useful.
- Use British English.

Return only valid JSON with this shape:
{
  "improvedPrompt": "string",
  "notes": ["string"],
  "includedElements": ["Role" | "Goal" | "Task" | "Context" | "Format" | "Constraints & Tone"],
  "omittedElements": ["Role" | "Goal" | "Task" | "Context" | "Format" | "Constraints & Tone"]
}`,
    userText: `Purpose: ${purpose}
Tone: ${tone}
Detail level: ${detail}

Rough prompt:
${prompt}

Follow-up answers:
${answerText}`,
  });

  const text = extractResponseText(response);
  const parsed = parseJsonResult(text);
  const improvedPrompt = normaliseString(parsed.improvedPrompt);

  return {
    improvedPrompt,
    notes: normaliseStringArray(parsed.notes).slice(0, 6),
    includedElements: filterElements(parsed.includedElements),
    omittedElements: filterElements(parsed.omittedElements),
    tokenUsage: {
      ...normaliseTokenUsage(response.usage),
      returnedPromptTokens: countTokensForModel(improvedPrompt, getModel()),
    },
  };
}

async function callResponsesApi({ systemText, userText }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getModel(),
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: systemText,
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: userText,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

function getModel() {
  return process.env.OPENAI_MODEL || 'gpt-4.1-mini';
}

function extractResponseText(payload) {
  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  const textParts = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') {
        textParts.push(content.text);
      }
    }
  }
  return textParts.join('\n').trim();
}

function parseJsonResult(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('The model did not return JSON.');
    }
    return JSON.parse(match[0]);
  }
}

function normaliseString(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('The model response was missing an improved prompt.');
  }
  return value.trim();
}

function normaliseStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
}

function normaliseQuestions(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => ({
      id: slugOrFallback(item?.id, `question-${index + 1}`),
      element: allowedQuestionElement(item?.element),
      question: typeof item?.question === 'string' ? item.question.trim() : '',
      placeholder: typeof item?.placeholder === 'string' ? item.placeholder.trim() : '',
      required: item?.required !== false,
    }))
    .filter((item) => item.question)
    .slice(0, 7);
}

function normaliseAnswers(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      element: allowedQuestionElement(item?.element),
      question: typeof item?.question === 'string' ? item.question.trim() : '',
      answer: typeof item?.answer === 'string' ? item.answer.trim() : '',
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 12);
}

function allowedQuestionElement(value) {
  const allowed = ['Goal', 'Task', 'Context', 'Format', 'Constraints & Tone', 'Checks'];
  return allowed.includes(value) ? value : 'Context';
}

function slugOrFallback(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || fallback;
}

function filterElements(value) {
  const allowed = ['Role', 'Goal', 'Task', 'Context', 'Format', 'Constraints & Tone'];
  return normaliseStringArray(value).filter((item) => allowed.includes(item));
}

function normaliseTokenUsage(usage) {
  if (!usage || typeof usage !== 'object') {
    return {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
    };
  }

  return {
    inputTokens: numberOrNull(usage.input_tokens),
    outputTokens: numberOrNull(usage.output_tokens),
    totalTokens: numberOrNull(usage.total_tokens),
  };
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function countTokensForModel(text, model) {
  const encoding = getEncodingForModel(model);
  return encoding.encode(text).length;
}

function getEncodingForModel(model) {
  const cacheKey = model || 'o200k_base';
  if (!encodingCache.has(cacheKey)) {
    try {
      encodingCache.set(cacheKey, encodingForModel(cacheKey));
    } catch {
      encodingCache.set(cacheKey, getEncoding('o200k_base'));
    }
  }

  return encodingCache.get(cacheKey);
}
