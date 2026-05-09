import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';

const FORM_INITIAL = { name: '', address: '', cuisine: '', available: true };

const AdminRestaurants = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, id = edit
  const [form, setForm] = useState(FORM_INITIAL);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchRestaurants = async () => {
    setLoading(true);
    const { data, error: err } = await api.get('/restaurants');
    if (err) setError(err.message);
    else setRestaurants(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchRestaurants(); }, []);

  const resetForm = () => {
    setForm(FORM_INITIAL);
    setEditing(null);
    setFormError('');
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (restaurant) => {
    setEditing(restaurant.id);
    setForm({
      name: restaurant.name || '',
      address: restaurant.address || '',
      cuisine: restaurant.cuisine || '',
      available: restaurant.available !== false,
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
      address: form.address,
      cuisine: form.cuisine,
      available: form.available,
    };

    let result;
    if (editing) {
      result = await api.put(`/restaurants/${editing}`, body);
    } else {
      result = await api.post('/restaurants', body);
    }

    setSaving(false);
    if (result.error) {
      setFormError(result.error.message);
      return;
    }

    setShowForm(false);
    resetForm();
    fetchRestaurants();
  };

  const toggleAvailable = async (restaurant) => {
    const { error: err } = await api.put(`/restaurants/${restaurant.id}`, {
      name: restaurant.name,
      address: restaurant.address,
      cuisine: restaurant.cuisine,
      available: !restaurant.available,
    });
    if (err) {
      setError(err.message);
      return;
    }
    fetchRestaurants();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-actions">
        <h2 className="page-heading" style={{ marginBottom: 0 }}>Restaurant Management</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Restaurant</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 className="section-heading">{editing ? 'Edit Restaurant' : 'New Restaurant'}</h3>
          {formError && <div className="error-message">{formError}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="address">Address</label>
              <input id="address" type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="cuisine">Cuisine</label>
              <input id="cuisine" type="text" value={form.cuisine} onChange={(e) => setForm({ ...form, cuisine: e.target.value })} placeholder="e.g. Italian, Japanese" />
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
                {' '}Available for ordering
              </label>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {restaurants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#127860;</div>
          <h3>No restaurants</h3>
          <p>Create your first restaurant to get started.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Cuisine</th>
                <th>Address</th>
                <th>Status</th>
                <th>Menu</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong></td>
                  <td><span className="cuisine-badge">{r.cuisine || 'N/A'}</span></td>
                  <td className="cell-muted">{r.address || 'N/A'}</td>
                  <td>
                    <button
                      className={`badge ${r.available !== false ? 'badge-success' : 'badge-error'}`}
                      onClick={() => toggleAvailable(r)}
                      style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
                    >
                      {r.available !== false ? 'Open' : 'Closed'}
                    </button>
                  </td>
                  <td>
                    <Link to={`/admin/restaurants/${r.id}/menu`} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                      Menu
                    </Link>
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }} onClick={() => openEdit(r)}>
                      Edit
                    </button>
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

export default AdminRestaurants;
