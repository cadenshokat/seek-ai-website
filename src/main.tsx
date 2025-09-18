import { createRoot } from 'react-dom/client'
import { BrandsProvider } from '@/hooks/useBrands'
import { ModelsProvider } from '@/hooks/useModels'
import { TimeRangeProvider } from '@/hooks/useTimeRange'
import { AuthProvider } from './hooks/useAuth'
import React from 'react'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrandsProvider>
        <ModelsProvider>
        <TimeRangeProvider>
            <AuthProvider>
                <App />
            </AuthProvider>
        </TimeRangeProvider>
        </ModelsProvider>
        </BrandsProvider>
    </React.StrictMode>
    );
