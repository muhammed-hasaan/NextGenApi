// // // // api/bath.js

// // // const AFID = '568579';
// // // const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
// // // const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
// // // const BUFFER_SECONDS = 120;
// // // const MAX_CONCURRENCY = 3;
// // // const MAX_PER_DAY = 10;

// // // // In-memory state (ephemeral — resets on cold start)
// // // let dailyCount = 0;
// // // let currentDay = getPstDayString(); // "YYYY-MM-DD"
// // // const recentPhoneBuffer = new Map(); // normalizedPhone -> timestamp(ms)
// // // const concurrencyQueue = [];
// // // let activeCount = 0;

// // // // Allowed job types (case-insensitive)
// // // const VALID_JOB_TYPES = [
// // //   'tub to shower conversion',
// // //   'new bathtub',
// // //   'new shower'
// // // ];

// // // // Helper for PST day string
// // // function getPstDayString() {
// // //   // offset for America/Los_Angeles manually since we avoid deps
// // //   const now = new Date();
// // //   // convert to UTC ms, then apply PST offset (UTC-7 or UTC-8 depending DST)
// // //   // Simplify: use Intl to get timezone offset dynamically
// // //   try {
// // //     const options = { timeZone: 'America/Los_Angeles' };
// // //     const formatter = new Intl.DateTimeFormat('en-CA', {
// // //       ...options,
// // //       year: 'numeric',
// // //       month: '2-digit',
// // //       day: '2-digit'
// // //     });
// // //     const parts = formatter.formatToParts(now);
// // //     const y = parts.find(p => p.type === 'year').value;
// // //     const m = parts.find(p => p.type === 'month').value;
// // //     const d = parts.find(p => p.type === 'day').value;
// // //     return `${y}-${m}-${d}`;
// // //   } catch (e) {
// // //     // fallback naive: subtract 7 hours
// // //     const fallback = new Date(now.getTime() - 7 * 60 * 60 * 1000);
// // //     return fallback.toISOString().slice(0, 10);
// // //   }
// // // }

// // // // Simple semaphore acquire/release
// // // function acquireSlot() {
// // //   return new Promise((resolve) => {
// // //     const tryAcquire = () => {
// // //       if (activeCount < MAX_CONCURRENCY) {
// // //         activeCount += 1;
// // //         resolve();
// // //       } else {
// // //         concurrencyQueue.push(tryAcquire);
// // //       }
// // //     };
// // //     tryAcquire();
// // //   });
// // // }

// // // function releaseSlot() {
// // //   activeCount = Math.max(0, activeCount - 1);
// // //   if (concurrencyQueue.length) {
// // //     const next = concurrencyQueue.shift();
// // //     next();
// // //   }
// // // }

// // // // Normalize phone to digits only
// // // function normalizePhone(p) {
// // //   return (p || '').replace(/\D/g, '');
// // // }

// // // // Handler
// // // export default async function handler(req, res) {
// // //   // Vercel passes req.method and res as in Node.js
// // //   try {
// // //     // Reset daily counter if PST day changed
// // //     const today = getPstDayString();
// // //     if (today !== currentDay) {
// // //       currentDay = today;
// // //       dailyCount = 0;
// // //     }

// // //     if (req.method !== 'POST') {
// // //       res.status(405).json({ error: 'Only POST allowed' });
// // //       return;
// // //     }

// // //     // Parse JSON body
// // //     let lead;
// // //     try {
// // //       lead = await parseJson(req);
// // //     } catch (e) {
// // //       res.status(400).json({ error: 'Invalid JSON body', details: e.message });
// // //       return;
// // //     }

// // //     // Required fields
// // //     const required = ['FirstName', 'LastName', 'Phone', 'Address', 'City', 'State', 'Zip', 'jobType', 'spaceType', 'propertyType', 'occupancy'];
// // //     const missing = required.filter(f => !lead[f]);
// // //     if (missing.length) {
// // //       res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
// // //       return;
// // //     }

// // //     // Qualifications
// // //     if (lead.spaceType.toLowerCase() !== 'wet') {
// // //       res.status(400).json({ error: 'Qualification failed: spaceType must be "wet"' });
// // //       return;
// // //     }

