import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Calendar,
  Car,
  Phone,
  Plus,
  Printer,
  Search,
  User,
  X
} from "lucide-react";

import { Customer, TireRecord, Vehicle } from "../types";
import { clientApi, searchPlaceholders } from "../services/tireApi";
import { formatDate, normalizeTurkish } from "../utils/helpers";

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
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    customers[0]?.id || ""
  );
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  useEffect(() => {
    const selectedCustomerExists = customers.some(
      (customer) => customer.id === selectedCustomerId
    );

    if (!selectedCustomerExists) {
      setSelectedCustomerId(customers[0]?.id || "");
    }
  }, [customers, selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = normalizeTurkish(searchQuery.trim());

    if (!normalizedQuery) return customers;

    return customers.filter((customer) => {
      const customerVehicles = getCustomerVehicles(customer.id, vehicles);

      const searchableText = [
        customer.fullName,
        customer.phone,
        ...customerVehicles.flatMap((vehicle) => [
          vehicle.plate,
          vehicle.note || ""
        ])
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeTurkish(searchableText).includes(normalizedQuery);
    });
  }, [customers, vehicles, searchQuery]);

  const selectedCustomer = customers.find(
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

      setSelectedCustomerId(String(createdCustomer.id));
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
    <div className="grid grid-cols-1 gap-6 pb-12 text-slate-950 animate-slide-in lg:grid-cols-12">
      <section className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm lg:col-span-4 lg:h-[calc(100dvh-10rem)]">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/60 p-5">
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Müşteriler
            </h2>
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              {customers.length} kayıtlı müşteri
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Yeni Müşteri
          </button>
        </header>

        <div className="shrink-0 border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={searchPlaceholders.client}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
              <User className="h-7 w-7 text-slate-300" />
              <p className="text-xs font-bold text-slate-500">
                Müşteri bulunamadı
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredCustomers.map((customer) => {
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
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={`relative flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition ${
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
                        <Phone className="h-3 w-3 text-slate-400" />
                        {customer.phone || "Telefon belirtilmedi"}
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
      </section>

      <section className="lg:col-span-8">
        {selectedCustomer ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-xl font-black text-white shadow-md">
                    {selectedCustomer.fullName.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-950">
                      {selectedCustomer.fullName}
                    </h2>

                    <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-blue-600">
                      <Phone className="h-4 w-4" />
                      {selectedCustomer.phone || "Telefon belirtilmedi"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:min-w-64">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <span className="block text-2xl font-black text-slate-950">
                      {selectedCustomerVehicles.length}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Araç
                    </span>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center">
                    <span className="block text-2xl font-black text-blue-700">
                      {selectedCustomerRecords.length}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-blue-500">
                      Aktif Emanet
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
                <Calendar className="h-4 w-4 text-slate-400" />
                Kayıt tarihi: {formatDate(selectedCustomer.createdAt)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
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
                          <div>
                            <p className="font-mono text-sm font-black uppercase tracking-wider text-blue-700">
                              {vehicle.plate}
                            </p>

                            <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                              {vehicle.note || "Araç notu bulunmuyor"}
                            </p>
                          </div>

                          <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 shadow-sm">
                            {vehicleRecordCount} emanet
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
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
                              {vehicle?.plate || record.snapshot?.plate || "-"}
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
                            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                          >
                            Detay
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[620px] flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
            <User className="h-9 w-9 text-slate-300" />
            <h2 className="mt-3 text-sm font-black text-slate-700">
              Müşteri seçilmedi
            </h2>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
              Detayları görüntülemek için soldaki listeden bir müşteri seçin.
            </p>
          </div>
        )}
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
                  {isCreatingCustomer ? "Kaydediliyor..." : "Müşteriyi Kaydet"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
