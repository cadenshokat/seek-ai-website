
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { Clock, FileText } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton'
import { DynamicBreadcrumb } from '@/components/DynamicBreadcrumb'

const routeNames: Record<string, string> = {
  '/': 'Dashboard',
  '/prompts': 'Prompts',
  '/prompts/': 'Item',
  '/sources': 'Sources',
  '/competitors': 'Competitors',
  '/chats': 'Chats',
  '/tags': 'Tags',
  '/people': 'People',
  '/workspace': 'Workspace',
  '/company': 'Company',
  '/billing': 'Billing',
};

function next9amTomorrow(from: Date) {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);       
  d.setHours(9, 0, 0, 0);           
  return d;
}

function formatHMS(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function Header() {
  const location = useLocation();
  const { id } = useParams();
  const currentRoute = routeNames[location.pathname] || 'Dashboard';
  const isPromptPage = location.pathname.startsWith("/prompts");

  const [now, setNow] = useState(() => new Date());
  const [target, setTarget] = useState(() => next9amTomorrow(new Date()));

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (now >= target) setTarget(next9amTomorrow(now));
  }, [now, target]);

  const countdown = useMemo(
    () => formatHMS(target.getTime() - now.getTime()),
    [now, target]
  );


  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <DynamicBreadcrumb
          resolvers={{
            prompt: (id) => /* e.g., promptTitles[id] */ undefined,
            item:   (id) => /* e.g., itemTitles[id]   */ undefined,
            chat:   (id) => /* e.g., chatTitles[id]   */ undefined,
            section:(id) => /* e.g., sectionTitles[id]*/ undefined,
          }}
        />

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{countdown}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <LogoutButton/>
          </div>
        </div>
      </div>
    </header>
  );
}
