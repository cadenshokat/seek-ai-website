import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton'
import { DynamicBreadcrumb } from '@/components/DynamicBreadcrumb'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

function next1315Daily(from: Date) {
  const d = new Date(from);
  const target = new Date(d);
  target.setHours(13, 15, 0, 0); 
  if (d >= target) {
    target.setDate(target.getDate() + 1);
  }
  return target;
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
  const [target, setTarget] = useState(() => next1315Daily(new Date()));

  useEffect(() => {
    const handle = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(handle);
  }, []);

  useEffect(() => {
    if (now >= target) setTarget(next1315Daily(now));
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
            prompt: (id) => undefined,
            item:   (id) => undefined,
            chat:   (id) => undefined,
            section:(id) => undefined,
          }}
        />

        <div className="flex items-center space-x-4">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center space-x-2 text-sm text-gray-600 select-none cursor-default">
                  <Clock className="w-4 h-4" />
                  <span>{countdown}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>
                  <span className="font-medium text-xs">Next run at 1:15 PM EST</span>.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <LogoutButton/>
          </div>
        </div>
      </div>
    </header>
  );
}
