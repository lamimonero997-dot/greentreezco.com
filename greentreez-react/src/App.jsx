import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import CartDrawer from './components/CartDrawer.jsx';
import WhatsAppButton from './components/WhatsAppButton.jsx';
import { useStoreNavigation } from './hooks/useStoreNavigation.js';
import AdminApp from './pages/admin/AdminApp.jsx';
import AdminCollections from './pages/admin/CollectionsHome.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminInventory from './pages/admin/Inventory.jsx';
import AdminOrders from './pages/admin/Orders.jsx';
import AdminProductEditor from './pages/admin/ProductEditor.jsx';
import AdminProducts from './pages/admin/ProductsHome.jsx';
import AdminSettings from './pages/admin/SettingsPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import StorePage from './pages/StorePage.jsx';
import SpecialDealsPage from './pages/SpecialDealsPage.jsx';

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  useStoreNavigation(!isAdmin);

  return (
    <>
      <Routes>
        <Route path="/admin" element={<AdminApp />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/:id" element={<AdminProductEditor />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="collections" element={<AdminCollections />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/cart" element={<Navigate to="/checkout" replace />} />
        <Route path="/pages/daily-deals" element={<SpecialDealsPage />} />
        <Route path="/pages/store-offers-discounts" element={<SpecialDealsPage />} />
        <Route path="*" element={<StorePage />} />
      </Routes>
      {isAdmin ? null : <CartDrawer />}
      {isAdmin ? null : <WhatsAppButton />}
    </>
  );
}
