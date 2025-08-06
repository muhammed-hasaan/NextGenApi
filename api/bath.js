// // // // // // // api/bath.js

// // // // // // const AFID = '568579';
// // // // // // const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
// // // // // // const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
// // // // // // const BUFFER_SECONDS = 120;
// // // // // // const MAX_CONCURRENCY = 3;
// // // // // // const MAX_PER_DAY = 10;

// // // // // // // In-memory state (ephemeral — resets on cold start)
// // // // // // let dailyCount = 0;
// // // // // // let currentDay = getPstDayString(); // "YYYY-MM-DD"
// // // // // // const recentPhoneBuffer = new Map(); // normalizedPhone -> timestamp(ms)
// // // // // // const concurrencyQueue = [];
// // // // // // let activeCount = 0;

// // // // // // // Allowed job types (case-insensitive)
// // // // // // const VALID_JOB_TYPES = [
// // // // // //   'tub to shower conversion',
// // // // // //   'new bathtub',
// // // // // //   'new shower'
// // // // // // ];

// // // // // // // Helper for PST day string
// // // // // // function getPstDayString() {
// // // // // //   // offset for America/Los_Angeles manually since we avoid deps
// // // // // //   const now = new Date();
// // // // // //   // convert to UTC ms, then apply PST offset (UTC-7 or UTC-8 depending DST)
// // // // // //   // Simplify: use Intl to get timezone offset dynamically
// // // // // //   try {
// // // // // //     const options = { timeZone: 'America/Los_Angeles' };
// // // // // //     const formatter = new Intl.DateTimeFormat('en-CA', {
// // // // // //       ...options,
// // // // // //       year: 'numeric',
// // // // // //       month: '2-digit',
// // // // // //       day: '2-digit'
// // // // // //     });
// // // // // //     const parts = formatter.formatToParts(now);
// // // // // //     const y = parts.find(p => p.type === 'year').value;
// // // // // //     const m = parts.find(p => p.type === 'month').value;
// // // // // //     const d = parts.find(p => p.type === 'day').value;
// // // // // //     return `${y}-${m}-${d}`;
// // // // // //   } catch (e) {
// // // // // //     // fallback naive: subtract 7 hours
// // // // // //     const fallback = new Date(now.getTime() - 7 * 60 * 60 * 1000);
// // // // // //     return fallback.toISOString().slice(0, 10);
// // // // // //   }
// // // // // // }

// // // // // // // Simple semaphore acquire/release
// // // // // // function acquireSlot() {
// // // // // //   return new Promise((resolve) => {
// // // // // //     const tryAcquire = () => {
// // // // // //       if (activeCount < MAX_CONCURRENCY) {
// // // // // //         activeCount += 1;
// // // // // //         resolve();
// // // // // //       } else {
// // // // // //         concurrencyQueue.push(tryAcquire);
// // // // // //       }
// // // // // //     };
// // // // // //     tryAcquire();
// // // // // //   });
// // // // // // }

// // // // // // function releaseSlot() {
// // // // // //   activeCount = Math.max(0, activeCount - 1);
// // // // // //   if (concurrencyQueue.length) {
// // // // // //     const next = concurrencyQueue.shift();
// // // // // //     next();
// // // // // //   }
// // // // // // }

// // // // // // // Normalize phone to digits only
// // // // // // function normalizePhone(p) {
// // // // // //   return (p || '').replace(/\D/g, '');
// // // // // // }

// // // // // // // Handler
// // // // // // export default async function handler(req, res) {
// // // // // //   // Vercel passes req.method and res as in Node.js
// // // // // //   try {
// // // // // //     // Reset daily counter if PST day changed
// // // // // //     const today = getPstDayString();
// // // // // //     if (today !== currentDay) {
// // // // // //       currentDay = today;
// // // // // //       dailyCount = 0;
// // // // // //     }

// // // // // //     if (req.method !== 'POST') {
// // // // // //       res.status(405).json({ error: 'Only POST allowed' });
// // // // // //       return;
// // // // // //     }

// // // // // //     // Parse JSON body
// // // // // //     let lead;
// // // // // //     try {
// // // // // //       lead = await parseJson(req);
// // // // // //     } catch (e) {
// // // // // //       res.status(400).json({ error: 'Invalid JSON body', details: e.message });
// // // // // //       return;
// // // // // //     }

// // // // // //     // Required fields
// // // // // //     const required = ['FirstName', 'LastName', 'Phone', 'Address', 'City', 'State', 'Zip', 'jobType', 'spaceType', 'propertyType', 'occupancy'];
// // // // // //     const missing = required.filter(f => !lead[f]);
// // // // // //     if (missing.length) {
// // // // // //       res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
// // // // // //       return;
// // // // // //     }

// // // // // //     // Qualifications
// // // // // //     if (lead.spaceType.toLowerCase() !== 'wet') {
// // // // // //       res.status(400).json({ error: 'Qualification failed: spaceType must be "wet"' });
// // // // // //       return;
// // // // // //     }

// // // // // //     if (!VALID_JOB_TYPES.includes(lead.jobType.toLowerCase())) {
// // // // // //       res.status(400).json({ error: `Qualification failed: jobType must be one of ${VALID_JOB_TYPES.join(', ')}` });
// // // // // //       return;
// // // // // //     }

// // // // // //     if (lead.propertyType.toLowerCase().includes('mobile')) {
// // // // // //       res.status(400).json({ error: 'Qualification failed: mobile homes are not allowed' });
// // // // // //       return;
// // // // // //     }

// // // // // //     if (['renter', 'renters'].includes(lead.occupancy.toLowerCase())) {
// // // // // //       res.status(400).json({ error: 'Qualification failed: renters are not allowed' });
// // // // // //       return;
// // // // // //     }

// // // // // //     // Buffer check
// // // // // //     const nowTs = Date.now();
// // // // // //     const phoneKey = normalizePhone(lead.Phone);
// // // // // //     if (recentPhoneBuffer.has(phoneKey)) {
// // // // // //       const lastTs = recentPhoneBuffer.get(phoneKey);
// // // // // //       if (nowTs - lastTs < BUFFER_SECONDS * 1000) {
// // // // // //         const wait = Math.ceil((BUFFER_SECONDS * 1000 - (nowTs - lastTs)) / 1000);
// // // // // //         res.status(429).json({ error: `Duplicate lead: wait ${wait}s before retrying for this phone` });
// // // // // //         return;
// // // // // //       }
// // // // // //     }

// // // // // //     // Daily limit
// // // // // //     if (dailyCount >= MAX_PER_DAY) {
// // // // // //       res.status(429).json({ error: 'Daily maximum leads reached' });
// // // // // //       return;
// // // // // //     }

// // // // // //     // Acquire concurrency slot
// // // // // //     await acquireSlot();

// // // // // //     // Register buffer and schedule cleanup
// // // // // //     recentPhoneBuffer.set(phoneKey, nowTs);
// // // // // //     setTimeout(() => {
// // // // // //       const stored = recentPhoneBuffer.get(phoneKey);
// // // // // //       if (stored && Date.now() - stored >= BUFFER_SECONDS * 1000) {
// // // // // //         recentPhoneBuffer.delete(phoneKey);
// // // // // //       }
// // // // // //     }, BUFFER_SECONDS * 1000 + 1000);

// // // // // //     // Build form payload
// // // // // //     const form = new URLSearchParams();
// // // // // //     form.append('AFID', AFID);
// // // // // //     if (lead.SID) form.append('SID', lead.SID);
// // // // // //     if (lead.ADID) form.append('ADID', lead.ADID);
// // // // // //     if (lead.ClickID) form.append('ClickID', lead.ClickID);
// // // // // //     if (lead.AffiliateReferenceID) form.append('AffiliateReferenceID', lead.AffiliateReferenceID);
// // // // // //     form.append('FirstName', lead.FirstName);
// // // // // //     form.append('LastName', lead.LastName);
// // // // // //     form.append('Phone', lead.Phone);
// // // // // //     if (lead.Email) form.append('Email', lead.Email);
// // // // // //     form.append('Address', lead.Address);
// // // // // //     form.append('City', lead.City);
// // // // // //     form.append('State', lead.State);
// // // // // //     form.append('Zip', lead.Zip);
// // // // // //     if (lead.SquareFootage) form.append('SquareFootage', lead.SquareFootage);
// // // // // //     if (lead.RoofType) form.append('RoofType', lead.RoofType);

// // // // // //     const useSecure = !!lead.useSecure;
// // // // // //     const postUrl = useSecure ? SECURE_POST_URL : SIMPLE_POST_URL;

// // // // // //     // POST with one retry
// // // // // //     let postResponse;
// // // // // //     let attempt = 0;
// // // // // //     while (attempt < 2) {
// // // // // //       try {
// // // // // //         attempt++;
// // // // // //         const fetchRes = await fetch(postUrl, {
// // // // // //           method: 'POST',
// // // // // //           headers: {
// // // // // //             'Content-Type': 'application/x-www-form-urlencoded'
// // // // // //           },
// // // // // //           body: form.toString(),
// // // // // //           // timeout not natively supported; Vercel has its own limits
// // // // // //         });
// // // // // //         const text = await fetchRes.text();
// // // // // //         postResponse = {
// // // // // //           status: fetchRes.status,
// // // // // //           data: "Thank you for submitting your request"
// // // // // //         //   data: text
// // // // // //         };
// // // // // //         break;
// // // // // //       } catch (err) {
// // // // // //         if (attempt >= 2) {
// // // // // //           throw err;
// // // // // //         }
// // // // // //         // small delay before retry
// // // // // //         await delay(300 * attempt);
// // // // // //       }
// // // // // //     }

// // // // // //     // Count success
// // // // // //     dailyCount += 1;

// // // // // //     res.status(200).json({
// // // // // //       message: 'Lead posted successfully',
// // // // // //       usedSecurePost: useSecure,
// // // // // //       dailyCount,
// // // // // //       postResponse
// // // // // //     });

// // // // // //   } catch (err) {
// // // // // //     console.error('Lead handler error:', err);
// // // // // //     res.status(500).json({ error: 'Internal error', details: err?.message || String(err) });
// // // // // //   } finally {
// // // // // //     releaseSlot();
// // // // // //   }
// // // // // // }

// // // // // // // Minimal JSON body parser for Vercel raw req
// // // // // // function parseJson(req) {
// // // // // //   return new Promise((resolve, reject) => {
// // // // // //     let body = '';
// // // // // //     req.on('data', chunk => {
// // // // // //       body += chunk.toString();
// // // // // //       if (body.length > 1e6) {
// // // // // //         reject(new Error('Payload too large'));
// // // // // //         req.destroy();
// // // // // //       }
// // // // // //     });
// // // // // //     req.on('end', () => {
// // // // // //       try {
// // // // // //         const parsed = JSON.parse(body || '{}');
// // // // // //         resolve(parsed);
// // // // // //       } catch (e) {
// // // // // //         reject(e);
// // // // // //       }
// // // // // //     });
// // // // // //     req.on('error', reject);
// // // // // //   });
// // // // // // }

// // // // // // function delay(ms) {
// // // // // //   return new Promise(r => setTimeout(r, ms));
// // // // // // }

// // // // // // api/lead.js

// // // // // const AFID = '568579';
// // // // // const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
// // // // // const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
// // // // // const BUFFER_SECONDS = 120;
// // // // // const MAX_CONCURRENCY = 3;
// // // // // const MAX_PER_DAY = 10;

// // // // // // In-memory state (ephemeral — resets on cold start)
// // // // // let dailyCount = 0;
// // // // // let currentDay = getPstDayString(); // "YYYY-MM-DD"
// // // // // const recentPhoneBuffer = new Map(); // normalizedPhone -> timestamp(ms)
// // // // // const concurrencyQueue = [];
// // // // // let activeCount = 0;

// // // // // // Allowed job types (case-insensitive)
// // // // // const VALID_JOB_TYPES = [
// // // // //   'tub to shower conversion',
// // // // //   'new bathtub',
// // // // //   'new shower'
// // // // // ];

// // // // // function getPstDayString() {
// // // // //   try {
// // // // //     const now = new Date();
// // // // //     const options = { timeZone: 'America/Los_Angeles' };
// // // // //     const f = new Intl.DateTimeFormat('en-CA', {
// // // // //       ...options,
// // // // //       year: 'numeric',
// // // // //       month: '2-digit',
// // // // //       day: '2-digit'
// // // // //     });
// // // // //     const parts = f.formatToParts(now);
// // // // //     const y = parts.find(p => p.type === 'year').value;
// // // // //     const m = parts.find(p => p.type === 'month').value;
// // // // //     const d = parts.find(p => p.type === 'day').value;
// // // // //     return `${y}-${m}-${d}`;
// // // // //   } catch (e) {
// // // // //     const fallback = new Date(Date.now() - 7 * 60 * 60 * 1000);
// // // // //     return fallback.toISOString().slice(0, 10);
// // // // //   }
// // // // // }

// // // // // // Simple semaphore
// // // // // function acquireSlot() {
// // // // //   return new Promise((resolve) => {
// // // // //     const tryAcquire = () => {
// // // // //       if (activeCount < MAX_CONCURRENCY) {
// // // // //         activeCount += 1;
// // // // //         resolve();
// // // // //       } else {
// // // // //         concurrencyQueue.push(tryAcquire);
// // // // //       }
// // // // //     };
// // // // //     tryAcquire();
// // // // //   });
// // // // // }

// // // // // function releaseSlot() {
// // // // //   activeCount = Math.max(0, activeCount - 1);
// // // // //   if (concurrencyQueue.length) {
// // // // //     const next = concurrencyQueue.shift();
// // // // //     next();
// // // // //   }
// // // // // }

// // // // // function normalizePhone(p) {
// // // // //   return (p || '').replace(/\D/g, '');
// // // // // }

// // // // // export default async function handler(req, res) {
// // // // //   try {
// // // // //     // daily reset (PST)
// // // // //     const today = getPstDayString();
// // // // //     if (today !== currentDay) {
// // // // //       currentDay = today;
// // // // //       dailyCount = 0;
// // // // //     }

