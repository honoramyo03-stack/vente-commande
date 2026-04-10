import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, User, Store, Filter, Users, Hash, CornerDownRight } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useCustomer } from '../contexts/CustomerContext';
import { useLocation } from 'react-router-dom';

const ChatWidget: React.FC = () => {
  const location = useLocation();
  const { messages, isChatOpen, currentTableNumber, sendMessage, toggleChat, setCurrentTableNumber, setCurrentCustomerName } = useChat();
  const { customer, connectedCustomers, isLoggedIn } = useCustomer();
  const [filterTable, setFilterTable] = useState<string>('');
  const [recipientType, setRecipientType] = useState<'seller' | 'client'>('seller');
  const [selectedRecipientTable, setSelectedRecipientTable] = useState<string>('');
  const [mainInput, setMainInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainInputRef = useRef<HTMLInputElement>(null);

  const isSeller = location.pathname.startsWith('/seller');

  // Synchroniser le contexte avec les infos du client
  useEffect(() => {
    if (customer && isLoggedIn) {
      setCurrentTableNumber(customer.tableNumber);
      setCurrentCustomerName(customer.name);
    }
  }, [customer, isLoggedIn, setCurrentTableNumber, setCurrentCustomerName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Envoyer un message principal
  const handleMainSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainInput.trim()) return;
    doSend(mainInput.trim());
    setMainInput('');
  };

  // Envoyer une réponse inline
  const handleReplySend = (messageId: string) => {
    const text = (replyInputs[messageId] || '').trim();
    if (!text) return;
    doSend(text, messageId);
    setReplyInputs(prev => ({ ...prev, [messageId]: '' }));
    setReplyingTo(null);
  };

  // Logique d'envoi commune
  const doSend = (content: string, replyToMessageId?: string) => {
    // Trouver le message auquel on répond
    let replyToId = replyToMessageId;
    let replyToContent: string | undefined;
    let replyToSenderName: string | undefined;

    if (replyToId) {
      const originalMsg = messages.find(m => m.id === replyToId);
      if (originalMsg) {
        replyToContent = originalMsg.message;
        replyToSenderName = originalMsg.senderName || (originalMsg.senderType === 'seller' ? 'Vendeur' : 'Client');
      }
    }

    if (isSeller) {
      if (!selectedRecipientTable) return;
      sendMessage(
        content,
        'seller',
        undefined,
        'Vendeur',
        'client',
        parseInt(selectedRecipientTable),
        replyToId,
        replyToContent,
        replyToSenderName,
      );
    } else {
      if (recipientType === 'seller') {
        sendMessage(
          content,
          'client',
          currentTableNumber || undefined,
          customer?.name,
          'seller',
          undefined,
          replyToId,
          replyToContent,
          replyToSenderName,
        );
      } else {
        if (!selectedRecipientTable) return;
        sendMessage(
          content,
          'client',
          currentTableNumber || undefined,
          customer?.name,
          'client',
          parseInt(selectedRecipientTable),
          replyToId,
          replyToContent,
          replyToSenderName,
        );
      }
    }
  };

  // Ouvrir la zone de réponse inline
  const openReply = (messageId: string) => {
    setReplyingTo(messageId);
    setReplyInputs(prev => ({ ...prev, [messageId]: '' }));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-MG', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  // Filtrer les messages
  const filteredMessages = filterTable
    ? messages.filter((m) =>
        m.tableNumber?.toString() === filterTable ||
        m.recipientTableNumber?.toString() === filterTable
      )
    : messages;

  // Tables avec des messages
  const tablesWithMessages = Array.from(new Set(messages.map((m) => m.tableNumber).filter(Boolean)));

  // Compter les messages
  const unreadCount = messages.length;

  // Ne pas afficher sur la page de login
  if (location.pathname === '/' || location.pathname === '/seller/login') {
    return null;
  }

  // Si client non connecté
  if (!isSeller && !isLoggedIn) {
    return null;
  }

  if (!isChatOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all z-50 flex items-center gap-2"
      >
        <MessageSquare size={24} />
        <span className="hidden md:inline font-medium text-sm">
          {isSeller ? 'Messages' : 'Chat'}
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden h-[520px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <MessageSquare size={20} />
          <div>
            <h3 className="font-bold text-sm">
              {isSeller ? 'Messagerie Clients' : 'Chat'}
            </h3>
            <span className="text-xs text-indigo-200">
              {isSeller
                ? `${connectedCustomers.length} client(s) connecté(s)`
                : customer
                  ? `${customer.name} - Table ${customer.tableNumber}`
                  : 'Contact'}
            </span>
          </div>
        </div>
        <button onClick={toggleChat} className="text-white hover:text-indigo-200 hover:bg-white/10 p-1 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Barre de filtre */}
      <div className="bg-gray-50 border-b border-gray-200 p-3 shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Filter size={14} className="text-indigo-500" />
          <span className="font-medium">Filtrer :</span>
          <select
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
            className="flex-1 bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">📨 Tous les messages</option>
            {isSeller ? (
              tablesWithMessages.map((t) => {
                const customerInfo = connectedCustomers.find(c => c.tableNumber === t);
                return (
                  <option key={t} value={t?.toString()}>
                    🪑 Table {t} {customerInfo ? `(${customerInfo.name})` : ''}
                  </option>
                );
              })
            ) : (
              <>
                <option value="seller">🏪 Messages du vendeur</option>
                {connectedCustomers
                  .filter(c => !customer || c.tableNumber !== customer.tableNumber)
                  .map((c) => (
                    <option key={c.tableNumber} value={c.tableNumber.toString()}>
                      🪑 Table {c.tableNumber} ({c.name})
                    </option>
                  ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-50 space-y-2">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageSquare size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">Aucun message</p>
            <p className="text-xs text-gray-400 mt-1">Commencez une conversation</p>
          </div>
        ) : (
          filteredMessages.map((message) => {
            const isMyMessage = isSeller
              ? message.senderType === 'seller'
              : message.senderType === 'client' && message.tableNumber === customer?.tableNumber;

            const isClientToClient = message.senderType === 'client' && message.recipientTableNumber;
            const isReplyingToThis = replyingTo === message.id;

            return (
              <div key={message.id} className="space-y-1">
                {/* Message bulle */}
                <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[90%]">
                    <div
                      className={`rounded-2xl p-2.5 shadow-sm ${
                        isMyMessage
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-sm'
                          : message.senderType === 'seller'
                            ? 'bg-amber-50 text-gray-800 border border-amber-200 rounded-bl-sm'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                      }`}
                    >
                      {/* Citation du message répondi */}
                      {message.replyToMessage && (
                        <div className={`mb-1.5 px-2 py-1 rounded-lg text-[10px] border-l-2 ${
                          isMyMessage
                            ? 'bg-white/10 border-white/40 text-white/80'
                            : 'bg-gray-100 border-indigo-400 text-gray-600'
                        }`}>
                          <span className="font-semibold">{message.replyToSender || 'Inconnu'}</span>
                          <p className="truncate mt-0.5">{message.replyToMessage}</p>
                        </div>
                      )}

                      {/* Info expéditeur */}
                      <div className={`flex items-center space-x-1 mb-0.5 text-[10px] ${isMyMessage ? 'text-indigo-200' : 'text-gray-500'}`}>
                        {message.senderType === 'seller' ? (
                          <Store size={10} />
                        ) : (
                          <User size={10} />
                        )}
                        <span className="font-bold">
                          {message.senderType === 'seller'
                            ? '🏪 Vendeur'
                            : `${message.senderName || 'Client'}`}
                        </span>
                        {message.tableNumber && (
                          <span className={`${isMyMessage ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'} px-1.5 py-0.5 rounded-full`}>
                            T{message.tableNumber}
                          </span>
                        )}
                        {isClientToClient && message.recipientTableNumber && (
                          <span className="text-gray-400">
                            → T{message.recipientTableNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{message.message}</p>
                      <div className={`text-[10px] mt-1 text-right ${isMyMessage ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {formatTime(message.timestamp)}
                      </div>
                    </div>

                    {/* Bouton Répondre */}
                    {!isMyMessage && (
                      <button
                        onClick={() => openReply(message.id)}
                        className={`mt-0.5 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-all ${
                          isReplyingToThis
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                      >
                        <CornerDownRight size={10} />
                        Répondre
                      </button>
                    )}
                  </div>
                </div>

                {/* Zone de réponse inline */}
                {isReplyingToThis && (
                  <div className={`flex gap-1.5 pl-4 ${isMyMessage ? 'pr-2 justify-end' : 'pl-6'}`}>
                    <CornerDownRight size={12} className="text-indigo-400 mt-2 shrink-0" />
                    <div className="flex-1 flex gap-1.5 bg-white border border-indigo-200 rounded-xl p-1.5 shadow-sm">
                      <input
                        type="text"
                        value={replyInputs[message.id] || ''}
                        onChange={(e) => setReplyInputs(prev => ({ ...prev, [message.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleReplySend(message.id);
                          }
                          if (e.key === 'Escape') {
                            setReplyingTo(null);
                          }
                        }}
                        placeholder={`Répondre à ${message.senderName || (message.senderType === 'seller' ? 'Vendeur' : 'Client')}...`}
                        className="flex-1 text-xs border-none outline-none bg-transparent"
                        autoFocus
                      />
                      <button
                        onClick={() => handleReplySend(message.id)}
                        disabled={!(replyInputs[message.id] || '').trim()}
                        className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      >
                        <Send size={12} />
                      </button>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-gray-400 hover:text-red-500 p-1.5 shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message principal en bas */}
      <form onSubmit={handleMainSend} className="p-3 border-t border-gray-200 bg-white space-y-2 shrink-0">
        {/* Sélection du destinataire */}
        {isSeller ? (
          <div className="flex items-center gap-2 text-xs">
            <Users size={14} className="text-indigo-500" />
            <span className="font-medium text-gray-600">Envoyer à :</span>
            <select
              value={selectedRecipientTable}
              onChange={(e) => setSelectedRecipientTable(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sélectionner un client...</option>
              {connectedCustomers.map((c) => (
                <option key={c.tableNumber} value={c.tableNumber.toString()}>
                  🪑 Table {c.tableNumber} - {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRecipientType('seller');
                  setSelectedRecipientTable('');
                }}
                className={`flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-lg transition-all ${
                  recipientType === 'seller'
                    ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                <Store size={12} />
                Vendeur
              </button>
              <button
                type="button"
                onClick={() => setRecipientType('client')}
                className={`flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-lg transition-all ${
                  recipientType === 'client'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                <Users size={12} />
                Client
              </button>
            </div>

            {recipientType === 'client' && (
              <div className="flex items-center gap-2 text-xs">
                <Hash size={12} className="text-indigo-500" />
                <select
                  value={selectedRecipientTable}
                  onChange={(e) => setSelectedRecipientTable(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sélectionner une table...</option>
                  {connectedCustomers
                    .filter(c => !customer || c.tableNumber !== customer.tableNumber)
                    .map((c) => (
                      <option key={c.tableNumber} value={c.tableNumber.toString()}>
                        🪑 Table {c.tableNumber} - {c.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Zone de saisie principale */}
        <div className="flex gap-2">
          <input
            ref={mainInputRef}
            type="text"
            value={mainInput}
            onChange={(e) => setMainInput(e.target.value)}
            placeholder={
              isSeller
                ? (selectedRecipientTable ? 'Écrivez votre message...' : 'Sélectionnez un destinataire...')
                : recipientType === 'seller'
                  ? 'Message au vendeur...'
                  : selectedRecipientTable
                    ? 'Message au client...'
                    : 'Sélectionnez une table...'
            }
            disabled={(isSeller && !selectedRecipientTable) || (!isSeller && recipientType === 'client' && !selectedRecipientTable)}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={(isSeller && !selectedRecipientTable) || (!isSeller && recipientType === 'client' && !selectedRecipientTable) || !mainInput.trim()}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWidget;
