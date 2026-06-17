import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Calendar,
  ClipboardList,
  History,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  Users
} from "lucide-react";

import {
  Customer,
  SystemStats,
  TireRecord,
  Vehicle
} from "../types";

import {
  HistoryListItemDto,
  historyApi
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

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

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
        label: "Yeni",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700"
      };

    case "delete":
      return {
        label: "Teslim",
        className:
          "border-rose-200 bg-rose-50 text-rose-700"
      };

    default:
      return {
        label: "Düzenleme",
        className:
          "border-amber-200 bg-amber-50 text-amber-700"
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

  const [historyError, setHistoryError] = useState("");
  const [historyReloadKey, setHistoryReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      try {
        setIsHistoryLoading(true);
        setHistoryError("");

        const response = await historyApi.getHistories({
          page: 0,
          pageSize: 8
        });

        if (!isMounted) return;

        const sortedItems = [...(response.items || [])]
          .sort(
            (first, second) =>
              new Date(second.createdDate).getTime() -
              new Date(first.createdDate).getTime()
          )
          .slice(0, 8);

        setHistoryItems(sortedItems);
      } catch (error) {
        console.error("İşlem geçmişi yüklenemedi:", error);

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
  }, [historyRefreshKey, historyReloadKey]);

  return (
    <div className="space-y-6 pb-12 text-slate-950 animate-slide-in">
      <section className="flex flex-col gap-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
            Genel Bakış
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            Lastik Oteli Yönetimi
          </h2>

          <p className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-slate-500">
            Güncel emanet, müşteri ve depo durumunu tek ekrandan takip edin.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddTireClick}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-xs font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Yeni Lastik Kaydı
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Aktif Emanet"
          value={stats.totalRecords}
          iconClass="bg-blue-50 text-blue-600"
        />

        <StatCard
          icon={<Layers className="h-5 w-5" />}
          label="Raf Girilen Kayıt"
          value={stats.inStorage}
          iconClass="bg-amber-50 text-amber-600"
        />

        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Toplam Müşteri"
          value={stats.totalCustomers}
          iconClass="bg-violet-50 text-violet-600"
        />

        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Bu Ay Eklenen"
          value={stats.addedThisMonth}
          iconClass="bg-emerald-50 text-emerald-600"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RecentRecordsModule
          records={recentRecords}
          onOpenDetail={onOpenDetail}
          onOpenLabelPrinter={onOpenLabelPrinter}
          onOpenStorage={() => onSearchRedirect("storage", "")}
        />

        <HistoryModule
          items={historyItems}
          isLoading={isHistoryLoading}
          errorMessage={historyError}
          onReload={() =>
            setHistoryReloadKey((currentKey) => currentKey + 1)
          }
        />
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  iconClass
}: {
  icon: ReactNode;
  label: string;
  value: number;
  iconClass: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconClass}`}
      >
        {icon}
      </div>

      <p className="mt-5 text-3xl font-black leading-none text-slate-950">
        {value}
      </p>

      <p className="mt-2 text-xs font-bold text-slate-500">
        {label}
      </p>
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
  onOpenLabelPrinter: (record: TireRecord) => void;
  onOpenStorage: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-5 py-4">
        <div>
          <h3 className="text-sm font-black text-slate-900">
            Son Emanetler
          </h3>

          <p className="mt-1 text-[11px] font-medium text-slate-400">
            Son eklenen aktif lastik kayıtları
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenStorage}
          className="inline-flex items-center gap-1.5 text-[11px] font-black text-blue-600 transition hover:text-blue-700"
        >
          Depoya Git
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </header>

      {records.length === 0 ? (
        <EmptyModule
          icon={<ClipboardList className="h-7 w-7" />}
          title="Henüz emanet kaydı yok"
          description="Yeni kayıtlar burada görüntülenecek."
        />
      ) : (
        <div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
          {records.map(({ record, customer, vehicle }) => (
            <article
              key={record.id}
              className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 font-mono text-[10px] font-black uppercase text-blue-700">
                    {vehicle?.plate || "-"}
                  </span>

                  <span className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 font-mono text-[10px] font-black uppercase text-amber-700">
                    {record.storageLocation || "Rafsız"}
                  </span>
                </div>

                <h4 className="mt-2 truncate text-sm font-black text-slate-900">
                  {customer?.fullName || "Bilinmeyen Cari"}
                </h4>

                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  {record.brand} • {record.size} • {record.quantity} adet
                </p>

                <p className="mt-1 font-mono text-[10px] font-bold text-slate-400">
                  {record.tireCode} • {formatDate(record.createdAt)}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenDetail(record)}
                  className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                >
                  İncele
                </button>

                <button
                  type="button"
                  onClick={() => onOpenLabelPrinter(record)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                  title="Etiket yazdır"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
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
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-5 py-4">
        <div>
          <h3 className="text-sm font-black text-slate-900">
            Son İşlemler
          </h3>

          <p className="mt-1 text-[11px] font-medium text-slate-400">
            Giriş, düzenleme ve teslim hareketleri
          </p>
        </div>

        <button
          type="button"
          onClick={onReload}
          disabled={isLoading}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          title="İşlem geçmişini yenile"
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
        </button>
      </header>

      {isLoading ? (
        <EmptyModule
          icon={
            <RefreshCw className="h-7 w-7 animate-spin" />
          }
          title="İşlemler yükleniyor"
          description="Lütfen bekleyin."
        />
      ) : errorMessage ? (
        <EmptyModule
          icon={<History className="h-7 w-7" />}
          title="İşlemler yüklenemedi"
          description={errorMessage}
        />
      ) : items.length === 0 ? (
        <EmptyModule
          icon={<History className="h-7 w-7" />}
          title="Henüz işlem kaydı yok"
          description="Sistem hareketleri burada görüntülenecek."
        />
      ) : (
        <div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
          {items.map((item) => {
            const badge = getHistoryBadge(item);

            return (
              <article
                key={item.id}
                className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${badge.className}`}
                    >
                      {badge.label}
                    </span>

                    <span className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 font-mono text-[10px] font-black uppercase text-blue-700">
                      {item.licensePlate || "-"}
                    </span>
                  </div>

                  <h4 className="mt-2 truncate text-sm font-black text-slate-900">
                    {item.clientName || "Bilinmeyen Cari"}
                  </h4>

                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    {item.model || "-"} • {item.sizes || "-"} •{" "}
                    {item.count || 0} adet
                  </p>

                  <p className="mt-1 font-mono text-[10px] font-bold text-slate-400">
                    {item.code || "-"}
                  </p>
                </div>

                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-[10px] font-bold text-slate-500">
                    {formatDateTime(item.createdDate)}
                  </p>

                  <p className="mt-1 max-w-[180px] truncate text-[10px] font-medium text-slate-400">
                    {item.createdUsername || "-"}
                  </p>

                  <p className="mt-1 font-mono text-[10px] font-black uppercase text-amber-700">
                    {item.storageLocation || "Raf belirtilmedi"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyModule({
  icon,
  title,
  description
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 py-10 text-center text-slate-300">
      {icon}

      <div>
        <p className="text-sm font-black text-slate-700">
          {title}
        </p>

        <p className="mt-1 max-w-sm text-xs font-medium leading-relaxed text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}
