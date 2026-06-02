import { TireRecord, Customer, Vehicle } from "../../types";
import { Printer, X, Tag } from "lucide-react";
import { formatDate } from "../../utils/helpers";

interface PrintLabelModalProps {
  record: TireRecord;
  customer: Customer | undefined;
  vehicle: Vehicle | undefined;
  onClose: () => void;
  onIncrementPrint: () => void;
}

export default function PrintLabelModal({
  record,
  customer,
  vehicle,
  onClose,
  onIncrementPrint
}: PrintLabelModalProps) {
  
  const handlePrint = () => {
    // Record label printed stat
    onIncrementPrint();
    
    // Smooth delay to allow rendering and trigger native dialog
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] shadow-2xl overflow-hidden border border-slate-200 flex flex-col no-print my-4 sm:my-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600 stroke-[2.5]" />
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Emanet Etiketi Yazdır</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info & Mockup */}
        <div className="p-6 flex-1 overflow-y-auto min-h-0 space-y-4 flex flex-col items-center">
          <p className="text-xs text-slate-500 leading-normal font-semibold text-center w-full">
            Bu barkod / etiket, teslim aldığınız lastik seti üzerine yapıştırılacaktır. Yazdırıldığında sadece şablon basılacaktır.
          </p>

          {/* Realistic Adhesive Label Mockup */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 w-full max-w-sm font-mono text-slate-905">
            <div className="border-2 border-slate-900 p-4 bg-white shadow-xs rounded-xl">
              
              {/* Header Box */}
              <div className="text-center pb-3.5 border-b-2 border-slate-900 mb-3.5">
                <div className="font-extrabold text-[10px] tracking-widest text-slate-400 uppercase font-sans">LASTİK TAKİP SİSTEMİ</div>
                <div className="font-sans font-black text-2xl tracking-tight text-slate-900 mt-1">
                  {record.tireCode}
                </div>
              </div>

              {/* Data Rows */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px] font-medium font-sans">MÜŞTERİ:</span>
                  <span className="font-extrabold text-slate-900">{customer?.fullName || "Bilinmeyen Cari Kayıt"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px] font-medium font-sans">TELEFON:</span>
                  <span className="font-extrabold text-slate-800">{customer?.phone || "-"}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2 border-slate-200">
                  <span className="text-slate-400 text-[11px] font-medium font-sans">ARAÇ PLAKA:</span>
                  <span className="font-black text-sm tracking-wider text-blue-700 font-mono bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md uppercase">
                    {vehicle?.plate || "-"}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-1.5">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans font-semibold">MARKA / CO:</span>
                    <span className="font-black text-xs text-slate-850">{record.brand}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans font-semibold">MEVSİM/TÜR:</span>
                    <span className="font-black text-xs text-slate-850">{record.tireType}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-1 border-b border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans font-semibold">EBAT ÖLÇÜSÜ:</span>
                    <span className="font-black text-xs text-slate-850">{record.size}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans font-semibold">TOPLAM ADET:</span>
                    <span className="font-black text-xs text-slate-850">{record.quantity} Adet</span>
                  </div>
                </div>

                {/* Storage Spot Highlight */}
                <div className="mt-4 bg-slate-900 text-white p-2.5 rounded-xl text-center shadow-md">
                  <div className="text-[10px] text-slate-300 font-sans font-bold tracking-widest uppercase">FİZİKSEL DEPO RAFI</div>
                  <div className="text-xl font-black mt-0.5 tracking-wider font-mono">{record.storageLocation || "YOK / BELIRTILMEDI"}</div>
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="mt-4 pt-3.5 border-t border-slate-200 text-[9px] text-slate-400 font-semibold flex justify-between items-center bg-white font-sans">
                <span>Kayıt: {formatDate(record.createdAt)}</span>
                <span>UUID: {record.id.substring(0, 8)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 px-6 py-4.5 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4.5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-505 active:bg-blue-700 rounded-xl shadow-md cursor-pointer transition-colors hover:shadow-lg active:scale-95"
          >
            <Printer className="w-4 h-4 text-white shrink-0" />
            Etiketi Yazdır
          </button>
        </div>
      </div>

      {/* Actual Printable Area ONLY - Visible during print */}
      <div className="print-label-area hidden absolute inset-0 bg-white">
        <div style={{ width: "100mm", minHeight: "75mm", padding: "4mm", fontFamily: "monospace", color: "#000", lineBreak: "anywhere", backgroundColor: "#fff" }}>
          <div style={{ border: "2px solid #000", padding: "6px", backgroundColor: "#fff" }}>
            
            <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "4px", marginBottom: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "bold", letterSpacing: "1px" }}>LASTIK TAKIP EMANETI</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", padding: "2px 0" }}>{record.tireCode}</div>
            </div>

            <div style={{ fontSize: "11px", lineHeight: "1.5" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "35%", color: "#666" }}>Müşteri:</td>
                    <td style={{ fontWeight: "bold" }}>{customer?.fullName || "Bilinmeyen"}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#666" }}>Telefon:</td>
                    <td style={{ fontWeight: "bold" }}>{customer?.phone || "-"}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #000" }}>
                    <td style={{ color: "#666", paddingBottom: "4px" }}>Plaka:</td>
                    <td style={{ fontWeight: "bold", fontSize: "14px", paddingBottom: "4px" }}>{vehicle?.plate || "-"}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#666", paddingTop: "4px" }}>Marka:</td>
                    <td style={{ fontWeight: "bold", paddingTop: "4px" }}>{record.brand} ({record.tireType})</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#666" }}>Ebat/Adet:</td>
                    <td style={{ fontWeight: "bold" }}>{record.size} / {record.quantity} Adet</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#666" }}>Konum:</td>
                    <td style={{ fontWeight: "bold", fontSize: "16px", textTransform: "uppercase" }}>{record.storageLocation || "Emanette"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "8px", paddingTop: "4px", borderTop: "2px solid #000", fontSize: "10px", display: "flex", justifyContent: "space-between", color: "#444" }}>
              <span>Tarih: {formatDate(record.createdAt)}</span>
              <span>Kod: {record.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
