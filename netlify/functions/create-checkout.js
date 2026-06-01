const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { items, customer, success_url, cancel_url } = JSON.parse(event.body);

    const line_items = items.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: `${item.brand} ${item.model} — ${item.year || ''}`,
          description: item.description || `Montre vintage — État ${item.note}/10`,
          metadata: { watch_id: String(item.id) }
        },
        unit_amount: item.sell * 100, // cents
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: success_url + '?session_id={CHECKOUT_SESSION_ID}&ref=' + customer.ref,
      cancel_url: cancel_url,
      customer_email: customer.email,
      shipping_address_collection: { allowed_countries: ['FR', 'BE', 'CH', 'LU'] },
      metadata: {
        ref: customer.ref,
        prenom: customer.prenom,
        nom: customer.nom,
        carrier: customer.carrier,
      },
      payment_intent_data: {
        metadata: {
          ref: customer.ref,
          customer_name: `${customer.prenom} ${customer.nom}`,
          carrier: customer.carrier,
        }
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url, session_id: session.id }),
    };
  } catch (err) {
    console.error('Stripe error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
