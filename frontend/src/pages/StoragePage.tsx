import { useEffect, useState } from "react";
import { Layers, MapPin, Printer, Search } from "lucide-react";
import { Customer, TireRecord, Vehicle } from "../types";
import { normalizeTurkish } from "../utils/helpers";

interface StoragePageProps {
  records: TireRecord[];
  customers: Customer[];
  vehicles: Vehicle[];
  initialSearchQuery?: string;
  onOpenDetail: (record: TireRecord) => void;
  onOpenLabelPrinter: (record: TireRecord) => void;
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

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  const getRecordCustomer = (record: TireRecord): Customer => {
    const matchedCustomer = customers.find(
      (customer) => customer.id === record.clientId
    );

    if (matchedCustomer) {
      return matchedCustomer;
    }

    return {
      id: record.clientId,
      fullName: record.snapshot?.customerName || "Bilinmeyen Cari",
      phone: record.snapshot?.phone || "",
      createdAt: record.createdAt
    };
  };

  const getRecordVehicle = (record: TireRecord): Vehicle => {
    const matchedVehicle = vehicles.find(
      (vehicle) => vehicle.id === record.vehicleId
    );

    if (matchedVehicle) {
      return matchedVehicle;
    }

    return {
      id: record.vehicleId,
      clientId: record.clientId,
      plate: record.snapshot?.plate || "-",
      note: record.vehicleNote || record.snapshot?.vehicleNote || "",
      createdAt: record.createdAt
    };
  };

  const filteredRecords = records.filter((record) => {
    if (record.status === "delivered") return false;

    const query = searchQuery.trim();

    if (!query) return true;

    const queryNorm = normalizeTurkish(query);
    const customer = getRecordCustomer(record);
    const vehicle = getRecordVehicle(record);

    const locationMatch = normalizeTurkish(record.storageLocation || "").includes(queryNorm);
    const codeMatch = normalizeTurkish(record.tireCode || "").includes(queryNorm);
    const brandMatch = normalizeTurkish(record.brand || "").includes(queryNorm);
    const sizeMatch = normalizeTurkish(record.size || "").includes(queryNorm);
    const typeMatch = normalizeTurkish(record.tireType || "").includes(queryNorm);
    const nameMatch = normalizeTurkish(customer.fullName || "").includes(queryNorm);
    const phoneMatch = normalizeTurkish(customer.phone || "").includes(queryNorm);
    const plateMatch = normalizeTurkish(vehicle.plate || "").includes(queryNorm);
    const noteMatch = normalizeTurkish(
      record.vehicleNote || vehicle.note || ""
    ).includes(queryNorm);

    return (
      locationMatch ||
      codeMatch ||
      brandMatch ||
      sizeMatch ||
      typeMatch ||
      nameMatch ||
      phoneMatch ||
      plateMatch ||
      noteMatch
    );
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const locA = a.storageLocation || "";
    const locB = b.storageLocation || "";

    if (!locA) return 1;
    if (!locB) return -1;

    return locA.localeCompare(locB, "tr", { numeric: true });
  });

