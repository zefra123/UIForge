import { type ReactElement } from "react";
import { ApplicationLayout } from "~/components/AppLayout";
import { type NextPageWithLayout } from "./_app";

const SettingsPage: NextPageWithLayout = () => {
  return (
    <div className="h-full bg-neutral-100 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
          设置
        </h1>
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-6 sm:px-6">
            <h3 className="text-base font-semibold leading-7 text-gray-900">关于 UIForge</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              AI 组件工坊：输入一句自然语言，AI 为你生成可运行的 React + Tailwind 组件。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

SettingsPage.getLayout = (page: ReactElement) => (
  <ApplicationLayout title="设置 · UIForge">{page}</ApplicationLayout>
);

export default SettingsPage;
