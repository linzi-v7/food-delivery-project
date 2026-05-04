import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';

const PlaceOrder = () => {
  const [searchParams] = useSearchParams();
  const preselectedRestaurantId = searchParams.get('restaurantId') || '';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState(preselectedRestaurantId);
  const [menu, setMenu] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchRestaurants = async () => {
      const { data, error: err } = await api.get('/restaurants');
      if (!err) setRestaurants(Array.isArray(data) ? data : []);
      setLoadingRestaurants(false);
    };
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (!restaurantId) {
      setMenu([]);
      setQuantities({});
      return;
    }
    const fetchMenu = async () => {
      setLoadingMenu(true);
      const { data, error: err } = await api.get(`/restaurants/${restaurantId}/menu`);
      if (!err) {
        const items = Array.isArray(data) ? data : [];
        setMenu(items);
        setQuantities(Object.fromEntries(items.map((item) => [item.id, 0])));
      }
      setLoadingMenu(false);
    };
    fetchMenu();
  }, [restaurantId]);

  const totalAmount = menu.reduce(
    (sum, item) => sum + (quantities[item.id] || 0) * Number(item.price),
    0
  );

  const handleQuantityChange = (itemId, value) => {
    const qty = Math.max(0, parseInt(value) || 0);
    setQuantities((prev) => ({ ...prev, [itemId]: qty }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const items = menu
      .filter((item) => (quantities[item.id] || 0) > 0)
      .map((item) => ({
        itemId: item.id,
        quantity: quantities[item.id],
        price: Number(item.price),
      }));

    if (items.length === 0) {
      setError('Please select at least one item.');
      return;
    }

    if (!deliveryAddress.trim()) {
      setError('Please enter a delivery address.');
      return;
    }

    setLoading(true);
    const { data, error: err } = await api.post('/orders', {
      customerId: user.id,
      restaurantId,
      items,
      deliveryAddress: deliveryAddress.trim(),
    });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    setSuccess(`Order placed! Order ID: ${data.id}`);
    setTimeout(() => navigate(`/order/${data.id}`), 1500);
  };

  if (loadingRestaurants) return <div className="loading">Loading...</div>;

  return (
    <div>
      <h2 className="page-heading">Place Order</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="form-card" style={{ maxWidth: 'none' }}>
        <div className="form-group">
          <label htmlFor="restaurant">Restaurant</label>
          <select id="restaurant" value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} required>
            <option value="">Select a restaurant</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {restaurantId && (
          <>
            {loadingMenu ? (
              <div className="loading">Loading menu...</div>
            ) : (
              <div className="order-items">
                <h3 style={{ marginBottom: '0.75rem' }}>Items</h3>
                {menu.map((item) => (
                  <div key={item.id} className="order-item-row">
                    <span>{item.name} — ${Number(item.price).toFixed(2)}</span>
                    <input
                      type="number"
                      min="0"
                      value={quantities[item.id] || 0}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            {totalAmount > 0 && (
              <div className="order-summary">Total: ${totalAmount.toFixed(2)}</div>
            )}

            <div className="form-group">
              <label htmlFor="address">Delivery Address</label>
              <textarea
                id="address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter your delivery address"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Placing order...' : 'Place Order'}
            </button>
          </>
        )}
      </form>
    </div>
  );
};

export default PlaceOrder;