// // //     if (!VALID_JOB_TYPES.includes(lead.jobType.toLowerCase())) {
// // //       res.status(400).json({ error: `Qualification failed: jobType must be one of ${VALID_JOB_TYPES.join(', ')}` });
// // //       return;
// // //     }

// // //     if (lead.propertyType.toLowerCase().includes('mobile')) {
// // //       res.status(400).json({ error: 'Qualification failed: mobile homes are not allowed' });
// // //       return;
// // //     }

// // //     if (['renter', 'renters'].includes(lead.occupancy.toLowerCase())) {
// // //       res.status(400).json({ error: 'Qualification failed: renters are not allowed' });
// // //       return;
// // //     }

// // //     // Buffer check
// // //     const nowTs = Date.now();
// // //     const phoneKey = normalizePhone(lead.Phone);
// // //     if (recentPhoneBuffer.has(phoneKey)) {
// // //       const lastTs = recentPhoneBuffer.get(phoneKey);
// // //       if (nowTs - lastTs < BUFFER_SECONDS * 1000) {
// // //         const wait = Math.ceil((BUFFER_SECONDS * 1000 - (nowTs - lastTs)) / 1000);
// // //         res.status(429).json({ error: `Duplicate lead: wait ${wait}s before retrying for this phone` });
// // //         return;
// // //       }
// // //     }

// // //     // Daily limit
// // //     if (dailyCount >= MAX_PER_DAY) {
// // //       res.status(429).json({ error: 'Daily maximum leads reached' });
// // //       return;
// // //     }

// // //     // Acquire concurrency slot
// // //     await acquireSlot();

// // //     // Register buffer and schedule cleanup
// // //     recentPhoneBuffer.set(phoneKey, nowTs);
// // //     setTimeout(() => {
// // //       const stored = recentPhoneBuffer.get(phoneKey);
// // //       if (stored && Date.now() - stored >= BUFFER_SECONDS * 1000) {
// // //         recentPhoneBuffer.delete(phoneKey);
// // //       }
// // //     }, BUFFER_SECONDS * 1000 + 1000);

// // //     // Build form payload
// // //     const form = new URLSearchParams();
// // //     form.append('AFID', AFID);
// // //     if (lead.SID) form.append('SID', lead.SID);
// // //     if (lead.ADID) form.append('ADID', lead.ADID);
// // //     if (lead.ClickID) form.append('ClickID', lead.ClickID);
// // //     if (lead.AffiliateReferenceID) form.append('AffiliateReferenceID', lead.AffiliateReferenceID);
// // //     form.append('FirstName', lead.FirstName);
// // //     form.append('LastName', lead.LastName);
// // //     form.append('Phone', lead.Phone);
// // //     if (lead.Email) form.append('Email', lead.Email);
// // //     form.append('Address', lead.Address);
// // //     form.append('City', lead.City);
// // //     form.append('State', lead.State);
// // //     form.append('Zip', lead.Zip);
// // //     if (lead.SquareFootage) form.append('SquareFootage', lead.SquareFootage);
// // //     if (lead.RoofType) form.append('RoofType', lead.RoofType);

// // //     const useSecure = !!lead.useSecure;
// // //     const postUrl = useSecure ? SECURE_POST_URL : SIMPLE_POST_URL;

// // //     // POST with one retry
// // //     let postResponse;
// // //     let attempt = 0;
// // //     while (attempt < 2) {
// // //       try {
// // //         attempt++;
// // //         const fetchRes = await fetch(postUrl, {
// // //           method: 'POST',
// // //           headers: {
// // //             'Content-Type': 'application/x-www-form-urlencoded'
// // //           },
// // //           body: form.toString(),
// // //           // timeout not natively supported; Vercel has its own limits
// // //         });
// // //         const text = await fetchRes.text();
// // //         postResponse = {
// // //           status: fetchRes.status,
// // //           data: "Thank you for submitting your request"
// // //         //   data: text
// // //         };
// // //         break;
// // //       } catch (err) {
// // //         if (attempt >= 2) {
// // //           throw err;
// // //         }
// // //         // small delay before retry
// // //         await delay(300 * attempt);
// // //       }
// // //     }

// // //     // Count success
// // //     dailyCount += 1;

