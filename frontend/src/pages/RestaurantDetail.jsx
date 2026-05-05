import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api.js';

const RestaurantDetail = () => {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [restRes, menuRes] = await Promise.all([
        api.get(`/restaurants/${id}`),
        api.get(`/restaurants/${id}/menu`),
      ]);

      if (restRes.error) {
        setError(restRes.error.message);
      } else {
        setRestaurant(restRes.data);
        setMenu(Array.isArray(menuRes.data) ? menuRes.data : []);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!restaurant) return <div className="loading">Restaurant not found.</div>;

  const isAvailable = restaurant.available !== false;

  return (
    <div>
      <Link to="/restaurants" className="back-link">&larr; Back to restaurants</Link>

      <div className="detail-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
          <div>
            <h2 style={{ margin: 0 }}>{restaurant.name}</h2>
            {restaurant.cuisine && (
              <span className="cuisine-badge" style={{ marginTop: 'var(--space-sm)', display: 'inline-block' }}>
                {restaurant.cuisine}
              </span>
            )}
          </div>
          <span className={`availability-badge ${isAvailable ? 'open' : 'closed'}`}>
            {isAvailable ? '\u25CF Available' : '\u25CB Closed'}
          </span>
        </div>
        <dl style={{ marginTop: 'var(--space-md)' }}>
          <dt>Address</dt>
          <dd>{restaurant.address || 'Not specified'}</dd>
        </dl>
      </div>

      <div className="page-actions" style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
        <h3 style={{ margin: 0, fontWeight: 600 }}>Menu &mdash; {menu.length} items</h3>
        {isAvailable && (
          <Link to={`/order?restaurantId=${id}`} className="btn btn-primary">
            Order from {restaurant.name}
          </Link>
        )}
      </div>

      {menu.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#128196;</div>
          <h3>No menu items</h3>
          <p>This restaurant hasn't added any menu items yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {menu.map((item) => (
            <div key={item.id} className={`menu-item-card ${!item.available ? 'unavailable' : ''}`}>
              <div className="item-info">
                <h4>
                  {item.name}
                  {!item.available && (
                    <span style={{ color: 'var(--color-error)', fontSize: '0.72rem', marginLeft: '0.5rem', fontWeight: 600 }}>
                      UNAVAILABLE
                    </span>
                  )}
                </h4>
                {item.description && <p>{item.description}</p>}
              </div>
              <span className="item-price">${Number(item.price).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantDetail;
