const express = require('express');
const app = express();
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SK);
var bodyParser = require('body-parser');
var cors = require('cors');
const mysql = require('mysql');
let twilio = require('twilio');
let client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOK);

const connection = mysql.createConnection({
  host: process.env.db_host,
  user: process.env.db_user,
  password: process.env.db_pass,
  database: process.env.db_database
})

connection.connect((err) => {
  if(err) console.log(err)
})

app.set('view engine', 'ejs');

app.use(bodyParser.json())

app.use(cors())

app.get('/donate', (req, res) => {
  res.render('donate.ejs');
})

app.post('/generate-payment-link', async (req, res) => {
  let session;
  let query;
  if(parseInt(req.body.amount) > 0) {
    session = await stripe.checkout.sessions.create({
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
      payment_intent_data: {
          metadata: {
          'name':req.body.name,
          'phonenum':req.body.phonenum,
          'teamname':req.body.teamname,
          'dono_with_team':req.body.dono_with_team
        },
      },
      success_url: `https://scarecrowrow.org/thanks.html`,
      cancel_url: `https://scarecrowrow.org/donate.html`,
    });
    console.log(`-----------------------------------------------------------------------------------------------`)
    console.log(`Generating a payment URL for ${req.body.amount}. Checkout session ID is: ${session.id}`)
    console.log(`User information: Name: ${req.body.name}, Email: ${req.body.email}, Dono type: ${req.body.dono_with_team}`)
    console.log(`Phone number: ${req.body.phonenum}, Teamname: ${req.body.teamname}`)

    query = `
    INSERT INTO clients (name, email, donation_type, phone_number, team_name, donation_amount, stripe_checkout_id) 
      VALUES (
        '${req.body.name}',
        '${req.body.email}',
        '${req.body.dono_with_team ? 'team' : 'individual'}',
        '${parseInt(req.body.phonenum)}',
        '${req.body.teamname}',
        ${parseInt(req.body.amount)},
        '${session.id}'
        )
  `
  } else {

    query = `
      INSERT INTO clients (name, donation_type, phone_number, team_name, donation_amount) 
        VALUES (
          '${req.body.name}',
          '${req.body.dono_with_team ? 'team' : 'individual'}',
          '${parseInt(req.body.phonenum)}',
          '${req.body.teamname}',
          ${0}
          )
    `
  }

  connection.query(query)

  if(session) {
    res.send(session.url)
  } else {
    res.send('https://scarecrowrow.org/thanks.html')
  }
})

app.get('/success', (req, res) => {
  res.send('😀');
})

app.get('/cancel', (req, res) => {
  res.send('😢');
})

app.post('/webhook', express.json({type: 'application/json'}), async(request, response) => {
  const event = request.body;

  let evt = event.data.object;

  // Handle the event
  switch (event.type) {

    // https://stripe.com/docs/api/events/types#event_types-checkout.session.completed
    case 'checkout.session.completed':
      let query = `UPDATE clients SET stripe_customer_id = '${evt.customer}', email = '${evt.customer_details.email}' WHERE stripe_checkout_id = '${evt.id}'`;
      connection.query(query);
      let message = await client.messages.create({
        body:`
Donation received!!!
Donor information:\n
- email:${evt.customer_details.email},\n
- amount:${evt.amount_subtotal / 100},\n
- stripe cid:${evt.customer}
        `,
        to:5136289360,
        from:'+14302058827'
      });
      break;
    default:
      // console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  response.json({received: true});
});

app.listen(process.env.PORT || 80, () => {
  console.log(`App listening at http://localhost:${process.env.PORT || 80}`);
})