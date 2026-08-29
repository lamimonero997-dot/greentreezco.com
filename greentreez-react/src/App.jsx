import { Route, Routes, useLocation } from 'react-router-dom';
import CartDrawer from './components/CartDrawer.jsx';
import { useStoreNavigation } from './hooks/useStoreNavigation.js';
import AdminApp, { CollectionsHome, ProductEditor, ProductsHome } from './pages/admin/AdminApp.jsx';
import StorePage from './pages/StorePage.jsx';
import SpecialDealsPage from './pages/SpecialDealsPage.jsx';

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  useStoreNavigation();

  return (
    <>
      <Routes>
        <Route path="/admin" element={<AdminApp />}>
          <Route index element={<ProductsHome />} />
          <Route path="products/:id" element={<ProductEditor />} />
          <Route path="collections" element={<CollectionsHome />} />
        </Route>
        <Route path="/pages/daily-deals" element={<SpecialDealsPage />} />
        <Route path="/pages/store-offers-discounts" element={<SpecialDealsPage />} />
        <Route path="*" element={<StorePage />} />
      </Routes>
      {isAdmin ? null : <CartDrawer />}
    </>
  );
}
