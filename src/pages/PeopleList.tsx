import React, { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { sendMessage } from '../extension/shared/extensionApi';
import { Person, useAppStore } from '../store/appStore';

function PersonRow({ p, onClick }: { p: Person; onClick: () => void }) {
  return (
    <motion.button
      layout
      type="button"
      onClick={onClick}
      className="w-full text-left px-2 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
      whileHover={{ scale: 1.01 }}
    >
      {p.avatarUrl ? (
        <img alt="" src={p.avatarUrl} className="w-8 h-8 rounded-full" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-200" />
      )}
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{p.name}</div>
        {p.lastActivityTs ? (
          <div className="text-[10px] text-gray-500">{new Date(p.lastActivityTs).toLocaleString()}</div>
        ) : null}
      </div>
      {p.unread ? <span className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded">unread</span> : null}
    </motion.button>
  );
}

export default function PeopleList({ onSelect }: { onSelect: (p: Person) => void }) {
  const { people, setPeople, loadingPeople, setLoadingPeople } = useAppStore();
  const [query, setQuery] = useState('');
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoadingPeople(true);
        const resp = (await sendMessage({ type: 'getPeople' })) as any;
        if (active && resp?.ok && Array.isArray(resp.people)) {
          setPeople(resp.people);
        }
      } catch {
        // ignore
      } finally {
        setLoadingPeople(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [setLoadingPeople, setPeople]);

  const fuse = useMemo(() => new Fuse(people, { keys: ['name'], threshold: 0.3 }), [people]);
  const items = useMemo(() => {
    if (!query) return people;
    return fuse.search(query).map((r) => r.item);
  }, [people, fuse, query]);

  const useVirtual = items.length > 50;

  const rowVirtualizer = useVirtual
    ? useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 56,
        overscan: 8,
      })
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-2">
        <input
          className="w-full border rounded px-2 py-1 text-sm"
          placeholder="Search people"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div ref={parentRef} className="flex-1 overflow-auto px-2">
        {useVirtual && rowVirtualizer ? (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            <AnimatePresence initial={false}>
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const p = items[vi.index];
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    data-index={vi.index}
                    ref={rowVirtualizer.measureElement}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}
                  >
                    <PersonRow p={p} onClick={() => onSelect(p)} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((p) => (
              <PersonRow key={p.id} p={p} onClick={() => onSelect(p)} />
            ))}
          </div>
        )}
      </div>
      {loadingPeople ? <div className="p-2 text-xs text-gray-500">Loading…</div> : null}
    </div>
  );
}
