import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { Prompts } from "./components/pages/Prompts";
import { Chats } from "./components/pages/Chats";
import ChatItem from "./components/pages/ChatDetail";
import Sources from "./components/pages/Sources";
import { Competitors } from "./components/pages/Competitors";
import { Tags } from "./components/pages/Tags";
import { Workspace } from "./components/pages/Workspace";
import PromptItem from "./components/pages/PromptItem";
import { SourceDetail } from "./components/pages/SourceDetail";
import { Optimization } from "./components/pages/Optimization";
import Billing from "@/components/pages/Billing"
import NotFound from "./pages/NotFound";
import LoginPage from "@/components/pages/Login";
import { useAuth } from "./hooks/useAuth"
import Loading from "@/components/Loading";

const queryClient = new QueryClient();

function PrivateRoute({ children }: {children: JSX.Element }) {
  const { session, loading } = useAuth();
  if (loading) return <Loading/>
  return session ? children : <Navigate to="/login" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage/>} />
            <Route path="/*" element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/optimization" element={<Optimization />} />
                    <Route path="/prompts" element={<Prompts />} />
                    <Route path="/prompts/:promptId" element={<PromptItem />} />
                    <Route path="/prompts/:promptId/sources/:sourceId" element={<SourceDetail />} />
                    <Route path="/chats" element={<Chats />} />
                    <Route path="/chats/:id" element={<ChatItem />} />
                    <Route path="/sources" element={<Sources />} />
                    <Route path="/competitors" element={<Competitors />} />
                    <Route path="/tags" element={<Tags />} />
                    <Route path="/people" element={<div className="p-8 text-center text-gray-500">People section coming soon</div>} />
                    <Route path="/workspace" element={<Workspace />} />
                    <Route path="/company" element={<div className="p-8 text-center text-gray-500">Company section coming soon</div>} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }/>

          </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
