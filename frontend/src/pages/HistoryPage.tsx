import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Calendar,
  Car,
  CheckCircle,
  MapPin,
  Package,
  PencilLine,
  PlusCircle,
  RefreshCw,
  Search,
  User
} from "lucide-react";

import {
  HistoryListItemDto,
  historyApi
} from "../services/tireApi";

import { normalizeTurkish } from "../utils/helpers";

type HistoryFilter = "all" | "add" | "update" | "delete";

const HISTORY_FILTERS: {
  id: HistoryFilter;
  label: string;
}[] = [
  { id: "all", label: "Tümü" },
  { id: "add", label: "Yeni" },
  { id: "update", label: "Düzenleme" },
  { id: "delete", label: "Teslim" }
];

function formatHistoryDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getHistoryVisual(type: string) {
  switch (type) {
    case "add":
      return {
        label: "Yeni Kayıt",
        badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
        iconClass: "bg-emerald-100 text-emerald-600",
        Icon: PlusCircle
      };

    case "update":
      return {
        label: "Düzenleme",
        badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
        iconClass: "bg-amber-100 text-amber-600",
        Icon: PencilLine
      };

    case "delete":
      return {
        label: "Teslim Edildi",
        badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
        iconClass: "bg-rose-100 text-rose-600",
        Icon: CheckCircle
      };

    default:
      return {
        label: "İşlem",
        badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
        iconClass: "bg-slate-100 text-slate-600",
        Icon: Activity
      };
  }
}

