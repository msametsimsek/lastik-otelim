import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Calendar,
  Car,
  Image as ImageIcon,
  Layers,
  MapPin,
  Package,
  Phone,
  Printer,
  Search,
  User
} from "lucide-react";

import { Customer, TireRecord, TireType, Vehicle } from "../types";
import { formatDate, normalizeTurkish } from "../utils/helpers";

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

function getRecordCustomer(
  record: TireRecord,
  customers: Customer[]
): Customer {
  return (
    customers.find((customer) => customer.id === record.clientId) || {
      id: record.clientId,
      fullName: record.snapshot?.customerName || "Bilinmeyen Cari",
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
    vehicles.find((vehicle) => vehicle.id === record.vehicleId) || {
      id: record.vehicleId,
      clientId: record.clientId,
      plate: record.snapshot?.plate || "-",
      note: record.vehicleNote || record.snapshot?.vehicleNote || "",
      createdAt: record.createdAt
    }
  );
}

function matchesSearch(
  record: TireRecord,
  customer: Customer,
  vehicle: Vehicle,
  query: string
) {
  const normalizedQuery = normalizeTurkish(query.trim());

  if (!normalizedQuery) return true;

  const searchableText = [
    record.storageLocation,
    record.tireCode,
    record.brand,
    record.size,
    record.tireType,
    record.vehicleNote,
    customer.fullName,
    customer.phone,
    vehicle.plate,
    vehicle.note
  ]
    .filter(Boolean)
    .join(" ");

  return normalizeTurkish(searchableText).includes(normalizedQuery);
}

function compareStorageLocations(first: TireRecord, second: TireRecord) {
  const firstLocation = first.storageLocation?.trim() || "";
  const secondLocation = second.storageLocation?.trim() || "";

  if (!firstLocation && !secondLocation) {
    return (
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime()
    );
  }

  if (!firstLocation) return 1;
  if (!secondLocation) return -1;

  return firstLocation.localeCompare(secondLocation, "tr", {
    numeric: true,
    sensitivity: "base"
  });
}

export default function StoragePage({
  records,
  customers,
  vehicles,
  initialSearchQuery = "",
  onOpenDetail,
  onOpenLabelPrinter
}: StoragePageProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedType, setSelectedType] =
    useState<(typeof TYPE_FILTERS)[number]>("Tümü");
  const [selectedRecordId, setSelectedRecordId] = useState("");

  const activeRecords = useMemo(
    () => records.filter((record) => record.status !== "delivered"),
    [records]
  );

  const filteredRecords = useMemo(() => {
    return activeRecords
      .filter((record) => {
        if (selectedType !== "Tümü" && record.tireType !== selectedType) {
          return false;
        }

        const customer = getRecordCustomer(record, customers);
        const vehicle = getRecordVehicle(record, vehicles);

        return matchesSearch(
          record,
          customer,
          vehicle,
          searchQuery
        );
      })
      .sort(compareStorageLocations);
  }, [
    activeRecords,
    customers,
    vehicles,
    searchQuery,
    selectedType
  ]);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    const selectedRecordStillVisible = filteredRecords.some(
      (record) => record.id === selectedRecordId
    );

    if (!selectedRecordStillVisible) {
      setSelectedRecordId(filteredRecords[0]?.id || "");
    }
  }, [filteredRecords, selectedRecordId]);

  const selectedRecord = activeRecords.find(
    (record) => record.id === selectedRecordId
  );

  const selectedCustomer = selectedRecord
    ? getRecordCustomer(selectedRecord, customers)
    : undefined;

  const selectedVehicle = selectedRecord
    ? getRecordVehicle(selectedRecord, vehicles)
    : undefined;

  const recordsWithLocation = activeRecords.filter(
    (record) => Boolean(record.storageLocation?.trim())
  ).length;

  const totalTireQuantity = activeRecords.reduce(
    (total, record) => total + Number(record.quantity || 0),
    0
  );

  return (
    <div className="grid grid-cols-1 gap-6 pb-12 text-slate-950 animate-slide-in lg:grid-cols-12">
      <section className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm lg:col-span-4 lg:h-[calc(100dvh-10rem)]">
        <header className="shrink-0 border-b border-slate-100 bg-slate-50/60 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Layers className="h-4 w-4 text-blue-600" />
                Depo
              </h2>

              <p className="mt-1 text-[11px] font-medium text-slate-400">
                {activeRecords.length} aktif emanet
              </p>
            </div>

            <div className="text-right">
              <span className="block text-xl font-black text-blue-700">
                {totalTireQuantity}
              </span>

              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Toplam Lastik
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-wide text-blue-500">
                Aktif Kayıt
              </p>

              <p className="mt-1 text-lg font-black text-blue-800">
                {activeRecords.length}
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

        <div className="shrink-0 space-y-3 border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Raf, plaka, müşteri veya LastikCode ara..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
            {TYPE_FILTERS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`rounded-lg px-2 py-2 text-[10px] font-black transition ${
                  selectedType === type
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredRecords.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
              <MapPin className="h-7 w-7 text-slate-300" />

              <p className="text-xs font-bold text-slate-500">
                Depo kaydı bulunamadı
              </p>

              <p className="max-w-xs text-[10px] leading-relaxed text-slate-400">
                Arama veya filtre kriterlerini değiştirerek tekrar deneyin.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRecords.map((record) => {
                const customer = getRecordCustomer(record, customers);
                const vehicle = getRecordVehicle(record, vehicles);
                const isSelected = selectedRecordId === record.id;

                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setSelectedRecordId(record.id)}
                    className={`relative flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition ${
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
                          {record.storageLocation || "Rafsız"}
                        </span>

                        <span className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 font-mono text-[10px] font-black uppercase text-blue-700">
                          {vehicle.plate || "-"}
                        </span>
                      </div>

                      <h3 className="mt-2 truncate text-xs font-black text-slate-900">
                        {customer.fullName}
                      </h3>

                      <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
                        {record.brand} • {record.size} • {record.quantity} adet
                      </p>

                      <p className="mt-1 truncate font-mono text-[9px] font-bold text-slate-400">
                        {record.tireCode}
                      </p>
                    </div>

                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        record.tireType === "Yazlık"
                          ? "bg-amber-400"
                          : record.tireType === "Kışlık"
                            ? "bg-sky-400"
                            : "bg-emerald-400"
                      }`}
                      title={record.tireType}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="lg:col-span-8">
        {selectedRecord && selectedCustomer && selectedVehicle ? (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
                    <Package className="h-7 w-7" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-[10px] font-black text-white">
                        {selectedRecord.tireCode}
                      </span>

                      <span
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-black text-white ${
                          selectedRecord.tireType === "Yazlık"
                            ? "bg-amber-500"
                            : selectedRecord.tireType === "Kışlık"
                              ? "bg-sky-500"
                              : "bg-emerald-500"
                        }`}
                      >
                        {selectedRecord.tireType}
                      </span>
                    </div>

                    <h2 className="mt-2 text-lg font-black text-slate-950">
                      {selectedRecord.brand} • {selectedRecord.size}
                    </h2>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {selectedRecord.quantity} adet lastik
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-center sm:min-w-40">
                  <p className="text-[10px] font-black uppercase tracking-wide text-amber-600">
                    Depo Konumu
                  </p>

                  <p className="mt-1 font-mono text-xl font-black uppercase text-amber-800">
                    {selectedRecord.storageLocation || "Rafsız"}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoCard
                icon={<User className="h-5 w-5" />}
                label="Müşteri"
                value={selectedCustomer.fullName}
                secondary={selectedCustomer.phone || "Telefon belirtilmedi"}
              />

              <InfoCard
                icon={<Car className="h-5 w-5" />}
                label="Araç"
                value={selectedVehicle.plate || "-"}
                secondary={selectedVehicle.note || "Araç notu bulunmuyor"}
                mono
              />
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-black text-slate-900">
                  Lastik Bilgileri
                </h3>

                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  Seçilen depo kaydının teknik bilgileri
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DetailItem label="Marka" value={selectedRecord.brand} />
                <DetailItem label="Ebat" value={selectedRecord.size} />
                <DetailItem
                  label="Mevsim"
                  value={selectedRecord.tireType}
                />
                <DetailItem
                  label="Adet"
                  value={`${selectedRecord.quantity} adet`}
                />
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold text-slate-500">
                <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                Kayıt tarihi: {formatDate(selectedRecord.createdAt)}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-black text-slate-900">
                  Araç / Kayıt Notu
                </h3>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-600">
                {selectedRecord.vehicleNote ||
                  selectedVehicle.note ||
                  "Not girilmemiş."}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-black text-slate-900">
                  Görseller
                </h3>

                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  Araç ve emanet kaydına bağlı fotoğraflar
                </p>
              </div>

              {selectedRecord.photos?.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {selectedRecord.photos.map((photo) => (
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
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <ImageIcon className="mx-auto h-7 w-7 text-slate-300" />

                  <p className="mt-2 text-xs font-bold text-slate-500">
                    Görsel bulunmuyor
                  </p>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => onOpenLabelPrinter(selectedRecord)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-5 text-xs font-black text-blue-700 transition hover:bg-blue-100"
              >
                <Printer className="h-4 w-4" />
                Barkod / Etiket
              </button>

              <button
                type="button"
                onClick={() => onOpenDetail(selectedRecord)}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-6 text-xs font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800"
              >
                İncele / Düzenle / Teslim Et
              </button>
            </section>
          </div>
        ) : (
          <div className="flex min-h-[620px] flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
            <MapPin className="h-9 w-9 text-slate-300" />

            <h2 className="mt-3 text-sm font-black text-slate-700">
              Depo kaydı seçilmedi
            </h2>

            <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
              Detayları görüntülemek için soldaki listeden bir emanet kaydı seçin.
            </p>
          </div>
        )}
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
    <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
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

      <p className="mt-1 truncate text-[11px] font-medium text-slate-400">
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
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}
