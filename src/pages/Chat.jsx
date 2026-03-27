import { useState, useCallback, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Send, Sparkles } from 'lucide-react';
import * as api from '../api/client';
import { ChatMarkdown } from '../components/ChatMarkdown';

const suggestedQuestions = [
  'What is the total estimated consumption for the neighborhood?',
  'Consumption by parcel type (residential, commercial, mixed-use)',
  'Growth projections: what will demand be in 5 years with 3% growth?',
  'Compare scenarios: 0.09 m³/c vs 0.1 m³/c per person per day.',
];

async function getAnswerForQuestion(question, growthRate = 2, years = 5) {
  const q = question.toLowerCase().trim();
  try {
    if (/\b(total|yearly|year|daily|monthly|demand|consumption|neighborhood|aggregate)\b/.test(q) && !/\b(by|per|type|parcel|residential|commercial|mixed)\b/.test(q)) {
      const [s90, s100] = await Promise.all([api.getSummary(90), api.getSummary(100)]);
      return `**Total estimated consumption (neighborhood):**\n• **0.09 m³/c scenario:** ${api.formatM3(s90.yearly)} yearly, ${api.formatM3(s90.daily)} daily. Population: ${s90.population.toLocaleString()}.\n• **0.1 m³/c scenario:** ${api.formatM3(s100.yearly)} yearly, ${api.formatM3(s100.daily)} daily.\n\nThese are aggregated from all parcels using the current parcel attributes and land-use coefficients.`;
    }

    if (/\b(parcel type|land use|land-use|residential|commercial|mixed|category|breakdown|compare.*usage)\b/.test(q)) {
      const { breakdown } = await api.getLandUseBreakdown();
      const lines = breakdown.map((b) => `• **${b.type}:** ${b.count} parcels, ${api.formatM3(b.consumption)}/year (${b.percentage}%)`).join('\n');
      return `**Consumption by parcel type:**\n${lines}\n\nThis shows how total demand is distributed across Residential, Commercial, and Mixed-use parcels.`;
    }

    if (/\b(growth|future|projection|forecast|year.*growth|5 year|predict)\b/.test(q)) {
      const match = q.match(/(\d+(?:\.\d+)?)\s*%\s*growth|growth\s*(\d+(?:\.\d+)?)/);
      const rate = match ? parseFloat(match[1] || match[2]) : growthRate;
      const { data } = await api.getForecast(rate, years);
      const last = data[data.length - 1];
      const first = data[0];
      return `**Demand forecast** (${rate}% annual growth, ${years}-year horizon):\n• **Year 0 (current):** 0.09 m³/c → ${api.formatM3(first?.year90)}, 0.1 m³/c → ${api.formatM3(first?.year100)}.\n• **Year ${years}:** 0.09 m³/c → ${api.formatM3(last?.year90)}, 0.1 m³/c → ${api.formatM3(last?.year100)}.\n\nThis assumes compound growth applied to current neighborhood consumption; it can reflect population growth and urban demand trends.`;
    }

    if (/\b(scenario|90\s*L|100\s*L|0\.09|0\.1|m³|90\s*vs|100\s*vs|compare.*scenario|difference)\b/.test(q)) {
      const res = await api.getScenarioComparison();
      const [a, b] = res.comparison;
      return `**Scenario comparison (yearly demand):**\n• **${a.name}:** ${api.formatM3(a.value)}\n• **${b.name}:** ${api.formatM3(b.value)}\n• **Difference:** ${api.formatM3(res.difference)} more per year under 0.1 m³/c.\n\nThis compares the two standard assumptions (0.09 m³/c vs 0.1 m³/c per person per day) for the current parcel data.`;
    }

    return `I can answer questions about:\n• **Total estimated consumption** (daily, monthly, yearly)\n• **Consumption by parcel type** (residential, commercial, mixed-use)\n• **Growth projections** (future demand with a given % growth)\n• **Scenario comparison** (0.09 m³/c vs 0.1 m³/c)\n\nTry one of the suggested questions or rephrase yours.`;
  } catch (err) {
    return `I couldn't load the latest data (${err.message}). Make sure you're logged in and the backend is running, then try again.`;
  }
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2" aria-hidden>
      <span className="chat-dot h-2 w-2 rounded-full bg-gray-400" />
      <span className="chat-dot h-2 w-2 rounded-full bg-gray-400" />
      <span className="chat-dot h-2 w-2 rounded-full bg-gray-400" />
    </div>
  );
}

const Chat = () => {
  const outletContext = useOutletContext() || {};
  const growthRate = outletContext.growthRate ?? 2;
  const projectionYears = outletContext.projectionYears ?? 5;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (textOverride) => {
      if (loading) return;
      const raw = textOverride !== undefined ? textOverride : input;
      const text = String(raw).trim();
      if (!text) return;

      const userMessage = { type: 'user', text };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setLoading(true);

      let answer;
      let usedFallback = false;
      try {
        const res = await api.chat(text, {
          growth_rate: growthRate,
          projection_years: projectionYears,
        });
        answer = res.reply || 'No reply from assistant.';
      } catch (err) {
        usedFallback = true;
        answer = await getAnswerForQuestion(text, growthRate, projectionYears);
      }
      const fallbackNotice = usedFallback
        ? '*Assistant unavailable — showing data from the dashboard.*\n\n'
        : '';
      setMessages((prev) => [...prev, { type: 'ai', text: fallbackNotice + answer }]);
      setLoading(false);
    },
    [input, growthRate, projectionYears, loading],
  );

  const handleSuggestedClick = (question) => {
    sendMessage(question);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-gray-50/80 to-white">
      <div className="shrink-0 border-b border-gray-200/70 bg-white/90 px-4 py-4 backdrop-blur-md sm:px-6 lg:pl-6 pl-16">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Water Demand Assistant</h2>
            <p className="text-xs text-gray-500">Answers use the same parcel data as your dashboard</p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {!hasMessages && (
            <div className="animate-fade-in-up space-y-8">
              <div className="rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">Ask about water consumption</h3>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-gray-600">
                  Totals by scenario, land use, growth forecasts, and comparisons — formatted clearly, like a conversation.
                </p>
              </div>
              <div>
                <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500">
                  Suggested questions
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestedClick(question)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasMessages && (
            <div className="flex flex-col gap-5 pb-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex w-full ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.type === 'user' ? (
                    <div className="max-w-[min(100%,28rem)] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-[13px] leading-relaxed text-white shadow-md shadow-blue-600/20 sm:text-sm">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="w-full max-w-[min(100%,40rem)]">
                      <p className="mb-1.5 text-xs font-medium text-gray-500">Assistant</p>
                      <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-gray-50/90 px-4 py-3 shadow-sm ring-1 ring-gray-100/80">
                        <ChatMarkdown>{msg.text}</ChatMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex w-full max-w-[min(100%,40rem)] flex-col">
                  <p className="mb-1.5 text-xs font-medium text-gray-500">Assistant</p>
                  <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-gray-50/90 px-5 py-3 shadow-sm ring-1 ring-gray-100/80">
                    <TypingIndicator />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200/80 bg-white/95 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50/80 p-1.5 pl-3 shadow-inner ring-1 ring-gray-100 focus-within:border-blue-300 focus-within:ring-blue-100">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey || loading) return;
              e.preventDefault();
              sendMessage();
            }}
            placeholder="Message…"
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-gray-400">
          Estimates from parcel data — not live meter readings.
        </p>
      </div>
    </div>
  );
};

export default Chat;
