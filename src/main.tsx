import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Supprimer l'écran de chargement quand React est prêt
const removeLoadingScreen = () => {
  const loadingEl = document.getElementById('loading-screen');
  if (loadingEl) {
    loadingEl.remove();
  }
};

// Nettoyer l'ancien cache potentiellement corrompu
try {
  const keysToCheck = ['quickorder_customer_session', 'products_state', 'orders_state', 'payment_numbers_state', 'seller_accounts_state', 'chat_messages_state'];
  keysToCheck.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        JSON.parse(value); // Vérifier que c'est du JSON valide
      }
    } catch {
      localStorage.removeItem(key);
    }
  });
} catch (e) {
  console.warn('Erreur nettoyage cache:', e);
}

try {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  // React va remplacer le contenu de #root, donc le loading screen sera supprimé automatiquement
} catch (error) {
  removeLoadingScreen();
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;font-family:system-ui;flex-direction:column;padding:20px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h2 style="color:#1e293b;margin-bottom:12px;">Erreur de démarrage</h2>
        <p style="color:#64748b;margin-bottom:20px;max-width:400px;word-break:break-all;">${error}</p>
        <button onclick="localStorage.clear();location.reload();" style="background:#3b82f6;color:white;border:none;border-radius:12px;padding:12px 32px;font-size:16px;cursor:pointer;">Effacer cache et recharger</button>
      </div>
    `;
  }
}
