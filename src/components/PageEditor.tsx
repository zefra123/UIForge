import { useEffect, useRef, useState } from "react";
import { compileTypescript } from "~/utils/compiler";

interface MyProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string;
}

export const PageEditor = ({ code }: MyProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [dom, setDom] = useState<string | undefined>(undefined);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Compile and render the page
    const compileCode = async () => {
      const compiledCode = await compileTypescript(code);
      setDom(compiledCode);
    };

    // We resize the canvas to fit the screen. This is not ideal, but it works for now.
    const handleResize = () => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      try {
        // sandbox 隔离下 iframe 是跨源（opaque origin），无法读取内部 document
        const { contentWindow } = iframe;
        if (contentWindow?.document?.documentElement) {
          const { documentElement } = contentWindow.document;
          setDimensions({
            width: documentElement.clientWidth,
            height: documentElement.clientHeight,
          });
          return;
        }
      } catch {
        // 跨源被拦截 → 降级为 iframe 元素自身尺寸
      }
      const rect = iframe.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // Compile the code
    compileCode();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [code]);

  const handleScroll = (event: React.WheelEvent) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.scrollBy(0, event.deltaY);
    } catch {
      // sandbox 跨源下无法控制 iframe 内部滚动；iframe 内容自带滚动条
    }
  };

  return (
    <div className="absolute inset-0 flex justify-center">
      <div
        className="absolute inset-0 overflow-hidden rounded-b-lg"
        onWheel={handleScroll}
      >
        <iframe
          width="100%"
          height="100%"
          tabIndex={-1}
          title="编辑器渲染的 HTML 文档"
          srcDoc={dom}
          ref={iframeRef}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          className="pointer-events-none mx-auto my-0 block w-full min-w-[769] overflow-hidden border-0"
        />
        <div className="pointer-events-none absolute inset-y-0 flex max-w-full">
          <svg
            id="SVGOverlay"
            className="overflow-visible"
            width={dimensions.width}
            height={dimensions.height}
            ref={svgRef}
            // style="transform: translate3d(0px, 0px, 0px);"
          >
            <rect id="SVGSelection"></rect>
            <rect id="SVGHover"></rect>
          </svg>
        </div>
      </div>
    </div>
  );
};
