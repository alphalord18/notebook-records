import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface DataTableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: string;
    cell: (item: T) => React.ReactNode;
  }[];
  pageSizeOptions?: number[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  pageSizeOptions = [5, 10, 25, 50],
  searchable = true,
  searchPlaceholder = "Search...",
  pageSize: initialPageSize = 10,
  className,
}: DataTableProps<T>) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter data based on search query
  const filteredData = searchable && searchQuery
    ? data.filter((item) => {
        const searchableProps = Object.values(item as Record<string, any>);
        return searchableProps.some(
          (prop) =>
            prop && 
            typeof prop === "string" && 
            prop.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : data;

  // Calculate pagination
  const pageCount = Math.ceil(filteredData.length / pageSize);
  const startIndex = pageIndex * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageData = filteredData.slice(startIndex, endIndex);

  // Handle pagination
  const goToPage = (page: number) => {
    const maxPage = pageCount - 1;
    setPageIndex(Math.max(0, Math.min(page, maxPage)));
  };

  return (
    <div className={className}>
      {searchable && (
        <div className="mb-4 flex justify-between items-center">
          <div className="relative max-w-sm">
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPageData.length > 0 ? (
              currentPageData.map((item, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={`${index}-${column.key}`}>
                      {column.cell(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2 mt-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium">
              {filteredData.length > 0 ? startIndex + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(endIndex, filteredData.length)}
            </span>{" "}
            of <span className="font-medium">{filteredData.length}</span> entries
          </p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize.toString()} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(0)}
            disabled={pageIndex === 0}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page{" "}
            <span className="font-medium">
              {pageCount > 0 ? pageIndex + 1 : 0}
            </span>{" "}
            of <span className="font-medium">{pageCount}</span>
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(pageIndex + 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(pageCount - 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
