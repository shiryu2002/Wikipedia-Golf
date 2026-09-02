import { useCallback, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

export type ConfirmOptions = {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

/**
 * Promise-based replacement for window.confirm.
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (await confirm({ title: "タイトルに戻りますか？" })) { ... }
 *   return <>{...}{confirmDialog}</>;
 */
export const useConfirm = () => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);

  const settle = useCallback((value: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(value);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        // If something is already pending, cancel it first.
        pendingRef.current?.resolve(false);
        const next: PendingConfirm = { ...options, resolve };
        pendingRef.current = next;
        setPending(next);
      }),
    [],
  );

  const confirmDialog = (
    <Dialog
      open={pending !== null}
      onClose={() => settle(false)}
      variant="center"
      size="sm"
      title={pending?.title}
      description={pending?.description}
      showClose={false}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => settle(false)}>
            {pending?.cancelLabel ?? "キャンセル"}
          </Button>
          <Button
            variant={pending?.tone === "danger" ? "danger" : "primary"}
            onClick={() => settle(true)}
            data-autofocus
          >
            {pending?.confirmLabel ?? "OK"}
          </Button>
        </div>
      }
    >
      <span className="sr-only">確認</span>
    </Dialog>
  );

  return { confirm, confirmDialog, isConfirmOpen: pending !== null };
};
