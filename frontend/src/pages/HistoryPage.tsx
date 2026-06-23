import {
  useCallback,
  useEffect,
  useState,
  type ReactNode
} from "react";

import {
  Activity,
  ArrowLeft,
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

const HISTORY_PAGE_SIZE = 20;

type HistoryPaginationState = {
  index: number;
  size: number;
  count: number;
  pages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

const EMPTY_HISTORY_PAGINATION: HistoryPaginationState = {
  index: 0,
  size: HISTORY_PAGE_SIZE,
  count: 0,
  pages: 0,
  hasPrevious: false,
  hasNext: false
};

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
        badgeClass:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        iconClass: "bg-emerald-100 text-emerald-600",
        Icon: PlusCircle
      };

    case "update":
      return {
        label: "Düzenleme",
        badgeClass:
          "border-amber-200 bg-amber-50 text-amber-700",
        iconClass: "bg-amber-100 text-amber-600",
        Icon: PencilLine
      };

    case "delete":
      return {
        label: "Teslim Edildi",
        badgeClass:
          "border-rose-200 bg-rose-50 text-rose-700",
        iconClass: "bg-rose-100 text-rose-600",
        Icon: CheckCircle
      };

    default:
      return {
        label: "İşlem",
        badgeClass:
          "border-slate-200 bg-slate-50 text-slate-700",
        iconClass: "bg-slate-100 text-slate-600",
        Icon: Activity
      };
  }
}

