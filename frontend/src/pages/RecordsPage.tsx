import { useEffect, useState } from "react";
import { Calendar, CheckCircle, MapPin, Printer, Search } from "lucide-react";
import { TireRecord, Customer, Vehicle } from "../types";
import { formatDate, normalizeTurkish } from "../utils/helpers";
import { searchPlaceholders } from "../services/tireApi";

interface RecordsPageProps {
  records: TireRecord[];
  customers: Customer[];
  vehicles: Vehicle[];
  initialSearchQuery?: string;
  onOpenDetail: (record: TireRecord) => void;
  onOpenLabelPrinter: (record: TireRecord) => void;
}

export default function RecordsPage({
  records,
  customers,
  vehicles,
  initialSearchQuery = "",
  onOpenDetail,
  onOpenLabelPrinter
}: RecordsPageProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("Tümü");
  const [activeListTab, setActiveListTab] = useState<"active" | "delivered">(
    "active"
  );

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  const getRecordCustomer = (record: TireRecord): Customer => {
    const matchedCustomer = customers.find(
      (customer) => customer.id === record.clientId
    );

    if (matchedCustomer) return matchedCustomer;

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

    if (matchedVehicle) return matchedVehicle;

    return {
      id: record.vehicleId,
      clientId: record.clientId,
      plate: record.snapshot?.plate || "-",
      note: record.vehicleNote || record.snapshot?.vehicleNote || "",
      createdAt: record.createdAt
    };
  };

  const activeCount = records.filter(
    (record) => record.status !== "delivered"
  ).length;

  const deliveredCount = records.filter(
    (record) => record.status === "delivered"
  ).length;

  const filteredRecords = records.filter((record) => {
    const isRecordDelivered = record.status === "delivered";

    if (activeListTab === "active" && isRecordDelivered) return false;
    if (activeListTab === "delivered" && !isRecordDelivered) return false;

    if (selectedTypeFilter !== "Tümü" && record.tireType !== selectedTypeFilter) {
      return false;
    }

    const query = searchQuery.trim();

    if (!query) return true;

    const queryNorm = normalizeTurkish(query);
    const customer = getRecordCustomer(record);
    const vehicle = getRecordVehicle(record);

    const codeMatch = normalizeTurkish(record.tireCode || "").includes(queryNorm);
    const brandMatch = normalizeTurkish(record.brand || "").includes(queryNorm);
    const locationMatch = normalizeTurkish(record.storageLocation || "").includes(
      queryNorm
    );
    const sizeMatch = normalizeTurkish(record.size || "").includes(queryNorm);
    const typeMatch = normalizeTurkish(record.tireType || "").includes(queryNorm);
    const nameMatch = normalizeTurkish(customer.fullName || "").includes(queryNorm);
    const phoneMatch = normalizeTurkish(customer.phone || "").includes(queryNorm);
    const plateMatch = normalizeTurkish(vehicle.plate || "").includes(queryNorm);
    const noteMatch = normalizeTurkish(
      record.vehicleNote || vehicle.note || ""
    ).includes(queryNorm);

    return (
      codeMatch ||
      brandMatch ||
      locationMatch ||
      sizeMatch ||
      typeMatch ||
      nameMatch ||
      phoneMatch ||
      plateMatch ||
      noteMatch
    );
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6 text-slate-950 pb-12 animate-slide-in">
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveListTab("active")}
          className={`pb-3 text-sm font-black transition-all cursor-pointer border-b-2 relative ${
            activeListTab === "active"
              ? "text-blue-600 border-blue-600"
              : "text-slate-400 border-transparent hover:text-slate-800"
          }`}
        >
          Aktif Emanetler ({activeCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveListTab("delivered")}
          className={`pb-3 text-sm font-black transition-all cursor-pointer border-b-2 relative ${
            activeListTab === "delivered"
              ? "text-rose-600 border-rose-600"
              : "text-slate-400 border-transparent hover:text-slate-800"
          }`}
        >
          Teslim Edilenler / Arşiv ({deliveredCount})
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            {activeListTab === "active"
              ? "Emanet Kayıt Defteri"
              : "Teslim Edilenler Arşivi"}
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            {activeListTab === "active"
              ? "Depoda yer alan tüm aktif emanet lastiklerin kartlarını listeleyin, aratın ve düzenleyin."
              : "Müşterilere daha önceden teslim edilmiş ve depodan çıkartılmış arşivlik lastik kayıtları."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["Tümü", "Yazlık", "Kışlık", "4 Mevsim"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedTypeFilter(type)}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-200 cursor-pointer ${
                selectedTypeFilter === type
                  ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10"
                  : "bg-slate-50 border-slate-200/50 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="relative group/search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={searchPlaceholders.tire}
          className="w-full px-5 py-3.5 pl-12 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-850 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 shadow-xs transition-all"
        />

        <Search className="absolute left-4.5 top-4.5 w-4.5 h-4.5 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />

        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-4.5 top-4 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer bg-slate-100 px-2 py-1 rounded"
          >
            Temizle
          </button>
        )}
      </div>

      {sortedRecords.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Search className="w-6 h-6 text-slate-300" />
          </div>

          <h3 className="font-bold text-slate-850 text-base">
            Eşleşen Kayıt Bulunamadı
          </h3>

          <p className="text-xs text-slate-400 mt-2.5 max-w-sm mx-auto leading-relaxed">
            Girdiğiniz arama sözcüğüne veya mevsim filtresine uyan bir depolama
            kaydı mevcut değil. Farklı bir plaka, isim, telefon, ebat veya raf
            konumu deneyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedRecords.map((record) => {
            const customer = getRecordCustomer(record);
            const vehicle = getRecordVehicle(record);
            const coverPhoto = record.photos?.[0]?.dataUrl;

            return (
              <div
                key={record.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:-translate-y-0.5 overflow-hidden flex flex-col group transition-all duration-205"
              >
                <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 border-b border-slate-100">
                  {coverPhoto ? (
                    <img
                      src={coverPhoto}
                      alt={record.brand}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                    />
                  ) : (
                    <div className="text-slate-400 font-sans font-semibold text-xs text-center flex flex-col items-center gap-1.5 p-4 select-none">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold mb-0.5">
                        L
                      </div>
                      Görsel Yok
                    </div>
                  )}

                  <span
                    className={`absolute top-3.5 left-3.5 px-2.5 py-1 rounded-lg font-sans font-extrabold text-[10px] shadow-sm uppercase tracking-wider ${
                      record.tireType === "Yazlık"
                        ? "bg-amber-500 text-white"
                        : record.tireType === "Kışlık"
                          ? "bg-blue-500 text-white"
                          : "bg-emerald-500 text-white"
                    }`}
                  >
                    {record.tireType}
                  </span>

                  <span className="absolute bottom-3.5 right-3.5 bg-slate-900/90 text-white backdrop-blur-xs font-mono font-bold text-[10px] px-2.5 py-1 rounded-md tracking-wider">
                    {record.tireCode}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm tracking-tight leading-normal line-clamp-1">
                        {customer.fullName || "Bilinmeyen Cari"}
                      </h4>

                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {customer.phone || "Telefon belirtilmedi"}
                      </p>
                    </div>

                    <div className="h-px bg-slate-100" />

                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded-xl border border-blue-100/30">
                        <span className="text-[9px] text-blue-600 font-extrabold uppercase tracking-widest font-sans">
                          ARAÇ PLAKASI
                        </span>

                        <span className="font-mono text-xs font-bold text-blue-800 tracking-wider uppercase">
                          {vehicle.plate || "-"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px] pt-1">
                        <span className="text-slate-400 font-medium">
                          Marka / Üretici:
                        </span>

                        <span className="font-bold text-slate-850 tracking-tight">
                          {record.brand}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 font-medium">
                          Ölçü / Adet:
                        </span>

                        <span className="font-bold text-slate-850">
                          {record.size} • {record.quantity} Adet
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 flex items-center gap-0.5 font-sans">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          Raf Konumu:
                        </span>

                        <span className="font-mono font-extrabold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[10px] uppercase">
                          {record.storageLocation || "Girilmemiş"}
                        </span>
                      </div>

                      {(record.vehicleNote || vehicle.note) && (
                        <div className="text-[10px] bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-600 line-clamp-2">
                          Not:{" "}
                          <span className="font-semibold text-slate-800">
                            {record.vehicleNote || vehicle.note}
                          </span>
                        </div>
                      )}

                      {record.status === "delivered" && record.deliveryNote && (
                        <div className="text-[10px] bg-slate-50 border border-slate-105 p-2 rounded-lg italic text-slate-600 line-clamp-2">
                          Not: {record.deliveryNote}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col gap-1 text-[10px] text-slate-400 font-semibold font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-300 animate-none" />
                        Kayıt Tarihi: {formatDate(record.createdAt)}
                      </div>

                      {record.status === "delivered" && (
                        <div className="flex items-center gap-1 text-emerald-600 font-bold">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 animate-none" />
                          Teslim Tarihi:{" "}
                          {formatDate(record.deliveredAt || record.updatedAt || "")}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(record)}
                        className={`${
                          record.status === "delivered" ? "col-span-5" : "col-span-4"
                        } py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-350 text-slate-700 font-bold rounded-xl text-xs tracking-tight transition-colors cursor-pointer text-center`}
                      >
                        {record.status === "delivered"
                          ? "Arşiv Kaydını Oku"
                          : "İncele & Düzenle"}
                      </button>

                      {record.status !== "delivered" && (
                        <button
                          type="button"
                          onClick={() => onOpenLabelPrinter(record)}
                          className="p-2 bg-blue-50 hover:bg-blue-105 text-blue-600 hover:text-blue-700 border border-blue-100 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                          title="Emanet Etiketi Yazdır"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}