// // // // //     if (req.method !== 'POST') {
// // // // //       res.status(405).json({ error: 'Only POST allowed' });
// // // // //       return;
// // // // //     }

// // // // //     let lead;
// // // // //     try {
// // // // //       lead = await parseJson(req);
// // // // //     } catch (e) {
// // // // //       res.status(400).json({ error: 'Invalid JSON body', details: e.message });
// // // // //       return;
// // // // //     }

// // // // //     // Required
// // // // //     const required = ['FirstName', 'LastName', 'Phone', 'Address', 'City', 'State', 'Zip', 'jobType', 'spaceType', 'propertyType', 'occupancy'];
// // // // //     const missing = required.filter(f => !lead[f]);
// // // // //     if (missing.length) {
// // // // //       res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
// // // // //       return;
// // // // //     }

// // // // //     // Qualifications
// // // // //     if (lead.spaceType.toLowerCase() !== 'wet') {
// // // // //       res.status(400).json({ error: 'Qualification failed: spaceType must be "wet"' });
// // // // //       return;
// // // // //     }

// // // // //     if (!VALID_JOB_TYPES.includes(lead.jobType.toLowerCase())) {
// // // // //       res.status(400).json({ error: `Qualification failed: jobType must be one of ${VALID_JOB_TYPES.join(', ')}` });
// // // // //       return;
// // // // //     }

// // // // //     if (lead.propertyType.toLowerCase().includes('mobile')) {
// // // // //       res.status(400).json({ error: 'Qualification failed: mobile homes are not allowed' });
// // // // //       return;
// // // // //     }

// // // // //     if (['renter', 'renters'].includes(lead.occupancy.toLowerCase())) {
// // // // //       res.status(400).json({ error: 'Qualification failed: renters are not allowed' });
// // // // //       return;
// // // // //     }

// // // // //     // Buffer
// // // // //     const nowTs = Date.now();
// // // // //     const phoneKey = normalizePhone(lead.Phone);
// // // // //     if (recentPhoneBuffer.has(phoneKey)) {
// // // // //       const lastTs = recentPhoneBuffer.get(phoneKey);
// // // // //       if (nowTs - lastTs < BUFFER_SECONDS * 1000) {
// // // // //         const wait = Math.ceil((BUFFER_SECONDS * 1000 - (nowTs - lastTs)) / 1000);
// // // // //         res.status(429).json({ error: `Duplicate lead: wait ${wait}s before retrying for this phone` });
// // // // //         return;
// // // // //       }
// // // // //     }

// // // // //     // Daily limit
// // // // //     if (dailyCount >= MAX_PER_DAY) {
// // // // //       res.status(429).json({ error: 'Daily maximum leads reached' });
// // // // //       return;
// // // // //     }

// // // // //     // Acquire slot
// // // // //     await acquireSlot();

// // // // //     // Register buffer cleanup
// // // // //     recentPhoneBuffer.set(phoneKey, nowTs);
// // // // //     setTimeout(() => {
// // // // //       const stored = recentPhoneBuffer.get(phoneKey);
// // // // //       if (stored && Date.now() - stored >= BUFFER_SECONDS * 1000) {
// // // // //         recentPhoneBuffer.delete(phoneKey);
// // // // //       }
// // // // //     }, BUFFER_SECONDS * 1000 + 1000);

// // // // //     // Build form data
// // // // //     const form = new URLSearchParams();
// // // // //     form.append('AFID', AFID);
// // // // //     if (lead.SID) form.append('SID', lead.SID);
// // // // //     if (lead.ADID) form.append('ADID', lead.ADID);
// // // // //     if (lead.ClickID) form.append('ClickID', lead.ClickID);
// // // // //     if (lead.AffiliateReferenceID) form.append('AffiliateReferenceID', lead.AffiliateReferenceID);
// // // // //     form.append('FirstName', lead.FirstName);
// // // // //     form.append('LastName', lead.LastName);
// // // // //     form.append('Phone', lead.Phone);
// // // // //     if (lead.Email) form.append('Email', lead.Email);
// // // // //     form.append('Address', lead.Address);
// // // // //     form.append('City', lead.City);
// // // // //     form.append('State', lead.State);
// // // // //     form.append('Zip', lead.Zip);
// // // // //     if (lead.SquareFootage) form.append('SquareFootage', lead.SquareFootage);
// // // // //     if (lead.RoofType) form.append('RoofType', lead.RoofType);

// // // // //     // Decide post type: lead.postType should be 'simple' or 'secure'; fallback to simple
// // // // //     const postType = (lead.postType || 'simple').toLowerCase();
// // // // //     let postUrl = SIMPLE_POST_URL;
// // // // //     if (postType === 'secure') postUrl = SECURE_POST_URL;

// // // // //     // POST with one retry
// // // // //     let postResponse = null;
// // // // //     let attempt = 0;
// // // // //     while (attempt < 2) {
// // // // //       try {
// // // // //         attempt++;
// // // // //         const fetchRes = await fetch(postUrl, {
// // // // //           method: 'POST',
// // // // //           headers: {
// // // // //             'Content-Type': 'application/x-www-form-urlencoded'
// // // // //           },
// // // // //           body: form.toString()
// // // // //         });
// // // // //         const text = await fetchRes.text();
// // // // //         postResponse = {
// // // // //           status: fetchRes.status,
// // // // //           data: text
// // // // //         };
// // // // //         break;
// // // // //       } catch (err) {
// // // // //         if (attempt >= 2) {
// // // // //           throw err;
// // // // //         }
// // // // //         await delay(300 * attempt);
// // // // //       }
// // // // //     }

// // // // //     dailyCount += 1;

// // // // //     res.status(200).json({
// // // // //       message: 'Lead posted successfully',
// // // // //       postType,
// // // // //       dailyCount,
// // // // //       postResponse
// // // // //     });
// // // // //   } catch (err) {
// // // // //     console.error('Lead handler error:', err);
// // // // //     res.status(500).json({ error: 'Internal error', details: err?.message || String(err) });
// // // // //   } finally {
// // // // //     releaseSlot();
// // // // //   }
// // // // // }

// // // // // function parseJson(req) {
// // // // //   return new Promise((resolve, reject) => {
// // // // //     let body = '';
// // // // //     req.on('data', chunk => {
// // // // //       body += chunk.toString();
// // // // //       if (body.length > 1e6) {
// // // // //         reject(new Error('Payload too large'));
// // // // //         req.destroy();
// // // // //       }
// // // // //     });
// // // // //     req.on('end', () => {
// // // // //       try {
// // // // //         resolve(JSON.parse(body || '{}'));
// // // // //       } catch (e) {
// // // // //         reject(e);
// // // // //       }
// // // // //     });
// // // // //     req.on('error', reject);
// // // // //   });
// // // // // }

// // // // // function delay(ms) {
// // // // //   return new Promise(r => setTimeout(r, ms));
// // // // // }

// // // // // api/lead.js

// // // // const AFID = '568579';
// // // // const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
// // // // const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
// // // // const BUFFER_SECONDS = 120;
// // // // const MAX_CONCURRENCY = 3;
// // // // const MAX_PER_DAY = 10;

// // // // let dailyCount = 0;
// // // // let currentDay = getPstDayString();
// // // // const recentPhoneBuffer = new Map();
// // // // const concurrencyQueue = [];
// // // // let activeCount = 0;

// // // // const VALID_JOB_TYPES = [
// // // //   'tub to shower conversion',
// // // //   'new bathtub',
// // // //   'new shower'
// // // // ];

// // // // function getPstDayString() {
// // // //   try {
// // // //     const now = new Date();
// // // //     const options = { timeZone: 'America/Los_Angeles' };
// // // //     const formatter = new Intl.DateTimeFormat('en-CA', {
// // // //       ...options,
// // // //       year: 'numeric',
// // // //       month: '2-digit',
// // // //       day: '2-digit'
// // // //     });
// // // //     const parts = formatter.formatToParts(now);
// // // //     const y = parts.find(p => p.type === 'year').value;
// // // //     const m = parts.find(p => p.type === 'month').value;
// // // //     const d = parts.find(p => p.type === 'day').value;
// // // //     return `${y}-${m}-${d}`;
// // // //   } catch (err) {
// // // //     const fallback = new Date(Date.now() - 7 * 60 * 60 * 1000);
// // // //     return fallback.toISOString().slice(0, 10);
// // // //   }
// // // // }

// // // // function acquireSlot() {
// // // //   return new Promise((resolve) => {
// // // //     const tryAcquire = () => {
// // // //       if (activeCount < MAX_CONCURRENCY) {
// // // //         activeCount += 1;
// // // //         resolve();
// // // //       } else {
// // // //         concurrencyQueue.push(tryAcquire);
// // // //       }
// // // //     };
// // // //     tryAcquire();
// // // //   });
// // // // }

// // // // function releaseSlot() {
// // // //   activeCount = Math.max(0, activeCount - 1);
// // // //   if (concurrencyQueue.length) {
// // // //     const next = concurrencyQueue.shift();
// // // //     next();
// // // //   }
// // // // }

// // // // function normalizePhone(p) {
// // // //   return (p || '').replace(/\D/g, '');
// // // // }

// // // // export default async function handler(req, res) {
// // // //   try {
// // // //     // reset daily count if PST day changed
// // // //     const today = getPstDayString();
// // // //     if (today !== currentDay) {
// // // //       currentDay = today;
// // // //       dailyCount = 0;
// // // //     }

// // // //     if (req.method !== 'POST') {
// // // //       res.status(405).json({ error: 'Only POST allowed' });
// // // //       return;
// // // //     }

// // // //     let lead;
// // // //     try {
// // // //       lead = await parseJson(req);
// // // //     } catch (e) {
// // // //       res.status(400).json({ error: 'Invalid JSON body', details: e.message });
// // // //       return;
// // // //     }

// // // //     // required fields
// // // //     const required = ['FirstName', 'LastName', 'Phone', 'Address', 'City', 'State', 'Zip', 'jobType', 'spaceType', 'propertyType', 'occupancy'];
// // // //     const missing = required.filter(f => !lead[f]);
// // // //     if (missing.length) {
// // // //       res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
// // // //       return;
// // // //     }

// // // //     // qualifications
// // // //     if (lead.spaceType.toLowerCase() !== 'wet') {
// // // //       res.status(400).json({ error: 'Qualification failed: spaceType must be "wet"' });
// // // //       return;
// // // //     }
// // // //     if (!VALID_JOB_TYPES.includes(lead.jobType.toLowerCase())) {
// // // //       res.status(400).json({ error: `Qualification failed: jobType must be one of ${VALID_JOB_TYPES.join(', ')}` });
// // // //       return;
// // // //     }
// // // //     if (lead.propertyType.toLowerCase().includes('mobile')) {
// // // //       res.status(400).json({ error: 'Qualification failed: mobile homes are not allowed' });
// // // //       return;
// // // //     }
// // // //     if (['renter', 'renters'].includes(lead.occupancy.toLowerCase())) {
// // // //       res.status(400).json({ error: 'Qualification failed: renters are not allowed' });
// // // //       return;
// // // //     }

// // // //     // buffer dedupe
// // // //     const nowTs = Date.now();
// // // //     const phoneKey = normalizePhone(lead.Phone);
// // // //     if (recentPhoneBuffer.has(phoneKey)) {
// // // //       const lastTs = recentPhoneBuffer.get(phoneKey);
// // // //       if (nowTs - lastTs < BUFFER_SECONDS * 1000) {
// // // //         const wait = Math.ceil((BUFFER_SECONDS * 1000 - (nowTs - lastTs)) / 1000);
// // // //         res.status(429).json({ error: `Duplicate lead: wait ${wait}s before retrying for this phone` });
// // // //         return;
// // // //       }
// // // //     }

// // // //     // daily limit
// // // //     if (dailyCount >= MAX_PER_DAY) {
// // // //       res.status(429).json({ error: 'Daily maximum leads reached' });
// // // //       return;
// // // //     }

// // // //     // concurrency slot
// // // //     await acquireSlot();

// // // //     // register buffer and schedule cleanup
// // // //     recentPhoneBuffer.set(phoneKey, nowTs);
// // // //     setTimeout(() => {
// // // //       const stored = recentPhoneBuffer.get(phoneKey);
// // // //       if (stored && Date.now() - stored >= BUFFER_SECONDS * 1000) {
// // // //         recentPhoneBuffer.delete(phoneKey);
// // // //       }
// // // //     }, BUFFER_SECONDS * 1000 + 1000);

// // // //     // build post form
// // // //     const form = new URLSearchParams();
// // // //     form.append('AFID', AFID);
// // // //     if (lead.SID) form.append('SID', lead.SID);
// // // //     if (lead.ADID) form.append('ADID', lead.ADID);
// // // //     if (lead.ClickID) form.append('ClickID', lead.ClickID);
// // // //     if (lead.AffiliateReferenceID) form.append('AffiliateReferenceID', lead.AffiliateReferenceID);
// // // //     form.append('FirstName', lead.FirstName);
// // // //     form.append('LastName', lead.LastName);
// // // //     form.append('Phone', lead.Phone);
// // // //     if (lead.Email) form.append('Email', lead.Email);
// // // //     form.append('Address', lead.Address);
// // // //     form.append('City', lead.City);
// // // //     form.append('State', lead.State);
// // // //     form.append('Zip', lead.Zip);
// // // //     if (lead.SquareFootage) form.append('SquareFootage', lead.SquareFootage);
// // // //     if (lead.RoofType) form.append('RoofType', lead.RoofType);

// // // //     // choose simple vs secure
// // // //     const postType = (lead.postType || 'simple').toLowerCase();
// // // //     let postUrl = SIMPLE_POST_URL;
// // // //     if (postType === 'secure') postUrl = SECURE_POST_URL;

// // // //     let postResponse = null;
// // // //     let attempt = 0;
// // // //     while (attempt < 2) {
// // // //       try {
// // // //         attempt++;
// // // //         const fetchRes = await fetch(postUrl, {
// // // //           method: 'POST',
// // // //           headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
// // // //           body: form.toString()
// // // //         });
// // // //         const text = await fetchRes.text();
// // // //         postResponse = { status: fetchRes.status, data: text };
// // // //         break;
// // // //       } catch (err) {
// // // //         if (attempt >= 2) throw err;
// // // //         await delay(300 * attempt);
// // // //       }
// // // //     }

