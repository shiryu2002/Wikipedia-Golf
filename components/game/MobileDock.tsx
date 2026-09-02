import type { ReactNode } from "react";
import { BulbIcon, FlagIcon, MenuIcon, RouteIcon } from "@/components/ui/Icons";

export type DockSheet = "route" | "goal" | "hints" | "menu";

type DockButtonProps = {
  label: string;
  icon: ReactNode;
  active?: boolean;
  badge?: number | string;
  onClick: () => void;
};

const DockButton = ({ label, icon, active, badge, onClick }: DockButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={[
      "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition active:scale-95",
      active ? "bg-ink text-paper-2" : "text-ink-2 hover:bg-ink/[0.06] hover:text-ink",
    ].join(" ")}
  >
    <span className="relative">
      {icon}
      {badge !== undefined && badge !== 0 && (
        <span className="tabular absolute -right-2.5 -top-1.5 grid min-w-[18px] place-items-center rounded-full bg-green px-1 text-[10px] font-bold leading-[18px] text-white">
          {badge}
        </span>
      )}
    </span>
    {label}
  </button>
);

type MobileDockProps = {
  active: DockSheet | null;
  onOpen: (sheet: DockSheet) => void;
  routeCount: number;
  isHintEnabled: boolean;
  isGoalDetailsView: boolean;
};

/**
 * Fixed bottom dock for phones/tablets. Each button opens a sheet with the
 * panel that lives in the sidebar on desktop.
 */
export const MobileDock = ({ active, onOpen, routeCount, isHintEnabled, isGoalDetailsView }: MobileDockProps) => (
  <nav
    aria-label="ゲームメニュー"
    className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper-2/90 backdrop-blur-md lg:hidden"
  >
    <div className="mx-auto flex max-w-lg items-stretch gap-1 px-2 pt-1.5 pb-1.5">
      <DockButton
        label="ルート"
        icon={<RouteIcon size={20} />}
        active={active === "route"}
        badge={routeCount > 0 ? routeCount - 1 : undefined}
        onClick={() => onOpen("route")}
      />
      <DockButton
        label="ゴール"
        icon={<FlagIcon size={20} className={isGoalDetailsView ? "text-gold" : undefined} />}
        active={active === "goal"}
        onClick={() => onOpen("goal")}
      />
      {isHintEnabled && (
        <DockButton label="ヒント" icon={<BulbIcon size={20} />} active={active === "hints"} onClick={() => onOpen("hints")} />
      )}
      <DockButton label="メニュー" icon={<MenuIcon size={20} />} active={active === "menu"} onClick={() => onOpen("menu")} />
    </div>
  </nav>
);
