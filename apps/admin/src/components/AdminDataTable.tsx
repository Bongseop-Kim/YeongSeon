import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { KeyboardEvent } from "react";
import { Checkbox } from "seed-design/ui/checkbox";
import { AdminTableSkeletonBody } from "@/components/AdminSkeleton";
import "./AdminDataTable.css";

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
  minWidth?: number;
  isLoading?: boolean;
  loadingRowCount?: number;
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
  minWidth = 720,
  isLoading = false,
  loadingRowCount = 5,
}: AdminDataTableProps<TData>) {
  const selectionEnabled = Boolean(selectedRowIds && onSelectedRowIdsChange);
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  });

  const toggleRow = (id: string): void => {
    if (!selectedRowIds || !onSelectedRowIdsChange) return;

    const next = new Set(selectedRowIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    onSelectedRowIdsChange(next);
  };

  const selectableRows = data.filter((row) => isRowSelectable?.(row) ?? true);
  const allSelected =
    selectableRows.length > 0 &&
    selectableRows.every((row) => selectedRowIds?.has(getRowId(row)));

  const toggleAll = (): void => {
    if (!selectedRowIds || !onSelectedRowIdsChange) return;

    onSelectedRowIdsChange(
      allSelected ? new Set() : new Set(selectableRows.map(getRowId)),
    );
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    row: TData,
  ): void => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    onRowClick?.(row);
  };

  if (isLoading) {
    const skeletonColumnCount = columns.length + (selectionEnabled ? 1 : 0);

    return (
      <div className="adminDataTableWrap" aria-busy="true">
        <table className="adminDataTable" style={{ minWidth }}>
          <AdminTableSkeletonBody
            columnCount={skeletonColumnCount}
            rowCount={loadingRowCount}
          />
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="adminDataTableEmpty" role="status" aria-live="polite">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="adminDataTableWrap">
      <table className="adminDataTable" style={{ minWidth }}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {selectionEnabled ? (
                <th scope="col">
                  <Checkbox
                    aria-label="전체 선택"
                    checked={allSelected}
                    onCheckedChange={toggleAll}
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
            const selectable = isRowSelectable?.(row.original) ?? true;
            const rowClickProps = onRowClick
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": getRowActionLabel?.(row.original),
                  onClick: () => onRowClick(row.original),
                  onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) =>
                    handleRowKeyDown(event, row.original),
                }
              : {};

            return (
              <tr
                key={row.id}
                className={onRowClick ? "adminDataTableRowButton" : undefined}
                {...rowClickProps}
              >
                {selectionEnabled ? (
                  <td>
                    <span onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        aria-label="행 선택"
                        disabled={!selectable}
                        checked={selectedRowIds?.has(row.id) ?? false}
                        onCheckedChange={() => toggleRow(row.id)}
                      />
                    </span>
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
