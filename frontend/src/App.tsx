import { useCallback, useEffect, useState } from "react";

import AppLayout from "./components/layout/AppLayout";

import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import VehiclesPage from "./pages/VehiclesPage";
import StoragePage from "./pages/StoragePage";
import HistoryPage from "./pages/HistoryPage";
import RemindersPage from "./pages/RemindersPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import SettingsPage from "./pages/SettingsPage";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import TireRecordModal from "./components/modals/TireRecordModal";
import TireRecordDetailModal from "./components/modals/TireRecordDetailModal";
import PrintLabelModal from "./components/modals/PrintLabelModal";

import ToastContainer from "./components/ui/Toast";

import {
  Customer,
  Vehicle,
  TireRecord,
  ActiveTab,
  SystemStats,
  AppSettings,
  ToastMessage,
  AuthUser,
  UserSubscription,
  TireType,
  TirePhoto
} from "./types";

import { getBusinessById, mapBusinessToSettings } from "./services/businessApi";
import { buildFilePublicUrl } from "./services/fileApi";
import { generateId, normalizeTurkish } from "./utils/helpers";

import {
  AuthApiUser,
  clearAuthSession,
  getAuthDetail,
  getStoredAuthUser,
  revokeToken
} from "./services/authApi";

import {
  clientApi,
  vehicleApi,
  tireApi,
  ClientListItemDto,
  VehicleListItemDto,
  TireListItemDto
} from "./services/tireApi";

const defaultSettings: AppSettings = {
  businessName: "LastikOtelim",
  businessType: "Oto Lastik & Rot Balans",
  phone: "",
  address: ""
};

const defaultSubscription: UserSubscription = {
  id: "subscription-api-not-ready",
  planId: null,
  planName: "",
  status: "inactive",
  isActive: false
};

function mapApiUserToAuthUser(user: AuthApiUser): AuthUser {
  return {
    id: String(user.businessId),
    businessName: user.businessSlug || "İşletme",
    ownerName: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    password: "",
    phone: user.phone,
    businessType: "Oto Lastik & Servis",
    address: ""
  };
}

function mapApiClientToCustomer(item: ClientListItemDto): Customer {
  return {
    id: String(item.id),
    fullName: item.name || "Bilinmeyen Cari",
    phone: item.phone || "",
    createdAt: item.createdDate,
    isActive: true
  };
}

function mapApiVehicleToVehicle(item: VehicleListItemDto): Vehicle {
  return {
    id: String(item.id),
    clientId: String(item.clientId),
    plate: item.licensePlate || "-",
    note: item.note || "",
    createdAt: item.createdDate
  };
}

function normalizeTireType(value?: string | null): TireType {
  const normalizedValue = normalizeTurkish(value || "");

  if (normalizedValue.includes("kis")) return "Kışlık";
  if (normalizedValue.includes("4") || normalizedValue.includes("mevsim")) {
    return "4 Mevsim";
  }

  return "Yazlık";
}

function getSafeFileUrl(file: Record<string, unknown>) {
  if (typeof file.fileUrl === "string" && file.fileUrl.trim()) {
    return file.fileUrl;
  }

  if (typeof file.url === "string" && file.url.trim()) {
    return file.url;
  }

  if (typeof file.filePath === "string" && file.filePath.trim()) {
    return file.filePath;
  }

  return "";
}

function getSafeFileName(file: Record<string, unknown>) {
  if (typeof file.fileName === "string" && file.fileName.trim()) {
    return file.fileName;
  }

  if (typeof file.orginalName === "string" && file.orginalName.trim()) {
    return file.orginalName;
  }

  if (typeof file.originalName === "string" && file.originalName.trim()) {
    return file.originalName;
  }

  return "lastik-gorseli";
}

