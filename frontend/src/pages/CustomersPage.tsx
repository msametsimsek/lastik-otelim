import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent
} from "react";

import {
  ArrowLeft,
  Calendar,
  Car,
  FileText,
  Phone,
  Plus,
  RefreshCw,
  Search,
  User,
  X
} from "lucide-react";

import type { Customer, TireRecord, Vehicle } from "../types";

import {
  clientApi,
  type ClientListItemDto,
  searchPlaceholders,
  vehicleApi,
  type VehicleListItemDto
} from "../services/tireApi";

import { formatDate } from "../utils/helpers";

interface CustomersPageProps {
  /**
   * Eski App.tsx prop'ları geçici olarak optional bırakıldı.
   * Bu sayfa artık bunları kullanmıyor.
   */
  customers?: Customer[];
  vehicles?: Vehicle[];
  records?: TireRecord[];
  onRefreshData?: () => void | Promise<void>;
  onOpenDetail?: (record: TireRecord) => void;
  onOpenLabelPrinter?: (record: TireRecord) => void;

  showToast: (
    message: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
}

const CUSTOMER_PAGE_SIZE = 20;
const CUSTOMER_VEHICLE_PAGE_SIZE = 1000;

type CustomerPaginationState = {
  index: number;
  size: number;
  count: number;
  pages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

const EMPTY_CUSTOMER_PAGINATION: CustomerPaginationState = {
  index: 0,
  size: CUSTOMER_PAGE_SIZE,
  count: 0,
  pages: 0,
  hasPrevious: false,
  hasNext: false
};

function getCustomerDisplayName(customer: ClientListItemDto | null) {
  if (!customer) return "";

  return customer.name?.trim() || "İsimsiz Müşteri";
}

function getCustomerInitial(customer: ClientListItemDto | null) {
  const name = getCustomerDisplayName(customer);

  return name.charAt(0).toUpperCase() || "M";
}

function getCustomerPhone(customer: ClientListItemDto | null) {
  return customer?.phone?.trim() || "Telefon belirtilmedi";
}

function getCustomerNote(customer: ClientListItemDto | null) {
  return customer?.note?.trim() || "Not bulunmuyor";
}

function getVehiclePlate(vehicle: VehicleListItemDto) {
  return vehicle.licensePlate?.trim() || "-";
}

function getVehicleNote(vehicle: VehicleListItemDto) {
  return vehicle.note?.trim() || "Araç notu bulunmuyor";
}

export default function CustomersPage({ showToast }: CustomersPageProps) {
  const [customers, setCustomers] = useState<ClientListItemDto[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null
  );
  const selectedCustomerIdRef = useRef<number | null>(null);
  const customerDetailInFlightRef = useRef<number | null>(null);
  const loadedCustomerDetailIdRef = useRef<number | null>(null);

  const [selectedCustomer, setSelectedCustomer] =
    useState<ClientListItemDto | null>(null);

  const [selectedCustomerVehicles, setSelectedCustomerVehicles] = useState<
    VehicleListItemDto[]
  >([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  const [pagination, setPagination] = useState<CustomerPaginationState>(
    EMPTY_CUSTOMER_PAGINATION
  );

  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingCustomerDetail, setIsLoadingCustomerDetail] = useState(false);

  const [customerErrorMessage, setCustomerErrorMessage] = useState("");
  const [customerDetailErrorMessage, setCustomerDetailErrorMessage] =
    useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  useEffect(() => {
    selectedCustomerIdRef.current = selectedCustomerId;
  }, [selectedCustomerId]);

  const resetSelectedCustomer = useCallback(() => {
    selectedCustomerIdRef.current = null;
    customerDetailInFlightRef.current = null;
    loadedCustomerDetailIdRef.current = null;

    setSelectedCustomerId(null);
    setSelectedCustomer(null);
    setSelectedCustomerVehicles([]);
    setIsMobileDetailOpen(false);
  }, []);

  const loadCustomerDetail = useCallback(
    async (customerId: number, options?: { force?: boolean }) => {
      if (!options?.force && loadedCustomerDetailIdRef.current === customerId) {
        return;
      }

      if (customerDetailInFlightRef.current === customerId) {
        return;
      }

      try {
        customerDetailInFlightRef.current = customerId;

        setIsLoadingCustomerDetail(true);
        setCustomerDetailErrorMessage("");

        const [detail, vehicleResponse] = await Promise.all([
          clientApi.getClientById(customerId),
          vehicleApi.getVehicles({
            page: 0,
            pageSize: CUSTOMER_VEHICLE_PAGE_SIZE,
            clientId: customerId
          })
        ]);

        loadedCustomerDetailIdRef.current = customerId;

        setSelectedCustomer(detail);
        setSelectedCustomerVehicles(vehicleResponse.items || []);
      } catch (error) {
        console.error("Müşteri detayı yüklenemedi:", error);

        loadedCustomerDetailIdRef.current = null;

        setSelectedCustomer(null);
        setSelectedCustomerVehicles([]);

        setCustomerDetailErrorMessage(
          error instanceof Error
            ? error.message
            : "Müşteri detayı yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        if (customerDetailInFlightRef.current === customerId) {
          customerDetailInFlightRef.current = null;
        }

        setIsLoadingCustomerDetail(false);
      }
    },
    []
  );

  const loadCustomers = useCallback(
    async (
      targetPage = 0,
      options?: {
        search?: string;
        preferredCustomerId?: number;
      }
    ) => {
      const currentSearch = options?.search ?? searchQuery;

      try {
        setIsLoadingCustomers(true);
        setCustomerErrorMessage("");

        const response = await clientApi.getClients({
          page: targetPage,
          pageSize: CUSTOMER_PAGE_SIZE,
          searchKey: currentSearch
        });

        const items = response.items || [];

        setCustomers(items);

        setPagination({
          index: response.index ?? targetPage,
          size: response.size ?? CUSTOMER_PAGE_SIZE,
          count: response.count ?? items.length,
          pages: response.pages ?? (items.length > 0 ? 1 : 0),
          hasPrevious: response.hasPrevious ?? targetPage > 0,
          hasNext: response.hasNext ?? false
        });

        const preferredCustomerId = options?.preferredCustomerId;

        const nextSelectedCustomer =
          (preferredCustomerId
            ? items.find((customer) => customer.id === preferredCustomerId)
            : undefined) ||
          (selectedCustomerIdRef.current
            ? items.find(
                (customer) => customer.id === selectedCustomerIdRef.current
              )
            : undefined) ||
          items[0];

        if (nextSelectedCustomer) {
          selectedCustomerIdRef.current = nextSelectedCustomer.id;
          setSelectedCustomerId(nextSelectedCustomer.id);

          await loadCustomerDetail(nextSelectedCustomer.id);
        } else {
          resetSelectedCustomer();
        }
      } catch (error) {
        console.error("Müşteriler yüklenemedi:", error);

        setCustomers([]);
        resetSelectedCustomer();
        setPagination(EMPTY_CUSTOMER_PAGINATION);

        setCustomerErrorMessage(
          error instanceof Error
            ? error.message
            : "Müşteriler yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        setIsLoadingCustomers(false);
      }
    },
    [loadCustomerDetail, resetSelectedCustomer, searchQuery]
  );

  useEffect(() => {
    loadCustomers(page);
  }, [loadCustomers, page]);

  const totalRecords = pagination.count;
  const totalPages = pagination.pages;
  const currentPageNumber = totalPages === 0 ? 0 : page + 1;

  const canGoPrevious =
    !isLoadingCustomers && (pagination.hasPrevious || page > 0);

  const canGoNext =
    !isLoadingCustomers &&
    (pagination.hasNext || (totalPages > 0 && page < totalPages - 1));

  const handleSelectCustomer = async (customerId: number) => {
    selectedCustomerIdRef.current = customerId;
    setSelectedCustomerId(customerId);
    setIsMobileDetailOpen(true);

    await loadCustomerDetail(customerId);
  };

  const handleSearchChange = (value: string) => {
    selectedCustomerIdRef.current = null;

    setSearchQuery(value);
    setPage(0);
    setSelectedCustomerId(null);
    setSelectedCustomer(null);
    setSelectedCustomerVehicles([]);
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

  const resetAddCustomerForm = () => {
    setNewCustomerName("");
    setNewCustomerPhone("");
    setIsAddModalOpen(false);
  };

  const handleCreateCustomer = async (event: FormEvent) => {
    event.preventDefault();

    const name = newCustomerName.trim();
    const phone = newCustomerPhone.trim();

    if (!name) {
      showToast("Lütfen müşteri adı soyadı girin.", "warning");
      return;
    }

    if (!phone) {
      showToast("Lütfen müşteri telefonunu girin.", "warning");
      return;
    }

    try {
      setIsCreatingCustomer(true);

      const createdCustomer = await clientApi.addClient({
        name,
        phone,
        note: ""
      });

      selectedCustomerIdRef.current = createdCustomer.id;

      setSearchQuery("");
      setPage(0);

      await loadCustomers(0, {
        search: "",
        preferredCustomerId: createdCustomer.id
      });

      setIsMobileDetailOpen(true);
      resetAddCustomerForm();

      showToast("Müşteri başarıyla eklendi.", "success");
    } catch (error) {
      console.error("Müşteri oluşturulamadı:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Müşteri oluşturulurken beklenmeyen bir hata oluştu.",
        "error"
      );
    } finally {
      setIsCreatingCustomer(false);
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
            <h2 className="text-sm font-black text-slate-900">Müşteriler</h2>

            <p className="mt-1 text-[11px] font-medium text-slate-400">
              {totalRecords} kayıtlı müşteri
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => loadCustomers(page)}
              disabled={isLoadingCustomers}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              title="Müşterileri yenile"
              aria-label="Müşterileri yenile"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isLoadingCustomers ? "animate-spin" : ""
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Müşteri</span>
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
              placeholder={searchPlaceholders.client}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {isLoadingCustomers ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="text-xs font-bold text-slate-500">
                Müşteriler yükleniyor
              </p>
            </div>
          ) : customerErrorMessage ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
              <User className="h-8 w-8 text-rose-300" />

              <p className="text-xs font-black text-rose-700">
                Müşteriler yüklenemedi
              </p>

              <p className="text-[11px] font-medium leading-relaxed text-rose-500">
                {customerErrorMessage}
              </p>

              <button
                type="button"
                onClick={() => loadCustomers(page)}
                className="mt-1 rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
              >
                Tekrar Dene
              </button>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
              <User className="h-7 w-7 text-slate-300" />

              <p className="text-xs font-bold text-slate-500">
                Müşteri bulunamadı
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customers.map((customer) => {
                const isSelected = selectedCustomerId === customer.id;

                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelectCustomer(customer.id)}
                    className={`relative flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition sm:px-5 ${
                      isSelected ? "bg-blue-50/80" : "hover:bg-slate-50"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
                    )}

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-slate-900">
                        {getCustomerDisplayName(customer)}
                      </h3>

                      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <Phone className="h-3 w-3 shrink-0 text-slate-400" />

                        <span className="truncate">
                          {customer.phone || "Telefon belirtilmedi"}
                        </span>
                      </p>

                      <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">
                        Kayıt tarihi: {formatDate(customer.createdDate)}
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
            Müşterilere Dön
          </button>

          <span className="max-w-[150px] truncate pr-2 text-[11px] font-semibold text-slate-400">
            {getCustomerDisplayName(selectedCustomer) || "Müşteri detayı"}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 pr-0.5 [-webkit-overflow-scrolling:touch]">
          {isLoadingCustomerDetail ? (
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="mt-3 text-xs font-bold text-slate-500">
                Müşteri detayı yükleniyor
              </p>
            </div>
          ) : customerDetailErrorMessage ? (
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12">
              <User className="h-9 w-9 text-rose-300" />

              <h2 className="mt-3 text-sm font-black text-rose-700">
                Müşteri detayı yüklenemedi
              </h2>

              <p className="mt-2 max-w-sm text-xs leading-relaxed text-rose-500">
                {customerDetailErrorMessage}
              </p>

              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={() =>
                    loadCustomerDetail(selectedCustomerId, { force: true })
                  }
                  className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                >
                  Tekrar Dene
                </button>
              )}
            </div>
          ) : selectedCustomer ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-lg font-black text-white shadow-md sm:h-14 sm:w-14 sm:text-xl">
                      {getCustomerInitial(selectedCustomer)}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-base font-black text-slate-950 sm:text-lg">
                        {getCustomerDisplayName(selectedCustomer)}
                      </h2>

                      <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-blue-600">
                        <Phone className="h-4 w-4 shrink-0" />

                        <span className="truncate">
                          {getCustomerPhone(selectedCustomer)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                    Kayıt tarihi: {formatDate(selectedCustomer.createdDate)}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <User className="h-4 w-4 shrink-0 text-slate-400" />
                    Oluşturan:{" "}
                    {selectedCustomer.createdUsername || "Belirtilmedi"}
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
                      Müşteri Notu
                    </h3>

                    <p className="mt-1 text-[11px] font-medium text-slate-400">
                      Backend tarafından dönen not bilgisi
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-600">
                  {getCustomerNote(selectedCustomer)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Car className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Müşteriye Bağlı Araçlar
                      </h3>

                      <p className="mt-1 text-[11px] font-medium text-slate-400">
                        Vehicle/GetList?ClientId={selectedCustomer.id} sonucu
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">
                    {selectedCustomerVehicles.length} araç
                  </span>
                </div>

                {selectedCustomerVehicles.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <Car className="mx-auto h-7 w-7 text-slate-300" />

                    <p className="mt-2 text-xs font-bold text-slate-500">
                      Bu müşteriye bağlı araç bulunmuyor
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCustomerVehicles.map((vehicle) => (
                      <article
                        key={vehicle.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-black uppercase tracking-wider text-blue-700">
                              {getVehiclePlate(vehicle)}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {getVehicleNote(vehicle)}
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Kayıt tarihi
                            </p>

                            <p className="mt-1 text-xs font-black text-slate-600">
                              {formatDate(vehicle.createdDate)}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12">
              <User className="h-9 w-9 text-slate-300" />

              <h2 className="mt-3 text-sm font-black text-slate-700">
                Müşteri seçilmedi
              </h2>

              <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
                Detayları görüntülemek için müşteri listesinden bir kayıt seçin.
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
                  Yeni Müşteri
                </h2>

                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  Temel müşteri bilgilerini girin
                </p>
              </div>

              <button
                type="button"
                onClick={resetAddCustomerForm}
                disabled={isCreatingCustomer}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Pencereyi kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <form onSubmit={handleCreateCustomer}>
              <div className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Ad Soyad *
                  </label>

                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(event) =>
                      setNewCustomerName(event.target.value)
                    }
                    disabled={isCreatingCustomer}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                    placeholder="Müşteri adı soyadı"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Telefon *
                  </label>

                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(event) =>
                      setNewCustomerPhone(event.target.value)
                    }
                    disabled={isCreatingCustomer}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                    placeholder="Telefon numarası"
                  />
                </div>
              </div>

              <footer className="grid grid-cols-2 gap-2 border-t border-slate-100 p-5">
                <button
                  type="button"
                  onClick={resetAddCustomerForm}
                  disabled={isCreatingCustomer}
                  className="h-11 rounded-2xl border border-slate-200 bg-white text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Vazgeç
                </button>

                <button
                  type="submit"
                  disabled={isCreatingCustomer}
                  className="h-11 rounded-2xl bg-blue-600 text-xs font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingCustomer
                    ? "Kaydediliyor..."
                    : "Müşteriyi Kaydet"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}