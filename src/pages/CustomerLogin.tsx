import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, User, Hash, ArrowRight, AlertCircle, Check, Loader2, RefreshCw, Coffee, Utensils, Wifi, Smartphone, Clock, Star, Shield } from 'lucide-react';
import { useCustomer } from '../contexts/CustomerContext';
import { useNotification } from '../contexts/NotificationContext';

const TOTAL_TABLES = 20;

const CustomerLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoggedIn, connectedCustomers, isReady, sessionRestored } = useCustomer();
  const { notify } = useNotification();
  const [name, setName] = useState('');
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [customTableNumber, setCustomTableNumber] = useState('');
  const [useCustomTable, setUseCustomTable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRestoredBanner, setShowRestoredBanner] = useState(false);

  const occupiedTables = connectedCustomers.map(c => c.tableNumber);

  useEffect(() => {
    if (isReady && isLoggedIn) {
      if (sessionRestored) {
        setShowRestoredBanner(true);
        const timer = setTimeout(() => {
          navigate('/menu', { replace: true });
        }, 1200);
        return () => clearTimeout(timer);
      }
      navigate('/menu', { replace: true });
    }
  }, [isReady, isLoggedIn, sessionRestored, navigate]);

  const isTableOccupied = (tableNum: number) => occupiedTables.includes(tableNum);

  const isTableOccupiedBySameName = (tableNum: number, clientName: string) => {
    const occupant = connectedCustomers.find(c => c.tableNumber === tableNum);
    return occupant && occupant.name.toLowerCase() === clientName.toLowerCase();
  };

  const getTableNumber = (): number | null => {
    if (useCustomTable) {
      const num = parseInt(customTableNumber);
      return isNaN(num) || num < 1 ? null : num;
    }
    return selectedTable;
  };

  const getLoginErrorMessage = (error: any, tableNumber: number) => {
    if (error?.message === 'TABLE_OCCUPIED') {
      return `La table ${tableNumber} est deja occupee.`;
    }
    if (error?.message === 'DB_UNREACHABLE') {
      return 'Base indisponible temporairement. Reessayez dans quelques secondes.';
    }

    const raw = String(error?.message || '').toLowerCase();
    if (raw.includes('permission denied') || raw.includes('row-level security')) {
      return 'Erreur base de donnees: verifiez les politiques RLS Supabase.';
    }
    if (raw.includes('connected_clients') && raw.includes('does not exist')) {
      return 'Table connected_clients introuvable dans Supabase.';
    }
    if (raw.includes('network') || raw.includes('fetch')) {
      return 'Connexion au serveur impossible. Verifiez internet et reessayez.';
    }

    return 'Erreur de connexion';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { notify('Veuillez entrer votre nom', 'error'); return; }
    const tableNumber = getTableNumber();
    if (!tableNumber) { notify('Veuillez sélectionner ou entrer un numéro de table', 'error'); return; }

    if (isTableOccupied(tableNumber)) {
      if (isTableOccupiedBySameName(tableNumber, name.trim())) {
        setIsSubmitting(true);
        try {
          await login(name.trim(), tableNumber);
          notify(`Bienvenue ${name} ! Reconnecté à la Table ${tableNumber}`, 'success');
        } catch (error: any) {
          notify(getLoginErrorMessage(error, tableNumber), 'error');
        }
        setIsSubmitting(false);
        return;
      } else {
        notify(`La table ${tableNumber} est occupée. Choisissez-en une autre.`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await login(name.trim(), tableNumber);
      notify(`Bienvenue ${name} ! Table ${tableNumber}`, 'success');
    } catch (error: any) {
      notify(getLoginErrorMessage(error, tableNumber), 'error');
    }
    setIsSubmitting(false);
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <Loader2 size={40} className="mx-auto mb-4 animate-spin" />
          <p className="text-lg font-medium">Chargement de votre session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo / Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl mb-4 border border-white/20">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <Store size={36} className="text-indigo-600" />
              </div>
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-1 tracking-tight">
              FastOrder <span className="text-yellow-300">&</span> Pay
            </h1>
            <p className="text-white/70 text-sm font-medium">Commandez à table, payez en un clic</p>
            
            {/* Features badges */}
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20">
                <Smartphone size={12} /> Sans inscription
              </span>
              <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20">
                <Clock size={12} /> Rapide
              </span>
              <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20">
                <Shield size={12} /> Sécurisé
              </span>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 border border-white/50">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold mb-3">
                <Utensils size={16} />
                Identifiez-vous pour commander
              </div>
            </div>

            {showRestoredBanner && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Session restauree. Redirection en cours...
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  👤 Votre nom
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={20} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 text-lg font-medium bg-gray-50/50"
                    placeholder="Ex: Jean"
                    required
                  />
                </div>
              </div>

              {/* Table Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  🪑 Numéro de table
                </label>
                
                {!useCustomTable && (
                  <>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1).map((tableNum) => {
                        const occupied = isTableOccupied(tableNum);
                        const sameName = occupied && name.trim() && isTableOccupiedBySameName(tableNum, name.trim());
                        const selected = selectedTable === tableNum;
                        
                        return (
                          <button
                            key={tableNum}
                            type="button"
                            disabled={occupied && !sameName}
                            onClick={() => setSelectedTable(tableNum)}
                            className={`
                              relative p-3 rounded-xl border-2 text-sm font-bold transition-all duration-200
                              ${occupied && !sameName
                                ? 'bg-red-100 border-red-400 text-red-600 cursor-not-allowed opacity-80'
                                : sameName
                                  ? selected 
                                    ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200 scale-105'
                                    : 'bg-amber-50 border-amber-300 text-amber-700 hover:border-amber-500'
                                  : selected 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50'
                              }
                            `}
                          >
                            {tableNum}
                            {occupied && !sameName && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                <AlertCircle size={10} className="text-white" />
                              </span>
                            )}
                            {sameName && !selected && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                                <RefreshCw size={8} className="text-white" />
                              </span>
                            )}
                            {selected && !occupied && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <Check size={10} className="text-white" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 bg-white border-2 border-gray-300 rounded-md"></div>
                        <span className="font-medium">Disponible</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 bg-red-50 border-2 border-red-300 rounded-md"></div>
                        <span className="font-medium">Occupée</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 bg-amber-50 border-2 border-amber-300 rounded-md"></div>
                        <span className="font-medium">Votre session</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Toggle custom table */}
                <button type="button" onClick={() => { setUseCustomTable(!useCustomTable); if (!useCustomTable) { setSelectedTable(null); } else { setCustomTableNumber(''); } }}
                  className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1 mb-3">
                  {useCustomTable ? '← Revenir à la grille' : 'Mon numéro n\'est pas dans la liste'}
                </button>

                {useCustomTable && (
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={20} />
                    <input
                      type="number"
                      min="1"
                      value={customTableNumber}
                      onChange={(e) => setCustomTableNumber(e.target.value)}
                      className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 text-lg font-medium bg-gray-50/50 ${
                        customTableNumber && isTableOccupied(parseInt(customTableNumber)) && !(name.trim() && isTableOccupiedBySameName(parseInt(customTableNumber), name.trim()))
                          ? 'border-red-300 bg-red-50'
                          : customTableNumber && name.trim() && isTableOccupiedBySameName(parseInt(customTableNumber), name.trim())
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-gray-100'
                      }`}
                      placeholder="Entrez le numéro"
                    />
                    {customTableNumber && isTableOccupied(parseInt(customTableNumber)) && !(name.trim() && isTableOccupiedBySameName(parseInt(customTableNumber), name.trim())) && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium">
                        <AlertCircle size={12} /> Cette table est occupée
                      </p>
                    )}
                    {customTableNumber && name.trim() && isTableOccupiedBySameName(parseInt(customTableNumber), name.trim()) && (
                      <p className="text-amber-600 text-xs mt-1.5 flex items-center gap-1 font-medium">
                        <RefreshCw size={12} /> Reconnexion à votre session
                      </p>
                    )}
                  </div>
                )}

                {selectedTable && !useCustomTable && !isTableOccupied(selectedTable) && (
                  <div className="mt-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                    <Check size={16} /> Table {selectedTable} sélectionnée
                  </div>
                )}
                {selectedTable && !useCustomTable && isTableOccupied(selectedTable) && name.trim() && isTableOccupiedBySameName(selectedTable, name.trim()) && (
                  <div className="mt-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                    <RefreshCw size={16} /> Reconnexion à la Table {selectedTable}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || (!selectedTable && !customTableNumber)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {isSubmitting ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : (
                  <>
                    Commander <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Star size={10} /> Gratuit</span>
                <span className="flex items-center gap-1"><Wifi size={10} /> En ligne</span>
                <span className="flex items-center gap-1"><Coffee size={10} /> Simple</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center space-y-3">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
              <p className="text-white/70 text-xs mb-2 font-medium">Vous êtes le gérant ?</p>
              <Link 
                to="/seller/login" 
                className="inline-flex items-center gap-2 bg-white text-indigo-600 font-bold px-6 py-3 rounded-xl hover:bg-indigo-50 transition-all shadow-lg text-sm"
              >
                <Store size={18} />
                Accès Espace Vendeur
              </Link>
            </div>
            <p className="text-white/40 text-xs">
              FastOrder & Pay © 2025 — Tous droits réservés
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;
