import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ restaurants: 0, orders: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const [restRes, orderRes, userRes] = await Promise.all([
        api.get('/restaurants'),
        api.get('/orders'),
        api.get('/users'),
      ]);

      if (restRes.error || orderRes.error || userRes.error) {
        setError('Failed to load some stats. Please try again.');
      } else {
        setStats({
          restaurants: Array.isArray(restRes.data) ? restRes.data.length : 0,
          orders: Array.isArray(orderRes.data) ? orderRes.data.length : 0,
          users: Array.isArray(userRes.data) ? userRes.data.length : 0,
        });
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <h2 className="page-heading">Admin Dashboard</h2>
      <div className="stats-grid">
        <Link to="/admin/restaurants" className="stat-card">
          <div className="stat-number">{stats.restaurants}</div>
          <div className="stat-label">Restaurants</div>
        </Link>
        <Link to="/admin/orders" className="stat-card">
          <div className="stat-number">{stats.orders}</div>
          <div className="stat-label">Orders</div>
        </Link>
        <div className="stat-card">
          <div className="stat-number">{stats.users}</div>
          <div className="stat-label">Users</div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
