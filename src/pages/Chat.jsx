import { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const suggestedQuestions = [
    'What is the total yearly demand?',
    'Compare residential vs commercial usage.',
    'What will demand be in 5 years with 3% growth?',
    'Show scenario difference between 90L and 100L.',
  ];
  
  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage = { type: 'user', text: input };
    setMessages([...messages, userMessage]);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        type: 'ai',
        text: `Based on the current data, ${input.toLowerCase()} would result in approximately 95.2M L yearly demand with a 2% growth rate.`,
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
    
    setInput('');
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
          <p className="text-sm sm:text-base text-gray-600">Get answers from your dashboard data</p>
        </div>
        
        {messages.length === 0 && (
          <div className="mb-6 sm:mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 text-center font-medium">Try one of these questions:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInput(question)}
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
                className={`flex opacity-0 animate-fade-in ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
              >
                <div
                  className={`max-w-[85%] sm:max-w-md px-4 py-3 rounded-xl shadow-sm transition-shadow ${
                    msg.type === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-xs sm:text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about water demand..."
            className="flex-1 input-field min-w-0"
          />
          <button
            onClick={handleSend}
            className="btn-primary flex items-center gap-2 shrink-0"
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
