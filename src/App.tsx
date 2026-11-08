import { HashRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Toast from './components/Toast';
import CityHome from './pages/CityHome';
import TasksPage from './pages/TasksPage';
import ShopPage from './pages/ShopPage';
import StatisticsPage from './pages/StatisticsPage';
import HistoryPage from './pages/HistoryPage';
import SharePage from './pages/SharePage';
import SettingsPage from './pages/SettingsPage';
import { useStore } from './store/useStore';

function Boot() {
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    init().catch((e) => setError((e as Error).message));
  }, [init]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-sm rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-lg">
          <h1 className="text-base font-bold text-slate-800">无法初始化本地存储</h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            你的浏览器可能禁用了 IndexedDB（例如无痕模式）。请换用普通窗口再试。
          </p>
          <p className="mt-2 break-all text-[10px] text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-3 text-xs font-semibold text-slate-400">正在唤醒你的城市…</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CityHome />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/buildings" element={<ShopPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/city" element={<SharePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<CityHome />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Boot />
      <Toast />
    </HashRouter>
  );
}
