'use client';

import { useEffect, useState } from 'react';

export interface NavSection {
  id: string;
  label: string;
}

export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const visible = new Set<string>();
    const observers: IntersectionObserver[] = [];

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visible.add(id);
          } else {
            visible.delete(id);
          }
          const first = sections.find((s) => visible.has(s.id));
          if (first) setActiveId(first.id);
        },
        { rootMargin: '-20% 0px -60% 0px' }
      );

      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    setDrawerOpen(false);
  };

  const navList = (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {sections.map(({ id, label }) => {
        const isActive = activeId === id;
        return (
          <li key={id}>
            <button
              onClick={() => scrollTo(id)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: isActive ? 'rgba(102, 126, 234, 0.12)' : 'transparent',
                border: 'none',
                borderLeft: `2px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
                padding: '0.4375rem 0.75rem',
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s',
                lineHeight: 1.4,
              }}
            >
              {label}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Mobile FAB toggle */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setDrawerOpen((o) => !o)}
        aria-label="Toggle section navigation"
        aria-expanded={drawerOpen}
      >
        ☰
      </button>

      {/* Mobile drawer */}
      <div
        className={`sidebar-nav-drawer${drawerOpen ? ' open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      >
        <div className="sidebar-nav-inner" onClick={(e) => e.stopPropagation()}>
          <p
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: '0 0 0.75rem 0',
              padding: '0 0.75rem',
            }}
          >
            On this page
          </p>
          {navList}
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside
        className="sidebar-desktop"
        style={{
          width: '180px',
          flexShrink: 0,
          position: 'sticky',
          top: 'calc(var(--header-height) + 2rem)',
          alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
        }}
      >
        <p
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            margin: '0 0 0.5rem 0',
            padding: '0 0.75rem',
          }}
        >
          On this page
        </p>
        {navList}
      </aside>
    </>
  );
}
