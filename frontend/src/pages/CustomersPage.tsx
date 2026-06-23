import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from "react";

import {
  ArrowLeft,
  Calendar,
  Car,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  User,
  X
} from "lucide-react";

import { Customer, TireRecord, Vehicle } from "../types";
import {
  clientApi,
  ClientListItemDto,
  searchPlaceholders
} from "../services/tireApi";
import { formatDate } from "../utils/helpers";

interface CustomersPageProps {
  customers: Customer[];
  vehicles: Vehicle[];
  records: TireRecord[];
  onRefreshData: () => void | Promise<void>;
  onOpenDetail: (record: TireRecord) => void;
  onOpenLabelPrinter: (record: TireRecord) => void;
  showToast: (
    message: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
}

const CUSTOMER_PAGE_SIZE = 20;

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

function getStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function mapApiClientToCustomer(client: ClientListItemDto): Customer {
  const rawClient = client as ClientListItemDto & Record<string, unknown>;

  return {
    id: String(rawClient.id ?? ""),
    fullName:
      getStringValue(rawClient.name) ||
      getStringValue(rawClient.fullName) ||
      "İsimsiz Müşteri",
    phone: getStringValue(rawClient.phone),
    createdAt:
      getStringValue(rawClient.createdDate) ||
      getStringValue(rawClient.createdAt) ||
      new Date().toISOString()
  } as Customer;
}

function getCustomerVehicles(customerId: string, vehicles: Vehicle[]) {
  return vehicles.filter((vehicle) => vehicle.clientId === customerId);
}

function getCustomerRecords(customerId: string, records: TireRecord[]) {
  return records.filter(
    (record) =>
      record.clientId === customerId && record.status !== "delivered"
  );
}

export default function CustomersPage({
  customers,
  vehicles,
  records,
  onRefreshData,
  onOpenDetail,
  onOpenLabelPrinter,
  showToast
}: CustomersPageProps) {
  const [pagedCustomers, setPagedCustomers] = useState<Customer[]>(() =>
    customers.slice(0, CUSTOMER_PAGE_SIZE)
  );

  const [selectedCustomerId, setSelectedCustomerId] = useState(
    customers[0]?.id || ""
  );

  const [searchQuery, setSearchQuery] = useState("");

  const [page, setPage] = useState(0);

  const [pagination, setPagination] =
    useState<CustomerPaginationState>({
      ...EMPTY_CUSTOMER_PAGINATION,
      count: customers.length,
      pages:
        customers.length > 0
          ? Math.ceil(customers.length / CUSTOMER_PAGE_SIZE)
          : 0,
      hasNext: customers.length > CUSTOMER_PAGE_SIZE
    });

  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [customerErrorMessage, setCustomerErrorMessage] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const loadCustomers = useCallback(
    async (
      targetPage = page,
      options?: {
        search?: string;
        preferredCustomerId?: string;
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

        const items = (response.items || []).map(mapApiClientToCustomer);

        setPagedCustomers(items);

        setPagination({
          index: response.index ?? targetPage,
          size: response.size ?? CUSTOMER_PAGE_SIZE,
          count: response.count ?? items.length,
          pages: response.pages ?? (items.length > 0 ? 1 : 0),
          hasPrevious:
            response.hasPrevious ?? targetPage > 0,
          hasNext: response.hasNext ?? false
        });

        setSelectedCustomerId((currentId) => {
          const preferredCustomerId = options?.preferredCustomerId;

          if (
            preferredCustomerId &&
            items.some((customer) => customer.id === preferredCustomerId)
          ) {
            return preferredCustomerId;
          }

          if (
            currentId &&
            items.some((customer) => customer.id === currentId)
          ) {
            return currentId;
          }

          return items[0]?.id || "";
        });

        if (items.length === 0) {
          setIsMobileDetailOpen(false);
        }
      } catch (error) {
        console.error("Müşteriler yüklenemedi:", error);

        const fallbackCustomers = customers.slice(0, CUSTOMER_PAGE_SIZE);

        setPagedCustomers(fallbackCustomers);

        setPagination({
          ...EMPTY_CUSTOMER_PAGINATION,
          count: customers.length,
          pages:
            customers.length > 0
              ? Math.ceil(customers.length / CUSTOMER_PAGE_SIZE)
              : 0,
          hasNext: customers.length > CUSTOMER_PAGE_SIZE
        });

        setSelectedCustomerId(fallbackCustomers[0]?.id || "");
        setIsMobileDetailOpen(false);

        setCustomerErrorMessage(
          error instanceof Error
            ? error.message
            : "Müşteriler yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        setIsLoadingCustomers(false);
      }
    },
    [customers, page, searchQuery]
  );

  useEffect(() => {
    loadCustomers(page);
  }, [loadCustomers, page]);

  useEffect(() => {
    const selectedCustomerExists = pagedCustomers.some(
      (customer) => customer.id === selectedCustomerId
    );

    if (!selectedCustomerExists) {
      const nextCustomerId = pagedCustomers[0]?.id || "";

      setSelectedCustomerId(nextCustomerId);

      if (!nextCustomerId) {
        setIsMobileDetailOpen(false);
      }
    }
  }, [pagedCustomers, selectedCustomerId]);

  const selectedCustomer = pagedCustomers.find(
    (customer) => customer.id === selectedCustomerId
  );

  const selectedCustomerVehicles = useMemo(
    () =>
      selectedCustomer
        ? getCustomerVehicles(selectedCustomer.id, vehicles)
        : [],
    [selectedCustomer, vehicles]
  );

  const selectedCustomerRecords = useMemo(
    () =>
      selectedCustomer
        ? getCustomerRecords(selectedCustomer.id, records)
        : [],
    [selectedCustomer, records]
  );

  const totalRecords = pagination.count;
  const totalPages = pagination.pages;
  const currentPageNumber =
    totalPages === 0 ? 0 : page + 1;

  const canGoPrevious =
    !isLoadingCustomers && (pagination.hasPrevious || page > 0);

  const canGoNext =
    !isLoadingCustomers &&
    (pagination.hasNext ||
      (totalPages > 0 && page < totalPages - 1));

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setIsMobileDetailOpen(true);
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

      await onRefreshData();

      setSearchQuery("");
      setPage(0);

      await loadCustomers(0, {
        search: "",
        preferredCustomerId: String(createdCustomer.id)
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
      {/* Müşteri listesi */}
      <section
        className={`h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-4 lg:flex lg:rounded-3xl ${
          isMobileDetailOpen ? "hidden" : "flex"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900">
              Müşteriler
            </h2>

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

        {/* Sabit arama alanı */}
        <div className="shrink-0 border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                handleSearchChange(event.target.value)
              }
              placeholder={searchPlaceholders.client}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        {/* Yalnızca müşteri listesi kayar */}
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
          ) : pagedCustomers.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
              <User className="h-7 w-7 text-slate-300" />

              <p className="text-xs font-bold text-slate-500">
                Müşteri bulunamadı
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pagedCustomers.map((customer) => {
                const customerVehicles = getCustomerVehicles(
                  customer.id,
                  vehicles
                );

                const customerRecords = getCustomerRecords(
                  customer.id,
                  records
                );

                const isSelected = selectedCustomerId === customer.id;

                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelectCustomer(customer.id)}
                    className={`relative flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition sm:px-5 ${
                      isSelected
                        ? "bg-blue-50/80"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
                    )}

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-slate-900">
                        {customer.fullName}
                      </h3>

                      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <Phone className="h-3 w-3 shrink-0 text-slate-400" />

                        <span className="truncate">
                          {customer.phone || "Telefon belirtilmedi"}
                        </span>
                      </p>

                      <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">
                        {customerVehicles.length > 0
                          ? customerVehicles
                              .map((vehicle) => vehicle.plate)
                              .join(", ")
                          : "Bağlı araç yok"}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="block text-lg font-black text-slate-900">
                        {customerRecords.length}
                      </span>

                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Aktif Emanet
                      </span>
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

      {/* Müşteri detay alanı */}
      <section
        className={`h-full min-h-0 flex-col overflow-hidden lg:col-span-8 lg:flex ${
          isMobileDetailOpen ? "flex" : "hidden"
        }`}
      >
        {/* Mobil sabit geri dönüş alanı */}
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
            {selectedCustomer?.fullName || "Müşteri detayı"}
          </span>
        </div>

        {/* Yalnızca detay alanı kayar */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 pr-0.5 [-webkit-overflow-scrolling:touch]">
          {selectedCustomer ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-lg font-black text-white shadow-md sm:h-14 sm:w-14 sm:text-xl">
                      {selectedCustomer.fullName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-base font-black text-slate-950 sm:text-lg">
                        {selectedCustomer.fullName}
                      </h2>

                      <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-blue-600">
                        <Phone className="h-4 w-4 shrink-0" />

                        <span className="truncate">
                          {selectedCustomer.phone ||
                            "Telefon belirtilmedi"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:min-w-64">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center sm:p-4">
                      <span className="block text-xl font-black text-slate-950 sm:text-2xl">
                        {selectedCustomerVehicles.length}
                      </span>

                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Araç
                      </span>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center sm:p-4">
                      <span className="block text-xl font-black text-blue-700 sm:text-2xl">
                        {selectedCustomerRecords.length}
                      </span>

                      <span className="text-[10px] font-bold uppercase tracking-wide text-blue-500">
                        Aktif Emanet
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
                  <Calendar className="h-4 w-4 shrink-0 text-slate-400" />

                  Kayıt tarihi: {formatDate(selectedCustomer.createdAt)}
                </div>
              </div>

              {/* Bağlı araçlar */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Bağlı Araçlar
                  </h3>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Bu müşteriye bağlı araçlar
                  </p>
                </div>

                {selectedCustomerVehicles.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <Car className="mx-auto h-7 w-7 text-slate-300" />

                    <p className="mt-2 text-xs font-bold text-slate-500">
                      Bağlı araç bulunmuyor
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {selectedCustomerVehicles.map((vehicle) => {
                      const vehicleRecordCount = records.filter(
                        (record) =>
                          record.vehicleId === vehicle.id &&
                          record.status !== "delivered"
                      ).length;

                      return (
                        <article
                          key={vehicle.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-mono text-sm font-black uppercase tracking-wider text-blue-700">
                                {vehicle.plate}
                              </p>

                              <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                                {vehicle.note || "Araç notu bulunmuyor"}
                              </p>
                            </div>

                            <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 shadow-sm">
                              {vehicleRecordCount} emanet
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Aktif emanetler */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Aktif Lastik Emanetleri
                  </h3>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Bu müşteriye ait aktif depo kayıtları
                  </p>
                </div>

                {selectedCustomerRecords.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-xs font-bold text-slate-500">
                      Aktif emanet kaydı bulunmuyor
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCustomerRecords.map((record) => {
                      const vehicle = selectedCustomerVehicles.find(
                        (item) => item.id === record.vehicleId
                      );

                      return (
                        <article
                          key={record.id}
                          className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-[10px] font-black text-white">
                                {record.tireCode}
                              </span>

                              <span className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 font-mono text-[10px] font-black uppercase text-blue-700">
                                {vehicle?.plate ||
                                  record.snapshot?.plate ||
                                  "-"}
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-black text-slate-900">
                              {record.brand} • {record.size}
                            </p>

                            <p className="mt-1 text-[11px] font-medium text-slate-500">
                              {record.tireType} • {record.quantity} adet • Raf:{" "}
                              {record.storageLocation || "Girilmedi"}
                            </p>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenDetail(record)}
                              className="min-h-10 flex-1 rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200 sm:flex-none"
                            >
                              Detay
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenLabelPrinter(record)}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                              title="Etiket yazdır"
                              aria-label="Etiket yazdır"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
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

      {/* Yeni müşteri modalı */}
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