import { getGlobalToast } from "@/components/ui/Toast";

export function showSuccess(message: string): void {
  const show = getGlobalToast();
  if (show) {
    show(message, "success");
  }
}

export function showError(message: string): void {
  const show = getGlobalToast();
  if (show) {
    show(message, "error");
  }
}

export function showInfo(message: string): void {
  const show = getGlobalToast();
  if (show) {
    show(message, "info");
  }
}
