import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Database,
  Download,
  HardDrive,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { db } from '../data/db';

export default function SettingsPage() {
  const profile = useStore((s) => s.profile);
  const renameCity = useStore((s) => s.renameCity);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const resetAll = useStore((s) => s.resetAll);
  const setToast = useStore((s) => s.setToast);

  const [name, setName] = useState(profile.cityName);
  const [confirmReset, setConfirmReset] = useState(false);
  const [storageInfo, setStorageInfo] = useState<string>('计算中…');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refreshStorage = async () => {
    try {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        const used = ((est.usage ?? 0) / 1024).toFixed(1);
        const quota = ((est.quota ?? 0) / 1024 / 1024).toFixed(0);
        setStorageInfo(`已用 ${used} KB / 配额约 ${quota} MB`);
      } else {
        let count = 0;
        for (const t of db.tables) {
          count += await t.count();
        }
        setStorageInfo(`本地已存 ${count} 条记录`);
      }
    } catch {
      setStorageInfo('无法读取存储信息');
    }
  };

  const doExport = async () => {
    try {
      const json = await exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tiny-world-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setToast('数据已导出', 'ok');
    } catch {
      setToast('导出失败', 'error');
    }
  };

  const doImport = async (file: File) => {
    try {
      const text = await file.text();
      const r = await importData(text);
      setToast(r.message, r.ok ? 'ok' : 'error');
      if (r.ok) setName(useStore.getState().profile.cityName);
    } catch {
      setToast('读取文件失败', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-slate-800 sm:text-xl">设置</h1>
        <p className="mt-0.5 text-xs text-slate-500">本地优先，无需登录，数据只存在这台设备上。</p>
      </div>

      {/* 城市名 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <Pencil className="h-4 w-4 text-emerald-500" />
          城市名称
        </h2>
        <div className="mt-3 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            placeholder="给我的城市起个名字"
          />
          <button
            type="button"
            onClick={async () => {
              await renameCity(name);
              setToast('城市已改名', 'ok');
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 active:scale-95"
          >
            <Save className="h-4 w-4" />
            保存
          </button>
        </div>
      </div>

      {/* 数据备份 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <Database className="h-4 w-4 text-emerald-500" />
          数据备份与恢复
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          导出为 JSON 文件保存到本地；恢复时会完整覆盖当前数据。任务记录不会上传到任何服务器。
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={doExport}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            导出数据
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <Upload className="h-4 w-4" />
            恢复数据
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = '';
          }}
        />

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <HardDrive className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="text-[11px] text-slate-500">{storageInfo}</span>
          <button
            type="button"
            onClick={refreshStorage}
            className="ml-auto rounded-lg p-1 text-slate-400 transition hover:bg-slate-200"
            aria-label="刷新"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 隐私 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          隐私说明
        </h2>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-slate-500">
          <li>· 所有任务、城市布局与奖励记录仅保存在浏览器 IndexedDB 中。</li>
          <li>· 不需要注册登录，不收集任何个人身份信息。</li>
          <li>· 清除浏览器数据会同时删除城市，请定期导出备份。</li>
          <li>· 本项目不包含任何第三方统计脚本或广告追踪。</li>
        </ul>
      </div>

      {/* 危险操作 */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-rose-700">
          <AlertTriangle className="h-4 w-4" />
          重置全部数据
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-rose-600/80">
          这会永久删除这座城市的所有任务、建筑与历史记录，且无法撤销。建议先导出备份。
        </p>
        {confirmReset ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={async () => {
                await resetAll();
                setConfirmReset(false);
                setName(useStore.getState().profile.cityName);
                setToast('已重置', 'info');
              }}
              className="rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white transition hover:bg-rose-700 active:scale-[0.98]"
            >
              确认删除全部数据
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="mt-3 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
          >
            我要重置
          </button>
        )}
      </div>

      <p className="pb-2 text-center text-[10px] text-slate-400">
        Tiny World · Build Your World, One Day at a Time. · MIT License
      </p>
    </div>
  );
}
