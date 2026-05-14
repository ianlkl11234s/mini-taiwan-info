/**
 * Breadcrumb — 麵包屑
 */

import { Fragment } from "react";

export interface CrumbItem {
  label: string;
  action?: () => void;
}

interface BreadcrumbProps {
  items: CrumbItem[];
  onClick?: (it: CrumbItem) => void;
}

export function Breadcrumb({ items, onClick }: BreadcrumbProps) {
  return (
    <div className="crumb">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && <span className="sep">›</span>}
            {last ? (
              <span className="current">{it.label}</span>
            ) : (
              <button onClick={() => onClick?.(it)}>{it.label}</button>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
