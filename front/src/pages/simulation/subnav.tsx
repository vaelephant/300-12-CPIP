import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/simulation", label: "推演工作台", end: true },
  { to: "/simulation/engine", label: "引擎与记录", end: false },
] as const;

/** 路径模拟模块内页签：工作台 / 引擎与记录 */
export function SimulationSubnav() {
  return (
    <nav
      aria-label="路径模拟分区"
      className="mb-4 flex items-center gap-5 border-b border-line"
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "relative -mb-px inline-flex h-9 items-center border-b-[1.5px] border-transparent text-[13px] font-medium text-muted-foreground transition-colors",
              "hover:text-foreground",
              isActive && "border-primary text-foreground",
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
