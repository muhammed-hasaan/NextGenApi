const express = require('express');
const axios = require('axios');
const serverless = require('serverless-http'); // Required for Vercel

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/ping-lead', async (req, res) => {
  const data = req.body;

  try {
    const response = await axios.post(
      'https://track.edmleadnetwork.com/call-preping.do',
      new URLSearchParams({
        lp_campaign_id: '689103b4b9e62',
        lp_campaign_key: 'wQht6R8X7H3kTm9LqpcY',
        caller_id: data.phone,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone_number: data.phone || '',
        email_address: data.email || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        dob: data.dob || '',
        ip_address: data.ip_address || '',
        gender: data.gender || '',
        marital_status: data.marital_status || '',
        jornaya_lead_id: data.jornaya_lead_id || '',
        trusted_form_cert_id: data.trusted_form_cert_id || '',
        s1: data.s1 || '',
        s2: data.s2 || '',
        s3: data.s3 || '',
        s4: data.s4 || '',
        s5: data.s5 || ''
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ping failed',
      error: error.response?.data || error.message
    });
  }
});

// Required for Vercel Serverless
module.exports = app;
module.exports.handler = serverless(app);
