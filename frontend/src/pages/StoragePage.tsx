import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

import {
  ArrowLeft,
  Calendar,
  Car,
  FileText,
  Image as ImageIcon,
  Layers,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  Search,
  User
} from "lucide-react";

import type {
  Customer,
  TirePhoto,
  TireRecord,
  TireType,
  Vehicle
} from "../types";

import { buildFilePublicUrl } from "../services/fileApi";

import {
  searchPlaceholders,
  tireApi,
  type TireListItemDto,
  type UploadFileDto
} from "../services/tireApi";

import { formatDate } from "../utils/helpers";

interface StoragePageProps {
  /**
   * Eski App.tsx prop'ları geçici olarak optional bırakıldı.
   * Bu sayfa artık bu verileri kullanmıyor.
   */
  records?: TireRecord[];
  customers?: Customer[];
  vehicles?: Vehicle[];

  initialSearchQuery?: string;
  onOpenDetail: (record: TireRecord) => void;
  onOpenLabelPrinter: (record: TireRecord) => void;
}

const STORAGE_PAGE_SIZE = 20;

type StoragePaginationState = {
  index: number;
  size: number;
  count: number;
  pages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

const EMPTY_STORAGE_PAGINATION: StoragePaginationState = {
  index: 0,
  size: STORAGE_PAGE_SIZE,
  count: 0,
  pages: 0,
  hasPrevious: false,
  hasNext: false
};

function getTireCode(tire: TireListItemDto | null) {
  if (!tire) return "-";
  return tire.code?.trim() || `#${tire.id}`;
}

function getStorageLocation(tire: TireListItemDto | null) {
  if (!tire) return "";
  return tire.storageLocation?.trim() || "";
}

function getVehiclePlate(tire: TireListItemDto | null) {
  if (!tire) return "-";
  return tire.vehicleLicensePlate?.trim() || "-";
}

function getClientName(tire: TireListItemDto | null) {
  if (!tire) return "Müşteri bilgisi yok";
  return tire.clientName?.trim() || "Müşteri bilgisi yok";
}

function getTireBrand(tire: TireListItemDto | null) {
  if (!tire) return "Belirtilmedi";
  return tire.modelConstantName?.trim() || "Belirtilmedi";
}

function getTireSize(tire: TireListItemDto | null) {
  if (!tire) return "Belirtilmedi";
  return tire.sizes?.trim() || "Belirtilmedi";
}

function getTireCount(tire: TireListItemDto | null) {
  if (!tire) return 0;
  return Number(tire.count || 0);
}

function getTireType(tire: TireListItemDto | null): TireType {
  const rawValue = tire?.brandConstantName?.trim() || "";
  const normalizedValue = rawValue.toLocaleLowerCase("tr-TR");

  if (rawValue === "Kışlık" || normalizedValue.includes("kış")) {
    return "Kışlık";
  }

  if (rawValue === "4 Mevsim" || normalizedValue.includes("4")) {
    return "4 Mevsim";
  }

  return "Yazlık";
}

function getTireTypeClasses(tireType: TireType) {
  if (tireType === "Yazlık") {
    return {
      dot: "bg-amber-400",
      badge: "bg-amber-500"
    };
  }

  if (tireType === "Kışlık") {
    return {
      dot: "bg-sky-400",
      badge: "bg-sky-500"
    };
  }

  return {
    dot: "bg-emerald-400",
    badge: "bg-emerald-500"
  };
}

function getBestImageUrl(file: UploadFileDto) {
  const details = Array.isArray(file.details) ? file.details : [];

  const preferredDetail =
    details.find((detail) => detail.imageSize === "medium") ||
    details.find((detail) => detail.imageSize === "small") ||
    details.find((detail) => detail.imageSize === "large") ||
    details.find((detail) => detail.imageSize === "thumb") ||
    details[0];

  const rawUrl =
    preferredDetail?.fileUrl ||
    file.fileUrl ||
    file.url ||
    file.filePath ||
    "";

  return buildFilePublicUrl(rawUrl) || rawUrl;
}

function getOriginalFileUrl(file: UploadFileDto) {
  return file.fileUrl || file.url || file.filePath || "";
}

function getFileName(file: UploadFileDto) {
  return (
    file.orginalName ||
    file.originalName ||
    file.fileName ||
    "Lastik görseli"
  );
}

function getFileKey(file: UploadFileDto) {
  return String(file.id || file.fileId || file.fileUrl || file.fileName);
}

function mapUploadFilesToLegacyPhotos(files: UploadFileDto[] = []): TirePhoto[] {
  return files
    .map((file) => {
      const imageUrl = getBestImageUrl(file);
      const rawFileId = file.fileId || file.id;

      return {
        id: String(rawFileId || imageUrl || getFileName(file)),
        fileId: typeof rawFileId === "number" ? rawFileId : undefined,
        name: getFileName(file),
        type: "image/*",
        dataUrl: imageUrl,
        fileUrl: getOriginalFileUrl(file)
      };
    })
    .filter((photo) => Boolean(photo.dataUrl));
}

/**
 * Geçici uyumluluk adaptörü:
 * StoragePage artık TireListItemDto ile çalışıyor.
 * Ancak App tarafındaki mevcut detay/etiket modalı hâlâ TireRecord beklediği için
 * sadece buton tıklamalarında backend DTO'su eski modal formatına çevriliyor.
 */
function mapTireDtoToLegacyRecord(tire: TireListItemDto): TireRecord {
  const tireType = getTireType(tire);
  const tireCode = getTireCode(tire);
  const brand = getTireBrand(tire);
  const size = getTireSize(tire);
  const quantity = getTireCount(tire);
  const storageLocation = getStorageLocation(tire);
  const plate = getVehiclePlate(tire);
  const customerName = getClientName(tire);

  return {
    id: String(tire.id),
    clientId: "",
    vehicleId: String(tire.vehicleId),
    tireCode,
    tireType,
    brand,
    size,
    quantity,
    storageLocation,
    vehicleNote: "",
    photos: mapUploadFilesToLegacyPhotos(tire.uploadFiles || []),
    createdAt: tire.createdDate,
    updatedAt: tire.createdDate,
    status: "active",
    snapshot: {
      customerName,
      phone: "",
      plate,
      tireCode,
      tireType,
      brand,
      size,
      quantity,
      storageLocation,
      vehicleNote: ""
    }
  };
}

export default function StoragePage({
  initialSearchQuery = "",
  onOpenDetail,
  onOpenLabelPrinter
}: StoragePageProps) {
  const [tires, setTires] = useState<TireListItemDto[]>([]);
  const [selectedTireId, setSelectedTireId] = useState<number | null>(null);
  const [selectedTire, setSelectedTire] = useState<TireListItemDto | null>(
    null
  );

  const selectedTireIdRef = useRef<number | null>(null);

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [page, setPage] = useState(0);

  const [pagination, setPagination] = useState<StoragePaginationState>(
    EMPTY_STORAGE_PAGINATION
  );

  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isLoadingTireDetail, setIsLoadingTireDetail] = useState(false);

  const [recordErrorMessage, setRecordErrorMessage] = useState("");
  const [tireDetailErrorMessage, setTireDetailErrorMessage] = useState("");

  const selectedLegacyRecord = useMemo(
    () => (selectedTire ? mapTireDtoToLegacyRecord(selectedTire) : null),
    [selectedTire]
  );

  const selectedTirePhotos = useMemo(
    () => selectedTire?.uploadFiles || [],
    [selectedTire]
  );

  useEffect(() => {
    selectedTireIdRef.current = selectedTireId;
  }, [selectedTireId]);

  const loadTireDetail = useCallback(async (tireId: number) => {
    try {
      setIsLoadingTireDetail(true);
      setTireDetailErrorMessage("");

      const detail = await tireApi.getTireById(tireId);

      setSelectedTire(detail);
    } catch (error) {
      console.error("Lastik detayı yüklenemedi:", error);

      setSelectedTire(null);

      setTireDetailErrorMessage(
        error instanceof Error
          ? error.message
          : "Lastik detayı yüklenirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setIsLoadingTireDetail(false);
    }
  }, []);

  const loadStorageRecords = useCallback(
    async (
      targetPage = 0,
      options?: {
        search?: string;
        preferredTireId?: number;
      }
    ) => {
      const currentSearch = options?.search ?? searchQuery;

      try {
        setIsLoadingRecords(true);
        setRecordErrorMessage("");

        const response = await tireApi.getTires({
          page: targetPage,
          pageSize: STORAGE_PAGE_SIZE,
          searchKey: currentSearch
        });

        const items = response.items || [];

        setTires(items);

        setPagination({
          index: response.index ?? targetPage,
          size: response.size ?? STORAGE_PAGE_SIZE,
          count: response.count ?? items.length,
          pages: response.pages ?? (items.length > 0 ? 1 : 0),
          hasPrevious: response.hasPrevious ?? targetPage > 0,
          hasNext: response.hasNext ?? false
        });

        const currentSelectedId = selectedTireIdRef.current;
        const preferredTireId = options?.preferredTireId;

        const nextSelectedTire =
          (preferredTireId
            ? items.find((tire) => tire.id === preferredTireId)
            : undefined) ||
          (currentSelectedId
            ? items.find((tire) => tire.id === currentSelectedId)
            : undefined) ||
          items[0];

        if (nextSelectedTire) {
          setSelectedTireId(nextSelectedTire.id);
          selectedTireIdRef.current = nextSelectedTire.id;

          await loadTireDetail(nextSelectedTire.id);
        } else {
          setSelectedTireId(null);
          selectedTireIdRef.current = null;
          setSelectedTire(null);
          setIsMobileDetailOpen(false);
        }
      } catch (error) {
        console.error("Depo kayıtları yüklenemedi:", error);

        setTires([]);
        setSelectedTireId(null);
        selectedTireIdRef.current = null;
        setSelectedTire(null);
        setIsMobileDetailOpen(false);
        setPagination(EMPTY_STORAGE_PAGINATION);

        setRecordErrorMessage(
          error instanceof Error
            ? error.message
            : "Depo kayıtları yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        setIsLoadingRecords(false);
      }
    },
    [loadTireDetail, searchQuery]
  );

  useEffect(() => {
    loadStorageRecords(page);
  }, [loadStorageRecords, page]);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
    setPage(0);
    setIsMobileDetailOpen(false);
  }, [initialSearchQuery]);

  const totalRecords = pagination.count;
  const totalPages = pagination.pages;
  const currentPageNumber = totalPages === 0 ? 0 : page + 1;

  const canGoPrevious =
    !isLoadingRecords && (pagination.hasPrevious || page > 0);

  const canGoNext =
    !isLoadingRecords &&
    (pagination.hasNext || (totalPages > 0 && page < totalPages - 1));

  const handleSelectTire = async (tireId: number) => {
    setSelectedTireId(tireId);
    selectedTireIdRef.current = tireId;
    setIsMobileDetailOpen(true);

    await loadTireDetail(tireId);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(0);
    setIsMobileDetailOpen(false);
  };

  const handlePreviousPage = () => {
    if (!canGoPrevious) return;

    setPage((currentPage) => Math.max(0, currentPage - 1));
    setIsMobileDetailOpen(false);
  };

  const handleNextPage = () => {
    if (!canGoNext) return;

    setPage((currentPage) => currentPage + 1);
    setIsMobileDetailOpen(false);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden text-slate-950 animate-slide-in lg:grid-cols-12 lg:gap-6">
      <section
        className={`h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-4 lg:flex lg:rounded-3xl ${
          isMobileDetailOpen ? "hidden" : "flex"
        }`}
      >
        <header className="shrink-0 border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Layers className="h-4 w-4 shrink-0 text-blue-600" />
                Depo
              </h2>

              <p className="mt-1 text-[11px] font-medium text-slate-400">
                {totalRecords} depo kaydı
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadStorageRecords(page)}
              disabled={isLoadingRecords}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              title="Depo kayıtlarını yenile"
              aria-label="Depo kayıtlarını yenile"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isLoadingRecords ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-wide text-blue-500">
              Backend Toplam Kayıt
            </p>

            <p className="mt-1 text-lg font-black text-blue-800">
              {totalRecords}
            </p>
          </div>
        </header>

        <div className="shrink-0 border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={searchPlaceholders.tire}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {isLoadingRecords ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="text-xs font-bold text-slate-500">
                Depo kayıtları yükleniyor
              </p>
            </div>
          ) : recordErrorMessage ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
              <MapPin className="h-8 w-8 text-rose-300" />

              <p className="text-xs font-black text-rose-700">
                Depo kayıtları yüklenemedi
              </p>

              <p className="text-[11px] font-medium leading-relaxed text-rose-500">
                {recordErrorMessage}
              </p>

              <button
                type="button"
                onClick={() => loadStorageRecords(page)}
                className="mt-1 rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
              >
                Tekrar Dene
              </button>
            </div>
          ) : tires.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
              <MapPin className="h-7 w-7 text-slate-300" />

              <p className="text-xs font-bold text-slate-500">
                Depo kaydı bulunamadı
              </p>

              <p className="max-w-xs text-[10px] leading-relaxed text-slate-400">
                Arama kriterini değiştirerek tekrar deneyin.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tires.map((tire) => {
                const tireType = getTireType(tire);
                const tireTypeClasses = getTireTypeClasses(tireType);
                const isSelected = selectedTireId === tire.id;

                return (
                  <button
                    key={tire.id}
                    type="button"
                    onClick={() => handleSelectTire(tire.id)}
                    className={`relative flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition sm:px-5 ${
                      isSelected ? "bg-blue-50/80" : "hover:bg-slate-50"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 font-mono text-[10px] font-black uppercase text-amber-700">
                          {getStorageLocation(tire) || "Rafsız"}
                        </span>

                        <span className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 font-mono text-[10px] font-black uppercase text-blue-700">
                          {getVehiclePlate(tire)}
                        </span>
                      </div>

                      <h3 className="mt-2 truncate text-xs font-black text-slate-900">
                        {getClientName(tire)}
                      </h3>

                      <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
                        {getTireBrand(tire)} • {getTireSize(tire)} •{" "}
                        {getTireCount(tire)} adet
                      </p>

                      <p className="mt-1 truncate font-mono text-[9px] font-bold text-slate-400">
                        {getTireCode(tire)}
                      </p>
                    </div>

                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${tireTypeClasses.dot}`}
                      title={tireType}
                    />
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

      <section
        className={`h-full min-h-0 flex-col overflow-hidden lg:col-span-8 lg:flex ${
          isMobileDetailOpen ? "flex" : "hidden"
        }`}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileDetailOpen(false)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            Depoya Dön
          </button>

          <span className="max-w-[145px] truncate pr-2 font-mono text-[10px] font-bold uppercase text-amber-700">
            {getStorageLocation(selectedTire) || "Depo detayı"}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 pr-0.5 [-webkit-overflow-scrolling:touch]">
          {isLoadingTireDetail ? (
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="mt-3 text-xs font-bold text-slate-500">
                Lastik detayı yükleniyor
              </p>
            </div>
          ) : tireDetailErrorMessage ? (
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12">
              <MapPin className="h-9 w-9 text-rose-300" />

              <h2 className="mt-3 text-sm font-black text-rose-700">
                Lastik detayı yüklenemedi
              </h2>

              <p className="mt-2 max-w-sm text-xs leading-relaxed text-rose-500">
                {tireDetailErrorMessage}
              </p>

              {selectedTireId && (
                <button
                  type="button"
                  onClick={() => loadTireDetail(selectedTireId)}
                  className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                >
                  Tekrar Dene
                </button>
              )}
            </div>
          ) : selectedTire ? (
            <div className="space-y-4 sm:space-y-6">
              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md sm:h-14 sm:w-14">
                      <Package className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="max-w-full truncate rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-[10px] font-black text-white">
                          {getTireCode(selectedTire)}
                        </span>

                        <span
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-black text-white ${
                            getTireTypeClasses(getTireType(selectedTire)).badge
                          }`}
                        >
                          {getTireType(selectedTire)}
                        </span>
                      </div>

                      <h2 className="mt-2 truncate text-base font-black text-slate-950 sm:text-lg">
                        {getTireBrand(selectedTire)} •{" "}
                        {getTireSize(selectedTire)}
                      </h2>

                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {getTireCount(selectedTire)} adet lastik
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-center sm:min-w-40 sm:p-4">
                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-600">
                      Depo Konumu
                    </p>

                    <p className="mt-1 truncate font-mono text-lg font-black uppercase text-amber-800 sm:text-xl">
                      {getStorageLocation(selectedTire) || "Rafsız"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                    Kayıt tarihi: {formatDate(selectedTire.createdDate)}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <User className="h-4 w-4 shrink-0 text-slate-400" />
                    Oluşturan:{" "}
                    {selectedTire.createdUsername || "Belirtilmedi"}
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <InfoCard
                  icon={<User className="h-5 w-5" />}
                  label="Müşteri"
                  value={getClientName(selectedTire)}
                  secondary="Tire/GetById clientName"
                />

                <InfoCard
                  icon={<Car className="h-5 w-5" />}
                  label="Araç"
                  value={getVehiclePlate(selectedTire)}
                  secondary={`Vehicle ID: ${selectedTire.vehicleId || "-"}`}
                  mono
                />
              </section>

              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Lastik Bilgileri
                  </h3>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Tire/GetById tarafından dönen teknik bilgiler
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <DetailItem label="Marka" value={getTireBrand(selectedTire)} />
                  <DetailItem label="Ebat" value={getTireSize(selectedTire)} />
                  <DetailItem
                    label="Mevsim"
                    value={selectedTire.brandConstantName || "Belirtilmedi"}
                  />
                  <DetailItem
                    label="Adet"
                    value={`${getTireCount(selectedTire)} adet`}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Depo Bilgisi
                    </h3>

                    <p className="mt-1 text-[11px] font-medium text-slate-400">
                      Backend tarafından dönen storageLocation
                    </p>
                  </div>
                </div>

                <div className="break-words rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-600">
                  {getStorageLocation(selectedTire) || "Depo konumu girilmemiş."}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Lastik Görselleri
                  </h3>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Tire/GetById içindeki uploadFiles
                  </p>
                </div>

                {selectedTirePhotos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <ImageIcon className="mx-auto h-7 w-7 text-slate-300" />

                    <p className="mt-2 text-xs font-bold text-slate-500">
                      Görsel bulunmuyor
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {selectedTirePhotos.map((file) => {
                      const imageUrl = getBestImageUrl(file);

                      return (
                        <div
                          key={getFileKey(file)}
                          className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={getFileName(file)}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ImageIcon className="h-7 w-7 text-slate-300" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end sm:rounded-3xl sm:p-5">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedLegacyRecord) {
                      onOpenLabelPrinter(selectedLegacyRecord);
                    }
                  }}
                  disabled={!selectedLegacyRecord}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-5 text-xs font-black text-blue-700 transition hover:bg-blue-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <Printer className="h-4 w-4" />
                  Barkod / Etiket
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedLegacyRecord) {
                      onOpenDetail(selectedLegacyRecord);
                    }
                  }}
                  disabled={!selectedLegacyRecord}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-6 text-xs font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  İncele / Düzenle / Teslim Et
                </button>
              </section>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12">
              <MapPin className="h-9 w-9 text-slate-300" />

              <h2 className="mt-3 text-sm font-black text-slate-700">
                Depo kaydı seçilmedi
              </h2>

              <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
                Detayları görüntülemek için depo listesinden bir emanet kaydı
                seçin.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  secondary,
  mono = false
}: {
  icon: ReactNode;
  label: string;
  value: string;
  secondary: string;
  mono?: boolean;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
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
        title={value}
      >
        {value}
      </p>

      <p
        className="mt-1 truncate text-[11px] font-medium text-slate-400"
        title={secondary}
      >
        {secondary}
      </p>
    </article>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
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