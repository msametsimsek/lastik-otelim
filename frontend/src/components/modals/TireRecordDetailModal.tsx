import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Edit2,
  Printer,
  CheckCircle,
  Save,
  ArrowLeft,
  Trash2,
  Upload,
  AlertTriangle,
  Eye
} from "lucide-react";

import { TireRecord, Customer, Vehicle, TirePhoto, TireType } from "../../types";

import {
  clientApi,
  vehicleApi,
  tireApi,
  constantApi,
  ConstantListItemDto
} from "../../services/tireApi";

import { formatDate, formatPlate, normalizeTurkish } from "../../utils/helpers";
import { fileApi, pickImagePreviewUrl } from "../../services/fileApi";

interface TireRecordDetailModalProps {
  record: TireRecord;
  onClose: () => void;
  onUpdate: (updatedRecord: TireRecord, autoPrint: boolean) => Promise<void>;
  onDelivered: () => Promise<void>;
  showToast: (
    msg: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
  onOpenLabelPrinter: (rec: TireRecord) => void;
}


function isNumericId(value: string | number | null | undefined) {
  return value !== null && value !== undefined && /^\d+$/.test(String(value));
}

function getConstantLabel(item: ConstantListItemDto) {
  return item.name || item.value || "";
}

function getConstantIdByName(
  constants: ConstantListItemDto[],
  type: "TIRE_TYPE" | "TIRE_BRAND",
  name: string
) {
  const normalizedName = normalizeTurkish(name.trim());

  return constants.find((item) => {
    const itemName = normalizeTurkish(getConstantLabel(item));
    return item.type === type && itemName === normalizedName;
  })?.id;
}

function normalizeTireType(value: string | null | undefined): TireType {
  const normalizedValue = normalizeTurkish(value || "");

  if (normalizedValue.includes("kis")) return "Kışlık";
  if (normalizedValue.includes("4") || normalizedValue.includes("mevsim")) {
    return "4 Mevsim";
  }

  return "Yazlık";
}

function getFallbackCustomer(record: TireRecord): Customer {
  return {
    id: record.clientId,
    fullName: record.snapshot?.customerName || "Bilinmeyen Müşteri",
    phone: record.snapshot?.phone || "",
    createdAt: record.createdAt,
    isActive: true
  };
}

function getFallbackVehicle(record: TireRecord): Vehicle {
  return {
    id: record.vehicleId,
    clientId: record.clientId,
    plate: record.snapshot?.plate || "-",
    note: record.vehicleNote || record.snapshot?.vehicleNote || "",
    createdAt: record.createdAt
  };
}

function uniqueTextList(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalizedValue = normalizeTurkish(value);

    if (!normalizedValue || seen.has(normalizedValue)) {
      return false;
    }

    seen.add(normalizedValue);
    return true;
  });
}

function getPhotoFileId(photo: TirePhoto): number | null {
  const rawId = photo.fileId ?? photo.id;
  const parsedId = typeof rawId === "number" ? rawId : Number(rawId);

  return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
}

