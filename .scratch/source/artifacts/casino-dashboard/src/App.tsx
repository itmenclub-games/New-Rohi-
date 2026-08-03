import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from '@/components/theme-provider';
import { Layout } from '@/components/layout';

import Dashboard from '@/pages/dashboard';
import Conversations from '@/pages/conversations';
import Deposits from '@/pages/deposits';
import Redeems from '@/pages/redeems';
import GameAccounts from '@/pages/game-accounts';
import FreePlay from '@/pages/free-play';
import Games from '@/pages/games';
import PaymentMethods from '@/pages/payment-methods';
import Bonuses from '@/pages/bonuses';
import Faqs from '@/pages/faqs';
import TelegramButtons from '@/pages/telegram-buttons';
import Settings from '@/pages/settings';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } }
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/conversations" component={Conversations} />
        <Route path="/deposits" component={Deposits} />
        <Route path="/redeems" component={Redeems} />
        <Route path="/game-accounts" component={GameAccounts} />
        <Route path="/free-play" component={FreePlay} />
        <Route path="/games" component={Games} />
        <Route path="/payment-methods" component={PaymentMethods} />
        <Route path="/bonuses" component={Bonuses} />
        <Route path="/faqs" component={Faqs} />
        <Route path="/telegram-buttons" component={TelegramButtons} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="casino-admin-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
