// import fetch from 'node-fetch';

// export default async function handler(req, res) {
//   // CORS headers
//   res.setHeader('Access-Control-Allow-Origin', '*'); // allow all origins
//   res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

//   // Handle preflight request
//   if (req.method === 'OPTIONS') {
//     return res.status(200).end();
//   }

//   try {
//     const { phone } = req.query; // e.g. +18885551234

//     if (!phone) {
//       return res.status(400).json({ error: 'Phone number is required' });
//     }

//     // Step 1: Agent Count Ping
//     const queueId = '8lhjkgpItwLmrjNDd7Dm'; // from client
//     const countRes = await fetch(`https://api.enrollhere.com/dialer/availability/byQueue/${queueId}?phone=${encodeURIComponent(phone)}`);
//     const countData = await countRes.json();

//     if (!countData.available || (countData.count && countData.count <= 0)) {
//       return res.status(200).json({ status: 'no_agents', message: 'No agents available' });
//     }

//     // Step 2: Retreaver RTB Ping
//     const rtbUrl = `https://rtb.retreaver.com/rtbs.json?key=f57e013b-d3e8-4496-b553-d092150408f5&source_id=ff013e29&caller_number=${encodeURIComponent(phone)}`;
//     const rtbRes = await fetch(rtbUrl);
//     const rtbData = await rtbRes.json();

//     if (!rtbData || rtbData.error || !rtbData.bids || rtbData.bids.length === 0) {
//       return res.status(200).json({ status: 'no_bid', message: 'Number in IFG database - stop calling' });
//     }

//     // Step 3: Return Number to Dial
//     const inboundNumber = rtbData.bids[0].destination || '+18884833553'; // static DID fallback
//     return res.status(200).json({ status: 'ok', dialNumber: inboundNumber });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Internal Server Error', details: err.message });
//   }
// }

// import fetch from 'node-fetch';
// import Cors from 'cors';

// // Initializing the cors middleware
// const cors = Cors({
//     methods: ['GET', 'POST', 'OPTIONS'],
//     origin: '*', // Allow all origins
// });

// // Helper method to wait for a middleware to execute before continuing
// function runMiddleware(req, res, fn) {
//     return new Promise((resolve, reject) => {
//         fn(req, res, (result) => {
//             if (result instanceof Error) {
//                 return reject(result);
//             }
//             return resolve(result);
//         });
//     });
// }

// export default async function handler(req, res) {
//     await runMiddleware(req, res, cors);
//     // --- CORS setup ---
//     res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allowed methods
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allowed headers

//     // --- Handle OPTIONS preflight requests ---
//     if (req.method === 'OPTIONS') {
//         return res.status(200).end();
//     }

//     try {
//         const { phone } = req.query; // e.g., +18885551234

//         if (!phone) {
//             return res.status(400).json({ error: 'Phone number is required' });
//         }

//         // --- Step 1: Agent Count Ping ---
//         const queueId = '8lhjkgpItwLmrjNDd7Dm'; // from client
//         const countRes = await fetch(
//             `https://api.enrollhere.com/dialer/availability/byQueue/${queueId}?phone=${encodeURIComponent(phone)}`
//         );

//         if (!countRes.ok) {
//             throw new Error(`Agent count API error: ${countRes.statusText}`);
//         }

//         const countData = await countRes.json();

//         if (!countData.available || (countData.count && countData.count <= 0)) {
//             return res.status(200).json({
//                 status: 'no_agents',
//                 message: 'No agents available',
//             });
//         }

//         // --- Step 2: Retreaver RTB Ping ---
//         const rtbUrl = `https://rtb.retreaver.com/rtbs.json?key=f57e013b-d3e8-4496-b553-d092150408f5&source_id=ff013e29&caller_number=${encodeURIComponent(
//             phone
//         )}`;

//         const rtbRes = await fetch(rtbUrl);

//         if (!rtbRes.ok) {
//             throw new Error(`RTB API error: ${rtbRes.statusText}`);
//         }

//         const rtbData = await rtbRes.json();

//         if (!rtbData || rtbData.error || !rtbData.bids || rtbData.bids.length === 0) {
//             return res.status(200).json({
//                 status: 'no_bid',
//                 message: 'Number in IFG database - stop calling',
//             });
//         }

//         // --- Step 3: Return Number to Dial ---
//         const inboundNumber = rtbData.bids[0].destination || '+18884833553'; // fallback number
//         res.status(200).json({ message: 'CORS working fine!' });

//         return res.status(200).json({
//             status: 'ok',
//             dialNumber: inboundNumber,
//         });

//     } catch (err) {
//         console.error('API Error:', err);
//         return res.status(500).json({
//             error: 'Internal Server Error',
//             details: err.message,
//         });
//     }

// }

import fetch from 'node-fetch';
import Cors from 'cors';

// Init CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  origin: '*',
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Step 1: Agent count check
    const queueId = '8lhjkgpItwLmrjNDd7Dm';
    const countRes = await fetch(
      `https://api.enrollhere.com/dialer/availability/byQueue/${queueId}?phone=${encodeURIComponent(phone)}`
    );

    if (!countRes.ok) {
      throw new Error(`Agent count API error: ${countRes.statusText}`);
    }

    const countData = await countRes.json();

    if (!countData.available || (countData.count && countData.count <= 0)) {
      return res.status(200).json({
        status: 'no_agents',
        message: 'No agents available',
      });
    }

    // Step 2: Retreaver RTB Ping
    const rtbUrl = `https://rtb.retreaver.com/rtbs.json?key=f57e013b-d3e8-4496-b553-d092150408f5&source_id=ff013e29&caller_number=${encodeURIComponent(phone)}`;
    const rtbRes = await fetch(rtbUrl);

    if (!rtbRes.ok) {
      throw new Error(`RTB API error: ${rtbRes.statusText}`);
    }

    const rtbData = await rtbRes.json();

    if (!rtbData || rtbData.error || !rtbData.bids || rtbData.bids.length === 0) {
      return res.status(200).json({
        status: 'no_bid',
        message: 'Number in IFG database - stop calling',
      });
    }

    // Step 3: Return inbound number
    const inboundNumber = rtbData.bids[0].destination || '+18884833553';
    return res.status(200).json({
      status: 'ok',
      dialNumber: inboundNumber,
    });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: err.message,
    });
  }
}