// // //     res.status(200).json({
// // //       message: 'Lead posted successfully',
// // //       usedSecurePost: useSecure,
// // //       dailyCount,
// // //       postResponse
// // //     });
    
// // //   } catch (err) {
// // //     console.error('Lead handler error:', err);
// // //     res.status(500).json({ error: 'Internal error', details: err?.message || String(err) });
// // //   } finally {
// // //     releaseSlot();
// // //   }
// // // }

// // // // Minimal JSON body parser for Vercel raw req
// // // function parseJson(req) {
// // //   return new Promise((resolve, reject) => {
// // //     let body = '';
// // //     req.on('data', chunk => {
// // //       body += chunk.toString();
// // //       if (body.length > 1e6) {
// // //         reject(new Error('Payload too large'));
// // //         req.destroy();
// // //       }
// // //     });
// // //     req.on('end', () => {
// // //       try {
// // //         const parsed = JSON.parse(body || '{}');
// // //         resolve(parsed);
// // //       } catch (e) {
// // //         reject(e);
// // //       }
// // //     });
// // //     req.on('error', reject);
// // //   });
// // // }

// // // function delay(ms) {
// // //   return new Promise(r => setTimeout(r, ms));
// // // }

// // // api/lead.js

// // const AFID = '568579';
// // const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
// // const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
// // const BUFFER_SECONDS = 120;
// // const MAX_CONCURRENCY = 3;
// // const MAX_PER_DAY = 10;

// // // In-memory state (ephemeral — resets on cold start)
// // let dailyCount = 0;
// // let currentDay = getPstDayString(); // "YYYY-MM-DD"
// // const recentPhoneBuffer = new Map(); // normalizedPhone -> timestamp(ms)
// // const concurrencyQueue = [];
// // let activeCount = 0;

// // // Allowed job types (case-insensitive)
// // const VALID_JOB_TYPES = [
// //   'tub to shower conversion',
// //   'new bathtub',
// //   'new shower'
// // ];

// // function getPstDayString() {
// //   try {
// //     const now = new Date();
// //     const options = { timeZone: 'America/Los_Angeles' };
// //     const f = new Intl.DateTimeFormat('en-CA', {
// //       ...options,
// //       year: 'numeric',
// //       month: '2-digit',
// //       day: '2-digit'
// //     });
// //     const parts = f.formatToParts(now);
// //     const y = parts.find(p => p.type === 'year').value;
// //     const m = parts.find(p => p.type === 'month').value;
// //     const d = parts.find(p => p.type === 'day').value;
// //     return `${y}-${m}-${d}`;
// //   } catch (e) {
// //     const fallback = new Date(Date.now() - 7 * 60 * 60 * 1000);
// //     return fallback.toISOString().slice(0, 10);
// //   }
// // }

// // // Simple semaphore
// // function acquireSlot() {
// //   return new Promise((resolve) => {
// //     const tryAcquire = () => {
// //       if (activeCount < MAX_CONCURRENCY) {
// //         activeCount += 1;
// //         resolve();
// //       } else {
// //         concurrencyQueue.push(tryAcquire);
// //       }
// //     };
// //     tryAcquire();
// //   });
// // }

// // function releaseSlot() {
// //   activeCount = Math.max(0, activeCount - 1);
// //   if (concurrencyQueue.length) {
// //     const next = concurrencyQueue.shift();
// //     next();
// //   }
// // }

// // function normalizePhone(p) {
// //   return (p || '').replace(/\D/g, '');
// // }

// // export default async function handler(req, res) {
// //   try {
// //     // daily reset (PST)
// //     const today = getPstDayString();
// //     if (today !== currentDay) {
// //       currentDay = today;
// //       dailyCount = 0;
// //     }

// //     if (req.method !== 'POST') {
// //       res.status(405).json({ error: 'Only POST allowed' });
// //       return;
// //     }

// //     let lead;
// //     try {
// //       lead = await parseJson(req);
// //     } catch (e) {
// //       res.status(400).json({ error: 'Invalid JSON body', details: e.message });
// //       return;
// //     }

// //     // Required
// //     const required = ['FirstName', 'LastName', 'Phone', 'Address', 'City', 'State', 'Zip', 'jobType', 'spaceType', 'propertyType', 'occupancy'];
// //     const missing = required.filter(f => !lead[f]);
// //     if (missing.length) {
// //       res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
// //       return;
// //     }

