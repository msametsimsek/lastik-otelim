import React, { useState } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  PlusCircle,
  Archive,
  Users2,
  Database,
  Settings2,
  Calendar,
  Tag,
  CreditCard,
  LogOut,
  BellRing
} from "lucide-react";
import { ActiveTab, AppSettings, AuthUser } from "../../types";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
  settings: AppSettings;
  onLogout?: () => void;
  authUser?: AuthUser | null;
}

const APP_VERSION = "v2.0.3";

export default function AppLayout({
  children,
  activeTab,
  onTabChange,
  onOpenAddModal,
  settings,
  onLogout,
  authUser
}: AppLayoutProps) {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const businessName = settings.businessName || "LastikOtelim";
  const businessType = settings.businessType || "Lastik Takip Sistemi";
  const businessAddress = settings.address || "Lastik Takip Sistemi";

  const menuItems = [
    { id: "dashboard", name: "Dashboard", Icon: LayoutDashboard },
    { id: "add-tire", name: "Lastik Ekle", Icon: PlusCircle, isModalTrigger: true },
    { id: "records", name: "Kayıtlar", Icon: Archive },
    { id: "reminders", name: "Hatırlatmalar", Icon: BellRing },
    { id: "customers", name: "Müşteriler", Icon: Users2 },
    { id: "storage", name: "Depo", Icon: Database },
    { id: "subscription", name: "Abonelik", Icon: CreditCard },
    { id: "settings", name: "Ayarlar", Icon: Settings2 }
  ];

  const handleMenuItemClick = (item: typeof menuItems[0]) => {
    setShowMobileSidebar(false);

    if (item.isModalTrigger) {
      onOpenAddModal();
      return;
    }

    onTabChange(item.id as ActiveTab);
  };

  const handleLogout = () => {
    setShowMobileSidebar(false);
    onLogout?.();
  };

  const formattedToday = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  React.useEffect(() => {
    if (showMobileSidebar) {
      document.body.classList.add("overflow-hidden", "md:overflow-auto");
    } else {
      document.body.classList.remove("overflow-hidden", "md:overflow-auto");
    }

    return () => {
      document.body.classList.remove("overflow-hidden", "md:overflow-auto");
    };
  }, [showMobileSidebar]);

  return (
    <div className="h-screen max-h-screen w-screen bg-slate-50/50 flex flex-col md:flex-row text-slate-900 font-sans overflow-hidden">
      {/* Mobile Top Bar */}
      <header className="md:hidden bg-white border-b border-slate-200 flex items-center justify-between px-5 py-4 mt-0 shrink-0 select-none z-30 sticky top-0 no-print">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/10 shrink-0">
            <Tag className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <h1 className="font-sans font-black tracking-tight text-sm text-slate-800 leading-tight">
              LastikOtelim
            </h1>
            <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5 truncate max-w-[210px]">
              {businessName}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Menü Aç"
        >
          {showMobileSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`
          no-print
          fixed inset-y-0 left-0 z-40 w-[280px] bg-white border-r border-slate-200/80
          flex h-full md:h-screen md:max-h-screen flex-col shrink-0 select-none
          transition-transform duration-300 md:translate-x-0 md:static shadow-xl md:shadow-none
          overflow-hidden
          ${showMobileSidebar ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-full min-h-0 flex-col p-6">
          {/* Sidebar Brand Header */}
          <div className="shrink-0 flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/10 shrink-0">
              <Tag className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h1 className="font-sans font-black text-lg tracking-tight text-slate-800 leading-tight">
                LastikTakip
              </h1>
              <p
                className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide truncate max-w-[160px]"
                title={businessName}
              >
                {businessName}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 flex-1 min-h-0 overflow-y-auto pr-1 space-y-1 font-sans">
            {menuItems.map((item) => {
              const { Icon, id, name } = item;
              const isSelected = activeTab === id;

              return (
                <button
                  key={id}
                  onClick={() => handleMenuItemClick(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer relative ${
                    item.isModalTrigger
                      ? "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200/60 mt-4 active:scale-[0.98]"
                      : isSelected
                        ? "bg-blue-50 text-blue-700 font-bold shadow-sm border-l-4 border-blue-600 pl-3 rounded-l-none rounded-r-xl"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:scale-[0.99]"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      item.isModalTrigger
                        ? "text-slate-500"
                        : isSelected
                          ? "text-blue-600"
                          : "text-slate-400"
                    }`}
                  />

                  <span className="truncate">{name}</span>

                  {isSelected && !item.isModalTrigger && (
                    <span className="absolute right-4 w-1.5 h-1.5 rounded-full bg-blue-600" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="mt-4 shrink-0 space-y-3 border-t border-slate-100 pt-4 pb-[env(safe-area-inset-bottom)]">
            <div className="bg-slate-50 p-[18px] rounded-2xl border border-slate-100 text-xs font-sans space-y-1.5 shadow-sm">
              <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">
                İşletme Bilgisi
              </p>

              <div className="space-y-0.5">
                <p className="font-bold text-slate-800 truncate" title={businessName}>
                  {businessName}
                </p>

                <p className="text-[11px] text-slate-500 truncate" title={businessAddress}>
                  {businessAddress}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/70 bg-white active:scale-[0.98] transition-all cursor-pointer shadow-sm"
              >
                <LogOut className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                Çıkış Yap
              </button>
            )}

            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide">
                LastikOtelim {APP_VERSION}
              </p>
              <p className="text-[9px] text-slate-300 font-medium mt-0.5">
                TeggSoft Creative Systems
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop overlay for mobile sidebar */}
      {showMobileSidebar && (
        <div
          onClick={() => setShowMobileSidebar(false)}
          className="md:hidden fixed inset-0 z-[35] bg-slate-900/20 backdrop-blur-xs no-print"
        />
      )}

      {/* Workspace */}
      <main className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
        {/* Desktop Top Bar */}
        <div className="hidden md:flex items-center justify-between px-8 py-5 h-20 bg-white border-b border-slate-200 shrink-0 select-none no-print">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">
              {businessName} • {businessType}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium shrink-0">
            <Calendar className="w-4 h-4 text-slate-400" />
            {formattedToday}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}