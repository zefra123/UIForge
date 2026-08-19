import { type ReactElement } from "react";
import { ApplicationLayout } from "~/components/AppLayout";
import { type NextPageWithLayout } from "./_app";

const Home: NextPageWithLayout = () => {
  return <div className="flex h-full flex-grow flex-col">AI 组件工坊</div>;
};

Home.getLayout = (page: ReactElement) => (
  <ApplicationLayout title="UIForge · AI 组件工坊">{page}</ApplicationLayout>
);

export default Home;