// //     // Qualifications
// //     if (lead.spaceType.toLowerCase() !== 'wet') {
// //       res.status(400).json({ error: 'Qualification failed: spaceType must be "wet"' });
// //       return;
// //     }

// //     if (!VALID_JOB_TYPES.includes(lead.jobType.toLowerCase())) {
// //       res.status(400).json({ error: `Qualification failed: jobType must be one of ${VALID_JOB_TYPES.join(', ')}` });
// //       return;
// //     }

// //     if (lead.propertyType.toLowerCase().includes('mobile')) {
// //       res.status(400).json({ error: 'Qualification failed: mobile homes are not allowed' });
// //       return;
// //     }

// //     if (['renter', 'renters'].includes(lead.occupancy.toLowerCase())) {
// //       res.status(400).json({ error: 'Qualification failed: renters are not allowed' });
// //       return;
// //     }

// //     // Buffer
// //     const nowTs = Date.now();
// //     const phoneKey = normalizePhone(lead.Phone);
// //     if (recentPhoneBuffer.has(phoneKey)) {
// //       const lastTs = recentPhoneBuffer.get(phoneKey);
// //       if (nowTs - lastTs < BUFFER_SECONDS * 1000) {
// //         const wait = Math.ceil((BUFFER_SECONDS * 1000 - (nowTs - lastTs)) / 1000);
// //         res.status(429).json({ error: `Duplicate lead: wait ${wait}s before retrying for this phone` });
// //         return;
// //       }
// //     }

// //     // Daily limit
// //     if (dailyCount >= MAX_PER_DAY) {
// //       res.status(429).json({ error: 'Daily maximum leads reached' });
// //       return;
// //     }

// //     // Acquire slot
// //     await acquireSlot();

// //     // Register buffer cleanup
// //     recentPhoneBuffer.set(phoneKey, nowTs);
// //     setTimeout(() => {
// //       const stored = recentPhoneBuffer.get(phoneKey);
// //       if (stored && Date.now() - stored >= BUFFER_SECONDS * 1000) {
// //         recentPhoneBuffer.delete(phoneKey);
// //       }
// //     }, BUFFER_SECONDS * 1000 + 1000);

// //     // Build form data
// //     const form = new URLSearchParams();
// //     form.append('AFID', AFID);
// //     if (lead.SID) form.append('SID', lead.SID);
// //     if (lead.ADID) form.append('ADID', lead.ADID);
// //     if (lead.ClickID) form.append('ClickID', lead.ClickID);
// //     if (lead.AffiliateReferenceID) form.append('AffiliateReferenceID', lead.AffiliateReferenceID);
// //     form.append('FirstName', lead.FirstName);
// //     form.append('LastName', lead.LastName);
// //     form.append('Phone', lead.Phone);
// //     if (lead.Email) form.append('Email', lead.Email);
// //     form.append('Address', lead.Address);
// //     form.append('City', lead.City);
// //     form.append('State', lead.State);
// //     form.append('Zip', lead.Zip);
// //     if (lead.SquareFootage) form.append('SquareFootage', lead.SquareFootage);
// //     if (lead.RoofType) form.append('RoofType', lead.RoofType);

// //     // Decide post type: lead.postType should be 'simple' or 'secure'; fallback to simple
// //     const postType = (lead.postType || 'simple').toLowerCase();
// //     let postUrl = SIMPLE_POST_URL;
// //     if (postType === 'secure') postUrl = SECURE_POST_URL;

// //     // POST with one retry
// //     let postResponse = null;
// //     let attempt = 0;
// //     while (attempt < 2) {
// //       try {
// //         attempt++;
// //         const fetchRes = await fetch(postUrl, {
// //           method: 'POST',
// //           headers: {
// //             'Content-Type': 'application/x-www-form-urlencoded'
// //           },
// //           body: form.toString()
// //         });
// //         const text = await fetchRes.text();
// //         postResponse = {
// //           status: fetchRes.status,
// //           data: text
// //         };
// //         break;
// //       } catch (err) {
// //         if (attempt >= 2) {
// //           throw err;
// //         }
// //         await delay(300 * attempt);
// //       }
// //     }

// //     dailyCount += 1;

