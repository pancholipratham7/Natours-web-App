/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert.js';

const stripe = Stripe(
  'pk_test_51JZbh5SHE49WlF3OqvG6e2nm1ax5puVsHg4iYv0qQS6rIzhT9AfBoYyoaQv0DXlpImzZ1FRTW4IXryNWp3Fn2nQP00jpAb4r8Q'
);

export const bookTour = async tourId => {
  //getting checkout session from API
  try {
    const session = await axios(
      `/api/v1/bookings/checkout-session/${tourId}`
    );

    console.log(session);
    //redirecting users to checkout Page
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
