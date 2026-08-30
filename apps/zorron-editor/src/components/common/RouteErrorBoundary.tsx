import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home, Layout } from 'lucide-react';

export function RouteErrorBoundary() {
  const error = useRouteError();
  let title = '页面运行出现异常';
  let message = '遇到未知错误，请刷新或返回主页重试。';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data?.message || '请求的页面无法正常加载。';
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-slate-950 p-6 text-slate-100">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-rose-500/10 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-lg shadow-rose-500/10">
          <AlertTriangle size={28} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">
            {message}
          </p>
        </div>

        {error instanceof Error && error.stack && (
          <details className="w-full text-left">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-400">
              查看技术堆栈详情
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-[11px] font-mono text-slate-400">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-5 py-2.5 text-xs font-semibold text-cyan-200 shadow-lg shadow-cyan-500/10 backdrop-blur-sm transition-all hover:border-cyan-400 hover:bg-cyan-500/25 hover:text-white active:scale-95"
          >
            <RotateCcw size={14} />
            <span>重新加载</span>
          </button>
          <Link
            to="/editor"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/80 px-5 py-2.5 text-xs font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-slate-600 hover:bg-slate-700 hover:text-white active:scale-95"
          >
            <Layout size={14} />
            <span>进入节点编辑器</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-2.5 text-xs font-semibold text-slate-400 backdrop-blur-sm transition-all hover:bg-slate-800 hover:text-slate-200 active:scale-95"
          >
            <Home size={14} />
            <span>返回主页</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