// // // //     dailyCount += 1;

// // // //     res.status(200).json({
// // // //       message: 'Lead posted successfully',
// // // //       postType,
// // // //       dailyCount,
// // // //       postResponse
// // // //     });
// // // //   } catch (err) {
// // // //     console.error('Lead handler error:', err);
// // // //     res.status(500).json({ error: 'Internal error', details: err?.message || String(err) });
// // // //   } finally {
// // // //     releaseSlot();
// // // //   }
// // // // }

// // // // function parseJson(req) {
// // // //   return new Promise((resolve, reject) => {
// // // //     let body = '';
// // // //     req.on('data', c => {
// // // //       body += c.toString();
// // // //       if (body.length > 1e6) {
// // // //         reject(new Error('Payload too large'));
// // // //         req.destroy();
// // // //       }
// // // //     });
// // // //     req.on('end', () => {
// // // //       try {
// // // //         resolve(JSON.parse(body || '{}'));
// // // //       } catch (e) {
// // // //         reject(e);
// // // //       }
// // // //     });
// // // //     req.on('error', reject);
// // // //   });
// // // // }

// // // // function delay(ms) {
// // // //   return new Promise(r => setTimeout(r, ms));
// // // // }

// // // // api/bath-leads.js

// // // const AFID = '568579';
// // // const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
// // // const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
// // // const BUFFER_SECONDS = 120;
// // // const MAX_CONCURRENCY = 3;
// // // const MAX_PER_DAY = 10;
// // // const DID = '3808880109';

// // // // In-memory state (for serverless environment - consider persistent storage for production)
// // // let dailyCount = 0;
// // // let currentDay = getPstDayString();
// // // const recentPhoneBuffer = new Map();
// // // const concurrencyQueue = [];
// // // let activeCount = 0;

// // // // Valid job types (case-insensitive)
// // // const VALID_JOB_TYPES = new Set([
// // //   'tub to shower conversion',
// // //   'new bathtub',
// // //   'new shower'
// // // ]);

// // // // PST time validation
// // // const OPERATING_HOURS = {
// // //   weekday: { start: 6, end: 17 }, // 6am-5pm PST (17 = 5pm)
// // //   saturday: { start: 6, end: 14 }, // 6am-2pm PST
// // //   sunday: null // closed
// // // };

// // // // Helper functions
// // // function getPstDayString() {
// // //   try {
// // //     const now = new Date();
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
// // //   } catch (err) {
// // //     // Fallback if Intl fails
// // //     const fallback = new Date(Date.now() - 7 * 60 * 60 * 1000);
// // //     return fallback.toISOString().slice(0, 10);
// // //   }
// // // }

// // // function isWithinOperatingHours() {
// // //   try {
// // //     const now = new Date();
// // //     const options = { 
// // //       timeZone: 'America/Los_Angeles',
// // //       hour: 'numeric',
// // //       hour12: false,
// // //       weekday: 'long'
// // //     };
// // //     const formatter = new Intl.DateTimeFormat('en-US', options);
// // //     const parts = formatter.formatToParts(now);

// // //     const hour = parseInt(parts.find(p => p.type === 'hour').value);
// // //     const weekday = parts.find(p => p.type === 'weekday').value.toLowerCase();

// // //     if (weekday === 'sunday') return false;

// // //     const hoursConfig = weekday === 'saturday' 
// // //       ? OPERATING_HOURS.saturday 
// // //       : OPERATING_HOURS.weekday;

// // //     return hour >= hoursConfig.start && hour < hoursConfig.end;
// // //   } catch (err) {
// // //     console.error('Error checking operating hours:', err);
// // //     return true; // Fail open if we can't determine time
// // //   }
// // // }

// // // function normalizePhone(phone) {
// // //   return (phone || '').replace(/\D/g, '');
// // // }

// // // function validateGeo(zip) {
// // //   // In a real implementation, you would validate against the Google Sheet
// // //   // For now, we'll assume all geos in the sheet are valid
// // //   return true;
// // // }

// // // // Concurrency control
// // // async function acquireSlot() {
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

// // // // Main handler
// // // export default async function handler(req, res) {
// // //   // Set response headers  res.setHeader('Access-Control-Allow-Origin', '*');
// // //   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
// // //   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
// // //   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

// // //   if (req.method === 'OPTIONS') {
// // //     return res.status(200).end();
// // //   }
// // //   try {
// // //     // Check operating hours first
// // //     if (!isWithinOperatingHours()) {
// // //       res.status(403).json({ 
// // //         error: 'Service unavailable outside operating hours (M-F 6am-5pm PST, Sat 6am-2pm PST)' 
// // //       });
// // //       return;
// // //     }

// // //     // Reset daily counter if PST day changed
// // //     const today = getPstDayString();
// // //     if (today !== currentDay) {
// // //       currentDay = today;
// // //       dailyCount = 0;
// // //     }

// // //     // Only accept POST requests
// // //     if (req.method !== 'POST') {
// // //       res.status(405).json({ 
// // //         error: 'Method not allowed',
// // //         allowedMethods: ['POST']
// // //       });
// // //       return;
// // //     }

// // //     // Parse JSON body
// // //     let lead;
// // //     try {
// // //       lead = await parseJson(req);
// // //     } catch (e) {
// // //       res.status(400).json({ 
// // //         error: 'Invalid JSON body', 
// // //         details: e.message 
// // //       });
// // //       return;
// // //     }

// // //     // Validate required fields
// // //     const requiredFields = [
// // //       'FirstName', 'LastName', 'Phone', 
// // //       'Address', 'City', 'State', 'Zip',
// // //       'jobType', 'spaceType', 'propertyType', 'occupancy'
// // //     ];

// // //     const missingFields = requiredFields.filter(f => !lead[f]);
// // //     if (missingFields.length) {
// // //       res.status(400).json({ 
// // //         error: 'Missing required fields',
// // //         missingFields
// // //       });
// // //       return;
// // //     }

// // //     // Validate qualifications
// // //     const validationErrors = [];

// // //     if (lead.spaceType.toLowerCase() !== 'wet') {
// // //       validationErrors.push('spaceType must be "wet"');
// // //     }

// // //     if (!VALID_JOB_TYPES.has(lead.jobType.toLowerCase())) {
// // //       validationErrors.push(`jobType must be one of: ${Array.from(VALID_JOB_TYPES).join(', ')}`);
// // //     }

// // //     if (lead.propertyType.toLowerCase().includes('mobile')) {
// // //       validationErrors.push('Mobile homes are not allowed');
// // //     }

// // //     if (['renter', 'renters'].includes(lead.occupancy.toLowerCase())) {
// // //       validationErrors.push('Renters are not allowed');
// // //     }

// // //     if (!validateGeo(lead.Zip)) {
// // //       validationErrors.push('Invalid geographic location');
// // //     }

// // //     if (validationErrors.length) {
// // //       res.status(400).json({
// // //         error: 'Qualification failed',
// // //         details: validationErrors
// // //       });
// // //       return;
// // //     }

// // //     // Check buffer for duplicate leads
// // //     const nowTs = Date.now();
// // //     const phoneKey = normalizePhone(lead.Phone);

// // //     if (recentPhoneBuffer.has(phoneKey)) {
// // //       const lastTs = recentPhoneBuffer.get(phoneKey);
// // //       if (nowTs - lastTs < BUFFER_SECONDS * 1000) {
// // //         const waitSec = Math.ceil((BUFFER_SECONDS * 1000 - (nowTs - lastTs)) / 1000);
// // //         res.status(429).json({ 
// // //           error: 'Duplicate lead detected',
// // //           details: `Wait ${waitSec} seconds before retrying this phone number`
// // //         });
// // //         return;
// // //       }
// // //     }

// // //     // Check daily limit
// // //     if (dailyCount >= MAX_PER_DAY) {
// // //       res.status(429).json({ 
// // //         error: 'Daily lead limit reached',
// // //         details: `Maximum ${MAX_PER_DAY} leads per day`
// // //       });
// // //       return;
// // //     }

// // //     // Acquire concurrency slot
// // //     await acquireSlot();

// // //     // Register in buffer with cleanup
// // //     recentPhoneBuffer.set(phoneKey, nowTs);
// // //     setTimeout(() => {
// // //       const stored = recentPhoneBuffer.get(phoneKey);
// // //       if (stored && Date.now() - stored >= BUFFER_SECONDS * 1000) {
// // //         recentPhoneBuffer.delete(phoneKey);
// // //       }
// // //     }, BUFFER_SECONDS * 1000 + 1000);

// // //     // Prepare form data
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

// // //     // Add DID if required
// // //     form.append('DID', DID);

// // //     // Determine post type (default to simple)
// // //     const postType = (lead.postType || 'simple').toLowerCase();
// // //     const postUrl = postType === 'secure' ? SECURE_POST_URL : SIMPLE_POST_URL;

// // //     // Post with retry
// // //     let postResponse = null;
// // //     let attempt = 0;
// // //     const maxAttempts = 2;

// // //     while (attempt < maxAttempts) {
// // //       try {
// // //         attempt++;
// // //         const fetchRes = await fetch(postUrl, {
// // //           method: 'POST',
// // //           headers: {
// // //             'Content-Type': 'application/x-www-form-urlencoded'
// // //           },
// // //           body: form.toString(),
// // //           timeout: 10000 // 10 second timeout
// // //         });

// // //         const text = await fetchRes.text();
// // //         postResponse = {
// // //           status: fetchRes.status,
// // //           statusText: fetchRes.statusText,
// // //           data: text
// // //         };

// // //         // Count successful posts
// // //         if (fetchRes.ok) {
// // //           dailyCount += 1;
// // //         }

// // //         break;
// // //       } catch (err) {
// // //         if (attempt >= maxAttempts) {
// // //           throw err;
// // //         }
// // //         await delay(300 * attempt);
// // //       }
// // //     }

// // //     // Successful response
// // //     res.status(200).json({
// // //       success: true,
// // //       message: 'Lead processed successfully',
// // //       postType,
// // //       dailyCount,
// // //       postResponse,
// // //       bufferSize: recentPhoneBuffer.size,
// // //       activeConnections: activeCount
// // //     });

// // //   } catch (err) {
// // //     console.error('Lead processing error:', err);
// // //     res.status(500).json({
// // //       error: 'Internal server error',
// // //       details: process.env.NODE_ENV === 'development' 
// // //         ? err.message 
// // //         : 'Please contact support'
// // //     });
// // //   } finally {
// // //     releaseSlot();
// // //   }
// // // }

// // // // Utility functions
// // // function parseJson(req) {
// // //   return new Promise((resolve, reject) => {
// // //     let body = '';
// // //     req.on('data', chunk => {
// // //       body += chunk.toString();
// // //       if (body.length > 1e6) { // 1MB limit
// // //         reject(new Error('Payload too large'));
// // //         req.destroy();
// // //       }
// // //     });
// // //     req.on('end', () => {
// // //       try {
// // //         resolve(JSON.parse(body || '{}'));
// // //       } catch (e) {
// // //         reject(e);
// // //       }
// // //     });
// // //     req.on('error', reject);
// // //   });
// // // }

// // // function delay(ms) {
// // //   return new Promise(resolve => setTimeout(resolve, ms));
// // // }


// // const AFID = '568579';
// // const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
// // const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
// // const BUFFER_SECONDS = 120;
// // const MAX_CONCURRENCY = 3;
// // const MAX_PER_DAY = 10;
// // const DID = '3808880109';

// // // In-memory state
// // let dailyCount = 0;
// // let currentDay = getPstDayString();
// // const recentPhoneBuffer = new Map();
// // const concurrencyQueue = [];
// // let activeCount = 0;

// // // Valid job types
// // const VALID_JOB_TYPES = new Set([
// //     'tub to shower conversion',
// //     'new bathtub',
// //     'new shower'
// // ]);

// // // PST time validation
// // const OPERATING_HOURS = {
// //     weekday: { start: 6, end: 17 },
// //     saturday: { start: 6, end: 14 },
// //     sunday: null
// // };

// // // Helper functions
// // function getPstDayString() {
// //     try {
// //         const now = new Date();
// //         const options = { timeZone: 'America/Los_Angeles' };
// //         const formatter = new Intl.DateTimeFormat('en-CA', {
// //             ...options,
// //             year: 'numeric',
// //             month: '2-digit',
// //             day: '2-digit'
// //         });
// //         const parts = formatter.formatToParts(now);
// //         const y = parts.find(p => p.type === 'year').value;
// //         const m = parts.find(p => p.type === 'month').value;
// //         const d = parts.find(p => p.type === 'day').value;
// //         return `${y}-${m}-${d}`;
// //     } catch (err) {
// //         const fallback = new Date(Date.now() - 7 * 60 * 60 * 1000);
// //         return fallback.toISOString().slice(0, 10);
// //     }
// // }

// // function isWithinOperatingHours() {
// //     try {
// //         const now = new Date();
// //         const options = {
// //             timeZone: 'America/Los_Angeles',
// //             hour: 'numeric',
// //             hour12: false,
// //             weekday: 'long'
// //         };
// //         const formatter = new Intl.DateTimeFormat('en-US', options);
// //         const parts = formatter.formatToParts(now);

// //         const hour = parseInt(parts.find(p => p.type === 'hour').value);
// //         const weekday = parts.find(p => p.type === 'weekday').value.toLowerCase();

// //         if (weekday === 'sunday') return false;

// //         const hoursConfig = weekday === 'saturday'
// //             ? OPERATING_HOURS.saturday
// //             : OPERATING_HOURS.weekday;

// //         return hour >= hoursConfig.start && hour < hoursConfig.end;
// //     } catch (err) {
// //         console.error('Error checking operating hours:', err);
// //         return true;
// //     }
// // }

// // function normalizePhone(phone) {
// //     return (phone || '').replace(/\D/g, '');
// // }

// // function validateGeo(zip) {
// //     return true;
// // }

