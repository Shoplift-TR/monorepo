import { toast } from "sonner";

export const showToast = {
  success: (message: string) =>
    toast.success(message, {
      duration: 3000,
    }),
  error: (message: string) =>
    toast.error(message, {
      duration: 4000,
    }),
  loading: (message: string) => toast.loading(message),
  dismiss: (id?: string | number) => toast.dismiss(id),
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
  ) => toast.promise(promise, messages),
};
