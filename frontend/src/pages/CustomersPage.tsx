import { useEffect, useState, type FormEvent } from "react";
import { Landmark, Phone, Plus, Printer, Search, User } from "lucide-react";
import { Customer, Vehicle, TireRecord } from "../types";
import {
  clientApi,
  vehicleApi,
  ClientListItemDto,
  VehicleListItemDto,
  searchPlaceholders
} from "../services/tireApi";
import { formatPlate } from "../utils/helpers";

interface CustomersPageProps {
  customers: Customer[];
  vehicles: Vehicle[];
  records: TireRecord[];
  onRefreshData: () => void;
  onOpenDetail: (record: TireRecord) => void;
  onOpenLabelPrinter: (record: TireRecord) => void;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

function mapApiClientToCustomer(item: ClientListItemDto): Customer {
  return {
    id: String(item.id),
    fullName: item.name,
    phone: item.phone,
    createdAt: item.createdDate
  };
}

function mapApiVehicleToVehicle(item: VehicleListItemDto): Vehicle {
  return {
    id: String(item.id),
    customerId: String(item.clientId),
    plate: item.licensePlate,
    createdAt: item.createdDate
  };
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
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customers[0]?.id || ""
  );
  const [searchQuery, setSearchQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPlate, setNewPlate] = useState("");

  const [showAddPlateForm, setShowAddPlateForm] = useState(false);
  const [newPlateValue, setNewPlateValue] = useState("");