export default function HistoryPage() {
  const [histories, setHistories] = useState<
    HistoryListItemDto[]
  >([]);

  const [selectedHistoryId, setSelectedHistoryId] =
    useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedFilter, setSelectedFilter] =
    useState<HistoryFilter>("all");

  const [page, setPage] = useState(0);

  const [pagination, setPagination] =
    useState<HistoryPaginationState>(
      EMPTY_HISTORY_PAGINATION
    );

  const [isMobileDetailOpen, setIsMobileDetailOpen] =
    useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadHistories = useCallback(
    async (targetPage = page) => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await historyApi.getHistories({
          page: targetPage,
          pageSize: HISTORY_PAGE_SIZE,
          searchKey: searchQuery,
          typeConstantValue:
            selectedFilter === "all"
              ? undefined
              : selectedFilter
        });

        const items = [...(response.items || [])].sort(
          (a, b) =>
            new Date(b.createdDate).getTime() -
            new Date(a.createdDate).getTime()
        );

        setHistories(items);

        setPagination({
          index: response.index ?? targetPage,
          size: response.size ?? HISTORY_PAGE_SIZE,
          count: response.count ?? items.length,
          pages: response.pages ?? (items.length > 0 ? 1 : 0),
          hasPrevious:
            response.hasPrevious ?? targetPage > 0,
          hasNext: response.hasNext ?? false
        });

        setSelectedHistoryId((currentId) => {
          if (
            currentId &&
            items.some((item) => item.id === currentId)
          ) {
            return currentId;
          }

          return items[0]?.id ?? null;
        });

        if (items.length === 0) {
          setIsMobileDetailOpen(false);
        }
      } catch (error) {
        console.error("İşlem geçmişi yüklenemedi:", error);

        setHistories([]);
        setSelectedHistoryId(null);
        setPagination(EMPTY_HISTORY_PAGINATION);
        setIsMobileDetailOpen(false);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "İşlem geçmişi yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [page, searchQuery, selectedFilter]
  );

  useEffect(() => {
    loadHistories(page);
  }, [loadHistories, page]);

  useEffect(() => {
    if (
      selectedHistoryId &&
      histories.some((item) => item.id === selectedHistoryId)
    ) {
      return;
    }

    const nextHistoryId = histories[0]?.id ?? null;

    setSelectedHistoryId(nextHistoryId);

    if (!nextHistoryId) {
      setIsMobileDetailOpen(false);
    }
  }, [histories, selectedHistoryId]);

  const selectedHistory = histories.find(
    (history) => history.id === selectedHistoryId
  );

  const totalRecords = pagination.count;
  const totalPages = pagination.pages;
  const currentPageNumber =
    totalPages === 0 ? 0 : page + 1;

  const canGoPrevious =
    !isLoading && (pagination.hasPrevious || page > 0);

  const canGoNext =
    !isLoading &&
    (pagination.hasNext ||
      (totalPages > 0 && page < totalPages - 1));

  const handleSelectHistory = (historyId: number) => {
    setSelectedHistoryId(historyId);
    setIsMobileDetailOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(0);
    setIsMobileDetailOpen(false);
  };

  const handleFilterChange = (filter: HistoryFilter) => {
    setSelectedFilter(filter);
    setPage(0);
    setIsMobileDetailOpen(false);
  };

  const handlePreviousPage = () => {
    if (!canGoPrevious) return;

    setPage((currentPage) =>
      Math.max(0, currentPage - 1)
    );

    setIsMobileDetailOpen(false);
  };

  const handleNextPage = () => {
    if (!canGoNext) return;

    setPage((currentPage) => currentPage + 1);
    setIsMobileDetailOpen(false);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden text-slate-950 animate-slide-in lg:grid-cols-12 lg:gap-6">
      {/* İşlem listesi */}
      <section
        className={`h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-4 lg:flex lg:rounded-3xl ${
          isMobileDetailOpen ? "hidden" : "flex"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900">
              İşlem Geçmişi
            </h2>

            <p className="mt-1 text-[11px] font-medium text-slate-400">
              {totalRecords} işlem kaydı
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadHistories(page)}
            disabled={isLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            title="Geçmişi yenile"
            aria-label="İşlem geçmişini yenile"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isLoading ? "animate-spin" : ""
              }`}
            />
          </button>
        </header>

        {/* Arama ve filtre alanı */}
        <div className="shrink-0 space-y-3 border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                handleSearchChange(event.target.value)
              }
              placeholder="Müşteri, plaka, kod veya kullanıcı ara..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
            {HISTORY_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() =>
                  handleFilterChange(filter.id)
                }
                className={`min-w-0 rounded-lg px-1.5 py-2 text-[10px] font-black transition sm:px-2 ${
                  selectedFilter === filter.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="block truncate">
                  {filter.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Yalnızca işlem listesi kayar */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
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

              <button
                type="button"
                onClick={() => loadHistories(page)}
                className="mt-1 rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
              >
                Tekrar Dene
              </button>
            </div>
          ) : histories.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
              <Activity className="h-7 w-7 text-slate-300" />

              <p className="text-xs font-bold text-slate-500">
                İşlem kaydı bulunamadı
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {histories.map((history) => {
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
                    onClick={() =>
                      handleSelectHistory(history.id)
                    }
                    className={`relative flex w-full items-start gap-3 px-4 py-4 text-left transition sm:px-5 ${
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
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 flex-1 truncate text-xs font-black text-slate-900">
                          {history.clientName ||
                            "Bilinmeyen Cari"}
                        </h3>

                        <span
                          className={`shrink-0 rounded-lg border px-2 py-1 text-[9px] font-black ${visual.badgeClass}`}
                        >
                          {visual.label}
                        </span>
                      </div>

                      <p className="mt-1 truncate font-mono text-[11px] font-black uppercase tracking-wider text-blue-700">
                        {history.licensePlate || "-"}
                      </p>

                      <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
                        {history.code || "-"} •{" "}
                        {formatHistoryDate(
                          history.createdDate
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-400">
            <span>Toplam {totalRecords} kayıt</span>

            <span>
              Sayfa {currentPageNumber} / {totalPages}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={!canGoPrevious}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Önceki
            </button>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={!canGoNext}
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sonraki
            </button>
          </div>
        </footer>
      </section>

      {/* İşlem detay alanı */}
      <section
        className={`h-full min-h-0 flex-col overflow-hidden lg:col-span-8 lg:flex ${
          isMobileDetailOpen ? "flex" : "hidden"
        }`}
      >
        {/* Mobil geri dönüş barı */}
        <div className="mb-3 flex shrink-0 items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm lg:hidden">
          <button
            type="button"
            onClick={() =>
              setIsMobileDetailOpen(false)
            }
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            İşlemlere Dön
          </button>

          <span className="max-w-[145px] truncate pr-2 font-mono text-[10px] font-bold uppercase text-blue-700">
            {selectedHistory?.licensePlate ||
              "İşlem detayı"}
          </span>
        </div>

        {/* Yalnızca detay içeriği kayar */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 pr-0.5 [-webkit-overflow-scrolling:touch]">
          {selectedHistory ? (
            <HistoryDetail history={selectedHistory} />
          ) : (
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12">
              <Activity className="h-9 w-9 text-slate-300" />

              <h2 className="mt-3 text-sm font-black text-slate-700">
                İşlem seçilmedi
              </h2>

              <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
                Detayları görüntülemek için işlem
                listesinden bir kayıt seçin.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function HistoryDetail({
  history
}: {
  history: HistoryListItemDto;
}) {
  const visual = getHistoryVisual(
    history.typeConstantValue
  );

  const Icon = visual.Icon;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* İşlem özeti */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${visual.iconClass}`}
            >
              <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>

            <div className="min-w-0">
              <span
                className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black ${visual.badgeClass}`}
              >
                {visual.label}
              </span>

              <h2 className="mt-2 truncate text-base font-black text-slate-950 sm:text-lg">
                {history.clientName ||
                  "Bilinmeyen Cari"}
              </h2>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-left sm:bg-transparent sm:p-0 sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              İşlem Tarihi
            </p>

            <p className="mt-1 font-mono text-xs font-black text-slate-800 sm:text-sm">
              {formatHistoryDate(history.createdDate)}
            </p>
          </div>
        </div>
      </section>

      {/* Temel bilgiler */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
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
          value={
            history.storageLocation || "Girilmedi"
          }
          mono
        />
      </section>

      {/* Lastik bilgileri */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <h3 className="text-sm font-black text-slate-900">
          Lastik Bilgileri
        </h3>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:grid-cols-4 sm:gap-4">
          <InfoItem
            label="Marka"
            value={history.model || "-"}
          />

          <InfoItem
            label="Mevsim"
            value={history.brand || "-"}
          />

          <InfoItem
            label="Ebat"
            value={history.sizes || "-"}
          />

          <InfoItem
            label="Adet"
            value={`${history.count || 0} adet`}
          />
        </div>
      </section>

      {/* İşlem bilgileri */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <h3 className="text-sm font-black text-slate-900">
          İşlem Bilgileri
        </h3>

        <div className="mt-4 space-y-3 sm:mt-5">
          <div className="flex flex-col gap-1 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-xs font-bold text-slate-500">
              İşlemi Yapan
            </span>

            <span className="break-words text-xs font-black text-slate-900 sm:text-right">
              {history.createdUsername || "-"}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-xs font-bold text-slate-500">
              İşlem Türü
            </span>

            <span className="text-xs font-black text-slate-900 sm:text-right">
              {history.typeConstantName ||
                visual.label}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              Tarih
            </span>

            <span className="font-mono text-xs font-black text-slate-900 sm:text-right">
              {formatHistoryDate(
                history.createdDate
              )}
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
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        {icon}
      </div>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-sm font-black text-slate-900 ${
          mono
            ? "font-mono uppercase tracking-wider"
            : ""
        }`}
        title={value}
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
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:text-[10px]">
        {label}
      </p>

      <p
        className="mt-1 truncate text-xs font-black text-slate-900 sm:text-sm"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}