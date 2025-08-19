
import React from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { Clock, FileText } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const routeNames: Record<string, string> = {
  '/': 'Dashboard',
  '/prompts': 'Prompts',
  '/sources': 'Sources',
  '/competitors': 'Competitors',
  '/tags': 'Tags',
  '/people': 'People',
  '/workspace': 'Workspace',
  '/company': 'Company',
  '/billing': 'Billing',
};

export function Header() {
  const location = useLocation();
  const { id } = useParams();
  const currentRoute = routeNames[location.pathname] || 'Dashboard';
  const isPromptPage = location.pathname.startsWith("/prompts");

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {isPromptPage && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/prompts">Prompts</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}

            {id && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Item</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>7:08:44</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <FileText className="w-4 h-4" />
            <span>Docs</span>
          </div>
        </div>
      </div>
    </header>
  );
}
