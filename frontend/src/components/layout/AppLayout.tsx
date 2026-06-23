import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BellRing,
  Car,
  CreditCard,
  Database,
  History as HistoryIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  PlusCircle,
  Settings2,
  Tag,
  Users2,
  X,
  type LucideIcon
} from "lucide-react";

import type {
  ActiveTab,
  AppSettings,
  AuthUser
} from "../../types";

interface AppLayoutProps {
  children: ReactNode;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
  settings: AppSettings;
  onLogout?: () => void;
  authUser?: AuthUser | null;
}

interface MenuItem {
  id: ActiveTab;
  name: string;
  Icon: LucideIcon;
  isModalTrigger?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const APP_VERSION = "v2.0.3";

const MENU_GROUPS: MenuGroup[] = [
  {
    label: "Genel",
    items: [
      {
        id: "dashboard",
        name: "Dashboard",
        Icon: LayoutDashboard
      },
      {
        id: "add-tire",
        name: "Lastik Ekle",
        Icon: PlusCircle,
        isModalTrigger: true
      }
    ]
  },
  {
    label: "Operasyon",
    items: [
      {
        id: "customers",
        name: "Müşteriler",
        Icon: Users2
      },
      {
        id: "vehicles",
        name: "Araçlar",
        Icon: Car
      },
      {
        id: "storage",
        name: "Depo",
        Icon: Database
      },
      {
        id: "history",
        name: "İşlem Geçmişi",
        Icon: HistoryIcon
      },
      {
        id: "reminders",
        name: "Hatırlatmalar",
        Icon: BellRing
      }
    ]
  },
  {
    label: "Sistem",
    items: [
      {
        id: "subscription",
        name: "Abonelik",
        Icon: CreditCard
      },
      {
        id: "settings",
        name: "Ayarlar",
        Icon: Settings2
      }
    ]
  }
];

const PAGE_TITLES: Partial<Record<ActiveTab, string>> = {
  dashboard: "Dashboard",
  customers: "Müşteriler",
  vehicles: "Araçlar",
  storage: "Depo",
  history: "İşlem Geçmişi",
  reminders: "Hatırlatmalar",
  subscription: "Abonelik",
  settings: "Ayarlar"
};

export default function AppLayout({
  children,
  activeTab,
  onTabChange,
  onOpenAddModal,
  settings,
  onLogout,
  authUser
}: AppLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const businessName =
    settings.businessName?.trim() || "LastikOtelim";

  const currentPageTitle = useMemo(
    () => PAGE_TITLES[activeTab] || "LastikOtelim",
    [activeTab]
  );

  useEffect(() => {
    document.body.classList.toggle(
      "overflow-hidden",
      isMobileSidebarOpen
    );

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isMobileSidebarOpen]);

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleMenuItemClick = (item: MenuItem) => {
    closeMobileSidebar();

    if (item.isModalTrigger) {
      onOpenAddModal();
      return;
    }

    onTabChange(item.id);
  };

  const handleLogout = () => {
    closeMobileSidebar();
    onLogout?.();
  };

  return (
    <div className="flex h-dvh min-h-0 w-full min-w-0 overflow-hidden bg-slate-50 text-slate-950">
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex h-dvh w-[248px] shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Tag className="h-4 w-4" strokeWidth={2.2} />
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">
                LastikOtelim
              </div>

              <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
                {businessName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeMobileSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Menüyü kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {MENU_GROUPS.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">
                {group.label}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isSelected =
                    !item.isModalTrigger && activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleMenuItemClick(item)}
                      className={`group flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[12px] font-semibold transition ${
                        item.isModalTrigger
                          ? "border border-blue-500/20 bg-blue-500/10 text-blue-300 hover:bg-blue-500/15"
                          : isSelected
                            ? "bg-white/10 text-white"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <item.Icon
                        className={`h-4 w-4 ${
                          isSelected
                            ? "text-blue-400"
                            : item.isModalTrigger
                              ? "text-blue-400"
                              : "text-slate-500 group-hover:text-slate-300"
                        }`}
                        strokeWidth={2}
                      />

                      <span className="truncate">
                        {item.name}
                      </span>

                      {isSelected && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
            <p className="truncate text-[11px] font-semibold text-white">
              {authUser?.ownerName || businessName}
            </p>

            <p className="mt-1 truncate text-[9px] text-slate-500">
              {businessName}
            </p>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[11px] font-semibold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </button>
          )}

          <p className="mt-2 text-center text-[8px] text-slate-700">
            LastikOtelim {APP_VERSION}
          </p>
        </div>
      </aside>

      {isMobileSidebarOpen && (
        <button
          type="button"
          onClick={closeMobileSidebar}
          className="no-print fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          aria-label="Menüyü kapat"
        />
      )}

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="no-print flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
              aria-label="Menüyü aç"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-950">
                {currentPageTitle}
              </h1>

              <p className="mt-0.5 hidden truncate text-[10px] text-slate-500 sm:block">
                {businessName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-[11px] font-bold text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">
              Lastik Ekle
            </span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4 lg:p-5">
          <div className="mx-auto h-full min-h-0 w-full max-w-[1560px] overflow-hidden">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
