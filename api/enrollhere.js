// // import fetch from 'node-fetch';

// // export default async function handler(req, res) {
// //     // Set response content type first (ensures all responses are JSON)
// //     res.setHeader('Content-Type', 'application/json');

// //     // Set CORS headers
// //     res.setHeader('Access-Control-Allow-Origin', '*');
// //     res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
// //     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

// //     // Handle preflight request
// //     if (req.method === 'OPTIONS') {
// //         return res.status(200).json({ status: 'OK' });
// //     }
// //     try {
// //         const { phone } = req.query; // e.g. +18885551234

// //         if (!phone) {
// //             return res.status(400).json({ error: 'Phone number is required' });
// //         }

// //         // Step 1: Agent Count Ping
// //         const queueId = '8lhjkgpItwLmrjNDd7Dm'; // from client
// //         const countRes = await fetch(`https://api.enrollhere.com/dialer/availability/byQueue/${queueId}?phone=${encodeURIComponent(phone)}`);
// //         const countData = await countRes.json();

// //         if (!countData.available || (countData.count && countData.count <= 0)) {
// //             return res.status(200).json({ status: 'no_agents', message: 'No agents available' });
// //         }

// //         // Step 2: Retreaver RTB Ping
// //         const rtbUrl = `https://rtb.retreaver.com/rtbs.json?key=f57e013b-d3e8-4496-b553-d092150408f5&source_id=ff013e29&caller_number=${encodeURIComponent(phone)}`;
// //         const rtbRes = await fetch(rtbUrl);
// //         const rtbData = await rtbRes.json();

// //         if (!rtbData || rtbData.error || !rtbData.bids || rtbData.bids.length === 0) {
// //             return res.status(200).json({ status: 'no_bid', message: 'Number in IFG database - stop calling' });
// //         }

// //         // Step 3: Return Number to Dial
// //         const inboundNumber = rtbData.bids[0].destination || '+18884833553'; // static DID fallback
// //         return res.status(200).json({ status: 'ok', dialNumber: inboundNumber });

// //     } catch (err) {
// //         console.error(err);
// //         res.status(500).json({ error: 'Internal Server Error', details: err.message });
// //     }
// // }

// // File: api/callFlow.js


// import fetch from "node-fetch";

// export default async function handler(req, res) {
//   // ✅ Enable CORS for all origins
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type");

//   // Handle CORS preflight request
//   if (req.method === "OPTIONS") {
//     return res.status(200).end();
//   }

//   try {
//     const { phone, state, zip, street, city, email, firstName, lastName, dateOfBirth } = req.query;

//     if (!phone) {
//       return res.status(400).json({ error: "Missing required parameter: phone" });
//     }

//     // 1️⃣ Step 1: Ping Enrollhere Availability API
//     const enrollhereUrl = `https://api.enrollhere.com/dialer/availability/byQueue/8lhjkgpItwLmrjNDd7Dm?phone=${encodeURIComponent(
//       phone
//     )}${state ? `&state=${encodeURIComponent(state)}` : ""}${
//       zip ? `&zip=${encodeURIComponent(zip)}` : ""
//     }${street ? `&street=${encodeURIComponent(street)}` : ""}${
//       city ? `&city=${encodeURIComponent(city)}` : ""
//     }${email ? `&email=${encodeURIComponent(email)}` : ""}${
//       firstName ? `&firstName=${encodeURIComponent(firstName)}` : ""
//     }${lastName ? `&lastName=${encodeURIComponent(lastName)}` : ""}${
//       dateOfBirth ? `&dateOfBirth=${encodeURIComponent(dateOfBirth)}` : ""
//     }`;

//     const availabilityResp = await fetch(enrollhereUrl);
//     if (!availabilityResp.ok) {
//       throw new Error(`Enrollhere API Error: ${availabilityResp.status}`);
//     }
//     const availabilityData = await availabilityResp.json();

//     if (!availabilityData.available || (availabilityData.count ?? 0) <= 0) {
//       return res.status(200).json({
//         status: "NO_AGENTS",
//         message: "No agents available, call flow stopped.",
//       });
//     }

//     // 2️⃣ Step 2: Ping Retreaver RTB API
//     const retreaverUrl = `https://rtb.retreaver.com/rtbs.json?key=f57e013b-d3e8-4496-b553-d092150408f5&source_id=ff013e29&caller_number=${encodeURIComponent(
//       phone
//     )}`;

//     const rtbResp = await fetch(retreaverUrl);
//     if (!rtbResp.ok) {
//       throw new Error(`Retreaver API Error: ${rtbResp.status}`);
//     }
//     const rtbData = await rtbResp.json();

