import { useEffect } from "react";
import { useRouter } from "next/router";

// 已移除登录功能：登录页直接跳转到工作台
const Login = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace("/new");
  }, [router]);
  return null;
}

export default Login;