function getSafeFileId(file: Record<string, unknown>) {
  const rawFileId = file.fileId ?? file.id;

  if (typeof rawFileId === "number") {
    return rawFileId;
  }

  if (typeof rawFileId === "string") {
    const parsed = Number(rawFileId);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

type PhotoSource = "vehicle" | "tire";

function getUploadFilesFromEntity(entity: unknown) {
  if (!entity || typeof entity !== "object") return [];

  const data = entity as {
    uploadFiles?: unknown;
    imageFiles?: unknown;
    images?: unknown;
    files?: unknown;
  };

  const candidates = [data.uploadFiles, data.imageFiles, data.images, data.files];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as Record<string, unknown>[];
    }
  }

  return [];
}

function mapUploadFilesToTirePhotos(
  files: Record<string, unknown>[] | undefined,
  source: PhotoSource
): TirePhoto[] {
  return (files || []).reduce<TirePhoto[]>((photos, file) => {
    const fileId = getSafeFileId(file);
    const fileUrl = getSafeFileUrl(file);
    const fileName = getSafeFileName(file);
    const publicUrl = buildFilePublicUrl(fileUrl);

    if (!publicUrl && !fileUrl) {
      return photos;
    }

    photos.push({
      id: String(fileId || `${source}-${fileUrl || generateId()}`),
      fileId: fileId || undefined,
      name: fileName,
      type: "image/*",
      dataUrl: publicUrl || fileUrl,
      fileUrl,
      source
    });

    return photos;
  }, []);
}

function getTirePhotoCacheKey(recordId: string) {
  return `lastik-otelim:tire-photos:${recordId}`;
}

function getTirePhotoUniqueKey(photo: TirePhoto) {
  if (photo.fileId) return `file-${photo.fileId}`;
  if (photo.fileUrl) return `url-${photo.fileUrl}`;
  if (photo.dataUrl) return `data-${photo.dataUrl}`;
  return `id-${photo.id}`;
}

function mergeTirePhotos(...photoGroups: Array<TirePhoto[] | undefined>) {
  const seen = new Set<string>();
  const mergedPhotos: TirePhoto[] = [];

  photoGroups.flatMap((photos) => photos || []).forEach((photo) => {
    const uniqueKey = getTirePhotoUniqueKey(photo);

    if (seen.has(uniqueKey)) return;

    seen.add(uniqueKey);
    mergedPhotos.push(photo);
  });

  return mergedPhotos;
}

function saveCachedTirePhotos(recordId: string, photos: TirePhoto[]) {
  if (!recordId || photos.length === 0) return;

  try {
    const safePhotos = photos.map((photo) => ({
      ...photo,
      dataUrl: photo.fileUrl
        ? buildFilePublicUrl(photo.fileUrl) || photo.dataUrl
        : photo.dataUrl
    }));

    sessionStorage.setItem(
      getTirePhotoCacheKey(recordId),
      JSON.stringify(safePhotos)
    );
  } catch (error) {
    console.warn("Lastik fotoğraf cache yazılamadı:", error);
  }
}

function readCachedTirePhotos(recordId: string): TirePhoto[] {
  if (!recordId) return [];

  try {
    const cachedValue = sessionStorage.getItem(getTirePhotoCacheKey(recordId));

    if (!cachedValue) return [];

    const parsedValue = JSON.parse(cachedValue);

    return Array.isArray(parsedValue) ? (parsedValue as TirePhoto[]) : [];
  } catch (error) {
    console.warn("Lastik fotoğraf cache okunamadı:", error);
    return [];
  }
}

