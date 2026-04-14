import { Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAgentSet, getAllAgents } from '../data/agents';
import { USER_COLOR, USER_COLOR_LIGHT, USER_COLOR_SOFT } from '../theme/brand';
import { useCoreStore } from '../integration/store/coreStore';
import { useTeamStore, useActiveTeam } from '../integration/store/teamStore';
import { useUiStore } from '../integration/store/uiStore';
import { useSceneManager } from '../simulation/SceneContext';
import { Avatar } from './components/Avatar';
import { AuditModal } from './AuditModal';
import { FileSearch } from 'lucide-react';

type PromptPreset = {
  id: string
  label: string
  text: string
  stage: 'setup' | 'tailoring' | 'verification' | 'discovery' | 'interview' | 'general'
}

const DIRECTOR_PROMPT_DICTIONARY: PromptPreset[] = [
  { id: 'setup-1', label: 'Kickoff Plan', text: 'Give me a strict step-by-step plan for this resume-to-application process.', stage: 'setup' },
  { id: 'setup-2', label: 'Missing Inputs', text: 'What exact inputs are still missing before we can run a high-quality optimization?', stage: 'setup' },
  { id: 'setup-3', label: 'Role Fit Check', text: 'Based on my current profile, which role tier should I target right now and why?', stage: 'setup' },
  { id: 'tailor-1', label: 'Bullet Rewrite', text: 'Rewrite my top 5 bullets to maximize technical credibility and measurable impact.', stage: 'tailoring' },
  { id: 'tailor-2', label: 'ATS Gaps', text: 'Identify ATS gaps between my resume and JD, then suggest exact phrase-level fixes.', stage: 'tailoring' },
  { id: 'tailor-3', label: 'Summary Upgrade', text: 'Draft a stronger professional summary aligned to this target JD.', stage: 'tailoring' },
  { id: 'tailor-4', label: 'Keyword Cluster', text: 'Give me a prioritized JD keyword cluster and where to place each keyword naturally.', stage: 'tailoring' },
  { id: 'verify-1', label: 'Proof-of-Work', text: 'List the weakest technical claims and tell me what proof each one needs.', stage: 'verification' },
  { id: 'verify-2', label: 'Evidence Links', text: 'What GitHub or project evidence should I add to make my claims defensible?', stage: 'verification' },
  { id: 'verify-3', label: 'Credibility Risk', text: 'Which statements sound generic or inflated, and how should we fix them?', stage: 'verification' },
  { id: 'discover-1', label: 'Prime Targets', text: 'Use Nexus-Hunter logic: suggest top 3 Prime Targets with Blue Ocean priority.', stage: 'discovery' },
  { id: 'discover-2', label: 'Apply Order', text: 'In what order should I apply to maximize interview conversion this week?', stage: 'discovery' },
  { id: 'discover-3', label: 'Hidden Fits', text: 'Find hidden-fit role types where my project depth gives unusual advantage.', stage: 'discovery' },
  { id: 'interview-1', label: 'Mock Drill', text: 'Give me 3 hard interviewer questions based on likely weak points in my profile.', stage: 'interview' },
  { id: 'interview-2', label: 'Trade-off Story', text: 'Help me craft one strong architecture trade-off story for interviews.', stage: 'interview' },
  { id: 'interview-3', label: '90-sec Pitch', text: 'Write a 90-second technical self-intro tuned for this role.', stage: 'interview' },
  { id: 'general-1', label: 'What Next', text: 'What should I do next right now, in order, with no fluff?', stage: 'general' },
  { id: 'general-2', label: 'Risk Audit', text: 'Give me a candid risk audit of my current application package.', stage: 'general' },
  { id: 'general-3', label: 'Final Review', text: 'Before applying, do one final quality review and list top 5 fixes.', stage: 'general' },
]

