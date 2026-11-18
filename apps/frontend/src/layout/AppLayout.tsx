import { BankOutlined, DashboardOutlined, SwapOutlined, TeamOutlined } from '@ant-design/icons';
import { Layout, Menu, Typography } from 'antd';
import { Link, Outlet, useLocation } from 'react-router';

const { Sider, Content } = Layout;

const items = [
  { key: '/', icon: <DashboardOutlined />, label: <Link to="/" data-testid="nav-dashboard">Dashboard</Link> },
  { key: '/customers', icon: <TeamOutlined />, label: <Link to="/customers" data-testid="nav-customers">Customers</Link> },
  { key: '/accounts', icon: <BankOutlined />, label: <Link to="/accounts" data-testid="nav-accounts">Accounts</Link> },
  { key: '/transactions', icon: <SwapOutlined />, label: <Link to="/transactions" data-testid="nav-transactions">Transactions</Link> },
];

export function AppLayout() {
  const { pathname } = useLocation();
  const selected = items.map((i) => i.key).filter((k) => k !== '/' && pathname.startsWith(k));
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="dark" breakpoint="lg" collapsedWidth={64} data-testid="sidebar">
        <Typography.Title level={4} style={{ color: '#fff', margin: 16, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          Ledger Admin
        </Typography.Title>
        <Menu theme="dark" mode="inline" selectedKeys={selected.length ? selected : ['/']} items={items} data-testid="main-menu" />
      </Sider>
      <Layout>
        <Content style={{ padding: 24 }} data-testid="page-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
