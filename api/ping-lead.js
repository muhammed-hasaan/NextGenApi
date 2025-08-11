// // const express = require('express');
// // const axios = require('axios');
// // const serverless = require('serverless-http');
// // const cors = require('cors');

// // const app = express();

// // // ✅ Setup CORS manually to handle preflight
// // app.use((req, res, next) => {
// //   res.setHeader('Access-Control-Allow-Origin', '*'); // You can restrict to a domain if needed
// //   res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
// //   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
// //   if (req.method === 'OPTIONS') {
// //     return res.status(200).end();
// //   }
// //   next();
// // });

// // app.use(express.urlencoded({ extended: true }));
// // app.use(express.json());

// // app.post('/ping-lead', async (req, res) => {
// //   const data = req.body;

// //   try {
// //     const response = await axios.post(
// //       'https://track.edmleadnetwork.com/call-preping.do',
// //       new URLSearchParams({
// //         lp_campaign_id: '689103b4b9e62',
// //         lp_campaign_key: 'wQht6R8X7H3kTm9LqpcY',
// //         caller_id: data.phone,
// //         first_name: data.first_name || '',
// //         last_name: data.last_name || '',
// //         phone_number: data.phone || '',
// //         email_address: data.email || '',
// //         address: data.address || '',
// //         city: data.city || '',
// //         state: data.state || '',
// //         zip_code: data.zip_code || '',
// //         dob: data.dob || '',
// //         ip_address: data.ip_address || '',
// //         gender: data.gender || '',
// //         marital_status: data.marital_status || '',
// //         jornaya_lead_id: data.jornaya_lead_id || '',
// //         trusted_form_cert_id: data.trusted_form_cert_id || '',
// //         s1: data.s1 || '',
// //         s2: data.s2 || '',
// //         s3: data.s3 || '',
// //         s4: data.s4 || '',
// //         s5: data.s5 || ''
// //       }),
// //       {
// //         headers: {
// //           'Content-Type': 'application/x-www-form-urlencoded'
// //         }
// //       }
// //     );

// //     res.json(response.data);
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       message: 'Ping failed',
// //       error: error.response?.data || error.message
// //     });
// //   }
// // });



// // app.post('/clickthesis-ping', async (req, res) => {
// //   const data = req.body;

// //   try {
// //     const response = await axios.post(
// //       'https://www.clickthesis.com/api/apilead/homeservicesping',
// //       {
// //         sub_id: data.sub_id || 'source A',
// //         unique_id: data.unique_id,
// //         client_ip_address: data.client_ip_address,
// //         test_lead: data.test_lead?.toString() || 'True',
// //         trusted_form_cert_url: data.trusted_form_cert_url || '',
// //         website_url: data.website_url || '',
// //         state: data.state,
// //         zip_code: data.zip_code,
// //         project_type: data.project_type,
// //         property_type: data.property_type,
// //         install_repair: data.install_repair,
// //         project_start: data.project_start?.toString(),
// //         product_count: data.product_count?.toString(),
// //         home_owner: data.home_owner?.toString(),
// //         need_finance: data.need_finance?.toString(),
// //         user_agent: data.user_agent || '',
// //         tcpa_statement: data.tcpa_statement || ''
// //       },
// //       {
// //         headers: {
// //           'Content-Type': 'application/json',
// //           'x-api-key': '7df05004-5904-4217-880a-f2b2eb81af9e'
// //         }
// //       }
// //     );

// //     res.json({
// //       success: true,
// //       data: response.data
// //     });
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       message: 'ClickThesis Ping failed',
// //       error: error.response?.data || error.message
// //     });
// //   }
// // });

// // // POST TO CLICKTHESIS
// // app.post('/clickthesis-post', async (req, res) => {
// //   const data = req.body;

