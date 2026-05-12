import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  Check,
  Clipboard,
  Loader2,
  MessageSquareText,
  PanelRight,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import './styles.css';

const samplePrompt = '';

const purposeOptions = ['General', 'Writing', 'Coding', 'Research', 'Planning'];
const toneOptions = ['Natural', 'Professional', 'Friendly', 'Direct', 'Technical'];
const detailOptions = ['Concise', 'Balanced', 'Detailed'];

const defaultResult = {
  improvedPrompt:
    'Your optimised prompt will appear here. It will turn your rough idea into a clearer instruction with the right goal, context, format, constraints, and tone.',
  notes: [],
  includedElements: [],
  omittedElements: [],
  tokenUsage: null,
};

function App() {
  const requestCycle = useRef(0);
  const [input, setInput] = useState(samplePrompt);
  const [purpose, setPurpose] = useState('General');
  const [tone, setTone] = useState('Natural');
  const [detail, setDetail] = useState('Balanced');
  const [result, setResult] = useState(defaultResult);
  const [status, setStatus] = useState('idle');
  const [questionStatus, setQuestionStatus] = useState('idle');
  const [questions, setQuestions] = useState([]);
  const [questionAnalysis, setQuestionAnalysis] = useState([]);
  const [answers, setAnswers] = useState({});
  const [rightPanelMode, setRightPanelMode] = useState('result');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [model, setModel] = useState('configured model');

  const wordCount = useMemo(() => {
    return input.trim() ? input.trim().split(/\s+/).length : 0;
  }, [input]);

  const includedSet = new Set(result.includedElements || []);
  const promptElements = ['Role', 'Goal', 'Task', 'Context', 'Format', 'Constraints & Tone'];
  const hasGeneratedPrompt = Boolean(result.tokenUsage);
  const tokenLabel = result.tokenUsage?.returnedPromptTokens
    ? `${result.tokenUsage.returnedPromptTokens.toLocaleString('en-GB')} tokens`
    : null;

  useEffect(() => {
    let isMounted = true;

    fetch('/api/config')
      .then((response) => response.json())
      .then((data) => {
        if (isMounted && data.model) {
          setModel(data.model);
        }
      })
      .catch(() => {
        if (isMounted) {
          setModel('configured model');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function buildQuestions() {
    if (!input.trim()) {
      setError('Add a rough prompt before building questions.');
      return;
    }

    const requestId = ++requestCycle.current;
    setQuestionStatus('loading');
    setError('');
    setCopied(false);

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input, purpose, tone, detail }),
      });

      const data = await response.json();
      if (requestId !== requestCycle.current) {
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'The questions could not be generated.');
      }

      setQuestions(data.questions || []);
      setQuestionAnalysis(data.analysis || []);
      setAnswers({});
      setRightPanelMode('questions');
      setQuestionStatus('done');
    } catch (questionError) {
      if (requestId !== requestCycle.current) {
        return;
      }

      setError(questionError.message);
      setQuestionStatus('error');
    }
  }

  async function optimisePrompt() {
    if (!input.trim()) {
      setError('Add a rough prompt before optimising.');
      return;
    }

    const requestId = ++requestCycle.current;
    setStatus('loading');
    setError('');
    setCopied(false);

    try {
      const response = await fetch('/api/optimise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          purpose,
          tone,
          detail,
          answers: questions.map((question) => ({
            ...question,
            answer: answers[question.id] || '',
          })),
        }),
      });

      const data = await response.json();
      if (requestId !== requestCycle.current) {
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'The prompt could not be optimised.');
      }

      setResult(data);
      setRightPanelMode('result');
      setStatus('done');
    } catch (optimiseError) {
      if (requestId !== requestCycle.current) {
        return;
      }

      setError(optimiseError.message);
      setStatus('error');
    }
  }

  function resetPage() {
    requestCycle.current += 1;
    setInput(samplePrompt);
    setPurpose('General');
    setTone('Natural');
    setDetail('Balanced');
    setResult(defaultResult);
    setStatus('idle');
    setQuestionStatus('idle');
    setQuestions([]);
    setQuestionAnalysis([]);
    setAnswers({});
    setRightPanelMode('result');
    setError('');
    setCopied(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateAnswer(questionId, value) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: value,
    }));
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(result.improvedPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Application header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <img src="/prompt-optimiser-icon.png" alt="" />
          </span>
          <span>Prompt Optimiser</span>
        </div>
        <div className="status-strip">
          <span className="status-pill">
            <span className="dot" />
            OpenAI API
          </span>
          <span>Using {model}</span>
          {tokenLabel && <span>{tokenLabel}</span>}
        </div>
      </header>

      <section className="workspace" aria-label="Prompt optimiser workspace">
        <section className="editor-panel input-panel">
          <div className="panel-heading">
            <div>
              <p className="eyeline">Input</p>
              <h1>Initial Input</h1>
            </div>
            <span className="word-count">{wordCount} words</span>
          </div>

          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Paste your initial idea, rough instruction, or unfinished prompt here..."
            aria-label="Initial input"
          />

          <div className="control-grid" aria-label="Optimisation controls">
            <SelectControl label="Purpose" value={purpose} onChange={setPurpose} options={purposeOptions} />
            <SelectControl label="Tone" value={tone} onChange={setTone} options={toneOptions} />
            <SelectControl label="Detail" value={detail} onChange={setDetail} options={detailOptions} />
          </div>

          <div className="action-row">
            <button className="reset-button" type="button" onClick={resetPage}>
              <RotateCcw size={18} />
              Reset
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={buildQuestions}
              disabled={questionStatus === 'loading' || status === 'loading'}
            >
              {questionStatus === 'loading' ? <Loader2 className="spin" size={18} /> : <MessageSquareText size={18} />}
              Build Questions
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={optimisePrompt}
              disabled={status === 'loading' || questionStatus === 'loading'}
            >
              {status === 'loading' ? <Loader2 className="spin" size={18} /> : <WandSparkles size={18} />}
              Optimise Prompt
            </button>
          </div>

          {error && (
            <div className="error-box" role="alert">
              <AlertCircle size={17} />
              {error}
            </div>
          )}
        </section>

        {rightPanelMode === 'questions' ? (
          <section className="editor-panel result-panel question-workspace">
            <section className="question-panel" aria-label="Follow-up questions">
              <div className="question-heading">
                <div>
                  <p className="eyeline">Prompt Design</p>
                  <h2>Questions to Improve the Prompt</h2>
                </div>
              </div>

              {questionAnalysis.length > 0 && (
                <ul className="question-analysis">
                  {questionAnalysis.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}

              <div className="question-list">
                {questions.map((question) => (
                  <label className="question-item" key={question.id}>
                    <span className="question-meta">{question.element}</span>
                    <span className="question-text">{question.question}</span>
                    <textarea
                      className="answer-input"
                      value={answers[question.id] || ''}
                      onChange={(event) => updateAnswer(question.id, event.target.value)}
                      placeholder={question.placeholder || 'Add anything useful here...'}
                      aria-label={question.question}
                    />
                  </label>
                ))}
              </div>

              <div className="submit-row">
                <button
                  className="primary-button"
                  type="button"
                  onClick={optimisePrompt}
                  disabled={status === 'loading' || questionStatus === 'loading'}
                >
                  {status === 'loading' ? <Loader2 className="spin" size={18} /> : <WandSparkles size={18} />}
                  Submit Answers
                </button>
              </div>
            </section>
          </section>
        ) : (
          <section className="editor-panel result-panel">
          <div className="panel-heading">
            <div>
              <p className="eyeline">Output</p>
              <h2>Optimised Prompt</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={copyPrompt}
              disabled={!hasGeneratedPrompt}
              aria-label="Copy optimised prompt"
              title="Copy optimised prompt"
            >
              {copied ? <Check size={18} /> : <Clipboard size={18} />}
            </button>
          </div>

          <pre className={hasGeneratedPrompt ? 'output-box' : 'output-box placeholder-output'}>{result.improvedPrompt}</pre>

          {hasGeneratedPrompt && (
            <section className="analysis-card">
              <div className="analysis-title">
                <Sparkles size={16} />
                Prompt Elements
              </div>
              <div className="chip-row">
                {promptElements.map((element) => (
                  <span className={includedSet.has(element) ? 'chip active' : 'chip'} key={element}>
                    {includedSet.has(element) && <Check size={13} />}
                    {element}
                  </span>
                ))}
              </div>
            </section>
          )}

          {hasGeneratedPrompt && (
            <div className="notes-grid single">
              <section className="notes-panel">
                <div className="notes-title">
                  <PanelRight size={16} />
                  What Changed?
                </div>
                <ul>
                  {(result.notes || []).map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </section>
        )}
      </section>
    </main>
  );
}

function SelectControl({ label, value, onChange, options }) {
  return (
    <label className="select-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

createRoot(document.getElementById('root')).render(<App />);
