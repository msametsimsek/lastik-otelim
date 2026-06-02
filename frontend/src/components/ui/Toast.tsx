import { ToastMessage } from "../../types";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bgColor = "bg-white border-zinc-200 text-zinc-800";
        let Icon = Info;
        let iconColor = "text-blue-500";

        if (toast.type === "success") {
          bgColor = "bg-emerald-50 border-emerald-200 text-emerald-800";
          Icon = CheckCircle2;
          iconColor = "text-emerald-500";
        } else if (toast.type === "error") {
          bgColor = "bg-rose-50 border-rose-200 text-rose-800";
          Icon = AlertCircle;
          iconColor = "text-rose-500";
        } else if (toast.type === "warning") {
          bgColor = "bg-amber-50 border-amber-200 text-amber-800";
          Icon = AlertTriangle;
          iconColor = "text-amber-500";
        }

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto transition-all duration-300 animate-slide-in ${bgColor}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-sm font-medium">{toast.message}</div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-md hover:bg-black/5 text-zinc-400 hover:text-zinc-600 transition-colors"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
