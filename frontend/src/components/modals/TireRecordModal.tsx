import { useState, useEffect, useRef } from "react";
import { X, Upload, Plus, Trash2, Search, Tag, User, Phone, CheckCircle, AlertCircle } from "lucide-react";
import { Customer, Vehicle, TireRecord, TirePhoto, TireType } from "../../types";
import { StorageService } from "../../services/storageService";
import { generateId, generateTireCode, normalizeTurkish, formatPlate, compressImage } from "../../utils/helpers";

interface TireRecordModalProps {
  onClose: () => void;
  onSave: (record: TireRecord, autoPrint: boolean) => void;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function TireRecordModal({ onClose, onSave, showToast }: TireRecordModalProps) {
  // Database lookup pools
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [existingRecords, setExistingRecords] = useState<TireRecord[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  // Customer search & selection
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Brand search & selection
  const [brandSearch, setBrandSearch] = useState("");
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);

  // Form Fields
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [customerPlates, setCustomerPlates] = useState<string[]>([]);
  const [tireType, setTireType] = useState<TireType>("Yazlık");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(4);
  const [storageLocation, setStorageLocation] = useState("");
  const [photos, setPhotos] = useState<TirePhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Refs for tracking outside clicks
  const customerRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load fresh data
    setCustomers(StorageService.getCustomers());
    setVehicles(StorageService.getVehicles());
    setExistingRecords(StorageService.getTireRecords());
    setBrands(StorageService.getBrands());

    // Click outside lists listener
    const handleClickOutside = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Customer Selection & Autocomplete
  const filteredCustomers = customerSearch.trim().length > 0
    ? customers.filter(c => {
        const query = normalizeTurkish(customerSearch);
        const nameMatch = normalizeTurkish(c.fullName).includes(query);
        const phoneMatch = c.phone.includes(query);
        
        // Match associated plates too!
        const customerPlatesObj = vehicles.filter(v => v.customerId === c.id);
        const plateMatch = customerPlatesObj.some(v => normalizeTurkish(v.plate).includes(query));

        return nameMatch || phoneMatch || plateMatch;
      })
    : [];

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearch(customer.fullName);
    setPhone(customer.phone);
    setShowCustomerDropdown(false);

    // Load plates associated with the customer
    const associatedPlates = vehicles
      .filter(v => v.customerId === customer.id)
      .map(v => v.plate);
    setCustomerPlates(associatedPlates);
    
    if (associatedPlates.length > 0) {
      setPlate(associatedPlates[0]); // Autofill with first plate
    } else {
      setPlate("");
    }
    showToast(`${customer.fullName} seçildi.`, "info");
  };

  const handleCreateNewCustomerOption = () => {
    setSelectedCustomerId("NEW_CUSTOMER");
    setShowCustomerDropdown(false);
    setCustomerPlates([]);
    showToast(`Yeni müşteri kaydı aktifleştirildi: ${customerSearch}`, "info");
  };

  // Brand selection
  const filteredBrands = brandSearch.trim().length > 0
    ? brands.filter(b => normalizeTurkish(b).includes(normalizeTurkish(brandSearch)))
    : brands.slice(0, 10); // show top 10 if blank clicked

  const handleSelectBrand = (brandName: string) => {
    setBrandSearch(brandName);
    setShowBrandDropdown(false);
  };

  const handleAddNewBrand = () => {
    const trimmed = brandSearch.trim();
    if (trimmed) {
      StorageService.addBrand(trimmed);
      setBrands(StorageService.getBrands());
      setShowBrandDropdown(false);
      showToast(`Yeni lastik markası eklendi: ${trimmed}`, "success");
    }
  };

