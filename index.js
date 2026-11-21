/**
 * Glass UI 的宿主侧入口。
 * 纯外观插件：不注册工具、不接管服务，玻璃层全部在客户端（lib/client.js）注入，
 * 因此这里保持空实现，只负责让 bundle 能被 Cordis 正常加载。
 */
export function apply() {}
