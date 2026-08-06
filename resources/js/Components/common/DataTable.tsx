import { useState } from 'react'
import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronDown, ChevronUp, ChevronsUpDown, SlidersHorizontal } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table'
import { Checkbox } from '@/Components/ui/checkbox'
import { Button } from '@/Components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/Components/ui/pagination'
import { EmptyState } from '@/Components/common/EmptyState'
import { BulkActionBar, type BulkAction } from '@/Components/common/BulkActionBar'
import { getLabel } from '@/Lib/labels'

export type ServerPagination = {
  page: number
  perPage: number
  total: number
  onPageChange: (page: number) => void
}

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  pagination?: ServerPagination
  enableRowSelection?: boolean
  showNumberColumn?: boolean
  bulkActions?: BulkAction[]
  getRowId?: (row: TData) => string
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTable<TData>({
  columns,
  data,
  pagination,
  enableRowSelection = false,
  showNumberColumn = true,
  bulkActions,
  getRowId,
  emptyTitle = 'Belum ada data',
  emptyDescription,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const selectionColumn: ColumnDef<TData, unknown> = {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Pilih semua baris"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Pilih baris"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }

  const hasNoCol = columns.some((col) => col.id === 'no' || col.id === 'rowNumber' || col.id === 'number')

  const numberColumn: ColumnDef<TData, unknown> = {
    id: 'rowNumber',
    header: 'No.',
    cell: ({ row }) => {
      const pageIndex = pagination ? pagination.page - 1 : 0
      const pageSize = pagination ? pagination.perPage : 10
      return <span className="font-mono text-xs text-content-muted font-medium">{pageIndex * pageSize + row.index + 1}</span>
    },
    enableSorting: false,
    enableHiding: false,
  }

  const finalColumns = [
    ...(enableRowSelection ? [selectionColumn] : []),
    ...(showNumberColumn && !hasNoCol ? [numberColumn] : []),
    ...columns,
  ]

  const table = useReactTable({
    data,
    columns: finalColumns,
    state: { sorting, rowSelection, columnVisibility },
    getRowId,
    enableRowSelection,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  })

  const selectedRows = table.getSelectedRowModel().rows
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.perPage)) : 1

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-[450px]">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="size-3.5" />
              Kolom
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {getLabel(column.id)}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative flex-1 min-h-[380px] overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-surface">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()

                  return (
                    <TableHead
                      key={header.id}
                      className={canSort ? 'cursor-pointer select-none' : undefined}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort &&
                          (header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="size-3.5" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronsUpDown className="size-3.5 text-content-muted" />
                          ))}
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="h-40 text-center">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex shrink-0 items-center justify-between border-t border-border pt-3 text-xs text-content-muted">
          <p>
            Menampilkan <span className="font-mono font-bold text-content">{pagination.total > 0 ? (pagination.page - 1) * pagination.perPage + 1 : 0}</span> - <span className="font-mono font-bold text-content">{Math.min(pagination.page * pagination.perPage, pagination.total)}</span> dari <span className="font-mono font-bold text-content">{pagination.total}</span> data
          </p>
          <Pagination className="w-auto m-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => pagination.page > 1 && pagination.onPageChange(pagination.page - 1)}
                  className={pagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - pagination.page) <= 1 || p === 1 || p === totalPages)
                .map((p, index, arr) => (
                  <PaginationItem key={p}>
                    {index > 0 && arr[index - 1] !== p - 1 && <span className="px-2 text-content-muted">…</span>}
                    <PaginationLink isActive={p === pagination.page} onClick={() => pagination.onPageChange(p)} className="cursor-pointer">
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => pagination.page < totalPages && pagination.onPageChange(pagination.page + 1)}
                  className={pagination.page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {enableRowSelection && bulkActions && (
        <BulkActionBar
          selectedCount={selectedRows.length}
          actions={bulkActions}
          onClear={() => setRowSelection({})}
        />
      )}
    </div>
  )
}
