import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, PlusCircle, CreditCard, UserPlus, Save, X, Edit2, Trash2, FileText, Download, Search, Wallet, User, Settings, BarChart3, Clock, TrendingUp, Award, Sun, Moon, Printer, Upload, Eye, Tag, ChevronRight, CheckCircle, AlertCircle, DollarSign, ShoppingBag, Users, Zap, CalendarDays } from 'lucide-react';
import { useOrders, OrderStatus, Order } from '../contexts/OrdersContext';
import { useCustomer } from '../contexts/CustomerContext';
import SellerHeader from '../components/SellerHeader';
import { useNotification } from '../contexts/NotificationContext';

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const formatPrice = (price: number) => new Intl.NumberFormat('fr-MG', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0 }).format(price);

const downloadBlob = (blob: Blob, filename: string) => {
  try {
    const url = URL.createObjectURL(blob);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const w = window.open(url, '_blank');
      if (w) {
        w.document.write(`<html><head><title>${filename}</title></head><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#f8fafc;"><div style="text-align:center;padding:2rem;background:white;border-radius:1rem;box-shadow:0 4px 6px rgba(0,0,0,0.1);"><div style="font-size:4rem;">📄</div><h2>Votre fichier est prêt</h2><a href="${url}" download="${filename}" style="display:inline-block;padding:12px 32px;background:#6366f1;color:white;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:1rem;">⬇️ Télécharger</a></div></body></html>`);
        w.document.close();
      } else {
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      }
    } else {
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { console.error(e); }
};

const statusLabel: Record<string, string> = {
  pending: 'En attente', paid: 'Payé', preparing: 'En préparation',
  ready: 'Prêt', completed: 'Terminé', cancelled: 'Annulé'
};
const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800', paid: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800', ready: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800'
};
const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock size={14} />, paid: <DollarSign size={14} />,
  preparing: <Zap size={14} />, ready: <CheckCircle size={14} />,
  completed: <CheckCircle size={14} />, cancelled: <AlertCircle size={14} />
};

const chunkBySize = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

type ReportHistoryItem = {
  id: string;
  period: string;
  format: 'pdf' | 'excel';
  generatedAt: string;
  fileName: string;
};

type AutoReportSchedule = {
  enabled: boolean;
  date?: string;
  time: string;
};

const reportPeriods = ['journalier', 'hebdomadaire', 'mensuel', 'trimestriel'] as const;

