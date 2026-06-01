import "./AdminSkeleton.css";

interface AdminSkeletonProps extends React.ComponentProps<"div"> {
  width?: number | string;
}

export function AdminSkeleton({
  className,
  width,
  style,
  ...props
}: AdminSkeletonProps) {
  return (
    <div
      className={["adminSkeleton", className].filter(Boolean).join(" ")}
      style={{ width, ...style }}
      aria-hidden="true"
      {...props}
    />
  );
}

interface AdminPanelSkeletonProps {
  lines?: number;
}

export function AdminPanelSkeleton({ lines = 4 }: AdminPanelSkeletonProps) {
  return (
    <div className="adminSkeletonPanel" aria-busy="true">
      <AdminSkeleton className="adminSkeletonPanelHeader" />
      {Array.from({ length: lines }).map((_, index) => (
        <AdminSkeleton
          key={index}
          className="adminSkeletonPanelLine"
          width={`${92 - index * 12}%`}
        />
      ))}
    </div>
  );
}

interface AdminTableSkeletonBodyProps {
  columnCount: number;
  rowCount?: number;
}

function getTableCellWidth(cellIndex: number): string {
  if (cellIndex === 0) return "64%";
  return `${88 - (cellIndex % 3) * 16}%`;
}

export function AdminTableSkeletonBody({
  columnCount,
  rowCount = 5,
}: AdminTableSkeletonBodyProps) {
  return (
    <tbody>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columnCount }).map((_, cellIndex) => (
            <td key={cellIndex}>
              <AdminSkeleton
                className="adminSkeletonTableCell"
                width={getTableCellWidth(cellIndex)}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
