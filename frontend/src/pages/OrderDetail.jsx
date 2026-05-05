import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api.js';

const STATUS_BADGE = (status) => `badge badge-${status}`;

const STATUS_STEPS = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'out_for_delivery', label: 'On the Way' },
  { key: 'delivered', label: 'Delivered' },
];

const getStepState = (currentStatus, stepKey) => {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === currentStatus);
  const stepIdx = STATUS_STEPS.findIndex((s) => s.key === stepKey);

  if (currentStatus === 'cancelled') return 'cancelled';
  if (stepIdx === -1) return '';
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return '';
};

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

      if (data.status === 'delivered' || data.status === 'cancelled') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    fetchOrder();
    intervalRef.current = setInterval(fetchOrder, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!order) return <div className="loading">Order not found.</div>;

  const isActive = order.status !== 'delivered' && order.status !== 'cancelled';

  return (
    <div>
      <Link to="/orders" className="back-link">&larr; Back to orders</Link>

      {isActive && (
        <div className="polling-indicator">
          Live tracking &bull; {new Date().toLocaleTimeString()}
        </div>
      )}

      <div className="detail-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Order from {order.restaurantName || order.restaurantId}</h2>
          <span className={STATUS_BADGE(order.status)}>{order.status.replace(/_/g, ' ')}</span>
        </div>

        <div className="progress-tracker">
          {STATUS_STEPS.map((step) => {
            const state = getStepState(order.status, step.key);
            return (
              <div key={step.key} className={`progress-step ${state}`}>
                <div className="dot">{state === 'done' ? '\u2713' : ''}</div>
                <span className="label">{step.label}</span>
              </div>
            );
          })}
        </div>

        {order.status === 'cancelled' && (
          <div className="error-message" style={{ textAlign: 'center' }}>
            This order has been cancelled.
          </div>
        )}

        <dl style={{ marginTop: 'var(--space-md)' }}>
          <dt>Order ID</dt>
          <dd style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{order.id}</dd>
          <dt>Restaurant</dt>
          <dd>{order.restaurantName || order.restaurantId}</dd>
          <dt>Delivery to</dt>
          <dd>{order.deliveryAddress}</dd>
          <dt>Total</dt>
          <dd style={{ fontWeight: 600 }}>${Number(order.totalAmount).toFixed(2)}</dd>
          <dt>Placed</dt>
          <dd>{new Date(order.createdAt).toLocaleString()}</dd>
        </dl>
      </div>

      <h3 style={{ margin: 'var(--space-lg) 0 var(--space-sm)', fontSize: '1rem', fontWeight: 600 }}>Items</h3>
      <ul className="list">
        {(order.items || []).map((item, i) => (
          <li key={i} className="list-item">
            <div>
              <strong style={{ fontSize: '0.9rem' }}>{item.name || item.itemId}</strong>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginTop: '0.1rem' }}>
                {item.quantity} &times; ${Number(item.price).toFixed(2)}
              </p>
            </div>
            <span style={{ fontWeight: 700 }}>
              ${(item.quantity * Number(item.price)).toFixed(2)}
            </span>
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
                {entry.note && <> &mdash; {entry.note}</>}
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
