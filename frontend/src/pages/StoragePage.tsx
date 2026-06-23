import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  ArrowLeft,
  Calendar,
  Car,
  Image as ImageIcon,
  Layers,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  Search,
  User
} from "lucide-react";

import {
  Customer,
  TireRecord,
  TireType,
  Vehicle
} from "../types";

import {
  TireListItemDto,
  tireApi
} from "../services/tireApi";

import { formatDate } from "../utils/helpers";

interface StoragePageProps {
  records: TireRecord[];
  customers: Customer[];
  vehicles: Vehicle[];
  initialSearchQuery?: string;
  onOpenDetail: (record: TireRecord) => void;
  onOpenLabelPrinter: (record: TireRecord) => void;
}

const TYPE_FILTERS: Array<"Tümü" | TireType> = [
  "Tümü",
  "Yazlık",
  "Kışlık",
  "4 Mevsim"
];

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

function getStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getNumberValue(value: unknown, fallback = 0) {
  const numericValue =
    typeof value === "number" ? value : Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : fallback;
}

function isTireType(value: unknown): value is TireType {
  return (
    value === "Yazlık" ||
    value === "Kışlık" ||
    value === "4 Mevsim"
  );
}

function getApiTireType(rawRecord: Record<string, unknown>): TireType {
  const possibleType =
    rawRecord.tireType ||
    rawRecord.tireTypeName ||
    rawRecord.typeName ||
    rawRecord.brand ||
    rawRecord.brandName;

  if (isTireType(possibleType)) {
    return possibleType;
  }

  return "Yazlık";
}

function mapApiTireToRecord(
  item: TireListItemDto,
  localRecords: TireRecord[]
): TireRecord {
  const rawRecord = item as TireListItemDto & Record<string, unknown>;

  const recordId = String(rawRecord.id ?? "");
  const localRecord = localRecords.find(
    (record) => record.id === recordId
  );

  const clientId = String(
    rawRecord.clientId ??
      rawRecord.customerId ??
      localRecord?.clientId ??
      ""
  );

  const vehicleId = String(
    rawRecord.vehicleId ?? localRecord?.vehicleId ?? ""
  );

  const customerName =
    getStringValue(rawRecord.clientName) ||
    getStringValue(rawRecord.customerName) ||
    localRecord?.snapshot?.customerName ||
    "Bilinmeyen Cari";

  const phone =
    getStringValue(rawRecord.clientPhone) ||
    getStringValue(rawRecord.phone) ||
    localRecord?.snapshot?.phone ||
    "";

  const plate =
    getStringValue(rawRecord.licensePlate) ||
    getStringValue(rawRecord.plate) ||
    localRecord?.snapshot?.plate ||
    "-";

  const vehicleNote =
    getStringValue(rawRecord.vehicleNote) ||
    getStringValue(rawRecord.note) ||
    localRecord?.vehicleNote ||
    localRecord?.snapshot?.vehicleNote ||
    "";

  const createdAt =
    getStringValue(rawRecord.createdDate) ||
    getStringValue(rawRecord.createdAt) ||
    localRecord?.createdAt ||
    new Date().toISOString();

  return {
    ...(localRecord || {}),
    id: recordId,
    clientId,
    vehicleId,
    tireCode:
      getStringValue(rawRecord.code) ||
      getStringValue(rawRecord.tireCode) ||
      localRecord?.tireCode ||
      "-",
    brand:
      getStringValue(rawRecord.model) ||
      getStringValue(rawRecord.modelName) ||
      getStringValue(rawRecord.brandName) ||
      localRecord?.brand ||
      "-",
    size:
      getStringValue(rawRecord.sizes) ||
      getStringValue(rawRecord.size) ||
      localRecord?.size ||
      "-",
    tireType: getApiTireType(rawRecord),
    quantity:
      getNumberValue(rawRecord.count, 0) ||
      getNumberValue(rawRecord.quantity, 0) ||
      localRecord?.quantity ||
      0,
    storageLocation:
      getStringValue(rawRecord.storageLocation) ||
      localRecord?.storageLocation ||
      "",
    vehicleNote,
    createdAt,
    status:
      getStringValue(rawRecord.status) ||
      localRecord?.status ||
      "active",
    photos: localRecord?.photos || [],
    snapshot: localRecord?.snapshot || {
      customerName,
      phone,
      plate,
      vehicleNote
    }
  } as TireRecord;
}

