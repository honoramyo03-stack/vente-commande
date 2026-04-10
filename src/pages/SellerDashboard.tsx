import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, PlusCircle, CreditCard, UserPlus, Save, X, Edit2, Trash2, FileText, Download, Search, Wallet } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { useOrders, OrderStatus, PaymentInfo, Order } from '../contexts/OrdersContext';
import { useCustomer } from '../contexts/CustomerContext';
import OrderCard from '../components/OrderCard';
import SellerHeader from '../components/SellerHeader';
import toast from 'react-hot-toast';

const categories = ['Pizza', 'Burgers', 'Boissons', 'Desserts', 'Plats', 'Entrées'];

const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    orders,
    updateOrderStatus,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    paymentNumbers,
    updatePaymentNumber,
    sellerAccounts,
    addSellerAccount,
    deleteSellerAccount,
  } = useOrders();

  const { connectedCustomers } = useCustomer();

  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'payments' | 'accounts' | 'reports'>('orders');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tous');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);

  // Form states - Product
  const [newProductName, setNewProductName] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCat, setNewProductCat] = useState('Pizza');
  const [newProductImg, setNewProductImg] = useState('');
  const [newProductQty, setNewProductQty] = useState('');

  // Form states - Payment
  const [editPaymentNum, setEditPaymentNum] = useState('');
  const [editPaymentName, setEditPaymentName] = useState('');

  // Form states - Account
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Report state
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('daily');

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('sellerLoggedIn');
    if (!isLoggedIn) {
      navigate('/seller/login');
    }
  }, [navigate]);

  const handleStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
    toast.success(`Commande ${newStatus === 'ready' ? 'marquée comme prête' : 'mise à jour'}`);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice) {
      toast.error('Le nom et le prix sont obligatoires');
      return;
    }

    const productData = {
      name: newProductName,
      description: newProductDesc || 'Sans description',
      price: parseFloat(newProductPrice),
      category: newProductCat,
      image: newProductImg || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
      quantity: newProductQty ? parseInt(newProductQty) : undefined,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
      toast.success('Produit modifié avec succès');
    } else {
      addProduct(productData);
      toast.success('Produit ajouté avec succès');
    }

    resetProductForm();
    setShowProductModal(false);
  };

  const resetProductForm = () => {
    setNewProductName('');
    setNewProductDesc('');
    setNewProductPrice('');
    setNewProductCat('Pizza');
    setNewProductImg('');
    setNewProductQty('');
    setEditingProduct(null);
  };

  const openEditProduct = (product: any) => {
    setEditingProduct(product);
    setNewProductName(product.name);
    setNewProductDesc(product.description);
    setNewProductPrice(product.price.toString());
    setNewProductCat(product.category);
    setNewProductImg(product.image);
    setNewProductQty(product.quantity?.toString() || '');
    setShowProductModal(true);
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Supprimer ce produit ?')) {
      deleteProduct(productId);
      toast.success('Produit supprimé');
    }
  };

  const handleSavePayment = (method: 'orange_money' | 'mvola' | 'airtel_money') => {
    updatePaymentNumber(method, {
      number: editPaymentNum,
      merchantName: editPaymentName,
    });
    toast.success('Numéro de paiement mis à jour');
    setEditingPayment(null);
  };

  const startEditPayment = (method: string, info: PaymentInfo) => {
    setEditingPayment(method);
    setEditPaymentNum(info.number);
    setEditPaymentName(info.merchantName);
  };

  const handleCreateSeller = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    if (sellerAccounts.some(acc => acc.username === newUsername)) {
      toast.error('Ce nom d\'utilisateur existe déjà');
      return;
    }
    addSellerAccount({
      username: newUsername,
      password: newPassword,
      role: 'seller',
    });
    toast.success('Nouveau compte vendeur créé !');
    setNewUsername('');
    setNewPassword('');
    setShowAccountModal(false);
  };

  // Filtrage des commandes (plus récentes en haut)
  const filteredOrders = orders
    .filter((order) => {
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
      const matchesSearch =
        order.id.includes(searchQuery) ||
        order.tableNumber.toString().includes(searchQuery) ||
        (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filtrage des produits
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(productFilter.toLowerCase());
    const matchesCategory = categoryFilter === 'Tous' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStatusCount = (status: OrderStatus) => {
    return orders.filter((order) => order.status === status).length;
  };

  const successfulStatuses: OrderStatus[] = ['paid', 'preparing', 'ready', 'completed'];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDateTime = (value: Date | string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  };

  const totalRevenueAll = orders
    .filter((order) => successfulStatuses.includes(order.status))
    .reduce((sum, order) => sum + order.total, 0);

  // Calcul des statistiques pour les rapports
  const getReportData = () => {
    const now = new Date();
    let startDate: Date;

    switch (reportPeriod) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarterly':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
    }

    const periodOrders = orders.filter((o) => new Date(o.createdAt) >= startDate);
    const paidOrders = periodOrders.filter((o) => successfulStatuses.includes(o.status));
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    paidOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productSales[item.product.id]) {
          productSales[item.product.id] = { name: item.product.name, qty: 0, revenue: 0 };
        }
        productSales[item.product.id].qty += item.quantity;
        productSales[item.product.id].revenue += item.product.price * item.quantity;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      totalOrders: periodOrders.length,
      completedOrders: paidOrders.length,
      totalRevenue,
      avgOrderValue,
      topProducts,
      periodOrders,
    };
  };

  const exportReport = (format: 'pdf' | 'excel') => {
    const report = getReportData();
    const periodLabel = {
      daily: 'Journalier',
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
    }[reportPeriod];
    const fileDate = new Date().toISOString().split('T')[0];

    if (format === 'excel') {
      const summaryRows = [
        { Indicateur: 'Période', Valeur: periodLabel },
        { Indicateur: 'Total commandes', Valeur: report.totalOrders },
        { Indicateur: 'Commandes payées', Valeur: report.completedOrders },
        { Indicateur: 'Chiffre d\'affaires', Valeur: report.totalRevenue },
        { Indicateur: 'Panier moyen', Valeur: report.avgOrderValue },
      ];

      const ordersRows = report.periodOrders.map((order) => ({
        'Commande ID': order.id,
        Client: order.customerName || 'Client anonyme',
        Table: order.tableNumber,
        Statut: order.status,
        Paiement: order.paymentMethod,
        Total: order.total,
        Date: formatDateTime(order.createdAt),
        Articles: order.items.map((item) => `${item.product.name} x${item.quantity}`).join(', '),
      }));

      const topProductsRows = report.topProducts.map((product, index) => ({
        Rang: index + 1,
        Produit: product.name,
        Quantité: product.qty,
        'Chiffre d\'affaires': product.revenue,
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Résumé');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(ordersRows), 'Commandes');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(topProductsRows), 'Top Produits');
      XLSX.writeFile(workbook, `rapport_${reportPeriod}_${fileDate}.xlsx`);
      toast.success('Rapport Excel téléchargé');
      return;
    }

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    let y = 52;

    const ensureSpace = (needed = 24) => {
      if (y + needed > pageHeight - 40) {
        pdf.addPage();
        y = 52;
      }
    };

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('Rapport d’activité vendeur', margin, y);
    y += 24;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`Période : ${periodLabel}`, margin, y);
    y += 16;
    pdf.text(`Date de génération : ${formatDateTime(new Date())}`, margin, y);
    y += 28;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('Résumé', margin, y);
    y += 18;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    [
      `Total des commandes : ${report.totalOrders}`,
      `Commandes payées : ${report.completedOrders}`,
      `Chiffre d'affaires : ${formatPrice(report.totalRevenue)}`,
      `Panier moyen : ${formatPrice(report.avgOrderValue)}`,
    ].forEach((line) => {
      ensureSpace(16);
      pdf.text(line, margin, y);
      y += 16;
    });

    y += 12;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('Top produits', margin, y);
    y += 18;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    if (report.topProducts.length === 0) {
      pdf.text('Aucune vente sur la période sélectionnée.', margin, y);
      y += 16;
    } else {
      report.topProducts.forEach((product, index) => {
        ensureSpace(16);
        pdf.text(
          `${index + 1}. ${product.name} — ${product.qty} vendu(s) — ${formatPrice(product.revenue)}`,
          margin,
          y
        );
        y += 16;
      });
    }

    y += 12;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('Détail des commandes', margin, y);
    y += 18;

    const detailColumns = [margin, margin + 110, margin + 180, margin + 260, pageWidth - 90];
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    ensureSpace(18);
    pdf.text('Commande', detailColumns[0], y);
    pdf.text('Client / Table', detailColumns[1], y);
    pdf.text('Statut', detailColumns[2], y);
    pdf.text('Paiement', detailColumns[3], y);
    pdf.text('Total', detailColumns[4], y, { align: 'right' });
    y += 10;
    pdf.line(margin, y, pageWidth - margin, y);
    y += 14;

    pdf.setFont('helvetica', 'normal');

    if (report.periodOrders.length === 0) {
      pdf.text('Aucune commande pour cette période.', margin, y);
      y += 16;
    } else {
      report.periodOrders.forEach((order: Order) => {
        ensureSpace(42);
        pdf.text(order.id, detailColumns[0], y);
        pdf.text(`${order.customerName || 'Anonyme'} / T${order.tableNumber}`, detailColumns[1], y);
        pdf.text(order.status, detailColumns[2], y);
        pdf.text(order.paymentMethod, detailColumns[3], y);
        pdf.text(formatPrice(order.total), detailColumns[4], y, { align: 'right' });
        y += 12;
        pdf.setFontSize(8);
        pdf.text(formatDateTime(order.createdAt), detailColumns[0], y);
        const itemText = order.items.map((item) => `${item.product.name} x${item.quantity}`).join(', ');
        const wrappedItems = pdf.splitTextToSize(itemText, pageWidth - margin * 2 - 20);
        pdf.text(wrappedItems, detailColumns[1], y);
        y += Math.max(16, wrappedItems.length * 10);
        pdf.setFontSize(9);
        pdf.setDrawColor(230, 230, 230);
        pdf.line(margin, y - 4, pageWidth - margin, y - 4);
      });
    }

    pdf.save(`rapport_${reportPeriod}_${fileDate}.pdf`);
    toast.success('Rapport PDF téléchargé');
  };

  const statusFilters = [
    { id: 'all' as const, name: 'Toutes', color: 'bg-gray-100 text-gray-800', count: orders.length },
    { id: 'pending' as const, name: 'En attente', color: 'bg-yellow-100 text-yellow-800', count: getStatusCount('pending') },
    { id: 'paid' as const, name: 'Payées', color: 'bg-blue-100 text-blue-800', count: getStatusCount('paid') },
    { id: 'preparing' as const, name: 'En préparation', color: 'bg-purple-100 text-purple-800', count: getStatusCount('preparing') },
    { id: 'ready' as const, name: 'Prêtes', color: 'bg-green-100 text-green-800', count: getStatusCount('ready') },
    { id: 'completed' as const, name: 'Terminées', color: 'bg-gray-100 text-gray-800', count: getStatusCount('completed') },
  ];

  const reportData = activeTab === 'reports' ? getReportData() : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <SellerHeader />

      <main className="container mx-auto px-4 py-6">
        {/* Navigation / Tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-gray-200 pb-2 mb-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'orders' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package size={18} /> Commandes
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'products' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <PlusCircle size={18} /> Produits
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'payments' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CreditCard size={18} /> Paiements
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'accounts' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <UserPlus size={18} /> Comptes
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'reports' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText size={18} /> Rapports
          </button>
        </div>

        {/* Tab: Commandes */}
        {activeTab === 'orders' && (
          <div>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p className="text-gray-500 text-xs">Total Commandes</p>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 bg-gradient-to-br from-emerald-50 to-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-gray-500 text-xs">Chiffre d'affaires</p>
                    <p className="text-xl font-bold text-emerald-700">{formatPrice(totalRevenueAll)}</p>
                  </div>
                  <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <Wallet size={18} />
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p className="text-gray-500 text-xs">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">{getStatusCount('pending')}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p className="text-gray-500 text-xs">Prêtes</p>
                <p className="text-2xl font-bold text-green-600">{getStatusCount('ready')}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p className="text-gray-500 text-xs">Clients connectés</p>
                <p className="text-2xl font-bold text-indigo-600">{connectedCustomers.length}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedStatus(filter.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                      selectedStatus === filter.id
                        ? 'bg-indigo-600 text-white'
                        : `${filter.color} hover:bg-opacity-75`
                    }`}
                  >
                    <span>{filter.name}</span>
                    <span className="bg-white bg-opacity-30 px-1.5 py-0.5 rounded-full text-xs">
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Rechercher (ID, Table, Nom)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-full md:w-64"
              />
            </div>

            {/* Orders List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusUpdate={handleStatusUpdate}
                  isSeller={true}
                />
              ))}
            </div>

            {filteredOrders.length === 0 && (
              <div className="bg-white rounded-lg p-12 text-center text-gray-500 border border-gray-100">
                <Package size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Aucune commande ne correspond aux filtres</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Produits */}
        {activeTab === 'products' && (
          <div>
            {/* Actions et filtres */}
            <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Rechercher un produit..."
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="Tous">Toutes catégories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  resetProductForm();
                  setShowProductModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold"
              >
                <PlusCircle size={18} /> Nouveau Produit
              </button>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase">
                    <th className="p-4">Produit</th>
                    <th className="p-4">Catégorie</th>
                    <th className="p-4">Prix</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} className={!prod.isActive ? 'bg-red-50' : ''}>
                      <td className="p-4 flex items-center gap-3">
                        <img src={prod.image} alt="" className="w-12 h-12 object-cover rounded-lg" />
                        <div>
                          <p className="font-semibold text-gray-800">{prod.name}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{prod.description}</p>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{prod.category}</td>
                      <td className="p-4 font-semibold text-gray-900">{formatPrice(prod.price)}</td>
                      <td className="p-4">
                        {prod.quantity !== undefined ? (
                          <span className={`font-semibold ${prod.quantity <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                            {prod.quantity}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          prod.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {prod.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditProduct(prod)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Paiements */}
        {activeTab === 'payments' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CreditCard className="text-indigo-600" /> Numéros de réception des paiements
            </h3>

            {/* Orange Money */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-orange-600 text-lg">🟠 Orange Money</h4>
                {editingPayment !== 'orange_money' && (
                  <button
                    onClick={() => startEditPayment('orange_money', paymentNumbers.orange_money)}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    <Edit2 size={14} /> Modifier
                  </button>
                )}
              </div>
              {editingPayment === 'orange_money' ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editPaymentName}
                    onChange={(e) => setEditPaymentName(e.target.value)}
                    placeholder="Nom du marchand"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  />
                  <input
                    type="text"
                    value={editPaymentNum}
                    onChange={(e) => setEditPaymentNum(e.target.value)}
                    placeholder="Numéro"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSavePayment('orange_money')}
                      className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
                    >
                      <Save size={14} /> Enregistrer
                    </button>
                    <button
                      onClick={() => setEditingPayment(null)}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 text-sm">Marchand: <span className="font-semibold">{paymentNumbers.orange_money.merchantName}</span></p>
                  <p className="text-gray-600 text-sm">Numéro: <span className="font-mono font-semibold">{paymentNumbers.orange_money.number}</span></p>
                </div>
              )}
            </div>

            {/* Mvola */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-green-600 text-lg">🟢 Mvola</h4>
                {editingPayment !== 'mvola' && (
                  <button
                    onClick={() => startEditPayment('mvola', paymentNumbers.mvola)}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    <Edit2 size={14} /> Modifier
                  </button>
                )}
              </div>
              {editingPayment === 'mvola' ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editPaymentName}
                    onChange={(e) => setEditPaymentName(e.target.value)}
                    placeholder="Nom du marchand"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  />
                  <input
                    type="text"
                    value={editPaymentNum}
                    onChange={(e) => setEditPaymentNum(e.target.value)}
                    placeholder="Numéro"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSavePayment('mvola')}
                      className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
                    >
                      <Save size={14} /> Enregistrer
                    </button>
                    <button
                      onClick={() => setEditingPayment(null)}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 text-sm">Marchand: <span className="font-semibold">{paymentNumbers.mvola.merchantName}</span></p>
                  <p className="text-gray-600 text-sm">Numéro: <span className="font-mono font-semibold">{paymentNumbers.mvola.number}</span></p>
                </div>
              )}
            </div>

            {/* Airtel Money */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-red-600 text-lg">🔴 Airtel Money</h4>
                {editingPayment !== 'airtel_money' && (
                  <button
                    onClick={() => startEditPayment('airtel_money', paymentNumbers.airtel_money)}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    <Edit2 size={14} /> Modifier
                  </button>
                )}
              </div>
              {editingPayment === 'airtel_money' ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editPaymentName}
                    onChange={(e) => setEditPaymentName(e.target.value)}
                    placeholder="Nom du marchand"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  />
                  <input
                    type="text"
                    value={editPaymentNum}
                    onChange={(e) => setEditPaymentNum(e.target.value)}
                    placeholder="Numéro"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSavePayment('airtel_money')}
                      className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
                    >
                      <Save size={14} /> Enregistrer
                    </button>
                    <button
                      onClick={() => setEditingPayment(null)}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 text-sm">Marchand: <span className="font-semibold">{paymentNumbers.airtel_money.merchantName}</span></p>
                  <p className="text-gray-600 text-sm">Numéro: <span className="font-mono font-semibold">{paymentNumbers.airtel_money.number}</span></p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Comptes */}
        {activeTab === 'accounts' && (
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <UserPlus className="text-indigo-600" /> Comptes Vendeurs
              </h3>
              <button
                onClick={() => setShowAccountModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold"
              >
                <PlusCircle size={18} /> Nouveau Compte
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase">
                    <th className="p-4">Utilisateur</th>
                    <th className="p-4">Rôle</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sellerAccounts.map((acc, index) => (
                    <tr key={index}>
                      <td className="p-4 font-semibold text-gray-800">{acc.username}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          acc.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {acc.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {acc.username !== 'admin' && (
                          <button
                            onClick={() => {
                              if (confirm('Supprimer ce compte ?')) {
                                deleteSellerAccount(acc.username);
                                toast.success('Compte supprimé');
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Rapports */}
        {activeTab === 'reports' && reportData && (
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-indigo-600" /> Rapports & Statistiques
              </h3>
              <div className="flex gap-2">
                <select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="daily">Journalier</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuel</option>
                  <option value="quarterly">Trimestriel</option>
                </select>
                <button
                  onClick={() => exportReport('excel')}
                  className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  <Download size={16} /> Excel
                </button>
                <button
                  onClick={() => exportReport('pdf')}
                  className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  <Download size={16} /> PDF
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <p className="text-gray-500 text-xs mb-1">Total Commandes</p>
                <p className="text-3xl font-bold text-gray-900">{reportData.totalOrders}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <p className="text-gray-500 text-xs mb-1">Commandes Payées</p>
                <p className="text-3xl font-bold text-green-600">{reportData.completedOrders}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <p className="text-gray-500 text-xs mb-1">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-indigo-600">{formatPrice(reportData.totalRevenue)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <p className="text-gray-500 text-xs mb-1">Panier Moyen</p>
                <p className="text-2xl font-bold text-amber-600">{formatPrice(reportData.avgOrderValue)}</p>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h4 className="font-bold text-gray-800 mb-4">🏆 Produits les plus vendus</h4>
              {reportData.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {reportData.topProducts.map((prod, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-gray-800">{prod.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{prod.qty} vendus</p>
                        <p className="text-xs text-gray-500">{formatPrice(prod.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Aucune donnée pour cette période</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Ajout/Modification Produit */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nom du produit *</label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                  placeholder="Ex: Tacos Poulet"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <input
                  type="text"
                  value={newProductDesc}
                  onChange={(e) => setNewProductDesc(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                  placeholder="Ex: Frites, sauce fromagère"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Catégorie</label>
                  <select
                    value={newProductCat}
                    onChange={(e) => setNewProductCat(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Prix (Ar) *</label>
                  <input
                    type="number"
                    required
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                    placeholder="15000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Quantité en stock (optionnel)</label>
                <input
                  type="number"
                  value={newProductQty}
                  onChange={(e) => setNewProductQty(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                  placeholder="Laisser vide si illimité"
                />
                <p className="text-xs text-gray-500 mt-1">Si défini, le produit devient inactif quand le stock est épuisé.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">URL de l'image</label>
                <input
                  type="url"
                  value={newProductImg}
                  onChange={(e) => setNewProductImg(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                  placeholder="https://..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl shadow hover:bg-indigo-700"
              >
                {editingProduct ? 'Enregistrer les modifications' : 'Ajouter au catalogue'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Création Compte */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Nouveau compte vendeur</h3>
              <button onClick={() => setShowAccountModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSeller} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nom d'utilisateur</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mot de passe</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl shadow hover:bg-indigo-700"
              >
                Créer le compte
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
