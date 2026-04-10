import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, User, Hash, ArrowRight, AlertCircle, Check, Loader2, RefreshCw } from 'lucide-react';
import { useCustomer } from '../contexts/CustomerContext';
import toast from 'react-hot-toast';

const TOTAL_TABLES = 20; // Nombre total de tables disponibles

const CustomerLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoggedIn, connectedCustomers, isReady } = useCustomer();
  const [name, setName] = useState('');
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [customTableNumber, setCustomTableNumber] = useState('');
  const [useCustomTable, setUseCustomTable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtenir les tables occupées
  const occupiedTables = connectedCustomers.map(c => c.tableNumber);

  // Rediriger si déjà connecté
  useEffect(() => {
    if (isReady && isLoggedIn) {
      navigate('/menu', { replace: true });
    }
  }, [isReady, isLoggedIn, navigate]);

  const isTableOccupied = (tableNum: number) => {
    return occupiedTables.includes(tableNum);
  };

  // Vérifier si la table occupée appartient au même nom
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Veuillez entrer votre nom');
      return;
    }

    const tableNumber = getTableNumber();

    if (!tableNumber) {
      toast.error('Veuillez sélectionner ou entrer un numéro de table valide');
      return;
    }

    // Vérifier si la table est occupée par quelqu'un d'autre
    if (isTableOccupied(tableNumber)) {
      // Vérifier si c'est le même nom
      if (isTableOccupiedBySameName(tableNumber, name.trim())) {
        // Même personne, on autorise la reconnexion
        setIsSubmitting(true);
        try {
          await login(name.trim(), tableNumber);
          toast.success(`Bienvenue ${name} ! Reconnecté à la Table ${tableNumber}`);
        } catch {
          toast.error('Erreur de connexion');
        }
        setIsSubmitting(false);
        return;
      } else {
        toast.error(`La table ${tableNumber} est occupée par un autre client. Veuillez en choisir une autre.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await login(name.trim(), tableNumber);
      toast.success(`Bienvenue ${name} ! Table ${tableNumber}`);
    } catch {
      toast.error('Erreur de connexion');
    }
    setIsSubmitting(false);
  };

  // Afficher un loader pendant que la session est restaurée
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-4">
            <Store size={40} className="text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">FastOrder & Pay</h1>
          <p className="text-white/80 text-sm">Commande à table rapide et sans compte</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">
            Bienvenue ! Identifiez-vous
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nom */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Votre nom
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900"
                  placeholder="Ex: Jean"
                  required
                />
              </div>
            </div>

            {/* Sélection de table */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Numéro de table
              </label>
              
              {/* Grille des tables */}
              {!useCustomTable && (
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
                          relative p-3 rounded-xl border-2 text-sm font-bold transition-all
                          ${occupied && !sameName
                            ? 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed'
                            : sameName
                              ? selected 
                                ? 'bg-amber-500 border-amber-500 text-white shadow-lg scale-105'
                                : 'bg-amber-50 border-amber-300 text-amber-700 hover:border-amber-500'
                              : selected 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105'
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
              )}

              {/* Légende */}
              {!useCustomTable && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                    <span>Disponible</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                    <span>Occupée</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></div>
                    <span>Votre session</span>
                  </div>
                </div>
              )}

              {/* Toggle pour numéro personnalisé */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="customTable"
                  checked={useCustomTable}
                  onChange={(e) => {
                    setUseCustomTable(e.target.checked);
                    if (e.target.checked) {
                      setSelectedTable(null);
                    } else {
                      setCustomTableNumber('');
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="customTable" className="text-sm text-gray-600">
                  Mon numéro de table n'est pas dans la liste
                </label>
              </div>

              {/* Champ personnalisé */}
              {useCustomTable && (
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    min="1"
                    value={customTableNumber}
                    onChange={(e) => setCustomTableNumber(e.target.value)}
                    className={`w-full pl-11 pr-4 py-3.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 ${
                      customTableNumber && isTableOccupied(parseInt(customTableNumber)) && !(name.trim() && isTableOccupiedBySameName(parseInt(customTableNumber), name.trim()))
                        ? 'border-red-300 bg-red-50'
                        : customTableNumber && name.trim() && isTableOccupiedBySameName(parseInt(customTableNumber), name.trim())
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-gray-200'
                    }`}
                    placeholder="Entrez le numéro de votre table"
                  />
                  {customTableNumber && isTableOccupied(parseInt(customTableNumber)) && !(name.trim() && isTableOccupiedBySameName(parseInt(customTableNumber), name.trim())) && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Cette table est occupée par un autre client
                    </p>
                  )}
                  {customTableNumber && name.trim() && isTableOccupiedBySameName(parseInt(customTableNumber), name.trim()) && (
                    <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
                      <RefreshCw size={12} />
                      Reconnexion à votre session existante
                    </p>
                  )}
                </div>
              )}

              {selectedTable && !useCustomTable && !isTableOccupied(selectedTable) && (
                <p className="text-sm text-indigo-600 font-medium mt-2">
                  ✓ Table {selectedTable} sélectionnée
                </p>
              )}
              {selectedTable && !useCustomTable && isTableOccupied(selectedTable) && name.trim() && isTableOccupiedBySameName(selectedTable, name.trim()) && (
                <p className="text-sm text-amber-600 font-medium mt-2">
                  <RefreshCw size={14} className="inline mr-1" />
                  Reconnexion à la Table {selectedTable}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (!selectedTable && !customTableNumber)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Accéder au menu <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-center text-xs text-gray-500">
              En continuant, vous acceptez nos conditions d'utilisation.<br />
              Vos données sont utilisées uniquement pour votre commande.
            </p>
          </div>
        </div>

        {/* Footer - Accès vendeur visible */}
        <div className="mt-6 text-center space-y-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-white/80 text-xs mb-2">Vous êtes le gérant ?</p>
            <Link 
              to="/seller/login" 
              className="inline-flex items-center gap-2 bg-white text-indigo-600 font-bold px-6 py-2.5 rounded-xl hover:bg-indigo-50 transition-all shadow-lg"
            >
              <Store size={18} />
              Accès Espace Vendeur
            </Link>
          </div>
          <p className="text-white/50 text-xs">
            FastOrder & Pay © 2024
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;
