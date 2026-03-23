import { useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Send, MessageSquare } from 'lucide-react';
import * as api from '../api/client';

const suggestedQuestions = [
  'What is the total estimated consumption for the neighborhood?',
  'Consumption by parcel type (residential, commercial, mixed-use)',
  'Growth projections: what will demand be in 5 years with 3% growth?',
  'Compare scenarios: 0.09 m³/c vs 0.1 m³/c per person per day.',
];

/**
 * Build an answer from analytics data based on the user's question (keyword-style).
 * Uses real API data so the chatbot answers from the same data as the dashboard.
 */
async function getAnswerForQuestion(question, growthRate = 2, years = 5) {
  const q = question.toLowerCase().trim();
  try {
    // Total estimated consumption
    if (/\b(total|yearly|year|daily|monthly|demand|consumption|neighborhood|aggregate)\b/.test(q) && !/\b(by|per|type|parcel|residential|commercial|mixed)\b/.test(q)) {
      const [s90, s100] = await Promise.all([api.getSummary(90), api.getSummary(100)]);
      return `**Total estimated consumption (neighborhood):**\n• **0.09 m³/c scenario:** ${api.formatM3(s90.yearly)} yearly, ${api.formatM3(s90.daily)} daily. Population: ${s90.population.toLocaleString()}.\n• **0.1 m³/c scenario:** ${api.formatM3(s100.yearly)} yearly, ${api.formatM3(s100.daily)} daily.\n\nThese are aggregated from all parcels using the current parcel attributes and land-use coefficients.`;
    }

    // Consumption by parcel type / land use
    if (/\b(parcel type|land use|land-use|residential|commercial|mixed|category|breakdown|compare.*usage)\b/.test(q)) {
      const { breakdown } = await api.getLandUseBreakdown();
      const lines = breakdown.map((b) => `• **${b.type}:** ${b.count} parcels, ${api.formatM3(b.consumption)}/year (${b.percentage}%)`).join('\n');
      return `**Consumption by parcel type:**\n${lines}\n\nThis shows how total demand is distributed across Residential, Commercial, and Mixed-use parcels.`;
    }

    // Growth projections / future demand
    if (/\b(growth|future|projection|forecast|year.*growth|5 year|predict)\b/.test(q)) {
      const match = q.match(/(\d+(?:\.\d+)?)\s*%\s*growth|growth\s*(\d+(?:\.\d+)?)/);
      const rate = match ? parseFloat(match[1] || match[2]) : growthRate;
      const { data } = await api.getForecast(rate, years);
      const last = data[data.length - 1];
      const first = data[0];
      return `**Demand forecast** (${rate}% annual growth, ${years}-year horizon):\n• **Year 0 (current):** 0.09 m³/c → ${api.formatM3(first?.year90)}, 0.1 m³/c → ${api.formatM3(first?.year100)}.\n• **Year ${years}:** 0.09 m³/c → ${api.formatM3(last?.year90)}, 0.1 m³/c → ${api.formatM3(last?.year100)}.\n\nThis assumes compound growth applied to current neighborhood consumption; it can reflect population growth and urban demand trends.`;
    }

    // Scenario comparison (0.09 vs 0.1 m³/c)
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

const Chat = () => {
  const outletContext = useOutletContext() || {};
  const growthRate = outletContext.growthRate ?? 2;
  const projectionYears = outletContext.projectionYears ?? 5;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;

    const userMessage = { type: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    let answer;
    let usedFallback = false;
    try {
      const res = await api.chat(text);
      answer = res.reply || 'No reply from assistant.';
    } catch (err) {
      // Chat API not configured (503) or OpenAI error (502): use keyword-based answers
      usedFallback = true;
      answer = await getAnswerForQuestion(text, growthRate, projectionYears);
    }
    const fallbackNotice = usedFallback
      ? '*(Assistant unavailable — answer from dashboard data.)*\n\n'
      : '';
    setMessages((prev) => [...prev, { type: 'ai', text: fallbackNotice + answer }]);
    setLoading(false);
  }, [input, growthRate, projectionYears]);

  const handleSuggestedClick = (question) => {
    setInput(question);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 pt-6 pb-4 bg-white/90 backdrop-blur-md border-b border-gray-200/60 lg:pl-6 pl-16 animate-fade-in">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Water Demand Assistant
        </h2>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-auto">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-6 sm:mb-8 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg transition-transform hover:scale-105">
              <MessageSquare className="text-white" size={32} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
              Ask questions about water consumption
            </h2>
            <p className="text-sm sm:text-base text-gray-600">Ask about total consumption, consumption by parcel type, growth projections, and scenario comparisons — answers use the same data as the dashboard.</p>
          </div>

          {messages.length === 0 && (
            <div className="mb-6 sm:mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 text-center font-medium">Try one of these questions:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedClick(question)}
                    className="p-4 bg-white border border-gray-200 rounded-xl text-left hover:border-blue-500 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 text-xs sm:text-sm text-gray-700 font-medium"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="mb-6 space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-md px-4 py-3 rounded-xl shadow-sm transition-shadow ${
                      msg.type === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    {msg.type === 'ai' && typeof msg.text === 'string' && msg.text.includes('**') ? (
                      <div className="text-xs sm:text-sm whitespace-pre-wrap prose prose-sm max-w-none">
                        {msg.text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                          part.startsWith('**') && part.endsWith('**') ? (
                            <strong key={i}>{part.slice(2, -2)}</strong>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm">Loading data…</div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about total demand, parcel types, growth, or scenarios..."
              className="flex-1 input-field min-w-0"
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="btn-primary flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              <Send size={18} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
