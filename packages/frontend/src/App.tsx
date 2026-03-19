import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar.js';
import { DashboardPage }      from './pages/DashboardPage.js';
import { InventoryPage }      from './pages/InventoryPage.js';
import { ItemDetailPage }     from './pages/ItemDetailPage.js';
import { UsagePage }          from './pages/UsagePage.js';
import { ProcurementPage }    from './pages/ProcurementPage.js';
import { ReorderPage }        from './pages/ReorderPage.js';
import { AnalyticsPage }      from './pages/AnalyticsPage.js';
import { ChatPage }           from './pages/ChatPage.js';
import { ExpiryCalendarPage } from './pages/ExpiryCalendarPage.js';
import { AuditPage }          from './pages/AuditPage.js';

export function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/"                  element={<DashboardPage />} />
            <Route path="/inventory"         element={<InventoryPage />} />
            <Route path="/inventory/:id"     element={<ItemDetailPage />} />
            <Route path="/expiry"            element={<ExpiryCalendarPage />} />
            <Route path="/usage"             element={<UsagePage />} />
            <Route path="/procurement"       element={<ProcurementPage />} />
            <Route path="/reorder"           element={<ReorderPage />} />
            <Route path="/analytics"         element={<AnalyticsPage />} />
            <Route path="/audit"             element={<AuditPage />} />
            <Route path="/chat"              element={<ChatPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
