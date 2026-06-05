import { useEffect, useState } from "react";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import RecordsPage from "./pages/RecordsPage";
import CustomersPage from "./pages/CustomersPage";
import StoragePage from "./pages/StoragePage";
import SettingsPage from "./pages/SettingsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import RemindersPage from "./pages/RemindersPage";

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
  UserSubscription
} from "./types";

import { StorageService } from "./services/storageService";
import { generateId } from "./utils/helpers";

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

  const matchedCustomer = matchedVehicle
    ? mappedCustomers.find(
        (customer) => customer.id === matchedVehicle.customerId
      )
    : undefined;

  const cleanClientName =
    item.clientName && item.clientName.trim() && item.clientName !== "string"
      ? item.clientName
      : "";

  const customerName =
    cleanClientName || matchedCustomer?.fullName || "Bilinmeyen Cari";

  const customerPhone = matchedCustomer?.phone || "";
  const vehiclePlate =
    item.vehicleLicensePlate || matchedVehicle?.plate || "-";

  return {
    id: String(item.id),
    customerId: matchedVehicle?.customerId || matchedCustomer?.id || "",
    vehicleId: String(item.vehicleId),
    tireCode: item.code || `LT-${item.id}`,
    tireType: item.brandConstantName || "Yazlık",
    brand: item.modelConstantName || "Belirtilmedi",
    size: item.sizes || "Belirtilmedi",
    quantity: item.count || 0,
    storageLocation: matchedApiVehicle?.note || "",
    photos: [],
    createdAt: item.createdDate,
    updatedAt: item.createdDate,
    status: "active",
    snapshot: {
      customerName,
      phone: customerPhone,
      plate: vehiclePlate
    }
  } as TireRecord;
}

function getFallbackCustomer(record: TireRecord): Customer {
  return {
    id: record.customerId,
    fullName: record.snapshot?.customerName || "Bilinmeyen Cari",
    phone: record.snapshot?.phone || "",
    createdAt: record.createdAt
  };
}

function getFallbackVehicle(record: TireRecord): Vehicle {
  return {
    id: record.vehicleId,
    customerId: record.customerId,
    plate: record.snapshot?.plate || "-",
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

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tireRecords, setTireRecords] = useState<TireRecord[]>([]);

  const [settings, setSettings] = useState<AppSettings>({
    businessName: "Emin Oto Lastik",
    businessType: "Oto Lastik & Rot Balans",
    phone: "",
    address: ""
  });

  const [subscription, setSubscription] = useState<UserSubscription>(
    StorageService.getSubscription()
  );

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

  const syncLocalPoolData = () => {
    setCustomers(StorageService.getCustomers());
    setVehicles(StorageService.getVehicles());
    setTireRecords(StorageService.getTireRecords());
    setSettings(StorageService.getSettings());
    setSubscription(StorageService.getSubscription());
  };

  const syncPoolData = async () => {
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
        mapApiTireToRecord(
          item,
          mappedCustomers,
          mappedVehicles,
          apiVehicles
        )
      );

      setCustomers(mappedCustomers);
      setVehicles(mappedVehicles);
      setTireRecords(mappedRecords);

      setSettings(StorageService.getSettings());
      setSubscription(StorageService.getSubscription());
    } catch (error) {
      console.warn("API verileri alınamadı, local fallback kullanılıyor:", error);
      syncLocalPoolData();
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      StorageService.initDatabase();
      syncLocalPoolData();

      try {
        const storedUser = getStoredAuthUser();

        if (storedUser && isMounted) {
          setAuthUser(mapApiUserToAuthUser(storedUser));
          setCurrentView("app");
        }

        const verifiedUser = await getAuthDetail();

        if (!isMounted) return;

        setAuthUser(mapApiUserToAuthUser(verifiedUser));
        await syncPoolData();

        if (!isMounted) return;

        setCurrentView("app");
      } catch {
        clearAuthSession();

        if (!isMounted) return;

        setAuthUser(null);
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
      setSettings(StorageService.getSettings());
      setSubscription(StorageService.getSubscription());
    }

    await syncPoolData();
    setCurrentView("app");
  };

  const handleLogout = async () => {
    try {
      await revokeToken();
    } catch (error) {
      console.warn("RevokeToken isteği tamamlanamadı:", error);
    } finally {
      clearAuthSession();
      StorageService.logout();

      setAuthUser(null);
      setCustomers([]);
      setVehicles([]);
      setTireRecords([]);
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

    const printedLabelsCount = StorageService.getPrintCounter();

    return {
      totalRecords,
      inStorage,
      totalCustomers,
      addedThisMonth,
      printedLabelsCount
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
          customers.find((item) => item.id === record.customerId) ||
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
    targetTab: "records" | "storage" | "customers",
    query: string
  ) => {
    setSearchRedirectQuery(query);
    setActiveTab(targetTab);
  };

  const handleAddNewRecord = async (newRecord: TireRecord, autoPrint: boolean) => {
    await syncPoolData();
    setIsAddModalOpen(false);

    if (autoPrint) {
      const refreshedRecord =
        tireRecords.find((record) => record.id === newRecord.id) || newRecord;

      setTimeout(() => {
        setSelectedPrintRecord(refreshedRecord);
      }, 100);
    }
  };

  const handleUpdateRecord = async (
    updatedRecord: TireRecord,
    autoPrint: boolean
  ) => {
    await syncPoolData();
    setSelectedDetailRecord(updatedRecord);

    if (autoPrint) {
      setTimeout(() => {
        setSelectedPrintRecord(updatedRecord);
      }, 100);
    }
  };

  const handleIncrementPrint = () => {
    StorageService.incrementPrintCounter();
    setSubscription(StorageService.getSubscription());
  };

  const handleResetDatabase = async () => {
    StorageService.resetDatabase();
    syncLocalPoolData();

    await syncPoolData();

    setActiveTab("dashboard");
  };

  const activeStats = calculateStats();
  const recentRecords = getRecentDeposits();

  const printCustomer = selectedPrintRecord
    ? customers.find(
        (customer) => customer.id === selectedPrintRecord.customerId
      ) || getFallbackCustomer(selectedPrintRecord)
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
            subscription={subscription}
            onAddTireClick={() => setIsAddModalOpen(true)}
            onOpenSubscription={() => setActiveTab("subscription")}
            onSearchRedirect={handleDashboardSearchRedirect}
            onOpenDetail={(record) => setSelectedDetailRecord(record)}
            onOpenLabelPrinter={(record) => setSelectedPrintRecord(record)}
          />
        )}

        {activeTab === "records" && (
          <RecordsPage
            records={tireRecords}
            customers={customers}
            vehicles={vehicles}
            initialSearchQuery={searchRedirectQuery}
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