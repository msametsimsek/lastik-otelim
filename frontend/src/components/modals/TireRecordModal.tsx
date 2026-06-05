import { useEffect, useRef, useState } from "react";
import {
  Phone,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  User,
  X
} from "lucide-react";
import { Customer, TirePhoto, TireRecord, TireType, Vehicle } from "../../types";
import { StorageService } from "../../services/storageService";
import {
  clientApi,
  vehicleApi,
  constantApi,
  tireApi,
  ClientListItemDto,
  VehicleListItemDto,
  ConstantListItemDto,
  CreateTirePayload
} from "../../services/tireApi";
import {
  compressImage,
  formatPlate,
  generateId,
  generateTireCode,
  normalizeTurkish
} from "../../utils/helpers";

interface TireRecordModalProps {
  onClose: () => void;
  onSave: (record: TireRecord, autoPrint: boolean) => void;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

function mapApiClientToCustomer(item: ClientListItemDto): Customer {
  return {
    id: String(item.id),
    fullName: item.name || "Bilinmeyen Cari",
    phone: item.phone || "",
    createdAt: item.createdDate
  };
}

function mapApiVehicleToVehicle(item: VehicleListItemDto): Vehicle {
  return {
    id: String(item.id),
    customerId: String(item.clientId),
    plate: item.licensePlate || "-",
    createdAt: item.createdDate
  };
}

function getConstantIdByName(
  constants: ConstantListItemDto[],
  type: string,
  name: string
) {
  const normalizedName = name.trim().toLowerCase();

  return constants.find(
    (item) =>
      item.type === type &&
      item.name.trim().toLowerCase() === normalizedName
  )?.id;
}

function isNumericId(value: string | null | undefined) {
  return !!value && /^\d+$/.test(value);
}

export default function TireRecordModal({
  onClose,
  onSave,
  showToast
}: TireRecordModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [existingRecords, setExistingRecords] = useState<TireRecord[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [constants, setConstants] = useState<ConstantListItemDto[]>([]);

  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [brandSearch, setBrandSearch] = useState("");
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);

  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [customerPlates, setCustomerPlates] = useState<string[]>([]);
  const [vehicleNote, setVehicleNote] = useState("");
  const [tireType, setTireType] = useState<TireType>("Yazlık");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(4);
  const [storageLocation, setStorageLocation] = useState("");
  const [photos, setPhotos] = useState<TirePhoto[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const customerRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadModalData() {
      try {
        const [clientResponse, vehicleResponse, constantResponse] =
          await Promise.all([
            clientApi.getClients({ page: 0, pageSize: 1000 }),
            vehicleApi.getVehicles({ page: 0, pageSize: 1000 }),
            constantApi.getConstants({ page: 0, pageSize: 1000 })
          ]);

        if (!isMounted) return;

        const mappedCustomers = (clientResponse.items || []).map(mapApiClientToCustomer);
        const mappedVehicles = (vehicleResponse.items || []).map(mapApiVehicleToVehicle);
        const apiConstants = constantResponse.items || [];

        setCustomers(mappedCustomers);
        setVehicles(mappedVehicles);
        setConstants(apiConstants);

        setBrands(
          apiConstants
            .filter((item) => item.type === "TIRE_TYPE")
            .map((item) => item.name)
        );

        setExistingRecords(StorageService.getTireRecords());
      } catch (error) {
        console.error(error);

        if (!isMounted) return;

        setCustomers(StorageService.getCustomers());
        setVehicles(StorageService.getVehicles());
        setExistingRecords(StorageService.getTireRecords());
        setBrands(StorageService.getBrands());

        showToast(
          "API müşteri, araç veya marka bilgileri yüklenemedi. Yerel veriler gösteriliyor.",
          "warning"
        );
      }
    }

    loadModalData();

    const handleClickOutside = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }

      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      isMounted = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showToast]);

  const filteredCustomers =
    customerSearch.trim().length > 0
      ? customers.filter((customer) => {
          const query = normalizeTurkish(customerSearch);

          const nameMatch = normalizeTurkish(customer.fullName).includes(query);
          const phoneMatch = normalizeTurkish(customer.phone).includes(query);

          const plateMatch = vehicles
            .filter((vehicle) => vehicle.customerId === customer.id)
            .some((vehicle) => normalizeTurkish(vehicle.plate).includes(query));

          return nameMatch || phoneMatch || plateMatch;
        })
      : [];

  const filteredBrands =
    brandSearch.trim().length > 0
      ? brands.filter((brand) =>
          normalizeTurkish(brand).includes(normalizeTurkish(brandSearch))
        )
      : brands.slice(0, 10);

  const formattedCurrentPlate = plate.trim() ? formatPlate(plate) : "";

  const selectedExistingVehicle =
    selectedCustomerId &&
    selectedCustomerId !== "NEW_CUSTOMER" &&
    isNumericId(selectedCustomerId)
      ? vehicles.find(
          (vehicle) =>
            vehicle.customerId === selectedCustomerId &&
            formatPlate(vehicle.plate).toUpperCase() ===
              formattedCurrentPlate.toUpperCase()
        )
      : undefined;

  const isExistingVehicleSelected = !!selectedExistingVehicle;

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearch(customer.fullName);
    setPhone(customer.phone);
    setShowCustomerDropdown(false);

    const associatedPlates = vehicles
      .filter((vehicle) => vehicle.customerId === customer.id)
      .map((vehicle) => vehicle.plate);

    setCustomerPlates(associatedPlates);
    setPlate(associatedPlates[0] || "");
    setVehicleNote("");

    showToast(`${customer.fullName} seçildi.`, "info");
  };

  const handleCreateNewCustomerOption = () => {
    setSelectedCustomerId("NEW_CUSTOMER");
    setShowCustomerDropdown(false);
    setCustomerPlates([]);
    setVehicleNote("");

    showToast(`Yeni müşteri kaydı aktifleştirildi: ${customerSearch}`, "info");
  };

  const handleSelectBrand = (brandName: string) => {
    setBrandSearch(brandName);
    setShowBrandDropdown(false);
  };

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
      } catch (error) {
        console.error(error);
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
    setPhotos((currentPhotos) => currentPhotos.filter((photo) => photo.id !== id));
    showToast("Fotoğraf silindi.", "info");
  };

  const handleSubmit = async (autoPrint: boolean) => {
    const trimmedCustomerName = customerSearch.trim();
    const trimmedPhone = phone.trim();
    const trimmedBrand = brandSearch.trim();
    const trimmedSize = size.trim();
    const trimmedStorageLocation = storageLocation.trim();
    const trimmedVehicleNote = vehicleNote.trim();

    if (!trimmedCustomerName) {
      showToast("Lütfen müşteri adı soyadı girin.", "warning");
      return;
    }

    if (
      !trimmedPhone &&
      (!selectedCustomerId || selectedCustomerId === "NEW_CUSTOMER")
    ) {
      showToast("Yeni müşteri için telefon numarası zorunludur.", "warning");
      return;
    }

    if (!plate.trim()) {
      showToast("Araç plaka bilgisi zorunludur.", "warning");
      return;
    }

    if (!trimmedBrand) {
      showToast("Lütfen lastik markasını seçin.", "warning");
      return;
    }

    if (!trimmedSize) {
      showToast("Ebat / Boyut girilmesi zorunludur. Örn: 205/55 R16", "warning");
      return;
    }

    if (quantity < 1) {
      showToast("Lastik adeti en az 1 olmalıdır.", "warning");
      return;
    }

    const modelConstantId = getConstantIdByName(constants, "TIRE_TYPE", trimmedBrand);
    const brandConstantId = getConstantIdByName(constants, "TIRE_BRAND", tireType);

    if (modelConstantId === undefined) {
      showToast(
        `"${trimmedBrand}" markası backend sabitlerinde bulunamadı. Lütfen listeden bir marka seçin.`,
        "warning"
      );
      return;
    }

    if (brandConstantId === undefined) {
      showToast(`"${tireType}" mevsim türü backend sabitlerinde bulunamadı.`, "warning");
      return;
    }

    try {
      setIsSaving(true);

      const formattedPlate = formatPlate(plate);

      const hasSelectedApiCustomer =
        selectedCustomerId &&
        selectedCustomerId !== "NEW_CUSTOMER" &&
        isNumericId(selectedCustomerId);

      const existingVehicle = hasSelectedApiCustomer
        ? vehicles.find(
            (vehicle) =>
              vehicle.customerId === selectedCustomerId &&
              formatPlate(vehicle.plate).toUpperCase() === formattedPlate.toUpperCase()
          )
        : undefined;

      const hasSelectedApiVehicle =
        !!existingVehicle && isNumericId(existingVehicle.id);

      const payload: CreateTirePayload = {
        client: hasSelectedApiCustomer
          ? {
              id: Number(selectedCustomerId),
              name: null,
              phone: null
            }
          : {
              id: null,
              name: trimmedCustomerName,
              phone: trimmedPhone
            },

        vehicle: hasSelectedApiVehicle
          ? {
              id: Number(existingVehicle.id),
              licensePlate: null,
              note: null,
              imageIds: []
            }
          : {
              id: null,
              licensePlate: formattedPlate,
              note: trimmedVehicleNote,
              imageIds: []
            },

        modelConstantId,
        brandConstantId,
        sizes: trimmedSize,
        count: Number(quantity),
        storageLocation: trimmedStorageLocation
      };

      const savedTire = await tireApi.addTire(payload);

      const finalCustomerId = hasSelectedApiCustomer ? String(selectedCustomerId) : "";
      const finalVehicleId = savedTire.vehicleId
        ? String(savedTire.vehicleId)
        : existingVehicle?.id || "";

      const newRecord: TireRecord = {
        id: String(savedTire.id),
        customerId: finalCustomerId,
        vehicleId: finalVehicleId,
        tireCode:
          savedTire.code || generateTireCode(existingRecords.map((record) => record.tireCode)),
        tireType: savedTire.brandConstantName || tireType,
        brand: savedTire.modelConstantName || trimmedBrand,
        size: savedTire.sizes || trimmedSize,
        quantity: savedTire.count || Number(quantity),
        storageLocation: savedTire.storageLocation || trimmedStorageLocation,
        vehicleNote: hasSelectedApiVehicle
          ? existingVehicle?.note || ""
          : trimmedVehicleNote,
        photos,
        createdAt: savedTire.createdDate || new Date().toISOString(),
        updatedAt: savedTire.createdDate || new Date().toISOString(),
        status: "active",
        snapshot: {
          customerName: savedTire.clientName || trimmedCustomerName,
          phone: trimmedPhone,
          plate: savedTire.vehicleLicensePlate || formattedPlate,
          storageLocation: savedTire.storageLocation || trimmedStorageLocation,
          vehicleNote: hasSelectedApiVehicle
            ? existingVehicle?.note || ""
            : trimmedVehicleNote
        }
      } as TireRecord;

      onSave(newRecord, autoPrint);
      showToast("Emanet lastik kaydı backend'e başarıyla kaydedildi.", "success");
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Kayıt oluşturulurken beklenmedik hata oluştu.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-4 sm:my-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
              Emanet Kaydı / Yeni Lastik Ekle
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Müşteriden emanet alınan mevsimlik lastikleri depomuza kaydedin.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto min-h-0 space-y-6">
          <div className="bg-slate-50/60 rounded-2xl p-5 border border-slate-200/60 space-y-4">
            <h4 className="text-[11px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600 stroke-[2.5]" />
              MÜŞTERİ &amp; ARAÇ BİLGİLERİ
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative" ref={customerRef}>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Müşteri Adı Soyadı *
                </label>

                <div className="relative group/search">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                      setSelectedCustomerId(null);
                      setCustomerPlates([]);
                      setVehicleNote("");
                    }}
                    onFocus={() => {
                      if (customerSearch.trim().length > 0) {
                        setShowCustomerDropdown(true);
                      }
                    }}
                    placeholder="Müşteri ara veya ad soyad girin..."
                    className="w-full px-3.5 py-2.5 pl-9.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />

                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />
                </div>

                {showCustomerDropdown && customerSearch.trim().length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto overflow-hidden">
                    {filteredCustomers.length > 0 ? (
                      <div>
                        <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                          Kayıtlı Eşleşen Müşteriler
                        </div>

                        {filteredCustomers.map((customer) => {
                          const associatedPlates = vehicles
                            .filter((vehicle) => vehicle.customerId === customer.id)
                            .map((vehicle) => vehicle.plate)
                            .join(", ");

                          return (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => handleSelectCustomer(customer)}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-none flex flex-col transition-colors cursor-pointer"
                            >
                              <span className="text-xs font-bold text-slate-900">
                                {customer.fullName}
                              </span>

                              <span className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                                <span className="flex items-center gap-0.5 text-slate-400">
                                  <Phone className="w-2.5 h-2.5" />
                                  {customer.phone}
                                </span>

                                {associatedPlates && (
                                  <span className="text-blue-600 bg-blue-50 border border-blue-100/30 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase">
                                    {associatedPlates}
                                  </span>
                                )}
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Müşteri Telefonu *
                </label>

                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!!selectedCustomerId && selectedCustomerId !== "NEW_CUSTOMER"}
                    placeholder="Örn: 0555 123 4567"
                    className="w-full px-3.5 py-2.5 pl-9.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all disabled:bg-slate-100 disabled:text-slate-500"
                  />

                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Araç Plakası *
                </label>

                <input
                  type="text"
                  value={plate}
                  onChange={(e) => {
                    setPlate(e.target.value);
                    setVehicleNote("");
                  }}
                  placeholder="Örn: 34ABC123"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-mono font-extrabold tracking-wider focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 placeholder:normal-case uppercase"
                />

                {customerPlates.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-slate-400 mr-1 font-bold">
                      Kayıtlı Plakaları:
                    </span>

                    {customerPlates.map((plateItem) => (
                      <button
                        key={plateItem}
                        type="button"
                        onClick={() => {
                          setPlate(plateItem);
                          setVehicleNote("");
                        }}
                        className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                          plate.toUpperCase() === plateItem.toUpperCase()
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-slate-200 text-slate-650 hover:bg-slate-100"
                        }`}
                      >
                        {plateItem}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Araç / Kayıt Notu
                </label>

                <textarea
                  value={vehicleNote}
                  onChange={(e) => setVehicleNote(e.target.value)}
                  disabled={isExistingVehicleSelected}
                  rows={3}
                  placeholder={
                    isExistingVehicleSelected
                      ? "Mevcut araç seçildiği için not bu ekrandan güncellenmez."
                      : "Örn: Jant kapakları çizik, müşteri balans istemedi, araç ilk kayıt..."
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 resize-none transition-all disabled:bg-slate-100 disabled:text-slate-500"
                />

                <p className="mt-1.5 text-[10px] text-slate-400 font-semibold">
                  Bu alan backend şemasına göre araç notu olarak gönderilir.
                  Mevcut araç seçildiğinde backend kuralı gereği not gönderilmez.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50/60 rounded-2xl p-5 border border-slate-200/60 space-y-4">
            <h4 className="text-[11px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-blue-600 stroke-[2.5]" />
              EMANET LASTİK DETAYLARI
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Lastik Mevsim Türü *
                </label>

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

              <div className="relative" ref={brandRef}>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Lastik Markası *
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={brandSearch}
                    onChange={(e) => {
                      setBrandSearch(e.target.value);
                      setShowBrandDropdown(true);
                    }}
                    onFocus={() => setShowBrandDropdown(true)}
                    placeholder="Listeden marka seçiniz..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />

                  <Plus className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {showBrandDropdown && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto overflow-hidden">
                    {filteredBrands.length > 0 ? (
                      filteredBrands.map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => handleSelectBrand(brand)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs text-slate-700 border-b border-slate-100 last:border-none font-bold transition-colors cursor-pointer"
                        >
                          {brand}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500 font-semibold bg-white">
                        Backend sabitlerinde eşleşen marka bulunamadı.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ebat / Boyut Bilgisi *
                </label>

                <input
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="Örn: 225/45/17"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-mono tracking-wide focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Lastik Adeti *
                </label>

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
                    onChange={(e) =>
                      setQuantity(Math.max(1, Number(e.target.value)))
                    }
                    className="w-16 h-10 px-2 text-center bg-white border border-slate-200 rounded-xl text-sm text-slate-900 font-bold focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center bg-white text-slate-600 hover:bg-slate-50 font-bold text-lg select-none cursor-pointer transition-colors"
                  >
                    +
                  </button>

                  <span className="text-xs text-slate-400 font-semibold ml-1.5">
                    Emanet Adeti
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Depo Konumu / Raf No
                </label>

                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder="Örn: Raf A3-C2"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 uppercase focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 font-mono tracking-wider font-bold placeholder:normal-case transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50/60 rounded-2xl p-5 border border-slate-200/60 space-y-4">
            <h4 className="text-[11px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Upload className="w-4 h-4 text-blue-600" />
              LASTİK GÖRSEL DÖKÜMANTASYONU
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="md:col-span-1 border-2 border-dashed border-slate-250 hover:border-blue-500 bg-white hover:bg-slate-50/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all h-32 text-center select-none">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                  className="hidden"
                  disabled={isUploading || isSaving}
                />

                <Upload className="w-6 h-6 text-slate-400 animate-pulse" />

                <span className="text-xs font-bold text-slate-700">
                  Fotoğraf Yükle
                </span>

                <span className="text-[10px] text-slate-400 font-medium">
                  Görselleri seçin
                </span>
              </label>

              <div className="md:col-span-2 flex flex-wrap gap-2.5 min-h-[128px] max-h-36 overflow-y-auto p-2 bg-slate-100 rounded-2xl items-center justify-start border border-slate-200/50">
                {photos.length === 0 ? (
                  <div className="text-center w-full py-6 text-xs text-slate-400 font-semibold italic">
                    Görsel yüklenmedi.
                  </div>
                ) : (
                  photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-3xs flex-shrink-0"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={photo.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
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
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                Fotoğraflar küçültülerek işleniyor... Lütfen bekleyin.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200/70 bg-white/80 px-6 py-5 backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading || isSaving}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Vazgeç
            </button>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isUploading || isSaving}
                className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-extrabold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-200 hover:text-slate-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Kaydediliyor..." : "Yalnızca Kaydet"}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isUploading || isSaving}
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