import { useEffect } from 'react';
import Header from '@/panel/components/Header';
import Filters from '@/panel/components/Filters';
import ThreadList from '@/panel/components/ThreadList';
import PreviewPane from '@/panel/components/PreviewPane';
import Stats from '@/panel/components/Stats';
import ActionBar from '@/panel/components/ActionBar';
import ConfirmDialog from '@/panel/components/ConfirmDialog';
import Toasts from '@/panel/components/Toasts';
import { useAppStore } from '@/panel/state/store';

export default function App() {
  const init = useAppStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="flex h-screen flex-col text-[13px]">
      <Header />
      <Filters />
      <Stats />
      <div className="flex-1 grid grid-cols-2 overflow-hidden">
        <div className="min-w-0 overflow-auto">
          <ThreadList />
        </div>
        <div className="min-w-0 border-l border-gray-200 dark:border-gray-800 overflow-auto">
          <PreviewPane />
        </div>
      </div>
      <ActionBar />
      <ConfirmDialog />
      <Toasts />
    </div>
  );
}