  const [apiCustomers, setApiCustomers] = useState<Customer[]>([]);
  const [apiVehicles, setApiVehicles] = useState<Vehicle[]>([]);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [isLoadingApiData, setIsLoadingApiData] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isAddingPlate, setIsAddingPlate] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const sourceCustomers = isApiLoaded ? apiCustomers : customers;
  const sourceVehicles = isApiLoaded ? apiVehicles : vehicles;

  async function reloadCustomerAndVehicleData(selectCustomerId?: string) {
    try {
      setIsLoadingApiData(true);
      setApiError(null);

      const [clientResponse, vehicleResponse] = await Promise.all([
        clientApi.getClients({
          page: 0,
          pageSize: 1000
        }),
        vehicleApi.getVehicles({
          page: 0,
          pageSize: 1000
        })
      ]);

      const mappedCustomers = (clientResponse.items || []).map(mapApiClientToCustomer);
      const mappedVehicles = (vehicleResponse.items || []).map(mapApiVehicleToVehicle);

      setApiCustomers(mappedCustomers);
      setApiVehicles(mappedVehicles);
      setIsApiLoaded(true);

      if (selectCustomerId) {
        setSelectedCustomerId(selectCustomerId);
        return;
      }

      const selectedCustomerStillExists = mappedCustomers.some(
        (customer) => customer.id === selectedCustomerId
      );

      if (!selectedCustomerId || !selectedCustomerStillExists) {
        setSelectedCustomerId(mappedCustomers[0]?.id || "");
      }
    } catch (error) {
      console.error(error);

      setApiError(
        error instanceof Error
          ? error.message
          : "Müşteri ve araç bilgileri API üzerinden yüklenemedi."
      );

      setIsApiLoaded(false);
    } finally {
      setIsLoadingApiData(false);
    }
  }

  useEffect(() => {
    reloadCustomerAndVehicleData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCustomer = sourceCustomers.find(
    (customer) => customer.id === selectedCustomerId
  );

  const activeCustomerVehicles = sourceVehicles.filter(
    (vehicle) => vehicle.customerId === selectedCustomerId
  );

  const activeCustomerRecords = records.filter(
    (record) => record.customerId === selectedCustomerId
  );

  const filteredCustomers = sourceCustomers.filter((customer) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return true;

    const nameMatch = customer.fullName.toLowerCase().includes(query);
    const phoneMatch = customer.phone.includes(query);

    const customerPlates = sourceVehicles.filter(
      (vehicle) => vehicle.customerId === customer.id
    );

    const plateMatch = customerPlates.some((vehicle) =>
      vehicle.plate.toLowerCase().includes(query)
    );

    return nameMatch || phoneMatch || plateMatch;
  });

  const handleCreateCustomer = async (e: FormEvent) => {
    e.preventDefault();

    if (!newFullName.trim()) {
      showToast("Lütfen müşteri adı soyadı girin.", "warning");
      return;
    }

    if (!newPhone.trim()) {
      showToast("Lütfen müşteri iletişim telefonu girin.", "warning");
      return;
    }

    try {
      setIsCreatingCustomer(true);

      const createdCustomer = await clientApi.addClient({
        name: newFullName.trim(),
        phone: newPhone.trim(),
        note: ""
      });

      if (newPlate.trim()) {
        await vehicleApi.addVehicle({
          clientId: createdCustomer.id,
          licensePlate: formatPlate(newPlate),
          note: "",
          imageIds: []
        });
      }

      showToast("Yeni müşteri başarıyla eklendi.", "success");

      setNewFullName("");
      setNewPhone("");
      setNewPlate("");
      setShowAddModal(false);

      await reloadCustomerAndVehicleData(String(createdCustomer.id));
      onRefreshData();
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Müşteri oluşturulurken hata meydana geldi.",
        "error"
      );
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleAddPlate = async (e: FormEvent) => {
    e.preventDefault();

    if (!newPlateValue.trim()) {
      showToast("Lütfen plaka alanını doldurun.", "warning");
      return;
    }

    if (!selectedCustomerId) {
      showToast("Lütfen önce bir müşteri seçin.", "warning");
      return;
    }

    const numericCustomerId = Number(selectedCustomerId);

    if (Number.isNaN(numericCustomerId)) {
      showToast("Seçili müşteri API kaydı değil. Lütfen müşteri listesini yenileyin.", "error");
      return;
    }

    try {
      setIsAddingPlate(true);

      const plateNormalized = formatPlate(newPlateValue);

      await vehicleApi.addVehicle({
        clientId: numericCustomerId,
        licensePlate: plateNormalized,
        note: "",
        imageIds: []
      });

      showToast(`${plateNormalized} plakalı araç müşteriye tanımlandı.`, "success");

      setNewPlateValue("");
      setShowAddPlateForm(false);

      await reloadCustomerAndVehicleData(selectedCustomerId);
      onRefreshData();
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error ? error.message : "Plaka eklenemedi.",
        "error"
      );
    } finally {
      setIsAddingPlate(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-950 animate-slide-in pb-12">
      {apiError && (
        <div className="lg:col-span-12 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          API müşteri/araç bilgileri yüklenemedi. Şimdilik yerel kayıtlar gösteriliyor.
          Hata: {apiError}
        </div>
      )}

      <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 flex flex-col h-[75vh] shadow-xs overflow-hidden animate-slide-in">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Müşteri Portföyü ({sourceCustomers.length})
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isLoadingApiData ? "API kayıtları yükleniyor..." : "Müşteri carileri ve araçları"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl px-3 py-2 text-xs font-bold cursor-pointer transition-colors shadow-sm shadow-blue-500/10 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Yeni Ekle
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholders.client}
              className="w-full bg-slate-50 px-3.5 py-2 pl-9 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800 font-semibold"
            />
            <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/70 font-sans">
          {filteredCustomers.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <User className="w-5 h-5 text-slate-300" />
              <span>Aranan kriterde müşteri bulunamadı.</span>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const count = records.filter(
                (record) => record.customerId === customer.id
              ).length;

              const plates = sourceVehicles
                .filter((vehicle) => vehicle.customerId === customer.id)
                .map((vehicle) => vehicle.plate)
                .join(", ");

              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={`w-full text-left p-4 flex items-center justify-between border-l-4 transition-all duration-150 ${
                    selectedCustomerId === customer.id
                      ? "bg-blue-50/60 border-blue-600 pl-4.5"
                      : "border-transparent hover:bg-slate-50/40 pl-4"
                  }`}
                >
                  <div className="space-y-1 max-w-[70%]">
                    <h4 className="font-extrabold text-slate-900 text-xs truncate">
                      {customer.fullName}
                    </h4>

                    <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                      {customer.phone}
                    </p>

                    {plates && (
                      <p className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100/40 px-2 py-0.5 rounded font-mono font-bold tracking-wider max-w-full truncate text-ellipsis inline-block">
                        {plates}
                      </p>
                    )}
                  </div>

                  <span
                    className={`text-[9px] font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
                      count > 0
                        ? "bg-emerald-500 text-white shadow-xs"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {count} emanet
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="lg:col-span-8 space-y-6">
        {activeCustomer ? (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                  {activeCustomer.fullName.charAt(0).toUpperCase()}
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {activeCustomer.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Cep No:
                    <span className="text-blue-600 font-bold underline decoration-dotted ml-1">
                      {activeCustomer.phone}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddPlateForm(!showAddPlateForm)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 duration-150 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Yeni Plaka Bağla
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                TANIMLI PLAKALAR
              </h4>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
                {activeCustomerVehicles.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium">
                    Bu müşteriye tanımlı bir araç plakası bulunamadı.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {activeCustomerVehicles.map((vehicle) => (
                      <span
                        key={vehicle.id}
                        className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 text-xs rounded-xl tracking-wider shadow-3xs uppercase"
                      >
                        {vehicle.plate}
                      </span>
                    ))}
                  </div>
                )}

                {showAddPlateForm && (
                  <form
                    onSubmit={handleAddPlate}
                    className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex gap-2 max-w-sm animate-slide-in"
                  >
                    <input
                      type="text"
                      required
                      value={newPlateValue}
                      onChange={(e) => setNewPlateValue(e.target.value)}
                      placeholder="Plaka Giriniz (örn: 34XYZ789)"
                      className="flex-1 bg-white px-4 py-2 text-xs rounded-xl border border-slate-200 uppercase font-mono tracking-wider font-extrabold focus:outline-none focus:border-blue-500"
                    />

                    <button
                      type="submit"
                      disabled={isAddingPlate}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shrink-0 cursor-pointer transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isAddingPlate ? "Ekleniyor..." : "Bağla"}
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                MÜŞTERİYE AİT EMANET EŞYALAR
              </h4>

              {activeCustomerRecords.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-250 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-2 shadow-xs text-slate-400">
                  <Landmark className="w-8 h-8 text-slate-300 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700">
                    Dosya Klasörü Temiz
                  </span>
                  <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                    Müşterinin üzerinde bulundurduğu aktif veya pasif kışlık/yazlık lastik emanet dosyası bulunmamaktadır.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {activeCustomerRecords.map((record) => {
                    const vehicleObj = activeCustomerVehicles.find(
                      (vehicle) => vehicle.id === record.vehicleId
                    );
                    const coverPhoto = record.photos?.[0]?.dataUrl;

                    return (
                      <div
                        key={record.id}
                        className="bg-white border border-slate-200/85 rounded-3xl shadow-xs overflow-hidden flex flex-col"
                      >
                        <div className="relative aspect-video bg-slate-50 border-b border-slate-100 overflow-hidden flex items-center justify-center">
                          {coverPhoto ? (
                            <img
                              src={coverPhoto}
                              alt={record.brand}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-[10px] text-slate-400 font-sans flex flex-col items-center gap-1.5 p-4 select-none">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 font-bold mb-0.5">
                                L
                              </div>
                              Görsel Yok
                            </div>
                          )}

                          <span
                            className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] shadow-sm uppercase font-extrabold ${
                              record.tireType === "Yazlık"
                                ? "bg-amber-500 text-white"
                                : record.tireType === "Kışlık"
                                  ? "bg-blue-500 text-white"
                                  : "bg-emerald-500 text-white"
                            }`}
                          >
                            {record.tireType}
                          </span>

                          <span className="absolute bottom-2.5 right-2.5 bg-slate-900/90 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded-md tracking-wider">
                            {record.tireCode}
                          </span>
                        </div>

                        <div className="p-4 space-y-4">
                          <div className="space-y-1.5 text-xs text-slate-700">
                            <div className="flex justify-between items-center text-[10px] bg-blue-50/40 border border-blue-100 rounded-lg p-2 font-mono uppercase tracking-wider font-extrabold text-blue-850">
                              <span className="text-slate-400 text-[9px]">
                                PLAKA:
                              </span>
                              <span>{vehicleObj?.plate || "-"}</span>
                            </div>

                            <div className="flex justify-between items-center pt-1 text-[11px]">
                              <span className="text-slate-400 font-medium">
                                Ürün Marka:
                              </span>
                              <span className="font-bold text-slate-900">
                                {record.brand}
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400 font-medium font-sans">
                                Ebat / Adet:
                              </span>
                              <span className="font-bold text-slate-905">
                                {record.size} • {record.quantity} Adet
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400 font-medium">
                                Depo Rafı:
                              </span>
                              <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md text-[10px]">
                                {record.storageLocation || "Girilmemiş"}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => onOpenDetail(record)}
                              className="col-span-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-2 rounded-xl text-center transition-colors cursor-pointer"
                            >
                              Detay / Görseller
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenLabelPrinter(record)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 transition-colors cursor-pointer"
                              title="Etiket yazdır"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center shadow-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <User className="w-8 h-8 text-slate-200 animate-pulse" />
            <span className="font-bold text-slate-500 text-sm">
              Cari Müşteri Seçilmedi
            </span>
            <p className="text-xs max-w-xs leading-relaxed">
              Bilgileri listelemek veya işlem gerçekleştirmek için sol sütundaki müşteri listesinden seçim yapın.
            </p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-5 backdrop-blur-sm sm:items-center sm:py-8">
          <div
            className="flex max-h-[calc(100dvh-40px)] w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Plus className="h-5 w-5 stroke-[2.5]" />
                  </div>

                  <div>
                    <h4 className="text-base font-black leading-tight text-slate-950">
                      Yeni Müşteri Profili Aç
                    </h4>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                      Cari bilgilerini tanımla
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleCreateCustomer}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 text-xs font-sans">
                <div>
                  <label className="mb-1.5 block font-bold text-slate-700">
                    Müşteri Tam Adı Soyadı *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Müşteri Adı Soyadı"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block font-bold text-slate-700">
                    İletişim Telefon No *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="örn: 0532 123 4567"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block font-bold text-slate-700">
                    İlk Araç Plakası{" "}
                    <span className="text-slate-400">(İsteğe Bağlı)</span>
                  </label>
                  <input
                    type="text"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value)}
                    placeholder="örn: 34XYZ567"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm font-black uppercase tracking-wider text-slate-800 outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-xl">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isCreatingCustomer}
                    onClick={() => setShowAddModal(false)}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-950 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Vazgeç
                  </button>

                  <button
                    type="submit"
                    disabled={isCreatingCustomer}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-xs font-black text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isCreatingCustomer ? "Kaydediliyor..." : "Cariyi Tanımla"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ className }: { className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}