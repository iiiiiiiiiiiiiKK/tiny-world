import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { levelProgress } from '../config/economy';
import {
  Building2,
  CheckSquare,
  ChartNoAxesColumn,
  Clock,
  Share2,
  Settings,
  Sparkles,
} from 'lucide-react';

const NAV = [
  { to: '/', label: '城市', icon: Sparkles, end: true },
  { to: '/tasks', label: '任务', icon: CheckSquare },
  { to: '/buildings', label: '商店', icon: Building2 },
  { to: '/statistics', label: '统计', icon: ChartNoAxesColumn },
  { to: '/history', label: '记录', icon: Clock },
  { to: '/city', label: '分享', icon: Share2 },
  { to: '/settings', label: '设置', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const profile = useStore((s) => s.profile);
  const location = useLocation();
  const progress = levelProgress(profile.xp);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex h-full min-h-screen flex-col bg-slate-50">
      {/* 顶部栏 */}
      <header className="safe-top sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold leading-tight text-slate-800 sm:text-base">
                {profile.cityName}
              </div>
              <div className="truncate text-[11px] leading-tight text-slate-500">
                Lv.{profile.level} {progress.current.name}
                {progress.next && ` · ${progress.remaining} XP 到 Lv.${progress.next.level}`}
              </div>
            </div>
          </div>

          {/* 桌面端导航 */}
          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <a
            href="https://x.com/0xkillcoin"
            target="_blank"
            rel="noopener noreferrer"
            title="作者 X"
            className="ml-auto rounded-lg border border-slate-200 px-2.5 py-1 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 lg:ml-0"
          >
            <span aria-hidden>𝕏</span>
            <span className="ml-1 hidden text-xs font-medium sm:inline">0xkillcoin</span>
          </a>
        </div>

        {/* 经验条 */}
        <div className="h-1 w-full bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-lime-400 transition-all duration-500"
            style={{ width: `${Math.round(progress.ratio * 100)}%` }}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-24 pt-3 sm:px-5 lg:pb-8">{children}</main>

      {/* 移动端底部导航 */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition ${
                    isActive ? 'text-emerald-600' : 'text-slate-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-5 w-5 transition ${isActive ? 'scale-110' : ''}`}
                      strokeWidth={isActive ? 2.4 : 1.9}
                    />
                    <span className="truncate">{n.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
