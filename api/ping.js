// const express = require('express');
// const axios = require('axios');
// const serverless = require('serverless-http');
// const cors = require('cors');

// const app = express();

// // ✅ Setup CORS manually to handle preflight
// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', '*'); // You can restrict to a domain if needed
//   res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   if (req.method === 'OPTIONS') {
//     return res.status(200).end();
//   }
//   next();
// });

// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());

// app.post('/ping-lead', async (req, res) => {
//   const data = req.body;

//   try {
//     const response = await axios.post(
//       'https://track.edmleadnetwork.com/call-preping.do',
//       new URLSearchParams({
//         lp_campaign_id: '689103b4b9e62',
//         lp_campaign_key: 'wQht6R8X7H3kTm9LqpcY',
//         caller_id: data.phone,
//         first_name: data.first_name || '',
//         last_name: data.last_name || '',
//         phone_number: data.phone || '',
//         email_address: data.email || '',
//         address: data.address || '',
//         city: data.city || '',
//         state: data.state || '',
//         zip_code: data.zip_code || '',
//         dob: data.dob || '',
//         ip_address: data.ip_address || '',
//         gender: data.gender || '',
//         marital_status: data.marital_status || '',
//         jornaya_lead_id: data.jornaya_lead_id || '',
//         trusted_form_cert_id: data.trusted_form_cert_id || '',
//         s1: data.s1 || '',
//         s2: data.s2 || '',
//         s3: data.s3 || '',
//         s4: data.s4 || '',
//         s5: data.s5 || ''
//       }),
//       {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded'
//         }
//       }
//     );

//     res.json(response.data);
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Ping failed',
//       error: error.response?.data || error.message
//     });
//   }
// });



// app.post('/clickthesis-ping', async (req, res) => {
//   const data = req.body;

//   try {
//     const response = await axios.post(
//       'https://www.clickthesis.com/api/apilead/homeservicesping',
//       {
//         sub_id: data.sub_id || 'source A',
//         unique_id: data.unique_id,
//         client_ip_address: data.client_ip_address,
//         test_lead: data.test_lead?.toString() || 'True',
//         trusted_form_cert_url: data.trusted_form_cert_url || '',
//         website_url: data.website_url || '',
//         state: data.state,
//         zip_code: data.zip_code,
//         project_type: data.project_type,
//         property_type: data.property_type,
//         install_repair: data.install_repair,
//         project_start: data.project_start?.toString(),
//         product_count: data.product_count?.toString(),
//         home_owner: data.home_owner?.toString(),
//         need_finance: data.need_finance?.toString(),
//         user_agent: data.user_agent || '',
//         tcpa_statement: data.tcpa_statement || ''
//       },
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           'x-api-key': '7df05004-5904-4217-880a-f2b2eb81af9e'
//         }
//       }
//     );

//     res.json({
//       success: true,
//       data: response.data
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'ClickThesis Ping failed',
//       error: error.response?.data || error.message
//     });
//   }
// });

// // POST TO CLICKTHESIS
// app.post('/clickthesis-post', async (req, res) => {
//   const data = req.body;

//   try {
//     const response = await axios.post(
//       'https://www.clickthesis.com/api/apilead/homeservices',
//       {
//         ping_id: data.ping_id || '',
//         sub_id: data.sub_id || 'source A',
//         unique_id: data.unique_id,
//         client_ip_address: data.client_ip_address,
//         test_lead: data.test_lead?.toString() || 'True',
//         trusted_form_cert_url: data.trusted_form_cert_url || '',
//         website_url: data.website_url || '',
//         first_name: data.first_name,
//         last_name: data.last_name,
//         email: data.email,
//         phone: data.phone,
//         street_address: data.street_address,
//         city: data.city,
//         state: data.state,
//         zip_code: data.zip_code,
//         project_type: data.project_type,
//         property_type: data.property_type,
//         install_repair: data.install_repair,
//         project_start: data.project_start?.toString(),
//         product_count: data.product_count?.toString(),
//         home_owner: data.home_owner?.toString(),
//         need_finance: data.need_finance?.toString(),
//         user_agent: data.user_agent || '',
//         tcpa_statement: data.tcpa_statement || ''
//       },
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           'x-api-key': '7df05004-5904-4217-880a-f2b2eb81af9e'
//         }
//       }
//     );

