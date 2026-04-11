import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('quickorder_theme');
      return (saved === 'dark' ? 'dark' : 'light') as Theme;
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    localStorage.setItem('quickorder_theme', theme);
    // Apply dark class to the customer app wrapper
    const wrapper = document.getElementById('customer-app');
    if (wrapper) {
      if (theme === 'dark') {
        wrapper.classList.add('dark-theme');
      } else {
        wrapper.classList.remove('dark-theme');
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};
