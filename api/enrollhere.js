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

// File: api/callFlow.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  // ✅ Enable CORS for all origins
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { phone, state, zip, street, city, email, firstName, lastName, dateOfBirth } = req.query;

    if (!phone) {
      return res.status(400).json({ error: "Missing required parameter: phone" });
    }

    // 1️⃣ Step 1: Ping Enrollhere Availability API
    const enrollhereUrl = `https://api.enrollhere.com/dialer/availability/byQueue/8lhjkgpItwLmrjNDd7Dm?phone=${encodeURIComponent(
      phone
    )}${state ? `&state=${encodeURIComponent(state)}` : ""}${
      zip ? `&zip=${encodeURIComponent(zip)}` : ""
    }${street ? `&street=${encodeURIComponent(street)}` : ""}${
      city ? `&city=${encodeURIComponent(city)}` : ""
    }${email ? `&email=${encodeURIComponent(email)}` : ""}${
      firstName ? `&firstName=${encodeURIComponent(firstName)}` : ""
    }${lastName ? `&lastName=${encodeURIComponent(lastName)}` : ""}${
      dateOfBirth ? `&dateOfBirth=${encodeURIComponent(dateOfBirth)}` : ""
    }`;

    const availabilityResp = await fetch(enrollhereUrl);
    if (!availabilityResp.ok) {
      throw new Error(`Enrollhere API Error: ${availabilityResp.status}`);
    }
    const availabilityData = await availabilityResp.json();

    if (!availabilityData.available || (availabilityData.count ?? 0) <= 0) {
      return res.status(200).json({
        status: "NO_AGENTS",
        message: "No agents available, call flow stopped.",
      });
    }

    // 2️⃣ Step 2: Ping Retreaver RTB API
    const retreaverUrl = `https://rtb.retreaver.com/rtbs.json?key=f57e013b-d3e8-4496-b553-d092150408f5&source_id=ff013e29&caller_number=${encodeURIComponent(
      phone
    )}`;

    const rtbResp = await fetch(retreaverUrl);
    if (!rtbResp.ok) {
      throw new Error(`Retreaver API Error: ${rtbResp.status}`);
    }
    const rtbData = await rtbResp.json();

    if (!rtbData || rtbData.error || !rtbData.bids || rtbData.bids.length === 0) {
      return res.status(200).json({
        status: "NO_BID",
        message: "Number found in IFG database, do not try again.",
      });
    }

    // 3️⃣ Step 3: Choose DID number
    const dynamicInboundNumber = rtbData.bids[0]?.number;
    const finalNumber = dynamicInboundNumber || "+18884833553";

    return res.status(200).json({
      status: "READY",
      message: "Call can be transferred.",
      transferNumber: finalNumber,
      availabilityData,
      rtbData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
