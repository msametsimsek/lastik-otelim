import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Printer, RefreshCw, Tag, X } from "lucide-react";

import type { Customer, TireRecord, Vehicle } from "../../types";

import {
  clientApi,
  tireApi,
  vehicleApi,
  type ClientListItemDto,
  type TireListItemDto,
  type VehicleListItemDto
} from "../../services/tireApi";

import { formatDate } from "../../utils/helpers";

interface PrintLabelModalProps {
  record: TireRecord;

  /**
   * Eski App.tsx uyumluluğu için duruyor.
   * Bu modal artık customer / vehicle prop'larını veri kaynağı olarak kullanmıyor.
   */
  customer?: Customer;
  vehicle?: Vehicle;

  onClose: () => void;
  onIncrementPrint: () => void;
}

interface PrintLabelData {
  id: string;
  tireCode: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  brand: string;
  tireType: string;
  size: string;
  quantity: number;
  storageLocation: string;
  createdAt: string;
}

function isNumericId(value: string | number | null | undefined) {
  return value !== null && value !== undefined && /^\d+$/.test(String(value));
}

function buildPrintLabelData(params: {
  tire: TireListItemDto;
  vehicle: VehicleListItemDto | null;
  client: ClientListItemDto | null;
}): PrintLabelData {
  const { tire, vehicle, client } = params;

  return {
    id: String(tire.id),
    tireCode: tire.code || `LT-${tire.id}`,
    customerName: client?.name || tire.clientName || "Bilinmeyen Cari Kayıt",
    customerPhone: client?.phone || "-",
    vehiclePlate: vehicle?.licensePlate || tire.vehicleLicensePlate || "-",
    brand: tire.modelConstantName || "-",
    tireType: tire.brandConstantName || "-",
    size: tire.sizes || "-",
    quantity: tire.count || 0,
    storageLocation: tire.storageLocation || "",
    createdAt: tire.createdDate
  };
}