// //   try {
// //     const response = await axios.post(
// //       'https://www.clickthesis.com/api/apilead/homeservices',
// //       {
// //         ping_id: data.ping_id || '',
// //         sub_id: data.sub_id || 'source A',
// //         unique_id: data.unique_id,
// //         client_ip_address: data.client_ip_address,
// //         test_lead: data.test_lead?.toString() || 'True',
// //         trusted_form_cert_url: data.trusted_form_cert_url || '',
// //         website_url: data.website_url || '',
// //         first_name: data.first_name,
// //         last_name: data.last_name,
// //         email: data.email,
// //         phone: data.phone,
// //         street_address: data.street_address,
// //         city: data.city,
// //         state: data.state,
// //         zip_code: data.zip_code,
// //         project_type: data.project_type,
// //         property_type: data.property_type,
// //         install_repair: data.install_repair,
// //         project_start: data.project_start?.toString(),
// //         product_count: data.product_count?.toString(),
// //         home_owner: data.home_owner?.toString(),
// //         need_finance: data.need_finance?.toString(),
// //         user_agent: data.user_agent || '',
// //         tcpa_statement: data.tcpa_statement || ''
// //       },
// //       {
// //         headers: {
// //           'Content-Type': 'application/json',
// //           'x-api-key': '7df05004-5904-4217-880a-f2b2eb81af9e'
// //         }
// //       }
// //     );

// //     res.json({
// //       success: true,
// //       data: response.data
// //     });
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       message: 'ClickThesis Post failed',
// //       error: error.response?.data || error.message
// //     });
// //   }
// // });

// // module.exports = app;
// // module.exports.handler = serverless(app);

// // const express = require('express');
// // const axios = require('axios');
// // const serverless = require('serverless-http');
// // const cors = require('cors');

// // const app = express();

// // // ✅ Enable CORS properly for all origins (development). 
// // // Aap production mein origin restrict kar sakte ho agar zarurat ho.
// // app.use(
// //   cors({
// //     origin: '*',
// //     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
// //     allowedHeaders: ['Content-Type', 'Authorization']
// //   })
// // );

// // // Body parsing
// // app.use(express.urlencoded({ extended: true }));
// // app.use(express.json());

// // // Helper to pick phone value
// // const pickPhone = (data) => data.phone_number || data.caller_id || data.phone || '';

// // // === /ping-lead ===
// // app.post('/ping-lead', async (req, res) => {
// //   const data = req.body;

// //   try {
// //     const response = await axios.post(
// //       'https://track.edmleadnetwork.com/call-preping.do',
// //       new URLSearchParams({
// //         lp_campaign_id: '689103b4b9e62',
// //         lp_campaign_key: 'wQht6R8X7H3kTm9LqpcY',
// //         caller_id: pickPhone(data),
// //         first_name: data.first_name || '',
// //         last_name: data.last_name || '',
// //         phone_number: pickPhone(data),
// //         email_address: data.email_address || data.email || '',
// //         address: data.address || '',
// //         city: data.city || '',
// //         state: data.state || '',
// //         zip_code: data.zip_code || '',
// //         dob: data.dob || '',
// //         ip_address: data.ip_address || '',
// //         gender: data.gender || '',
// //         marital_status: data.marital_status || '',
// //         jornaya_lead_id: data.jornaya_lead_id || '',
// //         trusted_form_cert_id: data.trusted_form_cert_id || '',
// //         s1: data.s1 || '',
// //         s2: data.s2 || '',
// //         s3: data.s3 || '',
// //         s4: data.s4 || '',
// //         s5: data.s5 || ''
// //       }),
// //       {
// //         headers: {
// //           'Content-Type': 'application/x-www-form-urlencoded'
// //         }
// //       }
// //     );

// //     res.status(200).json(response.data);
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       message: 'Ping failed',
// //       error: error.response?.data || error.message
// //     });
// //   }
// // });

// // // === /clickthesis-ping ===
// // app.post('/clickthesis-ping', async (req, res) => {
// //   const data = req.body;