  // Image uploads drag and drop
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files) return;
    setIsUploading(true);
    let loadedCount = 0;
    const loadedPhotos: TirePhoto[] = [...photos];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        showToast("Lütfen sadece resim dosyası seçin.", "error");
        continue;
      }
      try {
        const compressedBase64 = await compressImage(file);
        loadedPhotos.push({
          id: generateId(),
          name: file.name,
          type: file.type,
          dataUrl: compressedBase64
        });
        loadedCount++;
      } catch (err) {
        console.error(err);
        showToast("Resim yüklenirken hata oluştu.", "error");
      }
    }

    setPhotos(loadedPhotos);
    setIsUploading(false);
    if (loadedCount > 0) {
      showToast(`${loadedCount} adet fotoğraf eklendi.`, "success");
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
    showToast("Fotoğraf silindi.", "info");
  };

  // Submit Handler
  const handleSubmit = (autoPrint: boolean) => {
    // Validations
    if (!customerSearch.trim()) {
      showToast("Lütfen müşteri adı soyadı girin.", "warning");
      return;
    }
    if (!phone.trim()) {
      showToast("Lütfen müşteri telefonu girin.", "warning");
      return;
    }
    if (!plate.trim()) {
      showToast("Araç plaka bilgisi zorunludur.", "warning");
      return;
    }
    if (!brandSearch.trim()) {
      showToast("Lütfen lastik markasını seçin veya girin.", "warning");
      return;
    }
    if (!size.trim()) {
      showToast("Ebat / Boyut girilmesi zorunludur (örn. 205/55/R16).", "warning");
      return;
    }
    if (quantity < 1) {
      showToast("Lastik adeti en az 1 olmalıdır.", "warning");
      return;
    }

    try {
      // 1. Establish Customer Link
      let finalCustomerId = selectedCustomerId;
      let finalCustomerName = customerSearch.trim();

      if (!finalCustomerId || finalCustomerId === "NEW_CUSTOMER") {
        // Create brand new customer
        const newCustId = "cust-" + generateId();
        const newCustObj: Customer = {
          id: newCustId,
          fullName: finalCustomerName,
          phone: phone.trim(),
          createdAt: new Date().toISOString()
        };
        StorageService.addCustomer(newCustObj);
        finalCustomerId = newCustId;
      }

      // 2. Establish Vehicle Link
      let finalPlate = formatPlate(plate);
      // Try to find if vehicle exists
      let existingVeh = vehicles.find(v => v.plate.toUpperCase() === finalPlate);
      let finalVehicleId = "";

      if (!existingVeh) {
        // Register brand new vehicle and link to customer
        const newVehicleId = "veh-" + generateId();
        const newVehObj: Vehicle = {
          id: newVehicleId,
          customerId: finalCustomerId,
          plate: finalPlate,
          createdAt: new Date().toISOString()
        };
        StorageService.addVehicle(newVehObj);
        finalVehicleId = newVehicleId;
      } else {
        finalVehicleId = existingVeh.id;
        // If vehicle belonged to someone else, link it if relevant, or keep existing
      }

      // Add brand to local list if novel
      const matchedBrand = brands.find(b => b.toLowerCase() === brandSearch.trim().toLowerCase());
      if (!matchedBrand) {
        StorageService.addBrand(brandSearch.trim());
      }

      // 3. Assemble Tire Record
      const nextTireCode = generateTireCode(existingRecords.map(r => r.tireCode));
      const newRecord: TireRecord = {
        id: "rec-" + generateId(),
        customerId: finalCustomerId,
        vehicleId: finalVehicleId,
        tireCode: nextTireCode,
        tireType: tireType,
        brand: brandSearch.trim(),
        size: size.trim(),
        quantity: Number(quantity),
        storageLocation: storageLocation.trim() || undefined,
        photos: photos,
        createdAt: new Date().toISOString()
      };

      StorageService.addTireRecord(newRecord);

      // Trigger standard save
      onSave(newRecord, autoPrint);
      showToast("Emanet lastik kaydı başarıyla oluşturuldu.", "success");
    } catch (err) {
      console.error(err);
      showToast("Kayıt oluşturulurken beklenmedik hata oluştu.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-4 sm:my-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900">Emanet Kaydı / Yeni Lastik Ekle</h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Müşteriden emanet alınan mevsimlik lastikleri depomuza kaydedin.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Area */}
        <div className="p-6 flex-1 overflow-y-auto min-h-0 space-y-6">
          
          {/* Section 1: Customer Details */}
          <div className="bg-slate-50/60 rounded-2xl p-5 border border-slate-200/60 space-y-4">
            <h4 className="text-[11px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600 stroke-[2.5]" />
              MÜŞTERİ &amp; ARAÇ BİLGİLERİ CARİSİ
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Customer Input Autocomplete Search */}
              <div className="relative" ref={customerRef}>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Müşteri Adı Soyadı *</label>
                <div className="relative group/search">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                      setSelectedCustomerId(null);
                    }}
                    onFocus={() => {
                      if (customerSearch.trim().length > 0) setShowCustomerDropdown(true);
                    }}
                    placeholder="Müşteri ara veya ad soyad girin..."
                    className="w-full px-3.5 py-2.5 pl-9.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />
                </div>

                {/* Autocomplete Dropdown */}
                {showCustomerDropdown && customerSearch.trim().length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto overflow-hidden">
                    {filteredCustomers.length > 0 ? (
                      <div>
                        <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                          Kayıtlı Eşleşen Müşteriler
                        </div>
                        {filteredCustomers.map((c) => {
                          const associatedPlates = vehicles.filter(v => v.customerId === c.id).map(v => v.plate).join(", ");
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-none flex flex-col transition-colors cursor-pointer"
                            >
                              <span className="text-xs font-bold text-slate-900">{c.fullName}</span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                                <span className="flex items-center gap-0.5 text-slate-400"><Phone className="w-2.5 h-2.5" />{c.phone}</span>
                                {associatedPlates && <span className="text-blue-600 bg-blue-50 border border-blue-100/30 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase">{associatedPlates}</span>}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500 font-semibold bg-white">
                        Eşleşen müşteri bulunamadı.
                      </div>
                    )}
                    
                    {/* Choice to add as new customer regardless of matching */}
                    <button
                      type="button"
                      onClick={handleCreateNewCustomerOption}
                      className="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border-t border-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                      &quot;{customerSearch}&quot; adıyla yeni müşteri oluştur
                    </button>
                  </div>
                )}
              </div>

              {/* Phone Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Müşteri Telefonu *</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Örn: 0555 123 4567"
                    className="w-full px-3.5 py-2.5 pl-9.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Plate Input with selectable previous plates */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Araç Plakası *</label>
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="Örn: 34ABC123"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-mono font-extrabold tracking-wider focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 placeholder:normal-case uppercase"
                />

                {/* Quick plates selection list */}
                {customerPlates.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-slate-400 mr-1 font-bold">Kayıtlı Plakaları:</span>
                    {customerPlates.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlate(p)}
                        className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                          plate.toUpperCase() === p.toUpperCase()
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-slate-200 text-slate-650 hover:bg-slate-100"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Tire Details */}
          <div className="bg-slate-50/60 rounded-2xl p-5 border border-slate-200/60 space-y-4">
            <h4 className="text-[11px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-blue-600 stroke-[2.5]" />
              EMANET LASTİK DETAYLARI SINAFI
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Tire Type Select Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Lastik Mevsim Türü *</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["Yazlık", "Kışlık", "4 Mevsim"] as TireType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTireType(type)}
                      className={`py-2 px-3 text-xs font-bold border rounded-xl transition-all cursor-pointer ${
                        tireType === type
                          ? "bg-blue-600 border-blue-650 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Searchable Select Brand Autocomplete */}
              <div className="relative" ref={brandRef}>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Lastik Markası *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={brandSearch}
                    onChange={(e) => {
                      setBrandSearch(e.target.value);
                      setShowBrandDropdown(true);
                    }}
                    onFocus={() => {
                      setShowBrandDropdown(true);
                    }}
                    placeholder="Seçiniz veya marka giriniz..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />
                  <Plus className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {showBrandDropdown && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto overflow-hidden">
                    {filteredBrands.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleSelectBrand(b)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs text-slate-700 border-b border-slate-100 last:border-none font-bold transition-colors cursor-pointer"
                      >
                        {b}
                      </button>
                    ))}

                    {/* Choice to insert brand if not in list */}
                    {brandSearch.trim() && !brands.some(b => b.toLowerCase() === brandSearch.toLowerCase()) && (
                      <button
                        type="button"
                        onClick={handleAddNewBrand}
                        className="w-full text-left px-4 py-3 bg-slate-50 text-blue-600 hover:bg-blue-50 transition-colors border-t border-slate-150 font-black text-xs cursor-pointer"
                      >
                        + &quot;{brandSearch.trim()}&quot; Yeni Markasını Listeye Ekle
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Size Input Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ebat / Boyut Bilgisi *</label>
                <input
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="Örn: 205/55/R16 veya 225/45/R17"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-mono tracking-wide focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                />
              </div>

              {/* Quantity input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Lastik Adeti *</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center bg-white text-slate-600 hover:bg-slate-50 font-bold text-lg select-none cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-16 h-10 px-2 text-center bg-white border border-slate-200 rounded-xl text-sm text-slate-900 font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center bg-white text-slate-600 hover:bg-slate-50 font-bold text-lg select-none cursor-pointer transition-colors"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-400 font-semibold ml-1.5">Emanet Adeti</span>
                </div>
              </div>

              {/* Storage location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Depo Konumu / Raf No</label>
                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder="Örn: Raf A3-C2 (İsteğe Bağlı)"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 uppercase focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 font-mono tracking-wider font-bold placeholder:normal-case transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Photo Upload and Previews */}
          <div className="bg-slate-50/60 rounded-2xl p-5 border border-slate-200/60 space-y-4">
            <h4 className="text-[11px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Upload className="w-4 h-4 text-blue-600" />
              LASTİK GÖRSEL DÖKÜMANTASYON RESİMLERİ
            </h4>

            {/* Drag Drop Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="md:col-span-1 border-2 border-dashed border-slate-250 hover:border-blue-500 bg-white hover:bg-slate-50/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all h-32 text-center select-none">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                  className="hidden"
                  disabled={isUploading}
                />
                <Upload className="w-6 h-6 text-slate-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-700">Fotoğraf Yükle</span>
                <span className="text-[10px] text-slate-400 font-medium">Birimleri seçin</span>
              </label>

              {/* Show uploaded previews */}
              <div className="md:col-span-2 flex flex-wrap gap-2.5 min-h-[128px] max-h-36 overflow-y-auto p-2 bg-slate-100 rounded-2xl items-center justify-start border border-slate-200/50">
                {photos.length === 0 ? (
                  <div className="text-center w-full py-6 text-xs text-slate-400 font-semibold italic">
                    Görsel yüklenmedi (Hasar/durum dökümü yok)
                  </div>
                ) : (
                  photos.map((p) => (
                    <div key={p.id} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-3xs flex-shrink-0">
                      <img
                        src={p.dataUrl}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(p.id)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-150 cursor-pointer"
                      >
                        <Trash2 className="w-4.5 h-4.5 text-rose-400" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {isUploading && (
              <div className="text-xs text-blue-600 font-bold animate-pulse flex items-center gap-1.5 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></div>
                Fotoğraflar küçültülerek işleniyor... Lütfen bekleyin.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200/70 bg-white/80 px-6 py-5 backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            
            {/* Sol Buton */}
            <button
              onClick={onClose}
              disabled={isUploading}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Vazgeç
            </button>

            {/* Sağ Butonlar */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={() => handleSubmit(false)}
                disabled={isUploading}
                className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-extrabold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-200 hover:text-slate-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Yalnızca Kaydet
              </button>

              <button
                onClick={() => handleSubmit(true)}
                disabled={isUploading}
                className="inline-flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>Kaydet ve Etiketle</span>
                <span className="text-base leading-none">🏷️</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
