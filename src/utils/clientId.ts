// 匿名客户端标识：无登录环境下区分"谁创建的组件"
// 浏览器生成一次，存 localStorage，之后所有 tRPC 请求通过 header 携带
export const getClientId = (): string => {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = window.localStorage.getItem("uiforge-client-id");
    if (!id) {
      id = "c" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.localStorage.setItem("uiforge-client-id", id);
    }
    return id;
  } catch {
    return "anon";
  }
};
