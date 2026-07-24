import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import Layout from '@/components/layout';
import Dashboard from '@/pages/dashboard';
import ClientsPage from '@/pages/clients';
import ClientDetail from '@/pages/clients/detail';
import CasesPage from '@/pages/cases';
import NewCasePage from '@/pages/cases/new';
import CaseDetail from '@/pages/cases/detail';
import LedgerPage from '@/pages/ledger';
import ReportsPage from '@/pages/reports';
import ImportPage from '@/pages/import';
import SearchPage from '@/pages/search';
import AuditLogPage from '@/pages/audit';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={ClientsPage} />
        <Route path="/clients/:id" component={ClientDetail} />
        <Route path="/cases" component={CasesPage} />
        <Route path="/cases/new" component={NewCasePage} />
        <Route path="/cases/:folderId" component={CaseDetail} />
        <Route path="/ledger" component={LedgerPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/import" component={ImportPage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/audit" component={AuditLogPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
