import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { restaurantId, restaurantName, items, deliveryAddress, totalAmount } =
    location.state || {};

  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState('');

  if (!restaurantId || !items?.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon">&#128722;</div>
        <h3>No order to checkout</h3>
        <p>Please create an order first.</p>
        <Link to="/order" className="btn btn-primary">Start an order</Link>
      </div>
    );
  }

  const handlePay = async () => {
    setError('');
    setProcessing(true);
    setPaymentResult(null);

    const paymentRes = await api.post('/payments', {
      amount: totalAmount,
      customerId: user.id,
    });

    if (paymentRes.error) {
      setError(paymentRes.error.message);
      setProcessing(false);
      setPaymentResult('failed');
      return;
    }

    const transaction = paymentRes.data;
    if (transaction.status !== 'succeeded') {
      setError('Payment was not successful. Please try again.');
      setProcessing(false);
      setPaymentResult('failed');
      return;
    }

    setPaymentResult('succeeded');

    const orderRes = await api.post('/orders', {
      customerId: user.id,
      restaurantId,
      items: items.map((item) => ({ itemId: item.itemId, quantity: item.quantity })),
      deliveryAddress,
      transactionId: transaction.transactionId,
    });

    setProcessing(false);

    if (orderRes.error) {
      setError(`Order creation failed: ${orderRes.error.message}`);
      setPaymentResult('failed');
      return;
    }

    navigate(`/order/${orderRes.data.id}`, { replace: true });
  };

  return (
    <div className="checkout-layout">
      <div className="checkout-main">
        <Link to="/order" className="back-link">&larr; Edit order</Link>
        <h2 className="page-heading">Checkout</h2>

        {!processing && !paymentResult && (
          <div className="detail-card" style={{ marginBottom: 'var(--space-md)' }}>
            <dl>
              <dt>Restaurant</dt>
              <dd>{restaurantName || restaurantId}</dd>
              <dt>Delivery to</dt>
              <dd>{deliveryAddress}</dd>
              <dt>Items</dt>
              <dd>{items.length} item(s)</dd>
            </dl>
          </div>
        )}

        {processing && (
          <div className="payment-processing">
            <div className="spinner" />
            <p>Processing your payment...</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              This may take a moment
            </p>
          </div>
        )}

        {paymentResult === 'succeeded' && !processing && (
          <div className="payment-result success">
            <div className="icon">&#10003;</div>
            <h3>Payment successful!</h3>
            <p>Creating your order...</p>
          </div>
        )}

        {paymentResult === 'failed' && (
          <div className="payment-result failed">
            <div className="icon">&#10007;</div>
            <h3>Payment failed</h3>
            {error && <div className="error-message">{error}</div>}
            <button
              onClick={() => { setPaymentResult(null); setError(''); }}
              className="btn btn-primary btn-lg"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="checkout-summary">
        <h3>Order Summary</h3>
        {items.map((item, i) => (
          <div key={i} className="checkout-item">
            <span>{item.name} &times; {item.quantity}</span>
            <span>${(Number(item.price) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="checkout-total">
          <span>Total</span>
          <span>${Number(totalAmount).toFixed(2)}</span>
        </div>

        {!processing && !paymentResult && (
          <button onClick={handlePay} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 'var(--space-md)' }}>
            Pay ${Number(totalAmount).toFixed(2)}
          </button>
        )}

        {paymentResult === 'succeeded' && (
          <div className="success-message" style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
            Redirecting to your order...
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
