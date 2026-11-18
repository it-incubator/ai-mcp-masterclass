import { Button, Result } from 'antd';
import { Link, Route, Routes } from 'react-router';
import { AppLayout } from './layout/AppLayout';
import { AccountsPage } from './pages/AccountsPage';
import { CustomerDetailsPage } from './pages/CustomerDetailsPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailsPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route
          path="*"
          element={
            <Result
              status="404"
              data-testid="not-found-page"
              title="Page not found"
              extra={<Link to="/"><Button type="primary" data-testid="not-found-back">Back to dashboard</Button></Link>}
            />
          }
        />
      </Route>
    </Routes>
  );
}
