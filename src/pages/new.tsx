import { useState, type ReactElement, useRef, Fragment } from "react";
import { ApplicationLayout } from "~/components/AppLayout";
import {
  ChevronRightIcon,
  CommandLineIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Dialog, Transition } from "@headlessui/react";
import { Spinner } from "~/components/Spinner";
import Image from "next/image";
import { api } from "~/utils/api";
import toast from "react-hot-toast";
import router from "next/router";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { ParticleBackground } from "~/components/ParticleBackground";
import { type NextPageWithLayout } from "./_app";

const items = [
  {
    name: "落地页首屏（CTA）",
    description:
      "一个居中排版的首屏区块：标题、副标题和带链接的按钮。背景为蓝到紫渐变，文字白色，按钮紫色。",
  },
  {
    name: "产品功能展示",
    description:
      "一个产品功能区块：标题、副标题，以及居中的 2x2 网格展示产品特性。背景灰色，文字白色。",
  },
  {
    name: "产品卡片",
    description:
      "两张居中的产品卡片：产品图片、名称、描述和按钮。背景白色、文字黑色、按钮紫色。",
  },
];

const loadingItems = [
  {
    image: "/images/compiling.png",
    subtext: "代码生成中，休息一下吧",
    xkcd: 303,
  },
  {
    image: "/images/estimation.png",
    subtext: "为什么没有时间估算？",
    xkcd: 612,
  },
  {
    image: "/images/machine_learning.png",
    subtext: "稍微修改提示词，输出就可能大不同",
    xkcd: 1838,
  },
];

const NewPage: NextPageWithLayout = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [input, setInput] = useState<string>("");

  const generateComponent = api.component.createComponent.useMutation();
  const randomItem =
    loadingItems[Math.floor(Math.random() * loadingItems.length)]!;

  const handleGenerateComponent = async (prompt: string) => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const result = await generateComponent.mutateAsync(prompt);
      if (result.status === "error") {
        throw new Error("组件生成失败");
      }
      const { componentId } = result.data;

      // 炫技：生成成功 → 彩带庆祝 → 稍作停留再跳转
      confetti({
        particleCount: 120,
        spread: 75,
        origin: { y: 0.6 },
        colors: ["#6366f1", "#8b5cf6", "#3b82f6", "#ec4899"],
      });
      await new Promise((r) => setTimeout(r, 700));
      await router.push(`/c/${componentId}`);
      return;
    } catch (e) {
      setIsGenerating(false);
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg && !msg.includes("Internal server error") ? msg : "生成失败，请稍后重试");
      return;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input === "") return;
    handleGenerateComponent(input);
  };

  return (
    <div className="relative flex h-full flex-grow flex-col overflow-hidden bg-neutral-50">
      {/* 动态粒子背景 + 渐变光晕 */}
      <ParticleBackground />
      <div className="pointer-events-none absolute -top-40 left-1/2 z-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 z-0 h-[400px] w-[500px] rounded-full bg-gradient-to-tl from-blue-500/15 to-cyan-400/15 blur-3xl" />

      <div className="relative z-10 flex min-w-0 flex-grow">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Transition appear show={isGenerating} as={Fragment}>
            <Dialog as="div" className="relative z-20" onClose={() => {}}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm" />
              </Transition.Child>
              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-90"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-90"
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-full max-w-md transform overflow-hidden rounded-2xl border border-indigo-200 bg-white/95 p-6 text-left align-middle shadow-2xl transition-all backdrop-blur"
                    >
                      <Dialog.Title>
                        <div className="flex items-center gap-2">
                          <SparklesIcon className="h-5 w-5 animate-pulse text-indigo-500" />
                          <Spinner label="生成中..." className="text-md font-medium text-gray-600" />
                        </div>
                      </Dialog.Title>
                      <div className="mt-2 justify-center">
                        <p className="text-center text-sm text-gray-500">
                          请稍候，AI 正在为你创作组件。
                        </p>
                        <div className="mx-auto mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-gray-200">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                          />
                        </div>
                        <Image
                          src={randomItem.image}
                          alt="编译中"
                          width={260}
                          height={260}
                          className="mx-auto mt-6"
                        />
                      </div>
                      <p className="mt-1 text-center text-xs text-gray-500">
                        {`${randomItem.subtext} (`}
                        <a
                          href={`https://xkcd.com/${randomItem.xkcd}`}
                          target="_blank" rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-500"
                        >
                          xkcd
                        </a>
                        )
                      </p>
                    </motion.div>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>

          <motion.form
            onSubmit={handleSubmit}
            ref={formRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="relative mx-5 my-56 flex items-center sm:mx-10 md:mx-32">
              <div className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500/40 via-purple-500/40 to-pink-500/40 opacity-0 blur transition duration-300 group-focus-within:opacity-100" />
              <input
                type="text"
                className="group relative block w-full rounded-xl border border-indigo-200 bg-white/90 py-3 pl-4 pr-16 text-gray-900 shadow-lg shadow-indigo-100 backdrop-blur transition placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-4 focus:ring-indigo-400/40 sm:text-sm sm:leading-6"
                placeholder="描述你想要的组件，让 AI 帮你实现..."
                onChange={handleInputChange}
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="absolute right-2 inline-flex items-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-300 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
                disabled={isGenerating}
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-base font-semibold leading-6 text-gray-900">
              需要灵感吗？
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              试试下面的提示词开始创作吧。
            </p>
          </motion.div>

          <ul role="list" className="mt-6 divide-y divide-gray-200 border-b border-t border-gray-200">
            {items.map((item, itemIdx) => (
              <motion.li
                key={itemIdx}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + itemIdx * 0.12, duration: 0.4 }}
                whileHover={{ x: 8 }}
                className="group relative"
              >
                <div className="group relative flex items-start space-x-3 py-4">
                  <motion.span
                    whileHover={{ rotate: 8, scale: 1.1 }}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-200"
                  >
                    <CommandLineIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </motion.span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleGenerateComponent(item.description);
                        }}
                        disabled={isGenerating}
                        className="transition-colors hover:text-indigo-600"
                      >
                        <span className="absolute inset-0" aria-hidden="true" />
                        {item.name}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <div className="flex-shrink-0 self-center transition-transform duration-300 group-hover:translate-x-1">
                    <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-indigo-500" aria-hidden="true" />
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

NewPage.getLayout = (page: ReactElement) => (
  <ApplicationLayout title="创建新组件 · UIForge">{page}</ApplicationLayout>
);

export default NewPage;
