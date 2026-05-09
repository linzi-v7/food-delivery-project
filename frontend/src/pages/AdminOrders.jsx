import { useState, useEffect } from 'react';
import api from '../api.js';

const STATUS_BADGE = (status) => `badge badge-${status}`;

const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['cancelled'],
  cancelled: [],
};

const ORDER_STEPS = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [statusNote, setStatusNote] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error: err } = await api.get('/orders');
    if (err) setError(err.message);
    else setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(orderId);
    const { error: err } = await api.put(`/orders/${orderId}/status`, {
      status: newStatus,
      note: statusNote || undefined,
    });
    setUpdating(null);
    setStatusNote('');

    if (err) {
      setError(err.message);
      return;
    }
    fetchOrders();
    setSelectedOrder(null);
  };

  const getStepIndex = (status) => ORDER_STEPS.indexOf(status);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-actions">
        <h2 className="page-heading" style={{ marginBottom: 0 }}>Order Management</h2>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          {orders.length} total orders
        </span>
      </div>

      {error && <div className="error-message">{error}</div>}

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#128230;</div>
          <h3>No orders yet</h3>
          <p>Orders will appear here once customers start placing them.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Restaurant</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Items</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="cell-muted mono-text">{order.id.slice(0, 8)}</td>
                  <td>{order.restaurantName}</td>
                  <td className="cell-muted mono-text">{order.customerId.slice(0, 8)}</td>
                  <td>${Number(order.totalAmount).toFixed(2)}</td>
                  <td>{order.items?.length || 0}</td>
                  <td><span className={STATUS_BADGE(order.status)}>{order.status.replace(/_/g, ' ')}</span></td>
                  <td className="cell-muted">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                    >
                      {selectedOrder?.id === order.id ? '▲ Close' : 'Manage'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
          <h3 className="section-heading">
            Order Details &mdash; {selectedOrder.restaurantName}
            <span style={{ marginLeft: 'var(--space-sm)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              #{selectedOrder.id.slice(0, 8)}
            </span>
          </h3>

          <div className="detail-card" style={{ marginBottom: 'var(--space-md)', boxShadow: 'none' }}>
            <dl>
              <dt>Customer</dt>
              <dd className="mono-text">{selectedOrder.customerId}</dd>
              <dt>Delivery Address</dt>
              <dd>{selectedOrder.deliveryAddress}</dd>
              <dt>Total</dt>
              <dd><strong>${Number(selectedOrder.totalAmount).toFixed(2)}</strong></dd>
              <dt>Status</dt>
              <dd><span className={STATUS_BADGE(selectedOrder.status)}>{selectedOrder.status.replace(/_/g, ' ')}</span></dd>
              <dt>Created</dt>
              <dd>{new Date(selectedOrder.createdAt).toLocaleString()}</dd>
            </dl>
          </div>

          <h4 style={{ marginBottom: 'var(--space-sm)', fontSize: '0.95rem' }}>Items</h4>
          <div className="admin-table-wrapper" style={{ marginBottom: 'var(--space-md)' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>${Number(item.price).toFixed(2)}</td>
                    <td>${(item.quantity * Number(item.price)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {VALID_TRANSITIONS[selectedOrder.status]?.length > 0 && (
            <div>
              <h4 style={{ marginBottom: 'var(--space-sm)', fontSize: '0.95rem' }}>Update Status</h4>
              <div className="form-group">
                <label htmlFor="statusNote">Note (optional)</label>
                <input
                  id="statusNote"
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Preparing order now"
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                {VALID_TRANSITIONS[selectedOrder.status].map((nextStatus) => (
                  <button
                    key={nextStatus}
                    className="btn btn-primary"
                    onClick={() => handleStatusUpdate(selectedOrder.id, nextStatus)}
                    disabled={updating === selectedOrder.id}
                  >
                    {updating === selectedOrder.id ? 'Updating...' : `Mark as ${nextStatus.replace(/_/g, ' ')}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedOrder.statusHistory?.length > 0 && (
            <div className="status-history" style={{ marginTop: 'var(--space-lg)' }}>
              <h3>Status History</h3>
              <ul>
                {selectedOrder.statusHistory
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map((entry, idx) => (
                    <li key={idx}>
                      <strong>{entry.status.replace(/_/g, ' ')}</strong>
                      {entry.note ? ` — ${entry.note}` : ''}
                      <br />
                      <span style={{ fontSize: '0.78rem' }}>{new Date(entry.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