// //     res.status(200).json({
// //       message: 'Lead posted successfully',
// //       postType,
// //       dailyCount,
// //       postResponse
// //     });
// //   } catch (err) {
// //     console.error('Lead handler error:', err);
// //     res.status(500).json({ error: 'Internal error', details: err?.message || String(err) });
// //   } finally {
// //     releaseSlot();
// //   }
// // }

// // function parseJson(req) {
// //   return new Promise((resolve, reject) => {
// //     let body = '';
// //     req.on('data', chunk => {
// //       body += chunk.toString();
// //       if (body.length > 1e6) {
// //         reject(new Error('Payload too large'));
// //         req.destroy();
// //       }
// //     });
// //     req.on('end', () => {
// //       try {
// //         resolve(JSON.parse(body || '{}'));
// //       } catch (e) {
// //         reject(e);
// //       }
// //     });
// //     req.on('error', reject);
// //   });
// // }

// // function delay(ms) {
// //   return new Promise(r => setTimeout(r, ms));
// // }

// // api/lead.js

// const AFID = '568579';
// const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
// const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
// const BUFFER_SECONDS = 120;
// const MAX_CONCURRENCY = 3;
// const MAX_PER_DAY = 10;

// let dailyCount = 0;
// let currentDay = getPstDayString();
// const recentPhoneBuffer = new Map();
// const concurrencyQueue = [];
// let activeCount = 0;

// const VALID_JOB_TYPES = [
//   'tub to shower conversion',
//   'new bathtub',
//   'new shower'
// ];

// function getPstDayString() {
//   try {
//     const now = new Date();
//     const options = { timeZone: 'America/Los_Angeles' };
//     const formatter = new Intl.DateTimeFormat('en-CA', {
//       ...options,
//       year: 'numeric',
//       month: '2-digit',
//       day: '2-digit'
//     });
//     const parts = formatter.formatToParts(now);
//     const y = parts.find(p => p.type === 'year').value;
//     const m = parts.find(p => p.type === 'month').value;
//     const d = parts.find(p => p.type === 'day').value;
//     return `${y}-${m}-${d}`;
//   } catch (err) {
//     const fallback = new Date(Date.now() - 7 * 60 * 60 * 1000);
//     return fallback.toISOString().slice(0, 10);
//   }
// }

// function acquireSlot() {
//   return new Promise((resolve) => {
//     const tryAcquire = () => {
//       if (activeCount < MAX_CONCURRENCY) {
//         activeCount += 1;
//         resolve();
//       } else {
//         concurrencyQueue.push(tryAcquire);
//       }
//     };
//     tryAcquire();
//   });
// }

// function releaseSlot() {
//   activeCount = Math.max(0, activeCount - 1);
//   if (concurrencyQueue.length) {
//     const next = concurrencyQueue.shift();
//     next();
//   }
// }

// function normalizePhone(p) {
//   return (p || '').replace(/\D/g, '');
// }

// export default async function handler(req, res) {
//   try {
//     // reset daily count if PST day changed
//     const today = getPstDayString();
//     if (today !== currentDay) {
//       currentDay = today;
//       dailyCount = 0;
//     }

//     if (req.method !== 'POST') {
//       res.status(405).json({ error: 'Only POST allowed' });
//       return;
//     }

//     let lead;
//     try {
//       lead = await parseJson(req);
//     } catch (e) {
//       res.status(400).json({ error: 'Invalid JSON body', details: e.message });
//       return;
//     }

//     // required fields
//     const required = ['FirstName', 'LastName', 'Phone', 'Address', 'City', 'State', 'Zip', 'jobType', 'spaceType', 'propertyType', 'occupancy'];
//     const missing = required.filter(f => !lead[f]);
//     if (missing.length) {
//       res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
//       return;
//     }

//     // qualifications
//     if (lead.spaceType.toLowerCase() !== 'wet') {
//       res.status(400).json({ error: 'Qualification failed: spaceType must be "wet"' });
//       return;
//     }
//     if (!VALID_JOB_TYPES.includes(lead.jobType.toLowerCase())) {
//       res.status(400).json({ error: `Qualification failed: jobType must be one of ${VALID_JOB_TYPES.join(', ')}` });
//       return;
//     }
//     if (lead.propertyType.toLowerCase().includes('mobile')) {
//       res.status(400).json({ error: 'Qualification failed: mobile homes are not allowed' });
//       return;
//     }
//     if (['renter', 'renters'].includes(lead.occupancy.toLowerCase())) {
//       res.status(400).json({ error: 'Qualification failed: renters are not allowed' });
//       return;
//     }