export default function HistoryPage() {
  const [histories, setHistories] = useState<HistoryListItemDto[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] =
    useState<HistoryFilter>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadHistories = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await historyApi.getHistories({
        page: 0,
        pageSize: 1000
      });

      const items = [...(response.items || [])].sort(
        (a, b) =>
          new Date(b.createdDate).getTime() -
          new Date(a.createdDate).getTime()
      );

      setHistories(items);

      setSelectedHistoryId((currentId) => {
        if (currentId && items.some((item) => item.id === currentId)) {
          return currentId;
        }

        return items[0]?.id ?? null;
      });
    } catch (error) {
      console.error("İşlem geçmişi yüklenemedi:", error);

      setHistories([]);
      setSelectedHistoryId(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "İşlem geçmişi yüklenirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistories();
  }, []);

  const filteredHistories = useMemo(() => {
    const normalizedQuery = normalizeTurkish(searchQuery.trim());

    return histories.filter((history) => {
      if (
        selectedFilter !== "all" &&
        history.typeConstantValue !== selectedFilter
      ) {
        return false;
      }

      if (!normalizedQuery) return true;

      const searchableText = [
        history.clientName,
        history.licensePlate,
        history.model,
        history.brand,
        history.sizes,
        history.code,
        history.storageLocation,
        history.typeConstantName,
        history.createdUsername
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeTurkish(searchableText).includes(normalizedQuery);
    });
  }, [histories, searchQuery, selectedFilter]);

  useEffect(() => {
    if (
      selectedHistoryId &&
      filteredHistories.some((item) => item.id === selectedHistoryId)
    ) {
      return;
    }

    setSelectedHistoryId(filteredHistories[0]?.id ?? null);
  }, [filteredHistories, selectedHistoryId]);

  const selectedHistory = histories.find(
    (history) => history.id === selectedHistoryId
  );

  return (
    <div className="grid grid-cols-1 gap-6 pb-12 text-slate-950 animate-slide-in lg:grid-cols-12">
      <section className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm lg:col-span-4 lg:h-[calc(100dvh-10rem)]">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/60 p-5">
          <div>
            <h2 className="text-sm font-black text-slate-900">
              İşlem Geçmişi
            </h2>

            <p className="mt-1 text-[11px] font-medium text-slate-400">
              {histories.length} işlem kaydı
            </p>
          </div>

          <button
            type="button"
            onClick={loadHistories}
            disabled={isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            title="Geçmişi yenile"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </header>

        <div className="shrink-0 space-y-3 border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Müşteri, plaka, kod veya kullanıcı ara..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
            {HISTORY_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedFilter(filter.id)}
                className={`rounded-lg px-2 py-2 text-[10px] font-black transition ${
                  selectedFilter === filter.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <p className="text-xs font-bold text-slate-500">
                İşlem geçmişi yükleniyor
              </p>
            </div>
          ) : errorMessage ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
              <Activity className="h-8 w-8 text-rose-300" />
              <p className="text-xs font-black text-rose-700">
                Geçmiş yüklenemedi
              </p>
              <p className="text-[11px] font-medium leading-relaxed text-rose-500">
                {errorMessage}
              </p>
            </div>
          ) : filteredHistories.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
              <Activity className="h-7 w-7 text-slate-300" />
              <p className="text-xs font-bold text-slate-500">
                İşlem kaydı bulunamadı
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredHistories.map((history) => {
                const visual = getHistoryVisual(
                  history.typeConstantValue
                );
                const Icon = visual.Icon;
                const isSelected =
                  selectedHistoryId === history.id;

                return (
                  <button
                    key={history.id}
                    type="button"
                    onClick={() => setSelectedHistoryId(history.id)}
                    className={`relative flex w-full items-start gap-3 px-5 py-4 text-left transition ${
                      isSelected
                        ? "bg-blue-50/80"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
                    )}

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${visual.iconClass}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-xs font-black text-slate-900">
                          {history.clientName || "Bilinmeyen Cari"}
                        </h3>

                        <span
                          className={`shrink-0 rounded-lg border px-2 py-1 text-[9px] font-black ${visual.badgeClass}`}
                        >
                          {visual.label}
                        </span>
                      </div>

                      <p className="mt-1 font-mono text-[11px] font-black uppercase tracking-wider text-blue-700">
                        {history.licensePlate || "-"}
                      </p>

                      <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
                        {history.code} • {formatHistoryDate(history.createdDate)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="lg:col-span-8">
        {selectedHistory ? (
          <HistoryDetail history={selectedHistory} />
        ) : (
          <div className="flex min-h-[620px] flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
            <Activity className="h-9 w-9 text-slate-300" />

            <h2 className="mt-3 text-sm font-black text-slate-700">
              İşlem seçilmedi
            </h2>

            <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
              Detayları görüntülemek için soldaki listeden bir işlem seçin.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function HistoryDetail({
  history
}: {
  history: HistoryListItemDto;
}) {
  const visual = getHistoryVisual(history.typeConstantValue);
  const Icon = visual.Icon;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${visual.iconClass}`}
            >
              <Icon className="h-7 w-7" />
            </div>

            <div>
              <span
                className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black ${visual.badgeClass}`}
              >
                {visual.label}
              </span>

              <h2 className="mt-2 text-lg font-black text-slate-950">
                {history.clientName || "Bilinmeyen Cari"}
              </h2>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              İşlem Tarihi
            </p>

            <p className="mt-1 font-mono text-sm font-black text-slate-800">
              {formatHistoryDate(history.createdDate)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailCard
          icon={<User className="h-5 w-5" />}
          label="Müşteri"
          value={history.clientName || "-"}
        />

        <DetailCard
          icon={<Car className="h-5 w-5" />}
          label="Araç Plakası"
          value={history.licensePlate || "-"}
          mono
        />

        <DetailCard
          icon={<Package className="h-5 w-5" />}
          label="LastikCode"
          value={history.code || "-"}
          mono
        />

        <DetailCard
          icon={<MapPin className="h-5 w-5" />}
          label="Depo Konumu"
          value={history.storageLocation || "Girilmedi"}
          mono
        />
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">
          Lastik Bilgileri
        </h3>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InfoItem label="Marka" value={history.model || "-"} />
          <InfoItem label="Mevsim" value={history.brand || "-"} />
          <InfoItem label="Ebat" value={history.sizes || "-"} />
          <InfoItem
            label="Adet"
            value={`${history.count || 0} adet`}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">
          İşlem Bilgileri
        </h3>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <span className="text-xs font-bold text-slate-500">
              İşlemi Yapan
            </span>

            <span className="text-xs font-black text-slate-900">
              {history.createdUsername || "-"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <span className="text-xs font-bold text-slate-500">
              İşlem Türü
            </span>

            <span className="text-xs font-black text-slate-900">
              {history.typeConstantName || visual.label}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Calendar className="h-4 w-4 text-slate-400" />
              Tarih
            </span>

            <span className="font-mono text-xs font-black text-slate-900">
              {formatHistoryDate(history.createdDate)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
  mono = false
}: {
  icon: ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        {icon}
      </div>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-sm font-black text-slate-900 ${
          mono ? "font-mono uppercase tracking-wider" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}
