import { useState, useEffect } from "react";
import { X, Edit2, Printer, CheckCircle, Save, ArrowLeft, Trash2, Upload, AlertTriangle, Eye } from "lucide-react";
import { TireRecord, Customer, Vehicle, TirePhoto, TireType } from "../../types";
import { StorageService } from "../../services/storageService";
import { formatDate, formatPlate, compressImage, generateId } from "../../utils/helpers";

interface TireRecordDetailModalProps {
  record: TireRecord;
  onClose: () => void;
  onUpdate: (updatedRecord: TireRecord, autoPrint: boolean) => void;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onOpenLabelPrinter: (rec: TireRecord) => void;
}

export default function TireRecordDetailModal({
  record,
  onClose,
  onUpdate,
  showToast,
  onOpenLabelPrinter
}: TireRecordDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);

  // Loaded Entities from Storage with fallback to snapshot
  const [customer, setCustomer] = useState<Customer | undefined>(() => {
    const custs = StorageService.getCustomers();
    const matched = custs.find(c => c.id === record.customerId);
    if (!matched && record.snapshot) {
      return {
        id: record.customerId,
        fullName: record.snapshot.customerName,
        phone: record.snapshot.phone,
        createdAt: record.createdAt
      };
    }
    return matched;
  });

  const [vehicle, setVehicle] = useState<Vehicle | undefined>(() => {
    const vehs = StorageService.getVehicles();
    const matched = vehs.find(v => v.id === record.vehicleId);
    if (!matched && record.snapshot) {
      return {
        id: record.vehicleId,
        customerId: record.customerId,
        plate: record.snapshot.plate,
        createdAt: record.createdAt
      };
    }
    return matched;
  });

  // Input States for View/Edit Modals
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [tireType, setTireType] = useState<TireType>("Yazlık");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(4);
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState<TirePhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Active full screen image viewer in modal
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  // Delivery confirmation overlay states
  const [isDeliverConfirmOpen, setIsDeliverConfirmOpen] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");
  const getCurrentDateTimeLocalValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
};

