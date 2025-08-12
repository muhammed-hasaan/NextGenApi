// import fetch from 'node-fetch';

// export default async function handler(req, res) {
//     // Set response content type first (ensures all responses are JSON)
//     res.setHeader('Content-Type', 'application/json');

//     // Set CORS headers
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

//     // Handle preflight request
//     if (req.method === 'OPTIONS') {
//         return res.status(200).json({ status: 'OK' });
//     }
//     try {
//         const { phone } = req.query; // e.g. +18885551234

//         if (!phone) {
//             return res.status(400).json({ error: 'Phone number is required' });
//         }

//         // Step 1: Agent Count Ping
//         const queueId = '8lhjkgpItwLmrjNDd7Dm'; // from client
//         const countRes = await fetch(`https://api.enrollhere.com/dialer/availability/byQueue/${queueId}?phone=${encodeURIComponent(phone)}`);
//         const countData = await countRes.json();

//         if (!countData.available || (countData.count && countData.count <= 0)) {
//             return res.status(200).json({ status: 'no_agents', message: 'No agents available' });
//         }

//         // Step 2: Retreaver RTB Ping
//         const rtbUrl = `https://rtb.retreaver.com/rtbs.json?key=f57e013b-d3e8-4496-b553-d092150408f5&source_id=ff013e29&caller_number=${encodeURIComponent(phone)}`;
//         const rtbRes = await fetch(rtbUrl);
//         const rtbData = await rtbRes.json();

//         if (!rtbData || rtbData.error || !rtbData.bids || rtbData.bids.length === 0) {
//             return res.status(200).json({ status: 'no_bid', message: 'Number in IFG database - stop calling' });
//         }

//         // Step 3: Return Number to Dial
//         const inboundNumber = rtbData.bids[0].destination || '+18884833553'; // static DID fallback
//         return res.status(200).json({ status: 'ok', dialNumber: inboundNumber });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Internal Server Error', details: err.message });
//     }
// }

// /api/enrollhere.js
import fetch from 'node-fetch';
import Cors from 'cors';

// Init CORS middleware
const cors = Cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

// Helper: build query string from allowed params (only include present values)
function buildQueryString(params, allowed = []) {
  const parts = [];
  for (const key of allowed) {
    const val = params[key] ?? params[key.toLowerCase()] ?? params[key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export default async function handler(req, res) {
  // CORS
  await runMiddleware(req, res, cors);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Accept params from GET query or POST body
    const incoming = req.method === 'GET' ? req.query : (req.body || {});
    // Support common aliases
    const phone = incoming.phone || incoming.caller_id || incoming.callerId || incoming.phone_number || incoming.phoneNumber;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required (param: phone or caller_id)' });
    }

    // Allowed Enrollhere params per docs
    const allowedParams = [
      'phone','state','zip','street','city','email','firstName','lastName',
      'dateOfBirth','dateOfBirthYear','dateOfBirthMonth','dateOfBirthDay',
      'source','tags','note','marketingSource','marketingUtmParameters',
      'marketingLandingPage','referralSource','custom'
    ];

    // Build Enrollhere query string (ensures urlencoded)
    // Put phone first for clarity
    const params = { ...incoming, phone };
    const enrollQs = buildQueryString(params, allowedParams);

    // Config from env (set these on Vercel or .env.local)
    const QUEUE_ID = process.env.QUEUE_ID || '8lhjkgpItwLmrjNDd7Dm';
    const RTB_KEY = process.env.RTB_KEY || '';
    const RTB_SOURCE_ID = process.env.RTB_SOURCE_ID || '';
    const STATIC_DID = process.env.STATIC_DID || '+18884833553';
    const RETURN_DEBUG = process.env.RETURN_DEBUG === '1';

    // --- Step 1: Enrollhere availability (forward many params) ---
    const enrollUrl = `https://api.enrollhere.com/dialer/availability/byQueue/${encodeURIComponent(QUEUE_ID)}${enrollQs}`;
    const enrollRes = await fetch(enrollUrl, { method: 'GET', headers: { Accept: 'application/json' } });

    if (!enrollRes.ok) {
      const txt = await enrollRes.text().catch(() => '');
      throw new Error(`Enrollhere error: ${enrollRes.status} ${enrollRes.statusText} ${txt}`);
    }
    const enrollData = await enrollRes.json();

    // docs requirement: count > 0 and available true
    if (!enrollData.available || (typeof enrollData.count === 'number' && enrollData.count <= 0)) {
      const payload = { status: 'no_agents', message: 'No agents available' };
      if (RETURN_DEBUG) payload.enrollhere = enrollData;
      return res.status(200).json(payload);
    }

    // --- Step 2: RTB Ping (server-side) ---
    if (!RTB_KEY || !RTB_SOURCE_ID) {
      // If RTB config missing, return explicit message (safer than crash)
      return res.status(500).json({ error: 'RTB_KEY or RTB_SOURCE_ID not configured on server (set env vars)' });
    }

    const rtbUrl = `https://rtb.retreaver.com/rtbs.json?key=${encodeURIComponent(RTB_KEY)}&source_id=${encodeURIComponent(RTB_SOURCE_ID)}&caller_number=${encodeURIComponent(phone)}`;
    const rtbRes = await fetch(rtbUrl, { method: 'GET', headers: { Accept: 'application/json' } });

    if (!rtbRes.ok) {
      // If unauthorized specifically, return clear message
      if (rtbRes.status === 401 || rtbRes.status === 403) {
        return res.status(500).json({ error: 'RTB Unauthorized: check RTB_KEY/RTB_SOURCE_ID (server-side)', statusCode: rtbRes.status });
      }
      const txt = await rtbRes.text().catch(() => '');
      throw new Error(`RTB API error: ${rtbRes.status} ${rtbRes.statusText} ${txt}`);
    }
    const rtbData = await rtbRes.json();

    // Normalize bids array / inbound_number / destination
    const bids = rtbData?.bids || (Array.isArray(rtbData) ? rtbData : null);
    if (!bids || bids.length === 0) {
      const payload = { status: 'no_bid', message: 'Number in IFG database - stop calling' };
      if (RETURN_DEBUG) payload.rtb = rtbData;
      return res.status(200).json(payload);
    }

    // Choose inbound number: try bids[0].destination, then rtbData.inbound_number, then static DID
    const inbound = bids[0]?.destination || rtbData?.inbound_number || STATIC_DID;

    // Final response (doc-friendly)
    const final = { status: 'ok', dialNumber: inbound };
    if (RETURN_DEBUG) {
      final.enrollhere = enrollData;
      final.rtb = rtbData;
    }

    return res.status(200).json(final);

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