//     if (!rtbData || rtbData.error || !rtbData.bids || rtbData.bids.length === 0) {
//       return res.status(200).json({
//         status: "NO_BID",
//         message: "Number found in IFG database, do not try again.",
//       });
//     }

//     // 3️⃣ Step 3: Choose DID number
//     const dynamicInboundNumber = rtbData.bids[0]?.number;
//     const finalNumber = dynamicInboundNumber || "+18884833553";

//     return res.status(200).json({
//       status: "READY",
//       message: "Call can be transferred.",
//       transferNumber: finalNumber,
//       availabilityData,
//       rtbData,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: err.message || "Internal Server Error" });
//   }
// }

// pages/api/enrollhere.js
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  // Real-time (no caching)
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    // 📌 Config
    const QUEUE_ID = "8lhjkgpItwLmrjNDd7Dm";
    const RETREAVER_KEY = "f57e013b-d3e8-4496-b553-d092150408f5";
    const RETREAVER_SOURCE_ID = "ff013e29";
    const STATIC_DID = "+18884833553";

    // ✅ Required: phone (E.164)
    const { phone: rawPhone, ...restQuery } = req.query;
    const phone = typeof rawPhone === "string" ? rawPhone.trim() : "";

    if (!phone) {
      return res.status(400).json({ error: "Missing required field: phone" });
    }
    if (!/^\+\d{10,15}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone format. Must be E.164 like +18885551234" });
    }

    // 🔎 Only forward filled (non-empty) optional params exactly as docs
    const cleaned = {};
    for (const [k, v] of Object.entries({ phone, ...restQuery })) {
      if (typeof v === "string" && v.trim() !== "") cleaned[k] = v.trim();
    }
    const queryParams = new URLSearchParams(cleaned).toString();

    // Timeout helper
    const fetchWithTimeout = (url, ms = 10000) => {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), ms);
      return fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } })
        .finally(() => clearTimeout(id));
    };

    // 1️⃣ Enrollhere Availability (must parse `count`)
    const enrollhereUrl = `https://api.enrollhere.com/dialer/availability/byQueue/${QUEUE_ID}?${queryParams}`;
    const availabilityRes = await fetchWithTimeout(enrollhereUrl);
    if (!availabilityRes.ok) {
      return res.status(502).json({ error: `Enrollhere API error: ${availabilityRes.status}` });
    }
    const availabilityData = await availabilityRes.json();

    // Strictly enforce count > 0 (as per client instruction)
    const count = typeof availabilityData?.count === "number" ? availabilityData.count : 0;
    if (!(count > 0)) {
      return res.status(200).json({
        success: false,
        status: "NO_AGENTS",
        message: "Agent count is 0. Call flow stopped.",
        availabilityData,
      });
    }

    // 2️⃣ Retreaver RTB ping
    const rtbUrl = `https://rtb.retreaver.com/rtbs.json?key=${RETREAVER_KEY}&source_id=${RETREAVER_SOURCE_ID}&caller_number=${encodeURIComponent(
      phone
    )}`;
    const rtbRes = await fetchWithTimeout(rtbUrl);
    if (!rtbRes.ok) {
      return res.status(502).json({ error: `RTB API error: ${rtbRes.status}` });
    }
    const rtbData = await rtbRes.json();

    // If no bid ⇒ IFG database ⇒ stop further tries
    const bids = Array.isArray(rtbData?.bids) ? rtbData.bids : [];
    if (rtbData?.error || bids.length === 0) {
      return res.status(200).json({
        success: false,
        status: "NO_BID",
        message: "No RTB bid. Number is likely in IFG database. Do not retry.",
        rtbData,
      });
    }

    // 3️⃣ Pick number: Dynamic Inbound or Static DID
    const dynamicInboundNumber = bids[0]?.number || null;
    const transferNumber = dynamicInboundNumber || STATIC_DID;

    return res.status(200).json({
      success: true,
      status: "READY",
      message: "Pings OK. Transfer the call to the number below.",
      transferNumber,
      staticDID: STATIC_DID,
      dynamicInboundNumber,
      availability: {
        count,
        available: availabilityData?.available ?? null,
      },
      availabilityData,
      rtbData,
    });
  } catch (err) {
    const isAbort = err?.name === "AbortError";
    return res.status(isAbort ? 504 : 500).json({
      error: isAbort ? "Upstream timeout" : (err?.message || "Internal Server Error"),
    });
  }
}