function uniquePhotosByFileId(photos: TirePhoto[]) {
  const seen = new Set<string>();

  return photos.filter((photo) => {
    const fileId = getPhotoFileId(photo);
    const key = fileId ? `file-${fileId}` : `photo-${photo.id}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function uniqueNumberList(values: number[]) {
  return Array.from(new Set(values.filter((value) => value > 0)));
}

export default function TireRecordDetailModal({
  record,
  onClose,
  onUpdate,
  onDelivered,
  showToast,
  onOpenLabelPrinter
}: TireRecordDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);

  const [customer, setCustomer] = useState<Customer>(() =>
    getFallbackCustomer(record)
  );

  const [vehicle, setVehicle] = useState<Vehicle>(() =>
    getFallbackVehicle(record)
  );

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [tireType, setTireType] = useState<TireType>("Yazlık");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(4);
  const [location, setLocation] = useState("");
  const [vehicleNote, setVehicleNote] = useState("");
  const [photos, setPhotos] = useState<TirePhoto[]>([]);
  const [deletedFileIds, setDeletedFileIds] = useState<number[]>([]);

  const [constants, setConstants] = useState<ConstantListItemDto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  const [isDeliverConfirmOpen, setIsDeliverConfirmOpen] = useState(false);


  const showToastRef = useRef(showToast);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);


  const brandOptions = useMemo(() => {
    const apiBrands = constants
      .filter((item) => item.type === "TIRE_TYPE")
      .map(getConstantLabel)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "tr"));

    const mergedBrands = brand ? [brand, ...apiBrands] : apiBrands;

    return uniqueTextList(mergedBrands);
  }, [brand, constants]);

  const seasonOptions = useMemo<TireType[]>(() => {
    const apiSeasons = constants
      .filter((item) => item.type === "TIRE_BRAND")
      .map((item) => normalizeTireType(getConstantLabel(item)));

    const mergedSeasons = uniqueTextList([
      tireType,
      ...apiSeasons,
      "Yazlık",
      "Kışlık",
      "4 Mevsim"
    ]);

    return mergedSeasons.map(normalizeTireType);
  }, [constants, tireType]);

  const recordId = String(record.id);

  useEffect(() => {
    const fallbackCustomer = getFallbackCustomer(record);
    const fallbackVehicle = getFallbackVehicle(record);

    setCustomer(fallbackCustomer);
    setVehicle(fallbackVehicle);

    setFullName(fallbackCustomer.fullName || "");
    setPhone(fallbackCustomer.phone || "");
    setPlate(fallbackVehicle.plate || "");

    setTireType(normalizeTireType(record.tireType));
    setBrand(record.brand || "");
    setSize(record.size || "");
    setQuantity(record.quantity || 1);
    setLocation(record.storageLocation || "");
    setVehicleNote(record.vehicleNote || fallbackVehicle.note || "");
    setPhotos(uniquePhotosByFileId(record.photos || []));
    setDeletedFileIds([]);

    // Form yalnızca farklı bir kayıt açıldığında sıfırlanır.
    // Üst bileşenin yeniden render olması, düzenleme sırasında silinen
    // fotoğrafları record.photos üzerinden geri yüklememelidir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  useEffect(() => {
    let isMounted = true;

    constantApi
      .getConstants({ page: 0, pageSize: 1000 })
      .then((response) => {
        if (!isMounted) return;
        setConstants(response.items || []);
      })
      .catch((error) => {
        console.error(error);

        if (!isMounted) return;

        showToastRef.current(
          "Marka ve mevsim seçenekleri yüklenemedi.",
          "warning"
        );
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    const uploadedPhotos: TirePhoto[] = [];
    let uploadedCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith("image/")) {
          showToast("Lütfen sadece görsel dosyası seçin.", "error");
          continue;
        }

        try {
          const localPreviewUrl = URL.createObjectURL(file);
          const uploadedFile = await fileApi.uploadFile(file);
          const backendPreviewUrl = pickImagePreviewUrl(uploadedFile);

          uploadedPhotos.push({
            id: String(uploadedFile.id),
            fileId: uploadedFile.id,
            name:
              uploadedFile.orginalName || uploadedFile.originalName || file.name,
            type: file.type,
            dataUrl: backendPreviewUrl || localPreviewUrl,
            fileUrl: uploadedFile.fileUrl,
            source: "tire"
          });

          uploadedCount++;
        } catch (error) {
          console.error(error);

          showToast(
            error instanceof Error
              ? error.message
              : "Görsel yüklenirken beklenmeyen hata oluştu.",
            "error"
          );
        }
      }

      if (uploadedPhotos.length > 0) {
        setPhotos((currentPhotos) =>
          uniquePhotosByFileId([...currentPhotos, ...uploadedPhotos])
        );
      }

      if (uploadedCount > 0) {
        showToast(`${uploadedCount} yeni fotoğraf yüklendi.`, "success");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = (photoToRemove: TirePhoto) => {
    const removedFileId = getPhotoFileId(photoToRemove);

    if (removedFileId !== null) {
      setDeletedFileIds((currentIds) =>
        uniqueNumberList([...currentIds, removedFileId])
      );
    }

    setPhotos((currentPhotos) =>
      uniquePhotosByFileId(
        currentPhotos.filter((photo) => {
          const currentFileId = getPhotoFileId(photo);

          if (removedFileId !== null && currentFileId !== null) {
            return currentFileId !== removedFileId;
          }

          return String(photo.id) !== String(photoToRemove.id);
        })
      )
    );

    showToast(
      "Fotoğraf kayıttan çıkarıldı. Değişiklikleri kaydettiğinizde işlem uygulanacak.",
      "info"
    );
  };

  const handleSave = async (autoPrint: boolean) => {
    const trimmedFullName = fullName.trim();
    const trimmedPhone = phone.trim();
    const formattedPlate = formatPlate(plate);
    const trimmedBrand = brand.trim();
    const trimmedSize = size.trim();
    const trimmedLocation = location.trim();
    const trimmedVehicleNote = vehicleNote.trim();

    const deletedIdSet = new Set(uniqueNumberList(deletedFileIds));

    const activePhotos = photos.filter((photo) => {
      const fileId = getPhotoFileId(photo);
      return fileId === null || !deletedIdSet.has(fileId);
    });

    const vehicleImageIds = uniqueNumberList(
      activePhotos
        .filter((photo) => photo.source === "vehicle")
        .map(getPhotoFileId)
        .filter((fileId): fileId is number => fileId !== null)
    );

    const activeImageIds = uniqueNumberList(
      activePhotos
        .map(getPhotoFileId)
        .filter((fileId): fileId is number => fileId !== null)
    );

    if (
      !trimmedFullName ||
      !trimmedPhone ||
      !formattedPlate ||
      !trimmedBrand ||
      !trimmedSize
    ) {
      showToast("Lütfen tüm zorunlu alanları (*) eksiksiz doldurun.", "warning");
      return;
    }

    if (!isNumericId(record.id)) {
      showToast("Lastik kayıt bilgisi geçersiz. Kayıt güncellenemedi.", "error");
      return;
    }

    if (!isNumericId(record.clientId)) {
      showToast("Müşteri bilgisi geçersiz. Kayıt güncellenemedi.", "error");
      return;
    }

    if (!isNumericId(record.vehicleId)) {
      showToast("Araç bilgisi geçersiz. Kayıt güncellenemedi.", "error");
      return;
    }

    const modelConstantId = getConstantIdByName(
      constants,
      "TIRE_TYPE",
      trimmedBrand
    );

    const brandConstantId = getConstantIdByName(
      constants,
      "TIRE_BRAND",
      tireType
    );

    if (modelConstantId === undefined) {
      showToast(
        `"${trimmedBrand}" markası bulunamadı. Lütfen listeden geçerli bir marka seçin.`,
        "warning"
      );
      return;
    }

    if (brandConstantId === undefined) {
      showToast(`"${tireType}" mevsim türü bulunamadı.`, "warning");
      return;
    }

    try {
      setIsSaving(true);

      const updatedVehicle = await vehicleApi.updateVehicle({
        id: Number(record.vehicleId),
        licensePlate: formattedPlate,
        note: trimmedVehicleNote,
        imageIds: vehicleImageIds
      });

      const updatedClient = await clientApi.updateClient({
        id: Number(record.clientId),
        name: trimmedFullName,
        phone: trimmedPhone,
        note: ""
      });

      const updatedTire = await tireApi.updateTire({
        id: Number(record.id),
        modelConstantId,
        brandConstantId,
        sizes: trimmedSize,
        count: Number(quantity),
        storageLocation: trimmedLocation
      });

      let failedDeleteCount = 0;

      const fileIdsToDelete = uniqueNumberList(deletedFileIds).filter(
        (fileId) => !activeImageIds.includes(fileId)
      );

      if (fileIdsToDelete.length > 0) {
        const deleteResults = await Promise.allSettled(
          fileIdsToDelete.map((fileId) => fileApi.deleteFile(fileId))
        );

        failedDeleteCount = deleteResults.filter(
          (result) => result.status === "rejected"
        ).length;
      }

      const finalTireType = normalizeTireType(
        updatedTire.brandConstantName || tireType
      );

      const finalBrand = updatedTire.modelConstantName || trimmedBrand;
      const finalSize = updatedTire.sizes || trimmedSize;
      const finalQuantity = updatedTire.count || Number(quantity);

      const finalStorageLocation =
        updatedTire.storageLocation !== null &&
        updatedTire.storageLocation !== undefined
          ? updatedTire.storageLocation
          : trimmedLocation;

      const finalVehicleNote = updatedVehicle.note || trimmedVehicleNote;
      const finalPlate = updatedVehicle.licensePlate || formattedPlate;

      const finalPhotos = uniquePhotosByFileId(activePhotos);

      const updatedCustomer: Customer = {
        id: String(updatedClient.id),
        fullName: updatedClient.name || trimmedFullName,
        phone: updatedClient.phone || trimmedPhone,
        createdAt: updatedClient.createdDate || customer.createdAt,
        isActive: true
      };

      const updatedVehicleModel: Vehicle = {
        id: String(updatedVehicle.id),
        clientId: String(updatedVehicle.clientId || record.clientId),
        plate: finalPlate,
        note: finalVehicleNote,
        createdAt: updatedVehicle.createdDate || vehicle.createdAt
      };

      const updatedRecord: TireRecord = {
        ...record,
        clientId: String(updatedClient.id),
        vehicleId: String(updatedVehicle.id),
        tireType: finalTireType,
        brand: finalBrand,
        size: finalSize,
        quantity: finalQuantity,
        storageLocation: finalStorageLocation,
        vehicleNote: finalVehicleNote,
        photos: finalPhotos,
        updatedAt: new Date().toISOString(),
        snapshot: {
          customerName: updatedClient.name || trimmedFullName,
          phone: updatedClient.phone || trimmedPhone,
          plate: finalPlate,
          tireCode: record.tireCode,
          tireType: finalTireType,
          brand: finalBrand,
          size: finalSize,
          quantity: finalQuantity,
          storageLocation: finalStorageLocation,
          vehicleNote: finalVehicleNote
        }
      };

      setCustomer(updatedCustomer);
      setVehicle(updatedVehicleModel);
      setPhotos(finalPhotos);
      setDeletedFileIds([]);
  
      await onUpdate(updatedRecord, autoPrint);

      if (failedDeleteCount > 0) {
        showToast(
          "Kayıt güncellendi fakat bazı fotoğraflar kalıcı olarak silinemedi.",
          "warning"
        );
      } else {
        showToast("Kayıt değişiklikleri başarıyla kaydedildi.", "success");
      }

      if (!autoPrint) {
        setIsEditMode(false);
      }
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Güncelleme yapılırken beklenmeyen hata oluştu.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeliverRecord = async () => {
    if (!isNumericId(record.id)) {
      showToast(
        "Lastik kayıt bilgisi geçersiz. Teslim işlemi yapılamadı.",
        "error"
      );
      return;
    }

    try {
      setIsSaving(true);

      await tireApi.deleteTire(Number(record.id));
      await onDelivered();

      setIsDeliverConfirmOpen(false);

      showToast(
        "Lastik müşteriye teslim edildi ve aktif emanetlerden çıkarıldı.",
        "success"
      );

      onClose();
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Teslim işlemi sırasında beklenmeyen bir hata oluştu.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const visibleVehicleNote = record.vehicleNote || vehicle.note || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-4 sm:my-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/55 shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 border border-blue-200/50 text-blue-700 font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
              {record.tireCode}
            </span>

            <span className="text-xs text-slate-450 font-bold">
              | Detaylı Lastik Emanet Kartı
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto min-h-0">
          {isEditMode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                  Emanet Kaydını Düzenle
                </h4>

                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  disabled={isSaving}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Geri Dön (İptal)
                </button>
              </div>

              <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-200/60 space-y-4 text-slate-900">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Müşteri Ad Soyad *
                    </label>

                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isSaving}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Müşteri Telefonu *
                    </label>

                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isSaving}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Araç Plaka *
                    </label>

                    <input
                      type="text"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value)}
                      disabled={isSaving}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-900 font-mono tracking-wider focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all uppercase font-medium disabled:bg-slate-100"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Araç / Kayıt Notu
                    </label>

                    <textarea
                      value={vehicleNote}
                      onChange={(e) => setVehicleNote(e.target.value)}
                      disabled={isSaving}
                      rows={3}
                      placeholder="Örn: Sağ arka jant çizik, müşteri balans istemedi..."
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all disabled:bg-slate-100 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-200/60 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mevsim Türü *
                    </label>

                    <div className="grid grid-cols-3 gap-1">
                      {seasonOptions.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setTireType(type)}
                          disabled={isSaving}
                          className={`py-1.5 px-2 text-xs font-bold border rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lastik Markası *
                    </label>

                    {brandOptions.length > 0 ? (
                      <select
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        disabled={isSaving}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all disabled:bg-slate-100"
                      >
                        <option value="">Marka seçin</option>
                        {brandOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        disabled={isSaving}
                        placeholder="Marka listesi yüklenemedi"
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all disabled:bg-slate-100"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ebat / Boyut Bilgisi *
                    </label>

                    <input
                      type="text"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      disabled={isSaving}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Adet *
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, Number(e.target.value)))
                      }
                      disabled={isSaving}
                      className="w-24 px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-800 focus:outline-none text-center font-bold disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Depo Konumu / Raf No
                    </label>

                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={isSaving}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-900 font-mono uppercase font-bold focus:outline-none disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-200/60 space-y-3">
                <label className="block text-xs font-black text-slate-450 uppercase tracking-widest font-mono">
                  RESİM HAVUZU DÖKÜMANTASYONU
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="border-2 border-dashed border-slate-250 hover:border-blue-500 bg-white rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer h-20 text-center select-none">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e.target.files)}
                      className="hidden"
                      disabled={isUploading || isSaving}
                    />

                    <Upload className="w-5 h-5 text-slate-400" />

                    <span className="text-[10px] font-bold text-slate-700">
                      Fotoğraf Ekle
                    </span>
                  </label>

                  <div className="md:col-span-2 flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl items-center border border-slate-200/55 min-h-[80px]">
                    {photos.length === 0 ? (
                      <span className="text-slate-400 text-xs text-center w-full py-2 font-semibold italic">
                        Görsel bulunmamaktadır.
                      </span>
                    ) : (
                      photos.map((photo) => (
                        <div
                          key={
                            typeof photo.fileId === "number"
                              ? `file-${photo.fileId}`
                              : photo.id
                          }
                          className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-white flex-shrink-0"
                        >
                          <img
                            src={photo.dataUrl}
                            alt={photo.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />

                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleRemovePhoto(photo);
                            }}
                            disabled={isSaving}
                            aria-label={`${photo.name} görselini kaldır`}
                            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow-md transition-all hover:bg-rose-700 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-white" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {isUploading && (
                  <div className="text-xs text-blue-600 font-bold animate-pulse">
                    Fotoğraflar yükleniyor...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {record.status === "delivered" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 font-sans space-y-1.5 flex items-start gap-3.5 shadow-sm text-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                    <CheckCircle className="w-6 h-6 stroke-[2.5]" />
                  </div>

                  <div className="flex-1 text-left">
                    <h5 className="font-extrabold text-emerald-900 text-sm">
                      Bu Lastik Emaneti Müşteriye Teslim Edilmiştir
                    </h5>

                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Bu emanet kaydı aktif depolama statüsünden düşürülmüş ve
                      arşive taşınmıştır.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-slate-500 font-mono text-[11px] font-bold mt-2 pt-2 border-t border-emerald-100">
                      <div>
                        Teslim Tarihi:{" "}
                        <span className="text-emerald-850 font-extrabold">
                          {formatDate(record.deliveredAt || record.updatedAt || "")}
                        </span>
                      </div>

                      {record.deliveryNote && (
                        <div className="col-span-1 sm:col-span-2 mt-1.5 italic font-sans font-medium bg-white/75 border border-emerald-100 p-2 rounded-lg text-slate-700">
                          Teslim Notu:{" "}
                          <span className="text-slate-900 font-bold">
                            &quot;{record.deliveryNote}&quot;
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    ARAÇ PLAKASI
                  </div>

                  <div className="font-mono font-extrabold text-sm text-blue-800 bg-blue-50 border border-blue-100/50 px-2.5 py-1 rounded-lg inline-block mt-1 tracking-wider uppercase">
                    {vehicle.plate}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    DEPO RAFI
                  </div>

                  <div className="font-mono font-black text-sm text-slate-800 mt-2 bg-amber-55/10 border border-amber-200 text-amber-800 px-2.5 py-0.5 rounded-lg inline-block uppercase">
                    {record.storageLocation || "RAFTSIZ CARİ"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    EMANET ADETİ
                  </div>

                  <div className="font-extrabold text-sm text-slate-900 mt-2">
                    {record.quantity} Adet
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-800">
                <div className="space-y-3.5">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                    MÜŞTERİ HESAP BİLGİLERİ
                  </h5>

                  <div className="space-y-2.5 text-xs sm:text-sm bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 font-semibold text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400 font-medium">Ad Soyad:</span>
                      <span className="font-bold text-slate-900">
                        {customer.fullName}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400 font-medium">
                        Telefon No:
                      </span>

                      <span className="font-extrabold text-blue-600 font-mono">
                        {customer.phone}
                      </span>
                    </div>

                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400 font-medium">
                        Kayıt Tarihi:
                      </span>

                      <span className="text-slate-500 font-mono text-xs font-bold">
                        {formatDate(record.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                    LASTİK SPESİFİKASYONLARI
                  </h5>

                  <div className="space-y-2.5 text-xs sm:text-sm bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 font-semibold text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400 font-medium">
                        Mevsim Türü:
                      </span>

                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            record.tireType === "Yazlık"
                              ? "bg-amber-400 animate-pulse"
                              : record.tireType === "Kışlık"
                                ? "bg-sky-400 animate-pulse"
                                : "bg-emerald-400 animate-pulse"
                          }`}
                        />
                        {record.tireType}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400 font-medium">
                        Lastik Markası:
                      </span>

                      <span className="font-bold text-slate-900">
                        {record.brand}
                      </span>
                    </div>

                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400 font-medium">
                        Lastik Ebadı:
                      </span>

                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 text-xs rounded border border-slate-205">
                        {record.size}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                  ARAÇ / KAYIT NOTU
                </h5>

                <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 text-xs text-slate-700 leading-relaxed font-semibold">
                  {visibleVehicleNote || "Not girilmemiş."}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-black text-slate-450 uppercase tracking-widest font-mono">
                    HASAR / RESİM ALBÜMÜ ({photos.length})
                  </h5>

                  {photos.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      Detay için üzerine tıklayın
                    </span>
                  )}
                </div>

                {photos.length === 0 ? (
                  <div className="border border-dashed border-slate-200 bg-slate-50/60 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-1.5">
                    <Eye className="w-6 h-6 text-slate-300" />

                    <span className="text-xs font-bold text-slate-650">
                      Görsel Kaydı Yok
                    </span>

                    <span className="text-[10px] text-slate-400 font-medium max-w-sm leading-relaxed">
                      Bu emanet kaydı oluşturulurken herhangi bir hasar veya
                      durum fotoğrafı yüklenmemiş.
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2.5">
                    {photos.map((photo) => (
                      <div
                        key={
                          typeof photo.fileId === "number"
                            ? `file-${photo.fileId}`
                            : photo.id
                        }
                        className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white cursor-zoom-in hover:shadow-md transition-shadow"
                        onClick={() => setActivePhotoUrl(photo.dataUrl)}
                      >
                        <img
                          src={photo.dataUrl}
                          alt={photo.name}
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

        <div className="border-t border-slate-200/70 bg-white/90 px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:w-auto">
              {!isEditMode && record.status !== "delivered" && (
                <button
                  type="button"
                  onClick={() => onOpenLabelPrinter(record)}
                  disabled={isSaving}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-100 active:scale-[0.98] lg:w-auto disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Printer className="h-4 w-4 text-blue-600" />
                  <span>Barkod / Etiket</span>
                </button>
              )}
            </div>

            <div className="w-full lg:w-auto">
              {isEditMode ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:justify-end">
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={isSaving || isUploading}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-200 hover:text-slate-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={isSaving || isUploading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-xs font-black text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 text-white" />
                    <span>{isSaving ? "Kaydediliyor..." : "Kaydet ve Barkodla"}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Geri
                  </button>

                  {record.status !== "delivered" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsDeliverConfirmOpen(true)}
                        disabled={isSaving}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-xs font-black text-rose-700 shadow-sm transition-all duration-200 hover:border-rose-300 hover:bg-rose-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Teslim Edildi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditMode(true)}
                        disabled={isSaving}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-xs font-black text-white shadow-lg shadow-slate-900/20 transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Düzenle</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {isDeliverConfirmOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-5 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div className="flex-1">
                  <h4 className="text-sm font-black text-slate-950">
                    Emanet Teslim Edildi Olarak İşaretlensin mi?
                  </h4>

                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    Kayıt aktif emanetlerden çıkarılacak ve işlem geçmişine
                    teslim/çıkış hareketi olarak kaydedilecektir.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeliverConfirmOpen(false)}
                  disabled={isSaving}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Vazgeç
                </button>

                <button
                  type="button"
                  onClick={handleDeliverRecord}
                  disabled={isSaving}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-rose-600 px-4 text-xs font-black text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Teslim Ediliyor..." : "Teslim Et"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {activePhotoUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4 cursor-zoom-out"
          onClick={() => setActivePhotoUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setActivePhotoUrl(null)}
              className="absolute -top-12 right-0 p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all font-sans cursor-pointer text-xs flex items-center gap-1 font-bold"
            >
              <X className="w-4 h-4" />
              Kapat [ESC]
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