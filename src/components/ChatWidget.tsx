import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, User, Store, Filter, Users, Hash, CornerDownRight, ChevronDown } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useCustomer } from '../contexts/CustomerContext';
import { useLocation } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

const ChatWidget: React.FC = () => {
  const location = useLocation();
  const { messages, sendMessage, toggleChat, isChatOpen, getUnreadCount, markAsRead } = useChat();
  const { customer, connectedCustomers, isLoggedIn } = useCustomer();
  const { notify } = useNotification();

  const [filterTable, setFilterTable] = useState<string>('');
  const [recipientType, setRecipientType] = useState<'seller' | 'client'>('seller');
  const [selectedRecipientTable, setSelectedRecipientTable] = useState<string>('');
  const [mainInput, setMainInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isSeller = location.pathname.startsWith('/seller');

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, replyingTo]);

  // ========== FILTRAGE DES MESSAGES ==========

  // Messages visibles selon le rôle
  const visibleMessages = isSeller
    ? messages // Le vendeur voit tout
    : messages.filter(m => {
        if (!customer) return false;
        // Messages envoyés par ce client
        if (m.senderType === 'client' && m.tableNumber === customer.tableNumber && m.senderName === customer.name) return true;
        // Messages du vendeur adressés à cette table
        if (m.senderType === 'seller' && m.recipientTableNumber === customer.tableNumber) return true;
        // Messages du vendeur à tout le monde (pas de destinataire spécifique)
        if (m.senderType === 'seller' && !m.recipientTableNumber) return true;
        // Messages d'autres clients adressés à cette table
        if (m.senderType === 'client' && m.recipientType === 'client' && m.recipientTableNumber === customer.tableNumber) return true;
        return false;
      });

  // Filtrage additionnel par table (pour le vendeur ou client)
  const filteredMessages = filterTable
    ? isSeller
      ? visibleMessages.filter(m =>
          m.tableNumber?.toString() === filterTable ||
          m.recipientTableNumber?.toString() === filterTable
        )
      : filterTable === 'seller'
        ? visibleMessages.filter(m => m.senderType === 'seller')
        : visibleMessages.filter(m =>
            m.tableNumber?.toString() === filterTable ||
            m.recipientTableNumber?.toString() === filterTable
          )
    : visibleMessages;

  // Tables qui ont des messages (pour le filtre vendeur)
  const tablesWithMessages = Array.from(
    new Set(
      messages
        .map(m => m.senderType === 'client' ? m.tableNumber : m.recipientTableNumber)
        .filter((t): t is number => t !== undefined && t !== null)
    )
  );

  // Notification : uniquement les messages des autres non lus
  const unreadCount = isSeller
    ? getUnreadCount('seller')
    : getUnreadCount('client', customer?.tableNumber, customer?.name);

  // Marquer comme lu quand le chat est ouvert
  useEffect(() => {
    if (isChatOpen) {
      markAsRead();
    }
  }, [isChatOpen, markAsRead]);

  // ========== ENVOI DE MESSAGE ==========

  const handleMainSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainInput.trim()) return;
    const success = await doSend(mainInput.trim());
    if (success) setMainInput('');
  };

  const handleReplySend = async (messageId: string) => {
    const text = (replyInputs[messageId] || '').trim();
    if (!text) return;
    const success = await doSend(text, messageId);
    if (success) {
      setReplyInputs(prev => ({ ...prev, [messageId]: '' }));
      setReplyingTo(null);
    }
  };

  const doSend = async (content: string, replyToMessageId?: string): Promise<boolean> => {
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
      if (!selectedRecipientTable) return false;
      try {
        await sendMessage(
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
        return true;
      } catch {
        notify('Envoi impossible. Verifiez la connexion base de donnees.', 'error');
        return false;
      }
    } else {
      if (recipientType === 'seller') {
        try {
          await sendMessage(
            content,
            'client',
            customer?.tableNumber,
            customer?.name,
            'seller',
            undefined,
            replyToId,
            replyToContent,
            replyToSenderName,
          );
          return true;
        } catch {
          notify('Envoi impossible. Verifiez la connexion base de donnees.', 'error');
          return false;
        }
      } else {
        if (!selectedRecipientTable) return false;
        try {
          await sendMessage(
            content,
            'client',
            customer?.tableNumber,
            customer?.name,
            'client',
            parseInt(selectedRecipientTable),
            replyToId,
            replyToContent,
            replyToSenderName,
          );
          return true;
        } catch {
          notify('Envoi impossible. Verifiez la connexion base de donnees.', 'error');
          return false;
        }
      }
    }
  };

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

  // ========== AFFICHAGE ==========

  // Ne pas afficher sur les pages de login
  if (location.pathname === '/' || location.pathname === '/seller/login') {
    return null;
  }

  // Client non connecté : pas de chat
  if (!isSeller && !isLoggedIn) {
    return null;
  }

  // Chat fermé : bouton flottant
  if (!isChatOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all z-50 flex items-center gap-2"
      >
        <MessageSquare size={22} />
        <span className="hidden md:inline font-medium text-sm">
          {isSeller ? 'Messages' : 'Chat'}
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden h-[min(85vh,520px)]">
      {/* ===== HEADER ===== */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <MessageSquare size={18} />
          <div>
            <h3 className="font-bold text-sm">
              {isSeller ? '💬 Messagerie' : '💬 Chat'}
            </h3>
            <span className="text-[10px] text-indigo-200">
              {isSeller
                ? `${connectedCustomers.length} client(s) en ligne`
                : customer
                  ? `${customer.name} • Table ${customer.tableNumber}`
                  : 'Chat'}
            </span>
          </div>
        </div>
        <button onClick={toggleChat} className="text-white hover:text-indigo-200 hover:bg-white/10 p-1.5 rounded-lg transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* ===== FILTRE PAR TABLE ===== */}
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Filter size={12} className="text-indigo-500 shrink-0" />
          <div className="relative flex-1">
            <select
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs appearance-none pr-7 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">📨 Tous les messages</option>
              {isSeller ? (
                // Vendeur : filtre par tables connectées et tables avec messages
                Array.from(new Set([
                  ...connectedCustomers.map(c => c.tableNumber),
                  ...tablesWithMessages
                ])).sort((a, b) => a - b).map((t) => {
                  const clientInfo = connectedCustomers.find(c => c.tableNumber === t);
                  const isConnected = connectedCustomers.some(c => c.tableNumber === t);
                  return (
                    <option key={t} value={t.toString()}>
                      🪑 Table {t} {clientInfo ? `(${clientInfo.name})` : ''} {!isConnected ? '⚠️' : ''}
                    </option>
                  );
                })
              ) : (
                // Client : filtre vendeur ou autres tables connectées
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
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ===== ZONE DES MESSAGES ===== */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-50/50 space-y-2">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            <MessageSquare size={36} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm font-medium">Aucun message</p>
            <p className="text-xs text-gray-300 mt-1">
              {filterTable ? 'Aucun message pour ce filtre' : 'Commencez une conversation'}
            </p>
          </div>
        ) : (
          filteredMessages.map((message) => {
            const isMyMessage = isSeller
              ? message.senderType === 'seller'
              : message.senderType === 'client'
                && message.tableNumber === customer?.tableNumber
                && message.senderName === customer?.name;

            const showReplyButton = !isMyMessage;
            const isReplyingToThis = replyingTo === message.id;

            return (
              <div key={message.id} className="space-y-0.5">
                {/* Bulle du message */}
                <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[88%] group">
                    <div
                      className={`rounded-2xl px-3 py-2 shadow-sm ${
                        isMyMessage
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-sm'
                          : message.senderType === 'seller'
                            ? 'bg-amber-50 text-gray-800 border border-amber-200 rounded-bl-sm'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                      }`}
                    >
                      {/* Citation du message auquel on répond */}
                      {message.replyToMessage && (
                        <div className={`mb-1.5 px-2 py-1 rounded-md text-[10px] border-l-2 ${
                          isMyMessage
                            ? 'bg-white/10 border-white/40 text-white/80'
                            : 'bg-gray-100 border-indigo-400 text-gray-500'
                        }`}>
                          <span className="font-semibold">{message.replyToSender || '?'}</span>
                          <p className="truncate mt-0.5">{message.replyToMessage}</p>
                        </div>
                      )}

                      {/* Info expéditeur */}
                      <div className={`flex items-center gap-1 mb-0.5 text-[10px] ${isMyMessage ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {message.senderType === 'seller' ? <Store size={10} /> : <User size={10} />}
                        <span className="font-bold">
                          {message.senderType === 'seller' ? '🏪 Vendeur' : message.senderName || 'Client'}
                        </span>
                        {message.tableNumber && (
                          <span className={`${isMyMessage ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'} px-1 py-0.5 rounded text-[9px]`}>
                            T{message.tableNumber}
                          </span>
                        )}
                        {message.recipientTableNumber && message.senderType === 'client' && (
                          <span className="text-[9px]">→ T{message.recipientTableNumber}</span>
                        )}
                      </div>

                      {/* Contenu du message */}
                      <p className="text-[13px] leading-relaxed break-words">{message.message}</p>

                      {/* Heure */}
                      <div className={`text-[9px] mt-1 text-right ${isMyMessage ? 'text-indigo-200' : 'text-gray-300'}`}>
                        {formatTime(message.timestamp)}
                      </div>
                    </div>

                    {/* Bouton Répondre */}
                    {showReplyButton && (
                      <button
                        onClick={() => openReply(message.id)}
                        className={`mt-0.5 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-all ${
                          isReplyingToThis
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-gray-300 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                      >
                        <CornerDownRight size={9} />
                        Répondre
                      </button>
                    )}
                  </div>
                </div>

                {/* Zone de réponse inline */}
                {isReplyingToThis && (
                  <div className={`flex gap-1.5 ${isMyMessage ? 'pr-2 justify-end' : 'pl-2'}`}>
                    <CornerDownRight size={11} className="text-indigo-400 mt-2 shrink-0" />
                    <div className="flex-1 max-w-[85%] flex gap-1 bg-white border border-indigo-300 rounded-xl p-1.5 shadow-sm">
                      <input
                        type="text"
                        value={replyInputs[message.id] || ''}
                        onChange={(e) => setReplyInputs(prev => ({ ...prev, [message.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleReplySend(message.id);
                          }
                          if (e.key === 'Escape') {
                            setReplyingTo(null);
                          }
                        }}
                        placeholder={`Répondre à ${message.senderName || (message.senderType === 'seller' ? 'Vendeur' : 'Client')}...`}
                        className="flex-1 text-xs border-none outline-none bg-transparent min-w-0"
                        autoFocus
                      />
                      <button
                        onClick={() => handleReplySend(message.id)}
                        disabled={!(replyInputs[message.id] || '').trim()}
                        className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                      >
                        <Send size={11} />
                      </button>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-gray-400 hover:text-red-500 p-1.5 shrink-0"
                      >
                        <X size={11} />
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

      {/* ===== ZONE DE SAISIE ===== */}
      <div className="border-t border-gray-200 bg-white shrink-0">
        {/* Sélection du destinataire */}
        {isSeller ? (
          <div className="flex items-center gap-2 text-xs px-3 pt-2">
            <Users size={12} className="text-indigo-500 shrink-0" />
            <span className="font-medium text-gray-500 shrink-0">À :</span>
            <select
              value={selectedRecipientTable}
              onChange={(e) => setSelectedRecipientTable(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choisir un client...</option>
              {connectedCustomers.map((c) => (
                <option key={c.tableNumber} value={c.tableNumber.toString()}>
                  🪑 Table {c.tableNumber} - {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="px-3 pt-2 space-y-1.5">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setRecipientType('seller');
                  setSelectedRecipientTable('');
                }}
                className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-lg transition-all ${
                  recipientType === 'seller'
                    ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                    : 'bg-gray-100 text-gray-500 border-2 border-transparent'
                }`}
              >
                <Store size={11} />
                Vendeur
              </button>
              <button
                type="button"
                onClick={() => setRecipientType('client')}
                className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-lg transition-all ${
                  recipientType === 'client'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                    : 'bg-gray-100 text-gray-500 border-2 border-transparent'
                }`}
              >
                <Users size={11} />
                Client
              </button>
            </div>

            {recipientType === 'client' && (
              <div className="flex items-center gap-1.5 text-xs">
                <Hash size={11} className="text-indigo-500 shrink-0" />
                <select
                  value={selectedRecipientTable}
                  onChange={(e) => setSelectedRecipientTable(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choisir une table...</option>
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

        {/* Champ de saisie */}
        <form onSubmit={handleMainSend} className="flex gap-2 p-3">
          <input
            type="text"
            value={mainInput}
            onChange={(e) => setMainInput(e.target.value)}
            placeholder={
              isSeller
                ? (selectedRecipientTable ? 'Écrire un message...' : 'Choisir un destinataire...')
                : recipientType === 'seller'
                  ? 'Message au vendeur...'
                  : selectedRecipientTable
                    ? 'Message au client...'
                    : 'Choisir une table...'
            }
            disabled={
              (isSeller && !selectedRecipientTable) ||
              (!isSeller && recipientType === 'client' && !selectedRecipientTable)
            }
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={
              !mainInput.trim() ||
              (isSeller && !selectedRecipientTable) ||
              (!isSeller && recipientType === 'client' && !selectedRecipientTable)
            }
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWidget;