//     // buffer dedupe
//     const nowTs = Date.now();
//     const phoneKey = normalizePhone(lead.Phone);
//     if (recentPhoneBuffer.has(phoneKey)) {
//       const lastTs = recentPhoneBuffer.get(phoneKey);
//       if (nowTs - lastTs < BUFFER_SECONDS * 1000) {
//         const wait = Math.ceil((BUFFER_SECONDS * 1000 - (nowTs - lastTs)) / 1000);
//         res.status(429).json({ error: `Duplicate lead: wait ${wait}s before retrying for this phone` });
//         return;
//       }
//     }

//     // daily limit
//     if (dailyCount >= MAX_PER_DAY) {
//       res.status(429).json({ error: 'Daily maximum leads reached' });
//       return;
//     }

//     // concurrency slot
//     await acquireSlot();

//     // register buffer and schedule cleanup
//     recentPhoneBuffer.set(phoneKey, nowTs);
//     setTimeout(() => {
//       const stored = recentPhoneBuffer.get(phoneKey);
//       if (stored && Date.now() - stored >= BUFFER_SECONDS * 1000) {
//         recentPhoneBuffer.delete(phoneKey);
//       }
//     }, BUFFER_SECONDS * 1000 + 1000);

//     // build post form
//     const form = new URLSearchParams();
//     form.append('AFID', AFID);
//     if (lead.SID) form.append('SID', lead.SID);
//     if (lead.ADID) form.append('ADID', lead.ADID);
//     if (lead.ClickID) form.append('ClickID', lead.ClickID);
//     if (lead.AffiliateReferenceID) form.append('AffiliateReferenceID', lead.AffiliateReferenceID);
//     form.append('FirstName', lead.FirstName);
//     form.append('LastName', lead.LastName);
//     form.append('Phone', lead.Phone);
//     if (lead.Email) form.append('Email', lead.Email);
//     form.append('Address', lead.Address);
//     form.append('City', lead.City);
//     form.append('State', lead.State);
//     form.append('Zip', lead.Zip);
//     if (lead.SquareFootage) form.append('SquareFootage', lead.SquareFootage);
//     if (lead.RoofType) form.append('RoofType', lead.RoofType);

//     // choose simple vs secure
//     const postType = (lead.postType || 'simple').toLowerCase();
//     let postUrl = SIMPLE_POST_URL;
//     if (postType === 'secure') postUrl = SECURE_POST_URL;

//     let postResponse = null;
//     let attempt = 0;
//     while (attempt < 2) {
//       try {
//         attempt++;
//         const fetchRes = await fetch(postUrl, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//           body: form.toString()
//         });
//         const text = await fetchRes.text();
//         postResponse = { status: fetchRes.status, data: text };
//         break;
//       } catch (err) {
//         if (attempt >= 2) throw err;
//         await delay(300 * attempt);
//       }
//     }

//     dailyCount += 1;

//     res.status(200).json({
//       message: 'Lead posted successfully',
//       postType,
//       dailyCount,
//       postResponse
//     });
//   } catch (err) {
//     console.error('Lead handler error:', err);
//     res.status(500).json({ error: 'Internal error', details: err?.message || String(err) });
//   } finally {
//     releaseSlot();
//   }
// }

// function parseJson(req) {
//   return new Promise((resolve, reject) => {
//     let body = '';
//     req.on('data', c => {
//       body += c.toString();
//       if (body.length > 1e6) {
//         reject(new Error('Payload too large'));
//         req.destroy();
//       }
//     });
//     req.on('end', () => {
//       try {
//         resolve(JSON.parse(body || '{}'));
//       } catch (e) {
//         reject(e);
//       }
//     });
//     req.on('error', reject);
//   });
// }

// function delay(ms) {
//   return new Promise(r => setTimeout(r, ms));
// }

