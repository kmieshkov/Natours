const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1. Get currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2. Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    success_url:
      // Commented - secure solution implemented after deploying to production
      // success_url:
      //   `${req.protocol}://${req.get('host')}/` +
      //   `?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,

      process.env.NODE_ENV === 'development'
        ? `${req.protocol}://localhost:${process.env.PORT}/my-tours?alert=booking`
        : `${req.protocol}://${req.get('host')}/my-tours?alert=booking`,
    cancel_url:
      process.env.NODE_ENV === 'development'
        ? `${req.protocol}://localhost:${process.env.PORT}/tour/${tour.slug}`
        : `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,

    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            // Example site: https://www.natours.dev,
            images:
              process.env.NODE_ENV === 'development'
                ? [`https://www.natours.dev/img/tours/${tour.imageCover}`]
                : [`${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`],
          },
        },
      },
    ],
  });

  // 3. Create session as response ans send to client
  res.status(200).json({
    status: 'success',
    session,
  });
});

// Commented - secure solution implemented after deploying to production
// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   // This is TEMPORARY solution, because it's UNSECURE: everyone can make bookings without paying
//   const { tour, user, price } = req.query;
//   if (!tour || !user || !price) {
//     return next();
//   }

//   await Booking.create({ tour, user, price });

//   res.redirect('/');
// });

const createBookingCheckout = async (session) => {
  // Get data from created session (ref to getCheckoutSession)
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.amount_total / 100;

  await Booking.create({ tour, user, price });
};

exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);

    res.status(200).json({ status: 'success', event });
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    createBookingCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
};

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
