import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  senderType: 'client' | 'seller';
  senderName?: string;
  tableNumber?: number;
  recipientType?: 'client' | 'seller';
  recipientTableNumber?: number;
  message: string;
  timestamp: Date;
  replyToId?: string;
  replyToMessage?: string;
  replyToSender?: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (
    content: string,
    sender: 'client' | 'seller',
    tableNumber?: number,
    senderName?: string,
    recipientType?: 'client' | 'seller',
    recipientTableNumber?: number,
    replyToId?: string,
    replyToMessage?: string,
    replyToSender?: string,
  ) => Promise<void>;
  getMessagesForTable: (tableNumber: number) => ChatMessage[];
  getMessagesForSeller: () => ChatMessage[];
  isOnline: boolean;
  isChatOpen: boolean;
  toggleChat: () => void;
  currentTableNumber: number | null;
  setCurrentTableNumber: (tableNumber: number | null) => void;
  currentCustomerName: string | null;
  setCurrentCustomerName: (name: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

const safeGetItem = (key: string) => {
  try { return localStorage.getItem(key); } catch { return null; }
};

const safeSetItem = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentTableNumber, setCurrentTableNumber] = useState<number | null>(null);
  const [currentCustomerName, setCurrentCustomerName] = useState<string | null>(null);

  const toggleChat = () => setIsChatOpen(prev => !prev);

  // Transformer un message Supabase en ChatMessage
  const transformMessage = (m: any): ChatMessage => ({
    id: m.id,
    senderType: m.sender_type,
    senderName: m.sender_name,
    tableNumber: m.sender_table,
    recipientType: m.recipient_type,
    recipientTableNumber: m.recipient_table,
    message: m.content,
    timestamp: new Date(m.created_at),
    replyToId: m.reply_to_id || undefined,
    replyToMessage: m.reply_to_message || undefined,
    replyToSender: m.reply_to_sender || undefined,
  });

  // Charger les messages depuis Supabase
  const fetchMessages = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      // Fallback localStorage
      const saved = safeGetItem('chat_messages');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        } catch { /* ignore */ }
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const transformed = (data || []).map(transformMessage);
      setMessages(transformed);
      setIsOnline(true);
      safeSetItem('chat_messages', JSON.stringify(transformed));
    } catch (e) {
      console.error('Erreur chargement messages:', e);
      setIsOnline(false);
      // Fallback localStorage
      const saved = safeGetItem('chat_messages');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        } catch { /* ignore */ }
      }
    }
  }, []);

  // Initialisation
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('chat_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = transformMessage(payload.new);
          setMessages(prev => {
            // Éviter les doublons
            if (prev.some(m => m.id === newMsg.id)) return prev;
            const updated = [...prev, newMsg];
            safeSetItem('chat_messages', JSON.stringify(updated));
            return updated;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsOnline(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Envoyer un message
  const sendMessage = async (
    content: string,
    sender: 'client' | 'seller',
    tableNumber?: number,
    senderName?: string,
    recipientType?: 'client' | 'seller',
    recipientTableNumber?: number,
    replyToId?: string,
    replyToMessage?: string,
    replyToSender?: string,
  ) => {
    if (!content.trim()) return;

    const messageData = {
      sender_type: sender,
      sender_name: senderName || (sender === 'seller' ? 'Vendeur' : 'Client'),
      sender_table: tableNumber || null,
      recipient_type: recipientType || 'seller',
      recipient_table: recipientTableNumber || null,
      content: content.trim(),
      reply_to_id: replyToId || null,
      reply_to_message: replyToMessage || null,
      reply_to_sender: replyToSender || null,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .insert(messageData)
          .select()
          .single();

        if (error) {
          console.error('Erreur Supabase envoi message:', error);
          throw error;
        }

        // Ajouter le message localement
        const newMsg = transformMessage(data);
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          const updated = [...prev, newMsg];
          safeSetItem('chat_messages', JSON.stringify(updated));
          return updated;
        });
      } catch (e) {
        console.error('Erreur envoi message Supabase:', e);
        // Fallback: ajouter localement
        const fallbackMsg: ChatMessage = {
          id: `local_${Date.now()}`,
          senderType: sender,
          senderName: senderName || (sender === 'seller' ? 'Vendeur' : 'Client'),
          tableNumber: tableNumber,
          recipientType: recipientType,
          recipientTableNumber: recipientTableNumber,
          message: content.trim(),
          timestamp: new Date(),
          replyToId,
          replyToMessage,
          replyToSender,
        };
        setMessages(prev => {
          const updated = [...prev, fallbackMsg];
          safeSetItem('chat_messages', JSON.stringify(updated));
          return updated;
        });
      }
    } else {
      // Mode hors ligne
      const fallbackMsg: ChatMessage = {
        id: `local_${Date.now()}`,
        senderType: sender,
        senderName: senderName || (sender === 'seller' ? 'Vendeur' : 'Client'),
        tableNumber: tableNumber,
        recipientType: recipientType,
        recipientTableNumber: recipientTableNumber,
        message: content.trim(),
        timestamp: new Date(),
        replyToId,
        replyToMessage,
        replyToSender,
      };
      setMessages(prev => {
        const updated = [...prev, fallbackMsg];
        safeSetItem('chat_messages', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Obtenir les messages pour une table (client)
  const getMessagesForTable = (tableNumber: number): ChatMessage[] => {
    return messages.filter(m => {
      // Messages envoyés par cette table
      if (m.senderType === 'client' && m.tableNumber === tableNumber) return true;
      // Messages reçus par cette table (du vendeur)
      if (m.senderType === 'seller' && m.recipientTableNumber === tableNumber) return true;
      // Messages reçus par cette table (d'autres clients)
      if (m.recipientType === 'client' && m.recipientTableNumber === tableNumber) return true;
      // Messages généraux du vendeur
      if (m.senderType === 'seller' && !m.recipientTableNumber) return true;
      return false;
    });
  };

  // Obtenir les messages pour le vendeur
  const getMessagesForSeller = (): ChatMessage[] => {
    return messages;
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        getMessagesForTable,
        getMessagesForSeller,
        isOnline,
        isChatOpen,
        toggleChat,
        currentTableNumber,
        setCurrentTableNumber,
        currentCustomerName,
        setCurrentCustomerName,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;
