import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Printer,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";

import { TirePhoto, TireRecord, TireType } from "../../types";
import {
  clientApi,
  vehicleApi,
  tireApi,
  constantApi,
  ClientListItemDto,
  VehicleListItemDto,
  ConstantListItemDto,
} from "../../services/tireApi";
import { fileApi, pickImagePreviewUrl } from "../../services/fileApi";
import { formatPlate, generateId, normalizeTurkish } from "../../utils/helpers";

interface TireRecordModalProps {
  onClose: () => void;
  onSave: (newRecord: TireRecord, autoPrint: boolean) => void;
  showToast: (
    msg: string,
    type: "success" | "error" | "info" | "warning",
  ) => void;
}

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  type: string;
}

type WizardStep = 0 | 1 | 2;

const WIZARD_STEPS = [
  {
    title: "Müşteri",
    description: "Müşteri seçimi",
    icon: UserPlus,
  },
  {
    title: "Araç",
    description: "Araç seçimi",
    icon: Car,
  },
  {
    title: "Lastik",
    description: "Lastik ve fotoğraflar",
    icon: AlertTriangle,
  },
] as const;

function getConstantLabel(item: ConstantListItemDto) {
  return item.name || item.value || "";
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function normalizePlate(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function isSupportedImageFile(file: File) {
  const fileType = (file.type || "").toLowerCase();
  const fileName = (file.name || "").toLowerCase();

  if (fileType.startsWith("image/")) return true;

  return /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(fileName);
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

function getConstantIdByName(
  constants: ConstantListItemDto[],
  type: "TIRE_TYPE" | "TIRE_BRAND",
  name: string,
) {
  const normalizedName = normalizeTurkish(name.trim());

  return constants.find((item) => {
    const itemName = normalizeTurkish(getConstantLabel(item));
    return item.type === type && itemName === normalizedName;
  })?.id;
}

function findExactClientMatch(
  clients: ClientListItemDto[],
  fullName: string,
  phone: string,
) {
  const normalizedName = normalizeTurkish(fullName);
  const normalizedPhone = normalizePhone(phone);

  return clients.find((client) => {
    const clientName = normalizeTurkish(client.name || "");
    const clientPhone = normalizePhone(client.phone || "");

    const nameMatches = Boolean(
      normalizedName && clientName === normalizedName,
    );
    const phoneMatches = Boolean(
      normalizedPhone && clientPhone === normalizedPhone,
    );

    return nameMatches || phoneMatches;
  });
}

function findExactVehicleMatch(vehicles: VehicleListItemDto[], plate: string) {
  const normalizedPlate = normalizePlate(plate);

  if (!normalizedPlate) return undefined;

  return vehicles.find(
    (vehicle) => normalizePlate(vehicle.licensePlate || "") === normalizedPlate,
  );
}

function uniqueNumberList(values: Array<number | undefined>) {
  return Array.from(
    new Set(
      values.filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value) && value > 0,
      ),
    ),
  );
}

function getVehicleUploadFileIds(vehicle?: VehicleListItemDto | null) {
  return uniqueNumberList(
    (vehicle?.uploadFiles || []).map((file) => Number(file.fileId || file.id)),
  );
}

export default function TireRecordModal({
  onClose,
  onSave,
  showToast,
}: TireRecordModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(0);

  const [clientSearchResults, setClientSearchResults] = useState<
    ClientListItemDto[]
  >([]);
  const [vehicleSearchResults, setVehicleSearchResults] = useState<
    VehicleListItemDto[]
  >([]);
  const [constants, setConstants] = useState<ConstantListItemDto[]>([]);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleNote, setVehicleNote] = useState("");

  const [tireType, setTireType] = useState<TireType>("Yazlık");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(4);
  const [location, setLocation] = useState("");

  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const pendingPhotosRef = useRef<PendingPhoto[]>([]);

  const [vehiclePendingPhotos, setVehiclePendingPhotos] = useState<
    PendingPhoto[]
  >([]);
  const vehiclePendingPhotosRef = useRef<PendingPhoto[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [isSearchingVehicle, setIsSearchingVehicle] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });

  const isBusy = isSaving || isUploading || isAdvancing;

  const selectedClient = useMemo(
    () =>
      clientSearchResults.find(
        (client) => String(client.id) === selectedClientId,
      ),
    [clientSearchResults, selectedClientId],
  );

  const exactClientMatch = useMemo(
    () => findExactClientMatch(clientSearchResults, fullName, phone),
    [clientSearchResults, fullName, phone],
  );

  const effectiveClient = selectedClient || exactClientMatch;

  const effectiveClientId =
    selectedClientId || (effectiveClient ? String(effectiveClient.id) : "");

  const filteredVehicleSearchResults = useMemo(() => {
    if (!effectiveClientId) return [];

    return vehicleSearchResults.filter(
      (vehicle) => String(vehicle.clientId || "") === effectiveClientId,
    );
  }, [effectiveClientId, vehicleSearchResults]);

  const selectedVehicle = useMemo(
    () =>
      vehicleSearchResults.find(
        (vehicle) => String(vehicle.id) === selectedVehicleId,
      ),
    [vehicleSearchResults, selectedVehicleId],
  );

  const exactVehicleMatch = useMemo(
    () => findExactVehicleMatch(filteredVehicleSearchResults, plate),
    [filteredVehicleSearchResults, plate],
  );

  const effectiveVehicle = selectedVehicle || exactVehicleMatch;

  const effectiveVehicleId =
    selectedVehicleId || (effectiveVehicle ? String(effectiveVehicle.id) : "");

  const brandOptions = useMemo(() => {
    const apiBrands = constants
      .filter((item) => item.type === "TIRE_TYPE")
      .map(getConstantLabel)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "tr"));

    return uniqueTextList(apiBrands);
  }, [constants]);

  const seasonOptions = useMemo<TireType[]>(() => {
    const apiSeasons = constants
      .filter((item) => item.type === "TIRE_BRAND")
      .map((item) => normalizeTireType(getConstantLabel(item)));

    return uniqueTextList(["Yazlık", "Kışlık", "4 Mevsim", ...apiSeasons]).map(
      normalizeTireType,
    );
  }, [constants]);

  const hasUnsavedData = useMemo(
    () =>
      Boolean(
        fullName.trim() ||
          phone.trim() ||
          plate.trim() ||
          vehicleNote.trim() ||
          brand.trim() ||
          size.trim() ||
          location.trim() ||
          pendingPhotos.length > 0 ||
          vehiclePendingPhotos.length > 0 ||
          quantity !== 4 ||
          tireType !== "Yazlık",
      ),
    [
      brand,
      fullName,
      location,
      pendingPhotos.length,
      phone,
      plate,
      quantity,
      size,
      tireType,
      vehicleNote,
      vehiclePendingPhotos.length,
    ],
  );

  useEffect(() => {
    pendingPhotosRef.current = pendingPhotos;
  }, [pendingPhotos]);

  useEffect(() => {
    vehiclePendingPhotosRef.current = vehiclePendingPhotos;
  }, [vehiclePendingPhotos]);

  useEffect(() => {
    return () => {
      pendingPhotosRef.current.forEach((photo) => {
        URL.revokeObjectURL(photo.previewUrl);
      });

      vehiclePendingPhotosRef.current.forEach((photo) => {
        URL.revokeObjectURL(photo.previewUrl);
      });
    };
  }, []);

