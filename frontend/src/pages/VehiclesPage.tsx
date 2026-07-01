import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from "react";

import {
  ArrowLeft,
  Calendar,
  Car,
  FileText,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  User,
  X
} from "lucide-react";

import type { Customer, TireRecord, Vehicle } from "../types";

import { buildFilePublicUrl } from "../services/fileApi";

import {
  clientApi,
  type ClientListItemDto,
  searchPlaceholders,
  tireApi,
  type TireListItemDto,
  type UploadFileDto,
  vehicleApi,
  type VehicleListItemDto
} from "../services/tireApi";

import { formatDate, formatPlate } from "../utils/helpers";

interface VehiclesPageProps {
  vehicles?: Vehicle[];
  customers?: Customer[];
  records?: TireRecord[];
  onRefreshData?: () => void | Promise<void>;
  onOpenDetail?: (record: TireRecord) => void;
  onOpenLabelPrinter?: (record: TireRecord) => void;
  showToast: (
    message: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
}

type VehicleDetailState = VehicleListItemDto & {
  tires?: TireListItemDto[];
};

type VehiclePaginationState = {
  index: number;
  size: number;
  count: number;
  pages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

const VEHICLE_PAGE_SIZE = 20;
const VEHICLE_TIRE_PAGE_SIZE = 1000;
const CUSTOMER_SELECT_PAGE_SIZE = 1000;

const EMPTY_VEHICLE_PAGINATION: VehiclePaginationState = {
  index: 0,
  size: VEHICLE_PAGE_SIZE,
  count: 0,
  pages: 0,
  hasPrevious: false,
  hasNext: false
};

function getVehiclePlate(vehicle: VehicleListItemDto | null) {
  return vehicle?.licensePlate?.trim() || "-";
}

function getVehicleNote(vehicle: VehicleListItemDto | null) {
  return vehicle?.note?.trim() || "Araç notu bulunmuyor";
}

function getClientName(vehicle: VehicleListItemDto | null) {
  return vehicle?.clientName?.trim() || "Müşteri bilgisi yok";
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

function getFileName(file: UploadFileDto) {
  return (
    file.orginalName ||
    file.originalName ||
    file.fileName ||
    "Araç görseli"
  );
}

function getTireTitle(tire: TireListItemDto) {
  return `${tire.modelConstantName || "Marka belirtilmedi"} • ${
    tire.sizes || "Ebat belirtilmedi"
  }`;
}

function getCustomerOptionText(customer: ClientListItemDto) {
  const name = customer.name?.trim() || "İsimsiz Müşteri";
  const phone = customer.phone?.trim();

  return phone ? `${name} — ${phone}` : name;
}

export default function VehiclesPage({ showToast }: VehiclesPageProps) {
  const [vehicles, setVehicles] = useState<VehicleListItemDto[]>([]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null
  );

  const selectedVehicleIdRef = useRef<number | null>(null);
  const vehicleDetailInFlightRef = useRef<number | null>(null);
  const loadedVehicleDetailIdRef = useRef<number | null>(null);

  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleDetailState | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  const [pagination, setPagination] = useState<VehiclePaginationState>(
    EMPTY_VEHICLE_PAGINATION
  );

  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [isLoadingVehicleDetail, setIsLoadingVehicleDetail] = useState(false);

  const [vehicleErrorMessage, setVehicleErrorMessage] = useState("");
  const [vehicleDetailErrorMessage, setVehicleDetailErrorMessage] =
    useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [customerOptions, setCustomerOptions] = useState<ClientListItemDto[]>(
    []
  );

  const [isLoadingCustomerOptions, setIsLoadingCustomerOptions] =
    useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isCreatingVehicle, setIsCreatingVehicle] = useState(false);

  const vehiclePhotos = useMemo(
    () => selectedVehicle?.uploadFiles || [],
    [selectedVehicle]
  );

  const vehicleTires = useMemo(
    () => selectedVehicle?.tires || [],
    [selectedVehicle]
  );

  useEffect(() => {
    selectedVehicleIdRef.current = selectedVehicleId;
  }, [selectedVehicleId]);

  const resetSelectedVehicle = useCallback(() => {
    selectedVehicleIdRef.current = null;
    loadedVehicleDetailIdRef.current = null;
    vehicleDetailInFlightRef.current = null;

    setSelectedVehicleId(null);
    setSelectedVehicle(null);
    setVehicleDetailErrorMessage("");
    setIsMobileDetailOpen(false);
  }, []);

  const loadVehicleDetail = useCallback(
    async (vehicleId: number, options?: { force?: boolean }) => {
      if (!options?.force && loadedVehicleDetailIdRef.current === vehicleId) {
        return;
      }

      if (vehicleDetailInFlightRef.current === vehicleId) {
        return;
      }

      try {
        vehicleDetailInFlightRef.current = vehicleId;

        setIsLoadingVehicleDetail(true);
        setVehicleDetailErrorMessage("");

        const [detail, tireResponse] = await Promise.all([
          vehicleApi.getVehicleById(vehicleId),
          tireApi.getTires({
            page: 0,
            pageSize: VEHICLE_TIRE_PAGE_SIZE
          })
        ]);

        const vehicleTireItems = (tireResponse.items || []).filter(
          (tire) => tire.vehicleId === vehicleId
        );

        loadedVehicleDetailIdRef.current = vehicleId;

        setSelectedVehicle({
          ...detail,
          tires: vehicleTireItems
        });
      } catch (error) {
        console.error("Araç detayı yüklenemedi:", error);

        loadedVehicleDetailIdRef.current = null;

        setSelectedVehicle(null);

        setVehicleDetailErrorMessage(
          error instanceof Error
            ? error.message
            : "Araç detayı yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        if (vehicleDetailInFlightRef.current === vehicleId) {
          vehicleDetailInFlightRef.current = null;
        }

        setIsLoadingVehicleDetail(false);
      }
    },
    []
  );

  const loadVehicles = useCallback(
    async (
      targetPage = 0,
      options?: {
        search?: string;
        preferredVehicleId?: number;
      }
    ) => {
      const currentSearch = options?.search ?? searchQuery;

      try {
        setIsLoadingVehicles(true);
        setVehicleErrorMessage("");

        const response = await vehicleApi.getVehicles({
          page: targetPage,
          pageSize: VEHICLE_PAGE_SIZE,
          searchKey: currentSearch
        });

        const items = response.items || [];

        setVehicles(items);

        setPagination({
          index: response.index ?? targetPage,
          size: response.size ?? VEHICLE_PAGE_SIZE,
          count: response.count ?? items.length,
          pages: response.pages ?? (items.length > 0 ? 1 : 0),
          hasPrevious: response.hasPrevious ?? targetPage > 0,
          hasNext: response.hasNext ?? false
        });

        const preferredVehicleId = options?.preferredVehicleId;

        const nextSelectedVehicle =
          (preferredVehicleId
            ? items.find((vehicle) => vehicle.id === preferredVehicleId)
            : undefined) ||
          (selectedVehicleIdRef.current
            ? items.find(
                (vehicle) => vehicle.id === selectedVehicleIdRef.current
              )
            : undefined) ||
          items[0];

        if (nextSelectedVehicle) {
          selectedVehicleIdRef.current = nextSelectedVehicle.id;

          setSelectedVehicleId(nextSelectedVehicle.id);

          await loadVehicleDetail(nextSelectedVehicle.id);
        } else {
          resetSelectedVehicle();
        }
      } catch (error) {
        console.error("Araçlar yüklenemedi:", error);

        setVehicles([]);
        resetSelectedVehicle();
        setPagination(EMPTY_VEHICLE_PAGINATION);

        setVehicleErrorMessage(
          error instanceof Error
            ? error.message
            : "Araçlar yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        setIsLoadingVehicles(false);
      }
    },
    [loadVehicleDetail, resetSelectedVehicle, searchQuery]
  );

  const loadCustomerOptions = useCallback(async () => {
    try {
      setIsLoadingCustomerOptions(true);

      const response = await clientApi.getClients({
        page: 0,
        pageSize: CUSTOMER_SELECT_PAGE_SIZE
      });

      setCustomerOptions(response.items || []);
    } catch (error) {
      console.error("Müşteri listesi yüklenemedi:", error);

      setCustomerOptions([]);

      showToast(
        error instanceof Error
          ? error.message
          : "Müşteri listesi yüklenirken beklenmeyen bir hata oluştu.",
        "error"
      );
    } finally {
      setIsLoadingCustomerOptions(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadVehicles(page);
  }, [loadVehicles, page]);

  const totalRecords = pagination.count;
  const totalPages = pagination.pages;
  const currentPageNumber = totalPages === 0 ? 0 : page + 1;

  const canGoPrevious =
    !isLoadingVehicles && (pagination.hasPrevious || page > 0);

  const canGoNext =
    !isLoadingVehicles &&
    (pagination.hasNext || (totalPages > 0 && page < totalPages - 1));

  const handleSelectVehicle = async (vehicleId: number) => {
    selectedVehicleIdRef.current = vehicleId;

    setSelectedVehicleId(vehicleId);
    setIsMobileDetailOpen(true);

    await loadVehicleDetail(vehicleId);
  };

  const handleSearchChange = (value: string) => {
    selectedVehicleIdRef.current = null;
    loadedVehicleDetailIdRef.current = null;

    setSearchQuery(value);
    setPage(0);
    setSelectedVehicleId(null);
    setSelectedVehicle(null);
    setVehicleDetailErrorMessage("");
    setIsMobileDetailOpen(false);
  };

  const handlePreviousPage = () => {
    if (!canGoPrevious) return;

    loadedVehicleDetailIdRef.current = null;

    setPage((currentPage) => Math.max(0, currentPage - 1));
    setIsMobileDetailOpen(false);
  };

  const handleNextPage = () => {
    if (!canGoNext) return;

    loadedVehicleDetailIdRef.current = null;

    setPage((currentPage) => currentPage + 1);
    setIsMobileDetailOpen(false);
  };

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);

    if (customerOptions.length === 0) {
      void loadCustomerOptions();
    }
  };

  const resetAddVehicleForm = () => {
    setSelectedCustomerId("");
    setNewPlate("");
    setNewNote("");
    setIsAddModalOpen(false);
  };

  const handleCreateVehicle = async (event: FormEvent) => {
    event.preventDefault();

    const plate = formatPlate(newPlate.trim());
    const note = newNote.trim();
    const clientId = Number(selectedCustomerId);

    if (!selectedCustomerId || Number.isNaN(clientId)) {
      showToast("Lütfen araç sahibini seçin.", "warning");
      return;
    }

    if (!plate) {
      showToast("Lütfen araç plakasını girin.", "warning");
      return;
    }

    try {
      setIsCreatingVehicle(true);

      const createdVehicle = await vehicleApi.addVehicle({
        clientId,
        licensePlate: plate,
        note,
        imageIds: []
      });

      loadedVehicleDetailIdRef.current = null;

      setSearchQuery("");
      setPage(0);

      await loadVehicles(0, {
        search: "",
        preferredVehicleId: createdVehicle.id
      });

      setIsMobileDetailOpen(true);
      resetAddVehicleForm();

      showToast("Araç başarıyla eklendi.", "success");
    } catch (error) {
      console.error("Araç oluşturulamadı:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Araç oluşturulurken beklenmeyen bir hata oluştu.",
        "error"
      );
    } finally {
      setIsCreatingVehicle(false);
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden text-slate-950 animate-slide-in lg:grid-cols-12 lg:gap-6">
      <section
        className={`h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-4 lg:flex lg:rounded-3xl ${
          isMobileDetailOpen ? "hidden" : "flex"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900">Araçlar</h2>

            <p className="mt-1 text-[11px] font-medium text-slate-400">
              {totalRecords} kayıtlı araç
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void loadVehicles(page)}
              disabled={isLoadingVehicles}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              title="Araçları yenile"
              aria-label="Araçları yenile"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isLoadingVehicles ? "animate-spin" : ""
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] sm:px-4"
            >
              <Plus className="h-4 w-4" />
              Yeni Araç
            </button>
          </div>
        </header>

        <div className="shrink-0 border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={searchPlaceholders.vehicle}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {isLoadingVehicles ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="text-xs font-bold text-slate-500">
                Araçlar yükleniyor
              </p>
            </div>
          ) : vehicleErrorMessage ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
              <Car className="h-8 w-8 text-rose-300" />

              <p className="text-xs font-black text-rose-700">
                Araçlar yüklenemedi
              </p>

              <p className="text-[11px] font-medium leading-relaxed text-rose-500">
                {vehicleErrorMessage}
              </p>

              <button
                type="button"
                onClick={() => void loadVehicles(page)}
                className="mt-1 rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
              >
                Tekrar Dene
              </button>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
              <Car className="h-7 w-7 text-slate-300" />

              <p className="text-xs font-bold text-slate-500">
                Araç bulunamadı
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {vehicles.map((vehicle) => {
                const isSelected = selectedVehicleId === vehicle.id;

                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => void handleSelectVehicle(vehicle.id)}
                    className={`relative flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition sm:px-5 ${
                      isSelected ? "bg-blue-50/80" : "hover:bg-slate-50"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
                    )}

                    <div className="min-w-0">
                      <h3 className="truncate font-mono text-sm font-black uppercase tracking-wider text-blue-700">
                        {getVehiclePlate(vehicle)}
                      </h3>

                      <p className="mt-1 truncate text-[11px] font-bold text-slate-700">
                        {getClientName(vehicle)}
                      </p>

                      <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
                        {vehicle.note?.trim() || "Araç notu bulunmuyor"}
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
            Araçlara Dön
          </button>

          <span className="max-w-[140px] truncate pr-2 font-mono text-[11px] font-bold uppercase text-blue-700">
            {getVehiclePlate(selectedVehicle)}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 pr-0.5 [-webkit-overflow-scrolling:touch]">
          {isLoadingVehicleDetail ? (
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="mt-3 text-xs font-bold text-slate-500">
                Araç detayı yükleniyor
              </p>
            </div>
          ) : vehicleDetailErrorMessage ? (
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12">
              <Car className="h-9 w-9 text-rose-300" />

              <h2 className="mt-3 text-sm font-black text-rose-700">
                Araç detayı yüklenemedi
              </h2>

              <p className="mt-2 max-w-sm text-xs leading-relaxed text-rose-500">
                {vehicleDetailErrorMessage}
              </p>

              {selectedVehicleId && (
                <button
                  type="button"
                  onClick={() =>
                    void loadVehicleDetail(selectedVehicleId, { force: true })
                  }
                  className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                >
                  Tekrar Dene
                </button>
              )}
            </div>
          ) : selectedVehicle ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900 text-white shadow-md sm:h-14 sm:w-14">
                      <Car className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-mono text-lg font-black uppercase tracking-wider text-blue-700 sm:text-xl">
                        {getVehiclePlate(selectedVehicle)}
                      </h2>

                      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                        {getVehicleNote(selectedVehicle)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center sm:min-w-36 sm:p-4">
                    <span className="block text-xl font-black text-blue-700 sm:text-2xl">
                      {vehicleTires.length}
                    </span>

                    <span className="text-[10px] font-bold uppercase tracking-wide text-blue-500">
                      Lastik Kaydı
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                    Kayıt tarihi: {formatDate(selectedVehicle.createdDate)}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <User className="h-4 w-4 shrink-0 text-slate-400" />
                    Oluşturan:{" "}
                    {selectedVehicle.createdUsername || "Belirtilmedi"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Araç Sahibi
                  </h3>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Backend tarafından dönen müşteri bilgisi
                  </p>
                </div>

                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                      <User className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">
                        {getClientName(selectedVehicle)}
                      </p>

                      <p className="mt-1 text-xs font-bold text-blue-600">
                        Müşteri ID: {selectedVehicle.clientId || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Araç Notu
                    </h3>

                    <p className="mt-1 text-[11px] font-medium text-slate-400">
                      Backend tarafından dönen not bilgisi
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-600">
                  {selectedVehicle.note?.trim() || "Not bulunmuyor"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Araç Görselleri
                  </h3>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Vehicle/GetById içindeki uploadFiles
                  </p>
                </div>

                {vehiclePhotos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <ImageIcon className="mx-auto h-7 w-7 text-slate-300" />

                    <p className="mt-2 text-xs font-bold text-slate-500">
                      Görsel bulunmuyor
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {vehiclePhotos.map((file) => {
                      const imageUrl = getBestImageUrl(file);

                      return (
                        <div
                          key={String(file.id || file.fileId || imageUrl)}
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
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Bağlı Lastik Kayıtları
                  </h3>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Bu araca bağlı Tire/GetList kayıtları
                  </p>
                </div>

                {vehicleTires.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-xs font-bold text-slate-500">
                      Lastik kaydı bulunmuyor
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vehicleTires.map((tire) => (
                      <article
                        key={tire.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-[10px] font-black text-white">
                                {tire.code || `#${tire.id}`}
                              </span>

                              <span className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1 font-mono text-[10px] font-black uppercase text-amber-700">
                                Raf: {tire.storageLocation || "Girilmedi"}
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-black text-slate-900">
                              {getTireTitle(tire)}
                            </p>

                            <p className="mt-1 text-[11px] font-medium text-slate-500">
                              {tire.brandConstantName || "Tip belirtilmedi"} •{" "}
                              {tire.count || 0} adet
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Kayıt tarihi
                            </p>

                            <p className="mt-1 text-xs font-black text-slate-600">
                              {formatDate(tire.createdDate)}
                            </p>
                          </div>
                        </div>

                        {tire.uploadFiles && tire.uploadFiles.length > 0 && (
                          <p className="mt-3 text-[11px] font-bold text-slate-400">
                            {tire.uploadFiles.length} lastik görseli var
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12">
              <Car className="h-9 w-9 text-slate-300" />

              <h2 className="mt-3 text-sm font-black text-slate-700">
                Araç seçilmedi
              </h2>

              <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
                Detayları görüntülemek için araç listesinden bir kayıt seçin.
              </p>
            </div>
          )}
        </div>
      </section>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-base font-black text-slate-950">
                  Yeni Araç
                </h2>

                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  Araç ve müşteri bağlantısını oluşturun
                </p>
              </div>

              <button
                type="button"
                onClick={resetAddVehicleForm}
                disabled={isCreatingVehicle}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Pencereyi kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <form onSubmit={handleCreateVehicle}>
              <div className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Araç Sahibi *
                  </label>

                  <select
                    value={selectedCustomerId}
                    onChange={(event) =>
                      setSelectedCustomerId(event.target.value)
                    }
                    disabled={isCreatingVehicle || isLoadingCustomerOptions}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                  >
                    <option value="">
                      {isLoadingCustomerOptions
                        ? "Müşteriler yükleniyor..."
                        : "Müşteri seçin"}
                    </option>

                    {customerOptions.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {getCustomerOptionText(customer)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Plaka *
                  </label>

                  <input
                    type="text"
                    value={newPlate}
                    onChange={(event) => setNewPlate(event.target.value)}
                    disabled={isCreatingVehicle}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm font-black uppercase tracking-wider text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                    placeholder="19 ABC 123"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Araç Notu
                  </label>

                  <textarea
                    value={newNote}
                    onChange={(event) => setNewNote(event.target.value)}
                    disabled={isCreatingVehicle}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                    placeholder="Araçla ilgili not..."
                  />
                </div>
              </div>

              <footer className="grid grid-cols-2 gap-2 border-t border-slate-100 p-5">
                <button
                  type="button"
                  onClick={resetAddVehicleForm}
                  disabled={isCreatingVehicle}
                  className="h-11 rounded-2xl border border-slate-200 bg-white text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Vazgeç
                </button>

                <button
                  type="submit"
                  disabled={isCreatingVehicle}
                  className="h-11 rounded-2xl bg-blue-600 text-xs font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingVehicle ? "Kaydediliyor..." : "Aracı Kaydet"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}