// //   try {
// //     const response = await axios.post(
// //       'https://www.clickthesis.com/api/apilead/homeservicesping',
// //       {
// //         sub_id: data.sub_id || 'source A',
// //         unique_id: data.unique_id,
// //         client_ip_address: data.client_ip_address,
// //         test_lead: data.test_lead?.toString() || 'True',
// //         trusted_form_cert_url: data.trusted_form_cert_url || '',
// //         website_url: data.website_url || '',
// //         state: data.state,
// //         zip_code: data.zip_code,
// //         project_type: data.project_type,
// //         property_type: data.property_type,
// //         install_repair: data.install_repair,
// //         project_start: data.project_start?.toString(),
// //         product_count: data.product_count?.toString(),
// //         home_owner: data.home_owner?.toString(),
// //         need_finance: data.need_finance?.toString(),
// //         user_agent: data.user_agent || '',
// //         tcpa_statement: data.tcpa_statement || ''
// //       },
// //       {
// //         headers: {
// //           'Content-Type': 'application/json',
// //           'x-api-key': '7df05004-5904-4217-880a-f2b2eb81af9e'
// //         }
// //       }
// //     );

// //     res.status(200).json({
// //       success: true,
// //       data: response.data
// //     });
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       message: 'ClickThesis Ping failed',
// //       error: error.response?.data || error.message
// //     });
// //   }
// // });

// // // === /clickthesis-post ===
// // app.post('/clickthesis-post', async (req, res) => {
// //   const data = req.body;

// //   try {
// //     const response = await axios.post(
// //       'https://www.clickthesis.com/api/apilead/homeservices',
// //       {
// //         ping_id: data.ping_id || '',
// //         sub_id: data.sub_id || 'source A',
// //         unique_id: data.unique_id,
// //         client_ip_address: data.client_ip_address,
// //         test_lead: data.test_lead?.toString() || 'True',
// //         trusted_form_cert_url: data.trusted_form_cert_url || '',
// //         website_url: data.website_url || '',
// //         first_name: data.first_name,
// //         last_name: data.last_name,
// //         email: data.email,
// //         phone: data.phone,
// //         street_address: data.street_address,
// //         city: data.city,
// //         state: data.state,
// //         zip_code: data.zip_code,
// //         project_type: data.project_type,
// //         property_type: data.property_type,
// //         install_repair: data.install_repair,
// //         project_start: data.project_start?.toString(),
// //         product_count: data.product_count?.toString(),
// //         home_owner: data.home_owner?.toString(),
// //         need_finance: data.need_finance?.toString(),
// //         user_agent: data.user_agent || '',
// //         tcpa_statement: data.tcpa_statement || ''
// //       },
// //       {
// //         headers: {
// //           'Content-Type': 'application/json',
// //           'x-api-key': '7df05004-5904-4217-880a-f2b2eb81af9e'
// //         }
// //       }
// //     );

// //     res.status(200).json({
// //       success: true,
// //       data: response.data
// //     });
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       message: 'ClickThesis Post failed',
// //       error: error.response?.data || error.message
// //     });
// //   }
// // });

// // module.exports = app;
// // module.exports.handler = serverless(app);

// // pages/api/call-preping-proxy.js
// import axios from 'axios';

// const EDM_URL = 'https://track.edmleadnetwork.com/call-preping.do';

// // Use env vars for security / flexibility; fall back to your current hardcoded values
// const DEFAULT_CAMPAIGN_ID = process.env.EDM_LP_CAMPAIGN_ID || '689103b4b9e62';
// const DEFAULT_CAMPAIGN_KEY = process.env.EDM_LP_CAMPAIGN_KEY || 'wQht6R8X7H3kTm9LqpcY';

// // helper to build params from incoming request (body or query)
// function buildParams(source = {}) {
//   return {
//     lp_campaign_id: source.lp_campaign_id || DEFAULT_CAMPAIGN_ID,
//     lp_campaign_key: source.lp_campaign_key || DEFAULT_CAMPAIGN_KEY,
//     caller_id: source.caller_id || source.phone_number || '',
//     // sub-affiliates
//     s1: source.s1 || '',
//     s2: source.s2 || '',
//     s3: source.s3 || '',
//     s4: source.s4 || '',
//     s5: source.s5 || '',
//     // posting fields
//     first_name: source.first_name || '',
//     last_name: source.last_name || '',
//     phone_number: source.phone_number || '',
//     email_address: source.email_address || '',
//     address: source.address || '',
//     city: source.city || '',
//     state: source.state || '',
//     zip_code: source.zip_code || '',
//     dob: source.dob || '',
//     ip_address: source.ip_address || '',
//     gender: source.gender || '',
//     marital_status: source.marital_status || '',
//     jornaya_lead_id: source.jornaya_lead_id || '',
//     trusted_form_cert_id: source.trusted_form_cert_id || ''
//   };
// }

