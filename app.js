const express = require('express');
const app = express();
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SK);
var bodyParser = require('body-parser');
var cors = require('cors')

app.set('view engine', 'ejs');

app.use(bodyParser.json())

app.use(cors())

app.get('/donate', (req, res) => {
  res.render('donate.ejs');
})

app.post('/bod', (req, res) => {
  console.log(req.body.amount * 100)
  res.send()
})

app.post('/generate-payment-link', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    submit_type: 'donate',
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
    metadata: {
      'name':req.body.name,
      'phonenum':req.body.phonenum,
      'teamname':req.body.teamname,
      'dono_with_team':req.body.dono_with_team
    },
    success_url: `https://api.scarecrowrow.org/success`,
    cancel_url: `https://api.scarecrowrow.org/cancel`,
  });

  console.log(`Generating a payment URL for ${req.body.amount}. Checkout session ID is: ${session.id}`)

  res.send(session.url)
})

app.get('/success', (req, res) => {
  res.send('😀');
})

app.get('/cancel', (req, res) => {
  res.send('😢');
})

app.listen(process.env.PORT || 80, () => {
  console.log(`Example app listening at http://localhost:${process.env.PORT || 80}`);
})