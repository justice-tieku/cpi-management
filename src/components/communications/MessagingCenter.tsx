import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Search, CheckCheck, Clock } from 'lucide-react';
import { useCMS } from '../../context/CMSContext';

export const MessagingCenter: React.FC = () => {
  const { currentUser, shepherds, visibleMessages, sendMessage, markMessageRead } = useCMS();
  const isPastor = currentUser.role === 'pastor';

  // For pastor: list of all shepherd conversations. For shepherd: only Pastor conversation.
  type Conversation = { id: string; name: string; role: string; cell?: string };
  const conversations: Conversation[] = isPastor
    ? shepherds.map((s) => ({ id: s.id, name: s.name, role: 'Shepherd', cell: s.cell }))
    : [{ id: 'USR-PASTOR-01', name: 'Pastor Adams', role: 'Pastor / Admin' }];

  const [selectedConvId, setSelectedConvId] = useState<string>(conversations[0]?.id || '');
  const [draftText, setDraftText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  // Messages relevant to this conversation thread
  const threadMessages = visibleMessages.filter((m) => {
    if (isPastor) {
      return (
        (m.senderId === selectedConvId && m.recipientId === currentUser.id) ||
        (m.senderId === currentUser.id && m.recipientId === selectedConvId)
      );
    }
    // Shepherd: everything visible is their own conversation with pastor
    return true;
  });

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length, selectedConvId]);

  // Mark unread messages as read when thread is viewed
  useEffect(() => {
    threadMessages.forEach((m) => {
      if (!m.read && m.recipientId === currentUser.id) {
        markMessageRead(m.id);
      }
    });
  }, [selectedConvId, threadMessages.length]);

  const handleSend = () => {
    const text = draftText.trim();
    if (!text || !selectedConvId) return;
    sendMessage(selectedConvId, text);
    setDraftText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Unread count per shepherd (for pastor view badge)
  const unreadCount = (convId: string) =>
    visibleMessages.filter(
      (m) => m.senderId === convId && m.recipientId === currentUser.id && !m.read
    ).length;

  const filteredConvs = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full" style={{ maxHeight: 'calc(100vh - 112px)' }}>
      {/* ======== LEFT SIDEBAR — Conversation List ======== */}
      <div className="w-72 shrink-0 bg-[#0a122e] flex flex-col">
        {/* Header */}
        <div className="p-4">
          <h2 className="text-sm font-bold text-white">
            {isPastor ? 'Shepherd Messages' : 'My Messages'}
          </h2>
          <p className="text-xs text-[#7b9dc7] mt-0.5">
            {isPastor
              ? 'Direct shepherd messages'
              : 'Direct messages with Pastor Adams'}
          </p>
        </div>

        {/* Search (pastor only) */}
        {isPastor && (
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7b9dc7]" />
              <input
                type="text"
                placeholder="Search shepherds..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[#111d44] text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#00f0ff]"
              />
            </div>
          </div>
        )}

        {/* Conversation Entries */}
        <div className="flex-1 overflow-y-auto py-2">
          {filteredConvs.map((conv) => {
            const unread = unreadCount(conv.id);
            const lastMsg = [...visibleMessages]
              .reverse()
              .find(
                (m) =>
                  (m.senderId === conv.id && m.recipientId === currentUser.id) ||
                  (m.senderId === currentUser.id && m.recipientId === conv.id) ||
                  (!isPastor)
              );
            const isSelected = selectedConvId === conv.id;

            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`w-full text-left px-4 py-3   transition-colors ${
                  isSelected
                    ? 'bg-[#072e54] -2 '
                    : 'hover:bg-[#111d44] -2 -transparent'
                }`}
              >
                {/* Avatar + Name row */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#072e54] flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#00f0ff]">
                      {conv.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {conv.name}
                      </span>
                      {unread > 0 && (
                        <span className="ml-2 shrink-0 w-4 h-4 bg-[#00f0ff] text-[#070c1e] text-[9px] font-bold flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#7b9dc7] truncate mt-0.5">
                      {conv.cell || conv.role}
                    </p>
                    {lastMsg && (
                      <p className="text-[10px] text-slate-600 truncate mt-0.5 italic">
                        {lastMsg.content.slice(0, 40)}
                        {lastMsg.content.length > 40 ? '…' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======== RIGHT PANEL — Chat Thread ======== */}
      <div className="flex-1 flex flex-col bg-[#070c1e] min-w-0">
        {selectedConv ? (
          <>
            {/* Thread Header */}
            <div className="px-6 py-4 flex items-center gap-3 bg-[#0a122e]">
              <div className="w-9 h-9 bg-[#072e54] flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-[#00f0ff]">
                  {selectedConv.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{selectedConv.name}</p>
                <p className="text-xs text-[#7b9dc7]">{selectedConv.cell || selectedConv.role}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-400" />
                <span className="text-xs text-[#7b9dc7]">Private channel</span>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {threadMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-slate-700 mb-3" />
                  <p className="text-[#7b9dc7] text-sm font-medium">No messages yet</p>
                  <p className="text-slate-600 text-xs mt-1">
                    {isPastor
                      ? `Send a message to ${selectedConv.name}`
                      : 'Send a message to Pastor Adams'}
                  </p>
                </div>
              ) : (
                threadMessages.map((msg) => {
                  const isOwn = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8  flex items-center justify-center shrink-0 text-[10px] font-bold  ${
                        isOwn
                          ? 'bg-[#072e54]  text-[#00f0ff]'
                          : 'bg-[#16285a]  text-[#a6c4eb]'
                      }`}>
                        {msg.senderName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>

                      {/* Bubble */}
                      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className={`px-4 py-2.5  text-xs leading-relaxed ${
                          isOwn
                            ? 'bg-[#00f0ff] text-[#070c1e] font-medium '
                            : 'bg-[#111d44]   text-slate-200 '
                        }`}>
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          <Clock className="w-2.5 h-2.5 text-slate-600" />
                          <span className="text-[10px] text-slate-600">{msg.timestamp}</span>
                          {isOwn && msg.read && <CheckCheck className="w-3 h-3 text-[#00f0ff]" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-6 py-4 bg-[#0a122e]">
              <div className="flex items-end gap-3">
                <textarea
                  rows={2}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isPastor
                      ? `Message ${selectedConv.name}…`
                      : 'Send a message to Pastor Adams…'
                  }
                  className="flex-1 resize-none bg-[#111d44] px-4 py-3 text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#00f0ff] leading-relaxed"
                />
                <button
                  onClick={handleSend}
                  disabled={!draftText.trim()}
                  className="shrink-0 w-10 h-10 bg-[#00f0ff] hover:bg-[#3bf2ff] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
              <p className="text-[10px] text-slate-600 mt-2">
                Press Enter to send · Shift+Enter for new line ·{' '}
                {isPastor
                  ? 'Only you and this shepherd see this conversation'
                  : 'Only you and Pastor Adams see this conversation'}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-[#7b9dc7] text-sm">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