// export default async function handler(req, res) {
//   // CORS
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//   res.setHeader(
//     'Access-Control-Allow-Headers',
//     'Content-Type, Accept, X-Requested-With, Authorization'
//   );
//   res.setHeader('Access-Control-Max-Age', '86400');

//   if (req.method === 'OPTIONS') {
//     return res.status(200).end();
//   }

//   if (!['POST', 'GET'].includes(req.method)) {
//     return res.status(405).json({ success: false, message: 'Method not allowed' });
//   }

//   // Accept incoming params from body (POST) or query (GET)
//   const source = req.method === 'POST' ? req.body || {} : req.query || {};
//   const params = buildParams(source);

//   // Basic validation: caller_id is required per docs.
//   if (!params.caller_id) {
//     return res.status(400).json({
//       success: false,
//       message:
//         'caller_id (phone number) is required. Provide caller_id or phone_number in the request.'
//     });
//   }

//   try {
//     let upstreamResponse;

//     if (req.method === 'POST') {
//       // send as form-encoded body
//       upstreamResponse = await axios.post(EDM_URL, new URLSearchParams(params).toString(), {
//         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//         timeout: 10000 // 10s timeout
//       });
//     } else {
//       // GET: send as query string
//       upstreamResponse = await axios.get(EDM_URL, {
//         params,
//         timeout: 10000
//       });
//     }

//     // Forward upstream status code and data
//     res.status(upstreamResponse.status).json(upstreamResponse.data);
//   } catch (error) {
//     // Try to pass along upstream response body/status if available
//     const status = error.response?.status || 500;
//     const payload =
//       error.response?.data ||
//       {
//         success: false,
//         message: 'Ping failed',
//         error: error.message
//       };

//     res.status(status).json(payload);
//   }
// }

// pages/api/ping-lead.js

// /pages/api/ping-lead.js

import axios from 'axios';

export default async function handler(req, res) {
  // ✅ Allow only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // ✅ Set CORS headers for Vercel serverless
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = req.body || {};

    // 🔑 Config from environment variables (Vercel dashboard me set karo)
    const LP_CAMPAIGN_ID = process.env.LP_CAMPAIGN_ID || '689103b4b9e62';
    const LP_CAMPAIGN_KEY = process.env.LP_CAMPAIGN_KEY || 'wQht6R8X7H3kTm9LqpcY';

    const caller_id = body.caller_id || body.phone_number || '';
    if (!caller_id) {
      return res.status(400).json({
        success: false,
        message: 'caller_id (phone number) is required. Provide caller_id or phone_number in the request.'
      });
    }

    // ✅ Prepare request params exactly per docs
    const params = new URLSearchParams();
    params.append('lp_campaign_id', LP_CAMPAIGN_ID);
    params.append('lp_campaign_key', LP_CAMPAIGN_KEY);
    params.append('caller_id', caller_id);

    ['s1', 's2', 's3', 's4', 's5'].forEach(k => {
      if (body[k]) params.append(k, body[k]);
    });

    const postFields = [
      'first_name', 'last_name', 'phone_number', 'email_address', 'address',
      'city', 'state', 'zip_code', 'dob', 'ip_address', 'gender',
      'marital_status', 'jornaya_lead_id', 'trusted_form_cert_id'
    ];

    postFields.forEach(k => {
      if (body[k] !== undefined && body[k] !== null && body[k] !== '') {
        params.append(k, body[k]);
      }
    });

    const PING_URL = 'https://track.edmleadnetwork.com/call-preping.do';

    // ✅ Forward to EDM API from server
    const edmResp = await axios.post(PING_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });

    // ✅ Send EDM API response to frontend
    return res.status(200).json(edmResp.data);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({
      success: false,
      message: err.response?.data || err.message || 'Unknown error'
    });
  }
}