// // // Concurrency control
// // async function acquireSlot() {
// //     return new Promise((resolve) => {
// //         const tryAcquire = () => {
// //             if (activeCount < MAX_CONCURRENCY) {
// //                 activeCount += 1;
// //                 resolve();
// //             } else {
// //                 concurrencyQueue.push(tryAcquire);
// //             }
// //         };
// //         tryAcquire();
// //     });
// // }

// // function releaseSlot() {
// //     activeCount = Math.max(0, activeCount - 1);
// //     if (concurrencyQueue.length) {
// //         const next = concurrencyQueue.shift();
// //         next();
// //     }
// // }

// // // Main handler
// // export default async function handler(req, res) {
// //     // Set CORS headers
// //   res.setHeader('Access-Control-Allow-Origin', '*');
// //   res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
// //   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

// //   // Handle preflight request
// //   if (req.method === 'OPTIONS') {
// //     return res.status(200).end();
// //   }

// //   // Reject non-POST requests
// //   if (req.method !== 'POST') {
// //     return res.status(405).json({ error: 'Method not allowed' });
// //   }



// //     try {
// //         // Check operating hours
// //         if (!isWithinOperatingHours()) {
// //             return res.status(403).json({
// //                 error: 'Service unavailable outside operating hours (M-F 6am-5pm PST, Sat 6am-2pm PST)'
// //             });
// //         }

// //         // Reset daily counter
// //         const today = getPstDayString();
// //         if (today !== currentDay) {
// //             currentDay = today;
// //             dailyCount = 0;
// //         }

// //         // Only accept POST requests
// //         if (req.method !== 'POST') {
// //             return res.status(405).json({
// //                 error: 'Method not allowed',
// //                 allowedMethods: ['POST']
// //             });
// //         }

// //         // Parse JSON body
// //         let lead;
// //         try {
// //             lead = await parseJson(req);
// //         } catch (e) {
// //             return res.status(400).json({
// //                 error: 'Invalid JSON body',
// //                 details: e.message
// //             });
// //         }

// //         // Validate required fields
// //         const requiredFields = [
// //             'FirstName', 'LastName', 'Phone',
// //             'Address', 'City', 'State', 'Zip',
// //             'jobType', 'spaceType', 'propertyType', 'occupancy'
// //         ];

// //         const missingFields = requiredFields.filter(f => !lead[f]);
// //         if (missingFields.length) {
// //             return res.status(400).json({
// //                 error: 'Missing required fields',
// //                 missingFields
// //             });
// //         }

// //         // Validate qualifications
// //         const validationErrors = [];

// //         if (lead.spaceType.toLowerCase() !== 'wet') {
// //             validationErrors.push('spaceType must be "wet"');
// //         }

// //         if (!VALID_JOB_TYPES.has(lead.jobType.toLowerCase())) {
// //             validationErrors.push(`jobType must be one of: ${Array.from(VALID_JOB_TYPES).join(', ')}`);
// //         }

// //         if (lead.propertyType.toLowerCase().includes('mobile')) {
// //             validationErrors.push('Mobile homes are not allowed');
// //         }

// //         if (['renter', 'renters'].includes(lead.occupancy.toLowerCase())) {
// //             validationErrors.push('Renters are not allowed');
// //         }

// //         if (!validateGeo(lead.Zip)) {
// //             validationErrors.push('Invalid geographic location');
// //         }

// //         if (validationErrors.length) {
// //             return res.status(400).json({
// //                 error: 'Qualification failed',
// //                 details: validationErrors
// //             });
// //         }

// //         // Check buffer for duplicates
// //         const nowTs = Date.now();
// //         const phoneKey = normalizePhone(lead.Phone);

// //         if (recentPhoneBuffer.has(phoneKey)) {
// //             const lastTs = recentPhoneBuffer.get(phoneKey);
// //             if (nowTs - lastTs < BUFFER_SECONDS * 1000) {
// //                 const waitSec = Math.ceil((BUFFER_SECONDS * 1000 - (nowTs - lastTs)) / 1000);
// //                 return res.status(429).json({
// //                     error: 'Duplicate lead detected',
// //                     details: `Wait ${waitSec} seconds before retrying this phone number`
// //                 });
// //             }
// //         }

// //         // Check daily limit
// //         if (dailyCount >= MAX_PER_DAY) {
// //             return res.status(429).json({
// //                 error: 'Daily lead limit reached',
// //                 details: `Maximum ${MAX_PER_DAY} leads per day`
// //             });
// //         }

// //         // Acquire concurrency slot
// //         await acquireSlot();

// //         // Register in buffer
// //         recentPhoneBuffer.set(phoneKey, nowTs);
// //         setTimeout(() => {
// //             recentPhoneBuffer.delete(phoneKey);
// //         }, BUFFER_SECONDS * 1000);

// //         // Prepare form data
// //         const form = new URLSearchParams();
// //         form.append('AFID', AFID);
// //         if (lead.SID) form.append('SID', lead.SID);
// //         if (lead.ADID) form.append('ADID', lead.ADID);
// //         if (lead.ClickID) form.append('ClickID', lead.ClickID);
// //         if (lead.AffiliateReferenceID) form.append('AffiliateReferenceID', lead.AffiliateReferenceID);
// //         form.append('FirstName', lead.FirstName);
// //         form.append('LastName', lead.LastName);
// //         form.append('Phone', lead.Phone);
// //         if (lead.Email) form.append('Email', lead.Email);
// //         form.append('Address', lead.Address);
// //         form.append('City', lead.City);
// //         form.append('State', lead.State);
// //         form.append('Zip', lead.Zip);
// //         if (lead.SquareFootage) form.append('SquareFootage', lead.SquareFootage);
// //         if (lead.RoofType) form.append('RoofType', lead.RoofType);
// //         form.append('DID', DID);

// //         // Determine post type
// //         const postType = (lead.postType || 'simple').toLowerCase();
// //         const postUrl = postType === 'secure' ? SECURE_POST_URL : SIMPLE_POST_URL;

// //         // Post with retry
// //         let postResponse = null;
// //         let attempt = 0;

// //         while (attempt < 2) {
// //             try {
// //                 const fetchRes = await fetch(postUrl, {
// //                     method: 'POST',
// //                     headers: {
// //                         'Content-Type': 'application/x-www-form-urlencoded'
// //                     },
// //                     body: form.toString()
// //                 });

// //                 postResponse = {
// //                     status: fetchRes.status,
// //                     statusText: fetchRes.statusText,
// //                     data: await fetchRes.text()
// //                 };

// //                 if (fetchRes.ok) dailyCount += 1;
// //                 break;
// //             } catch (err) {
// //                 if (++attempt >= 2) throw err;
// //                 await delay(300 * attempt);
// //             }
// //         }

// //         // Successful response
// //         res.status(200).json({
// //             success: true,
// //             message: 'Lead processed successfully',
// //             postType,
// //             dailyCount,
// //             postResponse
// //         });

// //     } catch (err) {
// //         console.error('Lead processing error:', err);
// //         res.status(500).json({
// //             error: 'Internal server error',
// //             details: process.env.NODE_ENV === 'development'
// //                 ? err.message
// //                 : 'Please contact support'
// //         });
// //     } finally {
// //         releaseSlot();
// //     }
// // }

// // function parseJson(req) {
// //     return new Promise((resolve, reject) => {
// //         let body = '';
// //         req.on('data', chunk => {
// //             body += chunk.toString();
// //             if (body.length > 1e6) {
// //                 reject(new Error('Payload too large'));
// //                 req.destroy();
// //             }
// //         });
// //         req.on('end', () => {
// //             try {
// //                 resolve(JSON.parse(body || '{}'));
// //             } catch (e) {
// //                 reject(e);
// //             }
// //         });
// //         req.on('error', reject);
// //     });
// // }

// // function delay(ms) {
// //     return new Promise(resolve => setTimeout(resolve, ms));
// // }

// const AFID = '568579';
// const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
// const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
// const BUFFER_SECONDS = 120;
// const MAX_CONCURRENCY = 3;
// const MAX_PER_DAY = 10;
// const DID = '3808880109';

// // In-memory state
// let dailyCount = 0;
// let currentDay = getPstDayString();
// const recentPhoneBuffer = new Map();
// const concurrencyQueue = [];
// let activeCount = 0;

// // Valid job types
// const VALID_JOB_TYPES = new Set([
//     'tub to shower conversion',
//     'new bathtub',
//     'new shower'
// ]);

// // PST time validation
// const OPERATING_HOURS = {
//     weekday: { start: 6, end: 17 },
//     saturday: { start: 6, end: 14 },
//     sunday: null
// };

// // export default async function handler(req, res) {
// //     // ✅ Set CORS headers
// //     res.setHeader('Access-Control-Allow-Origin', '*');
// //     res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
// //     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
// //     // ✅ Handle preflight request
// //     if (req.method === 'OPTIONS') {
// //         return res.status(200).end();
// //     }

// //     // Only accept POST requests
// //     if (req.method !== 'POST') {
// //         return res.status(405).json({ 
// //             error: 'Method not allowed',
// //             allowedMethods: ['POST']
// //         });
// //     }

// //     try {
// //         // Check operating hours
// //         if (!isWithinOperatingHours()) {
// //             return res.status(403).json({
// //                 error: 'Service unavailable outside operating hours (M-F 6am-5pm PST, Sat 6am-2pm PST)'
// //             });
// //         }

// //         // Reset daily counter
// //         const today = getPstDayString();
// //         if (today !== currentDay) {
// //             currentDay = today;
// //             dailyCount = 0;
// //         }

// //         // Parse JSON body
// //         let lead;
// //         try {
// //             lead = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
// //         } catch (e) {
// //             return res.status(400).json({
// //                 error: 'Invalid JSON body',
// //                 details: e.message
// //             });
// //         }

// //         // Validate required fields
// //         const requiredFields = [
// //             'FirstName', 'LastName', 'Phone',
// //             'Address', 'City', 'State', 'Zip',
// //             'jobType', 'spaceType', 'propertyType', 'occupancy'
// //         ];

// //         const missingFields = requiredFields.filter(f => !lead[f]);
// //         if (missingFields.length) {
// //             return res.status(400).json({
// //                 error: 'Missing required fields',
// //                 missingFields
// //             });
// //         }

// //         // Validate qualifications
// //         const validationErrors = [];

// //         if (lead.spaceType.toLowerCase() !== 'wet') {
// //             validationErrors.push('spaceType must be "wet"');
// //         }

// //         if (!VALID_JOB_TYPES.has(lead.jobType.toLowerCase())) {
// //             validationErrors.push(`jobType must be one of: ${Array.from(VALID_JOB_TYPES).join(', ')}`);
// //         }

// //         if (lead.propertyType.toLowerCase().includes('mobile')) {
// //             validationErrors.push('Mobile homes are not allowed');
// //         }

// //         if (['renter', 'renters'].includes(lead.occupancy.toLowerCase())) {
// //             validationErrors.push('Renters are not allowed');
// //         }

// //         if (!validateGeo(lead.Zip)) {
// //             validationErrors.push('Invalid geographic location');
// //         }

// //         if (validationErrors.length) {
// //             return res.status(400).json({
// //                 error: 'Qualification failed',
// //                 details: validationErrors
// //             });
// //         }

// //         // Check buffer for duplicates
// //         const nowTs = Date.now();
// //         const phoneKey = normalizePhone(lead.Phone);

// //         if (recentPhoneBuffer.has(phoneKey)) {
// //             const lastTs = recentPhoneBuffer.get(phoneKey);
// //             if (nowTs - lastTs < BUFFER_SECONDS * 1000) {
// //                 const waitSec = Math.ceil((BUFFER_SECONDS * 1000 - (nowTs - lastTs)) / 1000);
// //                 return res.status(429).json({
// //                     error: 'Duplicate lead detected',
// //                     details: `Wait ${waitSec} seconds before retrying this phone number`
// //                 });
// //             }
// //         }

// //         // Check daily limit
// //         if (dailyCount >= MAX_PER_DAY) {
// //             return res.status(429).json({
// //                 error: 'Daily lead limit reached',
// //                 details: `Maximum ${MAX_PER_DAY} leads per day`
// //             });
// //         }

// //         // Acquire concurrency slot
// //         await acquireSlot();

// //         // Register in buffer
// //         recentPhoneBuffer.set(phoneKey, nowTs);
// //         setTimeout(() => {
// //             recentPhoneBuffer.delete(phoneKey);
// //         }, BUFFER_SECONDS * 1000);

// //         // Prepare form data
// //         const form = new URLSearchParams();
// //         form.append('AFID', AFID);
// //         if (lead.SID) form.append('SID', lead.SID);
// //         if (lead.ADID) form.append('ADID', lead.ADID);
// //         if (lead.ClickID) form.append('ClickID', lead.ClickID);
// //         if (lead.AffiliateReferenceID) form.append('AffiliateReferenceID', lead.AffiliateReferenceID);
// //         form.append('FirstName', lead.FirstName);
// //         form.append('LastName', lead.LastName);
// //         form.append('Phone', lead.Phone);
// //         if (lead.Email) form.append('Email', lead.Email);
// //         form.append('Address', lead.Address);
// //         form.append('City', lead.City);
// //         form.append('State', lead.State);
// //         form.append('Zip', lead.Zip);
// //         if (lead.SquareFootage) form.append('SquareFootage', lead.SquareFootage);
// //         if (lead.RoofType) form.append('RoofType', lead.RoofType);
// //         form.append('DID', DID);

// //         // Determine post type
// //         const postType = (lead.postType || 'simple').toLowerCase();
// //         const postUrl = postType === 'secure' ? SECURE_POST_URL : SIMPLE_POST_URL;

// //         // Post with retry
// //         let postResponse = null;
// //         let attempt = 0;

// //         while (attempt < 2) {
// //             try {
// //                 const fetchRes = await fetch(postUrl, {
// //                     method: 'POST',
// //                     headers: {
// //                         'Content-Type': 'application/x-www-form-urlencoded'
// //                     },
// //                     body: form.toString()
// //                 });

// //                 postResponse = {
// //                     status: fetchRes.status,
// //                     statusText: fetchRes.statusText,
// //                     data: await fetchRes.text()
// //                 };