export default function PrintLabelModal({
  record,
  onClose,
  onIncrementPrint
}: PrintLabelModalProps) {
  const [labelData, setLabelData] = useState<PrintLabelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPrintLabelData = async () => {
    if (!isNumericId(record.id)) {
      setLabelData(null);
      setErrorMessage("Etiket için lastik kayıt ID bilgisi geçersiz.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const tireDetail = await tireApi.getTireById(Number(record.id));

      let vehicleDetail: VehicleListItemDto | null = null;
      let clientDetail: ClientListItemDto | null = null;

      if (tireDetail.vehicleId) {
        try {
          vehicleDetail = await vehicleApi.getVehicleById(tireDetail.vehicleId);
        } catch (error) {
          console.warn("Etiket araç detayı alınamadı:", error);
        }
      }

      if (vehicleDetail?.clientId) {
        try {
          clientDetail = await clientApi.getClientById(vehicleDetail.clientId);
        } catch (error) {
          console.warn("Etiket müşteri detayı alınamadı:", error);
        }
      }

      setLabelData(
        buildPrintLabelData({
          tire: tireDetail,
          vehicle: vehicleDetail,
          client: clientDetail
        })
      );
    } catch (error) {
      console.error("Etiket verisi yüklenemedi:", error);

      setLabelData(null);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Etiket bilgileri backend üzerinden alınamadı."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPrintLabelData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.id]);

  const handlePrint = () => {
    if (!labelData) return;

    onIncrementPrint();

    window.setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div
        className="no-print my-4 flex max-h-[85vh] w-full max-w-md animate-scale-in flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:my-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex min-w-0 items-center gap-2">
            <Tag className="h-5 w-5 shrink-0 text-blue-600" strokeWidth={2.5} />

            <h3 className="truncate text-sm font-extrabold text-slate-900 sm:text-base">
              Emanet Etiketi Yazdır
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center space-y-4 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-9 w-9 animate-spin text-blue-600" />

              <p className="text-xs font-bold text-slate-500">
                Etiket bilgileri backendden yükleniyor...
              </p>
            </div>
          ) : errorMessage || !labelData ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-8 text-center">
              <AlertTriangle className="h-9 w-9 text-rose-400" />

              <p className="text-sm font-black text-rose-700">
                Etiket bilgileri yüklenemedi
              </p>

              <p className="max-w-sm text-xs font-semibold leading-relaxed text-rose-500">
                {errorMessage || "Backend etiket bilgisi alınamadı."}
              </p>

              <button
                type="button"
                onClick={loadPrintLabelData}
                className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-black text-white transition hover:bg-rose-700"
              >
                <RefreshCw className="h-4 w-4" />
                Tekrar Dene
              </button>
            </div>
          ) : (
            <>
              <p className="w-full text-center text-xs font-semibold leading-normal text-slate-500">
                Bu barkod / etiket, teslim aldığınız lastik seti üzerine
                yapıştırılacaktır. Yazdırıldığında sadece şablon basılacaktır.
              </p>

              <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-4.5 font-mono text-slate-905">
                <div className="rounded-xl border-2 border-slate-900 bg-white p-4 shadow-xs">
                  <div className="mb-3.5 border-b-2 border-slate-900 pb-3.5 text-center">
                    <div className="font-sans text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      Lastik Takip Sistemi
                    </div>

                    <div className="mt-1 font-sans text-2xl font-black tracking-tight text-slate-900">
                      {labelData.tireCode}
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <LabelRow
                      label="MÜŞTERİ:"
                      value={labelData.customerName}
                    />

                    <LabelRow
                      label="TELEFON:"
                      value={labelData.customerPhone}
                    />

                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-sans text-[11px] font-medium text-slate-400">
                        ARAÇ PLAKA:
                      </span>

                      <span className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-0.5 font-mono text-sm font-black uppercase tracking-wider text-blue-700">
                        {labelData.vehiclePlate}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1.5">
                      <LabelBlock
                        label="MARKA / CO:"
                        value={labelData.brand}
                      />

                      <LabelBlock
                        label="MEVSİM/TÜR:"
                        value={labelData.tireType}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-b border-slate-200 pb-1">
                      <LabelBlock
                        label="EBAT ÖLÇÜSÜ:"
                        value={labelData.size}
                      />

                      <LabelBlock
                        label="TOPLAM ADET:"
                        value={`${labelData.quantity} Adet`}
                      />
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-900 p-2.5 text-center text-white shadow-md">
                      <div className="font-sans text-[10px] font-bold uppercase tracking-widest text-slate-300">
                        Fiziksel Depo Rafı
                      </div>

                      <div className="mt-0.5 font-mono text-xl font-black uppercase tracking-wider">
                        {labelData.storageLocation || "YOK / BELİRTİLMEDİ"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 bg-white pt-3.5 font-sans text-[9px] font-semibold text-slate-400">
                    <span>Kayıt: {formatDate(labelData.createdAt)}</span>
                    <span>UUID: {labelData.id.substring(0, 8)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4.5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4.5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
          >
            Vazgeç
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={isLoading || !labelData}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-black text-white shadow-md transition-colors hover:bg-blue-505 hover:shadow-lg active:scale-95 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4 shrink-0 text-white" />
            Etiketi Yazdır
          </button>
        </div>
      </div>

      {labelData && (
        <div className="print-label-area absolute inset-0 hidden bg-white">
          <div
            style={{
              width: "100mm",
              minHeight: "75mm",
              padding: "4mm",
              fontFamily: "monospace",
              color: "#000",
              lineBreak: "anywhere",
              backgroundColor: "#fff"
            }}
          >
            <div
              style={{
                border: "2px solid #000",
                padding: "6px",
                backgroundColor: "#fff"
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  borderBottom: "2px solid #000",
                  paddingBottom: "4px",
                  marginBottom: "8px"
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    letterSpacing: "1px"
                  }}
                >
                  LASTIK TAKIP EMANETI
                </div>

                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    padding: "2px 0"
                  }}
                >
                  {labelData.tireCode}
                </div>
              </div>

              <div style={{ fontSize: "11px", lineHeight: "1.5" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "35%", color: "#666" }}>Müşteri:</td>
                      <td style={{ fontWeight: "bold" }}>
                        {labelData.customerName}
                      </td>
                    </tr>

                    <tr>
                      <td style={{ color: "#666" }}>Telefon:</td>
                      <td style={{ fontWeight: "bold" }}>
                        {labelData.customerPhone}
                      </td>
                    </tr>

                    <tr style={{ borderBottom: "1px solid #000" }}>
                      <td style={{ color: "#666", paddingBottom: "4px" }}>
                        Plaka:
                      </td>
                      <td
                        style={{
                          fontWeight: "bold",
                          fontSize: "14px",
                          paddingBottom: "4px"
                        }}
                      >
                        {labelData.vehiclePlate}
                      </td>
                    </tr>

                    <tr>
                      <td style={{ color: "#666", paddingTop: "4px" }}>
                        Marka:
                      </td>
                      <td style={{ fontWeight: "bold", paddingTop: "4px" }}>
                        {labelData.brand} ({labelData.tireType})
                      </td>
                    </tr>

                    <tr>
                      <td style={{ color: "#666" }}>Ebat/Adet:</td>
                      <td style={{ fontWeight: "bold" }}>
                        {labelData.size} / {labelData.quantity} Adet
                      </td>
                    </tr>

                    <tr>
                      <td style={{ color: "#666" }}>Konum:</td>
                      <td
                        style={{
                          fontWeight: "bold",
                          fontSize: "16px",
                          textTransform: "uppercase"
                        }}
                      >
                        {labelData.storageLocation || "Emanette"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "4px",
                  borderTop: "2px solid #000",
                  fontSize: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#444"
                }}
              >
                <span>Tarih: {formatDate(labelData.createdAt)}</span>
                <span>Kod: {labelData.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LabelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 font-sans text-[11px] font-medium text-slate-400">
        {label}
      </span>

      <span className="truncate text-right font-extrabold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function LabelBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block font-sans text-[10px] font-semibold text-slate-400">
        {label}
      </span>

      <span className="block truncate text-xs font-black text-slate-850">
        {value}
      </span>
    </div>
  );
}