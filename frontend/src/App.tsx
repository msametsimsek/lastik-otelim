import { useEffect, useState } from "react";

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
  TireType
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

  const photos =
    matchedApiVehicle?.uploadFiles?.map((file) => {
      const rawFile = file as Record<string, unknown>;
      const fileId = getSafeFileId(rawFile);
      const fileUrl = getSafeFileUrl(rawFile);
      const fileName = getSafeFileName(rawFile);

      return {
        id: String(fileId || generateId()),
        fileId: fileId || undefined,
        name: fileName,
        type: "image/*",
        dataUrl: buildFilePublicUrl(fileUrl),
        fileUrl
      };
    }) || [];

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

  const showToast = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    const freshToast: ToastMessage = {
      id: generateId(),
      message,
      type
    };

    setToasts((prev) => [...prev, freshToast]);

    setTimeout(() => {
      dismissToast(freshToast.id);
    }, 3200);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

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
      const mappedRecords = apiTires.map((item) =>
        mapApiTireToRecord(item, mappedCustomers, mappedVehicles, apiVehicles)
      );

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

  const handleAddNewRecord = async (newRecord: TireRecord, autoPrint: boolean) => {
    setTireRecords((currentRecords) => {
      const exists = currentRecords.some((record) => record.id === newRecord.id);

      if (exists) {
        return currentRecords.map((record) =>
          record.id === newRecord.id ? newRecord : record
        );
      }

      return [newRecord, ...currentRecords];
    });

    const freshRecords = await syncPoolData();
    setHistoryRefreshKey((currentKey) => currentKey + 1);

    setIsAddModalOpen(false);

    if (autoPrint) {
      const freshRecord =
        freshRecords.find((record) => record.id === newRecord.id) || newRecord;

      setTimeout(() => {
        setSelectedPrintRecord(freshRecord);
      }, 100);
    }
  };

  const handleUpdateRecord = async (
    updatedRecord: TireRecord,
    autoPrint: boolean
  ) => {
    setTireRecords((currentRecords) =>
      currentRecords.map((record) =>
        record.id === updatedRecord.id ? updatedRecord : record
      )
    );

    const freshRecords = await syncPoolData();
    setHistoryRefreshKey((currentKey) => currentKey + 1);

    const freshRecord =
      freshRecords.find((record) => record.id === updatedRecord.id) ||
      updatedRecord;

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
            onOpenDetail={(record) => setSelectedDetailRecord(record)}
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
            onRefreshData={syncPoolData}
            onOpenDetail={(record) => setSelectedDetailRecord(record)}
            onOpenLabelPrinter={(record) => setSelectedPrintRecord(record)}
            showToast={showToast}
          />
        )}

        {activeTab === "vehicles" && (
          <VehiclesPage
            vehicles={vehicles}
            customers={customers}
            records={tireRecords}
            onRefreshData={syncPoolData}
            onOpenDetail={(record) => setSelectedDetailRecord(record)}
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
            onOpenDetail={(record) => setSelectedDetailRecord(record)}
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
            onSaveSuccess={syncPoolData}
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