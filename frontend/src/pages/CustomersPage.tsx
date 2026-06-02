import React, { useState } from "react";
import { Search, User, Phone, Plus, Tag, Layers, Printer, Landmark, Trash2, ShieldAlert } from "lucide-react";
import { Customer, Vehicle, TireRecord } from "../types";
import { StorageService } from "../services/storageService";
import { formatDate, formatPlate, generateId } from "../utils/helpers";

interface CustomersPageProps {
  customers: Customer[];
  vehicles: Vehicle[];
  records: TireRecord[];
  onRefreshData: () => void;
  onOpenDetail: (record: TireRecord) => void;
  onOpenLabelPrinter: (record: TireRecord) => void;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function CustomersPage({
  customers,
  vehicles,
  records,
  onRefreshData,
  onOpenDetail,
  onOpenLabelPrinter,
  showToast
}: CustomersPageProps) {
  // Navigation states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Customer Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPlate, setNewPlate] = useState("");

  // Add Plate Form States
  const [showAddPlateForm, setShowAddPlateForm] = useState(false);
  const [newPlateValue, setNewPlateValue] = useState("");

  const activeCustomer = customers.find(c => c.id === selectedCustomerId);
  const activeCustomerVehicles = vehicles.filter(v => v.customerId === selectedCustomerId);
  const activeCustomerRecords = records.filter(r => r.customerId === selectedCustomerId);

  // Search filter
  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    const nameMatch = c.fullName.toLowerCase().includes(query);
    const phoneMatch = c.phone.includes(query);

    // Filter by customer plates as well!
    const customerPlates = vehicles.filter(v => v.customerId === c.id);
    const plateMatch = customerPlates.some(v => v.plate.toLowerCase().includes(query));

    return nameMatch || phoneMatch || plateMatch;
  });

  // Create new customer handler
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) {
      showToast("Lütfen müşteri adı soyadı girin.", "warning");
      return;
    }
    if (!newPhone.trim()) {
      showToast("Lütfen müşteri iletişim telefonu girin.", "warning");
      return;
    }

    try {
      const generatedCustId = "cust-" + generateId();
      
      // Save customer
      const newCust: Customer = {
        id: generatedCustId,
        fullName: newFullName.trim(),
        phone: newPhone.trim(),
        createdAt: new Date().toISOString()
      };
      StorageService.addCustomer(newCust);

      // Save optional plate
      if (newPlate.trim()) {
        const newVehicle: Vehicle = {
          id: "veh-" + generateId(),
          customerId: generatedCustId,
          plate: formatPlate(newPlate),
          createdAt: new Date().toISOString()
        };
        StorageService.addVehicle(newVehicle);
      }

      showToast("Yeni müşteri profile başarıyla eklendi.", "success");
      onRefreshData();
      setSelectedCustomerId(generatedCustId);
      
      // Reset forms
      setNewFullName("");
      setNewPhone("");
      setNewPlate("");
      setShowAddModal(false);
    } catch {
      showToast("Müşteri oluşturulurken hata meydana geldi.", "error");
    }
  };

  // Create plate inline handler
  const handleAddPlate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlateValue.trim() || !selectedCustomerId) {
      showToast("Lütfen plaka alanını doldurun.", "warning");
      return;
    }

    try {
      const plateNormalized = formatPlate(newPlateValue);
      const newVehicle: Vehicle = {
        id: "veh-" + generateId(),
        customerId: selectedCustomerId,
        plate: plateNormalized,
        createdAt: new Date().toISOString()
      };
      StorageService.addVehicle(newVehicle);
      showToast(`${plateNormalized} plakalı araç müşteriye tanımlandı.`, "success");
      onRefreshData();
      
      setNewPlateValue("");
      setShowAddPlateForm(false);
    } catch {
      showToast("Plaka eklenemedi.", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-950 animate-slide-in pb-12">
      
      {/* LEFT CRM LIST SIDEBAR PANEL (Width 4 of 12) */}
      <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 flex flex-col h-[75vh] shadow-xs overflow-hidden animate-slide-in">
        
        {/* Header container */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Müşteri Portföyü ({customers.length})</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Müşteri carileri ve sarkaçları</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl px-3 py-2 text-xs font-bold cursor-pointer transition-colors shadow-sm shadow-blue-500/10 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Yeni Ekle
          </button>
        </div>

        {/* Filter Quick Search box */}
        <div className="p-4 border-b border-slate-100 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="İsim, cep tel veya araç plakası..."
              className="w-full bg-slate-50 px-3.5 py-2 pl-9 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800 font-semibold"
            />
            <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* List items scroll block */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/70 font-sans">
          {filteredCustomers.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <User className="w-5 h-5 text-slate-300" />
              <span>Aranan kriterde müşteri bulunamadı.</span>
            </div>
          ) : (
            filteredCustomers.map((c) => {
              const count = records.filter(r => r.customerId === c.id).length;
              const plats = vehicles.filter(v => v.customerId === c.id).map(v => v.plate).join(", ");
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`w-full text-left p-4 flex items-center justify-between border-l-4 transition-all duration-150 ${
                    selectedCustomerId === c.id
                      ? "bg-blue-50/60 border-blue-600 pl-4.5"
                      : "border-transparent hover:bg-slate-50/40 pl-4"
                  }`}
                >
                  <div className="space-y-1 max-w-[70%]">
                    <h4 className="font-extrabold text-slate-900 text-xs truncate">{c.fullName}</h4>
                    <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                      {c.phone}
                    </p>
                    {plats && (
                      <p className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100/40 px-2 py-0.5 rounded font-mono font-bold tracking-wider max-w-full truncate text-ellipsis inline-block">
                        {plats}
                      </p>
                    )}
                  </div>

                  <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
                    count > 0 ? "bg-emerald-500 text-white shadow-xs" : "bg-slate-100 text-slate-400"
                  }`}>
                    {count} emanet
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT DOSSIER SECTION (Width 8 of 12) */}
      <div className="lg:col-span-8 space-y-6">
        
        {activeCustomer ? (
          <div className="space-y-6">
            
            {/* DOSSIER HEADER PROFILE */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                  {activeCustomer.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{activeCustomer.fullName}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Cep No: <span className="text-blue-600 font-bold underline decoration-dotted ml-1">{activeCustomer.phone}</span>
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <button
                onClick={() => setShowAddPlateForm(!showAddPlateForm)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 duration-150 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Yeni Plaka Bağla
              </button>
            </div>

            {/* QUICK PLATES OR VEHICLES DIRECTORY */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">TANMILI PLAKALAR</h4>
              
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
                {activeCustomerVehicles.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium">Bu müşteriye tanımlı bir araç plakası bulunamadı.</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {activeCustomerVehicles.map(v => (
                      <span 
                        key={v.id} 
                        className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 text-xs rounded-xl tracking-wider shadow-3xs uppercase"
                      >
                        {v.plate}
                      </span>
                    ))}
                  </div>
                )}

                {/* Inline Quick Register Plate Form */}
                {showAddPlateForm && (
                  <form onSubmit={handleAddPlate} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex gap-2 max-w-sm animate-slide-in">
                    <input
                      type="text"
                      required
                      value={newPlateValue}
                      onChange={(e) => setNewPlateValue(e.target.value)}
                      placeholder="Plaka Giriniz (örn: 34XYZ789)"
                      className="flex-1 bg-white px-4 py-2 text-xs rounded-xl border border-slate-200 uppercase font-mono tracking-wider font-extrabold focus:outline-none focus:border-blue-500"
                    />
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shrink-0 cursor-pointer transition-colors active:scale-95">
                      Bağla
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* CUSTOMER TIRE RECORDS DIRECTORY CARDS (Grid 4-2-1) */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">MÜŞTERİYE AİT EMANET EŞYALAR</h4>
              
              {activeCustomerRecords.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-250 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-2 shadow-xs text-slate-400">
                  <Landmark className="w-8 h-8 text-slate-300 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700">Dosya Klasörü Temiz</span>
                  <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                    Müşterinin üzerinde bulundurduğu aktif veya pasif kışlık/yazlık lastik emanet dosyası bulunmamaktadır.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {activeCustomerRecords.map((record) => {
                    const vehicleObj = activeCustomerVehicles.find(v => v.id === record.vehicleId);
                    const coverPhoto = record.photos?.[0]?.dataUrl;

                    return (
                      <div key={record.id} className="bg-white border border-slate-200/85 rounded-3xl shadow-xs overflow-hidden flex flex-col">
                        
                        {/* Cover image area */}
                        <div className="relative aspect-video bg-slate-50 border-b border-slate-100 overflow-hidden flex items-center justify-center">
                          {coverPhoto ? (
                             <img src={coverPhoto} alt={record.brand} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-[10px] text-slate-400 font-sans flex flex-col items-center gap-1.5 p-4 select-none">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 font-bold mb-0.5">L</div>
                              Görsel Yok
                            </div>
                          )}

                          <span className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] shadow-sm uppercase font-extrabold ${
                            record.tireType === "Yazlık" 
                              ? "bg-amber-500 text-white" 
                              : record.tireType === "Kışlık" 
                                ? "bg-blue-500 text-white" 
                                : "bg-emerald-500 text-white"
                          }`}>
                            {record.tireType}
                          </span>

                          <span className="absolute bottom-2.5 right-2.5 bg-slate-900/90 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded-md tracking-wider">
                            {record.tireCode}
                          </span>
                        </div>

                        {/* Contents */}
                        <div className="p-4 space-y-4">
                          <div className="space-y-1.5 text-xs text-slate-700">
                            <div className="flex justify-between items-center text-[10px] bg-blue-50/40 border border-blue-100 rounded-lg p-2 font-mono uppercase tracking-wider font-extrabold text-blue-850">
                              <span className="text-slate-400 text-[9px]">PLAKA:</span>
                              <span>{vehicleObj?.plate || "-"}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 text-[11px]">
                              <span className="text-slate-400 font-medium">Ürün Marka:</span>
                              <span className="font-bold text-slate-900">{record.brand}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400 font-medium font-sans">Ebat / Adet:</span>
                              <span className="font-bold text-slate-905">{record.size} • {record.quantity} Adet</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400 font-medium">Depo Rafı:</span>
                              <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md text-[10px]">{record.storageLocation || "Girilmemiş"}</span>
                            </div>
                          </div>

                          {/* Trigger tags */}
                          <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => onOpenDetail(record)}
                              className="col-span-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-2 rounded-xl text-center transition-colors cursor-pointer"
                            >
                              Detay / Görseller
                            </button>
                            <button
                              onClick={() => onOpenLabelPrinter(record)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 transition-colors cursor-pointer"
                              title="Etiket yazdır"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center shadow-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <User className="w-8 h-8 text-slate-200 animate-pulse" />
            <span className="font-bold text-slate-500 text-sm">Cari Müşteri Seçilmedi</span>
            <p className="text-xs max-w-xs leading-relaxed">Bilgileri listelemek veya işlem gerçekleştirmek için sol sütundaki müşteri listesinden seçim yapın.</p>
          </div>
        )}

      </div>

      {/* POPUP FULL MODAL: CREATE BRAND NEW CRM PROFILE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-5 backdrop-blur-sm sm:items-center sm:py-8">
          <div
            className="flex max-h-[calc(100dvh-40px)] w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Plus className="h-5 w-5 stroke-[2.5]" />
                  </div>

                  <div>
                    <h4 className="text-base font-black leading-tight text-slate-950">
                      Yeni Müşteri Profili Aç
                    </h4>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                      Cari bilgilerini tanımla
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateCustomer} className="flex min-h-0 flex-1 flex-col">
              {/* Scrollable Content */}
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 text-xs font-sans">
                <div>
                  <label className="mb-1.5 block font-bold text-slate-700">
                    Müşteri Tam Adı Soyadı *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Müşteri Adı Soyadı"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block font-bold text-slate-700">
                    İletişim Telefon No *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="örn: 0532 123 4567"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block font-bold text-slate-700">
                    İlk Araç Plakası <span className="text-slate-400">(İsteğe Bağlı)</span>
                  </label>
                  <input
                    type="text"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value)}
                    placeholder="örn: 34XYZ567"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm font-black uppercase tracking-wider text-slate-800 outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="shrink-0 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-xl">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-950 active:scale-[0.98]"
                  >
                    Vazgeç
                  </button>

                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-xs font-black text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.98]"
                  >
                    Cariyi Tanımla
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

          </div>
        );
      }

// Compact X button helper
function X({ className }: { className: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
