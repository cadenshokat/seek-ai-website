
import { Home, FileText, Globe, BarChart3, Settings, Users, Tags, MessageSquare } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator'

const navigationItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  //{ title: 'AI Optimization', url: '/optimization', icon: BarChart3 },
  { title: 'Prompts', url: '/prompts', icon: FileText },
  { title: 'Chats', url: '/chats', icon: MessageSquare },
  { title: 'Sources', url: '/sources', icon: Globe },
  { title: 'Competitors', url: '/competitors', icon: Users },
  { title: 'Tags', url: '/tags', icon: Tags },
];

const settingsItems = [
  { title: 'People', url: '/people', icon: Users },
  { title: 'Workspace', url: '/workspace', icon: Settings },
  { title: 'Company', url: '/company', icon: BarChart3 },
];

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-gray-200 bg-white">
      <SidebarHeader className="p-5">
        <div className="flex items-center space-x-2 text-2xl justify-center">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="logo" className="w-8"/>
          <span className="font-semibold text-gray-900">Seek.ai</span>
        </div>
      </SidebarHeader>
      <Separator/>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-gray-500 tracking-wider mb-2">
            General
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => 
                        `flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                          isActive 
                            ? 'bg-gray-100 text-gray-900' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <Separator />
        <SidebarGroup className="mt-1">
          <SidebarGroupLabel className="text-xs font-medium text-gray-500 tracking-wider mb-2">
            Preferences
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => 
                        `flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                          isActive 
                            ? 'bg-gray-100 text-gray-900' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <Separator />
        <SidebarGroup className="mt-1">
          <SidebarGroupLabel className="text-xs font-medium text-gray-500 tracking-wider mb-2">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/billing" 
                    className={({ isActive }) => 
                      `flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                        isActive 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`
                    }
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Billing</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
