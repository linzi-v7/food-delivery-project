import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api.js';

const STATUS_BADGE = (status) => `badge badge-${status}`;

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error: err } = await api.get(`/orders/${id}`);
      if (err) {
        setError(err.message);
        return;
      }
      setOrder(data);
      setLoading(false);
    };

    fetchOrder();

    intervalRef.current = setInterval(fetchOrder, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id]);

  if (loading) return <div className="loading">Loading order...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!order) return <div className="loading">Order not found.</div>;

  return (
    <div>
      <Link to="/orders" className="back-link">&larr; Back to orders</Link>

      <div className="polling-indicator">
        Status updates every 10 seconds &bull; Last checked: {new Date().toLocaleTimeString()}
      </div>

      <div className="detail-card">
        <h2>Order #{order.id.slice(0, 8)}</h2>

        <dl>
          <dt>Status</dt>
          <dd><span className={STATUS_BADGE(order.status)}>{order.status.replace(/_/g, ' ')}</span></dd>
          <dt>Restaurant</dt><dd>{order.restaurantId}</dd>
          <dt>Delivery Address</dt><dd>{order.deliveryAddress}</dd>
          <dt>Total</dt><dd>${Number(order.totalAmount).toFixed(2)}</dd>
          <dt>Placed</dt><dd>{new Date(order.createdAt).toLocaleString()}</dd>
        </dl>
      </div>

      <h3 style={{ margin: '1.5rem 0 0.75rem' }}>Items</h3>
      <ul className="list">
        {(order.items || []).map((item, i) => (
          <li key={i} className="list-item">
            <span>Item: {item.itemId}</span>
            <span>Qty: {item.quantity} &times; ${Number(item.price).toFixed(2)}</span>
          </li>
        ))}
      </ul>

      {order.statusHistory?.length > 0 && (
        <div className="status-history">
          <h3>Status History</h3>
          <ul>
            {order.statusHistory.map((entry, i) => (
              <li key={i}>
                <strong>{entry.status.replace(/_/g, ' ')}</strong>
                {entry.note && <> — {entry.note}</>}
                <br />
                <span>{new Date(entry.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
