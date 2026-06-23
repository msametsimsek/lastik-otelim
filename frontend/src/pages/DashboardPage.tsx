import {
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  ArrowRight,
  Boxes,
  CalendarDays,
  Car,
  ChevronRight,
  CircleGauge,
  ClipboardList,
  Database,
  History,
  Layers3,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  UsersRound
} from "lucide-react";

import type {
  Customer,
  SystemStats,
  TireRecord,
  Vehicle
} from "../types";

import {
  historyApi,
  type HistoryListItemDto
} from "../services/tireApi";

interface DashboardPageProps {
  stats: SystemStats;
  recentRecords: {
    record: TireRecord;
    customer: Customer | undefined;
    vehicle: Vehicle | undefined;
  }[];
  historyRefreshKey: number;
  onAddTireClick: () => void;
  onSearchRedirect: (
    tab: "storage" | "customers",
    query: string
  ) => void;
  onOpenDetail: (record: TireRecord) => void;
  onOpenLabelPrinter: (record: TireRecord) => void;
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getHistoryBadge(item: HistoryListItemDto) {
  switch (item.typeConstantValue?.toLowerCase()) {
    case "add":
      return {
        label: "Yeni Kayıt",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        dotClassName: "bg-emerald-500"
      };

    case "delete":
      return {
        label: "Teslim",
        className:
          "border-rose-200 bg-rose-50 text-rose-700",
        dotClassName: "bg-rose-500"
      };

    default:
      return {
        label: "Güncelleme",
        className:
          "border-amber-200 bg-amber-50 text-amber-700",
        dotClassName: "bg-amber-500"
      };
  }
}

export default function DashboardPage({
  stats,
  recentRecords,
  historyRefreshKey,
  onAddTireClick,
  onSearchRedirect,
  onOpenDetail,
  onOpenLabelPrinter
}: DashboardPageProps) {
  const [historyItems, setHistoryItems] = useState<
    HistoryListItemDto[]
  >([]);

  const [isHistoryLoading, setIsHistoryLoading] =
    useState(true);

  const [historyError, setHistoryError] =
    useState("");

  const [historyReloadKey, setHistoryReloadKey] =
    useState(0);

  const storageRate = useMemo(() => {
    if (!stats.totalRecords) return 0;

    return Math.min(
      100,
      Math.round(
        (stats.inStorage / stats.totalRecords) * 100
      )
    );
  }, [stats.inStorage, stats.totalRecords]);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      try {
        setIsHistoryLoading(true);
        setHistoryError("");

        const response =
          await historyApi.getHistories({
            page: 0,
            pageSize: 8
          });

        if (!isMounted) return;

        const sortedItems = [
          ...(response.items || [])
        ]
          .sort(
            (first, second) =>
              new Date(
                second.createdDate
              ).getTime() -
              new Date(
                first.createdDate
              ).getTime()
          )
          .slice(0, 8);

        setHistoryItems(sortedItems);
      } catch (error) {
        console.error(
          "İşlem geçmişi yüklenemedi:",
          error
        );

        if (!isMounted) return;

        setHistoryItems([]);

        setHistoryError(
          error instanceof Error
            ? error.message
            : "İşlem geçmişi yüklenemedi."
        );
      } finally {
        if (isMounted) {
          setIsHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [
    historyRefreshKey,
    historyReloadKey
  ]);

  return (
    <div className="app-page">
      <div className="app-page-scroll">
        <div className="mx-auto w-full max-w-[1680px] space-y-4 pb-4 animate-fade-up sm:space-y-5 sm:pb-6">
          <DashboardHero
            totalRecords={stats.totalRecords}
            inStorage={stats.inStorage}
            storageRate={storageRate}
            onAddTireClick={onAddTireClick}
            onOpenStorage={() =>
              onSearchRedirect("storage", "")
            }
            onOpenCustomers={() =>
              onSearchRedirect("customers", "")
            }
          />

          <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              icon={
                <ClipboardList className="h-5 w-5" />
              }
              label="Aktif Emanet"
              value={stats.totalRecords}
              description="Sistemdeki aktif kayıtlar"
              accentClass="from-blue-500 to-blue-700"
              iconClass="bg-blue-50 text-blue-600"
              trendLabel="Canlı veri"
            />

            <StatCard
              icon={<Layers3 className="h-5 w-5" />}
              label="Raf Girilen Kayıt"
              value={stats.inStorage}
              description="Konumu tanımlı lastikler"
              accentClass="from-amber-400 to-orange-500"
              iconClass="bg-amber-50 text-amber-600"
              trendLabel={`%${storageRate} oran`}
            />

            <StatCard
              icon={<UsersRound className="h-5 w-5" />}
              label="Toplam Müşteri"
              value={stats.totalCustomers}
              description="Kayıtlı müşteri havuzu"
              accentClass="from-violet-500 to-purple-700"
              iconClass="bg-violet-50 text-violet-600"
              trendLabel="Güncel"
            />

            <StatCard
              icon={
                <CalendarDays className="h-5 w-5" />
              }
              label="Bu Ay Eklenen"
              value={stats.addedThisMonth}
              description="Aylık yeni kayıt adedi"
              accentClass="from-emerald-500 to-teal-600"
              iconClass="bg-emerald-50 text-emerald-600"
              trendLabel="Bu ay"
            />
          </section>

          <section className="grid min-h-0 grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <RecentRecordsModule
              records={recentRecords}
              onOpenDetail={onOpenDetail}
              onOpenLabelPrinter={
                onOpenLabelPrinter
              }
              onOpenStorage={() =>
                onSearchRedirect("storage", "")
              }
            />

            <HistoryModule
              items={historyItems}
              isLoading={isHistoryLoading}
              errorMessage={historyError}
              onReload={() =>
                setHistoryReloadKey(
                  (currentKey) =>
                    currentKey + 1
                )
              }
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function DashboardHero({
  totalRecords,
  inStorage,
  storageRate,
  onAddTireClick,
  onOpenStorage,
  onOpenCustomers
}: {
  totalRecords: number;
  inStorage: number;
  storageRate: number;
  onAddTireClick: () => void;
  onOpenStorage: () => void;
  onOpenCustomers: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-slate-800/90 bg-[#081120] text-white shadow-[0_22px_55px_rgba(15,23,42,0.18)] sm:rounded-[28px]">
      <div className="pointer-events-none absolute -left-20 -top-28 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[18%] top-0 h-px w-44 bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-center lg:p-8">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/15 bg-blue-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-blue-200">
            <Sparkles className="h-3.5 w-3.5" />
            Operasyon Merkezi
          </div>

          <h1 className="mt-5 max-w-3xl text-[28px] font-black leading-[1.08] tracking-[-0.045em] !text-white sm:text-[34px] lg:text-[38px]">
            Lastik emanetlerini
            <span className="block bg-gradient-to-r from-blue-300 via-sky-200 to-indigo-300 bg-clip-text text-transparent">
              tek merkezden yönetin.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-[12px] font-medium leading-6 text-slate-400 sm:text-[13px]">
            Yeni kayıt, depo konumu, müşteri ve işlem geçmişini
            aynı operasyon ekranından takip edin.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={onAddTireClick}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-[11px] font-black text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:bg-blue-500 active:translate-y-0"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Yeni Lastik Kaydı
            </button>

            <button
              type="button"
              onClick={onOpenStorage}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-[11px] font-black text-slate-200 transition hover:border-white/20 hover:bg-white/[0.1] hover:text-white"
            >
              <Database className="h-4 w-4" />
              Depoyu Görüntüle
            </button>

            <button
              type="button"
              onClick={onOpenCustomers}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-[11px] font-black text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
            >
              <Users className="h-4 w-4" />
              Müşteriler
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                Depo Organizasyonu
              </p>

              <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                %{storageRate}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-400/20">
              <CircleGauge className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-400 transition-all duration-700"
              style={{
                width: `${storageRate}%`
              }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniMetric
              label="Aktif Emanet"
              value={totalRecords}
            />

            <MiniMetric
              label="Raf Tanımlı"
              value={inStorage}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniMetric({
  label,
  value
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/10 px-3.5 py-3">
      <p className="text-xl font-black tracking-[-0.04em] text-white">
        {value}
      </p>

      <p className="mt-1 text-[9px] font-bold text-slate-500">
        {label}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
  accentClass,
  iconClass,
  trendLabel
}: {
  icon: ReactNode;
  label: string;
  value: number;
  description: string;
  accentClass: string;
  iconClass: string;
  trendLabel: string;
}) {
  return (
    <article className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:border-blue-200/80 hover:shadow-[0_16px_36px_rgba(15,23,42,0.09)] sm:rounded-3xl sm:p-5">
      <span
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentClass}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconClass}`}
        >
          {icon}
        </div>

        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-slate-500">
          <TrendingUp className="h-3 w-3" />
          {trendLabel}
        </span>
      </div>

      <p className="mt-5 text-[28px] font-black leading-none tracking-[-0.045em] text-slate-950 sm:text-[32px]">
        {value}
      </p>

      <p className="mt-2 text-[11px] font-black text-slate-800 sm:text-xs">
        {label}
      </p>

      <p className="mt-1 hidden truncate text-[9px] font-semibold text-slate-400 sm:block">
        {description}
      </p>

      <span className="pointer-events-none absolute -bottom-10 -right-10 h-24 w-24 rounded-full border border-blue-100/70 transition duration-500 group-hover:scale-125" />
    </article>
  );
}

function RecentRecordsModule({
  records,
  onOpenDetail,
  onOpenLabelPrinter,
  onOpenStorage
}: {
  records: {
    record: TireRecord;
    customer: Customer | undefined;
    vehicle: Vehicle | undefined;
  }[];
  onOpenDetail: (record: TireRecord) => void;
  onOpenLabelPrinter: (
    record: TireRecord
  ) => void;
  onOpenStorage: () => void;
}) {
  return (
    <section className="flex h-[470px] min-h-0 flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.055)] sm:h-[520px] sm:rounded-[26px] xl:h-[560px]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/70 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Boxes className="h-4.5 w-4.5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-950">
              Son Emanetler
            </h2>

            <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">
              En son eklenen aktif lastik kayıtları
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenStorage}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-2 text-[10px] font-black text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
        >
          Tümünü Gör
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </header>

      {records.length === 0 ? (
        <EmptyModule
          icon={
            <ClipboardList className="h-7 w-7" />
          }
          title="Henüz emanet kaydı yok"
          description="Yeni lastik kayıtları burada görüntülenecek."
        />
      ) : (
        <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {records.map(
            ({
              record,
              customer,
              vehicle
            }) => (
              <article
                key={record.id}
                className="group flex flex-col gap-4 px-4 py-4 transition hover:bg-[#f8fbff] sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex min-w-0 gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition group-hover:border-blue-100 group-hover:bg-blue-50 group-hover:text-blue-600">
                    <Car className="h-4.5 w-4.5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 font-mono text-[9px] font-black uppercase text-blue-700">
                        {vehicle?.plate || "-"}
                      </span>

                      <span className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 font-mono text-[9px] font-black uppercase text-amber-700">
                        {record.storageLocation ||
                          "Rafsız"}
                      </span>
                    </div>

                    <h3 className="mt-2 truncate text-[13px] font-black text-slate-950">
                      {customer?.fullName ||
                        "Bilinmeyen Cari"}
                    </h3>

                    <p className="mt-1 truncate text-[10px] font-semibold text-slate-500">
                      {record.brand} •{" "}
                      {record.size} •{" "}
                      {record.quantity} adet
                    </p>

                    <p className="mt-1 truncate font-mono text-[9px] font-bold text-slate-400">
                      {record.tireCode} •{" "}
                      {formatDate(
                        record.createdAt
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2 pl-[58px] sm:pl-0">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenDetail(record)
                    }
                    className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:flex-none"
                  >
                    İncele
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onOpenLabelPrinter(
                        record
                      )
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm transition hover:bg-blue-600"
                    title="Etiket yazdır"
                    aria-label="Etiket yazdır"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      )}

      <footer className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
        <p className="text-[9px] font-bold text-slate-400">
          {records.length} son kayıt gösteriliyor
        </p>

        <button
          type="button"
          onClick={onOpenStorage}
          className="inline-flex items-center gap-1 text-[9px] font-black text-slate-500 transition hover:text-blue-600"
        >
          Depoda ara
          <Search className="h-3 w-3" />
        </button>
      </footer>
    </section>
  );
}

function HistoryModule({
  items,
  isLoading,
  errorMessage,
  onReload
}: {
  items: HistoryListItemDto[];
  isLoading: boolean;
  errorMessage: string;
  onReload: () => void;
}) {
  return (
    <section className="flex h-[470px] min-h-0 flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.055)] sm:h-[520px] sm:rounded-[26px] xl:h-[560px]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/70 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <History className="h-4.5 w-4.5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-950">
              Son İşlemler
            </h2>

            <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">
              Giriş, güncelleme ve teslim hareketleri
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReload}
          disabled={isLoading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          title="İşlem geçmişini yenile"
          aria-label="İşlem geçmişini yenile"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              isLoading
                ? "animate-spin"
                : ""
            }`}
          />
        </button>
      </header>

      {isLoading ? (
        <HistorySkeleton />
      ) : errorMessage ? (
        <EmptyModule
          icon={
            <History className="h-7 w-7" />
          }
          title="İşlemler yüklenemedi"
          description={errorMessage}
          actionLabel="Tekrar Dene"
          onAction={onReload}
        />
      ) : items.length === 0 ? (
        <EmptyModule
          icon={
            <History className="h-7 w-7" />
          }
          title="Henüz işlem kaydı yok"
          description="Sistem hareketleri burada görüntülenecek."
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2 [-webkit-overflow-scrolling:touch] sm:px-5">
          <div className="relative">
            <span className="absolute bottom-4 left-[7px] top-4 w-px bg-slate-200" />

            {items.map((item) => {
              const badge =
                getHistoryBadge(item);

              return (
                <article
                  key={item.id}
                  className="group relative flex gap-4 py-3.5"
                >
                  <span
                    className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-white shadow-sm ${badge.dotClassName}`}
                  />

                  <div className="min-w-0 flex-1 rounded-2xl border border-transparent px-3 py-2 transition group-hover:border-slate-200 group-hover:bg-slate-50/80">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wide ${badge.className}`}
                          >
                            {badge.label}
                          </span>

                          <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[9px] font-black uppercase text-slate-700">
                            {item.licensePlate ||
                              "-"}
                          </span>
                        </div>

                        <h3 className="mt-2 truncate text-[12px] font-black text-slate-950">
                          {item.clientName ||
                            "Bilinmeyen Cari"}
                        </h3>
                      </div>

                      <p className="shrink-0 text-[9px] font-bold text-slate-400">
                        {formatDateTime(
                          item.createdDate
                        )}
                      </p>
                    </div>

                    <p className="mt-1 truncate text-[10px] font-semibold text-slate-500">
                      {item.model || "-"} •{" "}
                      {item.sizes || "-"} •{" "}
                      {item.count || 0} adet
                    </p>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate font-mono text-[9px] font-bold text-slate-400">
                        {item.code || "-"} •{" "}
                        {item.createdUsername ||
                          "-"}
                      </p>

                      <span className="rounded-lg bg-amber-50 px-2 py-1 font-mono text-[8px] font-black uppercase text-amber-700">
                        {item.storageLocation ||
                          "Raf belirtilmedi"}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <footer className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
        <p className="text-[9px] font-bold text-slate-400">
          Son {items.length} işlem
        </p>

        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Canlı geçmiş
        </span>
      </footer>
    </section>
  );
}

function HistorySkeleton() {
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-hidden px-4 py-4 sm:px-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex gap-3 rounded-2xl border border-slate-100 p-3"
        >
          <div className="ui-skeleton h-9 w-9 shrink-0 rounded-xl" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="ui-skeleton h-3 w-1/3 rounded-full" />
            <div className="ui-skeleton h-3 w-2/3 rounded-full" />
            <div className="ui-skeleton h-2.5 w-1/2 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyModule({
  icon,
  title,
  description,
  actionLabel,
  onAction
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        {icon}
      </div>

      <p className="mt-4 text-sm font-black text-slate-800">
        {title}
      </p>

      <p className="mt-1 max-w-sm text-[11px] font-medium leading-relaxed text-slate-400">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-[10px] font-black text-white transition hover:bg-blue-600"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
