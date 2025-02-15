/* eslint-disable */

import axios from 'axios';
import { showAlerts } from './alerts';

export const bookTour = async (tourId) => {
  try {
    const stripe = Stripe(
      'pk_test_51QsaaPF7zjmfUJG9UpvVJWBxrzXMi8ZzA12yziFa5x4UVehJhIrO6lcJh32JeoGpeS8qjvuz9zJ8ayqchB5FEPhr00tzbjHin7',
    );

    // 1. Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // 2. Create checkout form & charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlerts('error', err);
  }
};
