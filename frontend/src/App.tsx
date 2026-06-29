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

import type {
  ActiveTab,
  AppSettings,
  AuthUser,
  TireRecord,
  ToastMessage,
  UserSubscription
} from "./types";

import { getBusinessById, mapBusinessToSettings } from "./services/businessApi";
import { generateId } from "./utils/helpers";

import {
  AuthApiUser,
  clearAuthSession,
  getAuthDetail,
  getStoredAuthUser,
  revokeToken
} from "./services/authApi";

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

export default function App() {
  const [currentView, setCurrentView] = useState<
    "landing" | "login" | "register" | "app"
  >("landing");

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [searchRedirectQuery, setSearchRedirectQuery] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

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

  const syncBusinessSettings = useCallback(async () => {
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
  }, []);

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

        await syncBusinessSettings();
      } catch {
        clearAuthSession();

        if (!isMounted) return;

        setAuthUser(null);
        setSettings(defaultSettings);
        setSubscription(defaultSubscription);
        setCurrentView("landing");
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    };

    void initializeApp();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
  }, [syncBusinessSettings]);

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

    await syncBusinessSettings();
  };

  const handleLogout = async () => {
    try {
      await revokeToken();
    } catch (error) {
      console.warn("RevokeToken isteği tamamlanamadı:", error);
    } finally {
      clearAuthSession();

      setAuthUser(null);
      setSettings(defaultSettings);
      setSubscription(defaultSubscription);
      setSelectedDetailRecord(null);
      setSelectedPrintRecord(null);
      setIsAddModalOpen(false);
      setCurrentView("landing");

      showToast("Güvenli çıkış yapıldı.", "info");
    }
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
    setIsAddModalOpen(false);
    setHistoryRefreshKey((currentKey) => currentKey + 1);

    if (autoPrint) {
      window.setTimeout(() => {
        setSelectedPrintRecord(newRecord);
      }, 100);
    }
  };

  const handleOpenDetailRecord = (record: TireRecord) => {
    /**
     * Detay modalı artık kendi içinde:
     * Tire/GetById → Vehicle/GetById → Client/GetById
     * akışını çalıştırıyor.
     */
    setSelectedDetailRecord(record);
  };

  const handleUpdateRecord = async (
    updatedRecord: TireRecord,
    autoPrint: boolean
  ) => {
    setSelectedDetailRecord(updatedRecord);
    setHistoryRefreshKey((currentKey) => currentKey + 1);

    if (autoPrint) {
      window.setTimeout(() => {
        setSelectedPrintRecord(updatedRecord);
      }, 100);
    }
  };

  const handleDeliveredRecord = async () => {
    setHistoryRefreshKey((currentKey) => currentKey + 1);
  };

  const handleIncrementPrint = () => {
    /**
     * Print sayacı için backend endpoint yoksa local sayaç tutulmaz.
     */
  };

  const handleResetDatabase = async () => {
    showToast(
      "Bulut verileri uygulama içinden sıfırlanamaz. İşletme ayarları yeniden yüklendi.",
      "warning"
    );

    await syncBusinessSettings();
    setActiveTab("dashboard");
  };

  const handleSubscriptionChange = async () => {
    /**
     * Abonelik endpointi netleşene kadar App içinde global veri yenilemesi yapılmaz.
     */
    setSubscription(defaultSubscription);
  };

  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-xl">
          <p className="text-sm font-bold text-slate-900">
            Oturum kontrol ediliyor...
          </p>

          <p className="mt-1 text-xs text-slate-400">Lütfen bekleyin.</p>
        </div>
      </div>
    );
  }

  if (currentView === "landing") {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <LandingPage onNavigate={(view) => setCurrentView(view)} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  if (currentView === "login") {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
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
      <div className="flex min-h-screen flex-col bg-slate-50">
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
            historyRefreshKey={historyRefreshKey}
            onAddTireClick={() => setIsAddModalOpen(true)}
            onSearchRedirect={handleDashboardSearchRedirect}
            onOpenDetail={handleOpenDetailRecord}
            onOpenLabelPrinter={(record) => setSelectedPrintRecord(record)}
          />
        )}

        {activeTab === "reminders" && (
          <RemindersPage
            customers={[]}
            vehicles={[]}
            records={[]}
            settings={settings}
            showToast={showToast}
          />
        )}

        {activeTab === "customers" && <CustomersPage showToast={showToast} />}

        {activeTab === "vehicles" && <VehiclesPage showToast={showToast} />}

        {activeTab === "storage" && (
          <StoragePage
            initialSearchQuery={searchRedirectQuery}
            onOpenDetail={handleOpenDetailRecord}
            onOpenLabelPrinter={(record) => setSelectedPrintRecord(record)}
          />
        )}

        {activeTab === "history" && <HistoryPage />}

        {activeTab === "subscription" && (
          <SubscriptionPage
            subscription={subscription}
            onSubscriptionChange={handleSubscriptionChange}
            showToast={showToast}
          />
        )}

        {activeTab === "settings" && (
          <SettingsPage
            onResetDatabase={handleResetDatabase}
            showToast={showToast}
            onSaveSuccess={syncBusinessSettings}
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
          onClose={() => setSelectedPrintRecord(null)}
          onIncrementPrint={handleIncrementPrint}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}