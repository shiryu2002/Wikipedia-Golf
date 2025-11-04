import { memo } from "react";

type HistoryEntry = {
    title: string;
    url: string;
    stroke: number;
};

type MobileHistoryModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onBack: () => void;
    history: HistoryEntry[];
};

export const MobileHistoryModal = memo(
    ({ isOpen, onClose, onBack, history }: MobileHistoryModalProps) => {
        if (!isOpen) {
            return null;
        }

        const canUndo = history.length > 1;

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
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                            辿ったルート
                        </p>
                        <h2 className="text-xl font-semibold">
                            {history.length > 0 ? `${history.length} 手` : "記録なし"}
                        </h2>
                    </div>
                    <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
                        {history.length === 0 ? (
                            <p className="text-sm text-slate-300">
                                まだ遷移履歴がありません。
                            </p>
                        ) : (
                            history.map((item, index) => (
                                <div
                                    key={`${item.title}-${index}`}
                                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100"
                                >
                                    <p className="text-xs uppercase tracking-wider text-blue-200">
                                        {item.stroke === 0 ? "スタート" : `${item.stroke} 打目`}
                                    </p>
                                    <p className="mt-1 font-semibold">{item.title}</p>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="mt-6 flex items-center justify-end">
                        <button
                            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${canUndo
                                ? "border border-white/20 text-white hover:bg-white/10"
                                : "cursor-not-allowed border border-white/10 text-slate-500"}`}
                            onClick={() => {
                                if (!canUndo) return;
                                onBack();
                            }}
                            disabled={!canUndo}
                            type="button"
                        >
                            1手戻す
                        </button>
                    </div>
                </div>
            </div>
        );
    },
);

MobileHistoryModal.displayName = "MobileHistoryModal";
