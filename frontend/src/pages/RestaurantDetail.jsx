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

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!restaurant) return <div className="loading">Restaurant not found.</div>;

  return (
    <div>
      <Link to="/restaurants" className="back-link">&larr; Back to restaurants</Link>
      <div className="detail-card">
        <h2>{restaurant.name}</h2>
        <dl>
          <dt>Cuisine</dt><dd>{restaurant.cuisine || 'Various'}</dd>
          <dt>Address</dt><dd>{restaurant.address || 'Not specified'}</dd>
          <dt>Phone</dt><dd>{restaurant.phone || 'Not available'}</dd>
        </dl>
      </div>

      <h3 style={{ margin: '1.5rem 0 1rem' }}>Menu ({menu.length} items)</h3>
      {menu.length === 0 ? (
        <p className="loading">No menu items available.</p>
      ) : (
        <ul className="list">
          {menu.map((item) => (
            <li key={item.id} className="list-item">
              <div>
                <h3>{item.name}</h3>
                <p>{item.description || ''}</p>
              </div>
              <span style={{ fontWeight: 600 }}>${Number(item.price).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <Link to={`/order?restaurantId=${id}`} className="btn btn-primary" style={{ display: 'inline-block', width: 'auto' }}>
          Place Order from {restaurant.name}
        </Link>
      </div>
    </div>
  );
};

export default RestaurantDetail;
