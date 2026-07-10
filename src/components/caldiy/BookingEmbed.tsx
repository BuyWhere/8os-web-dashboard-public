'use client';

import { useEffect, useRef } from 'react';

interface BookingEmbedProps {
  calDiyUrl?: string;
  eventTypeSlug?: string;
  className?: string;
}

export function BookingEmbed({
  calDiyUrl = process.env.NEXT_PUBLIC_CALDIY_URL,
  eventTypeSlug,
  className,
}: BookingEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calDiyUrl || !containerRef.current) return;

    const container = containerRef.current;

    const loadEmbed = async () => {
      const script = document.createElement('script');
      script.src = `${calDiyUrl}/embed/embed.js`;
      script.async = true;
      script.onload = () => {
        if ((window as typeof window & { Cal?: { __esModule: boolean; init: (config: object) => void } }).Cal) {
          const Cal = (window as typeof window & { Cal?: { __esModule: boolean; init: (config: object) => void } }).Cal;
          if (Cal) {
            Cal.init({
              element: container,
              url: eventTypeSlug ? `${calDiyUrl}/${eventTypeSlug}` : calDiyUrl,
            });
          }
        }
      };
      document.head.appendChild(script);
    };

    loadEmbed();

    return () => {
      const scripts = document.head.querySelectorAll(`script[src="${calDiyUrl}/embed/embed.js"]`);
      scripts.forEach((s) => s.remove());
    };
  }, [calDiyUrl, eventTypeSlug]);

  if (!calDiyUrl) {
    return (
      <div className={className} style={containerStyle}>
        <p style={{ color: '#888' }}>
          Cal.diy not configured. Set NEXT_PUBLIC_CALDIY_URL in environment.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...containerStyle,
        minHeight: '600px',
      }}
      data-cal-link={eventTypeSlug || ''}
    />
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  background: '#111',
  border: '1px solid #222',
  borderRadius: '12px',
};

export function BookingWidget({ className }: { className?: string }) {
  const calDiyUrl = process.env.NEXT_PUBLIC_CALDIY_URL;

  if (!calDiyUrl) {
    return null;
  }

  return (
    <a
      href={`${calDiyUrl}/book`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={widgetStyle}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      Book a Meeting
    </a>
  );
}

const widgetStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.5rem',
  background: '#111',
  border: '1px solid #333',
  borderRadius: '8px',
  color: '#ededed',
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'border-color 0.2s, background 0.2s',
};