const ChatPanel: React.FC = () => {
  const {
    isChatting,
    isThinking,
    selectedNpcIndex,
    setIsTyping,
    setActiveAuditTaskId
  } = useUiStore();
  const scene = useSceneManager();
  const activeTeam = useActiveTeam();
  const agents = getAllAgents(activeTeam);
  const selectedAgentSetId = activeTeam.id;

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stopTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const agent = selectedNpcIndex !== null ? agents.find(a => a.index === selectedNpcIndex) ?? null : null;

  // Combine store messages with project histories if needed,
  // but unified useCoreStore is the source of truth for history.
  const coreStore = useCoreStore();
  const processStage: PromptPreset['stage'] = !coreStore.currentResume.content.trim()
    ? 'setup'
    : !coreStore.hasResumeAnalysis
      ? 'tailoring'
      : coreStore.discoveredJobs.length === 0
        ? 'discovery'
        : coreStore.nexusMirrorItems.length === 0
          ? 'interview'
          : 'general'

  const suggestedPrompts = DIRECTOR_PROMPT_DICTIONARY
    .filter((p) => p.stage === processStage || p.stage === 'general')
    .slice(0, 8)
  const chatMessages = selectedNpcIndex !== null
    ? (coreStore.agentHistories[selectedNpcIndex] || [])
    : [];


  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isThinking, isChatting]);

  useEffect(() => {
    // Initial scroll when chat opens
    if (isChatting && scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    }
  }, [isChatting]);

  const simulateTyping = (text: string) => {
    let currentIndex = 0;
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

    setIsTyping(true);

    typingIntervalRef.current = setInterval(() => {
      if (currentIndex < text.length) {
        const char = text[currentIndex];
        setInput((prev) => prev + char);
        currentIndex++;
      } else {
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        setIsTyping(false);
      }
    }, 20); // 20ms per character for a natural feel
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    // simulateTyping(pastedText);
    setInput(pastedText);
  };

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
    setIsTyping(false);

    const text = input;
    setInput('');
    await scene?.sendMessage(text);
  };

  if (!isChatting || !agent) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden shrink-0 pointer-events-auto">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-1 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none"
      >
        {chatMessages.filter(msg => !msg.metadata?.internal).map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} max-w-[90%]`}>
              {/* Avatar / Icon */}
              <div className="shrink-0 mt-1">
                {msg.role === 'assistant' ? (
                  <Avatar type={agent?.index === activeTeam.leadAgent.index ? 'lead' : 'sub'} color={agent?.color} size={32} />
                ) : (
                  <Avatar type="user" color={USER_COLOR} size={32} />
                )}
              </div>

              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-2.5 rounded-[20px] text-[14px] leading-relaxed shadow-sm border ${msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'
                    }`}
                  style={msg.role === 'user' ? {
                    backgroundColor: USER_COLOR_LIGHT,
                    borderColor: USER_COLOR_SOFT,
                    color: '#27272a' // text-darkDelegation
                  } : {
                    backgroundColor: '#fafafa', // bg-zinc-50
                    borderColor: '#f4f4f5', // border-zinc-100
                    color: '#27272a' // text-darkDelegation
                  }}
                >
                  {msg.role === 'assistant' ? (
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>

                      {msg.metadata?.reviewTaskId && (
                        <div className="mt-4 p-4 bg-white/50 rounded-2xl border border-zinc-200/50 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <div className="flex items-center gap-2 pr-2">
                            <div
                              className="p-2 rounded-xl flex-shrink-0"
                              style={{ backgroundColor: USER_COLOR_LIGHT, color: USER_COLOR }}
                            >
                              <FileSearch size={18} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                              {coreStore.tasks.find(t => t.id === msg.metadata.reviewTaskId)?.status === 'on_hold'
                                ? 'Review Requested'
                                : 'Review Processed'}
                            </span>
                          </div>

                          {coreStore.tasks.find(t => t.id === msg.metadata.reviewTaskId)?.status === 'on_hold' && (
                            <button
                              onClick={() => setActiveAuditTaskId(msg.metadata.reviewTaskId)}
                              className="flex-1 min-w-[120px] px-4 py-2 bg-darkDelegation text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-sm whitespace-nowrap"
                            >
                              Review Task
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>

                <div className={`flex items-center gap-2 mt-2 px-1`}>
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    {msg.role === 'user' ? 'You' : (agent?.name?.split(' ')[0] || 'AI')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isThinking && (
          <div
            className="flex items-start gap-3"
          >
            <div className="w-4 h-4 text-zinc-300 animate-pulse mt-1">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" />
              </svg>
            </div>
            <div className="bg-zinc-50 px-4 py-3 rounded-2xl rounded-tl-none">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-zinc-50">
        {agent.index === activeTeam.leadAgent.index && (
          <div className="mb-2 rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Director Prompt Deck</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Stage: {processStage}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestedPrompts.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setInput(preset.text)}
                  className="px-2 py-1 rounded-lg bg-white border border-zinc-200 text-[9px] font-black uppercase tracking-wider text-zinc-600 hover:bg-zinc-100"
                  title={preset.text}
                >
                  {preset.label}
                </button>
              ))}
              {suggestedPrompts.length > 0 && (
                <button
                  onClick={() => void scene?.sendMessage(suggestedPrompts[0].text)}
                  disabled={isThinking}
                  className="px-2 py-1 rounded-lg bg-darkDelegation text-white text-[9px] font-black uppercase tracking-wider hover:bg-black disabled:opacity-40"
                  title="Ask top recommended next question"
                >
                  Ask Next
                </button>
              )}
            </div>
          </div>
        )}

        <div className="relative flex items-center gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => {
                const val = e.target.value;
                setInput(val);

                // Show player talking animation while typing
                if (val.length > 0) {
                  setIsTyping(true);
                  if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
                  stopTypingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1000);
                } else {
                  setIsTyping(false);
                }
              }}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message (↵ to send)"
              className="w-full bg-white border border-zinc-200 rounded-2xl px-3 py-3 text-sm focus:outline-none focus:ring-2 transition-all resize-none pr-12 [scrollbar-width:none]"
              style={{
                borderColor: input.trim() ? USER_COLOR : undefined,
                boxShadow: input.trim() ? `0 0 0 2px ${USER_COLOR_LIGHT}` : undefined
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            style={{ backgroundColor: !input.trim() || isThinking ? undefined : agent.color }}
            className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${!input.trim() || isThinking
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              : 'text-white shadow-lg hover:brightness-90'
              }`}
          >
            <Send size={16} strokeWidth={3} />
          </button>
        </div>
        <p className="text-[8px] text-zinc-400 mt-2 text-center font-medium uppercase tracking-wider">
          Shift + ↵ for new line
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;