//     res.json({
//       success: true,
//       data: response.data
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'ClickThesis Post failed',
//       error: error.response?.data || error.message
//     });
//   }
// });

// module.exports = app;
// module.exports.handler = serverless(app);

const express = require('express');
const axios = require('axios');
const serverless = require('serverless-http');
const cors = require('cors');

const app = express();

// ✅ Enable CORS properly for all origins (development). 
// Aap production mein origin restrict kar sakte ho agar zarurat ho.
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Helper to pick phone value
const pickPhone = (data) => data.phone_number || data.caller_id || data.phone || '';

// === /ping-lead ===
app.post('/ping-lead', async (req, res) => {
  const data = req.body;

  try {
    const response = await axios.post(
      'https://track.edmleadnetwork.com/call-preping.do',
      new URLSearchParams({
        lp_campaign_id: '689103b4b9e62',
        lp_campaign_key: 'wQht6R8X7H3kTm9LqpcY',
        caller_id: pickPhone(data),
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone_number: pickPhone(data),
        email_address: data.email_address || data.email || '',
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

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ping failed',
      error: error.response?.data || error.message
    });
  }
});

// === /clickthesis-ping ===
app.post('/clickthesis-ping', async (req, res) => {
  const data = req.body;

  try {
    const response = await axios.post(
      'https://www.clickthesis.com/api/apilead/homeservicesping',
      {
        sub_id: data.sub_id || 'source A',
        unique_id: data.unique_id,
        client_ip_address: data.client_ip_address,
        test_lead: data.test_lead?.toString() || 'True',
        trusted_form_cert_url: data.trusted_form_cert_url || '',
        website_url: data.website_url || '',
        state: data.state,
        zip_code: data.zip_code,
        project_type: data.project_type,
        property_type: data.property_type,
        install_repair: data.install_repair,
        project_start: data.project_start?.toString(),
        product_count: data.product_count?.toString(),
        home_owner: data.home_owner?.toString(),
        need_finance: data.need_finance?.toString(),
        user_agent: data.user_agent || '',
        tcpa_statement: data.tcpa_statement || ''
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': '7df05004-5904-4217-880a-f2b2eb81af9e'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ClickThesis Ping failed',
      error: error.response?.data || error.message
    });
  }
});

// === /clickthesis-post ===
app.post('/clickthesis-post', async (req, res) => {
  const data = req.body;

  try {
    const response = await axios.post(
      'https://www.clickthesis.com/api/apilead/homeservices',
      {
        ping_id: data.ping_id || '',
        sub_id: data.sub_id || 'source A',
        unique_id: data.unique_id,
        client_ip_address: data.client_ip_address,
        test_lead: data.test_lead?.toString() || 'True',
        trusted_form_cert_url: data.trusted_form_cert_url || '',
        website_url: data.website_url || '',
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        street_address: data.street_address,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
        project_type: data.project_type,
        property_type: data.property_type,
        install_repair: data.install_repair,
        project_start: data.project_start?.toString(),
        product_count: data.product_count?.toString(),
        home_owner: data.home_owner?.toString(),
        need_finance: data.need_finance?.toString(),
        user_agent: data.user_agent || '',
        tcpa_statement: data.tcpa_statement || ''
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': '7df05004-5904-4217-880a-f2b2eb81af9e'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ClickThesis Post failed',
      error: error.response?.data || error.message
    });
  }
});

module.exports = app;
module.exports.handler = serverless(app);
