import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Restaurants from './pages/Restaurants.jsx';
import RestaurantDetail from './pages/RestaurantDetail.jsx';
import PlaceOrder from './pages/PlaceOrder.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminRestaurants from './pages/AdminRestaurants.jsx';
import AdminMenu from './pages/AdminMenu.jsx';
import AdminOrders from './pages/AdminOrders.jsx';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/restaurants" replace />;
  return children;
};

const Layout = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="app">
      <header className="header">
        <h1><Link to="/">Food Delivery</Link></h1>
        <nav>
          {isAdmin && (
            <>
              <Link to="/admin">Admin Panel</Link>
              <Link to="/restaurants">Restaurants</Link>
            </>
          )}
          {!isAdmin && <Link to="/restaurants">Restaurants</Link>}
          {isAuthenticated ? (
            <>
              <Link to="/orders">My Orders</Link>
              <span className="user-info">{user?.name || user?.email}</span>
              <button onClick={logout} className="btn-link">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>

      {isAdmin && isAdminPage ? (
        <div className="admin-layout">
          <aside className="admin-sidebar">
            <nav>
              <ul>
                <li>
                  <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/admin/restaurants" className={location.pathname.startsWith('/admin/restaurants') ? 'active' : ''}>
                    Restaurants
                  </Link>
                </li>
                <li>
                  <Link to="/admin/orders" className={location.pathname === '/admin/orders' ? 'active' : ''}>
                    Orders
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      ) : (
        <main className="main">{children}</main>
      )}
    </div>
  );
};

const App = () => (
  <Layout>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/restaurants" element={<Restaurants />} />
      <Route path="/restaurants/:id" element={<RestaurantDetail />} />
      <Route path="/order" element={<ProtectedRoute><PlaceOrder /></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/order/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/restaurants" element={<AdminRoute><AdminRestaurants /></AdminRoute>} />
      <Route path="/admin/restaurants/:id/menu" element={<AdminRoute><AdminMenu /></AdminRoute>} />
      <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/restaurants" replace />} />
    </Routes>
  </Layout>
);

export default App;
