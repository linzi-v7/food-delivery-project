import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api.js';

const FORM_INITIAL = { name: '', description: '', price: '', available: true };

const AdminMenu = () => {
  const { id: restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_INITIAL);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [restRes, menuRes] = await Promise.all([
      api.get(`/restaurants/${restaurantId}`),
      api.get(`/restaurants/${restaurantId}/menu`),
    ]);
    if (restRes.error) setError(restRes.error.message);
    else {
      setRestaurant(restRes.data);
      setMenuItems(Array.isArray(menuRes.data) ? menuRes.data : []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [restaurantId]);

  const resetForm = () => {
    setForm(FORM_INITIAL);
    setEditingId(null);
    setFormError('');
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      description: item.description || '',
      price: String(item.price || ''),
      available: item.available !== false,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    const body = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      available: form.available,
    };

    let result;
    if (editingId) {
      result = await api.put(`/restaurants/${restaurantId}/menu/${editingId}`, body);
    } else {
      result = await api.post(`/restaurants/${restaurantId}/menu`, body);
    }

    setSaving(false);
    if (result.error) {
      setFormError(result.error.message);
      return;
    }

    setShowForm(false);
    resetForm();
    fetchData();
  };

  const deleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    const { error: err } = await api.delete(`/restaurants/${restaurantId}/menu/${itemId}`);
    if (err) {
      setError(err.message);
      return;
    }
    fetchData();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!restaurant) return <div className="loading">Restaurant not found.</div>;

  return (
    <div>
      <Link to="/admin/restaurants" className="back-link">&larr; Back to restaurants</Link>

      <div className="page-actions">
        <h2 className="page-heading" style={{ marginBottom: 0 }}>
          Menu: {restaurant.name}
        </h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Item</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 className="section-heading">{editingId ? 'Edit Menu Item' : 'New Menu Item'}</h3>
          {formError && <div className="error-message">{formError}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="desc">Description</label>
              <textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="price">Price ($)</label>
              <input id="price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
                {' '}Available
              </label>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {menuItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#128196;</div>
          <h3>No menu items</h3>
          <p>Add your first menu item to get started.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map((item) => (
                <tr key={item.id} className={item.available === false ? 'row-dimmed' : ''}>
                  <td><strong>{item.name}</strong></td>
                  <td className="cell-muted">{item.description || 'N/A'}</td>
                  <td>${Number(item.price).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${item.available !== false ? 'badge-success' : 'badge-error'}`}>
                      {item.available !== false ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }} onClick={() => openEdit(item)}>
                        Edit
                      </button>
                      <button className="btn btn-danger" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }} onClick={() => deleteItem(item.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
