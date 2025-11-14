import React from "react";

interface HintsModalProps {
  hints: any;
  isOpen: boolean;
}

export const HintsModal = ({ hints, isOpen }: HintsModalProps) => {
  // Return null when closed to remove from DOM and prevent Ctrl+F from finding hidden content
  if (!isOpen) {
    return null;
  }

  return (
    <div className="my-6">
      <div className="rounded-3xl bg-slate-900/90 p-6 text-white shadow-xl backdrop-blur">
        <p className="text-sm uppercase tracking-wide text-blue-300">Hints</p>
        <h3 className="mt-2 text-2xl font-semibold">ゴールのリンク元一覧</h3>
        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-2 text-sm leading-relaxed text-slate-100">
          {Array.isArray(hints) && hints.length > 0 ? (
            hints.map((hint: any, index: number) => (
              <div
                key={index}
                className="rounded-2xl bg-white/10 px-4 py-2 text-slate-100 backdrop-blur-sm"
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
};
