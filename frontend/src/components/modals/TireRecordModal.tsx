import { useEffect, useState } from "react";
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
import { StorageService } from "../../services/storageService";
import {
  clientApi,
  vehicleApi,
  tireApi,
  constantApi,
  ConstantListItemDto
} from "../../services/tireApi";
import { formatDate, formatPlate } from "../../utils/helpers";
import { fileApi, pickImagePreviewUrl } from "../../services/fileApi";

interface TireRecordDetailModalProps {
  record: TireRecord;
  onClose: () => void;
  onUpdate: (updatedRecord: TireRecord, autoPrint: boolean) => void;
  showToast: (
    msg: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
  onOpenLabelPrinter: (rec: TireRecord) => void;
}

function getCurrentDateTimeLocalValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function isNumericId(value: string | number | null | undefined) {
  return value !== null && value !== undefined && /^\d+$/.test(String(value));
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

function normalizeTireType(value: string | null | undefined): TireType {
  if (value === "Yazlık" || value === "Kışlık" || value === "4 Mevsim") {
    return value;
  }

  return "Yazlık";
}

function getFallbackCustomer(record: TireRecord): Customer {
  return {
    id: record.customerId,
    fullName: record.snapshot?.customerName || "Bilinmeyen Müşteri",
    phone: record.snapshot?.phone || "",
    createdAt: record.createdAt
  };
}

function getFallbackVehicle(record: TireRecord): Vehicle {
  return {
    id: record.vehicleId,
    customerId: record.customerId,
    plate: record.snapshot?.plate || "-",
    note: record.vehicleNote || record.snapshot?.vehicleNote || "",
    createdAt: record.createdAt
  };
}

export default function TireRecordDetailModal({
  record,
  onClose,
  onUpdate,
  showToast,
  onOpenLabelPrinter
}: TireRecordDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);

  const [customer, setCustomer] = useState<Customer | undefined>(() => {
    const matchedCustomer = StorageService.getCustomers().find(
      (item) => item.id === record.customerId
    );

    return matchedCustomer || getFallbackCustomer(record);
  });

  const [vehicle, setVehicle] = useState<Vehicle | undefined>(() => {
    const matchedVehicle = StorageService.getVehicles().find(
      (item) => item.id === record.vehicleId
    );

    return matchedVehicle || getFallbackVehicle(record);
  });

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
  const [deliveryNote, setDeliveryNote] = useState("");
  const [deliveredAtDate, setDeliveredAtDate] = useState(
    getCurrentDateTimeLocalValue
  );

  useEffect(() => {
    const matchedCustomer =
      StorageService.getCustomers().find((item) => item.id === record.customerId) ||
      getFallbackCustomer(record);

    const matchedVehicle =
      StorageService.getVehicles().find((item) => item.id === record.vehicleId) ||
      getFallbackVehicle(record);

    setCustomer(matchedCustomer);
    setVehicle(matchedVehicle);

    setFullName(matchedCustomer.fullName || "");
    setPhone(matchedCustomer.phone || "");
    setPlate(matchedVehicle.plate || "");

    setTireType(normalizeTireType(record.tireType));
    setBrand(record.brand || "");
    setSize(record.size || "");
    setQuantity(record.quantity || 1);
    setLocation(record.storageLocation || "");
    setVehicleNote(record.vehicleNote || matchedVehicle.note || "");
    setPhotos(record.photos || []);
    setDeletedFileIds([]);

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

        showToast(
          "Marka ve mevsim sabitleri yüklenemedi. Düzenleme sırasında tekrar deneyin.",
          "warning"
        );
      });

    return () => {
      isMounted = false;
    };
  }, [record, showToast]);

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files) return;

    setIsUploading(true);

    let uploadedCount = 0;
    const uploadedPhotos: TirePhoto[] = [...photos];

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
          name: uploadedFile.orginalName || uploadedFile.originalName || file.name,
          type: file.type,
          dataUrl: backendPreviewUrl || localPreviewUrl,
          fileUrl: uploadedFile.fileUrl
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

    setPhotos(uploadedPhotos);
    setIsUploading(false);

    if (uploadedCount > 0) {
      showToast(`${uploadedCount} yeni fotoğraf backend'e yüklendi.`, "success");
    }
  };

  const handleRemovePhoto = (id: string) => {
    const removedPhoto = photos.find((photo) => photo.id === id);

    if (removedPhoto?.fileId) {
      setDeletedFileIds((currentIds) => {
        if (currentIds.includes(removedPhoto.fileId!)) {
          return currentIds;
        }

        return [...currentIds, removedPhoto.fileId!];
      });
    }

    setPhotos((currentPhotos) =>
      currentPhotos.filter((photo) => photo.id !== id)
    );

    showToast(
      "Fotoğraf listeden çıkarıldı. Kalıcı silmek için değişiklikleri kaydedin.",
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

    const imageIds = photos
      .map((photo) => photo.fileId)
      .filter((id): id is number => typeof id === "number" && id > 0);

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

    if (!customer || !vehicle) {
      showToast("Müşteri veya araç bilgisi bulunamadı.", "error");
      return;
    }

    if (!isNumericId(record.id)) {
      showToast(
        "Lastik kayıt ID bilgisi geçersiz. Backend kaydı güncellenemedi.",
        "error"
      );
      return;
    }

    if (!isNumericId(record.customerId)) {
      showToast(
        "Müşteri ID bilgisi geçersiz. Backend müşteri kaydı güncellenemedi.",
        "error"
      );
      return;
    }

    if (!isNumericId(record.vehicleId)) {
      showToast(
        "Araç ID bilgisi geçersiz. Backend araç kaydı güncellenemedi.",
        "error"
      );
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
        `"${trimmedBrand}" markası backend sabitlerinde bulunamadı. Lütfen geçerli bir marka yazın.`,
        "warning"
      );
      return;
    }

    if (brandConstantId === undefined) {
      showToast(
        `"${tireType}" mevsim türü backend sabitlerinde bulunamadı.`,
        "warning"
      );
      return;
    }

    try {
      setIsSaving(true);

      const [updatedClient, updatedVehicle, updatedTire] = await Promise.all([
        clientApi.updateClient({
          id: Number(record.customerId),
          name: trimmedFullName,
          phone: trimmedPhone,
          note: ""
        }),

        vehicleApi.updateVehicle({
          id: Number(record.vehicleId),
          licensePlate: formattedPlate,
          note: trimmedVehicleNote,
          imageIds
        }),

        tireApi.updateTire({
          id: Number(record.id),
          modelConstantId,
          brandConstantId,
          sizes: trimmedSize,
          count: Number(quantity),
          storageLocation: trimmedLocation
        })
      ]);
      if (deletedFileIds.length > 0) {
        await Promise.allSettled(
          deletedFileIds.map((fileId) => fileApi.deleteFile(fileId))
        );
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

      const updatedCustomer: Customer = {
        id: String(updatedClient.id),
        fullName: updatedClient.name || trimmedFullName,
        phone: updatedClient.phone || trimmedPhone,
        createdAt: updatedClient.createdDate || customer.createdAt
      };

      const updatedVehicleModel: Vehicle = {
        id: String(updatedVehicle.id),
        customerId: String(updatedVehicle.clientId || record.customerId),
        plate: finalPlate,
        note: finalVehicleNote,
        createdAt: updatedVehicle.createdDate || vehicle.createdAt
      };

      const updatedRecord: TireRecord = {
        ...record,
        customerId: String(updatedClient.id),
        vehicleId: String(updatedVehicle.id),
        tireType: finalTireType,
        brand: finalBrand,
        size: finalSize,
        quantity: finalQuantity,
        storageLocation: finalStorageLocation,
        vehicleNote: finalVehicleNote,
        photos,
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

      onUpdate(updatedRecord, autoPrint);
      showToast("Kayıt değişiklikleri backend'e başarıyla kaydedildi.", "success");

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

  const handleDeliverRecord = () => {
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
        storageLocation: record.storageLocation,
        vehicleNote: record.vehicleNote || vehicle?.note || ""
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
    } catch (error) {
      console.error(error);
      showToast("Emanet teslim edilirken hata oluştu.", "error");
    }
  };

  if (!customer || !vehicle) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs">
        <div className="bg-white p-6 rounded-2xl max-w-sm text-center shadow-xl">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />

          <h4 className="font-bold text-zinc-900">Kayıt Yüklenemedi</h4>

          <p className="text-xs text-zinc-500 mt-1">
            İlişkili müşteri veya araç bilgileri bulunamadı.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold rounded-lg"
          >
            Kapat
          </button>
        </div>
      </div>
    );
  }

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
                      {(["Yazlık", "Kışlık", "4 Mevsim"] as TireType[]).map(
                        (type) => (
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
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lastik Markası *
                    </label>

                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      disabled={isSaving}
                      placeholder="Michelin, Petlas vb..."
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-205 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all disabled:bg-slate-100"
                    />
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
                          key={photo.id}
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
                            onClick={() => handleRemovePhoto(photo.id)}
                            disabled={isSaving}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {isUploading && (
                  <div className="text-xs text-blue-600 font-bold animate-pulse">
                    Fotoğraflar backend'e yükleniyor...
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
                        key={photo.id}
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
                    Bu işlem kaydı aktif depo listesinden düşürür. Teslim tarihi
                    ve notu arşiv bilgisine işlenir.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Teslim Tarihi
                  </label>

                  <input
                    type="datetime-local"
                    value={deliveredAtDate}
                    onChange={(e) => setDeliveredAtDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Teslim Notu
                  </label>

                  <textarea
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    rows={3}
                    placeholder="Örn: Müşteri lastikleri eksiksiz teslim aldı."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeliverConfirmOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 hover:bg-slate-50"
                >
                  Vazgeç
                </button>

                <button
                  type="button"
                  onClick={handleDeliverRecord}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-rose-600 px-4 text-xs font-black text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500"
                >
                  Teslim Edildi Olarak Kaydet
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