function mapApiTireToRecord(
  item: TireListItemDto,
  mappedCustomers: Customer[],
  mappedVehicles: Vehicle[],
  apiVehicles: VehicleListItemDto[]
): TireRecord {
  const matchedVehicle = mappedVehicles.find(
    (vehicle) => vehicle.id === String(item.vehicleId)
  );

  const matchedApiVehicle = apiVehicles.find(
    (vehicle) => vehicle.id === item.vehicleId
  );

  const cleanClientName =
    item.clientName && item.clientName.trim() && item.clientName !== "string"
      ? item.clientName.trim()
      : "";

  const matchedCustomerByVehicle = matchedVehicle
    ? mappedCustomers.find((customer) => customer.id === matchedVehicle.clientId)
    : undefined;

  const matchedCustomerByName = cleanClientName
    ? mappedCustomers.find(
        (customer) =>
          normalizeTurkish(customer.fullName) === normalizeTurkish(cleanClientName)
      )
    : undefined;

  const matchedCustomer = matchedCustomerByVehicle || matchedCustomerByName;

  const customerName =
    cleanClientName || matchedCustomer?.fullName || "Bilinmeyen Cari";

  const customerPhone = matchedCustomer?.phone || "";
  const vehiclePlate = item.vehicleLicensePlate || matchedVehicle?.plate || "-";

  const storageLocation =
    item.storageLocation && item.storageLocation.trim()
      ? item.storageLocation.trim()
      : "";

  const vehicleNote =
    matchedApiVehicle?.note && matchedApiVehicle.note.trim()
      ? matchedApiVehicle.note.trim()
      : matchedVehicle?.note || "";

  const vehiclePhotos = mapUploadFilesToTirePhotos(
    getUploadFilesFromEntity(matchedApiVehicle),
    "vehicle"
  );

  const tirePhotos = mapUploadFilesToTirePhotos(
    getUploadFilesFromEntity(item),
    "tire"
  );

  const photos = mergeTirePhotos(vehiclePhotos, tirePhotos);

  const tireCode = item.code || `LT-${item.id}`;
  const tireType = normalizeTireType(item.brandConstantName);
  const brand = item.modelConstantName || "Belirtilmedi";
  const size = item.sizes || "Belirtilmedi";
  const quantity = item.count || 0;

  return {
    id: String(item.id),
    clientId: matchedVehicle?.clientId || matchedCustomer?.id || "",
    vehicleId: String(item.vehicleId),
    tireCode,
    tireType,
    brand,
    size,
    quantity,
    storageLocation,
    vehicleNote,
    photos,
    createdAt: item.createdDate,
    updatedAt: item.createdDate,
    status: "active",
    snapshot: {
      customerName,
      phone: customerPhone,
      plate: vehiclePlate,
      tireCode,
      tireType,
      brand,
      size,
      quantity,
      storageLocation,
      vehicleNote
    }
  };
}