const [deliveredAtDate, setDeliveredAtDate] = useState(getCurrentDateTimeLocalValue);

  useEffect(() => {
    // Sync current values from global DB
    const custs = StorageService.getCustomers();
    const vehs = StorageService.getVehicles();

    let matchedCust = custs.find(c => c.id === record.customerId);
    let matchedVeh = vehs.find(v => v.id === record.vehicleId);

    if (!matchedCust && record.snapshot) {
      matchedCust = {
        id: record.customerId,
        fullName: record.snapshot.customerName,
        phone: record.snapshot.phone,
        createdAt: record.createdAt
      };
    }
    if (!matchedVeh && record.snapshot) {
      matchedVeh = {
        id: record.vehicleId,
        customerId: record.customerId,
        plate: record.snapshot.plate,
        createdAt: record.createdAt
      };
    }

    setCustomer(matchedCust);
    setVehicle(matchedVeh);

    // Initialize inputs with current storage values
    if (matchedCust) {
      setFullName(matchedCust.fullName);
      setPhone(matchedCust.phone);
    }
    if (matchedVeh) {
      setPlate(matchedVeh.plate);
    }

    setTireType(record.tireType);
    setBrand(record.brand);
    setSize(record.size);
    setQuantity(record.quantity);
    setLocation(record.storageLocation || "");
    setPhotos(record.photos || []);
  }, [record]);

  // Image Upload Logic during edit
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files) return;
    setIsUploading(true);
    let loadedCount = 0;
    const loadedPhotos: TirePhoto[] = [...photos];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64 = await compressImage(file);
        loadedPhotos.push({
          id: generateId(),
          name: file.name,
          type: file.type,
          dataUrl: base64
        });
        loadedCount++;
      } catch (err) {
        console.error(err);
        showToast("Görsel işlenirken hata oluştu.", "error");
      }
    }

    setPhotos(loadedPhotos);
    setIsUploading(false);
    if (loadedCount > 0) {
      showToast(`${loadedCount} yeni fotoğraf eklendi.`, "success");
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
    showToast("Fotoğraf çıkarıldı. Değişikliklerin kaydedilmesi için Kaydet demelisiniz.", "info");
  };

  // Safe Save Sequence for combined customer + vehicle + tire records
  const handleSave = (autoPrint: boolean) => {
    if (!fullName.trim() || !phone.trim() || !plate.trim() || !brand.trim() || !size.trim()) {
      showToast("Lütfen tüm zorunlu alanları (*) eksiksiz doldurun.", "warning");
      return;
    }

    try {
      // 1. Update customer profile in store
      if (customer) {
        const updatedCustomer: Customer = {
          ...customer,
          fullName: fullName.trim(),
          phone: phone.trim()
        };
        StorageService.updateCustomer(updatedCustomer);
        setCustomer(updatedCustomer);
      }

      // 2. Update plate details in store
      if (vehicle) {
        const updatedVehicle: Vehicle = {
          ...vehicle,
          plate: formatPlate(plate)
        };
        StorageService.updateVehicle(updatedVehicle);
        setVehicle(updatedVehicle);
      }

      // 3. Keep brand registered
      StorageService.addBrand(brand.trim());

      // 4. Update the core tire record
      const updatedRecord: TireRecord = {
        ...record,
        tireType: tireType,
        brand: brand.trim(),
        size: size.trim(),
        quantity: Number(quantity),
        storageLocation: location.trim() || undefined,
        photos: photos,
        updatedAt: new Date().toISOString()
      };

      StorageService.updateTireRecord(updatedRecord);

      // Callback to update parent layout states
      onUpdate(updatedRecord, autoPrint);
      showToast("Kayıt değişiklikleri başarıyla kaydedildi.", "success");
      
      if (!autoPrint) {
        setIsEditMode(false); // Return to preview mode automatically
      }
    } catch (err) {
      console.error(err);
      showToast("Güncelleme yapılırken hata oluştu.", "error");
    }
  };

  if (!customer || !vehicle) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs">
        <div className="bg-white p-6 rounded-2xl max-w-sm text-center shadow-xl">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <h4 className="font-bold text-zinc-900">Kayıt Yüklenemedi</h4>
          <p className="text-xs text-zinc-500 mt-1">İlişkili müşteri veya araç bilgileri bulunamadı.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold rounded-lg">Kapat</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-4 sm:my-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Head */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/55 shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 border border-blue-200/50 text-blue-700 font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
              {record.tireCode}
            </span>
            <span className="text-xs text-slate-450 font-bold">| Detaylı Lastik Emanet Kartı</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto min-h-0">
          {isEditMode ? (
            
            /* ================= EDIT MODE WORKSPACE ================= */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                  Emanet Kaydını Düzenle
                </h4>
                <button
                  onClick={() => setIsEditMode(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Geri Dön (İptal)
                </button>
              </div>

              {/* Patient/Customer section */}
              <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-200/60 space-y-4 text-slate-900">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Müşteri Ad Soyad *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Müşteri Telefonu *</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Araç Plaka *</label>
                    <input
                      type="text"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-900 font-mono tracking-wider focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all uppercase font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Tire Specs selection */}
              <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-200/60 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Mevsim Türü *</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(["Yazlık", "Kışlık", "4 Mevsim"] as TireType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setTireType(type)}
                          className={`py-1.5 px-2 text-xs font-bold border rounded-lg transition-all cursor-pointer ${
                            tireType === type
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Lastik Markası *</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Michelin, Petlas vb..."
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ebat / Boyut Bilgisi *</label>
                    <input
                      type="text"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Adet *</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-24 px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-800 focus:outline-none text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Depo Konumu / Raf No</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-900 font-mono uppercase font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Modification section */}
              <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-200/60 space-y-3">
                <label className="block text-xs font-black text-slate-450 uppercase tracking-widest font-mono">RESİM HAVUZU DÖKÜMANTASYONU</label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="border-2 border-dashed border-slate-250 hover:border-blue-500 bg-white rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer h-20 text-center select-none">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e.target.files)}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-700">Fotoğraf Ekle</span>
                  </label>

                  <div className="md:col-span-2 flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl items-center border border-slate-200/55 min-h-[80px]">
                    {photos.length === 0 ? (
                      <span className="text-slate-400 text-xs text-center w-full py-2 font-semibold italic">Görsel bulunmamaktadır.</span>
                    ) : (
                      photos.map((p) => (
                        <div key={p.id} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                          <img src={p.dataUrl} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(p.id)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            
            /* ================= VIEW MODE WORKSPACE ================= */
            <div className="space-y-6">

              {record.status === "delivered" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 font-sans space-y-1.5 flex items-start gap-3.5 shadow-sm text-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                    <CheckCircle className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div className="flex-1 text-left">
                    <h5 className="font-extrabold text-emerald-900 text-sm">Bu Lastik Emaneti Müşteriye Teslim Edilmiştir</h5>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Bu emanet kaydı aktif depolama statüsünden düşürülmüş ve arşive taşınmıştır.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-slate-500 font-mono text-[11px] font-bold mt-2 pt-2 border-t border-emerald-100">
                      <div>Teslim Tarihi: <span className="text-emerald-850 font-extrabold">{formatDate(record.deliveredAt || record.updatedAt || "")}</span></div>
                      {record.deliveryNote && (
                        <div className="col-span-1 sm:col-span-2 mt-1.5 italic font-sans font-medium bg-white/75 border border-emerald-100 p-2 rounded-lg text-slate-700">
                          Teslim Notu: <span className="text-slate-900 font-bold">"{record.deliveryNote}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Top Banner stats */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ARAÇ PLAKASI</div>
                  <div className="font-mono font-extrabold text-sm text-blue-800 bg-blue-50 border border-blue-100/50 px-2.5 py-1 rounded-lg inline-block mt-1 tracking-wider uppercase">
                    {vehicle.plate}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">DEPO RAFI</div>
                  <div className="font-mono font-black text-sm text-slate-800 mt-2 bg-amber-55/10 border border-amber-200 text-amber-800 px-2.5 py-0.5 rounded-lg inline-block uppercase">
                    {record.storageLocation || "RAFTSIZ CARİ"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">EMANET ADETİ</div>
                  <div className="font-extrabold text-sm text-slate-900 mt-2">
                    {record.quantity} Adet
                  </div>
                </div>
              </div>

              {/* Informative block grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-800">
                {/* Customer specifics */}
                <div className="space-y-3.5">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">MÜŞTERİ HESAP BİLGİLERİ</h5>
                  
                  <div className="space-y-2.5 text-xs sm:text-sm bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 font-semibold text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400 font-medium">Ad Soyad:</span>
                      <span className="font-bold text-slate-900">{customer.fullName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400 font-medium">Telefon No:</span>
                      <span className="font-extrabold text-blue-600 font-mono">{customer.phone}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400 font-medium">Kayıt Tarihi:</span>
                      <span className="text-slate-500 font-mono text-xs font-bold">{formatDate(record.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Tire specifics */}
                <div className="space-y-3.5">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">LASTİK SPESİFİKASYONLARI</h5>
                  
                  <div className="space-y-2.5 text-xs sm:text-sm bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 font-semibold text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400 font-medium">Mevsim Türü:</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          record.tireType === "Yazlık" ? "bg-amber-400 animate-pulse" : record.tireType === "Kışlık" ? "bg-sky-400 animate-pulse" : "bg-emerald-400 animate-pulse"
                        }`}></span>
                        {record.tireType}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400 font-medium">Lastik Markası:</span>
                      <span className="font-bold text-slate-900">{record.brand}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400 font-medium">Lastik Ebadı:</span>
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 text-xs rounded border border-slate-205">{record.size}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Photos Panel */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-black text-slate-450 uppercase tracking-widest font-mono">HASAR / RESİM ALBÜMÜ ({photos.length})</h5>
                  {photos.length > 0 && <span className="text-[10px] text-slate-400 font-medium">Detay için üzerine tıklayın</span>}
                </div>

                {photos.length === 0 ? (
                  <div className="border border-dashed border-slate-200 bg-slate-50/60 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-1.5">
                    <Eye className="w-6 h-6 text-slate-300" />
                    <span className="text-xs font-bold text-slate-650">Görsel Kaydı Yok</span>
                    <span className="text-[10px] text-slate-400 font-medium max-w-sm leading-relaxed">Bu emanet kaydı oluşturulurken herhangi bir hasar veya durum fotoğrafı yüklenmemiş.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2.5">
                    {photos.map((p) => (
                      <div 
                        key={p.id} 
                        className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white cursor-zoom-in hover:shadow-md transition-shadow"
                        onClick={() => setActivePhotoUrl(p.dataUrl)}
                      >
                        <img 
                          src={p.dataUrl} 
                          alt={p.name} 
                          referrerPolicy="no-referrer" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-5 h-5 text-white drop-shadow-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

{/* Modal Action Footer */}
<div className="border-t border-slate-200/70 bg-white/90 px-5 py-4 backdrop-blur-xl">
  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    
    {/* Sol Aksiyon */}
    <div className="w-full lg:w-auto">
      {!isEditMode && record.status !== "delivered" && (
        <button
          type="button"
          onClick={() => onOpenLabelPrinter(record)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-100 active:scale-[0.98] lg:w-auto"
        >
          <Printer className="h-4 w-4 text-blue-600" />
          <span>Barkod / Etiket</span>
        </button>
      )}
    </div>

    {/* Sağ Aksiyonlar */}
    <div className="w-full lg:w-auto">
      {isEditMode ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:justify-end">
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-200 hover:text-slate-950 active:scale-[0.98]"
          >
            Değişiklikleri Kaydet
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-xs font-black text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98]"
          >
            <Save className="h-4 w-4 text-white" />
            <span>Kaydet ve Barkodla</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:justify-end">
          {record.status !== "delivered" && (
            <button
              type="button"
              onClick={() => setIsDeliverConfirmOpen(true)}
              className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-xs font-black text-rose-700 shadow-sm transition-all duration-200 hover:border-rose-300 hover:bg-rose-100 active:scale-[0.98] sm:col-span-1"
            >
              <CheckCircle className="h-4 w-4 text-rose-600" />
              <span>Teslim Edildi</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-950 active:scale-[0.98]"
          >
            Geri
          </button>

          {record.status !== "delivered" && (
            <button
              type="button"
              onClick={() => setIsEditMode(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-xs font-black text-white shadow-lg shadow-slate-900/20 transition-all duration-200 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/25 active:scale-[0.98]"
            >
              <Edit2 className="h-4 w-4" />
              <span>Düzenle</span>
            </button>
          )}
        </div>
      )}
    </div>
  </div>
</div>

        {/* Delivery Confirmation Overlay Modal */}
        {isDeliverConfirmOpen && (
          <div className="absolute inset-0 z-55 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Lastik emaneti teslim edildi mi?</h4>
                  <p className="text-[11px] text-slate-500 font-medium whitespace-normal leading-relaxed">Bu işlem kaydı aktif listeden kaldırır ve geçmiş kayıtlara taşır. Kayıt tamamen silinmez.</p>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs font-sans">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 font-sans">Teslim Tarihi ve Saati *</label>
                  <input
                    type="datetime-local"
                    value={deliveredAtDate}
                    onChange={(e) => setDeliveredAtDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-205 rounded-xl font-bold focus:outline-none focus:border-rose-500 focus:bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 font-sans">Teslim Notu / Açıklama (İsteğe Bağlı)</label>
                  <textarea
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="Müşteriye teslim edilirken eklenmek istenen açıklama veya not..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-205 rounded-xl font-medium focus:outline-none focus:border-rose-500 focus:bg-white text-slate-850"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDeliverConfirmOpen(false)}
                  className="px-4 py-2.5 text-xs text-slate-650 hover:text-slate-850 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const snapshotInfo = {
                        customerName: customer?.fullName || "Bilinmeyen Müşteri",
                        phone: customer?.phone || "-",
                        plate: vehicle?.plate || "-",
                        tireCode: record.tireCode,
                        tireType: record.tireType,
                        brand: record.brand,
                        size: record.size,
                        quantity: record.quantity,
                        storageLocation: record.storageLocation
                      };

                      const deliveredAtIso = new Date(deliveredAtDate).toISOString();

                      const updatedRecord: TireRecord = {
                        ...record,
                        status: "delivered",
                        deliveredAt: deliveredAtIso,
                        deletedAt: deliveredAtIso,
                        deliveryNote: deliveryNote.trim() || undefined,
                        snapshot: snapshotInfo,
                        updatedAt: new Date().toISOString()
                      };

                      StorageService.updateTireRecord(updatedRecord);
                      onUpdate(updatedRecord, false);
                      showToast(`${record.tireCode} kodlu emanet başarıyla teslim edildi.`, "success");
                      setIsDeliverConfirmOpen(false);
                      onClose();
                    } catch (err) {
                      console.error(err);
                      showToast("Emanet teslim edilirken hata oluştu.", "error");
                    }
                  }}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 text-xs text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Teslim Edildi Olarak Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Embedded full-size visual viewer */}
      {activePhotoUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4 cursor-zoom-out"
          onClick={() => setActivePhotoUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setActivePhotoUrl(null)}
              className="absolute -top-12 right-0 p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all font-sans cursor-pointer text-xs flex items-center gap-1 font-bold"
            >
              <X className="w-4 h-4" /> Kapat [ESC]
            </button>
            <img 
              src={activePhotoUrl} 
              alt="Büyük boy emanet görseli" 
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10 bg-slate-900" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
