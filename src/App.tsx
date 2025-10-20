import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PeopleList from './pages/PeopleList';
import ConversationActions from './pages/ConversationActions';
import { useAppStore } from './store/appStore';

function App() {
  const { selectedPerson } = useAppStore();

  const title = useMemo(() => 'Bulk Message Deleter', []);

  return (
    <div className="w-[380px] h-[600px] flex flex-col">
      <div className="px-3 py-2 border-b bg-white sticky top-0 z-10">
        <div className="text-lg font-bold">{title}</div>
        <div className="text-[11px] text-gray-500">Side panel</div>
      </div>
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedPerson ? (
            <motion.div key="people" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }} className="h-full">
              <PeopleList onSelect={(p) => useAppStore.getState().setSelectedPerson(p)} />
            </motion.div>
          ) : (
            <motion.div key="actions" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }} className="h-full">
              <ConversationActions />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {selectedPerson ? (
        <div className="px-3 py-2 border-t bg-white text-right">
          <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => useAppStore.getState().setSelectedPerson(null)}>
            Back to People
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default App;
