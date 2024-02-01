import React from "react";

interface HintsModalProps {
  hints: any;
  isOpen: boolean;
}

export const HintsModal = ({ hints, isOpen }: HintsModalProps) => {
  return (
    <div
      className={`bg-gray-900 text-white p-4 rounded-xl my-6 ${
        isOpen ? "block" : "hidden"
      }`}
    >
      <div className="text-center text-3xl">ゴールのリンク元一覧</div>
      {Array.isArray(hints) &&
        hints.map((hint: any, index: any) => <div key={index}>･{hint}</div>)}
    </div>
  );
};
