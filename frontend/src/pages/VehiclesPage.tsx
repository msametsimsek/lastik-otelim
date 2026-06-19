import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Car,
  Image as ImageIcon,
  Phone,
  Plus,
  Printer,
  Search,
  User,
  X
} from "lucide-react";

import { Customer, TireRecord, Vehicle } from "../types";
import {
  searchPlaceholders,
  vehicleApi
} from "../services/tireApi";
import {
  formatPlate,
  normalizeTurkish
} from "../utils/helpers";

interface VehiclesPageProps {
  vehicles: Vehicle[];
  customers: Customer[];
  records: TireRecord[];
  onRefreshData: () => void | Promise<void>;
  onOpenDetail: (record: TireRecord) => void;
  onOpenLabelPrinter: (record: TireRecord) => void;
  showToast: (
    message: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
}

function getVehicleCustomer(
  vehicle: Vehicle,
  customers: Customer[]
): Customer | undefined {
  return customers.find(
    (customer) => customer.id === vehicle.clientId
  );
}

function getVehicleRecords(
  vehicleId: string,
  records: TireRecord[]
): TireRecord[] {
  return records.filter(
    (record) =>
      record.vehicleId === vehicleId &&
      record.status !== "delivered"
  );
}

export default function VehiclesPage({
  vehicles,
  customers,
  records,
  onRefreshData,
  onOpenDetail,
  onOpenLabelPrinter,
  showToast
}: VehiclesPageProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    vehicles[0]?.id || ""
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isCreatingVehicle, setIsCreatingVehicle] = useState(false);

  useEffect(() => {
    const selectedVehicleExists = vehicles.some(
      (vehicle) => vehicle.id === selectedVehicleId
    );

    if (!selectedVehicleExists) {
      const nextVehicleId = vehicles[0]?.id || "";

      setSelectedVehicleId(nextVehicleId);

      if (!nextVehicleId) {
        setIsMobileDetailOpen(false);
      }
    }
  }, [vehicles, selectedVehicleId]);