function getRecordCustomer(
  record: TireRecord,
  customers: Customer[]
): Customer {
  return (
    customers.find(
      (customer) => customer.id === record.clientId
    ) || {
      id: record.clientId,
      fullName:
        record.snapshot?.customerName || "Bilinmeyen Cari",
      phone: record.snapshot?.phone || "",
      createdAt: record.createdAt,
      isActive: true
    }
  );
}

function getRecordVehicle(
  record: TireRecord,
  vehicles: Vehicle[]
): Vehicle {
  return (
    vehicles.find(
      (vehicle) => vehicle.id === record.vehicleId
    ) || {
      id: record.vehicleId,
      clientId: record.clientId,
      plate: record.snapshot?.plate || "-",
      note:
        record.vehicleNote ||
        record.snapshot?.vehicleNote ||
        "",
      createdAt: record.createdAt
    }
  );
}

function compareStorageLocations(
  first: TireRecord,
  second: TireRecord
) {
  const firstLocation =
    first.storageLocation?.trim() || "";

  const secondLocation =
    second.storageLocation?.trim() || "";

  if (!firstLocation && !secondLocation) {
    return (
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime()
    );
  }

  if (!firstLocation) return 1;
  if (!secondLocation) return -1;

  return firstLocation.localeCompare(
    secondLocation,
    "tr",
    {
      numeric: true,
      sensitivity: "base"
    }
  );
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

export default function StoragePage({
  records,
  customers,
  vehicles,
  initialSearchQuery = "",
  onOpenDetail,
  onOpenLabelPrinter
}: StoragePageProps) {
  const [pagedRecords, setPagedRecords] = useState<TireRecord[]>(
    () =>
      records
        .filter((record) => record.status !== "delivered")
        .slice(0, STORAGE_PAGE_SIZE)
  );

  const [searchQuery, setSearchQuery] =
    useState(initialSearchQuery);

  const [selectedType, setSelectedType] =
    useState<(typeof TYPE_FILTERS)[number]>("Tümü");

  const [page, setPage] = useState(0);

  const [pagination, setPagination] =
    useState<StoragePaginationState>({
      ...EMPTY_STORAGE_PAGINATION,
      count: records.filter(
        (record) => record.status !== "delivered"
      ).length,
      pages:
        records.length > 0
          ? Math.ceil(records.length / STORAGE_PAGE_SIZE)
          : 0,
      hasNext: records.length > STORAGE_PAGE_SIZE
    });

  const [selectedRecordId, setSelectedRecordId] =
    useState("");

  const [isMobileDetailOpen, setIsMobileDetailOpen] =
    useState(false);

  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [recordErrorMessage, setRecordErrorMessage] = useState("");

  const allActiveRecords = useMemo(
    () =>
      records.filter(
        (record) => record.status !== "delivered"
      ),
    [records]
  );

  const loadStorageRecords = useCallback(
    async (
      targetPage = page,
      options?: {
        search?: string;
        preferredRecordId?: string;
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

        const items = (response.items || [])
          .map((item) => mapApiTireToRecord(item, records))
          .filter((record) => record.status !== "delivered")
          .sort(compareStorageLocations);

        setPagedRecords(items);

        setPagination({
          index: response.index ?? targetPage,
          size: response.size ?? STORAGE_PAGE_SIZE,
          count: response.count ?? items.length,
          pages: response.pages ?? (items.length > 0 ? 1 : 0),
          hasPrevious:
            response.hasPrevious ?? targetPage > 0,
          hasNext: response.hasNext ?? false
        });

        setSelectedRecordId((currentId) => {
          const preferredRecordId = options?.preferredRecordId;

          if (
            preferredRecordId &&
            items.some((record) => record.id === preferredRecordId)
          ) {
            return preferredRecordId;
          }

          if (
            currentId &&
            items.some((record) => record.id === currentId)
          ) {
            return currentId;
          }

          return items[0]?.id || "";
        });

        if (items.length === 0) {
          setIsMobileDetailOpen(false);
        }
      } catch (error) {
        console.error("Depo kayıtları yüklenemedi:", error);

        const fallbackRecords = allActiveRecords
          .slice(0, STORAGE_PAGE_SIZE)
          .sort(compareStorageLocations);

        setPagedRecords(fallbackRecords);

        setPagination({
          ...EMPTY_STORAGE_PAGINATION,
          count: allActiveRecords.length,
          pages:
            allActiveRecords.length > 0
              ? Math.ceil(
                  allActiveRecords.length / STORAGE_PAGE_SIZE
                )
              : 0,
          hasNext:
            allActiveRecords.length > STORAGE_PAGE_SIZE
        });

        setSelectedRecordId(fallbackRecords[0]?.id || "");
        setIsMobileDetailOpen(false);

        setRecordErrorMessage(
          error instanceof Error
            ? error.message
            : "Depo kayıtları yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        setIsLoadingRecords(false);
      }
    },
    [allActiveRecords, page, records, searchQuery]
  );

  useEffect(() => {
    loadStorageRecords(page);
  }, [loadStorageRecords, page]);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
    setPage(0);
    setIsMobileDetailOpen(false);
  }, [initialSearchQuery]);

  const filteredRecords = useMemo(() => {
    return pagedRecords
      .filter((record) => {
        if (
          selectedType !== "Tümü" &&
          record.tireType !== selectedType
        ) {
          return false;
        }

        return true;
      })
      .sort(compareStorageLocations);
  }, [pagedRecords, selectedType]);

  useEffect(() => {
    const selectedRecordStillVisible =
      filteredRecords.some(
        (record) => record.id === selectedRecordId
      );

    if (selectedRecordStillVisible) {
      return;
    }

    const nextRecordId =
      filteredRecords[0]?.id || "";

    setSelectedRecordId(nextRecordId);

    if (!nextRecordId) {
      setIsMobileDetailOpen(false);
    }
  }, [filteredRecords, selectedRecordId]);

  const selectedRecord = filteredRecords.find(
    (record) => record.id === selectedRecordId
  );

  const selectedCustomer = selectedRecord
    ? getRecordCustomer(selectedRecord, customers)
    : undefined;

  const selectedVehicle = selectedRecord
    ? getRecordVehicle(selectedRecord, vehicles)
    : undefined;

  const recordsWithLocation = allActiveRecords.filter(
    (record) =>
      Boolean(record.storageLocation?.trim())
  ).length;

  const totalTireQuantity = allActiveRecords.reduce(
    (total, record) =>
      total + Number(record.quantity || 0),
    0
  );

  const totalRecords = pagination.count;
  const totalPages = pagination.pages;
  const currentPageNumber =
    totalPages === 0 ? 0 : page + 1;

  const canGoPrevious =
    !isLoadingRecords && (pagination.hasPrevious || page > 0);

  const canGoNext =
    !isLoadingRecords &&
    (pagination.hasNext ||
      (totalPages > 0 && page < totalPages - 1));

  const handleSelectRecord = (recordId: string) => {
    setSelectedRecordId(recordId);
    setIsMobileDetailOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(0);
    setIsMobileDetailOpen(false);
  };

  const handleTypeChange = (
    type: (typeof TYPE_FILTERS)[number]
  ) => {
    setSelectedType(type);
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
      {/* Depo listesi */}
      <section
        className={`h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-4 lg:flex lg:rounded-3xl ${
          isMobileDetailOpen ? "hidden" : "flex"
        }`}
      >
        {/* Sabit özet alanı */}
        <header className="shrink-0 border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Layers className="h-4 w-4 shrink-0 text-blue-600" />
                Depo
              </h2>

              <p className="mt-1 text-[11px] font-medium text-slate-400">
                {totalRecords} aktif emanet
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <span className="block text-xl font-black text-blue-700">
                  {totalTireQuantity}
                </span>

                <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  Toplam Lastik
                </span>
              </div>

              <button
                type="button"
                onClick={() => loadStorageRecords(page)}
                disabled={isLoadingRecords}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-wide text-blue-500">
                Aktif Kayıt
              </p>

              <p className="mt-1 text-lg font-black text-blue-800">
                {totalRecords}
              </p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-wide text-amber-600">
                Raf Girilen
              </p>

              <p className="mt-1 text-lg font-black text-amber-800">
                {recordsWithLocation}
              </p>
            </div>
          </div>
        </header>

        {/* Sabit arama ve filtre alanı */}
        <div className="shrink-0 space-y-3 border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                handleSearchChange(event.target.value)
              }
              placeholder="Raf, plaka, müşteri veya LastikCode ara..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
            {TYPE_FILTERS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  handleTypeChange(type)
                }
                className={`min-w-0 rounded-lg px-1 py-2 text-[10px] font-black transition sm:px-2 ${
                  selectedType === type
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="block truncate">
                  {type}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Yalnızca depo listesi kayar */}
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
          ) : filteredRecords.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
              <MapPin className="h-7 w-7 text-slate-300" />

              <p className="text-xs font-bold text-slate-500">
                Depo kaydı bulunamadı
              </p>

              <p className="max-w-xs text-[10px] leading-relaxed text-slate-400">
                Arama veya filtre kriterlerini değiştirerek
                tekrar deneyin.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRecords.map((record) => {
                const customer = getRecordCustomer(
                  record,
                  customers
                );

                const vehicle = getRecordVehicle(
                  record,
                  vehicles
                );

                const isSelected =
                  selectedRecordId === record.id;

                const tireTypeClasses =
                  getTireTypeClasses(record.tireType);

                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() =>
                      handleSelectRecord(record.id)
                    }
                    className={`relative flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition sm:px-5 ${
                      isSelected
                        ? "bg-blue-50/80"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 font-mono text-[10px] font-black uppercase text-amber-700">
                          {record.storageLocation ||
                            "Rafsız"}
                        </span>

                        <span className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 font-mono text-[10px] font-black uppercase text-blue-700">
                          {vehicle.plate || "-"}
                        </span>
                      </div>

                      <h3 className="mt-2 truncate text-xs font-black text-slate-900">
                        {customer.fullName}
                      </h3>

                      <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
                        {record.brand} • {record.size} •{" "}
                        {record.quantity} adet
                      </p>

                      <p className="mt-1 truncate font-mono text-[9px] font-bold text-slate-400">
                        {record.tireCode}
                      </p>
                    </div>

                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${tireTypeClasses.dot}`}
                      title={record.tireType}
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

      {/* Depo detay alanı */}
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
            Depoya Dön
          </button>

          <span className="max-w-[145px] truncate pr-2 font-mono text-[10px] font-bold uppercase text-amber-700">
            {selectedRecord?.storageLocation ||
              "Depo detayı"}
          </span>
        </div>

        {/* Yalnızca detay alanı kayar */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 pr-0.5 [-webkit-overflow-scrolling:touch]">
          {selectedRecord &&
          selectedCustomer &&
          selectedVehicle ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Kayıt özeti */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md sm:h-14 sm:w-14">
                      <Package className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="max-w-full truncate rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-[10px] font-black text-white">
                          {selectedRecord.tireCode}
                        </span>

                        <span
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-black text-white ${
                            getTireTypeClasses(
                              selectedRecord.tireType
                            ).badge
                          }`}
                        >
                          {selectedRecord.tireType}
                        </span>
                      </div>

                      <h2 className="mt-2 truncate text-base font-black text-slate-950 sm:text-lg">
                        {selectedRecord.brand} •{" "}
                        {selectedRecord.size}
                      </h2>

                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {selectedRecord.quantity} adet lastik
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-center sm:min-w-40 sm:p-4">
                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-600">
                      Depo Konumu
                    </p>

                    <p className="mt-1 truncate font-mono text-lg font-black uppercase text-amber-800 sm:text-xl">
                      {selectedRecord.storageLocation ||
                        "Rafsız"}
                    </p>
                  </div>
                </div>
              </section>

              {/* Müşteri ve araç */}
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <InfoCard
                  icon={<User className="h-5 w-5" />}
                  label="Müşteri"
                  value={selectedCustomer.fullName}
                  secondary={
                    selectedCustomer.phone ||
                    "Telefon belirtilmedi"
                  }
                />

                <InfoCard
                  icon={<Car className="h-5 w-5" />}
                  label="Araç"
                  value={selectedVehicle.plate || "-"}
                  secondary={
                    selectedVehicle.note ||
                    "Araç notu bulunmuyor"
                  }
                  mono
                />
              </section>

              {/* Lastik bilgileri */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Lastik Bilgileri
                  </h3>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Seçilen depo kaydının teknik bilgileri
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <DetailItem
                    label="Marka"
                    value={selectedRecord.brand}
                  />

                  <DetailItem
                    label="Ebat"
                    value={selectedRecord.size}
                  />

                  <DetailItem
                    label="Mevsim"
                    value={selectedRecord.tireType}
                  />

                  <DetailItem
                    label="Adet"
                    value={`${selectedRecord.quantity} adet`}
                  />
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-500 sm:items-center">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 sm:mt-0" />

                  <span>
                    Kayıt tarihi:{" "}
                    {formatDate(selectedRecord.createdAt)}
                  </span>
                </div>
              </section>

              {/* Araç notu */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Araç / Kayıt Notu
                  </h3>
                </div>

                <div className="break-words rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-600">
                  {selectedRecord.vehicleNote ||
                    selectedVehicle.note ||
                    "Not girilmemiş."}
                </div>
              </section>

              {/* Görseller */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Görseller
                  </h3>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Araç ve emanet kaydına bağlı
                    fotoğraflar
                  </p>
                </div>

                {selectedRecord.photos?.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {selectedRecord.photos.map((photo) => (
                      <div
                        key={String(
                          photo.fileId || photo.id
                        )}
                        className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                      >
                        <img
                          src={photo.dataUrl}
                          alt={photo.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <ImageIcon className="mx-auto h-7 w-7 text-slate-300" />

                    <p className="mt-2 text-xs font-bold text-slate-500">
                      Görsel bulunmuyor
                    </p>
                  </div>
                )}
              </section>

              {/* İşlem butonları */}
              <section className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end sm:rounded-3xl sm:p-5">
                <button
                  type="button"
                  onClick={() =>
                    onOpenLabelPrinter(selectedRecord)
                  }
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-5 text-xs font-black text-blue-700 transition hover:bg-blue-100 active:scale-[0.98] sm:w-auto"
                >
                  <Printer className="h-4 w-4" />
                  Barkod / Etiket
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onOpenDetail(selectedRecord)
                  }
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-6 text-xs font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 active:scale-[0.98] sm:w-auto"
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
                Detayları görüntülemek için depo
                listesinden bir emanet kaydı seçin.
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
          mono
            ? "font-mono uppercase tracking-wider"
            : ""
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

function DetailItem({
  label,
  value
}: {
  label: string;
  value: string;
}) {
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