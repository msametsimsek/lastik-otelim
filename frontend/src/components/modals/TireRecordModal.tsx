import { useEffect, useMemo, useState } from "react";
import {
  X,
  Upload,
  Trash2,
  Printer,
  AlertTriangle,
  UserPlus,
  Car
} from "lucide-react";

import { TirePhoto, TireRecord, TireType } from "../../types";
import {
  clientApi,
  vehicleApi,
  tireApi,
  constantApi,
  ClientListItemDto,
  VehicleListItemDto,
  ConstantListItemDto
} from "../../services/tireApi";
import { fileApi, pickImagePreviewUrl } from "../../services/fileApi";
import { formatPlate, generateId, normalizeTurkish } from "../../utils/helpers";

interface TireRecordModalProps {
  onClose: () => void;
  onSave: (newRecord: TireRecord, autoPrint: boolean) => void;
  showToast: (
    msg: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
}

function getConstantLabel(item: ConstantListItemDto) {
  return item.name || item.value || "";
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function normalizePlate(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
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
  name: string
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
  phone: string
) {
  const normalizedName = normalizeTurkish(fullName);
  const normalizedPhone = normalizePhone(phone);

  return clients.find((client) => {
    const clientName = normalizeTurkish(client.name || "");
    const clientPhone = normalizePhone(client.phone || "");

    const nameMatches = normalizedName && clientName === normalizedName;
    const phoneMatches = normalizedPhone && clientPhone === normalizedPhone;

    return nameMatches || phoneMatches;
  });
}

function findExactVehicleMatch(vehicles: VehicleListItemDto[], plate: string) {
  const normalizedPlate = normalizePlate(plate);

  if (!normalizedPlate) return undefined;

  return vehicles.find(
    (vehicle) => normalizePlate(vehicle.licensePlate || "") === normalizedPlate
  );
}

export default function TireRecordModal({
  onClose,
  onSave,
  showToast
}: TireRecordModalProps) {
  const [clientSearchResults, setClientSearchResults] = useState<ClientListItemDto[]>(
    []
  );
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

  const [photos, setPhotos] = useState<TirePhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [isSearchingVehicle, setIsSearchingVehicle] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedClient = useMemo(
    () =>
      clientSearchResults.find(
        (client) => String(client.id) === selectedClientId
      ),
    [clientSearchResults, selectedClientId]
  );

  const selectedVehicle = useMemo(
    () =>
      vehicleSearchResults.find(
        (vehicle) => String(vehicle.id) === selectedVehicleId
      ),
    [vehicleSearchResults, selectedVehicleId]
  );

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
      normalizeTireType
    );
  }, [constants]);

  useEffect(() => {
    let isMounted = true;

    async function loadConstants() {
      try {
        setIsLoading(true);

        const constantResponse = await constantApi.getConstants({
          page: 0,
          pageSize: 1000
        });

        if (!isMounted) return;

        setConstants(constantResponse.items || []);
      } catch (error) {
        console.error(error);

        if (!isMounted) return;

        showToast(
          error instanceof Error
            ? error.message
            : "Marka ve mevsim bilgileri API üzerinden yüklenemedi.",
          "error"
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
  }, [showToast]);

  useEffect(() => {
    const searchKey = `${fullName} ${phone}`.trim();

    if (selectedClientId || searchKey.length < 2) {
      if (!selectedClientId) {
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
          searchKey
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
  }, [fullName, phone, selectedClientId]);

  useEffect(() => {
    const searchKey = plate.trim();

    if (selectedVehicleId || searchKey.length < 2) {
      if (!selectedVehicleId) {
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
          searchKey
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
  }, [plate, selectedVehicleId]);

  const handleSelectClient = (client: ClientListItemDto) => {
    setSelectedClientId(String(client.id));
    setFullName(client.name || "");
    setPhone(client.phone || "");
    setClientSearchResults([client]);
  };

  const clearSelectedClient = () => {
    setSelectedClientId("");
  };

  const handleSelectVehicle = (vehicle: VehicleListItemDto) => {
    setSelectedVehicleId(String(vehicle.id));
    setPlate(vehicle.licensePlate || "");
    setVehicleNote(vehicle.note || "");
    setVehicleSearchResults([vehicle]);

    if (vehicle.clientId) {
      setSelectedClientId(String(vehicle.clientId));
      setFullName(vehicle.clientName || fullName);
    }
  };

  const clearSelectedVehicle = () => {
    setSelectedVehicleId("");
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files) return;

    setIsUploading(true);

    const nextPhotos: TirePhoto[] = [...photos];
    let uploadedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith("image/")) {
        showToast("Lütfen sadece görsel dosyası seçin.", "error");
        continue;
      }

      try {
        const localPreviewUrl = URL.createObjectURL(file);
        const uploadedFile = await fileApi.uploadFile(file);
        const previewUrl = pickImagePreviewUrl(uploadedFile);

        nextPhotos.push({
          id: String(uploadedFile.id || generateId()),
          fileId: uploadedFile.id,
          name: uploadedFile.orginalName || uploadedFile.originalName || file.name,
          type: file.type,
          dataUrl: previewUrl || localPreviewUrl,
          fileUrl: uploadedFile.fileUrl
        });

        uploadedCount++;
      } catch (error) {
        console.error(error);

        showToast(
          error instanceof Error
            ? error.message
            : "Fotoğraf API'ye yüklenirken hata oluştu.",
          "error"
        );
      }
    }

    setPhotos(nextPhotos);
    setIsUploading(false);

    if (uploadedCount > 0) {
      showToast(`${uploadedCount} fotoğraf API'ye yüklendi.`, "success");
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((currentPhotos) =>
      currentPhotos.filter((photo) => photo.id !== photoId)
    );

    showToast(
      "Fotoğraf listeden çıkarıldı. Kayıt payload'ına dahil edilmeyecek.",
      "info"
    );
  };

  const handleSave = async (autoPrint: boolean) => {
    const trimmedFullName = fullName.trim();
    const trimmedPhone = phone.trim();
    const formattedPlate = formatPlate(plate);
    const trimmedVehicleNote = vehicleNote.trim();
    const trimmedBrand = brand.trim();
    const trimmedSize = size.trim();
    const trimmedLocation = location.trim();

    const imageIds = photos
      .map((photo) => photo.fileId)
      .filter((id): id is number => typeof id === "number" && id > 0);

    if (!trimmedBrand || !trimmedSize) {
      showToast("Lastik markası ve ebat bilgisi zorunludur.", "warning");
      return;
    }

    const exactClientMatch =
      selectedClient ||
      findExactClientMatch(clientSearchResults, trimmedFullName, trimmedPhone);

    const exactVehicleMatch =
      selectedVehicle || findExactVehicleMatch(vehicleSearchResults, formattedPlate);

    const effectiveClientId =
      selectedClientId ||
      (exactClientMatch ? String(exactClientMatch.id) : "") ||
      (exactVehicleMatch?.clientId ? String(exactVehicleMatch.clientId) : "");

    const effectiveVehicleId =
      selectedVehicleId ||
      (exactVehicleMatch ? String(exactVehicleMatch.id) : "");

    if (!effectiveClientId && (!trimmedFullName || !trimmedPhone)) {
      showToast("Müşteri adı ve telefon bilgisi zorunludur.", "warning");
      return;
    }

    if (!effectiveVehicleId && !formattedPlate) {
      showToast("Araç plakası zorunludur.", "warning");
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
        `"${trimmedBrand}" markası backend sabitlerinde bulunamadı. Lütfen listeden marka seçin.`,
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

      const createdTire = await tireApi.addTire({
        client: effectiveClientId
          ? {
              id: Number(effectiveClientId),
              name: null,
              phone: null
            }
          : {
              id: null,
              name: trimmedFullName,
              phone: trimmedPhone
            },

        vehicle: effectiveVehicleId
          ? {
              id: Number(effectiveVehicleId),
              licensePlate: null,
              note: null,
              imageIds
            }
          : {
              id: null,
              licensePlate: formattedPlate,
              note: trimmedVehicleNote,
              imageIds
            },

        modelConstantId,
        brandConstantId,
        sizes: trimmedSize,
        count: Number(quantity),
        storageLocation: trimmedLocation
      });

      const finalVehicleId = String(
        createdTire.vehicleId || effectiveVehicleId || ""
      );

      const finalCustomerName =
        createdTire.clientName ||
        exactClientMatch?.name ||
        exactVehicleMatch?.clientName ||
        trimmedFullName ||
        "Bilinmeyen Cari";

      const finalCustomerPhone = exactClientMatch?.phone || trimmedPhone || "";

      const finalPlate =
        createdTire.vehicleLicensePlate ||
        exactVehicleMatch?.licensePlate ||
        formattedPlate ||
        "-";

      const finalTireType = normalizeTireType(
        createdTire.brandConstantName || tireType
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
        vehicleNote: exactVehicleMatch?.note || trimmedVehicleNote,
        photos,
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
          vehicleNote: exactVehicleMatch?.note || trimmedVehicleNote
        }
      };

      showToast("Lastik emanet kaydı API'ye başarıyla kaydedildi.", "success");
      onSave(newRecord, autoPrint);
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Lastik kaydı oluşturulurken beklenmeyen hata oluştu.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <div>
            <h3 className="text-base font-black text-slate-950">
              Yeni Lastik Emaneti
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Müşteri ve araç bilgileri searchKey ile API üzerinden kontrol edilir.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isUploading}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700">
              API verileri yükleniyor...
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-black text-slate-900">
                    Müşteri Bilgisi
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Ad Soyad *
                    </label>

                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => {
                        setFullName(event.target.value);
                        clearSelectedClient();
                      }}
                      disabled={isSaving}
                      placeholder="Müşteri adı soyadı"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Telefon *
                    </label>

                    <input
                      type="text"
                      value={phone}
                      onChange={(event) => {
                        setPhone(event.target.value);
                        clearSelectedClient();
                      }}
                      disabled={isSaving}
                      placeholder="0532 123 45 67"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {isSearchingClient && (
                  <p className="mt-3 text-xs font-bold text-blue-600">
                    Müşteri API üzerinden aranıyor...
                  </p>
                )}

                {selectedClientId && (
                  <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                    Mevcut müşteri seçildi. Kayıtta müşteri ID gönderilecek.
                  </div>
                )}

                {!selectedClientId && clientSearchResults.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      API Eşleşmeleri
                    </p>

                    {clientSearchResults.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleSelectClient(client)}
                        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                      >
                        <span>{client.name}</span>
                        <span className="font-mono text-slate-400">
                          {client.phone}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Car className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-black text-slate-900">
                    Araç Bilgisi
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Plaka *
                    </label>

                    <input
                      type="text"
                      value={plate}
                      onChange={(event) => {
                        setPlate(event.target.value);
                        clearSelectedVehicle();
                      }}
                      disabled={isSaving}
                      placeholder="19 ABC 123"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-mono text-sm font-black uppercase tracking-wider text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Araç / Kayıt Notu
                    </label>

                    <input
                      type="text"
                      value={vehicleNote}
                      onChange={(event) => setVehicleNote(event.target.value)}
                      disabled={isSaving}
                      placeholder="Jant çizik, balans istemedi vb."
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {isSearchingVehicle && (
                  <p className="mt-3 text-xs font-bold text-blue-600">
                    Araç API üzerinden aranıyor...
                  </p>
                )}

                {selectedVehicleId && (
                  <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                    Mevcut araç seçildi. Kayıtta araç ID gönderilecek.
                  </div>
                )}

                {!selectedVehicleId && vehicleSearchResults.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      API Eşleşmeleri
                    </p>

                    {vehicleSearchResults.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        type="button"
                        onClick={() => handleSelectVehicle(vehicle)}
                        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                      >
                        <span className="font-mono">{vehicle.licensePlate}</span>
                        <span className="text-slate-400">
                          {vehicle.clientName}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-black text-slate-900">
                    Lastik Bilgisi
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Mevsim Türü *
                    </label>

                    <div className="grid grid-cols-3 gap-1">
                      {seasonOptions.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setTireType(type)}
                          disabled={isSaving}
                          className={`h-10 rounded-xl border text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
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
                      Marka / Üretici *
                    </label>

                    <select
                      value={brand}
                      onChange={(event) => setBrand(event.target.value)}
                      disabled={isSaving}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
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
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Ebat *
                    </label>

                    <input
                      type="text"
                      value={size}
                      onChange={(event) => setSize(event.target.value)}
                      disabled={isSaving}
                      placeholder="205/55 R16"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Adet *
                    </label>

                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(Math.max(1, Number(event.target.value)))
                      }
                      disabled={isSaving}
                      className="h-12 w-28 rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm font-black text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Depo Konumu / Raf
                    </label>

                    <input
                      type="text"
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      disabled={isSaving}
                      placeholder="A5-3"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-mono text-sm font-black uppercase text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900">
                    Fotoğraflar
                  </h4>

                  <span className="text-xs font-bold text-slate-400">
                    {photos.length} görsel
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white text-center transition hover:border-blue-500">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(event) => handlePhotoUpload(event.target.files)}
                      disabled={isSaving || isUploading}
                      className="hidden"
                    />

                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="mt-1 text-xs font-black text-slate-700">
                      Fotoğraf Yükle
                    </span>
                    <span className="mt-0.5 text-[10px] font-semibold text-slate-400">
                      API / Files/Add
                    </span>
                  </label>

                  <div className="md:col-span-2">
                    {photos.length === 0 ? (
                      <div className="flex h-24 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-400">
                        Henüz fotoğraf yüklenmedi.
                      </div>
                    ) : (
                      <div className="flex min-h-24 flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
                        {photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="group relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                          >
                            <img
                              src={photo.dataUrl}
                              alt={photo.name}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />

                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(photo.id)}
                              disabled={isSaving}
                              className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4 text-rose-300" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {isUploading && (
                  <p className="mt-3 text-xs font-black text-blue-600">
                    Fotoğraflar API'ye yükleniyor...
                  </p>
                )}
              </section>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isUploading}
              className="h-12 rounded-2xl border border-slate-200 bg-white text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Vazgeç
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving || isUploading || isLoading}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-100 text-xs font-black text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving || isUploading || isLoading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-xs font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                "Kaydediliyor..."
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  Kaydet ve Barkodla
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}