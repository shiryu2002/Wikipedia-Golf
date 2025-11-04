import { memo } from "react";

type MobileHintsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    hints: string[];
};

export const MobileHintsModal = memo(
    ({ isOpen, onClose, hints }: MobileHintsModalProps) => {
        if (!isOpen) {
            return null;
        }

        const hasHints = Array.isArray(hints) && hints.length > 0;

        return (
            <div
                className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 sm:hidden"
                onClick={onClose}
            >
                <div
                    className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-white shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="flex flex-col gap-1">
                        <p className="text-xs uppercase tracking-[0.3em] text-blue-200/80">
                            ヒント
                        </p>
                        <h2 className="text-xl font-semibold">ゴールのリンク元一覧</h2>
                    </div>
                    <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1 text-sm leading-relaxed text-slate-100">
                        {hasHints ? (
                            hints.map((hint, index) => (
                                <div
                                    key={`${hint}-${index}`}
                                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                                >
                                    {hint}
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-300">ヒントはまだありません。</p>
                        )}
                    </div>
                </div>
            </div>
        );
    },
);

MobileHintsModal.displayName = "MobileHintsModal";
