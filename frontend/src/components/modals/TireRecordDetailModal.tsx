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
  ConstantListItemDto,
  ClientListItemDto,
  VehicleListItemDto,
  TireListItemDto,
  UploadFileDto
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

type DetailPhoto = TirePhoto & {
  source: "vehicle" | "tire";
};

const EMPTY_CUSTOMER: Customer = {
  id: "",
  fullName: "",
  phone: "",
  createdAt: "",
  isActive: true
};

const EMPTY_VEHICLE: Vehicle = {
  id: "",
  clientId: "",
  plate: "",
  note: "",
  createdAt: ""
};

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

function uniquePhotosByFileId<TPhoto extends TirePhoto>(photos: TPhoto[]) {
  const seen = new Set<string>();

  return photos.filter((photo) => {
    const fileId = getPhotoFileId(photo);
    const key = fileId
      ? `file-${fileId}`
      : photo.fileUrl
        ? `url-${photo.fileUrl}`
        : `photo-${photo.id}`;

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

function mapUploadFilesToDetailPhotos(
  files: UploadFileDto[] | undefined,
  source: DetailPhoto["source"]
): DetailPhoto[] {
  return (files || [])
    .map((file, index) => {
      const fileId = file.fileId || file.id;
      const imageUrl = pickImagePreviewUrl(
        file as Parameters<typeof pickImagePreviewUrl>[0]
      );

      return {
        id: String(
          fileId ||
            file.fileUrl ||
            file.fileName ||
            `${source}-photo-${index}`
        ),
        fileId: typeof fileId === "number" ? fileId : undefined,
        name:
          file.orginalName ||
          file.originalName ||
          file.fileName ||
          (source === "vehicle" ? "Araç görseli" : "Lastik görseli"),
        type: "image/*",
        dataUrl: imageUrl || file.fileUrl || "",
        fileUrl: file.fileUrl,
        source
      };
    })
    .filter((photo) => Boolean(photo.dataUrl));
}

function mapBackendClientToCustomer(client: ClientListItemDto): Customer {
  return {
    id: String(client.id),
    fullName: client.name || "Bilinmeyen Müşteri",
    phone: client.phone || "",
    createdAt: client.createdDate,
    isActive: true
  };
}

function mapBackendVehicleToVehicle(vehicle: VehicleListItemDto): Vehicle {
  return {
    id: String(vehicle.id),
    clientId: String(vehicle.clientId),
    plate: vehicle.licensePlate || "-",
    note: vehicle.note || "",
    createdAt: vehicle.createdDate
  };
}

function mapBackendTireToRecord(tire: TireListItemDto): TireRecord {
  const finalTireType = normalizeTireType(tire.brandConstantName);
  const tireCode = tire.code || `LT-${tire.id}`;
  const brand = tire.modelConstantName || "Belirtilmedi";
  const size = tire.sizes || "Belirtilmedi";
  const quantity = tire.count || 0;
  const storageLocation = tire.storageLocation || "";

  return {
    id: String(tire.id),
    clientId: "",
    vehicleId: String(tire.vehicleId),
    tireCode,
    tireType: finalTireType,
    brand,
    size,
    quantity,
    storageLocation,
    vehicleNote: "",
    photos: mapUploadFilesToDetailPhotos(tire.uploadFiles, "tire"),
    createdAt: tire.createdDate,
    updatedAt: tire.createdDate,
    status: "active",
    snapshot: {
      customerName: tire.clientName || "Bilinmeyen Müşteri",
      phone: "",
      plate: tire.vehicleLicensePlate || "-",
      tireCode,
      tireType: finalTireType,
      brand,
      size,
      quantity,
      storageLocation,
      vehicleNote: ""
    }
  };
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

  const [isDetailLoading, setIsDetailLoading] = useState(true);
  const [detailErrorMessage, setDetailErrorMessage] = useState("");
  const [backendTireRecord, setBackendTireRecord] =
    useState<TireRecord | null>(null);

  const [customer, setCustomer] = useState<Customer>(EMPTY_CUSTOMER);
  const [vehicle, setVehicle] = useState<Vehicle>(EMPTY_VEHICLE);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [tireType, setTireType] = useState<TireType>("Yazlık");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(4);
  const [location, setLocation] = useState("");
  const [vehicleNote, setVehicleNote] = useState("");
  const [photos, setPhotos] = useState<DetailPhoto[]>([]);
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

  const activeRecord = backendTireRecord || record;
  const isBackendReady = Boolean(backendTireRecord);
  const activeRecordCode = activeRecord.tireCode || "Yükleniyor";
  const visibleVehicleNote = activeRecord.vehicleNote || vehicle.note || "";

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

  useEffect(() => {
    let isMounted = true;

    async function loadBackendDetail() {
      if (!isNumericId(record.id)) {
        setDetailErrorMessage("Lastik kayıt ID bilgisi geçersiz.");
        setIsDetailLoading(false);
        return;
      }

      try {
        setIsDetailLoading(true);
        setDetailErrorMessage("");
        setBackendTireRecord(null);
        setIsEditMode(false);
        setDeletedFileIds([]);

        const tireDetail = await tireApi.getTireById(Number(record.id));

        if (!isMounted) return;

        let vehicleDetail: VehicleListItemDto | null = null;
        let clientDetail: ClientListItemDto | null = null;

        if (tireDetail.vehicleId) {
          vehicleDetail = await vehicleApi.getVehicleById(tireDetail.vehicleId);

          if (!isMounted) return;

          if (vehicleDetail.clientId) {
            clientDetail = await clientApi.getClientById(vehicleDetail.clientId);

            if (!isMounted) return;
          }
        }

        const mappedRecord = mapBackendTireToRecord(tireDetail);

        const mappedCustomer = clientDetail
          ? mapBackendClientToCustomer(clientDetail)
          : {
              id: vehicleDetail ? String(vehicleDetail.clientId) : "",
              fullName: tireDetail.clientName || "Bilinmeyen Müşteri",
              phone: "",
              createdAt: tireDetail.createdDate,
              isActive: true
            };

        const mappedVehicle = vehicleDetail
          ? mapBackendVehicleToVehicle(vehicleDetail)
          : {
              id: String(tireDetail.vehicleId),
              clientId: mappedCustomer.id,
              plate: tireDetail.vehicleLicensePlate || "-",
              note: "",
              createdAt: tireDetail.createdDate
            };

        const vehiclePhotos = mapUploadFilesToDetailPhotos(
          vehicleDetail?.uploadFiles,
          "vehicle"
        );

        const tirePhotos = mapUploadFilesToDetailPhotos(
          tireDetail.uploadFiles,
          "tire"
        );

        const mergedPhotos = uniquePhotosByFileId([
          ...vehiclePhotos,
          ...tirePhotos
        ]);

        const finalRecord: TireRecord = {
          ...mappedRecord,
          clientId: mappedCustomer.id,
          vehicleId: mappedVehicle.id,
          vehicleNote: mappedVehicle.note || "",
          photos: mergedPhotos,
          snapshot: {
            ...mappedRecord.snapshot,
            customerName: mappedCustomer.fullName,
            phone: mappedCustomer.phone,
            plate: mappedVehicle.plate,
            vehicleNote: mappedVehicle.note || ""
          }
        };

        setBackendTireRecord(finalRecord);
        setCustomer(mappedCustomer);
        setVehicle(mappedVehicle);

        setFullName(mappedCustomer.fullName || "");
        setPhone(mappedCustomer.phone || "");
        setPlate(mappedVehicle.plate || "");

        setTireType(finalRecord.tireType);
        setBrand(finalRecord.brand || "");
        setSize(finalRecord.size || "");
        setQuantity(finalRecord.quantity || 1);
        setLocation(finalRecord.storageLocation || "");
        setVehicleNote(finalRecord.vehicleNote || "");
        setPhotos(mergedPhotos);
      } catch (error) {
        console.error(error);

        if (!isMounted) return;

        setDetailErrorMessage(
          error instanceof Error
            ? error.message
            : "Lastik detay bilgisi backend üzerinden alınamadı."
        );
      } finally {
        if (isMounted) {
          setIsDetailLoading(false);
        }
      }
    }

    loadBackendDetail();

    return () => {
      isMounted = false;
    };
  }, [record.id]);

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

    const uploadedPhotos: DetailPhoto[] = [];
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
            source: "vehicle"
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
        showToast(
          `${uploadedCount} yeni fotoğraf yüklendi. Yeni fotoğraflar araç görseli olarak kaydedilecek.`,
          "success"
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = (photoToRemove: DetailPhoto) => {
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
    if (!backendTireRecord) {
      showToast("Backend detay bilgisi yüklenmeden kayıt güncellenemez.", "error");
      return;
    }

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

    if (!isNumericId(activeRecord.id)) {
      showToast("Lastik kayıt bilgisi geçersiz. Kayıt güncellenemedi.", "error");
      return;
    }

    if (!isNumericId(customer.id)) {
      showToast("Müşteri bilgisi geçersiz. Kayıt güncellenemedi.", "error");
      return;
    }

    if (!isNumericId(vehicle.id)) {
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
        id: Number(vehicle.id),
        licensePlate: formattedPlate,
        note: trimmedVehicleNote,
        imageIds: vehicleImageIds
      });

      const updatedClient = await clientApi.updateClient({
        id: Number(customer.id),
        name: trimmedFullName,
        phone: trimmedPhone,
        note: ""
      });

      const updatedTire = await tireApi.updateTire({
        id: Number(activeRecord.id),
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
        clientId: String(updatedVehicle.clientId || customer.id),
        plate: finalPlate,
        note: finalVehicleNote,
        createdAt: updatedVehicle.createdDate || vehicle.createdAt
      };

      const updatedRecord: TireRecord = {
        ...activeRecord,
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
          ...activeRecord.snapshot,
          customerName: updatedClient.name || trimmedFullName,
          phone: updatedClient.phone || trimmedPhone,
          plate: finalPlate,
          tireCode: activeRecord.tireCode,
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
      setBackendTireRecord(updatedRecord);
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
    if (!backendTireRecord || !isNumericId(activeRecord.id)) {
      showToast(
        "Backend lastik kayıt bilgisi yüklenmeden teslim işlemi yapılamaz.",
        "error"
      );
      return;
    }

    try {
      setIsSaving(true);

      await tireApi.deleteTire(Number(activeRecord.id));
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div
        className="my-4 flex max-h-[85vh] w-full max-w-2xl animate-scale-in flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/55 px-6 py-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded-lg border border-blue-200/50 bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700">
              {activeRecordCode}
            </span>

            <span className="truncate text-xs font-bold text-slate-450">
              | Detaylı Lastik Emanet Kartı
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="cursor-pointer rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {isDetailLoading ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="text-xs font-bold text-slate-500">
                Lastik detay bilgisi backendden yükleniyor...
              </p>
            </div>
          ) : detailErrorMessage || !isBackendReady ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/40 p-8 text-center">
              <AlertTriangle className="h-8 w-8 text-rose-400" />

              <p className="text-sm font-black text-rose-700">
                Lastik detayı yüklenemedi
              </p>

              <p className="max-w-sm text-xs font-semibold leading-relaxed text-rose-500">
                {detailErrorMessage ||
                  "Backend detay bilgisi alınamadığı için local veri gösterilmedi."}
              </p>
            </div>
          ) : isEditMode ? (
            <div className="space-y-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-500" />
                  Emanet Kaydını Düzenle
                </h4>

                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  disabled={isSaving}
                  className="flex cursor-pointer items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Geri Dön (İptal)
                </button>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-4 text-slate-900">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Müşteri Ad Soyad *
                    </label>

                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-xl border border-slate-205 bg-white px-3.5 py-2 text-sm text-slate-800 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Müşteri Telefonu *
                    </label>

                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-xl border border-slate-205 bg-white px-3.5 py-2 text-sm text-slate-800 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Araç Plaka *
                    </label>

                    <input
                      type="text"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-xl border border-slate-205 bg-white px-3.5 py-2 font-mono text-sm font-medium uppercase tracking-wider text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 disabled:bg-slate-100"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Araç / Kayıt Notu
                    </label>

                    <textarea
                      value={vehicleNote}
                      onChange={(e) => setVehicleNote(e.target.value)}
                      disabled={isSaving}
                      rows={3}
                      placeholder="Örn: Sağ arka jant çizik, müşteri balans istemedi..."
                      className="w-full resize-none rounded-xl border border-slate-205 bg-white px-3.5 py-2 text-sm text-slate-800 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Mevsim Türü *
                    </label>

                    <div className="grid grid-cols-3 gap-1">
                      {seasonOptions.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setTireType(type)}
                          disabled={isSaving}
                          className={`cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                            tireType === type
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Lastik Markası *
                    </label>

                    {brandOptions.length > 0 ? (
                      <select
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        disabled={isSaving}
                        className="w-full rounded-xl border border-slate-205 bg-white px-3.5 py-2 text-sm text-slate-800 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 disabled:bg-slate-100"
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
                        className="w-full rounded-xl border border-slate-205 bg-white px-3.5 py-2 text-sm text-slate-800 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 disabled:bg-slate-100"
                      />
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Ebat / Boyut Bilgisi *
                    </label>

                    <input
                      type="text"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-xl border border-slate-205 bg-white px-3.5 py-2 text-sm text-slate-800 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
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
                      className="w-24 rounded-xl border border-slate-205 bg-white px-3.5 py-2 text-center text-sm font-bold text-slate-800 focus:outline-none disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Depo Konumu / Raf No
                    </label>

                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-xl border border-slate-205 bg-white px-3.5 py-2 font-mono text-sm font-bold uppercase text-slate-900 focus:outline-none disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-4">
                <label className="block font-mono text-xs font-black uppercase tracking-widest text-slate-450">
                  Resim Havuzu Dokümantasyonu
                </label>

                <p className="text-[10px] font-semibold leading-relaxed text-slate-400">
                  Backend Tire/Update içinde lastik imageIds olmadığı için yeni
                  yüklenen görseller araç görseli olarak Vehicle/Update üzerinden
                  saklanır.
                </p>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="flex h-20 cursor-pointer select-none flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-250 bg-white p-3 text-center hover:border-blue-500">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e.target.files)}
                      className="hidden"
                      disabled={isUploading || isSaving}
                    />

                    <Upload className="h-5 w-5 text-slate-400" />

                    <span className="text-[10px] font-bold text-slate-700">
                      Araç Fotoğrafı Ekle
                    </span>
                  </label>

                  <div className="flex min-h-[80px] items-center gap-2 rounded-xl border border-slate-200/55 bg-slate-100 p-1.5 md:col-span-2">
                    {photos.length === 0 ? (
                      <span className="w-full py-2 text-center text-xs font-semibold italic text-slate-400">
                        Görsel bulunmamaktadır.
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {photos.map((photo) => (
                          <div
                            key={
                              typeof photo.fileId === "number"
                                ? `file-${photo.fileId}`
                                : photo.id
                            }
                            className="group relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white"
                          >
                            <img
                              src={photo.dataUrl}
                              alt={photo.name}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />

                            <span className="absolute bottom-1 left-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
                              {photo.source === "vehicle" ? "Araç" : "Lastik"}
                            </span>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleRemovePhoto(photo);
                              }}
                              disabled={isSaving}
                              aria-label={`${photo.name} görselini kaldır`}
                              className="absolute right-1 top-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-rose-600 text-white shadow-md transition-all hover:bg-rose-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {isUploading && (
                  <div className="animate-pulse text-xs font-bold text-blue-600">
                    Fotoğraflar yükleniyor...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {activeRecord.status === "delivered" && (
                <div className="flex items-start gap-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-sans text-slate-800 shadow-sm">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <CheckCircle className="h-6 w-6 stroke-[2.5]" />
                  </div>

                  <div className="flex-1 text-left">
                    <h5 className="text-sm font-extrabold text-emerald-900">
                      Bu Lastik Emaneti Müşteriye Teslim Edilmiştir
                    </h5>

                    <p className="text-xs leading-relaxed text-emerald-700">
                      Bu emanet kaydı aktif depolama statüsünden düşürülmüş ve
                      arşive taşınmıştır.
                    </p>

                    <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 border-t border-emerald-100 pt-2 font-mono text-[11px] font-bold text-slate-500 sm:grid-cols-2">
                      <div>
                        Teslim Tarihi:{" "}
                        <span className="font-extrabold text-emerald-850">
                          {formatDate(
                            activeRecord.deliveredAt ||
                              activeRecord.updatedAt ||
                              ""
                          )}
                        </span>
                      </div>

                      {activeRecord.deliveryNote && (
                        <div className="col-span-1 mt-1.5 rounded-lg border border-emerald-100 bg-white/75 p-2 font-sans font-medium italic text-slate-700 sm:col-span-2">
                          Teslim Notu:{" "}
                          <span className="font-bold text-slate-900">
                            &quot;{activeRecord.deliveryNote}&quot;
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-200/60 bg-slate-50 p-4 text-center">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Araç Plakası
                  </div>

                  <div className="mt-1 inline-block rounded-lg border border-blue-100/50 bg-blue-50 px-2.5 py-1 font-mono text-sm font-extrabold uppercase tracking-wider text-blue-800">
                    {vehicle.plate || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Depo Rafı
                  </div>

                  <div className="mt-2 inline-block rounded-lg border border-amber-200 bg-amber-55/10 px-2.5 py-0.5 font-mono text-sm font-black uppercase text-amber-800">
                    {activeRecord.storageLocation || "Rafsız"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Emanet Adeti
                  </div>

                  <div className="mt-2 text-sm font-extrabold text-slate-900">
                    {activeRecord.quantity} Adet
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 text-slate-800 md:grid-cols-2">
                <div className="space-y-3.5">
                  <h5 className="font-mono text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Müşteri Hesap Bilgileri
                  </h5>

                  <div className="space-y-2.5 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 text-xs font-semibold text-slate-700 sm:text-sm">
                    <div className="flex justify-between border-b border-slate-100 py-1">
                      <span className="font-medium text-slate-400">
                        Ad Soyad:
                      </span>

                      <span className="font-bold text-slate-900">
                        {customer.fullName || "Belirtilmedi"}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 py-1">
                      <span className="font-medium text-slate-400">
                        Telefon No:
                      </span>

                      <span className="font-mono font-extrabold text-blue-600">
                        {customer.phone || "Belirtilmedi"}
                      </span>
                    </div>

                    <div className="flex justify-between py-0.5">
                      <span className="font-medium text-slate-400">
                        Kayıt Tarihi:
                      </span>

                      <span className="font-mono text-xs font-bold text-slate-500">
                        {formatDate(activeRecord.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <h5 className="font-mono text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Lastik Spesifikasyonları
                  </h5>

                  <div className="space-y-2.5 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 text-xs font-semibold text-slate-700 sm:text-sm">
                    <div className="flex justify-between border-b border-slate-100 py-1">
                      <span className="font-medium text-slate-400">
                        Mevsim Türü:
                      </span>

                      <span className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span
                          className={`h-2.5 w-2.5 animate-pulse rounded-full ${
                            activeRecord.tireType === "Yazlık"
                              ? "bg-amber-400"
                              : activeRecord.tireType === "Kışlık"
                                ? "bg-sky-400"
                                : "bg-emerald-400"
                          }`}
                        />
                        {activeRecord.tireType}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 py-1">
                      <span className="font-medium text-slate-400">
                        Lastik Markası:
                      </span>

                      <span className="font-bold text-slate-900">
                        {activeRecord.brand}
                      </span>
                    </div>

                    <div className="flex justify-between py-0.5">
                      <span className="font-medium text-slate-400">
                        Lastik Ebadı:
                      </span>

                      <span className="rounded border border-slate-205 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-900">
                        {activeRecord.size}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                <h5 className="font-mono text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Araç / Kayıt Notu
                </h5>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 text-xs font-semibold leading-relaxed text-slate-700">
                  {visibleVehicleNote || "Not girilmemiş."}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-mono text-[10px] font-black uppercase tracking-widest text-slate-450">
                    Hasar / Resim Albümü ({photos.length})
                  </h5>

                  {photos.length > 0 && (
                    <span className="text-[10px] font-medium text-slate-400">
                      Detay için üzerine tıklayın
                    </span>
                  )}
                </div>

                {photos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                    <Eye className="h-6 w-6 text-slate-300" />

                    <span className="text-xs font-bold text-slate-650">
                      Görsel Kaydı Yok
                    </span>

                    <span className="max-w-sm text-[10px] font-medium leading-relaxed text-slate-400">
                      Backend bu kayıt için herhangi bir görsel döndürmedi.
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
                        className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md"
                        onClick={() => setActivePhotoUrl(photo.dataUrl)}
                      >
                        <img
                          src={photo.dataUrl}
                          alt={photo.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />

                        <span className="absolute bottom-1 left-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
                          {photo.source === "vehicle" ? "Araç" : "Lastik"}
                        </span>

                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
                          <Eye className="h-5 w-5 text-white drop-shadow-sm" />
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
              {!isEditMode && activeRecord.status !== "delivered" && (
                <button
                  type="button"
                  onClick={() => onOpenLabelPrinter(activeRecord)}
                  disabled={isSaving || isDetailLoading || !isBackendReady}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
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
                    <span>
                      {isSaving ? "Kaydediliyor..." : "Kaydet ve Barkodla"}
                    </span>
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

                  {activeRecord.status !== "delivered" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsDeliverConfirmOpen(true)}
                        disabled={isSaving || isDetailLoading || !isBackendReady}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-xs font-black text-rose-700 shadow-sm transition-all duration-200 hover:border-rose-300 hover:bg-rose-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Teslim Edildi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditMode(true)}
                        disabled={isSaving || isDetailLoading || !isBackendReady}
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
          className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xs"
          onClick={() => setActivePhotoUrl(null)}
        >
          <div className="relative flex max-h-[90vh] max-w-4xl flex-col items-center">
            <button
              type="button"
              onClick={() => setActivePhotoUrl(null)}
              className="absolute -top-12 right-0 flex cursor-pointer items-center gap-1 rounded-full bg-white/10 p-1.5 font-sans text-xs font-bold text-white transition-all hover:bg-white/20"
            >
              <X className="h-4 w-4" />
              Kapat [ESC]
            </button>

            <img
              src={activePhotoUrl}
              alt="Büyük boy emanet görseli"
              referrerPolicy="no-referrer"
              className="max-h-[80vh] max-w-full rounded-2xl border border-white/10 bg-slate-900 object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}