// //                 if (fetchRes.ok) dailyCount += 1;
// //                 break;
// //             } catch (err) {
// //                 if (++attempt >= 2) throw err;
// //                 await delay(300 * attempt);
// //             }
// //         }

// //         // Successful response
// //         res.status(200).json({
// //             success: true,
// //             message: 'Lead processed successfully',
// //             postType,
// //             dailyCount,
// //             postResponse
// //         });

// //     } catch (err) {
// //         console.error('Lead processing error:', err);
// //         res.status(500).json({
// //             error: 'Internal server error',
// //             details: process.env.NODE_ENV === 'development'
// //                 ? err.message
// //                 : 'Please contact support'
// //         });
// //     } finally {
// //         releaseSlot();
// //     }
// // }

// // Helper functions

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

//     // Only accept POST requests
//     if (req.method !== 'POST') {
//         return res.status(405).json({ 
//             success: false,
//             error: 'Method not allowed',
//             allowedMethods: ['POST']
//         });
//     }

//     try {
//         // Check operating hours
//         if (!isWithinOperatingHours()) {
//             return res.status(403).json({
//                 success: false,
//                 error: 'Service unavailable',
//                 message: 'Service unavailable outside operating hours (M-F 6am-5pm PST, Sat 6am-2pm PST)'
//             });
//         }

//         // Reset daily counter
//         const today = getPstDayString();
//         if (today !== currentDay) {
//             currentDay = today;
//             dailyCount = 0;
//         }

//         // Parse JSON body
//         let lead;
//         try {
//             lead = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
//         } catch (e) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Invalid request body',
//                 message: 'Could not parse JSON body',
//                 details: process.env.NODE_ENV === 'development' ? e.message : undefined
//             });
//         }

//         // Validate required fields
//         const requiredFields = [
//             'FirstName', 'LastName', 'Phone',
//             'Address', 'City', 'State', 'Zip',
//             'jobType', 'spaceType', 'propertyType', 'occupancy'
//         ];

//         const missingFields = requiredFields.filter(f => !lead[f]);
//         if (missingFields.length) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Missing required fields',
//                 missingFields,
//                 message: `Missing: ${missingFields.join(', ')}`
//             });
//         }

//         // Validate qualifications
//         const validationErrors = [];
//         const spaceType = String(lead.spaceType).toLowerCase();
//         const jobType = String(lead.jobType).toLowerCase();
//         const propertyType = String(lead.propertyType).toLowerCase();
//         const occupancy = String(lead.occupancy).toLowerCase();

//         if (spaceType !== 'wet') {
//             validationErrors.push('spaceType must be "wet"');
//         }

//         if (!VALID_JOB_TYPES.has(jobType)) {
//             validationErrors.push(`jobType must be one of: ${Array.from(VALID_JOB_TYPES).join(', ')}`);
//         }

//         if (propertyType.includes('mobile')) {
//             validationErrors.push('Mobile homes are not allowed');
//         }

//         if (['renter', 'renters'].includes(occupancy)) {
//             validationErrors.push('Renters are not allowed');
//         }

//         if (!validateGeo(lead.Zip)) {
//             validationErrors.push('Invalid geographic location');
//         }

//         if (validationErrors.length) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Qualification failed',
//                 message: 'Lead did not meet requirements',
//                 details: validationErrors
//             });
//         }

//         // Check buffer for duplicates
//         const nowTs = Date.now();
//         const phoneKey = normalizePhone(lead.Phone);

//         if (recentPhoneBuffer.has(phoneKey)) {
//             const lastTs = recentPhoneBuffer.get(phoneKey);
//             if (nowTs - lastTs < BUFFER_SECONDS * 1000) {
//                 const waitSec = Math.ceil((BUFFER_SECONDS * 1000 - (nowTs - lastTs)) / 1000);
//                 return res.status(429).json({
//                     success: false,
//                     error: 'Duplicate lead detected',
//                     message: `Wait ${waitSec} seconds before retrying this phone number`
//                 });
//             }
//         }

//         // Check daily limit
//         if (dailyCount >= MAX_PER_DAY) {
//             return res.status(429).json({
//                 success: false,
//                 error: 'Daily lead limit reached',
//                 message: `Maximum ${MAX_PER_DAY} leads per day`
//             });
//         }

//         // Acquire concurrency slot
//         await acquireSlot();

//         // Register in buffer
//         recentPhoneBuffer.set(phoneKey, nowTs);
//         setTimeout(() => {
//             recentPhoneBuffer.delete(phoneKey);
//         }, BUFFER_SECONDS * 1000);

//         // Prepare form data
//         const form = new URLSearchParams();
//         form.append('AFID', AFID);
//         if (lead.SID) form.append('SID', lead.SID);
//         if (lead.ADID) form.append('ADID', lead.ADID);
//         if (lead.ClickID) form.append('ClickID', lead.ClickID);
//         if (lead.AffiliateReferenceID) form.append('AffiliateReferenceID', lead.AffiliateReferenceID);
//         form.append('FirstName', lead.FirstName);
//         form.append('LastName', lead.LastName);
//         form.append('Phone', lead.Phone);
//         if (lead.Email) form.append('Email', lead.Email);
//         form.append('Address', lead.Address);
//         form.append('City', lead.City);
//         form.append('State', lead.State);
//         form.append('Zip', lead.Zip);
//         if (lead.SquareFootage) form.append('SquareFootage', lead.SquareFootage);
//         if (lead.RoofType) form.append('RoofType', lead.RoofType);
//         form.append('DID', DID);

//         // Determine post type
//         const postType = (lead.postType || 'simple').toLowerCase();
//         const postUrl = postType === 'secure' ? SECURE_POST_URL : SIMPLE_POST_URL;

//         // Post with retry
//         let postResponse = null;
//         let attempt = 0;
//         let lastError = null;

//         while (attempt < 2) {
//             try {
//                 const fetchRes = await fetch(postUrl, {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/x-www-form-urlencoded'
//                     },
//                     body: form.toString()
//                 });

//                 postResponse = {
//                     status: fetchRes.status,
//                     statusText: fetchRes.statusText,
//                     data: await fetchRes.text()
//                 };

//                 if (fetchRes.ok) {
//                     dailyCount += 1;
//                     break;
//                 } else {
//                     lastError = new Error(`External API responded with ${fetchRes.status}`);
//                 }
//             } catch (err) {
//                 lastError = err;
//                 if (++attempt >= 2) break;
//                 await delay(300 * attempt);
//             }
//         }

//         if (lastError) {
//             throw lastError;
//         }

//         // Successful response
//         return res.status(200).json({
//             success: true,
//             message: 'Lead processed successfully',
//             postType,
//             dailyCount,
//             postResponse: {
//                 status: postResponse.status,
//                 statusText: postResponse.statusText
//             }
//         });

//     } catch (err) {
//         console.error('Lead processing error:', err);
//         return res.status(500).json({
//             success: false,
//             error: 'Internal server error',
//             message: 'Failed to process lead',
//             details: process.env.NODE_ENV === 'development'
//                 ? err.message
//                 : undefined
//         });
//     } finally {
//         releaseSlot();
//     }
// }

// function getPstDayString() {
//     try {
//         const now = new Date();
//         const options = { timeZone: 'America/Los_Angeles' };
//         const formatter = new Intl.DateTimeFormat('en-CA', {
//             ...options,
//             year: 'numeric',
//             month: '2-digit',
//             day: '2-digit'
//         });
//         const parts = formatter.formatToParts(now);
//         const y = parts.find(p => p.type === 'year').value;
//         const m = parts.find(p => p.type === 'month').value;
//         const d = parts.find(p => p.type === 'day').value;
//         return `${y}-${m}-${d}`;
//     } catch (err) {
//         const fallback = new Date(Date.now() - 7 * 60 * 60 * 1000);
//         return fallback.toISOString().slice(0, 10);
//     }
// }

// function isWithinOperatingHours() {
//     try {
//         const now = new Date();
//         const options = {
//             timeZone: 'America/Los_Angeles',
//             hour: 'numeric',
//             hour12: false,
//             weekday: 'long'
//         };
//         const formatter = new Intl.DateTimeFormat('en-US', options);
//         const parts = formatter.formatToParts(now);

//         const hour = parseInt(parts.find(p => p.type === 'hour').value);
//         const weekday = parts.find(p => p.type === 'weekday').value.toLowerCase();

//         if (weekday === 'sunday') return false;

//         const hoursConfig = weekday === 'saturday'
//             ? OPERATING_HOURS.saturday
//             : OPERATING_HOURS.weekday;

//         return hour >= hoursConfig.start && hour < hoursConfig.end;
//     } catch (err) {
//         console.error('Error checking operating hours:', err);
//         return true;
//     }
// }

// function normalizePhone(phone) {
//     return (phone || '').replace(/\D/g, '');
// }

// function validateGeo(zip) {
//     return true;
// }

// // Concurrency control
// async function acquireSlot() {
//     return new Promise((resolve) => {
//         const tryAcquire = () => {
//             if (activeCount < MAX_CONCURRENCY) {
//                 activeCount += 1;
//                 resolve();
//             } else {
//                 concurrencyQueue.push(tryAcquire);
//             }
//         };
//         tryAcquire();
//     });
// }

// function releaseSlot() {
//     activeCount = Math.max(0, activeCount - 1);
//     if (concurrencyQueue.length) {
//         const next = concurrencyQueue.shift();
//         next();
//     }
// }

// function delay(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }
const AFID = '568579';
const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
const BUFFER_SECONDS = 120;
const MAX_CONCURRENCY = 3;
const MAX_PER_DAY = 10;
const DID = '3808880109';

// In-memory state
let dailyCount = 0;
let currentDay = getPstDayString();
const recentPhoneBuffer = new Map();
const concurrencyQueue = [];
let activeCount = 0;

// Valid job types
const VALID_JOB_TYPES = new Set([
    'tub to shower conversion',
    'new bathtub',
    'new shower'
]);

// PST time validation
const OPERATING_HOURS = {
    weekday: { start: 6, end: 17 },
    saturday: { start: 6, end: 14 },
    sunday: null
};

