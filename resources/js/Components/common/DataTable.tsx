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
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
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
import { cn } from '@/Lib/utils'

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
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Pilih semua baris"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Pilih baris"
        />
      </div>
    ),
    meta: { align: 'center', className: 'w-10 shrink-0' },
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
    meta: { align: 'center', className: 'w-12 shrink-0' },
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
    <div className="flex flex-col gap-3 flex-1 min-h-[450px] w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 w-full text-xs">
        <div className="flex items-center gap-1.5 shrink-0">
          <SlidersHorizontal className="size-3.5 text-blue-600 dark:text-blue-400" />
          <span className="font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">Tampilkan Kolom:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 flex-1 justify-start sm:justify-end">
          {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .map((column) => {
              const isVisible = column.getIsVisible()
              const headerLabel =
                typeof column.columnDef.header === 'string'
                  ? column.columnDef.header
                  : getLabel(column.id)

              return (
                <label
                  key={column.id}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer select-none',
                    isVisible
                      ? 'border-blue-200 bg-blue-50/60 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 shadow-2xs'
                      : 'border-slate-200/60 bg-slate-100/60 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 opacity-50',
                  )}
                >
                  <Checkbox
                    checked={isVisible}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    className="size-3.5 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <span className={cn(!isVisible && 'line-through')}>{headerLabel}</span>
                </label>
              )
            })}
        </div>
      </div>

      <div className="relative flex-1 min-h-[380px] w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <Table className="w-full text-xs">
          <TableHeader className="sticky top-0 z-10 bg-surface-muted border-b-2 border-border">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const meta = header.column.columnDef.meta as { align?: 'left' | 'center' | 'right'; className?: string } | undefined
                  const headerAlignClass = 'text-center justify-center'

                  return (
                    <TableHead
                      key={header.id}
                      className={`h-10 px-2 py-2 align-middle font-bold text-content text-xs tracking-wider whitespace-nowrap border-r border-border last:border-r-0 bg-surface-muted/80 ${headerAlignClass} ${canSort ? 'cursor-pointer select-none hover:text-primary transition-colors' : ''} ${meta?.className ?? ''}`}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className={`flex items-center gap-1.5 ${headerAlignClass}`}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort &&
                          (header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="size-4 text-primary shrink-0" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className="size-4 text-primary shrink-0" />
                          ) : (
                            <ChevronsUpDown className="size-3.5 text-content-muted shrink-0" />
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
                <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined} className="hover:bg-muted/30 transition-colors border-b border-border">
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as { align?: 'left' | 'center' | 'right'; className?: string } | undefined
                    const alignClass =
                      meta?.align === 'center'
                        ? 'text-center justify-center'
                        : meta?.align === 'right'
                          ? 'text-right justify-end'
                          : 'text-left justify-start'

                    return (
                      <TableCell key={cell.id} className={`px-2 py-2 align-middle whitespace-nowrap border-r border-border last:border-r-0 ${alignClass} ${meta?.className ?? ''}`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
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
