import { useMemo, useState, type ReactElement } from "react";
import { ApplicationLayout } from "~/components/AppLayout";
import { api } from "~/utils/api";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { cn } from "~/utils/utils";
import { formatDistance } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
} from "@tanstack/react-table";
import { type NextPageWithLayout } from "./_app";

type ComponentItem = {
  id: string;
  prompt: string;
  createdAt: Date;
};

const columnHelper = createColumnHelper<ComponentItem>();

const MyUIsPage: NextPageWithLayout = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const dataQuery = api.component.getMyComponents.useQuery({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor("prompt", {
        id: "prompt",
        cell: (props) => (
          <Link href={`/c/${props.row.original.id}`} className="text-indigo-600 hover:text-indigo-800">
            {props.getValue()}
          </Link>
        ),
        header: "提示词",
        maxSize: 350,
      }),
      columnHelper.accessor("createdAt", {
        id: "date",
        cell: (props) => (
          <Link href={`/c/${props.row.original.id}`} className="text-gray-600">
            {formatDistance(new Date(props.getValue()), new Date(), { addSuffix: true, locale: zhCN })}
          </Link>
        ),
        header: "日期",
        maxSize: 100,
      }),
      columnHelper.display({
        id: "actions",
        cell: (props) => (
          <Link href={`/c/${props.row.original.id}`} className="text-gray-400 hover:text-gray-600">
            <ChevronRightIcon className="w-4" />
          </Link>
        ),
        maxSize: 5,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: dataQuery.data?.data.rows ?? [],
    columns,
    pageCount: dataQuery.data?.data.pageCount ?? -1,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const total = dataQuery.data?.data.pageCount ?? 0;

  return (
    <div className="flex h-full flex-grow flex-col bg-neutral-100">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">所有组件</h1>
        <p className="mt-1 text-sm text-gray-500">由 AI 生成的所有组件</p>

        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          {table.getRowModel().rows.length === 0 && !dataQuery.isLoading ? (
            <div className="px-4 py-16 text-center text-sm text-gray-400">
              还没有组件，去{" "}
              <Link href="/new" className="text-indigo-600 hover:text-indigo-800">
                创建第一个
              </Link>{" "}
              吧
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th key={h.id} className="px-4 py-3 font-medium text-gray-500">
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {total > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <div className="text-xs text-gray-500">
                第 {pagination.pageIndex + 1} / {total} 页
              </div>
              <nav className="flex gap-1">
                <button
                  className={cn("rounded border border-gray-300 bg-white px-2 py-1 text-xs", !table.getCanPreviousPage() && "opacity-40")}
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  首页
                </button>
                <button
                  className={cn("rounded border border-gray-300 bg-white px-2 py-1 text-xs", !table.getCanPreviousPage() && "opacity-40")}
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  上一页
                </button>
                <button
                  className={cn("rounded border border-gray-300 bg-white px-2 py-1 text-xs", !table.getCanNextPage() && "opacity-40")}
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  下一页
                </button>
                <button
                  className={cn("rounded border border-gray-300 bg-white px-2 py-1 text-xs", !table.getCanNextPage() && "opacity-40")}
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  末页
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

MyUIsPage.getLayout = (page: ReactElement) => (
  <ApplicationLayout page="所有组件" title="所有组件 · UIForge">
    {page}
  </ApplicationLayout>
);

export default MyUIsPage;
