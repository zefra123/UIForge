import { type ComponentRevision } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDistance } from "date-fns";
import { zhCN } from "date-fns/locale";

export const SideMenu = ({ revisions }: { revisions: ComponentRevision[] }) => {
  // 相对时间只在客户端渲染，避免 SSR/水合时间不一致
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Sort revisions by createdAt date. This isn't an issue since the revision count is relatively small.
  const sortedRevisions = revisions.sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );

  return (
    <div className="flex h-full w-full flex-grow flex-col rounded-lg border border-gray-300 bg-gray-200">
      <div className="flex border-b border-gray-300 px-2 py-2.5">
        <div className="flex grow items-center justify-center truncate text-lg font-semibold">
          <span className="truncate">修订记录</span>
        </div>
      </div>

      <div className="flex grow flex-col px-2 pb-3 pt-6">
        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {sortedRevisions.map((revision, revisionIdx) => (
              <li key={revision.id}>
                <div className="relative pb-8">
                  {revisionIdx !== revisions.length - 1 ? (
                    <span
                      className="absolute left-3 top-4 -ml-px h-full w-0.5 bg-gray-400"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="flex h-8 w-6 items-center justify-center rounded-full bg-gray-200">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-100 ring-1 ring-gray-400" />
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-2 pt-1.5">
                      <div>
                        <p className="text-sm text-gray-500">{mounted ? formatDistance(revision.createdAt, new Date(), { addSuffix: true, locale: zhCN }) : ""}</p>
                        <p
                          className="line-clamp-2 text-sm"
                          title={revision.prompt}
                        >
                          {revision.prompt}
                        </p>
                      </div>
                      <Link
                        className="whitespace-nowrap pr-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        href={`/r/${revision.id}`}
                      >
                        show
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      
    </div>
  );
};
