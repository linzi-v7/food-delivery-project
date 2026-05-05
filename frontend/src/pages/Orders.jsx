import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';

const STATUS_BADGE = (status) => `badge badge-${status}`;

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.id) return;
      setLoading(true);
      const { data, error: err } = await api.get(`/orders/customer/${user.id}`);
      if (err) {
        setError(err.message);
      } else {
        setOrders(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    };
    fetchOrders();
  }, [user?.id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <div className="page-actions">
        <h2 className="page-heading" style={{ marginBottom: 0 }}>My Orders</h2>
        <Link to="/order" className="btn btn-primary">New Order</Link>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#128230;</div>
          <h3>No orders yet</h3>
          <p>Browse restaurants and place your first order.</p>
          <Link to="/restaurants" className="btn btn-primary">Browse Restaurants</Link>
        </div>
      ) : (
        <ul className="list">
          {orders.map((order) => (
            <li key={order.id} className="list-item">
              <div>
                <h3>
                  <Link to={`/order/${order.id}`}>
                    {order.restaurantName ? `Order from ${order.restaurantName}` : `Order #${order.id.slice(0, 8)}`}
                  </Link>
                </h3>
                <p>
                  ${Number(order.totalAmount).toFixed(2)} &bull; {order.items?.length || 0} item(s) &bull; {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className={STATUS_BADGE(order.status)}>{order.status.replace(/_/g, ' ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Orders;