const showToastRef = useRef(showToast);

useEffect(() => {
  showToastRef.current = showToast;
}, [showToast]);

useEffect(() => {
  let isMounted = true;

  async function loadConstants() {
    try {
      setIsLoading(true);

      const constantResponse = await constantApi.getConstants({
        page: 0,
        pageSize: 1000,
      });

      if (!isMounted) return;

      setConstants(constantResponse.items || []);
    } catch (error) {
      console.error(error);

      if (!isMounted) return;

      showToastRef.current(
        error instanceof Error
          ? error.message
          : "Marka ve mevsim bilgileri API üzerinden yüklenemedi.",
        "error",
      );
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  }

  loadConstants();

  return () => {
    isMounted = false;
  };
}, []);

  useEffect(() => {
    const searchKey = `${fullName} ${phone}`.trim();

    if (currentStep !== 0 || selectedClientId || searchKey.length < 2) {
      if (!selectedClientId && searchKey.length < 2) {
        setClientSearchResults([]);
      }

      return;
    }

    let isMounted = true;

    async function searchClients() {
      try {
        setIsSearchingClient(true);

        const response = await clientApi.getClients({
          page: 0,
          pageSize: 10,
          searchKey,
        });

        if (!isMounted) return;

        setClientSearchResults(response.items || []);
      } catch (error) {
        console.error(error);

        if (!isMounted) return;

        setClientSearchResults([]);
      } finally {
        if (isMounted) {
          setIsSearchingClient(false);
        }
      }
    }

    const timeoutId = window.setTimeout(searchClients, 350);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [currentStep, fullName, phone, selectedClientId]);

  useEffect(() => {
    const searchKey = plate.trim();

    if (currentStep !== 1 || selectedVehicleId || searchKey.length < 2) {
      if (!selectedVehicleId && searchKey.length < 2) {
        setVehicleSearchResults([]);
      }

      return;
    }

    let isMounted = true;

    async function searchVehicles() {
      try {
        setIsSearchingVehicle(true);

        const response = await vehicleApi.getVehicles({
          page: 0,
          pageSize: 10,
          searchKey,
        });

        if (!isMounted) return;

        setVehicleSearchResults(response.items || []);
      } catch (error) {
        console.error(error);

        if (!isMounted) return;

        setVehicleSearchResults([]);
      } finally {
        if (isMounted) {
          setIsSearchingVehicle(false);
        }
      }
    }

    const timeoutId = window.setTimeout(searchVehicles, 350);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [currentStep, plate, selectedVehicleId]);

  const handleSelectClient = (client: ClientListItemDto) => {
    setSelectedClientId(String(client.id));
    setFullName(client.name || "");
    setPhone(client.phone || "");
    setClientSearchResults([client]);

    setSelectedVehicleId("");
    setPlate("");
    setVehicleNote("");
    setVehicleSearchResults([]);
    setVehiclePendingPhotos((currentPhotos) => {
      currentPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
  };

  const clearSelectedClient = () => {
    setSelectedClientId("");
    setSelectedVehicleId("");
    setPlate("");
    setVehicleNote("");
    setVehicleSearchResults([]);
    setVehiclePendingPhotos((currentPhotos) => {
      currentPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
  };

  const handleSelectVehicle = (vehicle: VehicleListItemDto) => {
    setSelectedVehicleId(String(vehicle.id));
    setPlate(vehicle.licensePlate || "");
    setVehicleNote(vehicle.note || "");
    setVehicleSearchResults([vehicle]);
  };

  const clearSelectedVehicle = () => {
    setSelectedVehicleId("");
  };

  const createPendingPhotosFromFiles = (files: FileList | null) => {
    const nextPhotos: PendingPhoto[] = [];
    let rejectedCount = 0;

    if (!files || files.length === 0) {
      return { nextPhotos, rejectedCount };
    }

    Array.from(files).forEach((file) => {
      if (!isSupportedImageFile(file)) {
        rejectedCount += 1;
        return;
      }

      nextPhotos.push({
        id: generateId(),
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name || `foto-${Date.now()}`,
        type: file.type || "image/*",
      });
    });

    return { nextPhotos, rejectedCount };
  };

  const handleAddPhotos = (files: FileList | null) => {
    const { nextPhotos, rejectedCount } = createPendingPhotosFromFiles(files);

    if (nextPhotos.length > 0) {
      setPendingPhotos((currentPhotos) => [...currentPhotos, ...nextPhotos]);
    }

    if (rejectedCount > 0) {
      showToast("Lütfen sadece görsel dosyası seçin.", "warning");
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setPendingPhotos((currentPhotos) => {
      const photoToRemove = currentPhotos.find((photo) => photo.id === photoId);

      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.previewUrl);
      }

      return currentPhotos.filter((photo) => photo.id !== photoId);
    });
  };

  const handleAddVehiclePhotos = (files: FileList | null) => {
    const { nextPhotos, rejectedCount } = createPendingPhotosFromFiles(files);

    if (nextPhotos.length > 0) {
      setVehiclePendingPhotos((currentPhotos) => [
        ...currentPhotos,
        ...nextPhotos,
      ]);

      showToast(
        `${nextPhotos.length} araç görseli hazırlandı. Kayıt tamamlanana kadar sunucuya gönderilmeyecek.`,
        "info",
      );
    }

    if (rejectedCount > 0) {
      showToast("Lütfen sadece görsel dosyası seçin.", "warning");
    }
  };

  const handleRemoveVehiclePhoto = (photoId: string) => {
    setVehiclePendingPhotos((currentPhotos) => {
      const photoToRemove = currentPhotos.find((photo) => photo.id === photoId);

      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.previewUrl);
      }

      return currentPhotos.filter((photo) => photo.id !== photoId);
    });
  };

  const handleRequestClose = () => {
    if (isBusy) return;

    if (
      hasUnsavedData &&
      !window.confirm(
        "Girdiğiniz bilgiler kaydedilmedi. Lastik ekleme işlemini iptal etmek istediğinize emin misiniz?",
      )
    ) {
      return;
    }

    onClose();
  };

  const validateClientStep = async () => {
    const trimmedFullName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (selectedClientId) return true;

    if (!trimmedFullName || !trimmedPhone) {
      showToast("Müşteri adı ve telefon bilgisi zorunludur.", "warning");
      return false;
    }

    try {
      setIsAdvancing(true);

      const response = await clientApi.getClients({
        page: 0,
        pageSize: 20,
        searchKey: `${trimmedFullName} ${trimmedPhone}`.trim(),
      });

      const results = response.items || [];
      const exactMatch = findExactClientMatch(
        results,
        trimmedFullName,
        trimmedPhone,
      );

      setClientSearchResults(results);

      if (exactMatch) {
        handleSelectClient(exactMatch);
        showToast("Mevcut müşteri kaydı eşleştirildi.", "info");
      }

      return true;
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Müşteri bilgisi kontrol edilirken hata oluştu.",
        "error",
      );

      return false;
    } finally {
      setIsAdvancing(false);
    }
  };

  const validateVehicleStep = async () => {
    const formattedPlate = formatPlate(plate);

    if (selectedVehicleId) return true;

    if (!formattedPlate) {
      showToast("Araç plakası zorunludur.", "warning");
      return false;
    }

    try {
      setIsAdvancing(true);

      const response = await vehicleApi.getVehicles({
        page: 0,
        pageSize: 20,
        searchKey: formattedPlate,
      });

      const results = response.items || [];
      const samePlateVehicle = findExactVehicleMatch(results, formattedPlate);

      setVehicleSearchResults(results);

      if (samePlateVehicle) {
        const sameVehicleClientId = String(samePlateVehicle.clientId || "");

        if (effectiveClientId && sameVehicleClientId === effectiveClientId) {
          handleSelectVehicle(samePlateVehicle);
          showToast("Mevcut araç kaydı eşleştirildi.", "info");
          return true;
        }

        showToast(
          "Bu plaka başka bir müşteriye kayıtlı görünüyor. Önce doğru müşteriyi seçmelisiniz.",
          "warning",
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Araç bilgisi kontrol edilirken hata oluştu.",
        "error",
      );

      return false;
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 0) {
      const isValid = await validateClientStep();

      if (!isValid) return;

      setCurrentStep(1);
      return;
    }

    if (currentStep === 1) {
      const isValid = await validateVehicleStep();

      if (!isValid) return;

      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (isBusy || currentStep === 0) return;

    setCurrentStep((currentStep - 1) as WizardStep);
  };

  const uploadPhotos = async (
    photos: PendingPhoto[],
    source: "vehicle" | "tire",
    offset = 0,
    total = photos.length,
  ): Promise<TirePhoto[]> => {
    if (photos.length === 0) return [];

    const uploadedPhotos: TirePhoto[] = [];

    for (let index = 0; index < photos.length; index += 1) {
      const pendingPhoto = photos[index];
      const uploadedFile = await fileApi.uploadFile(pendingPhoto.file);
      const uploadedFileId = Number(uploadedFile.id);

      if (!Number.isFinite(uploadedFileId) || uploadedFileId <= 0) {
        throw new Error(
          `"${pendingPhoto.name}" fotoğrafı yüklendi ancak geçerli dosya kimliği alınamadı.`,
        );
      }

      const previewUrl = pickImagePreviewUrl(uploadedFile);

      uploadedPhotos.push({
        id: String(uploadedFileId),
        fileId: uploadedFileId,
        name:
          uploadedFile.orginalName ||
          uploadedFile.originalName ||
          pendingPhoto.name,
        type: pendingPhoto.type || "image/*",
        dataUrl: previewUrl || pendingPhoto.previewUrl,
        fileUrl: uploadedFile.fileUrl,
        source,
      });

      setUploadProgress({
        current: offset + index + 1,
        total,
      });
    }

    return uploadedPhotos;
  };

  const uploadPendingPhotos = async (
    offset = 0,
    total = pendingPhotos.length,
  ): Promise<TirePhoto[]> => {
    return uploadPhotos(pendingPhotos, "tire", offset, total);
  };

  const uploadVehiclePendingPhotos = async (
    offset = 0,
    total = vehiclePendingPhotos.length,
  ): Promise<TirePhoto[]> => {
    return uploadPhotos(vehiclePendingPhotos, "vehicle", offset, total);
  };

  const handleSave = async (autoPrint: boolean) => {
    const trimmedFullName = fullName.trim();
    const trimmedPhone = phone.trim();
    const formattedPlate = formatPlate(plate);
    const trimmedVehicleNote = vehicleNote.trim();
    const trimmedBrand = brand.trim();
    const trimmedSize = size.trim();
    const trimmedLocation = location.trim();

    if (!trimmedBrand || !trimmedSize) {
      showToast("Lastik markası ve ebat bilgisi zorunludur.", "warning");
      return;
    }

    if (!effectiveClientId && (!trimmedFullName || !trimmedPhone)) {
      showToast("Müşteri adı ve telefon bilgisi zorunludur.", "warning");
      setCurrentStep(0);
      return;
    }

    if (!effectiveVehicleId && !formattedPlate) {
      showToast("Araç plakası zorunludur.", "warning");
      setCurrentStep(1);
      return;
    }

    const modelConstantId = getConstantIdByName(
      constants,
      "TIRE_TYPE",
      trimmedBrand,
    );

    const brandConstantId = getConstantIdByName(
      constants,
      "TIRE_BRAND",
      tireType,
    );

    if (modelConstantId === undefined) {
      showToast(
        `"${trimmedBrand}" markası backend sabitlerinde bulunamadı. Lütfen listeden marka seçin.`,
        "warning",
      );
      return;
    }

    if (brandConstantId === undefined) {
      showToast(
        `"${tireType}" mevsim türü backend sabitlerinde bulunamadı.`,
        "warning",
      );
      return;
    }

    try {
      setIsSaving(true);

      const totalUploadCount =
        vehiclePendingPhotos.length + pendingPhotos.length;

      if (totalUploadCount > 0) {
        setIsUploading(true);
        setUploadProgress({ current: 0, total: totalUploadCount });
      }

      const uploadedVehiclePhotos = await uploadVehiclePendingPhotos(
        0,
        totalUploadCount,
      );

      const existingVehicleImageIds = getVehicleUploadFileIds(effectiveVehicle);

      const vehicleImageIds = uniqueNumberList([
        ...existingVehicleImageIds,
        ...uploadedVehiclePhotos.map((photo) => photo.fileId),
      ]);

      const uploadedPhotos = await uploadPendingPhotos(
        vehiclePendingPhotos.length,
        totalUploadCount,
      );

      const tireImageIds = uniqueNumberList(
        uploadedPhotos.map((photo) => photo.fileId),
      );

      const createdTire = await tireApi.addTire({
        client: effectiveClientId
          ? {
              id: Number(effectiveClientId),
              name: null,
              phone: null,
            }
          : {
              id: null,
              name: trimmedFullName,
              phone: trimmedPhone,
            },

        vehicle: effectiveVehicleId
          ? {
              id: Number(effectiveVehicleId),
              licensePlate: null,
              note: null,
              imageIds: vehicleImageIds,
            }
          : {
              id: null,
              licensePlate: formattedPlate,
              note: trimmedVehicleNote,
              imageIds: vehicleImageIds,
            },

        modelConstantId,
        brandConstantId,
        sizes: trimmedSize,
        count: Number(quantity),
        storageLocation: trimmedLocation,
        imageIds: tireImageIds,
      });

      const finalVehicleId = String(
        createdTire.vehicleId || effectiveVehicleId || "",
      );

      const finalCustomerName =
        createdTire.clientName ||
        effectiveClient?.name ||
        effectiveVehicle?.clientName ||
        trimmedFullName ||
        "Bilinmeyen Cari";

      const finalCustomerPhone = effectiveClient?.phone || trimmedPhone || "";

      const finalPlate =
        createdTire.vehicleLicensePlate ||
        effectiveVehicle?.licensePlate ||
        formattedPlate ||
        "-";

      const finalTireType = normalizeTireType(
        createdTire.brandConstantName || tireType,
      );

      const finalBrand = createdTire.modelConstantName || trimmedBrand;
      const finalSize = createdTire.sizes || trimmedSize;
      const finalQuantity = createdTire.count || Number(quantity);
      const finalLocation = createdTire.storageLocation || trimmedLocation;

      const newRecord: TireRecord = {
        id: String(createdTire.id),
        clientId: effectiveClientId,
        vehicleId: finalVehicleId,
        tireCode: createdTire.code || `LT-${createdTire.id}`,
        tireType: finalTireType,
        brand: finalBrand,
        size: finalSize,
        quantity: finalQuantity,
        storageLocation: finalLocation,
        vehicleNote: effectiveVehicle?.note || trimmedVehicleNote,
        photos: [...uploadedVehiclePhotos, ...uploadedPhotos],
        createdAt: createdTire.createdDate || new Date().toISOString(),
        updatedAt: createdTire.createdDate || new Date().toISOString(),
        status: "active",
        snapshot: {
          customerName: finalCustomerName,
          phone: finalCustomerPhone,
          plate: finalPlate,
          tireCode: createdTire.code || `LT-${createdTire.id}`,
          tireType: finalTireType,
          brand: finalBrand,
          size: finalSize,
          quantity: finalQuantity,
          storageLocation: finalLocation,
          vehicleNote: effectiveVehicle?.note || trimmedVehicleNote,
        },
      };

      showToast("Lastik emanet kaydı API'ye başarıyla kaydedildi.", "success");
      onSave(newRecord, autoPrint);
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Lastik kaydı oluşturulurken beklenmeyen hata oluştu.",
        "error",
      );
    } finally {
      setIsSaving(false);
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex h-[100dvh] min-h-[100dvh] items-stretch justify-center overflow-hidden bg-slate-950/65 backdrop-blur-sm md:items-center md:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleRequestClose();
        }
      }}
    >
      <div
        className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl md:h-[min(90dvh,820px)] md:max-h-[min(90dvh,820px)] md:max-w-5xl md:rounded-3xl md:border md:border-slate-200"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                Yeni emanet kaydı
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-950 sm:text-xl">
                Lastik Ekle
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Bilgileri üç kısa adımda tamamlayın.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isBusy}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Pencereyi kapat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {WIZARD_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === index;
              const isCompleted = currentStep > index;

              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => {
                    if (index < currentStep && !isBusy) {
                      setCurrentStep(index as WizardStep);
                    }
                  }}
                  disabled={isBusy || index > currentStep}
                  className={`group flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-3 text-left transition sm:px-4 ${
                    isActive
                      ? "border-blue-200 bg-blue-50"
                      : isCompleted
                        ? "border-emerald-100 bg-emerald-50"
                        : "border-slate-200 bg-slate-50"
                  } disabled:cursor-default`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : isCompleted
                          ? "bg-emerald-500 text-white"
                          : "bg-white text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </span>

                  <span className="min-w-0">
                    <span
                      className={`block truncate text-xs font-black ${
                        isActive
                          ? "text-blue-700"
                          : isCompleted
                            ? "text-emerald-700"
                            : "text-slate-500"
                      }`}
                    >
                      {index + 1}. {step.title}
                    </span>
                    <span className="hidden truncate text-[10px] font-semibold text-slate-400 sm:block">
                      {step.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden bg-slate-50/80">
          {isLoading ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-black text-blue-700">
                <Loader2 className="h-5 w-5 animate-spin" />
                API verileri yükleniyor...
              </div>
            </div>
          ) : (
            <div className="relative h-full overflow-hidden">
              <section
                aria-hidden={currentStep !== 0}
                className={`absolute inset-0 h-full overflow-y-auto p-4 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-6 ${
                  currentStep === 0
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
                style={{
                  display: currentStep === 0 ? "block" : "none",
                  transform: "translateX(0)",
                }}
              >
                <div className="mx-auto max-w-2xl">
                  <div className="mb-5">
                    <h4 className="text-xl font-black text-slate-950">
                      Müşteri seçin
                    </h4>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Kayıtlı müşteriyi seçin veya yeni müşteri bilgilerini
                      girin.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    {selectedClientId ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">
                              Seçili müşteri
                            </p>
                            <p className="mt-1 text-base font-black text-slate-950">
                              {fullName}
                            </p>
                            <p className="mt-1 font-mono text-sm font-bold text-slate-500">
                              {phone}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={clearSelectedClient}
                            disabled={isBusy}
                            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Değiştir
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-black text-slate-700">
                            Ad Soyad *
                          </label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={(event) => {
                              setFullName(event.target.value);
                              clearSelectedClient();
                            }}
                            disabled={isBusy}
                            placeholder="Müşteri adı soyadı"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-black text-slate-700">
                            Telefon *
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(event) => {
                              setPhone(event.target.value);
                              clearSelectedClient();
                            }}
                            disabled={isBusy}
                            placeholder="0532 123 45 67"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    )}

                    {isSearchingClient && !selectedClientId && (
                      <div className="mt-4 flex items-center gap-2 text-xs font-black text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Müşteri kayıtları aranıyor...
                      </div>
                    )}

                    {!selectedClientId && clientSearchResults.length > 0 && (
                      <div className="mt-5">
                        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Eşleşen müşteriler
                        </p>

                        <div className="space-y-2">
                          {clientSearchResults.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => handleSelectClient(client)}
                              disabled={isBusy}
                              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-50"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-black text-slate-800">
                                  {client.name}
                                </span>
                                <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">
                                  Kayıtlı müşteri
                                </span>
                              </span>

                              <span className="shrink-0 font-mono text-xs font-black text-slate-500">
                                {client.phone}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!selectedClientId && fullName.trim() && phone.trim() && (
                      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700">
                        Listeden bir müşteri seçmezseniz bu bilgilerle yeni
                        müşteri oluşturulacak.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section
                aria-hidden={currentStep !== 1}
                className={`absolute inset-0 h-full overflow-y-auto p-4 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-6 ${
                  currentStep === 1
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
                style={{
                  display: currentStep === 1 ? "block" : "none",
                  transform: "translateX(0)",
                }}
              >
                <div className="mx-auto max-w-2xl">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-black text-slate-950">
                        Araç seçin
                      </h4>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {effectiveClient?.name || fullName || "Seçilen müşteri"}
                        için kayıtlı aracı seçin veya yeni plaka girin.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(0)}
                      disabled={isBusy}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      Müşteriyi değiştir
                    </button>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    {selectedVehicleId ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">
                              Seçili araç
                            </p>
                            <p className="mt-1 font-mono text-lg font-black tracking-wider text-slate-950">
                              {formatPlate(plate)}
                            </p>
                            {vehicleNote && (
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {vehicleNote}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={clearSelectedVehicle}
                            disabled={isBusy}
                            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Değiştir
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-black text-slate-700">
                            Plaka *
                          </label>
                          <input
                            type="text"
                            value={plate}
                            onChange={(event) => {
                              setPlate(event.target.value);
                              clearSelectedVehicle();
                            }}
                            disabled={isBusy}
                            placeholder="19 ABC 123"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-mono text-sm font-black uppercase tracking-wider text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-black text-slate-700">
                            Araç / Kayıt Notu
                          </label>
                          <input
                            type="text"
                            value={vehicleNote}
                            onChange={(event) =>
                              setVehicleNote(event.target.value)
                            }
                            disabled={isBusy}
                            placeholder="Jant çizik, balans istemedi vb."
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    )}

                    {isSearchingVehicle && !selectedVehicleId && (
                      <div className="mt-4 flex items-center gap-2 text-xs font-black text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Araç kayıtları aranıyor...
                      </div>
                    )}

                    {!selectedVehicleId &&
                      filteredVehicleSearchResults.length > 0 && (
                        <div className="mt-5">
                          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Bu müşterinin araçları
                          </p>

                          <div className="space-y-2">
                            {filteredVehicleSearchResults.map((vehicle) => (
                              <button
                                key={vehicle.id}
                                type="button"
                                onClick={() => handleSelectVehicle(vehicle)}
                                disabled={isBusy}
                                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-50"
                              >
                                <span>
                                  <span className="block font-mono text-sm font-black tracking-wider text-slate-900">
                                    {vehicle.licensePlate}
                                  </span>
                                  <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">
                                    {vehicle.note || "Kayıtlı araç"}
                                  </span>
                                </span>

                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    {!selectedVehicleId && plate.trim() && (
                      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700">
                        Kayıtlı araç seçilmezse bu plaka ile yeni araç
                        oluşturulacak.
                      </div>
                    )}

                    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-end justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4 text-blue-600" />
                            <h5 className="text-sm font-black text-slate-900">
                              Araç Görselleri
                            </h5>
                          </div>
                          <p className="mt-1 text-[11px] font-semibold text-slate-400">
                            Kaydet butonuna basılana kadar API'ye gönderilmez.
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                          {vehiclePendingPhotos.length} görsel
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white text-center transition hover:border-blue-500 hover:bg-blue-50">
                          <input
                            type="file"
                            accept="image/*,.heic,.heif"
                            capture="environment"
                            onChange={(event) => {
                              handleAddVehiclePhotos(event.target.files);
                              event.currentTarget.value = "";
                            }}
                            disabled={isBusy}
                            className="hidden"
                          />

                          <Camera className="h-5 w-5 text-blue-600" />
                          <span className="mt-2 text-xs font-black text-slate-700">
                            Kamera
                          </span>
                          <span className="mt-0.5 text-[9px] font-semibold text-slate-400">
                            Tek çekim
                          </span>
                        </label>

                        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white text-center transition hover:border-blue-500 hover:bg-blue-50">
                          <input
                            type="file"
                            multiple
                            accept="image/*,.heic,.heif"
                            onChange={(event) => {
                              handleAddVehiclePhotos(event.target.files);
                              event.currentTarget.value = "";
                            }}
                            disabled={isBusy}
                            className="hidden"
                          />

                          <Upload className="h-5 w-5 text-blue-600" />
                          <span className="mt-2 text-xs font-black text-slate-700">
                            Galeri
                          </span>
                          <span className="mt-0.5 text-[9px] font-semibold text-slate-400">
                            Çoklu seçim
                          </span>
                        </label>

                        {vehiclePendingPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                          >
                            <img
                              src={photo.previewUrl}
                              alt={photo.name}
                              className="h-full w-full object-cover"
                            />

                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6">
                              <p className="truncate text-[9px] font-bold text-white">
                                {photo.name}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveVehiclePhoto(photo.id)
                              }
                              disabled={isBusy}
                              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-black/65 text-white opacity-100 transition hover:bg-rose-600 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-40"
                              aria-label={`${photo.name} araç görselini sil`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section
                aria-hidden={currentStep !== 2}
                className={`absolute inset-0 h-full overflow-y-auto p-4 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-6 ${
                  currentStep === 2
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
                style={{
                  display: currentStep === 2 ? "block" : "none",
                  transform: "translateX(0)",
                }}
              >
                <div className="mx-auto max-w-3xl">
                  <div className="mb-3">
                    <h4 className="text-lg font-black text-slate-950">
                      Lastik bilgileri
                    </h4>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-black text-slate-700">
                          Mevsim Türü *
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {seasonOptions.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setTireType(type)}
                              disabled={isBusy}
                              className={`h-11 rounded-xl border text-[11px] font-black transition disabled:opacity-50 ${
                                tireType === type
                                  ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-black text-slate-700">
                          Marka / Üretici *
                        </label>
                        <select
                          value={brand}
                          onChange={(event) => setBrand(event.target.value)}
                          disabled={isBusy}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                        >
                          <option value="">Marka seçin</option>
                          {brandOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-black text-slate-700">
                          Ebat *
                        </label>
                        <input
                          type="text"
                          value={size}
                          onChange={(event) => setSize(event.target.value)}
                          disabled={isBusy}
                          placeholder="205/55 R16"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-2 block text-xs font-black text-slate-700">
                            Adet *
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(event) =>
                              setQuantity(
                                Math.max(1, Number(event.target.value) || 1),
                              )
                            }
                            disabled={isBusy}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-black text-slate-700">
                            Raf / Konum
                          </label>
                          <input
                            type="text"
                            value={location}
                            onChange={(event) =>
                              setLocation(event.target.value)
                            }
                            disabled={isBusy}
                            placeholder="A5-3"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-mono text-sm font-black uppercase text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <div className="mb-3 flex items-end justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4 text-blue-600" />
                            <h5 className="text-sm font-black text-slate-900">
                              Lastik Fotoğrafları
                            </h5>
                          </div>
                          <p className="mt-1 text-[11px] font-semibold text-slate-400">
                            Kaydet butonuna basılana kadar API'ye gönderilmez.
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                          {pendingPhotos.length} görsel
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-blue-500 hover:bg-blue-50">
                          <input
                            type="file"
                            accept="image/*,.heic,.heif"
                            capture="environment"
                            onChange={(event) => {
                              handleAddPhotos(event.target.files);
                              event.currentTarget.value = "";
                            }}
                            disabled={isBusy}
                            className="hidden"
                          />

                          <Camera className="h-5 w-5 text-blue-600" />
                          <span className="mt-2 text-xs font-black text-slate-700">
                            Kamera
                          </span>
                          <span className="mt-0.5 text-[9px] font-semibold text-slate-400">
                            Tek çekim
                          </span>
                        </label>

                        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-blue-500 hover:bg-blue-50">
                          <input
                            type="file"
                            multiple
                            accept="image/*,.heic,.heif"
                            onChange={(event) => {
                              handleAddPhotos(event.target.files);
                              event.currentTarget.value = "";
                            }}
                            disabled={isBusy}
                            className="hidden"
                          />

                          <Upload className="h-5 w-5 text-blue-600" />
                          <span className="mt-2 text-xs font-black text-slate-700">
                            Galeri
                          </span>
                          <span className="mt-0.5 text-[9px] font-semibold text-slate-400">
                            Çoklu seçim
                          </span>
                        </label>

                        {pendingPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                          >
                            <img
                              src={photo.previewUrl}
                              alt={photo.name}
                              className="h-full w-full object-cover"
                            />

                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6">
                              <p className="truncate text-[9px] font-bold text-white">
                                {photo.name}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(photo.id)}
                              disabled={isBusy}
                              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-black/65 text-white opacity-100 transition hover:bg-rose-600 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-40"
                              aria-label={`${photo.name} fotoğrafını sil`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div
            className={`overflow-hidden transition-all duration-300 ${
              isUploading ? "mb-3 max-h-24 opacity-100" : "mb-0 max-h-0 opacity-0"
            }`}
          >
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-xs font-black text-blue-700">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fotoğraflar yükleniyor
                </span>
                <span>
                  {uploadProgress.current}/{uploadProgress.total}
                </span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${
                      uploadProgress.total > 0
                        ? (uploadProgress.current / uploadProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  disabled={isBusy}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Geri
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestClose}
                  disabled={isBusy}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Vazgeç
                </button>
              )}
            </div>

            {currentStep < 2 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={isBusy || isLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-xs font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAdvancing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Kontrol ediliyor
                  </>
                ) : (
                  <>
                    Devam Et
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={isBusy || isLoading}
                  className="h-11 rounded-2xl border border-slate-200 bg-slate-100 px-4 text-xs font-black text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving && !isUploading ? "Kaydediliyor..." : "Kaydet"}
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isBusy || isLoading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-xs font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      İşleniyor
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4" />
                      Kaydet ve Barkodla
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}