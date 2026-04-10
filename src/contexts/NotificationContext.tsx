import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  progress: number;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};

let notifIdCounter = 0;

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearInterval(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const notify = useCallback((message: string, type: NotificationType = 'success', duration: number = 3000) => {
    const id = `notif-${++notifIdCounter}-${Date.now()}`;
    const startTime = Date.now();

    setNotifications(prev => [...prev, { id, message, type, progress: 100 }]);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.max(0, 100 - (elapsed / duration) * 100);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, progress } : n)
      );

      if (elapsed >= duration) {
        clearInterval(interval);
        timersRef.current.delete(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    }, 30);

    timersRef.current.set(id, interval);
  }, []);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
    }
  };

  const getColors = (type: NotificationType) => {
    switch (type) {
      case 'success': return { bg: 'bg-emerald-900/95', border: 'border-emerald-500', bar: 'bg-emerald-400', text: 'text-emerald-100' };
      case 'error': return { bg: 'bg-red-900/95', border: 'border-red-500', bar: 'bg-red-400', text: 'text-red-100' };
      case 'warning': return { bg: 'bg-amber-900/95', border: 'border-amber-500', bar: 'bg-amber-400', text: 'text-amber-100' };
      case 'info': return { bg: 'bg-blue-900/95', border: 'border-blue-500', bar: 'bg-blue-400', text: 'text-blue-100' };
    }
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      
      {/* Barre de notifications en bas */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] flex flex-col items-center pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {notifications.map((notification) => {
          const colors = getColors(notification.type);
          return (
            <div
              key={notification.id}
              className={`
                pointer-events-auto w-full max-w-lg mx-auto px-3 py-0
                ${colors.bg} backdrop-blur-sm
                border-t ${colors.border}
                shadow-lg shadow-black/30
                animate-slide-up
              `}
              onClick={() => removeNotification(notification.id)}
            >
              <div className="flex items-center gap-2 py-2.5 px-1">
                <span className="text-base flex-shrink-0">{getIcon(notification.type)}</span>
                <p className={`text-xs sm:text-sm font-medium ${colors.text} flex-1 truncate`}>
                  {notification.message}
                </p>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeNotification(notification.id); }}
                  className="text-white/60 hover:text-white flex-shrink-0 text-lg leading-none p-0.5"
                >
                  ×
                </button>
              </div>
              {/* Barre de progression */}
              <div className="h-0.5 w-full bg-black/20 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.bar} rounded-full transition-all duration-75 ease-linear`}
                  style={{ width: `${notification.progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};