const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    orders, updateOrderStatus, products, addProduct, updateProduct, deleteProduct,
    paymentNumbers, updatePaymentNumber, sellerAccounts, addSellerAccount, updateSellerAccount, deleteSellerAccount,
    categories, addCategory, updateCategory, deleteCategory,
    restaurantSettings, updateRestaurantSettings,
  } = useOrders();
  const { connectedCustomers } = useCustomer();
  const { notify } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productFileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'payments' | 'accounts' | 'reports' | 'stats' | 'categories' | 'settings'>('orders');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [darkMode, setDarkMode] = useState(() => { try { return localStorage.getItem('seller_dark_mode') === 'true'; } catch { return false; } });

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showMyAccountModal, setShowMyAccountModal] = useState(false);
  const [showClientHistory, setShowClientHistory] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ name: string; table: number } | null>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem('seller_report_history');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Form - Product
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pCat, setPCat] = useState('');
  const [pImg, setPImg] = useState('');
  const [pQty, setPQty] = useState('');
  const [pEstTime, setPEstTime] = useState('');

  // Form - Account
  const [aUsername, setAUsername] = useState('');
  const [aPassword, setAPassword] = useState('');
  const [myUsername, setMyUsername] = useState('');
  const [myPassword, setMyPassword] = useState('');

  // Form - Category
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const sellerUsername = localStorage.getItem('sellerUsername') || '';
  const myAccount = sellerAccounts.find(a => a.username === sellerUsername);

  const [reportSchedules, setReportSchedules] = useState<Record<string, AutoReportSchedule>>(() => {
    try {
      const raw = localStorage.getItem('auto_report_schedules');
      if (raw) return JSON.parse(raw);
    } catch {}
    const today = new Date().toISOString().slice(0, 10);
    return {
      // Journalier: déclenchement quotidien à une heure donnée (sans date)
      journalier: { enabled: false, time: '22:00' },
      hebdomadaire: { enabled: false, date: today, time: '22:00' },
      mensuel: { enabled: false, date: today, time: '22:00' },
      trimestriel: { enabled: false, date: today, time: '22:00' },
    };
  });

  useEffect(() => {
    try { localStorage.setItem('seller_dark_mode', darkMode ? 'true' : 'false'); } catch {}
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Stats calculations
  const totalOrders = orders.length;
  const totalRevenue = orders.filter(o => ['paid', 'preparing', 'ready', 'completed'].includes(o.status)).reduce((s, o) => s + o.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'paid').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const vatAmount = totalRevenue * (restaurantSettings.vatRate / 100);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Best sellers
  const bestSellers = products.map(p => {
    const sold = orders.filter(o => ['paid', 'preparing', 'ready', 'completed'].includes(o.status))
      .reduce((sum, o) => sum + (o.items?.filter(i => i.product?.id === p.id).reduce((s, i) => s + i.quantity, 0) || 0), 0);
    return { name: p.name, sold, revenue: sold * p.price };
  }).filter(p => p.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 8);

  // Peak hours
  const peakHours = Array.from({ length: 24 }, (_, h) => {
    const count = orders.filter(o => { const d = new Date(o.createdAt); return d.getHours() === h; }).length;
    return { hour: `${h}h`, commandes: count };
  }).filter(h => h.commandes > 0);

  // Daily sales (last 7 days)
  const dailySales = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
    const dayOrders = orders.filter(o => { const od = new Date(o.createdAt); return od.toDateString() === d.toDateString(); });
    const revenue = dayOrders.filter(o => ['paid', 'preparing', 'ready', 'completed'].includes(o.status)).reduce((s, o) => s + o.total, 0);
    return { date: dateStr, ventes: revenue, commandes: dayOrders.length };
  });

  // Category distribution
  const categoryData = categories.map(c => ({
    name: c.name, value: orders.filter(o => ['paid', 'preparing', 'ready', 'completed'].includes(o.status))
      .reduce((sum, o) => sum + (o.items?.filter(i => i.product?.category === c.name).reduce((s, i) => s + i.quantity, 0) || 0), 0)
  })).filter(c => c.value > 0);

  // Filter orders - most recent first
  const filteredOrders = orders.filter(o => {
    if (selectedStatus !== 'all' && o.status !== selectedStatus) return false;
    if (searchQuery && !o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) && !o.tableNumber.toString().includes(searchQuery)) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Unique clients
  const uniqueClients = Array.from(new Set(orders.map(o => `${o.customerName}|${o.tableNumber}`))).map(s => {
    const [name, table] = s.split('|');
    const clientOrders = orders.filter(o => o.customerName === name && o.tableNumber === parseInt(table));
    return { name, table: parseInt(table), orderCount: clientOrders.length, totalSpent: clientOrders.filter(o => ['paid', 'preparing', 'ready', 'completed'].includes(o.status)).reduce((s, o) => s + o.total, 0) };
  });

  const accountColumns = chunkBySize([...sellerAccounts], 5);

  useEffect(() => {
    try {
      localStorage.setItem('auto_report_schedules', JSON.stringify(reportSchedules));
    } catch {}
  }, [reportSchedules]);

  useEffect(() => {
    try {
      localStorage.setItem('seller_report_history', JSON.stringify(reportHistory));
    } catch {}
  }, [reportHistory]);

  const addReportHistory = (period: string, format: 'pdf' | 'excel', fileName: string) => {
    const item: ReportHistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      period,
      format,
      generatedAt: new Date().toISOString(),
      fileName,
    };
    setReportHistory(prev => [item, ...prev].slice(0, 40));
  };

  useEffect(() => {
    const timer = setInterval(async () => {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      for (const period of reportPeriods) {
        const schedule = reportSchedules[period];
        if (!schedule?.enabled || !schedule.time) continue;

        const targetDate = period === 'journalier' ? todayStr : schedule.date;
        if (!targetDate) continue;

        const target = new Date(`${targetDate}T${schedule.time}:00`);
        if (Number.isNaN(target.getTime()) || now < target) continue;

        const runKey = `auto_report_run_${period}_${targetDate}_${schedule.time}`;
        if (localStorage.getItem(runKey) === 'done') continue;

        let pdfDone = false;
        let excelDone = false;
        try {
          await exportPDF(period, true);
          pdfDone = true;
        } catch (error) {
          console.error(`Auto PDF failed (${period})`, error);
        }
        try {
          await exportExcel(period, true);
          excelDone = true;
        } catch (error) {
          console.error(`Auto Excel failed (${period})`, error);
        }

        if (pdfDone || excelDone) {
          localStorage.setItem(runKey, 'done');
          notify(`Rapport auto ${period} ${pdfDone ? 'PDF' : ''}${pdfDone && excelDone ? ' + ' : ''}${excelDone ? 'Excel' : ''} généré`, 'success');
        } else {
          notify(`Échec du rapport automatique (${period})`, 'error');
        }
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [reportSchedules, notify]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setPImg(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const openProductModal = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setPName(product.name); setPDesc(product.description || ''); setPPrice(product.price.toString());
      setPCat(product.category); setPImg(product.image || ''); setPQty(product.quantity?.toString() || '');
      setPEstTime(product.estimatedMinutes?.toString() || '');
    } else {
      setEditingProduct(null);
      setPName(''); setPDesc(''); setPPrice(''); setPCat(categories[0]?.name || 'Pizza'); setPImg(''); setPQty(''); setPEstTime('');
    }
    setShowProductModal(true);
  };

  const saveProduct = () => {
    if (!pName || !pPrice) { notify('Nom et prix obligatoires', 'error'); return; }
    const data = { name: pName, description: pDesc, price: parseFloat(pPrice), category: pCat, image: pImg, quantity: pQty ? parseInt(pQty) : undefined, estimatedMinutes: pEstTime ? parseInt(pEstTime) : undefined };
    if (editingProduct) { updateProduct(editingProduct.id, data); notify('Produit mis à jour', 'info'); }
    else { addProduct(data as any); notify('Produit ajouté', 'success'); }
    setShowProductModal(false);
  };

  const saveCategory = () => {
    if (!catName) { notify('Nom obligatoire', 'error'); return; }
    if (editingCategory) { updateCategory(editingCategory.id, { name: catName, icon: catIcon }); notify('Catégorie modifiée', 'info'); }
    else { addCategory({ name: catName, icon: catIcon, order: categories.length + 1 }); notify('Catégorie ajoutée', 'success'); }
    setShowCategoryModal(false); setCatName(''); setCatIcon(''); setEditingCategory(null);
  };

  const saveAccount = () => {
    if (!aUsername || !aPassword) { notify('Champs obligatoires', 'error'); return; }
    addSellerAccount({ username: aUsername, password: aPassword, role: 'seller' });
    notify('Compte créé', 'success'); setShowAccountModal(false); setAUsername(''); setAPassword('');
  };

  // Validate order with next status
  const validateOrder = (order: Order) => {
    const nextStatus: Record<string, OrderStatus> = {
      pending: 'paid', paid: 'preparing', preparing: 'ready', ready: 'completed'
    };
    const next = nextStatus[order.status];
    if (next) {
      updateOrderStatus(order.id, next);
      notify(`Commande T${order.tableNumber} → ${statusLabel[next]}`, 'info');
    }
  };

  // Get estimated time remaining
  const getEstimatedTimeRemaining = (order: Order) => {
    if (!order.estimatedMinutes) return null;
    const orderTime = new Date(order.createdAt).getTime();
    const elapsed = Math.floor((Date.now() - orderTime) / 60000);
    const remaining = order.estimatedMinutes - elapsed;
    return { remaining, elapsed, total: order.estimatedMinutes };
  };

  // Print receipt
  const printReceipt = (order: Order) => {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    const est = getEstimatedTimeRemaining(order);
    w.document.write(`<html><head><title>Reçu</title><style>body{font-family:Arial,sans-serif;max-width:320px;margin:0 auto;padding:20px;font-size:14px;}h2{text-align:center;border-bottom:2px dashed #000;padding-bottom:10px;font-size:18px;}table{width:100%;border-collapse:collapse;}td,th{text-align:left;padding:4px 0;font-size:13px;}.right{text-align:right;}.total{border-top:2px dashed #000;font-weight:bold;font-size:16px;padding-top:10px;}.info{color:#666;font-size:11px;}</style></head><body>
    <h2>🧾 ${restaurantSettings.name}</h2>
    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString('fr-FR')}</p>
    <p><strong>Table:</strong> ${order.tableNumber} | <strong>Client:</strong> ${order.customerName || '-'}</p>
    <p class="info">Commande: ${order.id.slice(0, 8)}</p>
    ${est ? `<p><strong>⏱ Temps estimé:</strong> ${est.total} min</p>` : ''}
    <hr style="border:1px dashed #000;">
    <table><tr><th>Article</th><th class="right">Qté</th><th class="right">Prix</th></tr>
    ${order.items.map((i: any) => `<tr><td>${i.product?.name || ''}</td><td class="right">${i.quantity}</td><td class="right">${formatPrice((i.product?.price || 0) * i.quantity)}</td></tr>`).join('')}
    </table>
    <div class="total"><span>Total: ${formatPrice(order.total)}</span></div>
    ${restaurantSettings.vatRate > 0 ? `<p style="font-size:11px;color:#666;">TVA ${restaurantSettings.vatRate}%: ${formatPrice(order.total * restaurantSettings.vatRate / (100 + restaurantSettings.vatRate))}</p>` : ''}
    <p style="text-align:center;margin-top:20px;font-size:12px;">Merci de votre visite ! 😊</p>
    <script>window.print();</script></body></html>`);
    w.document.close();
  };

  const getPeriodOrders = (period: string) => {
    const now = new Date();
    const paidOrders = orders.filter(o => ['paid', 'preparing', 'ready', 'completed'].includes(o.status));
    return paidOrders.filter(o => {
      const d = new Date(o.createdAt);
      if (period === 'journalier') return d.toDateString() === now.toDateString();
      if (period === 'hebdomadaire') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return d >= start;
      }
      if (period === 'mensuel') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'trimestriel') {
        const quarter = Math.floor(now.getMonth() / 3);
        return Math.floor(d.getMonth() / 3) === quarter && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const buildReportFileName = (period: string, format: 'pdf' | 'excel') => {
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    return `rapport_${period}_${new Date().toISOString().slice(0, 10)}.${ext}`;
  };

  const generatePDFBlob = async (period: string) => {
    const { default: jsPDF } = await import('jspdf');
    const periodOrders = getPeriodOrders(period);
    const periodRevenue = periodOrders.reduce((sum, o) => sum + o.total, 0);
    const periodVat = periodRevenue * (restaurantSettings.vatRate / 100);

    const pdf = new jsPDF();
    pdf.setFontSize(20); pdf.text(`${restaurantSettings.name}`, 14, 22);
    pdf.setFontSize(14); pdf.text(`Rapport ${period}`, 14, 32);
    pdf.setFontSize(10); pdf.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 14, 40);
    pdf.setFontSize(11);
    pdf.text(`Commandes: ${periodOrders.length} | CA: ${formatPrice(periodRevenue)} | TVA: ${formatPrice(periodVat)}`, 14, 50);
    let y = 62;
    pdf.setFontSize(9);
    periodOrders.slice(0, 120).forEach(o => {
      if (y > 280) { pdf.addPage(); y = 20; }
      pdf.text(`${new Date(o.createdAt).toLocaleString('fr-FR')} | T${o.tableNumber} | ${o.customerName} | ${formatPrice(o.total)} | ${statusLabel[o.status] || o.status}`, 14, y);
      y += 7;
    });
    return pdf.output('blob');
  };

  const generateExcelBlob = async (period: string) => {
    const XLSX = await import('xlsx');
    const periodOrders = getPeriodOrders(period);
    const periodRevenue = periodOrders.reduce((sum, o) => sum + o.total, 0);
    const periodVat = periodRevenue * (restaurantSettings.vatRate / 100);

    const data = periodOrders.map(o => ({
      Date: new Date(o.createdAt).toLocaleString('fr-FR'), Table: o.tableNumber, Client: o.customerName,
      Articles: o.items?.map((i: any) => `${i.product?.name || i.name} x${i.quantity}`).join(', '),
      Total: o.total, Statut: statusLabel[o.status] || o.status, Paiement: o.paymentMethod,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 8 }, { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Commandes');
    const summaryWs = XLSX.utils.json_to_sheet([{
      Periode: period,
      Total_Commandes: periodOrders.length,
      Chiffre_Affaires: periodRevenue,
      TVA: periodVat,
    }]);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/octet-stream' });
  };

  const exportPDF = async (period: string, silent = false) => {
    try {
      const blob = await generatePDFBlob(period);
      const fileName = buildReportFileName(period, 'pdf');
      downloadBlob(blob, fileName);
      addReportHistory(period, 'pdf', fileName);
      if (!silent) notify('PDF généré', 'success');
    } catch (e) {
      if (!silent) notify('Erreur PDF', 'error');
      console.error(e);
      throw e;
    }
  };

  const exportExcel = async (period: string, silent = false) => {
    try {
      const blob = await generateExcelBlob(period);
      const fileName = buildReportFileName(period, 'excel');
      downloadBlob(blob, fileName);
      addReportHistory(period, 'excel', fileName);
      if (!silent) notify('Excel généré', 'success');
    } catch (e) {
      if (!silent) notify('Erreur Excel', 'error');
      console.error(e);
      throw e;
    }
  };

  const openReportHistoryItem = async (item: ReportHistoryItem) => {
    if (item.format === 'pdf') {
      const blob = await generatePDFBlob(item.period);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }
    const blob = await generateExcelBlob(item.period);
    downloadBlob(blob, item.fileName);
  };

  const printReportHistoryItem = async (item: ReportHistoryItem) => {
    if (item.format !== 'pdf') {
      notify('Impression directe disponible uniquement pour PDF', 'warning');
      return;
    }
    const blob = await generatePDFBlob(item.period);
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
      w.onload = () => {
        w.print();
      };
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const bg = darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900';
  const cardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textSec = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputCls = `w-full text-base px-4 py-3 rounded-xl border ${cardBg} focus:ring-2 focus:ring-indigo-500 outline-none`;
  const primaryBtnCls = 'flex items-center gap-2 px-4 h-11 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors';
  const successBtnCls = 'flex items-center gap-2 px-4 h-11 bg-green-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-green-700 transition-colors';
  const cardShellCls = `${cardBg} border rounded-2xl shadow-sm h-full`;

  const tabs = [
    { id: 'orders' as const, label: 'Commandes', icon: Package, badge: pendingOrders },
    { id: 'products' as const, label: 'Produits', icon: Package },
    { id: 'categories' as const, label: 'Catégories', icon: Tag },
    { id: 'stats' as const, label: 'Statistiques', icon: BarChart3 },
    { id: 'payments' as const, label: 'Paiements', icon: CreditCard },
    { id: 'accounts' as const, label: 'Comptes', icon: User },
    { id: 'reports' as const, label: 'Rapports', icon: FileText },
    { id: 'settings' as const, label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className={`min-h-screen ${bg} transition-colors`}>
      <SellerHeader />

      <div className={`sticky top-[88px] z-40 ${darkMode ? 'bg-gray-900/95' : 'bg-gray-50/95'} backdrop-blur border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        {/* Top bar: theme + connected clients */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-indigo-500" />
            <span className={`text-sm sm:text-base font-semibold ${textSec}`}>{connectedCustomers.length} client(s) connecté(s)</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)}
            className={`flex items-center gap-2 px-3 h-10 rounded-xl text-sm font-semibold transition-all ${darkMode ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-yellow-400'}`}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? 'Clair' : 'Sombre'}
          </button>
        </div>

        {/* Global quick stats above tabs */}
        <div className="px-4 pb-2">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            <div className={`relative overflow-hidden p-4 min-w-[210px] flex-1 ${cardShellCls} h-[140px]`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-6 translate-x-6" />
            <div className="bg-blue-500 text-white p-2.5 rounded-xl w-fit mb-2"><ShoppingBag size={20} /></div>
            <p className={`text-sm ${textSec} font-medium`}>Commandes</p>
            <p className="text-xl font-bold mt-1">{totalOrders}</p>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{completedOrders} terminées</span>
            </div>
            <div className={`relative overflow-hidden p-4 min-w-[210px] flex-1 ${cardShellCls} h-[140px]`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -translate-y-6 translate-x-6" />
            <div className="bg-emerald-500 text-white p-2.5 rounded-xl w-fit mb-2"><Wallet size={20} /></div>
            <p className={`text-sm ${textSec} font-medium`}>Chiffre d'affaires</p>
            <p className="text-lg font-bold mt-1">{formatPrice(totalRevenue)}</p>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Panier moy: {formatPrice(avgOrder)}</span>
            </div>
            <div className={`relative overflow-hidden p-4 min-w-[210px] flex-1 ${cardShellCls} h-[140px]`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-6 translate-x-6" />
            <div className="bg-orange-500 text-white p-2.5 rounded-xl w-fit mb-2"><Clock size={20} /></div>
            <p className={`text-sm ${textSec} font-medium`}>En attente</p>
            <p className="text-xl font-bold mt-1">{pendingOrders}</p>
            {pendingOrders > 0 && (
              <span className="animate-pulse text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit">
                <Zap size={10} /> Action requise
              </span>
            )}
            </div>
            <div className={`relative overflow-hidden p-4 min-w-[210px] flex-1 ${cardShellCls} h-[140px]`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-6 translate-x-6" />
            <div className="bg-purple-500 text-white p-2.5 rounded-xl w-fit mb-2"><TrendingUp size={20} /></div>
            <p className={`text-sm ${textSec} font-medium`}>TVA ({restaurantSettings.vatRate}%)</p>
            <p className="text-lg font-bold mt-1">{formatPrice(vatAmount)}</p>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{restaurantSettings.currency}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`h-9 flex items-center gap-2 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-200/70' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              <t.icon size={15} />{t.label}
              {t.badge ? <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{t.badge}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {/* ========== ORDERS TAB ========== */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4">
              <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as any)}
                className={`text-sm px-4 py-3 rounded-xl border ${cardBg} font-medium`}>
                {['all', 'pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled'].map(s => (
                  <option key={s} value={s}>{s === 'all' ? 'Tous les statuts' : statusLabel[s]}</option>
                ))}
              </select>
              <div className="relative flex-1 min-w-[180px]">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Rechercher client ou table..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className={`w-full text-sm pl-11 pr-4 py-3 rounded-xl border ${cardBg}`} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredOrders.map(order => {
                const nextStatus: Record<string, string> = { pending: 'Payé', paid: 'Préparer', preparing: 'Prêt', ready: 'Terminer' };
                const canValidate = !!nextStatus[order.status];
                const isLocked = order.status === 'completed' || order.status === 'cancelled';
                const compactItems = order.items?.slice(0, 2) || [];
                const hiddenCount = (order.items?.length || 0) - compactItems.length;
                return (
                  <div key={order.id} className={`${cardBg} border rounded-2xl p-4 shadow-sm ${isLocked ? 'opacity-85' : ''}`}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl whitespace-nowrap">T{order.tableNumber}</span>
                        <div className="min-w-0">
                          <p className="text-base font-semibold truncate">{order.customerName || 'Client'}</p>
                          <p className={`text-xs ${textSec}`}>{new Date(order.createdAt).toLocaleString('fr-FR')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => printReceipt(order)}
                          className="p-2 rounded-xl transition-colors bg-gray-100 hover:bg-gray-200"
                          title="Imprimer"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/seller/orders/${order.id}`)}
                          className="p-2 rounded-xl transition-colors bg-indigo-100 hover:bg-indigo-200 text-indigo-700"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Items summary (compact) */}
                    <div className={`text-sm ${textSec} mb-3 space-y-1`}>
                      {compactItems.map((i: any, idx: number) => {
                        const itemName = i.product?.name || i.name;
                        const itemPrep = i.product?.estimatedMinutes || products.find(p => p.id === i.product?.id || p.name === itemName)?.estimatedMinutes;
                        return (
                          <p key={idx} className="truncate">
                            {itemName} ×{i.quantity}
                            {itemPrep ? <span className="ml-2 text-indigo-600 font-medium">⏱ {itemPrep} min</span> : null}
                          </p>
                        );
                      })}
                      {hiddenCount > 0 ? <p className="text-xs font-semibold text-indigo-600">+{hiddenCount} article(s)</p> : null}
                    </div>

                    {/* Status + Price + Validate */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${statusColor[order.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusIcon[order.status]}
                          {statusLabel[order.status] || order.status}
                        </span>
                        <span className="text-lg font-bold">{formatPrice(order.total)}</span>
                      </div>
                      <div className="text-xs px-3 py-2 rounded-xl border bg-gray-50 text-gray-600 font-semibold">
                        Statut fixe
                      </div>
                    </div>

                    {/* Validate button */}
                    {canValidate && !isLocked && (
                      <button onClick={() => validateOrder(order)}
                        className={`mt-3 w-full py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                          order.status === 'pending' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                          order.status === 'paid' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                          order.status === 'preparing' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' :
                          'bg-green-600 hover:bg-green-700 text-white'
                        }`}>
                        <CheckCircle size={18} />
                        Valider → {nextStatus[order.status]}
                      </button>
                    )}

                    {isLocked && (
                      <div className="mt-3 w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold text-center">
                        Commande verrouillee: aucune modification possible
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredOrders.length === 0 && <p className="text-center py-12 text-gray-400 text-lg">Aucune commande</p>}
            </div>
          </div>
        )}

        {/* ========== PRODUCTS TAB ========== */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4 items-center">
              <button onClick={() => openProductModal()} className={primaryBtnCls}>
                <PlusCircle size={18} /> Ajouter un produit
              </button>
              <div className="relative flex-1 min-w-[160px]">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Filtrer les produits..." value={productFilter} onChange={e => setProductFilter(e.target.value)}
                  className={`w-full text-sm pl-11 pr-4 py-3 rounded-xl border ${cardBg}`} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
              {products.filter(p => !productFilter || p.name.toLowerCase().includes(productFilter.toLowerCase())).map(p => (
                <div key={p.id} className={`${cardBg} border rounded-2xl p-4 shadow-sm`}>
                  <div className="flex items-center gap-4">
                    {p.image ? <img src={p.image} alt={p.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" /> :
                      <div className="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0"><Package size={20} className="text-gray-400" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold truncate">{p.name}</p>
                      <p className={`text-sm ${textSec}`}>{p.category} • {formatPrice(p.price)}</p>
                      <p className={`text-sm ${textSec}`}>
                        Stock: <span className={p.quantity !== undefined && p.quantity !== null && p.quantity <= 5 ? 'text-red-500 font-bold' : 'font-semibold'}>
                          {p.quantity !== undefined && p.quantity !== null ? p.quantity : 'Illimité'}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {p.quantity === undefined || p.quantity === null ? (
                        <button onClick={() => updateProduct(p.id, { isActive: !p.isActive })}
                          className={`text-sm px-4 py-2 rounded-xl font-bold transition-all ${p.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                          {p.isActive ? '✅ Actif' : '❌ Inactif'}
                        </button>
                      ) : p.quantity <= 0 ? (
                        <span className="text-sm px-4 py-2 rounded-xl bg-red-100 text-red-700 font-bold">Rupture</span>
                      ) : (
                        <span className="text-sm px-4 py-2 rounded-xl bg-blue-100 text-blue-700 font-bold">Auto</span>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => openProductModal(p)} className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => { deleteProduct(p.id); notify('Produit supprimé', 'warning'); }} className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== CATEGORIES TAB ========== */}
        {activeTab === 'categories' && (
          <div>
            <button onClick={() => { setEditingCategory(null); setCatName(''); setCatIcon(''); setShowCategoryModal(true); }}
              className={`${primaryBtnCls} mb-4`}>
              <PlusCircle size={18} /> Nouvelle Catégorie
            </button>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {[...categories].sort((a, b) => a.order - b.order).map(c => (
                <div key={c.id} className={`${cardBg} border rounded-2xl p-4 flex items-center justify-between shadow-sm`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{c.icon || '📦'}</span>
                    <div className="min-w-0">
                      <p className="text-base font-semibold truncate">{c.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                        {products.filter(p => p.category === c.name).length} produits
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingCategory(c); setCatName(c.name); setCatIcon(c.icon || ''); setShowCategoryModal(true); }}
                      className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => { deleteCategory(c.id); notify('Catégorie supprimée', 'warning'); }}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== STATS TAB ========== */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Best Sellers */}
            <div className={`${cardBg} border rounded-2xl p-5 shadow-sm`}>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Award size={20} className="text-yellow-500" /> 🏆 Best-Sellers</h3>
              {bestSellers.length > 0 ? (
                <div className="space-y-3">
                  {bestSellers.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-400 text-orange-900' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{p.name}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                          <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (p.sold / (bestSellers[0]?.sold || 1)) * 100)}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-indigo-600">{p.sold} vendus</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-base text-gray-400 text-center py-6">Aucune donnée disponible</p>}
            </div>

            {/* Daily Sales Chart */}
            <div className={`${cardBg} border rounded-2xl p-5 shadow-sm`}>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><TrendingUp size={20} className="text-green-500" /> 📈 Ventes (7 jours)</h3>
              <div className="space-y-2.5">
                {dailySales.map((d, i) => {
                  const maxVal = Math.max(...dailySales.map(x => x.ventes), 1);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm w-16 text-right text-gray-500 truncate font-medium">{d.date}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full rounded-full transition-all" style={{ width: `${(d.ventes / maxVal) * 100}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">{d.commandes} cmd</span>
                      </div>
                      <span className="text-sm w-24 text-right font-bold">{formatPrice(d.ventes)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Peak Hours */}
            <div className={`${cardBg} border rounded-2xl p-5 shadow-sm`}>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Clock size={20} className="text-blue-500" /> ⏰ Heures de pointe</h3>
              {peakHours.length > 0 ? (
                <div className="flex items-end gap-2 h-40">
                  {peakHours.map((h, i) => {
                    const maxVal = Math.max(...peakHours.map(x => x.commandes), 1);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-bold">{h.commandes}</span>
                        <div className="w-full bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-lg transition-all" style={{ height: `${(h.commandes / maxVal) * 100}%`, minHeight: '6px' }} />
                        <span className="text-xs text-gray-500 font-medium">{h.hour}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-base text-gray-400 text-center py-6">Aucune donnée disponible</p>}
            </div>

            {/* Client History */}
            <div className={`${cardBg} border rounded-2xl p-5 shadow-sm`}>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><User size={20} className="text-indigo-500" /> 👥 Historique clients</h3>
              <div className="space-y-2">
                {uniqueClients.slice(0, 20).map((c, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                    onClick={() => { setSelectedClient(c); setShowClientHistory(true); }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-base font-bold text-indigo-700">{c.name?.[0]?.toUpperCase() || '?'}</div>
                      <div>
                        <p className="text-base font-semibold">{c.name}</p>
                        <p className={`text-sm ${textSec}`}>Table {c.table}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold">{formatPrice(c.totalSpent)}</p>
                      <p className={`text-sm ${textSec}`}>{c.orderCount} commande(s)</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
            </div>

            {/* Category Distribution */}
            <div className={`${cardBg} border rounded-2xl p-5 shadow-sm max-w-3xl mx-auto`}>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><BarChart3 size={20} className="text-purple-500" /> 📊 Par catégorie</h3>
              {categoryData.length > 0 ? (
                <div className="space-y-3">
                  {categoryData.map((c, i) => {
                    const total = categoryData.reduce((s, x) => s + x.value, 0);
                    const pct = total > 0 ? ((c.value / total) * 100).toFixed(0) : 0;
                    return (
                      <div key={i} className="flex items-center gap-3 justify-center">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-sm w-36 font-medium text-center">{c.name}</span>
                        <div className="w-24 bg-gray-200 rounded-full h-3">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        </div>
                        <span className="text-sm font-bold w-12 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-base text-gray-400 text-center py-6">Aucune donnée par catégorie pour le moment</p>
              )}
            </div>

          </div>
        )}

        {/* ========== PAYMENTS TAB ========== */}
        {activeTab === 'payments' && (
          <div className="flex flex-nowrap gap-4 overflow-x-auto no-scrollbar pb-1">
            {Object.entries(paymentNumbers).map(([key, info]) => {
              const provider = key === 'orange_money' ? 'Orange Money' : key === 'mvola' ? 'Mvola' : 'Airtel Money';
              const color = key === 'orange_money' ? 'from-orange-500 to-orange-400' : key === 'mvola' ? 'from-red-600 to-red-500' : 'from-red-500 to-red-400';
              const icon = key === 'orange_money' ? '🟠' : key === 'mvola' ? '🔴' : '🟣';
              return (
                <div key={key} className={`${cardBg} border rounded-2xl p-5 shadow-sm min-w-[320px] flex-1`}>
                  <div className={`grid grid-cols-3 items-center gap-3 mb-3 text-sm`}>
                    <div className={`bg-gradient-to-r ${color} text-white px-3 py-2 rounded-xl font-bold text-center`}>
                      {icon} {provider}
                    </div>
                    <div className={`text-center ${textSec}`}>
                      Marchand<br />
                      <strong className={darkMode ? 'text-gray-100' : 'text-gray-900'}>{info.merchantName}</strong>
                    </div>
                    <div className="text-right font-mono font-bold text-lg">{info.number}</div>
                  </div>
                  {editingPayment === key ? (
                    <div className="space-y-3">
                      <input type="text" value={info.number} onChange={e => updatePaymentNumber(key as any, { ...info, number: e.target.value })}
                        className={inputCls} placeholder="Numéro" />
                      <input type="text" value={info.merchantName} onChange={e => updatePaymentNumber(key as any, { ...info, merchantName: e.target.value })}
                        className={inputCls} placeholder="Nom marchand" />
                      <button onClick={() => { setEditingPayment(null); notify('Paiement mis à jour', 'info'); }}
                        className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-bold shadow-sm">
                        <Save size={16} /> Enregistrer
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button onClick={() => setEditingPayment(key)} className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        <Edit2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ========== ACCOUNTS TAB ========== */}
        {activeTab === 'accounts' && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <button onClick={() => setShowAccountModal(true)}
                className={primaryBtnCls}>
                <UserPlus size={18} /> Nouveau Compte
              </button>
              {myAccount ? (
                <button
                  onClick={() => {
                    setMyUsername(myAccount.username);
                    setMyPassword('');
                    setShowMyAccountModal(true);
                  }}
                  className={successBtnCls}
                >
                  <Edit2 size={16} /> Modifier mon compte ({myAccount.username})
                </button>
              ) : null}
            </div>
            <div className="flex flex-nowrap gap-3 overflow-x-auto no-scrollbar pb-1">
              {accountColumns.map((column, colIdx) => (
                <div key={colIdx} className="min-w-[280px] space-y-3">
                  {column.map(a => (
                    <div key={a.username} className={`${cardBg} border rounded-2xl p-4 flex items-center justify-between shadow-sm`}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center"><User size={20} className="text-indigo-700" /></div>
                        <div>
                          <p className="text-base font-semibold">{a.username}</p>
                          <p className={`text-sm ${textSec}`}>{a.role || 'vendeur'}</p>
                        </div>
                      </div>
                      {sellerUsername === 'admin' && a.username !== 'admin' && (
                        <button onClick={() => { deleteSellerAccount(a.username); notify('Compte supprimé', 'warning'); }}
                          className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== REPORTS TAB ========== */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex flex-nowrap gap-4 overflow-x-auto no-scrollbar pb-1">
              {reportPeriods.map(period => (
                <div key={period} className={`${cardBg} border rounded-2xl p-5 shadow-sm min-w-[300px] flex-1`}>
                  <p className="text-lg font-bold mb-3">📊 Rapport {period}</p>
                  <div className="flex gap-3">
                    <button onClick={() => exportPDF(period)} className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-bold shadow-sm">
                      <Download size={16} /> PDF
                    </button>
                    <button onClick={() => exportExcel(period)} className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-bold shadow-sm">
                      <Download size={16} /> Excel
                    </button>
                  </div>
                  <div className={`mt-4 p-3 rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <CalendarDays size={14} />
                      {period === 'journalier' ? 'Déclenchement automatique (heure)' : 'Déclenchement automatique (date + heure)'}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {period !== 'journalier' && (
                        <input
                          type="date"
                          value={reportSchedules[period]?.date || ''}
                          onChange={(e) => setReportSchedules(prev => ({
                            ...prev,
                            [period]: { ...(prev[period] || { enabled: false, date: '', time: '22:00' }), date: e.target.value },
                          }))}
                          className={inputCls}
                        />
                      )}
                      <input
                        type="time"
                        value={reportSchedules[period]?.time || '22:00'}
                        onChange={(e) => setReportSchedules(prev => ({
                          ...prev,
                          [period]: { ...(prev[period] || { enabled: false, time: '22:00' }), time: e.target.value },
                        }))}
                        className={inputCls}
                      />
                      <label className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={reportSchedules[period]?.enabled || false}
                          onChange={(e) => setReportSchedules(prev => ({
                            ...prev,
                            [period]: { ...(prev[period] || { enabled: false, time: '22:00' }), enabled: e.target.checked },
                          }))}
                        />
                        Activer l'auto rapport {period}
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={`${cardBg} border rounded-2xl p-5 shadow-sm`}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-bold">🗂️ Historique des rapports</p>
                {reportHistory.length > 0 && (
                  <button
                    onClick={() => setReportHistory([])}
                    className="text-sm px-3 py-2 rounded-lg bg-red-50 text-red-600 font-semibold"
                  >
                    Vider
                  </button>
                )}
              </div>

              {reportHistory.length === 0 ? (
                <p className={`text-sm ${textSec}`}>Aucun rapport généré pour le moment.</p>
              ) : (
                <div className="flex flex-nowrap gap-3 overflow-x-auto no-scrollbar pb-1">
                  {reportHistory.map((item) => (
                    <div key={item.id} className={`min-w-[320px] rounded-xl border p-3 ${darkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="mb-3">
                        <p className="text-sm font-bold">
                          {item.format.toUpperCase()} - {item.period}
                        </p>
                        <p className={`text-xs ${textSec}`}>{new Date(item.generatedAt).toLocaleString('fr-FR')}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openReportHistoryItem(item)}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                        >
                          <Eye size={14} /> Visualiser
                        </button>
                        <button
                          onClick={() => printReportHistoryItem(item)}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-800 text-white text-xs font-semibold"
                        >
                          <Printer size={14} /> Imprimer
                        </button>
                        <button
                          onClick={() => item.format === 'pdf' ? exportPDF(item.period, true) : exportExcel(item.period, true)}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                        >
                          <Download size={14} /> Re-générer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== SETTINGS TAB ========== */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`${cardBg} border rounded-2xl p-5 shadow-sm`}>
              <h3 className="text-lg font-bold mb-4">🏪 Restaurant</h3>
              <div className="space-y-4">
                <div>
                  <label className={`text-sm font-semibold ${textSec} block mb-1`}>Nom du restaurant</label>
                  <input type="text" value={restaurantSettings.name} onChange={e => updateRestaurantSettings({ name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={`text-sm font-semibold ${textSec} block mb-1`}>Nombre de tables</label>
                  <input type="number" value={restaurantSettings.tableCount} onChange={e => updateRestaurantSettings({ tableCount: parseInt(e.target.value) || 20 })} className={inputCls} />
                </div>
                <div>
                  <label className={`text-sm font-semibold ${textSec} block mb-1`}>Téléphone</label>
                  <input type="text" value={restaurantSettings.phone} onChange={e => updateRestaurantSettings({ phone: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={`text-sm font-semibold ${textSec} block mb-1`}>Adresse</label>
                  <input type="text" value={restaurantSettings.address} onChange={e => updateRestaurantSettings({ address: e.target.value })} className={inputCls} />
                </div>
              </div>
            </div>

            <div className={`${cardBg} border rounded-2xl p-5 shadow-sm`}>
              <h3 className="text-lg font-bold mb-4">💰 TVA & Prix</h3>
              <div className="space-y-4">
                <div>
                  <label className={`text-sm font-semibold ${textSec} block mb-1`}>Taux TVA (%)</label>
                  <input type="number" value={restaurantSettings.vatRate} onChange={e => updateRestaurantSettings({ vatRate: parseFloat(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div>
                  <label className={`text-sm font-semibold ${textSec} block mb-1`}>Temps de préparation par défaut (min)</label>
                  <input type="number" value={restaurantSettings.defaultPrepTime} onChange={e => updateRestaurantSettings({ defaultPrepTime: parseInt(e.target.value) || 20 })} className={inputCls} />
                </div>
                <div>
                  <label className={`text-sm font-semibold ${textSec} block mb-1`}>Devise</label>
                  <input type="text" value={restaurantSettings.currency} onChange={e => updateRestaurantSettings({ currency: e.target.value })} className={inputCls} />
                </div>
              </div>
            </div>
            </div>

            <div className={`${cardBg} border rounded-2xl p-5 shadow-sm`}>
              <h3 className="text-lg font-bold mb-4">🖼️ Logo</h3>
              <div className="flex items-center gap-4">
                {restaurantSettings.logo ? <img src={restaurantSettings.logo} alt="Logo" className="w-20 h-20 rounded-2xl object-cover shadow-sm" /> :
                  <div className="w-20 h-20 rounded-2xl bg-gray-200 flex items-center justify-center text-3xl">🏪</div>}
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm">
                  <Upload size={16} /> {restaurantSettings.logo ? 'Changer' : 'Uploader'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const r = new FileReader(); r.onloadend = () => updateRestaurantSettings({ logo: r.result as string }); r.readAsDataURL(f);
                }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== MODALS ========== */}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowProductModal(false)}>
          <div className={`${cardBg} rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{editingProduct ? 'Modifier' : 'Ajouter'} un produit</h3>
              <button onClick={() => setShowProductModal(false)} className="p-2 rounded-xl hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Nom du produit *" value={pName} onChange={e => setPName(e.target.value)} className={inputCls} />
              <textarea placeholder="Description" value={pDesc} onChange={e => setPDesc(e.target.value)} className={inputCls} rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Prix *" value={pPrice} onChange={e => setPPrice(e.target.value)} className={inputCls} />
                <input type="number" placeholder="Quantité (vide = illimité)" value={pQty} onChange={e => setPQty(e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={pCat} onChange={e => setPCat(e.target.value)} className={inputCls}>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                </select>
                <input type="number" placeholder="Temps estimé (min)" value={pEstTime} onChange={e => setPEstTime(e.target.value)} className={inputCls} />
              </div>
              <input type="text" placeholder="URL de l'image" value={pImg} onChange={e => setPImg(e.target.value)} className={inputCls} />
              <button onClick={() => productFileRef.current?.click()} className="flex items-center gap-2 text-sm text-indigo-600 font-semibold">
                <Upload size={14} /> Ou uploader une image
              </button>
              <input ref={productFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              {pImg && <img src={pImg} alt="Preview" className="w-full h-40 object-cover rounded-xl" />}
              <button onClick={saveProduct} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-base font-bold shadow-sm">
                <Save size={16} className="inline mr-2" />{editingProduct ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAccountModal(false)}>
          <div className={`${cardBg} rounded-2xl p-6 w-full max-w-sm shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Nouveau compte vendeur</h3>
              <button onClick={() => setShowAccountModal(false)} className="p-2 rounded-xl hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Nom d'utilisateur *" value={aUsername} onChange={e => setAUsername(e.target.value)} className={inputCls} />
              <input type="password" placeholder="Mot de passe *" value={aPassword} onChange={e => setAPassword(e.target.value)} className={inputCls} />
              <button onClick={saveAccount} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-base font-bold shadow-sm">
                <UserPlus size={16} className="inline mr-2" />Créer le compte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Account Modal */}
      {showMyAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowMyAccountModal(false)}>
          <div className={`${cardBg} rounded-2xl p-6 w-full max-w-sm shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Modifier mon compte</h3>
              <button onClick={() => setShowMyAccountModal(false)} className="p-2 rounded-xl hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Mon nom d'utilisateur" value={myUsername} onChange={e => setMyUsername(e.target.value)} className={inputCls} />
              <input type="password" placeholder="Nouveau mot de passe" value={myPassword} onChange={e => setMyPassword(e.target.value)} className={inputCls} />
              <button
                onClick={() => {
                  if (!sellerUsername || !myUsername.trim()) {
                    notify('Nom utilisateur invalide', 'error');
                    return;
                  }
                  updateSellerAccount(sellerUsername, {
                    username: myUsername.trim(),
                    ...(myPassword ? { password: myPassword } : {}),
                  });
                  localStorage.setItem('sellerUsername', myUsername.trim());
                  notify('Mon compte a été mis à jour', 'success');
                  setShowMyAccountModal(false);
                }}
                className="w-full py-3.5 bg-emerald-600 text-white rounded-xl text-base font-bold shadow-sm"
              >
                <Save size={16} className="inline mr-2" />Enregistrer mes informations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCategoryModal(false)}>
          <div className={`${cardBg} rounded-2xl p-6 w-full max-w-sm shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{editingCategory ? 'Modifier' : 'Nouvelle'} catégorie</h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 rounded-xl hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Nom de la catégorie *" value={catName} onChange={e => setCatName(e.target.value)} className={inputCls} />
              <input type="text" placeholder="Emoji (ex: 🍕)" value={catIcon} onChange={e => setCatIcon(e.target.value)} className={inputCls} />
              <button onClick={saveCategory} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-base font-bold shadow-sm">
                <Save size={16} className="inline mr-2" />{editingCategory ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client History Modal */}
      {showClientHistory && selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowClientHistory(false)}>
          <div className={`${cardBg} rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">📋 {selectedClient.name} (Table {selectedClient.table})</h3>
              <button onClick={() => setShowClientHistory(false)} className="p-2 rounded-xl hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {orders.filter(o => o.customerName === selectedClient.name && o.tableNumber === selectedClient.table)
                .map(o => (
                  <div key={o.id} className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-sm ${textSec}`}>{new Date(o.createdAt).toLocaleString('fr-FR')}</span>
                      <span className={`text-sm px-3 py-1 rounded-full font-bold ${statusColor[o.status] || 'bg-gray-100 text-gray-700'}`}>{statusLabel[o.status] || o.status}</span>
                    </div>
                    <p className="text-base font-bold">{formatPrice(o.total)}</p>
                    <div className={`text-sm ${textSec} mt-1`}>
                      {o.items?.map((i: any, idx: number) => <span key={idx}>{i.product?.name || i.name} ×{i.quantity}{idx < o.items.length - 1 ? ', ' : ''}</span>)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