// Geo validation - Example (replace with actual Google Sheets data)
const VALID_ZIPS = new Set([
  "00151", "01001", "01008", "01009", "01010", "01011", "01013", "01014", "01020", "01021",
  "01022", "01028", "01030", "01034", "01036", "01040", "01041", "01056", "01057", "01069",
  "01071", "01075", "01077", "01079", "01080", "01081", "01085", "01086", "01089", "01090",
  "01095", "01097", "01101", "01102", "01103", "01104", "01105", "01106", "01107", "01108",
  "01111", "01115", "01116", "01118", "01119", "01128", "01129", "01138", "01139", "01144",
  "01152", "01199", "01223", "01521", "06001", "06002", "06006", "06010", "06011", "06013",
  "06016", "06018", "06019", "06020", "06021", "06022", "06023", "06024", "06025", "06026",
  "06027", "06028", "06029", "06030", "06031", "06032", "06033", "06034", "06035", "06037",
  "06039", "06040", "06041", "06042", "06043", "06045", "06050", "06051", "06052", "06053",
  "06057", "06058", "06059", "06060", "06061", "06062", "06063", "06064", "06065", "06066",
  "06067", "06068", "06069", "06070", "06071", "06072", "06073", "06074", "06075", "06076",
  "06077", "06078", "06080", "06081", "06082", "06083", "06084", "06085", "06087", "06088",
  "06089", "06090", "06091", "06092", "06093", "06094", "06095", "06096", "06098", "06101",
  "06102", "06103", "06104", "06105", "06106", "06107", "06108", "06109", "06110", "06111",
  "06112", "06114", "06115", "06117", "06118", "06119", "06120", "06123", "06126", "06127",
  "06128", "06129", "06131", "06132", "06133", "06134", "06137", "06138", "06140", "06141",
  "06142", "06143", "06144", "06145", "06146", "06147", "06150", "06151", "06152", "06153",
  "06154", "06155", "06156", "06160", "06161", "06167", "06176", "06180", "06183", "06199",
  "06226", "06231", "06232", "06233", "06234", "06235", "06237", "06238", "06239", "06241",
  "06242", "06243", "06245", "06246", "06247", "06248", "06249", "06250", "06251", "06254",
  "06255", "06256", "06258", "06259", "06260", "06262", "06263", "06264", "06265", "06266",
  "06267", "06268", "06269", "06277", "06278", "06279", "06280", "06281", "06282", "06320",
  "06330", "06331", "06333", "06334", "06335", "06336", "06339", "06340", "06349", "06350",
  "06351", "06353", "06354", "06355", "06357", "06359", "06360", "06365", "06370", "06371",
  "06372", "06373", "06374", "06375", "06376", "06377", "06378", "06379", "06380", "06382",
  "06383", "06384", "06385", "06387", "06388", "06389", "06401", "06403", "06404", "06405",
  "06408", "06409", "06410", "06411", "06412", "06413", "06414", "06415", "06416", "06417",
  "06418", "06419", "06420", "06422", "06423", "06424", "06426", "06430", "06431", "06432",
  "06436", "06437", "06438", "06439", "06440", "06441", "06442", "06443", "06444", "06447",
  "06450", "06451", "06455", "06456", "06457", "06459", "06460", "06461", "06467", "06468",
  "06469", "06470", "06471", "06472", "06473", "06474", "06475", "06477", "06478", "06479",
  "06480", "06481", "06482", "06483", "06484", "06487", "06488", "06489", "06490", "06491",
  "06492", "06493", "06494", "06495", "06497", "06498", "06501", "06502", "06503", "06504",
  "06505", "06506", "06507", "06508", "06509", "06510", "06511", "06512", "06513", "06514",
  "06515", "06516", "06517", "06518", "06519", "06520", "06521", "06524", "06525", "06530",
  "06531", "06532", "06533", "06534", "06535", "06536", "06537", "06538", "06540", "06601",
  "06602", "06604", "06605", "06606", "06607", "06608", "06610", "06611", "06612", "06614",
  "06615", "06673", "06699", "06701", "06702", "06703", "06704", "06705", "06706", "06708",
  "06710", "06712", "06716", "06720", "06721", "06722", "06723", "06724", "06725", "06726",
  "06749", "06750", "06751", "06752", "06753", "06754", "06755", "06756", "06757", "06758",
  "06759", "06762", "06763", "06770", "06776", "06777", "06778", "06779", "06781", "06782",
  "06783", "06784", "06785", "06786", "06787", "06790", "06791", "06792", "06793", "06794",
  "06795", "06796", "06798", "06801", "06804", "06810", "06811", "06812", "06813", "06814",
  "06816", "06817", "06820", "06824", "06825", "06828", "06829", "06838", "06840", "06846",
  "06850", "06851", "06853", "06854", "06855", "06875", "06876", "06877", "06879", "06880",
  "06883", "06890", "06896", "06897", "06902", "06903", "06905", "06906", "06907", "08180",
  "12501", "12504", "12506", "12507", "12508", "12510", "12511", "12512", "12514", "12522",
  "12524", "12527", "12531", "12533", "12537", "12538", "12540", "12545", "12546", "12564",
  "12567", "12569", "12570", "12571", "12572", "12574", "12578", "12580", "12581", "12582",
  "12583", "12585", "12590", "12592", "12594", "12601", "12602", "12603", "12604", "16226",
  "17201", "17202", "17225", "17236", "17237", "17247", "17268", "17307", "17325", "17331",
  "17332", "17333", "17334", "17335", "17340", "17362", "17402", "17403", "17405", "17408",
  "20101", "20102", "20103", "20104", "20105", "20109", "20110", "20111", "20112", "20117",
  "20118", "20120", "20121", "20122", "20124", "20129", "20130", "20131", "20132", "20134",
  "20135", "20136", "20141", "20142", "20143", "20146", "20147", "20148", "20149", "20151",
  "20152", "20153", "20155", "20158", "20159", "20160", "20163", "20164", "20165", "20166",
  "20167", "20169", "20170", "20171", "20172", "20175", "20176", "20177", "20178", "20180",
  "20181", "20189", "20190", "20191", "20192", "20194", "20195", "20196", "20197", "20588",
  "20598", "20601", "20602", "20603", "20604", "20613", "20617", "20623", "20637", "20646",
  "20695", "20701", "20703", "20704", "20705", "20706", "20707", "20708", "20709", "20710",
  "20711", "20712", "20715", "20716", "20717", "20718", "20719", "20720", "20721", "20722",
  "20723", "20724", "20725", "20726", "20735", "20737", "20738", "20740", "20741", "20742",
  "20744", "20745", "20746", "20748", "20749", "20750", "20752", "20755", "20757", "20758",
  "20759", "20763", "20764", "20768", "20769", "20770", "20771", "20772", "20773", "20774",
  "20775", "20776", "20777", "20788", "20792", "20794", "20810", "20811", "20812", "20813",
  "20814", "20815", "20816", "20817", "20818", "20824", "20825", "20827", "20830", "20832",
  "20833", "20837", "20838", "20839", "20841", "20842", "20847", "20848", "20849", "20850",
  "20851", "20852", "20853", "20854", "20855", "20857", "20859", "20860", "20861", "20862",
  "20866", "20868", "20871", "20872", "20874", "20875", "20876", "20877", "20878", "20879",
  "20880", "20883", "20884", "20885", "20886", "20889", "20891", "20892", "20894", "20895",
  "20896", "20897", "20898", "20899", "20901", "20902", "20903", "20904", "20905", "20906",
  "20907", "20908", "20910", "20911", "20912", "20913", "20914", "20915", "20916", "20918",
  "20993", "20997", "21001", "21005", "21009", "21010", "21014", "21015", "21017", "21018",
  "21020", "21022", "21028", "21029", "21030", "21031", "21032", "21034", "21035", "21036",
  "21037", "21040", "21041", "21042", "21043", "21045", "21046", "21047", "21048", "21050",
  "21054", "21060", "21061", "21062", "21065", "21071", "21074", "21075", "21076", "21077",
  "21078", "21084", "21085", "21088", "21090", "21093", "21094", "21102", "21104", "21108",
  "21113", "21114", "21117", "21122", "21130", "21132", "21133", "21136", "21139", "21140",
  "21144", "21150", "21152", "21153", "21154", "21157", "21158", "21160", "21161", "21162",
  "21163", "21204", "21207", "21208", "21215", "21219", "21226", "21227", "21228", "21234",
  "21236", "21237", "21252", "21282", "21284", "21285", "21286", "21401", "21402", "21403",
  "21404", "21405", "21411", "21412", "21701", "21702", "21703", "21704", "21705", "21709",
  "21710", "21713", "21714", "21715", "21716", "21717", "21718", "21719", "21720", "21721",
  "21722", "21723", "21727", "21734", "21737", "21738", "21740", "21741", "21742", "21746",
  "21747", "21749", "21754", "21755", "21756", "21757", "21758", "21759", "21762", "21765",
  "21767", "21769", "21770", "21771", "21773", "21774", "21775", "21776", "21777", "21778",
  "21779", "21780", "21781", "21782", "21783", "21784", "21787", "21788", "21790", "21791",
  "21792", "21793", "21794", "21795", "21797", "21798", "22003", "22009", "22015", "22025",
  "22026", "22027", "22030", "22031", "22032", "22033", "22034", "22035", "22036", "22037",
  "22038", "22039", "22040", "22041", "22042", "22043", "22044", "22046", "22060", "22066",
  "22067", "22081", "22082", "22095", "22096", "22101", "22102", "22103", "22106", "22107",
  "22108", "22109", "22116", "22118", "22119", "22121", "22122", "22150", "22151", "22152",
  "22153", "22156", "22158", "22159", "22160", "22161", "22172", "22180", "22181", "22182",
  "22183", "22185", "22191", "22192", "22193", "22301", "22302", "22303", "22304", "22305",
  "22306", "22307", "22308", "22310", "22311", "22312", "22315", "22601", "22602", "22603",
  "22604", "22611", "22620", "22622", "22624", "22625", "22630", "22646", "22655", "22656",
  "22663", "25401", "25402", "25403", "25404", "25405", "25410", "25413", "25414", "25419",
  "25420", "25421", "25423", "25425", "25427", "25428", "25430", "25432", "25438", "25440",
  "25441", "25442", "25443", "25446", "27201", "27207", "27208", "27215", "27217", "27231",
  "27242", "27243", "27252", "27253", "27258", "27278", "27281", "27298", "27302", "27312",
  "27315", "27325", "27330", "27332", "27340", "27343", "27344", "27356", "27376", "27501",
  "27502", "27503", "27504", "27505", "27507", "27508", "27509", "27510", "27511", "27512",
  "27513", "27517", "27518", "27519", "27520", "27521", "27522", "27523", "27525", "27526",
  "27527", "27529", "27530", "27534", "27536", "27537", "27539", "27540", "27541", "27542",
  "27544", "27545", "27549", "27551", "27553", "27571", "27572", "27573", "27574", "27581",
  "27583", "27587", "27588", "27589", "27591", "27592", "27596", "27597", "27599", "27601",
  "27602", "27603", "27604", "27605", "27606", "27607", "27608", "27609", "27610", "27611",
  "27612", "27613", "27614", "27615", "27616", "27617", "27619", "27620", "27621", "27622",
  "27624", "27625", "27626", "27627", "27628", "27629", "27634", "27635", "27636", "27640",
  "27650", "27656", "27658", "27661", "27668", "27675", "27676", "27690", "27695", "27697",
  "27698", "27701", "27702", "27703", "27704", "27705", "27707", "27708", "27709", "27711",
  "27712", "27713", "27715", "27717", "27807", "27809", "27812", "27816", "27822", "27828",
  "27829", "27834", "27837", "27851", "27852", "27856", "27858", "27863", "27864", "27880",
  "27882", "27883", "27884", "27886", "27891", "27893", "27896", "28315", "28318", "28323",
  "28326", "28333", "28334", "28339", "28344", "28348", "28356", "28365", "28366", "28373",
  "28374", "28376", "28382", "28385", "28387", "28390", "28391", "28393", "28394", "28395",
  "28441", "28444", "28447", "28513", "28530", "28538", "28578", "28590", "28726", "28731",
  "28732", "28739", "28759", "28782", "28791", "28792", "29036", "29334", "29349", "29365",
  "29369", "29376", "29607", "29613", "29615", "29642", "29650", "29662", "29672", "29676",
  "29680", "29690", "30809", "30907", "31005", "31088", "31093", "31632", "35007", "35023",
  "35033", "35040", "35043", "35046", "35051", "35053", "35055", "35056", "35057", "35058",
  "35077", "35080", "35114", "35115", "35124", "35127", "35173", "35176", "35179", "35203",
  "35205", "35209", "35210", "35212", "35213", "35216", "35222", "35223", "35226", "35233",
  "35235", "35242", "35243", "35244", "35541", "35553", "42348", "43001", "43002", "43003",
  "43004", "43007", "43008", "43009", "43010", "43011", "43013", "43015", "43016", "43017",
  "43018", "43021", "43023", "43025", "43026", "43029", "43030", "43031", "43032", "43033",
  "43035", "43036", "43040", "43044", "43045", "43046", "43054", "43055", "43056", "43060",
  "43061", "43062", "43064", "43065", "43066", "43067", "43068", "43072", "43074", "43076",
  "43077", "43078", "43081", "43082", "43084", "43085", "43102", "43103", "43105", "43106",
  "43109", "43110", "43112", "43113", "43116", "43117", "43119", "43123", "43125", "43126",
  "43128", "43130", "43136", "43137", "43140", "43143", "43145", "43146", "43147", "43148",
  "43151", "43153", "43154", "43157", "43160", "43162", "43164", "43201", "43202", "43203",
  "43204", "43205", "43206", "43207", "43209", "43210", "43211", "43212", "43213", "43214",
  "43215", "43217", "43218", "43219", "43220", "43221", "43222", "43223", "43224", "43227",
  "43228", "43229", "43230", "43231", "43232", "43235", "43240", "43310", "43311", "43316",
  "43318", "43319", "43324", "43326", "43330", "43331", "43332", "43333", "43334", "43336",
  "43340", "43341", "43342", "43343", "43344", "43345", "43346", "43347", "43348", "43350",
  "43351", "43357", "43358", "43359", "43360", "43511", "43512", "43516", "43523", "43524",
  "43527", "43529", "43530", "43534", "43535", "43545", "43548", "44804", "45001", "45002",
  "45003", "45005", "45011", "45013", "45014", "45015", "45030", "45032", "45033", "45034",
  "45036", "45039", "45040", "45041", "45042", "45044", "45050", "45051", "45052", "45053",
  "45054", "45055", "45056", "45062", "45064", "45065", "45066", "45067", "45068", "45069",
  "45070", "45102", "45103", "45106", "45107", "45111", "45113", "45118", "45122", "45140",
  "45142", "45146", "45147", "45148", "45150", "45152", "45154", "45157", "45158", "45159",
  "45160", "45162", "45166", "45169", "45174", "45176", "45177", "45202", "45203", "45204",
  "45205", "45206", "45207", "45208", "45209", "45211", "45212", "45213", "45214", "45215",
  "45216", "45217", "45218", "45219", "45220", "45223", "45224", "45225", "45226", "45227",
  "45229", "45230", "45231", "45232", "45233", "45236", "45237", "45238", "45239", "45240",
  "45241", "45242", "45243", "45244", "45245", "45246", "45247", "45248", "45249", "45251",
  "45252", "45255", "45301", "45302", "45304", "45305", "45306", "45308", "45309", "45311",
  "45312", "45314", "45315", "45316", "45317", "45318", "45319", "45320", "45321", "45322",
  "45323", "45324", "45325", "45326", "45327", "45328", "45330", "45331", "45333", "45334",
  "45335", "45336", "45337", "45338", "45339", "45340", "45341", "45342", "45344", "45345",
  "45346", "45347", "45349", "45351", "45352", "45353", "45354", "45356", "45358", "45359",
  "45360", "45361", "45363", "45365", "45368", "45369", "45370", "45371", "45372", "45373",
  "45377", "45378", "45380", "45381", "45382", "45383", "45384", "45385", "45387", "45388",
  "45389", "45402", "45403", "45404", "45405", "45406", "45409", "45410", "45414", "45415",
  "45416", "45417", "45419", "45420", "45423", "45424", "45426", "45428", "45429", "45430",
  "45431", "45432", "45433", "45434", "45435", "45439", "45440", "45449", "45458", "45459",
  "45469", "45501", "45502", "45503", "45504", "45505", "45506", "45801", "45804", "45805",
  "45806", "45807", "45808", "45809", "45810", "45812", "45814", "45815", "45816", "45817",
  "45819", "45820", "45821", "45822", "45826", "45827", "45828", "45830", "45831", "45832",
  "45833", "45835", "45836", "45838", "45840", "45841", "45843", "45844", "45845", "45848",
  "45849", "45850", "45851", "45853", "45854", "45855", "45856", "45858", "45859", "45860",
  "45861", "45862", "45863", "45864", "45865", "45866", "45867", "45868", "45869", "45870",
  "45871", "45872", "45873", "45874", "45875", "45876", "45877", "45879", "45880", "45881",
  "45882", "45884", "45885", "45886", "45887", "45888", "45889", "45890", "45891", "45893",
  "45894", "45895", "45896", "45897", "45898", "45899", "46001", "46011", "46012", "46014",
  "46015", "46017", "46018", "46030", "46031", "46032", "46033", "46034", "46035", "46037",
  "46038", "46039", "46040", "46041", "46044", "46045", "46047", "46049", "46050", "46051",
  "46055", "46060", "46061", "46062", "46063", "46064", "46067", "46068", "46069", "46070",
  "46071", "46072", "46074", "46077", "46082", "46085", "46102", "46104", "46105", "46106",
  "46107", "46110", "46111", "46112", "46113", "46115", "46122", "46123", "46125", "46126",
  "46127", "46128", "46129", "46130", "46131", "46133", "46135", "46140", "46142", "46143",
  "46144", "46146", "46147", "46148", "46149", "46150", "46151", "46154", "46155", "46156",
  "46157", "46158", "46160", "46161", "46162", "46163", "46164", "46165", "46166", "46167",
  "46168", "46170", "46171", "46172", "46173", "46180", "46181", "46182", "46184", "46186",
  "46197", "46202", "46204", "46206", "46207", "46208", "46209", "46210", "46211", "46213",
  "46216", "46217", "46219", "46220", "46227", "46228", "46230", "46231", "46234", "46236",
  "46237", "46240", "46242", "46244", "46247", "46249", "46250", "46251", "46253", "46254",
  "46255", "46256", "46259", "46260", "46262", "46266", "46268", "46274", "46275", "46277",
  "46278", "46280", "46282", "46283", "46285", "46290", "46291", "46295", "46296", "46298",
  "46307", "46308", "46311", "46321", "46322", "46342", "46360", "46375", "46383", "46385",
  "46410", "46411", "46711", "46733", "46772", "46773", "46901", "46902", "46903", "46904",
  "46937", "46965", "46995", "47001", "47003", "47006", "47010", "47011", "47012", "47016",
  "47017", "47018", "47020", "47022", "47023", "47025", "47031", "47032", "47035", "47037",
  "47038", "47040", "47041", "47042", "47043", "47060", "47106", "47108", "47110", "47111",
  "47112", "47114", "47115", "47116", "47117", "47118", "47119", "47120", "47122", "47123",
  "47124", "47125", "47126", "47129", "47130", "47135", "47136", "47137", "47138", "47140",
  "47141", "47142", "47143", "47145", "47147", "47150", "47160", "47161", "47162", "47163",
  "47164", "47165", "47166", "47167", "47172", "47175", "47201", "47202", "47203", "47220",
  "47223", "47224", "47225", "47226", "47227", "47229", "47230", "47231", "47232", "47235",
  "47236", "47243", "47244", "47246", "47250", "47260", "47261", "47263", "47264", "47265",
  "47270", "47272", "47273", "47274", "47280", "47281", "47283", "47303", "47304", "47306",
  "47307", "47308", "47320", "47322", "47324", "47325", "47334", "47335", "47337", "47338",
  "47339", "47341", "47342", "47344", "47345", "47346", "47352", "47353", "47357", "47360",
  "47361", "47366", "47367", "47370", "47374", "47375", "47383", "47384", "47385", "47386",
  "47387", "47388", "47392", "47393", "47396", "47401", "47402", "47403", "47404", "47405",
  "47406", "47407", "47408", "47420", "47421", "47424", "47426", "47429", "47432", "47434",
  "47435", "47436", "47437", "47438", "47441", "47443", "47446", "47449", "47451", "47452",
  "47453", "47454", "47457", "47458", "47459", "47462", "47463", "47464", "47465", "47467",
  "47468", "47469", "47470", "47471", "47501", "47512", "47513", "47514", "47515", "47516",
  "47519", "47520", "47521", "47522", "47523", "47524", "47525", "47527", "47528", "47529",
  "47531", "47532", "47537", "47541", "47542", "47546", "47550", "47551", "47552", "47553",
  "47557", "47558", "47561", "47562", "47564", "47567", "47568", "47574", "47575", "47576",
  "47577", "47578", "47579", "47580", "47581", "47585", "47586", "47588", "47590", "47591",
  "47597", "47598", "47601", "47610", "47611", "47612", "47613", "47615", "47616", "47619",
  "47620", "47630", "47631", "47633", "47634", "47635", "47637", "47638", "47639", "47640",
  "47648", "47649", "47660", "47665", "47666", "47670", "47708", "47710", "47711", "47712",
  "47713", "47714", "47715", "47720", "47725", "47801", "47804", "47805", "47807", "47808",
  "47809", "47833", "47834", "47837", "47838", "47840", "47841", "47842", "47846", "47847",
  "47848", "47849", "47850", "47851", "47853", "47854", "47857", "47858", "47861", "47863",
  "47866", "47869", "47870", "47871", "47876", "47878", "47879", "47880", "47881", "47882",
  "47885", "47901", "47902", "47903", "47904", "47905", "47906", "47907", "47909", "47918",
  "47920", "47924", "47928", "47930", "47940", "47941", "47949", "47952", "47954", "47958",
  "47962", "47965", "47967", "47968", "47969", "47974", "47981", "47983", "47987", "47988",
  "47989", "47992", "47994", "47996", "48001", "48002", "48003", "48004", "48006", "48007",
  "48014", "48022", "48023", "48027", "48028", "48032", "48039", "48040", "48041", "48049",
  "48054", "48059", "48060", "48061", "48063", "48064", "48067", "48068", "48069", "48071",
  "48074", "48079", "48083", "48084", "48085", "48088", "48089", "48090", "48091", "48094",
  "48097", "48310", "48311", "48312", "48313", "48315", "48316", "48317", "48318", "48401",
  "48410", "48412", "48413", "48416", "48419", "48421", "48422", "48426", "48427", "48428",
  "48432", "48434", "48435", "48440", "48441", "48444", "48445", "48446", "48450", "48453",
  "48454", "48455", "48456", "48461", "48464", "48465", "48466", "48467", "48468", "48469",
  "48470", "48471", "48472", "48475", "48502", "48503", "48504", "48505", "48550", "48551",
  "48552", "48553", "48554", "48555", "48556", "48557", "48601", "48701", "48720", "48723",
  "48725", "48726", "48727", "48729", "48731", "48733", "48735", "48741", "48744", "48746",
  "48754", "48755", "48757", "48758", "48759", "48760", "48767", "48768", "59002", "59006",
  "59013", "59014", "59015", "59019", "59024", "59026", "59029", "59034", "59035", "59037",
  "59041", "59044", "59057", "59063", "59064", "59066", "59067", "59070", "59075", "59079",
  "59088", "59101", "59102", "59105", "59106", "62001", "62002", "62010", "62012", "62014",
  "62018", "62021", "62022", "62024", "62025", "62028", "62034", "62035", "62037", "62046",
  "62048", "62052", "62061", "62062", "62067", "62074", "62084", "62087", "62088", "62095",
  "62097", "62208", "62214", "62215", "62216", "62217", "62218", "62219", "62220", "62221",
  "62223", "62226", "62230", "62231", "62232", "62234", "62236", "62240", "62243", "62244",
  "62245", "62246", "62249", "62253", "62254", "62255", "62257", "62258", "62260", "62263",
  "62264", "62265", "62269", "62271", "62275", "62277", "62278", "62281", "62285", "62286",
  "62293", "62294", "62295", "62298", "63005", "63010", "63011", "63012", "63015", "63016",
  "63017", "63020", "63021", "63023", "63025", "63026", "63028", "63031", "63033", "63034",
  "63038", "63040", "63041", "63042", "63043", "63044", "63049", "63050", "63051", "63052",
  "63055", "63060", "63069", "63070", "63072", "63074", "63084", "63089", "63090", "63105",
  "63108", "63109", "63110", "63114", "63116", "63117", "63119", "63122", "63123", "63124",
  "63125", "63126", "63127", "63128", "63129", "63130", "63131", "63132", "63134", "63138",
  "63139", "63141", "63143", "63144", "63146", "63301", "63303", "63304", "63332", "63341",
  "63362", "63366", "63367", "63368", "63376", "63379", "63385", "63558", "64001", "64011",
  "64012", "64013", "64014", "64016", "64017", "64018", "64019", "64020", "64021", "64022",
  "64024", "64028", "64029", "64034", "64035", "64036", "64037", "64040", "64048", "64050",
  "64051", "64052", "64053", "64054", "64055", "64058", "64060", "64061", "64062", "64063",
  "64065", "64066", "64067", "64068", "64069", "64070", "64071", "64072", "64073", "64074",
  "64075", "64076", "64077", "64078", "64079", "64080", "64081", "64082", "64083", "64084",
  "64085", "64086", "64088", "64089", "64090", "64092", "64093", "64096", "64097", "64098",
  "64108", "64111", "64112", "64113", "64114", "64116", "64117", "64118", "64119", "64131",
  "64133", "64136", "64137", "64139", "64145", "64146", "64147", "64149", "64150", "64151",
  "64152", "64153", "64154", "64155", "64156", "64157", "64158", "64161", "64163", "64164",
  "64165", "64166", "64167", "64168", "64190", "64195", "64401", "64402", "64421", "64422",
  "64423", "64424", "64426", "64427", "64428", "64429", "64430", "64431", "64432", "64433",
  "64434", "64436", "64437", "64438", "64439", "64440", "64442", "64443", "64444", "64445",
  "64446", "64448", "64449", "64451", "64453", "64454", "64455", "64457", "64458", "64459",
  "64461", "64463", "64465", "64466", "64467", "64468", "64469", "64470", "64471", "64473",
  "64474", "64475", "64476", "64477", "64479", "64480", "64481", "64482", "64483", "64484",
  "64485", "64487", "64489", "64490", "64491", "64492", "64493", "64494", "64497", "64498",
  "64501", "64502", "64503", "64504", "64505", "64506", "64507", "64508", "64601", "64620",
  "64622", "64623", "64624", "64625", "64628", "64630", "64631", "64632", "64633", "64635",
  "64636", "64637", "64638", "64639", "64640", "64641", "64642", "64643", "64644", "64645",
  "64646", "64647", "64648", "64649", "64650", "64651", "64652", "64653", "64654", "64657",
  "64658", "64659", "64664", "64668", "64670", "64671", "64673", "64674", "64679", "64680",
  "64682", "64683", "64686", "64688", "64689", "64701", "64720", "64722", "64723", "64725",
  "64728", "64730", "64733", "64734", "64739", "64741", "64742", "64743", "64744", "64745",
  "64746", "64747", "64750", "64752", "64756", "64761", "64762", "64765", "64766", "64767",
  "64771", "64772", "64778", "64779", "64780", "64783", "64784", "64790", "65025", "65068",
  "65081", "65230", "65233", "65237", "65244", "65248", "65250", "65254", "65274", "65276",
  "65301", "65302", "65305", "65320", "65321", "65322", "65325", "65326", "65327", "65330",
  "65332", "65333", "65334", "65335", "65336", "65337", "65338", "65339", "65340", "65344",
  "65345", "65347", "65348", "65349", "65350", "65351", "65355", "65607", "65674", "65785",
  "66002", "66006", "66007", "66008", "66010", "66012", "66013", "66014", "66015", "66016",
  "66017", "66018", "66020", "66021", "66023", "66024", "66025", "66026", "66027", "66030",
  "66031", "66032", "66033", "66035", "66036", "66039", "66040", "66041", "66042", "66043",
  "66044", "66045", "66046", "66047", "66048", "66049", "66050", "66051", "66052", "66053",
  "66054", "66056", "66058", "66060", "66061", "66062", "66063", "66064", "66066", "66067",
  "66070", "66071", "66072", "66073", "66075", "66076", "66078", "66079", "66080", "66083",
  "66085", "66086", "66087", "66088", "66090", "66091", "66092", "66093", "66094", "66095",
  "66097", "66109", "66110", "66113", "66201", "66202", "66203", "66204", "66205", "66206",
  "66207", "66208", "66209", "66210", "66211", "66212", "66213", "66214", "66215", "66216",
  "66217", "66218", "66219", "66220", "66221", "66222", "66223", "66224", "66225", "66226",
  "66227", "66250", "66251", "66276", "66282", "66283", "66285", "66286", "66401", "66402",
  "66403", "66404", "66408", "66409", "66413", "66414", "66415", "66416", "66417", "66418",
  "66419", "66420", "66423", "66424", "66425", "66427", "66428", "66429", "66431", "66434",
  "66436", "66439", "66440", "66451", "66501", "66502", "66505", "66506", "66507", "66509",
  "66510", "66512", "66515", "66516", "66522", "66523", "66524", "66526", "66527", "66528",
  "66532", "66533", "66534", "66537", "66538", "66539", "66540", "66542", "66543", "66544",
  "66546", "66550", "66552", "66601", "66603", "66604", "66605", "66606", "66607", "66608",
  "66609", "66610", "66611", "66612", "66614", "66615", "66616", "66617", "66618", "66619",
  "66620", "66621", "66622", "66624", "66625", "66626", "66629", "66630", "66636", "66647",
  "66667", "66675", "66683", "66699", "66701", "66711", "66712", "66716", "66734", "66735",
  "66738", "66741", "66746", "66754", "66756", "66758", "66761", "66767", "66769", "66775",
  "66779", "66780", "66801", "66830", "66833", "66834", "66835", "66839", "66846", "66849",
  "66852", "66854", "66855", "66856", "66857", "66860", "66864", "66865", "66868", "66871",
  "77954", "78003", "78006", "78008", "78011", "78013", "78014", "78017", "78026", "78028",
  "78052", "78055", "78061", "78064", "78065", "78069", "78073", "78113", "78114", "78118",
  "78130", "78133", "78147", "78155", "78201", "78202", "78203", "78204", "78207", "78208",
  "78209", "78210", "78211", "78212", "78213", "78214", "78215", "78216", "78217", "78218",
  "78219", "78220", "78222", "78223", "78224", "78226", "78227", "78228", "78229", "78230",
  "78231", "78232", "78233", "78234", "78235", "78236", "78237", "78238", "78239", "78240",
  "78242", "78244", "78245", "78247", "78248", "78249", "78250", "78251", "78252", "78253",
  "78254", "78255", "78256", "78257", "78258", "78259", "78260", "78261", "78263", "78264",
  "78266", "78610", "78624", "78629", "78666", "78801", "78830", "78834", "78861", "78872",
  "81401", "81403", "81416", "81425", "81427", "81432", "81501", "81503", "81504", "81505",
  "81506", "81507", "81520", "84003", "84004", "84006", "84009", "84020", "84042", "84043",
  "84044", "84045", "84047", "84057", "84058", "84059", "84062", "84065", "84070", "84081",
  "84088", "84090", "84091", "84092", "84093", "84094", "84095", "84096", "84097", "84101",
  "84102", "84103", "84104", "84105", "84106", "84107", "84108", "84109", "84110", "84111",
  "84112", "84113", "84114", "84115", "84116", "84117", "84118", "84119", "84120", "84121",
  "84122", "84123", "84124", "84125", "84126", "84127", "84128", "84129", "84130", "84131",
  "84132", "84133", "84134", "84138", "84139", "84141", "84143", "84145", "84147", "84148",
  "84150", "84151", "84152", "84157", "84158", "84170", "84171", "84184", "84190", "84199",
  "84601", "84602", "84603", "84604", "84605", "84606", "84663", "85003", "85004", "85006",
  "85007", "85008", "85009", "85012", "85013", "85014", "85015", "85016", "85017", "85018",
  "85019", "85020", "85021", "85022", "85023", "85024", "85027", "85028", "85029", "85031",
  "85032", "85033", "85034", "85035", "85037", "85039", "85040", "85041", "85042", "85043",
  "85044", "85045", "85048", "85050", "85051", "85053", "85054", "85065", "85073", "85083",
  "85085", "85086", "85087", "85096", "85119", "85120", "85138", "85139", "85140", "85142",
  "85143", "85201", "85202", "85203", "85204", "85205", "85206", "85207", "85208", "85209",
  "85210", "85211", "85212", "85213", "85214", "85215", "85223", "85224", "85225", "85226",
  "85233", "85234", "85244", "85246", "85248", "85249", "85250", "85251", "85252", "85253",
  "85254", "85255", "85256", "85257", "85258", "85259", "85260", "85261", "85262", "85263",
  "85264", "85266", "85267", "85268", "85269", "85280", "85281", "85282", "85283", "85284",
  "85285", "85286", "85287", "85288", "85295", "85296", "85297", "85298", "85299", "85301",
  "85302", "85303", "85304", "85305", "85306", "85307", "85308", "85309", "85310", "85311",
  "85312", "85318", "85323", "85326", "85338", "85340", "85345", "85351", "85372", "85373",
  "85374", "85375", "85378", "85379", "85380", "85381", "85382", "85383", "85385", "85387",
  "85388", "85392", "85395", "85396", "90265", "90603", "90605", "90638", "91304", "91307",
  "91319", "91320", "91358", "91359", "91360", "91361", "91362", "91363", "91377", "91381",
  "91701", "91708", "91709", "91710", "91729", "91730", "91739", "91758", "91762", "91763",
  "91764", "91768", "91784", "91786", "91901", "91902", "91903", "91906", "91908", "91909",
  "91910", "91911", "91912", "91913", "91914", "91915", "91917", "91921", "91932", "91933",
  "91935", "91941", "91942", "91943", "91944", "91945", "91946", "91950", "91951", "91962",
  "91976", "91977", "91978", "91979", "92003", "92007", "92008", "92009", "92010", "92011",
  "92013", "92014", "92018", "92019", "92020", "92021", "92022", "92023", "92024", "92025",
  "92026", "92027", "92028", "92029", "92030", "92033", "92036", "92037", "92038", "92039",
  "92040", "92046", "92049", "92051", "92052", "92054", "92056", "92057", "92058", "92059",
  "92060", "92061", "92064", "92065", "92067", "92068", "92069", "92070", "92071", "92072",
  "92074", "92075", "92078", "92079", "92081", "92082", "92083", "92084", "92085", "92088",
  "92091", "92092", "92093", "92096", "92101", "92102", "92103", "92104", "92105", "92106",
  "92107", "92108", "92109", "92110", "92111", "92112", "92113", "92114", "92115", "92116",
  "92117", "92118", "92119", "92120", "92121", "92122", "92123", "92124", "92126", "92127",
  "92128", "92129", "92130", "92131", "92132", "92134", "92135", "92136", "92137", "92138",
  "92139", "92140", "92142", "92143", "92145", "92147", "92149", "92150", "92152", "92153",
  "92154", "92155", "92158", "92159", "92160", "92161", "92163", "92165", "92166", "92167",
  "92168", "92169", "92170", "92171", "92172", "92173", "92174", "92175", "92176", "92177",
  "92178", "92179", "92182", "92186", "92187", "92191", "92192", "92193", "92195", "92196",
  "92197", "92198", "92199", "92201", "92203", "92210", "92211", "92220", "92223", "92234",
  "92236", "92240", "92241", "92247", "92252", "92253", "92256", "92260", "92262", "92264",
  "92270", "92276", "92277", "92307", "92308", "92314", "92315", "92324", "92325", "92336",
  "92337", "92340", "92345", "92346", "92352", "92354", "92371", "92372", "92373", "92374",
  "92376", "92386", "92392", "92501", "92503", "92504", "92505", "92506", "92507", "92508",
  "92509", "92530", "92545", "92551", "92553", "92555", "92562", "92563", "92567", "92582",
  "92584", "92585", "92586", "92590", "92591", "92592", "92595", "92596", "92602", "92603",
  "92604", "92606", "92610", "92612", "92614", "92618", "92620", "92624", "92625", "92626",
  "92627", "92629", "92630", "92637", "92646", "92648", "92651", "92653", "92656", "92657",
  "92660", "92661", "92662", "92663", "92672", "92673", "92675", "92677", "92679", "92688",
  "92691", "92692", "92694", "92705", "92782", "92807", "92808", "92821", "92823", "92860",
  "92861", "92867", "92869", "92879", "92880", "92883", "92886", "92887", "93001", "93002",
  "93003", "93004", "93005", "93006", "93007", "93009", "93010", "93011", "93012", "93013",
  "93014", "93015", "93016", "93020", "93021", "93022", "93023", "93024", "93030", "93031",
  "93032", "93033", "93034", "93035", "93036", "93040", "93041", "93042", "93043", "93044",
  "93060", "93061", "93062", "93063", "93064", "93065", "93066", "93067", "93093", "93094",
  "93099", "93101", "93102", "93103", "93105", "93106", "93107", "93108", "93109", "93110",
  "93111", "93116", "93117", "93118", "93120", "93121", "93130", "93140", "93150", "93160",
  "93190", "93199", "93225", "93252", "93254", "93427", "93429", "93434", "93436", "93437",
  "93438", "93440", "93441", "93454", "93455", "93456", "93457", "93458", "93460", "93463",
  "93464", "94536", "94539", "94541", "94542", "94544", "94545", "94560", "94587", "95002",
  "95005", "95008", "95012", "95017", "95019", "95020", "95032", "95037", "95060", "95062",
  "95066", "95076", "95117", "95123", "95139", "97144", "97233", "97236", "97266", "97301",
  "97342", "97344", "97350", "97356", "98336", "98581", "98632", "99284", "97002", "97003",
  "97004", "97005", "97006", "97007", "97008", "97009", "97010", "97011", "97013", "97015",
  "97016", "97017", "97018", "97019", "97020", "97022", "97023", "97024", "97026", "97027",
  "97028", "97030", "97032", "97034", "97035", "97036", "97038", "97042", "97045", "97048",
  "97049", "97051", "97053", "97054", "97055", "97056", "97060", "97062", "97064", "97067",
  "97068", "97070", "97071", "97075", "97076", "97077", "97078", "97079", "97080", "97086",
  "97089", "97101", "97106", "97109", "97111", "97113", "97114", "97115", "97116", "97117",
  "97119", "97123", "97124", "97125", "97127", "97128", "97129", "97132", "97133", "97137",
  "97140", "97148", "97201", "97202", "97203", "97204", "97206", "97207", "97208", "97209",
  "97210", "97211", "97212", "97213", "97214", "97215", "97216", "97217", "97218", "97219",
  "97220", "97221", "97222", "97223", "97224", "97225", "97227", "97228", "97229", "97230",
  "97231", "97232", "97238", "97239", "97240", "97242", "97250", "97251", "97252", "97253",
  "97254", "97256", "97258", "97267", "97268", "97269", "97280", "97281", "97282", "97283",
  "97286", "97290", "97291", "97292", "97293", "97294", "97296", "97298", "97302", "97303",
  "97304", "97305", "97306", "97307", "97308", "97309", "97310", "97311", "97312", "97314",
  "97317", "97321", "97322", "97325", "97326", "97329", "97330", "97331", "97333", "97335",
  "97336", "97338", "97339", "97346", "97347", "97351", "97352", "97355", "97358", "97360",
  "97362", "97370", "97371", "97373", "97374", "97375", "97377", "97378", "97381", "97383",
  "97384", "97385", "97389", "97392", "97396", "98377", "98522", "98531", "98532", "98533",
  "98538", "98539", "98542", "98544", "98564", "98565", "98570", "98572", "98582", "98585",
  "98591", "98593", "98596", "98601", "98603", "98604", "98606", "98607", "98609", "98611",
  "98616", "98622", "98625", "98626", "98629", "98639", "98642", "98645", "98648", "98649",
  "98651", "98660", "98661", "98662", "98663", "98664", "98665", "98666", "98668", "98671",
  "98674", "98675", "98682", "98683", "98684", "98685", "98686", "98687"
]);


