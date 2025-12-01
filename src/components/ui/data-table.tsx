import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

interface DataTableProps {
  headers: string[];
  data: Record<string, string | number>[];
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const DataTable = ({
  headers,
  data,
  className,
  size,
}: DataTableProps) => {
  return (
    <div className={`overflow-x-auto ${className || ""}`}>
      <Table
        className={
          size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
        }
      >
        <TableHeader>
          <TableRow className="border-b">
            {headers.map((header, index) => (
              <TableHead key={index} className="text-center py-3 font-bold">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="border-b last:border-b-0">
              {headers.map((header, colIndex) => {
                const cellValue = row[header];

                return (
                  <TableCell key={colIndex} className={`text-center py-3`}>
                    {cellValue}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