  return (
    <div className="space-y-6 text-slate-950 animate-slide-in pb-12">
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <Layers className="w-5.5 h-5.5 text-blue-600 animate-pulse" />
          Depo Konum &amp; Raf Kılavuzu
        </h2>

        <p className="text-xs text-slate-500 mt-1">
          Lastik setlerinin saklandığı raf, oda veya askı konumlarını sorgulayın ve yönetin.
        </p>
      </div>

      <div className="relative group/search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Raf numarası, plaka, cari adı, telefon veya lastik emanet kodu ile süzgeçleyin..."
          className="w-full px-5 py-3.5 pl-12 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 shadow-xs transition-all"
        />

        <Search className="absolute left-4.5 top-4.5 w-4.5 h-4.5 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />

        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-4.5 top-4 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer bg-slate-100 px-2 py-1 rounded"
          >
            Sıfırla
          </button>
        )}
      </div>

      {sortedRecords.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 shadow-xs flex flex-col items-center justify-center gap-3">
          <MapPin className="w-12 h-12 text-slate-300 animate-bounce" />

          <h4 className="font-bold text-slate-850 text-base">
            Aranan Konum Bulunamadı
          </h4>

          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            Dizinde aradığınız konum parametrelerine, plaka değerlerine veya cari bilgilerine uyan bir emanet lastik kaydı eşleşmedi.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden animate-slide-in">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/40">
                  <th className="px-6 py-4.5">Fiziksel Raf / Konum</th>
                  <th className="px-6 py-4.5 font-mono">Emanet kodu</th>
                  <th className="px-6 py-4.5">Müşteri Cari</th>
                  <th className="px-6 py-4.5">Telefon</th>
                  <th className="px-6 py-4.5">Araç Plakası</th>
                  <th className="px-6 py-4.5">Depolanan Lastikler</th>
                  <th className="px-6 py-4.5 text-right">Aksiyonlar</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {sortedRecords.map((record) => {
                  const customer = getRecordCustomer(record);
                  const vehicle = getRecordVehicle(record);

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 animate-slide-in">
                          <MapPin className="w-4 h-4 text-blue-600 shrink-0" />

                          <span className="font-mono font-bold text-xs text-amber-700 uppercase tracking-wider bg-amber-50 border border-amber-100/50 px-2.5 py-1 rounded-lg">
                            {record.storageLocation || "GİRİLMEDİ / BELİRSİZ"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono">
                        <span className="text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-200/40 px-2.5 py-1 rounded-lg">
                          {record.tireCode}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 text-sm">
                          {customer.fullName || "Bilinmeyen Cari"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500 font-mono text-xs font-medium">
                        {customer.phone || "Telefon belirtilmedi"}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg tracking-wider uppercase text-xs">
                          {vehicle.plate || "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm">
                            {record.brand} • {record.size}
                          </span>

                          <span className="text-xs text-slate-400 font-normal mt-0.5">
                            {record.tireType} Mevsim • {record.quantity} Adet Lastik
                          </span>

                          {(record.vehicleNote || vehicle.note) && (
                            <span className="mt-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 line-clamp-2">
                              Not:{" "}
                              <span className="font-semibold text-slate-700">
                                {record.vehicleNote || vehicle.note}
                              </span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenDetail(record)}
                            className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs tracking-tight transition-colors cursor-pointer"
                          >
                            İncele
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenLabelPrinter(record)}
                            className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-150/40 text-blue-600 rounded-xl transition-colors cursor-pointer"
                            title="Yazdır"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden divide-y divide-slate-100">
            {sortedRecords.map((record) => {
              const customer = getRecordCustomer(record);
              const vehicle = getRecordVehicle(record);

              return (
                <div
                  key={record.id}
                  className="p-4 space-y-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-600" />

                      <span className="font-mono font-bold text-[11px] text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                        {record.storageLocation || "YOK"}
                      </span>
                    </div>

                    <span className="font-mono text-xs font-bold text-blue-750 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-lg tracking-wider uppercase shrink-0">
                      {vehicle.plate || "-"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">
                      {customer.fullName || "Bilinmeyen Cari"}
                    </h4>

                    <p className="text-xs text-slate-400 font-medium">
                      {customer.phone || "Telefon belirtilmedi"}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/40 p-3 rounded-xl text-xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">
                      Lastik emaneti
                    </span>

                    <p className="font-extrabold text-slate-800 mt-0.5">
                      {record.brand} • {record.size}
                    </p>

                    <p className="text-[11px] text-slate-500 font-semibold">
                      {record.tireType} Mevsim • {record.quantity} Adet
                    </p>
                  </div>

                  <div className="flex justify-between items-center gap-4 pt-1">
                    <span className="font-mono text-[10px] text-slate-500 font-medium bg-slate-100 border border-slate-205 px-2 py-0.5 rounded">
                      {record.tireCode}
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(record)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs active:scale-95 transition-all cursor-pointer"
                      >
                        İncele
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenLabelPrinter(record)}
                        className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-150 text-blue-600 rounded-xl active:scale-95 transition-all cursor-pointer"
                        title="Yazdır"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}