export default async function handler(req, res) {
    // Set response content type first (ensures all responses are JSON)
    res.setHeader('Content-Type', 'application/json');
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ status: 'OK' });
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed',
            allowedMethods: ['POST']
        });
    }

    try {
        // Check operating hours
        if (!isWithinOperatingHours()) {
            return res.status(403).json({
                success: false,
                error: 'Service unavailable',
                message: 'Service unavailable outside operating hours (M-F 6am-5pm PST, Sat 6am-2pm PST)'
            });
        }

        // Reset daily counter
        const today = getPstDayString();
        if (today !== currentDay) {
            currentDay = today;
            dailyCount = 0;
        }

        // Parse JSON body
        let lead;
        try {
            lead = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
        } catch (e) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request body',
                message: 'Could not parse JSON body',
                details: process.env.NODE_ENV === 'development' ? e.message : undefined
            });
        }

        // Validate required fields
        const requiredFields = [
            'FirstName', 'LastName', 'Phone',
            'Address', 'City', 'State', 'Zip',
            'jobType', 'spaceType', 'propertyType', 'occupancy'
        ];

        const missingFields = requiredFields.filter(f => !lead[f]);
        if (missingFields.length) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                missingFields,
                message: `Missing: ${missingFields.join(', ')}`
            });
        }

        // Validate qualifications
        const validationErrors = [];
        const spaceType = String(lead.spaceType).toLowerCase();
        const jobType = String(lead.jobType).toLowerCase();
        const propertyType = String(lead.propertyType).toLowerCase();
        const occupancy = String(lead.occupancy).toLowerCase();

        if (spaceType !== 'wet') {
            validationErrors.push('spaceType must be "wet"');
        }

        if (!VALID_JOB_TYPES.has(jobType)) {
            validationErrors.push(`jobType must be one of: ${Array.from(VALID_JOB_TYPES).join(', ')}`);
        }

        if (propertyType.includes('mobile')) {
            validationErrors.push('Mobile homes are not allowed');
        }

        if (['renter', 'renters'].includes(occupancy)) {
            validationErrors.push('Renters are not allowed');
        }

        // Validate geo (now properly implemented)
        if (!validateGeo(lead.Zip)) {
            validationErrors.push('Service not available in this ZIP code');
        }

        if (validationErrors.length) {
            return res.status(400).json({
                success: false,
                error: 'Qualification failed',
                message: 'Lead did not meet requirements',
                details: validationErrors
            });
        }

        // Check buffer for duplicates
        const nowTs = Date.now();
        const phoneKey = normalizePhone(lead.Phone);

        if (recentPhoneBuffer.has(phoneKey)) {
            const lastTs = recentPhoneBuffer.get(phoneKey);
            if (nowTs - lastTs < BUFFER_SECONDS * 1000) {
                const waitSec = Math.ceil((BUFFER_SECONDS * 1000 - (nowTs - lastTs)) / 1000);
                return res.status(429).json({
                    success: false,
                    error: 'Duplicate lead detected',
                    message: `Wait ${waitSec} seconds before retrying this phone number`
                });
            }
        }

        // Check daily limit
        if (dailyCount >= MAX_PER_DAY) {
            return res.status(429).json({
                success: false,
                error: 'Daily lead limit reached',
                message: `Maximum ${MAX_PER_DAY} leads per day`
            });
        }

        // Acquire concurrency slot
        await acquireSlot();

        // Register in buffer
        recentPhoneBuffer.set(phoneKey, nowTs);
        setTimeout(() => {
            recentPhoneBuffer.delete(phoneKey);
        }, BUFFER_SECONDS * 1000);

        // Prepare form data (now filters empty optional fields)
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
        if (lead.SquareFootage && String(lead.SquareFootage).trim()) form.append('SquareFootage', lead.SquareFootage);
        if (lead.RoofType && String(lead.RoofType).trim()) form.append('RoofType', lead.RoofType);
        form.append('DID', DID);

        // Determine post type
        const postType = (lead.postType || 'simple').toLowerCase();
        const postUrl = postType === 'secure' ? SECURE_POST_URL : SIMPLE_POST_URL;

        // Post with retry
        let postResponse = null;
        let attempt = 0;
        let lastError = null;

        while (attempt < 2) {
            try {
                const fetchRes = await fetch(postUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: form.toString()
                });

                postResponse = {
                    status: fetchRes.status,
                    statusText: fetchRes.statusText,
                    data: await fetchRes.text()
                };

                if (fetchRes.ok) {
                    dailyCount += 1;
                    break;
                } else {
                    lastError = new Error(`External API responded with ${fetchRes.status}`);
                }
            } catch (err) {
                lastError = err;
                if (++attempt >= 2) break;
                await delay(300 * attempt);
            }
        }

        if (lastError) {
            throw lastError;
        }

        // Successful response (simplified to match typical API conventions)
        return res.status(200).json({
            status: 'success',
            lead_id: postResponse.data?.leadId || null, // Adjust based on actual response
            daily_count: dailyCount,
            post_type: postType
        });

    } catch (err) {
        console.error('Lead processing error:', err);
        return res.status(500).json({
            status: 'error',
            error: 'internal_error',
            message: 'Failed to process lead'
        });
    } finally {
        releaseSlot();
    }
}

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
        return true;
    }
}

function normalizePhone(phone) {
    return (phone || '').replace(/\D/g, '');
}

// Actual geo validation (replace VALID_ZIPS with your data)
function validateGeo(zip) {
    // Strip any non-numeric characters
    const cleanZip = String(zip).replace(/\D/g, '');
    return VALID_ZIPS.has(cleanZip);
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

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}