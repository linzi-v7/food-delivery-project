import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';

const Restaurants = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      const { data, error: err } = await api.get('/restaurants');
      if (err) {
        setError(err.message);
      } else {
        setRestaurants(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    };
    fetchRestaurants();
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <h2 className="page-heading">Restaurants</h2>
      {restaurants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#127860;</div>
          <h3>No restaurants available</h3>
          <p>Check back soon for new restaurants in your area.</p>
        </div>
      ) : (
        <div className="restaurant-grid">
          {restaurants.map((r) => (
            <div key={r.id} className="restaurant-card">
              <h3><Link to={`/restaurants/${r.id}`}>{r.name}</Link></h3>
              <div className="card-meta">
                {r.cuisine && <span className="cuisine-badge">{r.cuisine}</span>}
                {r.available !== undefined && (
                  <span className={`availability-badge ${r.available ? 'open' : 'closed'}`}>
                    {r.available ? '\u25CF Open' : '\u25CB Closed'}
                  </span>
                )}
              </div>
              {r.address && <div className="card-address">{r.address}</div>}
              <div className="card-actions">
                <Link to={`/restaurants/${r.id}`} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Menu
                </Link>
                <Link to={`/order?restaurantId=${r.id}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Order
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Restaurants;
