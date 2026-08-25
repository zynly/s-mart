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
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Copy,
  Download,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog'
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
  onBulkDelete?: (selectedRows: TData[], selectedIds: string[]) => void
  getRowId?: (row: TData) => string
  emptyTitle?: string
  emptyDescription?: string
}

function downloadCsv<TData>(data: TData[], filename = 'data-terpilih.csv') {
  if (!data.length) return
  const first = data[0] as Record<string, unknown>
  const keys = Object.keys(first).filter((k) => typeof first[k] !== 'object' || first[k] === null)
  const headerLine = keys.join(',')
  const rows = data.map((row) => {
    const r = row as Record<string, unknown>
    return keys
      .map((k) => {
        const val = r[k]
        const str = val === null || val === undefined ? '' : String(val)
        return `"${str.replace(/"/g, '""')}"`
      })
      .join(',')
  })
  const csvContent = [headerLine, ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function DataTable<TData>({
  columns,
  data,
  pagination,
  enableRowSelection = true,
  showNumberColumn = true,
  bulkActions,
  getRowId,
  emptyTitle = 'Belum ada data',
  emptyDescription,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const isAllRowsSelected = data.length > 0 && Object.keys(rowSelection).filter((k) => rowSelection[k]).length >= data.length
  const isSomeRowsSelected = !isAllRowsSelected && Object.keys(rowSelection).filter((k) => rowSelection[k]).length > 0

  const toggleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const nextSelection: RowSelectionState = {}
      data.forEach((row, idx) => {
        const id = getRowId ? getRowId(row) : String(idx)
        nextSelection[id] = true
      })
      setRowSelection(nextSelection)
    } else {
      setRowSelection({})
    }
  }

  const showAllColumns = () => {
    const allVis: VisibilityState = {}
    table.getAllColumns().forEach((col) => {
      allVis[col.id] = true
    })
    setColumnVisibility(allVis)
  }

  const resetColumns = () => {
    setColumnVisibility({})
  }

  const selectionColumn: ColumnDef<TData, unknown> = {
    id: 'select',
    header: () => (
      <div className="flex items-center justify-center p-0.5">
        <Checkbox
          checked={isAllRowsSelected ? true : isSomeRowsSelected ? 'indeterminate' : false}
          onCheckedChange={(value) => toggleSelectAllRows(!!value)}
          aria-label="Pilih semua baris"
          className="size-4 cursor-pointer rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center p-0.5">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Pilih baris"
          className="size-4 cursor-pointer rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
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
      {/* Toolbar Tabel: Info Seleksi Data di Kiri & Dropdown Atur Kolom di Kanan */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-0.5">
        {/* Kiri: Status & Aksi Seleksi Baris */}
        <div className="flex items-center gap-2">
          {Object.keys(rowSelection).filter((k) => rowSelection[k]).length > 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-blue-900 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800">
              <span className="flex size-2 rounded-full bg-blue-600 animate-pulse" />
              <span>{Object.keys(rowSelection).filter((k) => rowSelection[k]).length} dari {data.length} baris dipilih</span>
              <button
                type="button"
                onClick={() => toggleSelectAllRows(false)}
                className="ml-1 text-[11px] font-semibold text-blue-700 hover:text-blue-950 dark:text-blue-300 dark:hover:text-white underline cursor-pointer"
              >
                Batal
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium">
              Centang checkbox untuk aksi masal data
            </div>
          )}
        </div>

        {/* Kanan: Tombol Popover Atur Kolom yang Ringkas & Rapi */}
        {table.getAllColumns().some((c) => c.getCanHide()) && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:bg-slate-50"
              >
                <SlidersHorizontal className="size-3.5 text-blue-600 dark:text-blue-400" />
                <span>Atur Kolom ({table.getAllColumns().filter((c) => c.getCanHide() && c.getIsVisible()).length}/{table.getAllColumns().filter((c) => c.getCanHide()).length})</span>
                <ChevronDown className="size-3 opacity-60 ml-0.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3 bg-white dark:bg-surface border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Tampilkan Kolom</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={showAllColumns}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    Semua
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={resetColumns}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
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
                          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 select-none',
                          isVisible ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-400 dark:text-slate-500 line-through',
                        )}
                      >
                        <Checkbox
                          checked={isVisible}
                          onCheckedChange={(value) => {
                            column.toggleVisibility(!!value)
                            setColumnVisibility((prev) => ({ ...prev, [column.id]: !!value }))
                          }}
                          className="size-3.5 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <span>{headerLabel}</span>
                      </label>
                    )
                  })}
              </div>
            </PopoverContent>
          </Popover>
        )}
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

      {enableRowSelection && (
        <BulkActionBar
          selectedCount={selectedRows.length}
          actions={
            bulkActions && bulkActions.length > 0
              ? [
                  ...bulkActions,
                  {
                    label: 'Salin',
                    icon: <Copy className="size-3.5 mr-1" />,
                    onClick: () => {
                      const selectedData = selectedRows.map((r) => r.original)
                      void navigator.clipboard.writeText(JSON.stringify(selectedData, null, 2))
                      toast.success(`${selectedRows.length} baris data disalin ke clipboard.`)
                    },
                  },
                  {
                    label: 'Ekspor CSV',
                    icon: <Download className="size-3.5 mr-1" />,
                    onClick: () => {
                      const selectedData = selectedRows.map((r) => r.original)
                      downloadCsv(selectedData, `ekspor-${selectedRows.length}-data.csv`)
                      toast.success(`${selectedRows.length} baris data diekspor ke CSV.`)
                    },
                  },
                  ...(onBulkDelete
                    ? [
                        {
                          label: 'Hapus Terpilih',
                          icon: <Trash2 className="size-3.5 mr-1 text-red-500" />,
                          variant: 'destructive' as const,
                          onClick: () => setBulkDeleteOpen(true),
                        },
                      ]
                    : []),
                ]
              : [
                  {
                    label: 'Salin Data',
                    icon: <Copy className="size-3.5 mr-1" />,
                    onClick: () => {
                      const selectedData = selectedRows.map((r) => r.original)
                      void navigator.clipboard.writeText(JSON.stringify(selectedData, null, 2))
                      toast.success(`${selectedRows.length} baris data disalin ke clipboard.`)
                    },
                  },
                  {
                    label: 'Unduh CSV',
                    icon: <Download className="size-3.5 mr-1" />,
                    onClick: () => {
                      const selectedData = selectedRows.map((r) => r.original)
                      downloadCsv(selectedData, `ekspor-${selectedRows.length}-data.csv`)
                      toast.success(`${selectedRows.length} baris data diekspor ke CSV.`)
                    },
                  },
                  {
                    label: 'Hapus Terpilih',
                    icon: <Trash2 className="size-3.5 mr-1 text-red-500" />,
                    variant: 'destructive' as const,
                    onClick: () => setBulkDeleteOpen(true),
                  },
                ]
          }
          onClear={() => setRowSelection({})}
        />
      )}

      {/* Modal Dialog Konfirmasi Hapus Masal */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-surface border border-red-200 dark:border-red-900/50 p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 mb-2">
              <AlertTriangle className="size-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-slate-900 dark:text-white">
              Konfirmasi Hapus {selectedRows.length} Data Terpilih
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-600 dark:text-slate-400 mt-1.5">
              Apakah Anda yakin ingin memproses penghapusan data ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-3 my-2 text-xs space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-500">Jumlah data:</span>
              <span className="text-slate-900 dark:text-white font-bold">{selectedRows.length} item</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>ID Terpilih:</span>
              <span className="font-mono truncate max-w-[200px]">
                {selectedRows.map((r) => (getRowId ? getRowId(r.original) : (r.original as { id?: number })?.id ?? r.index)).join(', ')}
              </span>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-center mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBulkDeleteOpen(false)}
              className="rounded-xl px-4 text-xs font-semibold"
            >
              Batalkan
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                const selectedData = selectedRows.map((r) => r.original)
                const selectedIds = selectedRows.map((r) => (getRowId ? getRowId(r.original) : String((r.original as { id?: number })?.id ?? r.index)))
                setBulkDeleteOpen(false)
                if (onBulkDelete) {
                  onBulkDelete(selectedData, selectedIds)
                } else {
                  toast.info(`Permintaan hapus ${selectedRows.length} data diproses.`)
                }
                setRowSelection({})
              }}
              className="rounded-xl px-4 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
            >
              Ya, Hapus Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
