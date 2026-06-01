import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { KeyboardEvent, ReactNode } from "react";
import "./coupon-admin.css";

interface AdminDataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  getRowId: (row: TData) => string;
  emptyText: string;
  onRowClick?: (row: TData) => void;
  getRowActionLabel?: (row: TData) => string;
  selectedRowIds?: Set<string>;
  onSelectedRowIdsChange?: (ids: Set<string>) => void;
  isRowSelectable?: (row: TData) => boolean;
}

export function AdminDataTable<TData>({
  data,
  columns,
  getRowId,
  emptyText,
  onRowClick,
  getRowActionLabel,
  selectedRowIds,
  onSelectedRowIdsChange,
  isRowSelectable,
}: AdminDataTableProps<TData>): ReactNode {
  const selectionEnabled = Boolean(selectedRowIds && onSelectedRowIdsChange);
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  });

  const toggleRow = (id: string) => {
    if (!selectedRowIds || !onSelectedRowIdsChange) return;
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedRowIdsChange(next);
  };

  const selectableRows = data.filter((row) => isRowSelectable?.(row) ?? true);
  const allSelected =
    selectableRows.length > 0 &&
    selectableRows.every((row) => selectedRowIds?.has(getRowId(row)));

  const toggleAll = () => {
    if (!selectedRowIds || !onSelectedRowIdsChange) return;
    if (allSelected) {
      onSelectedRowIdsChange(new Set());
      return;
    }
    onSelectedRowIdsChange(new Set(selectableRows.map(getRowId)));
  };

  if (data.length === 0) {
    return <div className="couponEmptyState">{emptyText}</div>;
  }

  return (
    <div className="couponTableWrap">
      <table className="couponTable">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {selectionEnabled ? (
                <th scope="col">
                  <input
                    type="checkbox"
                    aria-label="전체 선택"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
              ) : null}
              {headerGroup.headers.map((header) => (
                <th key={header.id} scope="col">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const rowId = row.id;
            const selectable = isRowSelectable?.(row.original) ?? true;
            const rowClickProps = onRowClick
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": getRowActionLabel?.(row.original),
                  onClick: () => onRowClick(row.original),
                  onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(row.original);
                    }
                  },
                }
              : {};

            return (
              <tr
                key={row.id}
                className={onRowClick ? "couponTableRowButton" : undefined}
                {...rowClickProps}
              >
                {selectionEnabled ? (
                  <td>
                    <input
                      type="checkbox"
                      aria-label="행 선택"
                      disabled={!selectable}
                      checked={selectedRowIds?.has(rowId) ?? false}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => toggleRow(rowId)}
                    />
                  </td>
                ) : null}
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