function getFallbackCustomer(record: TireRecord): Customer {
  return {
    id: record.clientId,
    fullName: record.snapshot?.customerName || "Bilinmeyen Cari",
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

export default function App() {
  const [currentView, setCurrentView] = useState<
    "landing" | "login" | "register" | "app"
  >("landing");

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [searchRedirectQuery, setSearchRedirectQuery] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tireRecords, setTireRecords] = useState<TireRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [subscription, setSubscription] =
    useState<UserSubscription>(defaultSubscription);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDetailRecord, setSelectedDetailRecord] =
    useState<TireRecord | null>(null);
  const [selectedPrintRecord, setSelectedPrintRecord] =
    useState<TireRecord | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

const dismissToast = useCallback((id: string) => {
  setToasts((prev) => prev.filter((toast) => toast.id !== id));
}, []);

const showToast = useCallback(
  (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    const freshToast: ToastMessage = {
      id: generateId(),
      message,
      type
    };

    setToasts((prev) => [...prev, freshToast]);

    window.setTimeout(() => {
      dismissToast(freshToast.id);
    }, 3200);
  },
  [dismissToast]
);

  const syncBusinessSettings = async () => {
    try {
      const business = await getBusinessById();

      const nextSettings = mapBusinessToSettings(
        business,
        "Oto Lastik & Rot Balans Servisi"
      );

      setSettings(nextSettings);

      setAuthUser((currentUser) => {
        if (!currentUser) return currentUser;

        return {
          ...currentUser,
          businessName: business.name || currentUser.businessName,
          phone: business.phone || currentUser.phone,
          address: business.address || currentUser.address
        };
      });
    } catch (error) {
      console.warn("İşletme bilgisi API üzerinden alınamadı:", error);
    }
  };

  const syncPoolData = async (): Promise<TireRecord[]> => {
    await syncBusinessSettings();

    try {
      const [clientResponse, vehicleResponse, tireResponse] =
        await Promise.all([
          clientApi.getClients({ page: 0, pageSize: 1000 }),
          vehicleApi.getVehicles({ page: 0, pageSize: 1000 }),
          tireApi.getTires({ page: 0, pageSize: 1000 })
        ]);

      const apiClients = clientResponse.items || [];
      const apiVehicles = vehicleResponse.items || [];
      const apiTires = tireResponse.items || [];

      const mappedCustomers = apiClients.map(mapApiClientToCustomer);
      const mappedVehicles = apiVehicles.map(mapApiVehicleToVehicle);
      const mappedRecords = apiTires.map((item) => {
        const record = mapApiTireToRecord(
          item,
          mappedCustomers,
          mappedVehicles,
          apiVehicles
        );

        const cachedPhotos = readCachedTirePhotos(record.id);

        return {
          ...record,
          photos: mergeTirePhotos(record.photos, cachedPhotos)
        };
      });

      setCustomers(mappedCustomers);
      setVehicles(mappedVehicles);
      setTireRecords(mappedRecords);
      setSubscription(defaultSubscription);

      return mappedRecords;
    } catch (error) {
      console.error("API verileri alınamadı:", error);

      setCustomers([]);
      setVehicles([]);
      setTireRecords([]);
      setSubscription(defaultSubscription);

      showToast(
        "Veriler API üzerinden alınamadı. Lütfen bağlantıyı veya oturumu kontrol edin.",
        "error"
      );

      return [];
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        const storedUser = getStoredAuthUser();

        if (storedUser && isMounted) {
          setAuthUser(mapApiUserToAuthUser(storedUser));
          setCurrentView("app");
        }

        const verifiedUser = await getAuthDetail();

        if (!isMounted) return;

        setAuthUser(mapApiUserToAuthUser(verifiedUser));
        setCurrentView("app");

        await syncPoolData();
      } catch {
        clearAuthSession();

        if (!isMounted) return;

        setAuthUser(null);
        setCustomers([]);
        setVehicles([]);
        setTireRecords([]);
        setSettings(defaultSettings);
        setSubscription(defaultSubscription);
        setCurrentView("landing");
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    };

    initializeApp();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddModalOpen(false);
        setSelectedDetailRecord(null);
        setSelectedPrintRecord(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const isAnyModalOpen =
      isAddModalOpen || !!selectedDetailRecord || !!selectedPrintRecord;

    if (isAnyModalOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isAddModalOpen, selectedDetailRecord, selectedPrintRecord]);

  const handleLoginOrRegisterSuccess = async () => {
    const apiUser = getStoredAuthUser();

    if (apiUser) {
      setAuthUser(mapApiUserToAuthUser(apiUser));
    }

    setSubscription(defaultSubscription);
    setCurrentView("app");

    await syncPoolData();
  };

  const handleLogout = async () => {
    try {
      await revokeToken();
    } catch (error) {
      console.warn("RevokeToken isteği tamamlanamadı:", error);
    } finally {
      clearAuthSession();

      setAuthUser(null);
      setCustomers([]);
      setVehicles([]);
      setTireRecords([]);
      setSettings(defaultSettings);
      setSubscription(defaultSubscription);
      setSelectedDetailRecord(null);
      setSelectedPrintRecord(null);
      setIsAddModalOpen(false);
      setCurrentView("landing");

      showToast("Güvenli çıkış yapıldı.", "info");
    }
  };

  const calculateStats = (): SystemStats => {
    const activeRecords = tireRecords.filter(
      (record) => record.status !== "delivered"
    );

    const totalRecords = activeRecords.length;

    const inStorage = activeRecords.filter(
      (record) =>
        record.storageLocation && record.storageLocation.trim().length > 0
    ).length;

    const totalCustomers = customers.filter(
      (customer) => customer.isActive !== false
    ).length;

    const currentISOMonth = new Date().toISOString().substring(0, 7);

    const addedThisMonth = activeRecords.filter(
      (record) => record.createdAt.substring(0, 7) === currentISOMonth
    ).length;

    return {
      totalRecords,
      inStorage,
      totalCustomers,
      addedThisMonth,
      printedLabelsCount: 0
    };
  };

  const getRecentDeposits = () => {
    return [...tireRecords]
      .filter((record) => record.status !== "delivered")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5)
      .map((record) => {
        const customer =
          customers.find((item) => item.id === record.clientId) ||
          getFallbackCustomer(record);

        const vehicle =
          vehicles.find((item) => item.id === record.vehicleId) ||
          getFallbackVehicle(record);

        return {
          record,
          customer,
          vehicle
        };
      });
  };

const handleDashboardSearchRedirect = (
  targetTab: "storage" | "customers",
  query: string
) => {
  setSearchRedirectQuery(query);
  setActiveTab(targetTab);
};

  const handleAddNewRecord = async (
    newRecord: TireRecord,
    autoPrint: boolean
  ) => {
    const mergedNewRecord: TireRecord = {
      ...newRecord,
      photos: mergeTirePhotos(newRecord.photos)
    };

    saveCachedTirePhotos(mergedNewRecord.id, mergedNewRecord.photos || []);

    setTireRecords((currentRecords) => {
      const exists = currentRecords.some(
        (record) => record.id === mergedNewRecord.id
      );

      if (exists) {
        return currentRecords.map((record) =>
          record.id === mergedNewRecord.id ? mergedNewRecord : record
        );
      }

      return [mergedNewRecord, ...currentRecords];
    });

    const freshRecords = await syncPoolData();
    setHistoryRefreshKey((currentKey) => currentKey + 1);

    setIsAddModalOpen(false);

    if (autoPrint) {
      const freshRecordFromApi = freshRecords.find(
        (record) => record.id === mergedNewRecord.id
      );

      const freshRecord: TireRecord = freshRecordFromApi
        ? {
            ...freshRecordFromApi,
            photos: mergeTirePhotos(
              freshRecordFromApi.photos,
              mergedNewRecord.photos
            )
          }
        : mergedNewRecord;

      saveCachedTirePhotos(freshRecord.id, freshRecord.photos || []);

      setTimeout(() => {
        setSelectedPrintRecord(freshRecord);
      }, 100);
    }
  };

  const handleOpenDetailRecord = async (record: TireRecord) => {
    const cachedPhotos = readCachedTirePhotos(record.id);

    const initialRecord: TireRecord = {
      ...record,
      photos: mergeTirePhotos(record.photos, cachedPhotos)
    };

    setSelectedDetailRecord(initialRecord);

    const numericRecordId = Number(record.id);

    if (!Number.isFinite(numericRecordId) || numericRecordId <= 0) {
      return;
    }

    try {
      const numericVehicleId = Number(record.vehicleId);

      const [tireDetailResult, vehicleDetailResult] = await Promise.allSettled([
        tireApi.getTireById(numericRecordId),
        Number.isFinite(numericVehicleId) && numericVehicleId > 0
          ? vehicleApi.getVehicleById(numericVehicleId)
          : Promise.resolve(null)
      ]);

      if (tireDetailResult.status === "rejected") {
        throw tireDetailResult.reason;
      }

      const detail = tireDetailResult.value;
      const vehicleDetail =
        vehicleDetailResult.status === "fulfilled" && vehicleDetailResult.value
          ? vehicleDetailResult.value
          : undefined;

      const mappedDetailRecord = mapApiTireToRecord(
        detail,
        customers,
        vehicles,
        vehicleDetail ? [vehicleDetail] : []
      );

      const finalPhotos = mergeTirePhotos(
        mappedDetailRecord.photos,
        initialRecord.photos,
        cachedPhotos
      );

      if (finalPhotos.length > 0) {
        saveCachedTirePhotos(record.id, finalPhotos);
      }

      setSelectedDetailRecord({
        ...initialRecord,
        ...mappedDetailRecord,
        vehicleNote: mappedDetailRecord.vehicleNote || initialRecord.vehicleNote,
        photos: finalPhotos,
        snapshot: {
          ...initialRecord.snapshot,
          ...mappedDetailRecord.snapshot,
          vehicleNote:
            mappedDetailRecord.snapshot?.vehicleNote ||
            initialRecord.snapshot.vehicleNote
        }
      });
    } catch (error) {
      console.error(error);

      setSelectedDetailRecord(initialRecord);

      showToast(
        error instanceof Error
          ? error.message
          : "Lastik detay fotoğrafları yüklenemedi.",
        "warning"
      );
    }
  };

  const handleUpdateRecord = async (
    updatedRecord: TireRecord,
    autoPrint: boolean
  ) => {
    const cachedPhotos = readCachedTirePhotos(updatedRecord.id);

    const mergedUpdatedRecord: TireRecord = {
      ...updatedRecord,
      photos: mergeTirePhotos(updatedRecord.photos, cachedPhotos)
    };

    saveCachedTirePhotos(
      mergedUpdatedRecord.id,
      mergedUpdatedRecord.photos || []
    );

    setTireRecords((currentRecords) =>
      currentRecords.map((record) =>
        record.id === mergedUpdatedRecord.id ? mergedUpdatedRecord : record
      )
    );

    const freshRecords = await syncPoolData();
    setHistoryRefreshKey((currentKey) => currentKey + 1);

    const freshRecordFromApi = freshRecords.find(
      (record) => record.id === mergedUpdatedRecord.id
    );

    const freshRecord: TireRecord = freshRecordFromApi
      ? {
          ...freshRecordFromApi,
          photos: mergeTirePhotos(
            freshRecordFromApi.photos,
            mergedUpdatedRecord.photos
          )
        }
      : mergedUpdatedRecord;

    saveCachedTirePhotos(freshRecord.id, freshRecord.photos || []);

    setSelectedDetailRecord(freshRecord);

    if (autoPrint) {
      setTimeout(() => {
        setSelectedPrintRecord(freshRecord);
      }, 100);
    }
  };

  const handleDeliveredRecord = async () => {
    await syncPoolData();
    setHistoryRefreshKey((currentKey) => currentKey + 1);
  };

  const handleIncrementPrint = () => {
    /**
     * Print sayacı için backend endpoint yoksa local sayaç tutulmaz.
     * Bu nedenle burada kalıcı işlem yapılmıyor.
     */
  };

  const handleResetDatabase = async () => {
    showToast(
      "Bulut verileri uygulama içinden sıfırlanamaz. Sadece API verileri yeniden yüklendi.",
      "warning"
    );

    await syncPoolData();
    setActiveTab("dashboard");
  };

  const activeStats = calculateStats();
  const recentRecords = getRecentDeposits();

  const printCustomer = selectedPrintRecord
    ? customers.find((customer) => customer.id === selectedPrintRecord.clientId) ||
      getFallbackCustomer(selectedPrintRecord)
    : undefined;

  const printVehicle = selectedPrintRecord
    ? vehicles.find((vehicle) => vehicle.id === selectedPrintRecord.vehicleId) ||
      getFallbackVehicle(selectedPrintRecord)
    : undefined;

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl px-6 py-5 text-center">
          <p className="text-sm font-bold text-slate-900">
            Oturum kontrol ediliyor...
          </p>
          <p className="text-xs text-slate-400 mt-1">Lütfen bekleyin.</p>
        </div>
      </div>
    );
  }

  if (currentView === "landing") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <LandingPage onNavigate={(view) => setCurrentView(view)} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  if (currentView === "login") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <LoginPage
          onNavigate={(view) => setCurrentView(view)}
          onLoginSuccess={handleLoginOrRegisterSuccess}
          showToast={showToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  if (currentView === "register") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <RegisterPage
          onNavigate={(view) => setCurrentView(view)}
          onRegisterSuccess={handleLoginOrRegisterSuccess}
          showToast={showToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <AppLayout
        activeTab={activeTab}
        onTabChange={(tab) => {
          setSearchRedirectQuery("");
          setActiveTab(tab);
        }}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        settings={settings}
        onLogout={handleLogout}
        authUser={authUser}
      >
        {activeTab === "dashboard" && (
          <DashboardPage
            stats={activeStats}
            recentRecords={recentRecords}
            historyRefreshKey={historyRefreshKey}
            onAddTireClick={() => setIsAddModalOpen(true)}
            onSearchRedirect={handleDashboardSearchRedirect}
            onOpenDetail={handleOpenDetailRecord}
            onOpenLabelPrinter={(record) => setSelectedPrintRecord(record)}
          />
        )}

        {activeTab === "reminders" && (
          <RemindersPage
            customers={customers}
            vehicles={vehicles}
            records={tireRecords}
            settings={settings}
            showToast={showToast}
          />
        )}

        {activeTab === "customers" && (
          <CustomersPage
            customers={customers}
            vehicles={vehicles}
            records={tireRecords}
            onRefreshData={async () => {
              await syncPoolData();
            }}
            onOpenDetail={handleOpenDetailRecord}
            onOpenLabelPrinter={(record) => setSelectedPrintRecord(record)}
            showToast={showToast}
          />
        )}

        {activeTab === "vehicles" && (
          <VehiclesPage
            vehicles={vehicles}
            customers={customers}
            records={tireRecords}
            onRefreshData={async () => {
              await syncPoolData();
            }}
            onOpenDetail={handleOpenDetailRecord}
            onOpenLabelPrinter={(record) => setSelectedPrintRecord(record)}
            showToast={showToast}
          />
        )}

        {activeTab === "storage" && (
          <StoragePage
            records={tireRecords}
            customers={customers}
            vehicles={vehicles}
            initialSearchQuery={searchRedirectQuery}
            onOpenDetail={handleOpenDetailRecord}
            onOpenLabelPrinter={(record) => setSelectedPrintRecord(record)}
          />
        )}

        {activeTab === "history" && <HistoryPage />}

        {activeTab === "subscription" && (
          <SubscriptionPage
            subscription={subscription}
            onSubscriptionChange={syncPoolData}
            showToast={showToast}
          />
        )}

        {activeTab === "settings" && (
          <SettingsPage
            onResetDatabase={handleResetDatabase}
            showToast={showToast}
            onSaveSuccess={async () => {
              await syncPoolData();
            }}
          />
        )}
      </AppLayout>

      {isAddModalOpen && (
        <TireRecordModal
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddNewRecord}
          showToast={showToast}
        />
      )}

      {selectedDetailRecord && (
        <TireRecordDetailModal
          record={selectedDetailRecord}
          onClose={() => setSelectedDetailRecord(null)}
          onUpdate={handleUpdateRecord}
          onDelivered={handleDeliveredRecord}
          showToast={showToast}
          onOpenLabelPrinter={(record) => setSelectedPrintRecord(record)}
        />
      )}

      {selectedPrintRecord && (
        <PrintLabelModal
          record={selectedPrintRecord}
          customer={printCustomer}
          vehicle={printVehicle}
          onClose={() => setSelectedPrintRecord(null)}
          onIncrementPrint={handleIncrementPrint}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}