const express = require('express');
const app = express();
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SK);
var bodyParser = require('body-parser');

app.set('view engine', 'ejs');

app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send('Hello World!');
})

app.post('/bod', (req, res) => {
  console.log(req.body.amount * 100)
  res.send()
})

app.post('/generate-payment-link', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Scarecrow Row + Madi\s House Donation',
            images: ['https://scarecrowrow.org/assets/images/favicon_clear.png', 'https://madishousecincy.org/wp-content/uploads/2020/02/madishouse_logo.png'],
          },
          unit_amount: req.body.amount * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    billing_address_collection: 'required',
    success_url: `https://scarecrowrow.org/success.html`,
    cancel_url: `https://scarecrowrow.org/cancel.html`,
  });

  console.log(`Generating a payment URL for ${req.body.amount}. Checkout session ID is: ${session.id}`)

  res.send(session.url)
})

app.listen(process.env.PORT || 80, () => {
  console.log(`Example app listening at http://localhost:${process.env.PORT || 80}`);
})