  const filteredVehicles = useMemo(() => {
    const normalizedQuery = normalizeTurkish(searchQuery.trim());

    if (!normalizedQuery) return vehicles;

    return vehicles.filter((vehicle) => {
      const customer = getVehicleCustomer(vehicle, customers);

      const searchableText = [
        vehicle.plate,
        vehicle.note || "",
        customer?.fullName || "",
        customer?.phone || ""
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeTurkish(searchableText).includes(normalizedQuery);
    });
  }, [vehicles, customers, searchQuery]);

  const selectedVehicle = vehicles.find(
    (vehicle) => vehicle.id === selectedVehicleId
  );

  const selectedCustomer = selectedVehicle
    ? getVehicleCustomer(selectedVehicle, customers)
    : undefined;

  const selectedVehicleRecords = useMemo(
    () =>
      selectedVehicle
        ? getVehicleRecords(selectedVehicle.id, records)
        : [],
    [selectedVehicle, records]
  );

  const selectedVehiclePhotos = useMemo(() => {
    const seen = new Set<string>();

    return selectedVehicleRecords
      .flatMap((record) => record.photos || [])
      .filter((photo) => {
        const key = String(photo.fileId || photo.id);

        if (!key || seen.has(key)) return false;

        seen.add(key);
        return true;
      });
  }, [selectedVehicleRecords]);

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setIsMobileDetailOpen(true);
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

      await onRefreshData();

      setSelectedVehicleId(String(createdVehicle.id));
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
      {/* Araç listesi */}
      <section
        className={`h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-4 lg:flex lg:rounded-3xl ${
          isMobileDetailOpen ? "hidden" : "flex"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900">
              Araçlar
            </h2>

            <p className="mt-1 text-[11px] font-medium text-slate-400">
              {vehicles.length} kayıtlı araç
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] sm:px-4"
          >
            <Plus className="h-4 w-4" />
            Yeni Araç
          </button>
        </header>

        {/* Sabit arama alanı */}
        <div className="shrink-0 border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={searchPlaceholders.vehicle}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        {/* Yalnızca araç listesi kayar */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {filteredVehicles.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
              <Car className="h-7 w-7 text-slate-300" />

              <p className="text-xs font-bold text-slate-500">
                Araç bulunamadı
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredVehicles.map((vehicle) => {
                const customer = getVehicleCustomer(
                  vehicle,
                  customers
                );

                const vehicleRecords = getVehicleRecords(
                  vehicle.id,
                  records
                );

                const isSelected =
                  selectedVehicleId === vehicle.id;

                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => handleSelectVehicle(vehicle.id)}
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
                      <h3 className="truncate font-mono text-sm font-black uppercase tracking-wider text-blue-700">
                        {vehicle.plate}
                      </h3>

                      <p className="mt-1 truncate text-[11px] font-bold text-slate-700">
                        {customer?.fullName || "Müşteri bulunamadı"}
                      </p>

                      <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
                        {vehicle.note || "Araç notu bulunmuyor"}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="block text-lg font-black text-slate-900">
                        {vehicleRecords.length}
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

      {/* Araç detay alanı */}
      <section
        className={`h-full min-h-0 flex-col overflow-hidden lg:col-span-8 lg:flex ${
          isMobileDetailOpen ? "flex" : "hidden"
        }`}
      >
        {/* Mobil geri dönüş barı */}
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
            {selectedVehicle?.plate || "Araç detayı"}
          </span>
        </div>

        {/* Yalnızca araç detayı kayar */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 pr-0.5 [-webkit-overflow-scrolling:touch]">
          {selectedVehicle ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Araç özet kartı */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900 text-white shadow-md sm:h-14 sm:w-14">
                      <Car className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-mono text-lg font-black uppercase tracking-wider text-blue-700 sm:text-xl">
                        {selectedVehicle.plate}
                      </h2>

                      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                        {selectedVehicle.note ||
                          "Araç notu bulunmuyor"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center sm:min-w-36 sm:p-4">
                    <span className="block text-xl font-black text-blue-700 sm:text-2xl">
                      {selectedVehicleRecords.length}
                    </span>

                    <span className="text-[10px] font-bold uppercase tracking-wide text-blue-500">
                      Aktif Emanet
                    </span>
                  </div>
                </div>
              </div>

              {/* Araç sahibi */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Araç Sahibi
                  </h3>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Araca bağlı müşteri bilgileri
                  </p>
                </div>

                {selectedCustomer ? (
                  <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                        <User className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">
                          {selectedCustomer.fullName}
                        </p>

                        <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-blue-600">
                          <Phone className="h-3.5 w-3.5 shrink-0" />

                          <span className="truncate">
                            {selectedCustomer.phone ||
                              "Telefon belirtilmedi"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-xs font-bold text-slate-500">
                      Araç sahibine ulaşılamadı
                    </p>
                  </div>
                )}
              </div>

              {/* Araç görselleri */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Araç Görselleri
                  </h3>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Araca bağlı lastik kayıtlarındaki görseller
                  </p>
                </div>

                {selectedVehiclePhotos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <ImageIcon className="mx-auto h-7 w-7 text-slate-300" />

                    <p className="mt-2 text-xs font-bold text-slate-500">
                      Görsel bulunmuyor
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {selectedVehiclePhotos.map((photo) => (
                      <div
                        key={String(photo.fileId || photo.id)}
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
                )}
              </div>

              {/* Lastik emanetleri */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Bağlı Lastik Emanetleri
                  </h3>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Bu araca ait aktif depo kayıtları
                  </p>
                </div>

                {selectedVehicleRecords.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-xs font-bold text-slate-500">
                      Aktif emanet kaydı bulunmuyor
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedVehicleRecords.map((record) => (
                      <article
                        key={record.id}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-[10px] font-black text-white">
                              {record.tireCode}
                            </span>

                            <span className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1 font-mono text-[10px] font-black uppercase text-amber-700">
                              Raf:{" "}
                              {record.storageLocation || "Girilmedi"}
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-black text-slate-900">
                            {record.brand} • {record.size}
                          </p>

                          <p className="mt-1 text-[11px] font-medium text-slate-500">
                            {record.tireType} • {record.quantity} adet
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
                            onClick={() =>
                              onOpenLabelPrinter(record)
                            }
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                            title="Etiket yazdır"
                            aria-label="Etiket yazdır"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
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

      {/* Yeni araç modalı */}
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
                    disabled={isCreatingVehicle}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                  >
                    <option value="">Müşteri seçin</option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.fullName} — {customer.phone}
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
                    onChange={(event) =>
                      setNewPlate(event.target.value)
                    }
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
                    onChange={(event) =>
                      setNewNote(event.target.value)
                    }
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
                  {isCreatingVehicle
                    ? "Kaydediliyor..."
                    : "Aracı Kaydet"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}