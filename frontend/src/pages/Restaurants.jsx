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

  if (loading) return <div className="loading">Loading restaurants...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <h2 className="page-heading">Restaurants</h2>
      {restaurants.length === 0 ? (
        <p className="loading">No restaurants available.</p>
      ) : (
        <ul className="list">
          {restaurants.map((r) => (
            <li key={r.id} className="list-item">
              <div>
                <h3><Link to={`/restaurants/${r.id}`}>{r.name}</Link></h3>
                <p>{r.cuisine || 'Various'}{r.address ? ` — ${r.address}` : ''}</p>
              </div>
              <Link to={`/order?restaurantId=${r.id}`} className="btn btn-secondary">Order</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Restaurants;
