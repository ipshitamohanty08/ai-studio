import React, { useState, useRef, useEffect } from 'react';
import { User, ChatMessage, ToolExecutionRecord } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Calendar,
  Layers,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface AIAssistantProps {
  user: User;
  onDataModified?: () => void;
  initialPrompt?: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  user,
  onDataModified,
  initialPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'agent',
      text: `Hello ${user.name}! I am CampusPulse AI, your academic event management agent. I can retrieve workshop details, verify seat counts, check and manage your event registrations, and automatically synchronize events with Google Calendar.\n\nHow can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setLoading(true);

    try {
      // Build conversation history for Gemini API
      const history = messages
        .filter((m) => m.sender !== 'system')
        .map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          parts: [{ text: m.text }],
        }));

      const response = await api.sendAgentMessage(text, history);

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolCalls: response.toolCalls as ToolExecutionRecord[],
      };

      setMessages((prev) => [...prev, agentMsg]);

      // If any state-modifying tools ran, refresh the parent views
      if (response.toolCalls && response.toolCalls.length > 0) {
        const mutatingTools = ['registerStudentForEvent', 'cancelRegistration', 'createEvent', 'updateEvent', 'deleteEvent'];
        const hasMutated = response.toolCalls.some((tc) => mutatingTools.includes(tc.name) && tc.status === 'success');
        if (hasMutated && onDataModified) {
          onDataModified();
        }
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'system',
        text: `Error processing request: ${err.message || 'Unable to connect to AI Agent service'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const toggleToolDetails = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const studentSamplePrompts = [
    'Register me for the AI workshop',
    'Am I registered for the business analytics workshop?',
    'Which AI workshops are happening this month?',
    'Show my registered events',
    'How many students have registered for the cloud seminar?',
    'Cancel my registration for the AI workshop',
  ];

  const adminSamplePrompts = [
    'Show the participant list for the workshop',
    'How many students are registered for the seminar?',
    'Which AI workshops are happening this month?',
    'Create a new workshop on Quantum Computing on 2026-11-05',
    'Show all upcoming workshops',
  ];

  const promptsToDisplay = user.role === 'admin' ? adminSamplePrompts : studentSamplePrompts;

  return (
    <div className="flex flex-col h-[750px] max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Agent Header */}
      <div className="bg-slate-850 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25 ring-1 ring-purple-400/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm text-white">CampusPulse AI Agent</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                Gemini 3.8 Flash • Real Tool Calling
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Role: <span className="font-semibold text-slate-300 uppercase">{user.role}</span> ({user.name})
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-300 font-medium">Tools Connected</span>
        </div>
      </div>

      {/* Suggested Prompts Strip */}
      <div className="bg-slate-950/60 px-4 py-2.5 border-b border-slate-800/80 overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-medium whitespace-nowrap">
          <span className="text-purple-400 font-semibold flex items-center space-x-1">
            <Sparkles className="w-3 h-3" /> <span>Prompt Ideas:</span>
          </span>
          {promptsToDisplay.map((p) => (
            <button
              key={p}
              onClick={() => handleSendMessage(p)}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 border border-slate-700/60 transition-colors cursor-pointer shrink-0"
            >
              "{p}"
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-950/30">
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          const isSystem = msg.sender === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{msg.text}</div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className="flex items-start space-x-2.5 max-w-[88%] sm:max-w-[80%]">
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className="space-y-2">
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-tl-none whitespace-pre-line'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Tool Execution Cards */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {msg.toolCalls.map((tc, tcIdx) => {
                        const toolKey = `${msg.id}-${tcIdx}`;
                        const isExpanded = !!expandedTools[toolKey];

                        return (
                          <div
                            key={toolKey}
                            className="rounded-xl border border-purple-900/60 bg-purple-950/30 overflow-hidden text-xs"
                          >
                            <button
                              onClick={() => toggleToolDetails(toolKey)}
                              className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-purple-900/20 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center space-x-2">
                                <Code2 className="w-3.5 h-3.5 text-purple-400" />
                                <span className="font-mono text-purple-200 font-semibold">
                                  ⚡ Executed Tool: <span className="text-white">{tc.name}()</span>
                                </span>
                                {tc.status === 'success' ? (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                    SUCCESS
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                                    FAILED
                                  </span>
                                )}
                              </div>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-purple-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-purple-400" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="px-3 py-2.5 bg-slate-900/80 border-t border-purple-900/40 space-y-2 font-mono text-[11px]">
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                                    Parameters:
                                  </span>
                                  <pre className="text-indigo-300 bg-slate-950 p-2 rounded overflow-x-auto">
                                    {JSON.stringify(tc.args, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                                    Backend / Database Result:
                                  </span>
                                  <pre className="text-emerald-300 bg-slate-950 p-2 rounded overflow-x-auto">
                                    {JSON.stringify(tc.result, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 px-1">
                    {msg.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-200 shrink-0 mt-1">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-3 text-xs text-purple-300 bg-purple-950/40 border border-purple-900/50 p-3.5 rounded-2xl w-fit animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
            <span>CampusPulse AI is reasoning, executing backend tools, and checking Firebase/Calendar...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder={
              user.role === 'admin'
                ? "Ask to inspect registrations, view rosters, or create workshops..."
                : "Ask about events, check your registrations, or say 'Register me for the AI workshop'..."
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
