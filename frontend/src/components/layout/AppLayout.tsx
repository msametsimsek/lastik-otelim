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

export default function AppLayout({
  children,
  activeTab,
  onTabChange,
  onOpenAddModal,
  settings,
  onLogout,
  authUser
}: AppLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState(false);

  const businessName =
    settings.businessName?.trim() || "LastikOtelim";

  const businessType =
    settings.businessType?.trim() || "Lastik Takip Sistemi";

  const businessAddress =
    settings.address?.trim() || "Adres bilgisi girilmedi";

  const formattedToday = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date());

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
    <div className="flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#f4f7fb] text-slate-900 lg:flex-row">
      {/* Mobil üst bar */}
      <header className="no-print z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 shadow-sm backdrop-blur-md sm:px-6 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <BrandIcon size="small" />

          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-[-0.02em] text-slate-900">
              LastikOtelim
            </div>

            <p className="mt-0.5 max-w-[210px] truncate text-[11px] font-medium leading-none text-slate-500">
              {businessName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setIsMobileSidebarOpen((currentValue) => !currentValue)
          }
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95"
          aria-label={
            isMobileSidebarOpen ? "Menüyü kapat" : "Menüyü aç"
          }
          aria-expanded={isMobileSidebarOpen}
        >
          {isMobileSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex h-dvh w-[288px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-slate-950 text-white shadow-2xl transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none ${
          isMobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Sidebar marka alanı */}
          <div className="flex h-[78px] shrink-0 items-center justify-between border-b border-white/10 px-5">
            <div className="flex min-w-0 items-center gap-3">
              <BrandIcon />

              <div className="min-w-0">
                {/*
                  Global h1 rengi koyu kalabildiği için burada
                  heading etiketi yerine div kullanılıyor.
                */}
                <div className="truncate text-[18px] font-extrabold leading-tight tracking-[-0.03em] text-white">
                  LastikOtelim
                </div>

                <p
                  className="mt-1 max-w-[168px] truncate text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-slate-300"
                  title={businessName}
                >
                  {businessName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeMobileSidebar}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Menüyü kapat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menü alanı */}
          <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5 [-webkit-overflow-scrolling:touch]">
            {MENU_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2.5 px-3 text-[10px] font-bold uppercase leading-none tracking-[0.18em] text-slate-500">
                  {group.label}
                </p>

                <div className="space-y-1.5">
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

          {/* Sidebar alt alanı */}
          <div className="shrink-0 border-t border-white/10 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
            {/* Minimal işletme kartı */}
            <div className="rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[8px] font-bold uppercase leading-none tracking-[0.16em] text-slate-500">
                  Aktif İşletme
                </p>

                <span className="inline-flex shrink-0 items-center gap-1.5 text-[8px] font-semibold leading-none text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.65)]" />
                  Çevrimiçi
                </span>
              </div>

              <p
                className="mt-2 truncate text-xs font-semibold leading-tight text-white"
                title={businessName}
              >
                {businessName}
              </p>

              <p
                className="mt-1 truncate text-[10px] leading-4 text-slate-400"
                title={businessAddress}
              >
                {businessAddress}
              </p>

              {authUser?.ownerName && (
                <p
                  className="mt-2 truncate border-t border-white/10 pt-2 text-[9px] font-medium leading-none text-slate-500"
                  title={authUser.ownerName}
                >
                  {authUser.ownerName}
                </p>
              )}
            </div>

            {/* Küçük çıkış butonu */}
            {onLogout && (
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-rose-400/15 bg-rose-500/10 px-3 text-xs font-semibold text-rose-300 transition hover:border-rose-400/25 hover:bg-rose-500/15 hover:text-rose-200 active:scale-[0.98]"
              >
                <LogOut className="h-[15px] w-[15px] shrink-0" />
                Çıkış Yap
              </button>
            )}

            {/* Sürüm alanı */}
            <div className="mt-3 text-center">
              <p className="text-[9px] font-medium leading-none tracking-wide text-slate-500">
                LastikOtelim {APP_VERSION}
              </p>

              <p className="mt-1.5 text-[8px] font-medium leading-none text-slate-600">
                Megriva Yazılım ve Dijital Çözümler
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobil sidebar arka planı */}
      {isMobileSidebarOpen && (
        <button
          type="button"
          onClick={closeMobileSidebar}
          className="no-print fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
          aria-label="Menüyü kapat"
        />
      )}

      {/* Ana uygulama alanı */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Masaüstü üst bar */}
        <div className="no-print hidden h-[78px] shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-8 backdrop-blur-md lg:flex">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />

              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-slate-800">
                {businessName}
              </p>

              <p className="mt-1 truncate text-[11px] font-medium leading-none text-slate-500">
                {businessType}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-600">
            <Calendar className="h-4 w-4 text-blue-600" />

            <span className="capitalize">
              {formattedToday}
            </span>
          </div>
        </div>

        {/* Sayfa componentlerinin yerleşeceği sabit alan */}
        <div className="min-h-0 w-full flex-1 overflow-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto h-full min-h-0 w-full max-w-[1600px] overflow-hidden">
            {children}
          </div>
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
    size === "small"
      ? "h-10 w-10 rounded-xl"
      : "h-11 w-11 rounded-xl";

  const iconClass =
    size === "small"
      ? "h-5 w-5"
      : "h-[22px] w-[22px]";

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/20 ring-1 ring-inset ring-white/25 ${containerClass}`}
    >
      <Tag
        className={iconClass}
        strokeWidth={2.2}
      />
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
  const {
    Icon,
    name,
    isModalTrigger
  } = item;

  const baseClass =
    "group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-semibold transition-all duration-200 active:scale-[0.985]";

  const stateClass = isModalTrigger
    ? "border border-blue-400/20 bg-blue-500/10 text-blue-300 hover:border-blue-400/30 hover:bg-blue-500/15 hover:text-blue-200"
    : isSelected
      ? "bg-blue-600 text-white shadow-lg shadow-blue-950/25 ring-1 ring-inset ring-blue-400/20"
      : "text-slate-400 hover:bg-white/[0.07] hover:text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isSelected ? "page" : undefined}
      className={`${baseClass} ${stateClass}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          isModalTrigger
            ? "bg-blue-500/15 text-blue-300"
            : isSelected
              ? "bg-white/15 text-white"
              : "bg-white/[0.04] text-slate-500 group-hover:bg-white/[0.08] group-hover:text-slate-300"
        }`}
      >
        <Icon
          className="h-[17px] w-[17px]"
          strokeWidth={2}
        />
      </span>

      <span className="min-w-0 flex-1 truncate">
        {name}
      </span>

      {isSelected && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
      )}
    </button>
  );
}