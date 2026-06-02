import { useEffect, useState } from "react";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import RecordsPage from "./pages/RecordsPage";
import CustomersPage from "./pages/CustomersPage";
import StoragePage from "./pages/StoragePage";
import SettingsPage from "./pages/SettingsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import RemindersPage from "./pages/RemindersPage";

// Public SaaS routes
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// Modals
import TireRecordModal from "./components/modals/TireRecordModal";
import TireRecordDetailModal from "./components/modals/TireRecordDetailModal";
import PrintLabelModal from "./components/modals/PrintLabelModal";

// Toast Notification
import ToastContainer from "./components/ui/Toast";

// Types & Services
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

export default function App() {
  // Navigation & Workspace
  const [currentView, setCurrentView] = useState<"landing" | "login" | "register" | "app">("landing");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [searchRedirectQuery, setSearchRedirectQuery] = useState("");

  // Store Entities List
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

  // Popup Modals triggers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<TireRecord | null>(null);
  const [selectedPrintRecord, setSelectedPrintRecord] = useState<TireRecord | null>(null);

  // Toast array
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

  // Fresh synchronizer function across localStorage pools
  const syncPoolData = () => {
    setCustomers(StorageService.getCustomers());
    setVehicles(StorageService.getVehicles());
    setTireRecords(StorageService.getTireRecords());
    setSettings(StorageService.getSettings());
    setSubscription(StorageService.getSubscription());
  };

  // Mount Init sequence
useEffect(() => {
  let isMounted = true;

  const initializeApp = async () => {
    StorageService.initDatabase();
    syncPoolData();

    try {
      const storedUser = getStoredAuthUser();

      if (storedUser) {
        setAuthUser(mapApiUserToAuthUser(storedUser));
        setCurrentView("app");
      }

      const verifiedUser = await getAuthDetail();

      if (!isMounted) return;

      setAuthUser(mapApiUserToAuthUser(verifiedUser));
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

  const handleLoginOrRegisterSuccess = () => {
  syncPoolData();

  const apiUser = getStoredAuthUser();

  if (apiUser) {
    setAuthUser(mapApiUserToAuthUser(apiUser));
    setSettings(StorageService.getSettings());
    setSubscription(StorageService.getSubscription());
  }

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
    setCurrentView("landing");

    showToast("Güvenli çıkış yapıldı.", "info");
  }
};

  // Prevent background body scroll when any popup modal is open
  useEffect(() => {
    const isAnyModalOpen = isAddModalOpen || !!selectedDetailRecord || !!selectedPrintRecord;

    if (isAnyModalOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isAddModalOpen, selectedDetailRecord, selectedPrintRecord]);

  // Compute System statistics live for dashboard UI
  const calculateStats = (): SystemStats => {
    const totalRecords = tireRecords.filter((record) => record.status !== "delivered").length;

    const inStorage = tireRecords.filter(
      (record) =>
        record.status !== "delivered" &&
        record.storageLocation &&
        record.storageLocation.trim().length > 0
    ).length;

    const totalCustomers = customers.filter((customer) => customer.isActive !== false).length;

    const currentISOMonth = new Date().toISOString().substring(0, 7);

    const addedThisMonth = tireRecords.filter(
      (record) =>
        record.status !== "delivered" &&
        record.createdAt.substring(0, 7) === currentISOMonth
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
        const customer = customers.find((item) => item.id === record.customerId);
        const vehicle = vehicles.find((item) => item.id === record.vehicleId);

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

  const handleAddNewRecord = (newRecord: TireRecord, autoPrint: boolean) => {
    syncPoolData();
    setIsAddModalOpen(false);

    if (autoPrint) {
      setTimeout(() => {
        setSelectedPrintRecord(newRecord);
      }, 100);
    }
  };

  const handleUpdateRecord = (updatedRecord: TireRecord, autoPrint: boolean) => {
    syncPoolData();
    setSelectedDetailRecord(updatedRecord);

    if (autoPrint) {
      setTimeout(() => {
        setSelectedPrintRecord(updatedRecord);
      }, 100);
    }
  };

  const handleIncrementPrint = () => {
    StorageService.incrementPrintCounter();
    syncPoolData();
  };

  const handleResetDatabase = () => {
    StorageService.resetDatabase();
    syncPoolData();
    setActiveTab("dashboard");
  };

  const activeStats = calculateStats();
  const recentRecords = getRecentDeposits();

  const printCustomer = selectedPrintRecord
    ? customers.find((customer) => customer.id === selectedPrintRecord.customerId)
    : undefined;

  const printVehicle = selectedPrintRecord
    ? vehicles.find((vehicle) => vehicle.id === selectedPrintRecord.vehicleId)
    : undefined;

  if (isAuthChecking) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl px-6 py-5 text-center">
        <p className="text-sm font-bold text-slate-900">Oturum kontrol ediliyor...</p>
        <p className="text-xs text-slate-400 mt-1">Lütfen bekleyin.</p>
      </div>
    </div>
  );
}  

  if (currentView === "landing") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <LandingPage
          onNavigate={(view) => setCurrentView(view)}
          onDemoLogin={() => setCurrentView("login")}
        />
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