// api/bath-leads.js
const AFID = '568579';
const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
const BUFFER_SECONDS = 120;
const MAX_CONCURRENCY = 3;
const MAX_PER_DAY = 10;
const DID = '3808880109';

// In-memory state (for serverless environment - consider persistent storage for production)
let dailyCount = 0;
let currentDay = getPstDayString();
const recentPhoneBuffer = new Map();
const concurrencyQueue = [];
let activeCount = 0;

// Valid job types (case-insensitive)
const VALID_JOB_TYPES = new Set([
  'tub to shower conversion',
  'new bathtub',
  'new shower'
]);

// PST time validation
const OPERATING_HOURS = {
  weekday: { start: 6, end: 17 }, // 6am-5pm PST (17 = 5pm)
  saturday: { start: 6, end: 14 }, // 6am-2pm PST
  sunday: null // closed
};

// Helper functions
function getPstDayString() {
  try {
    const now = new Date();
    const options = { timeZone: 'America/Los_Angeles' };
    const formatter = new Intl.DateTimeFormat('en-CA', {
      ...options,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(now);
    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value;
    const d = parts.find(p => p.type === 'day').value;
    return `${y}-${m}-${d}`;
  } catch (err) {
    // Fallback if Intl fails
    const fallback = new Date(Date.now() - 7 * 60 * 60 * 1000);
    return fallback.toISOString().slice(0, 10);
  }
}

function isWithinOperatingHours() {
  try {
    const now = new Date();
    const options = { 
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      hour12: false,
      weekday: 'long'
    };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);
    
    const hour = parseInt(parts.find(p => p.type === 'hour').value);
    const weekday = parts.find(p => p.type === 'weekday').value.toLowerCase();
    
    if (weekday === 'sunday') return false;
    
    const hoursConfig = weekday === 'saturday' 
      ? OPERATING_HOURS.saturday 
      : OPERATING_HOURS.weekday;
    
    return hour >= hoursConfig.start && hour < hoursConfig.end;
  } catch (err) {
    console.error('Error checking operating hours:', err);
    return true; // Fail open if we can't determine time
  }
}

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

function validateGeo(zip) {
  // In a real implementation, you would validate against the Google Sheet
  // For now, we'll assume all geos in the sheet are valid
  return true;
}

// Concurrency control
async function acquireSlot() {
  return new Promise((resolve) => {
    const tryAcquire = () => {
      if (activeCount < MAX_CONCURRENCY) {
        activeCount += 1;
        resolve();
      } else {
        concurrencyQueue.push(tryAcquire);
      }
    };
    tryAcquire();
  });
}

function releaseSlot() {
  activeCount = Math.max(0, activeCount - 1);
  if (concurrencyQueue.length) {
    const next = concurrencyQueue.shift();
    next();
  }
}

// Main handler
export default async function handler(req, res) {
  // Set response headers  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  try {
    // Check operating hours first
    if (!isWithinOperatingHours()) {
      res.status(403).json({ 
        error: 'Service unavailable outside operating hours (M-F 6am-5pm PST, Sat 6am-2pm PST)' 
      });
      return;
    }

    // Reset daily counter if PST day changed
    const today = getPstDayString();
    if (today !== currentDay) {
      currentDay = today;
      dailyCount = 0;
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ 
        error: 'Method not allowed',
        allowedMethods: ['POST']
      });
      return;
    }

    // Parse JSON body
    let lead;
    try {
      lead = await parseJson(req);
    } catch (e) {
      res.status(400).json({ 
        error: 'Invalid JSON body', 
        details: e.message 
      });
      return;
    }

    // Validate required fields
    const requiredFields = [
      'FirstName', 'LastName', 'Phone', 
      'Address', 'City', 'State', 'Zip',
      'jobType', 'spaceType', 'propertyType', 'occupancy'
    ];
    
    const missingFields = requiredFields.filter(f => !lead[f]);
    if (missingFields.length) {
      res.status(400).json({ 
        error: 'Missing required fields',
        missingFields
      });
      return;
    }

    // Validate qualifications
    const validationErrors = [];
    
    if (lead.spaceType.toLowerCase() !== 'wet') {
      validationErrors.push('spaceType must be "wet"');
    }
    
    if (!VALID_JOB_TYPES.has(lead.jobType.toLowerCase())) {
      validationErrors.push(`jobType must be one of: ${Array.from(VALID_JOB_TYPES).join(', ')}`);
    }
    
    if (lead.propertyType.toLowerCase().includes('mobile')) {
      validationErrors.push('Mobile homes are not allowed');
    }
    
    if (['renter', 'renters'].includes(lead.occupancy.toLowerCase())) {
      validationErrors.push('Renters are not allowed');
    }
    
    if (!validateGeo(lead.Zip)) {
      validationErrors.push('Invalid geographic location');
    }
    
    if (validationErrors.length) {
      res.status(400).json({
        error: 'Qualification failed',
        details: validationErrors
      });
      return;
    }

    // Check buffer for duplicate leads
    const nowTs = Date.now();
    const phoneKey = normalizePhone(lead.Phone);
    
    if (recentPhoneBuffer.has(phoneKey)) {
      const lastTs = recentPhoneBuffer.get(phoneKey);
      if (nowTs - lastTs < BUFFER_SECONDS * 1000) {
        const waitSec = Math.ceil((BUFFER_SECONDS * 1000 - (nowTs - lastTs)) / 1000);
        res.status(429).json({ 
          error: 'Duplicate lead detected',
          details: `Wait ${waitSec} seconds before retrying this phone number`
        });
        return;
      }
    }

    // Check daily limit
    if (dailyCount >= MAX_PER_DAY) {
      res.status(429).json({ 
        error: 'Daily lead limit reached',
        details: `Maximum ${MAX_PER_DAY} leads per day`
      });
      return;
    }

    // Acquire concurrency slot
    await acquireSlot();

    // Register in buffer with cleanup
    recentPhoneBuffer.set(phoneKey, nowTs);
    setTimeout(() => {
      const stored = recentPhoneBuffer.get(phoneKey);
      if (stored && Date.now() - stored >= BUFFER_SECONDS * 1000) {
        recentPhoneBuffer.delete(phoneKey);
      }
    }, BUFFER_SECONDS * 1000 + 1000);

    // Prepare form data
    const form = new URLSearchParams();
    form.append('AFID', AFID);
    if (lead.SID) form.append('SID', lead.SID);
    if (lead.ADID) form.append('ADID', lead.ADID);
    if (lead.ClickID) form.append('ClickID', lead.ClickID);
    if (lead.AffiliateReferenceID) form.append('AffiliateReferenceID', lead.AffiliateReferenceID);
    form.append('FirstName', lead.FirstName);
    form.append('LastName', lead.LastName);
    form.append('Phone', lead.Phone);
    if (lead.Email) form.append('Email', lead.Email);
    form.append('Address', lead.Address);
    form.append('City', lead.City);
    form.append('State', lead.State);
    form.append('Zip', lead.Zip);
    if (lead.SquareFootage) form.append('SquareFootage', lead.SquareFootage);
    if (lead.RoofType) form.append('RoofType', lead.RoofType);
    
    // Add DID if required
    form.append('DID', DID);

    // Determine post type (default to simple)
    const postType = (lead.postType || 'simple').toLowerCase();
    const postUrl = postType === 'secure' ? SECURE_POST_URL : SIMPLE_POST_URL;

    // Post with retry
    let postResponse = null;
    let attempt = 0;
    const maxAttempts = 2;
    
    while (attempt < maxAttempts) {
      try {
        attempt++;
        const fetchRes = await fetch(postUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: form.toString(),
          timeout: 10000 // 10 second timeout
        });
        
        const text = await fetchRes.text();
        postResponse = {
          status: fetchRes.status,
          statusText: fetchRes.statusText,
          data: text
        };
        
        // Count successful posts
        if (fetchRes.ok) {
          dailyCount += 1;
        }
        
        break;
      } catch (err) {
        if (attempt >= maxAttempts) {
          throw err;
        }
        await delay(300 * attempt);
      }
    }

    // Successful response
    res.status(200).json({
      success: true,
      message: 'Lead processed successfully',
      postType,
      dailyCount,
      postResponse,
      bufferSize: recentPhoneBuffer.size,
      activeConnections: activeCount
    });

  } catch (err) {
    console.error('Lead processing error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'Please contact support'
    });
  } finally {
    releaseSlot();
  }
}

// Utility functions
function parseJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}