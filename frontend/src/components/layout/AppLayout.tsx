import { useEffect, useState, type ReactNode } from "react";
import {
  BellRing,
  Calendar,
  Car,
  CreditCard,
  Database,
  History as HistoryIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Settings2,
  Tag,
  Users2,
  X,
  type LucideIcon
} from "lucide-react";

import { ActiveTab, AppSettings, AuthUser } from "../../types";

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

  const businessName = settings.businessName || "LastikOtelim";
  const businessType = settings.businessType || "Lastik Takip Sistemi";
  const businessAddress = settings.address || "Adres bilgisi girilmedi";

  const formattedToday = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  useEffect(() => {
    document.body.classList.toggle(
      "overflow-hidden",
      isMobileSidebarOpen
    );

    return () => {
      document.body.classList.remove("overflow-hidden");
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
    <div className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-slate-50/50 font-sans text-slate-900 md:h-dvh md:flex-row md:overflow-hidden">
      <header className="no-print sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <BrandIcon size="small" />

          <div className="min-w-0">
            <h1 className="text-sm font-black leading-tight tracking-tight text-slate-800">
              LastikOtelim
            </h1>

            <p className="mt-0.5 max-w-[210px] truncate text-[10px] font-medium leading-none text-slate-400">
              {businessName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setIsMobileSidebarOpen((currentValue) => !currentValue)
          }
          className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 active:bg-slate-100"
          aria-label={isMobileSidebarOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={isMobileSidebarOpen}
        >
          {isMobileSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </header>

      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex h-full w-[280px] shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white shadow-xl transition-transform duration-300 md:static md:h-screen md:max-h-screen md:translate-x-0 md:shadow-none ${
          isMobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-full min-h-0 flex-col p-6">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 pb-4">
            <BrandIcon />

            <div className="min-w-0">
              <h1 className="text-lg font-black leading-tight tracking-tight text-slate-800">
                LastikOtelim
              </h1>

              <p
                className="mt-0.5 max-w-[160px] truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                title={businessName}
              >
                {businessName}
              </p>
            </div>
          </div>

          <nav className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
            {MENU_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">
                  {group.label}
                </p>

                <div className="space-y-1">
                  {group.items.map((item) => (
                    <SidebarMenuItem
                      key={item.id}
                      item={item}
                      isSelected={
                        !item.isModalTrigger &&
                        activeTab === item.id
                      }
                      onClick={() => handleMenuItemClick(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-4 shrink-0 space-y-3 border-t border-slate-100 pt-4 pb-[env(safe-area-inset-bottom)]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                İşletme
              </p>

              <p
                className="mt-2 truncate font-bold text-slate-800"
                title={businessName}
              >
                {businessName}
              </p>

              <p
                className="mt-0.5 truncate text-[11px] text-slate-500"
                title={businessAddress}
              >
                {businessAddress}
              </p>

              {authUser?.ownerName && (
                <p className="mt-2 truncate border-t border-slate-200/70 pt-2 text-[10px] font-semibold text-slate-400">
                  {authUser.ownerName}
                </p>
              )}
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-rose-200/70 bg-white px-4 py-3 text-sm font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-50 hover:text-rose-700 active:scale-[0.98]"
              >
                <LogOut className="h-4.5 w-4.5 shrink-0 text-rose-500" />
                Çıkış Yap
              </button>
            )}

            <div className="text-center">
              <p className="text-[10px] font-semibold tracking-wide text-slate-400">
                LastikOtelim {APP_VERSION}
              </p>

              <p className="mt-0.5 text-[9px] font-medium text-slate-300">
                Megriva Yazılım ve Dijital Çözümler
              </p>
            </div>
          </div>
        </div>
      </aside>

      {isMobileSidebarOpen && (
        <button
          type="button"
          onClick={closeMobileSidebar}
          className="no-print fixed inset-0 z-[35] bg-slate-900/20 backdrop-blur-xs md:hidden"
          aria-label="Menüyü kapat"
        />
      )}

      <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="no-print hidden h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 md:flex">
          <div className="flex min-w-0 items-center gap-2.5 text-xs font-semibold text-slate-500">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />

            <span className="truncate">
              {businessName} • {businessType}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 text-xs font-medium text-slate-500">
            <Calendar className="h-4 w-4 text-slate-400" />
            {formattedToday}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function BrandIcon({
  size = "default"
}: {
  size?: "default" | "small";
}) {
  const containerClass =
    size === "small" ? "h-9 w-9" : "h-10 w-10";

  const iconClass =
    size === "small" ? "h-5 w-5" : "h-5 w-5";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10 ${containerClass}`}
    >
      <Tag className={iconClass} />
    </div>
  );
}

function SidebarMenuItem({
  item,
  isSelected,
  onClick
}: {
  item: MenuItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { Icon, name, isModalTrigger } = item;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
        isModalTrigger
          ? "border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-[0.98]"
          : isSelected
            ? "rounded-l-none border-l-4 border-blue-600 bg-blue-50 pl-3 font-bold text-blue-700 shadow-sm"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.99]"
      }`}
    >
      <Icon
        className={`h-5 w-5 shrink-0 ${
          isModalTrigger || isSelected
            ? "text-blue-600"
            : "text-slate-400"
        }`}
      />

      <span className="truncate">{name}</span>

      {isSelected && (
        <span className="absolute right-4 h-1.5 w-1.5 rounded-full bg-blue-600" />
      )}
    </button>
  );
}
