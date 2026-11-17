import React, { useState, useEffect } from 'react';
import { X, Send, Phone, Copy, Check, MessageSquare, AlertCircle } from 'lucide-react';
import { formatGhanaianPhone, getCleanDialPhone } from '../../utils/phone';

interface DirectOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  phone: string;
  category?: 'red_list_1' | 'red_list_2' | 'critical' | 'first_timer' | 'custom';
  consecutiveMissed?: number;
  cellGroup?: string;
  lastAttended?: string;
}

export const DirectOutreachModal: React.FC<DirectOutreachModalProps> = ({
  isOpen,
  onClose,
  recipientName,
  phone,
  category = 'red_list_1',
  consecutiveMissed = 1,
  cellGroup,
  lastAttended
}) => {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate appropriate message template
  useEffect(() => {
    if (!recipientName) return;
    const firstName = recipientName.split(' ')[0] || recipientName;

    if (category === 'red_list_1') {
      setMessage(
        `Calvary greetings ${firstName}! We missed your fellowship at CPI Sunday Communion service. Praying God's continuous peace and strength over you and your household this week. Let us know if you need prayer! — Cross Passion International`
      );
    } else if (category === 'red_list_2') {
      setMessage(
        `Dear ${firstName}, warm greetings in Christ from Cross Passion International. We noticed you've been absent from Sunday services for 2 weeks and wanted to check in on you. We care about you deeply. Can we visit or pray with you? — CPI Pastoral Care`
      );
    } else if (category === 'critical') {
      setMessage(
        `Dear ${firstName}, Pastor Adams and the pastoral team at Cross Passion International are thinking of you. You remain a valued part of God's family. Please let us know how we can support you or when we can drop by for prayer. God bless you.`
      );
    } else if (category === 'first_timer') {
      setMessage(
        `Dear ${firstName}, thank you for worshipping with us at Cross Passion International this Sunday! We were blessed by your presence. You are always welcome in God's house. Please let us know if you have any prayer requests! — CPI Ministry`
      );
    } else {
      setMessage(
        `Hello ${firstName}, greetings from Cross Passion International. Checking in to see how you are doing this week. God bless you!`
      );
    }
  }, [recipientName, category, consecutiveMissed]);

  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Clean Ghanaian phone number for WhatsApp link (+233 format without +)
  const cleanPhone = getCleanDialPhone(phone);

  const handleWhatsAppSend = () => {
    if (!message.trim()) {
      setErrorNotice('There is no information to send.');
      return;
    }
    setErrorNotice(null);
    const encodedText = encodeURIComponent(message);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSmsSend = () => {
    if (!message.trim()) {
      setErrorNotice('There is no information to send.');
      return;
    }
    if (!cleanPhone) {
      setErrorNotice('Please enter the required information.');
      return;
    }
    setErrorNotice(null);
    const encodedText = encodeURIComponent(message);
    const smsUrl = `sms:${cleanPhone}?body=${encodedText}`;
    window.location.href = smsUrl;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#111d44] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 bg-[#0c152e]">
          <div>
            <span className="text-[10px] font-bold text-[#00f0ff] uppercase tracking-wider block">
              Direct Pastoral Outreach
            </span>
            <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
              Contact {recipientName}
            </h2>
            <p className="text-xs text-[#a6c4eb] font-mono mt-0.5">{formatGhanaianPhone(phone)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#a6c4eb] hover:text-white hover:bg-[#16285a] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Context Tag */}
          <div className="p-3 bg-[#0a122e] flex items-center justify-between text-xs">
            <div>
              <span className="text-[#a6c4eb] block text-[10px] uppercase font-semibold">Shepherd Group</span>
              <span className="text-white font-bold">{cellGroup || 'Main Congregation'}</span>
            </div>
            {category.startsWith('red_list') && (
              <div className="text-right">
                <span className="text-[#ff4069] font-bold block text-[10px] uppercase">Red List Alert</span>
                <span className="text-white font-mono">{consecutiveMissed} Missed Sunday{consecutiveMissed > 1 ? 's' : ''}</span>
              </div>
            )}
            {category === 'critical' && (
              <div className="text-right">
                <span className="text-[#ff6b8b] font-bold block text-[10px] uppercase">Critical Absentee</span>
                <span className="text-white font-mono">{consecutiveMissed}+ Missed Sundays</span>
              </div>
            )}
            {category === 'first_timer' && (
              <div className="text-right">
                <span className="text-[#00ff9d] font-bold block text-[10px] uppercase">New Guest</span>
                <span className="text-white font-mono">48h Welcome Call</span>
              </div>
            )}
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#a6c4eb]">
                Pastoral Message Preview
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-[#00f0ff] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-[#00ff9d]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 bg-[#0a122e] text-xs text-white placeholder-[#7b9dc7] focus:outline-none focus:ring-2 focus:ring-[#00f0ff] leading-relaxed resize-none"
            />
          </div>

          {errorNotice && (
            <div className="p-3 bg-[#38141e] text-[#ff6b8b] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* WhatsApp Send Button */}
            <button
              type="button"
              onClick={handleWhatsAppSend}
              className="py-3 px-4 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {/* WhatsApp SVG Icon */}
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.072-2.18-.544-1.897-.788-3.109-2.73-3.204-2.856-.095-.127-.768-1.024-.768-1.953 0-.928.487-1.385.66-1.574.173-.189.377-.236.503-.236.126 0 .252.002.361.008.117.006.273-.044.428.328.156.377.534 1.302.58 1.396.047.095.078.205.016.329-.063.125-.094.204-.188.314-.094.111-.198.248-.282.333-.095.095-.194.198-.083.389.111.19.493.813 1.057 1.316.726.647 1.339.847 1.53.942.19.096.302.079.414-.047.111-.127.476-.554.603-.744.126-.19.253-.158.428-.095.174.064 1.109.523 1.3.618.19.095.317.142.364.222.048.079.048.459-.096.864z"/>
              </svg>
              <span>Send via WhatsApp</span>
            </button>

            {/* Direct SMS Button */}
            <button
              type="button"
              onClick={handleSmsSend}
              className="py-3 px-4 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Send SMS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
