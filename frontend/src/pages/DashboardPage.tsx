import React, { useState } from "react";
import {
  Plus,
  Search,
  Layers,
  ClipboardList,
  Users,
  Snowflake,
  ShieldCheck,
  Printer,
  ArrowRight,
  Crown,
  CreditCard
} from "lucide-react";
import {
  TireRecord,
  Customer,
  Vehicle,
  SystemStats,
  UserSubscription
} from "../types";

interface DashboardPageProps {
  stats: SystemStats;
  recentRecords: {
    record: TireRecord;
    customer: Customer | undefined;
    vehicle: Vehicle | undefined;
  }[];
  subscription: UserSubscription;
  onAddTireClick: () => void;
  onOpenSubscription: () => void;
  onSearchRedirect: (
    tab: "records" | "storage" | "customers",
    query: string
  ) => void;
  onOpenDetail: (record: TireRecord) => void;
  onOpenLabelPrinter: (record: TireRecord) => void;
}

export default function DashboardPage({
  stats,
  recentRecords,
  subscription,
  onAddTireClick,
  onOpenSubscription,
  onSearchRedirect,
  onOpenDetail,
  onOpenLabelPrinter
}: DashboardPageProps) {
  const [codeQuery, setCodeQuery] = useState("");
  const [phonePlateQuery, setPhonePlateQuery] = useState("");
  const [shelfQuery, setShelfQuery] = useState("");

  const subscriptionStatusLabel = subscription.isActive
    ? "Abonelik Aktif"
    : "Abonelik Yok";

  const formatSubscriptionDate = (date?: string) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };

  const handleCodeSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (codeQuery.trim()) {
      onSearchRedirect("records", codeQuery.trim());
    }
  };

  const handlePhonePlateSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (phonePlateQuery.trim()) {
      onSearchRedirect("records", phonePlateQuery.trim());
    }
  };

  const handleShelfSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (shelfQuery.trim()) {
      onSearchRedirect("storage", shelfQuery.trim());
    }
  };

  return (
    <div className="space-y-8 pb-12 text-slate-950 animate-slide-in">
      {/* 1. PREMIUM HERO CARD */}
      <div className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-8 shadow-xl md:flex-row md:items-center">
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-60 w-60 rounded-full bg-indigo-500/5 blur-3xl" />

        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Lastik Takip Sistemi Live
          </span>

          <h2 className="font-sans text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Lastik Takip Paneli
          </h2>

          <p className="max-w-xl text-sm leading-relaxed text-slate-300">
            Lastik kayıtlarını, müşteri bilgilerini ve depo konumlarını hızlıca
            yönetin. Fiş ve barkod yazdırarak teslimatları planlayın.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddTireClick}
          className="relative z-10 flex items-center justify-center gap-2.5 self-start rounded-2xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] md:self-auto"
        >
          <Plus className="h-5 w-5 stroke-[2.5]" />
          Yeni Lastik Kaydı
        </button>
      </div>

      {/* 1.5 SUBSCRIPTION STATUS CARD */}
      <div
        className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-sm transition-all duration-300 ${
          subscription.isActive
            ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
            : "border-blue-100 bg-gradient-to-br from-white via-blue-50/60 to-indigo-50"
        }`}
      >
        <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                subscription.isActive
                  ? "bg-emerald-500 text-white shadow-emerald-500/20"
                  : "bg-blue-600 text-white shadow-blue-600/20"
              }`}
            >
              {subscription.isActive ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <Crown className="h-6 w-6" />
              )}
            </div>

            <div>
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                  subscription.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                <CreditCard className="h-3 w-3" />
                {subscriptionStatusLabel}
              </div>

              <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">
                {subscription.isActive
                  ? `${subscription.planName} planı aktif`
                  : "Abonelik planı seçilmedi"}
              </h3>

              <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
                {subscription.isActive
                  ? `Aboneliğiniz aktif. Yenileme tarihi: ${formatSubscriptionDate(
                      subscription.renewalDate
                    )}`
                  : "LastikOtelim’i tam kapasite kullanmak için işletmenize uygun bir abonelik planı seçin."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSubscription}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-xs font-black shadow-sm transition-all active:scale-[0.98] ${
              subscription.isActive
                ? "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                : "bg-blue-600 text-white shadow-blue-600/25 hover:bg-blue-700"
            }`}
          >
            {subscription.isActive ? "Planı Yönet" : "Abone Ol"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. QUICK LOOKUP TOOLS */}
      <div className="space-y-3">
        <h3 className="pl-1 text-xs font-bold uppercase tracking-widest text-slate-400">
          Hızlı Sorgulama Kanalları
        </h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Lookup Code */}
          <div className="space-y-3.5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-colors hover:border-slate-300">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Printer className="h-4 w-4" />
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                LastikCode Sorgula
              </label>
            </div>

            <form onSubmit={handleCodeSearch} className="flex gap-2">
              <input
                type="text"
                value={codeQuery}
                aria-label="Lastik Kodu Sorgula"
                onChange={(e) => setCodeQuery(e.target.value)}
                placeholder="LT-2026-xxxxx..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-xs font-semibold uppercase text-slate-800 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10"
              />

              <button
                type="submit"
                className="rounded-xl bg-slate-900 p-2.5 text-white transition-colors hover:bg-slate-800 active:scale-95"
                title="Ara"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Lookup Plate / Phone */}
          <div className="space-y-3.5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-colors hover:border-slate-300">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Users className="h-4 w-4" />
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Plaka veya Telefon Ara
              </label>
            </div>

            <form onSubmit={handlePhonePlateSearch} className="flex gap-2">
              <input
                type="text"
                value={phonePlateQuery}
                aria-label="Plaka Veya Telefon Ara"
                onChange={(e) => setPhonePlateQuery(e.target.value)}
                placeholder="19AFC... veya 0532..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase text-slate-800 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10"
              />

              <button
                type="submit"
                className="rounded-xl bg-slate-900 p-2.5 text-white transition-colors hover:bg-slate-800 active:scale-95"
                title="Ara"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Lookup Shelf */}
          <div className="col-span-1 space-y-3.5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-colors hover:border-slate-300 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Layers className="h-4 w-4" />
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Depo Raf Konumu Sorgula
              </label>
            </div>

            <form onSubmit={handleShelfSearch} className="flex gap-2">
              <input
                type="text"
                value={shelfQuery}
                aria-label="Depo Rafı sorgula"
                onChange={(e) => setShelfQuery(e.target.value)}
                placeholder="A5-3, B2 ..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-xs font-semibold uppercase text-slate-800 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10"
              />

              <button
                type="submit"
                className="rounded-xl bg-slate-900 p-2.5 text-white transition-colors hover:bg-slate-800 active:scale-95"
                title="Ara"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 3. CORE STATISTICS GRID */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5 xl:gap-5">
        {/* Stat 1 */}
        <div className="group flex min-h-[145px] flex-col justify-between rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all duration-300 group-hover:bg-blue-100">
              <ClipboardList className="h-5 w-5" />
            </div>

            <span className="shrink-0 whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-blue-700">
              Aktif
            </span>
          </div>

          <div className="text-left">
            <p className="text-3xl font-black leading-none tracking-tight text-slate-950 sm:text-4xl">
              {stats.totalRecords}
            </p>
            <p className="mt-2 text-[11px] font-bold leading-tight text-slate-500 sm:text-sm">
              Toplam Emanet Bilgisi
            </p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="group flex min-h-[145px] flex-col justify-between rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-all duration-300 group-hover:bg-amber-100">
              <Layers className="h-5 w-5" />
            </div>

            <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-amber-700">
              {Math.min(100, Math.round((stats.inStorage / 1000) * 100))}% Dolu
            </span>
          </div>

          <div className="text-left">
            <p className="text-3xl font-black leading-none tracking-tight text-slate-950 sm:text-4xl">
              {stats.inStorage}
              <span className="ml-1 text-xs font-bold text-slate-400 sm:text-sm">
                /1000
              </span>
            </p>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-700"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((stats.inStorage / 1000) * 100)
                  )}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="group flex min-h-[145px] flex-col justify-between rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 transition-all duration-300 group-hover:bg-purple-100">
              <Users className="h-5 w-5" />
            </div>

            <span className="shrink-0 whitespace-nowrap rounded-full bg-purple-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-purple-700">
              Cari
            </span>
          </div>

          <div className="text-left">
            <p className="text-3xl font-black leading-none tracking-tight text-slate-950 sm:text-4xl">
              {stats.totalCustomers}
            </p>
            <p className="mt-2 text-[11px] font-bold leading-tight text-slate-500 sm:text-sm">
              Toplam Kayıtlı Müşteri
            </p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="group flex min-h-[145px] flex-col justify-between rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition-all duration-300 group-hover:bg-sky-100">
              <Snowflake className="h-5 w-5" />
            </div>

            <span className="shrink-0 whitespace-nowrap rounded-full bg-sky-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-sky-700">
              Bu Ay
            </span>
          </div>

          <div className="text-left">
            <p className="text-3xl font-black leading-none tracking-tight text-slate-950 sm:text-4xl">
              +{stats.addedThisMonth}
            </p>
            <p className="mt-2 text-[11px] font-bold leading-tight text-slate-500 sm:text-sm">
              Yeni Eklenen Lastik
            </p>
          </div>
        </div>

        {/* Stat 5 */}
        <div className="group col-span-2 flex min-h-[145px] flex-col justify-between rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md lg:col-span-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 transition-all duration-300 group-hover:bg-orange-100">
              <Printer className="h-5 w-5" />
            </div>

            <span className="shrink-0 whitespace-nowrap rounded-full bg-orange-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-orange-700">
              Etiket
            </span>
          </div>

          <div className="text-left">
            <p className="text-3xl font-black leading-none tracking-tight text-slate-950 sm:text-4xl">
              {stats.printedLabelsCount}
              <span className="ml-1 text-xs font-bold text-slate-400 sm:text-sm">
                adet
              </span>
            </p>
            <p className="mt-2 text-[11px] font-bold leading-tight text-slate-500 sm:text-sm">
              Basılan Fiş Çıktısı
            </p>
          </div>
        </div>
      </div>

      {/* 4. RECENT DEPOSITS CARDS PANEL */}
      <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Sistemdeki Son Emanet Kayıtları
          </h3>

          <button
            type="button"
            onClick={() => onSearchRedirect("records", "")}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Tüm Kayıtları Gör
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="text-slate-800">
          {recentRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-slate-400">
              <ClipboardList className="h-8 w-8 text-slate-300" />
              <p className="font-semibold text-slate-500">
                Henüz lastik emanet kaydı oluşturulmadı.
              </p>

              <button
                type="button"
                onClick={onAddTireClick}
                className="mt-1 text-xs font-bold text-blue-600 underline"
              >
                İlk emaneti şimdi kaydet
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[700px] table-auto border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/20 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <th className="px-6 py-4">Görsel</th>
                      <th className="px-6 py-4">Müşteri / Cari</th>
                      <th className="px-6 py-4">Araç Plakası</th>
                      <th className="px-6 py-4">Lastik Marka / Özellik</th>
                      <th className="px-6 py-4">Depo Rafı</th>
                      <th className="px-6 py-4 font-mono">Emanet Kodu</th>
                      <th className="px-6 py-4 text-right">İşlemler</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {recentRecords.map(({ record, customer, vehicle }) => {
                      const coverPhoto = record.photos?.[0]?.dataUrl;

                      return (
                        <tr
                          key={record.id}
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          <td className="px-6 py-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                              {coverPhoto ? (
                                <img
                                  src={coverPhoto}
                                  alt={record.brand}
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="p-1 text-center font-sans text-[9px] font-black leading-3 text-slate-400">
                                  Görsel Yok
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-3.5">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">
                                {customer?.fullName || "Bilinmeyen Cari"}
                              </span>
                              <span className="mt-0.5 text-[11px] font-normal text-slate-400">
                                {customer?.phone || "-"}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-3.5">
                            <span className="rounded-lg border border-blue-100/50 bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-blue-700">
                              {vehicle?.plate || "-"}
                            </span>
                          </td>

                          <td className="px-6 py-3.5">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">
                                {record.brand}
                              </span>
                              <span className="mt-0.5 text-[11px] font-normal text-slate-400">
                                {record.size} • {record.quantity} Adet •{" "}
                                {record.tireType}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-3.5">
                            <span className="rounded-md border border-amber-100 bg-amber-50 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-amber-700">
                              {record.storageLocation || "Girilmedi"}
                            </span>
                          </td>

                          <td className="px-6 py-3.5 font-mono text-[11px]">
                            <span className="rounded border border-slate-200/60 bg-slate-100 px-2.5 py-1 font-bold text-slate-700">
                              {record.tireCode}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-6 py-3.5 text-right">
                            <div className="flex justify-end gap-2.5">
                              <button
                                type="button"
                                onClick={() => onOpenDetail(record)}
                                className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 active:scale-95"
                              >
                                İncele
                              </button>

                              <button
                                type="button"
                                onClick={() => onOpenLabelPrinter(record)}
                                className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                                title="Yazdır"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="block divide-y divide-slate-100 md:hidden">
                {recentRecords.map(({ record, customer, vehicle }) => {
                  const coverPhoto = record.photos?.[0]?.dataUrl;

                  return (
                    <div
                      key={record.id}
                      className="space-y-4 p-4 transition-colors hover:bg-slate-50/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                            {coverPhoto ? (
                              <img
                                src={coverPhoto}
                                alt={record.brand}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="p-1 text-center text-[8px] font-bold leading-3 text-slate-400">
                                No Img
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-bold text-slate-900">
                              {customer?.fullName || "Bilinmeyen Cari"}
                            </h4>
                            <p className="text-xs font-medium text-slate-500">
                              {customer?.phone || "-"}
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-lg border border-blue-100/50 bg-blue-50 px-2 py-0.5 font-mono text-xs font-black uppercase tracking-wider text-blue-700">
                          {vehicle?.plate || "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 p-3 text-xs">
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">
                            Lastik Özelliği
                          </span>
                          <span className="mt-0.5 block truncate font-extrabold text-slate-800">
                            {record.brand}
                          </span>
                          <span className="block text-[11px] font-medium text-slate-500">
                            {record.size} • {record.quantity} Adet •{" "}
                            {record.tireType}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">
                            Depo Raf Konumu
                          </span>
                          <span className="mt-1 inline-block rounded-md border border-amber-100 bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-wider text-amber-700">
                            {record.storageLocation || "Girilmedi"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="shrink-0 font-mono text-[10px]">
                          <span className="rounded border border-slate-200 bg-slate-100 px-2 py-1 font-medium text-slate-500">
                            {record.tireCode}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenDetail(record)}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200 active:scale-95"
                          >
                            İncele
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenLabelPrinter(record)}
                            className="rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2 text-blue-600 transition-all hover:bg-blue-100 active:scale-95"
                            title="Yazdır"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5. QUICK FOOTER */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
          <div>
            <h4 className="text-base font-bold">Hızlı Depo Kontrolü</h4>
            <p className="mt-1 text-xs text-blue-100">
              Emanet kartlarındaki LastikCode kodlarını pratik şekilde aratın.
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <line x1="7" x2="17" y1="12" y2="12" />
            </svg>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div>
            <h4 className="text-base font-bold text-slate-800">
              Güvenli Veri Altyapısı
            </h4>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Bütün bilgileriniz internete sızmadan tarayıcınızda depo edilir.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-emerald-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold">Çevrimiçi</span>
          </div>
        </div>
      </div>
    </div>
  );
}