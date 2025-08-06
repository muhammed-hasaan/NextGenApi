const AFID = '568579';
const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
const BUFFER_SECONDS = 120;
const MAX_CONCURRENCY = 3;
const MAX_PER_DAY = 10;
const DID = '6144123532';
const MIN_WINDOWS = 3;

// In-memory state
let dailyCount = 0;
let currentDay = getPstDayString();
const recentPhoneBuffer = new Map();
const concurrencyQueue = [];
let activeCount = 0;

// PST time validation
const OPERATING_HOURS = {
    weekday: { start: 6, end: 17 },
    saturday: { start: 6, end: 14 },
    sunday: null
};

export default async function handler(req, res) {
    // Set response headers
    res.setHeader('Content-Type', 'application/json');
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
            'windowCount', 'propertyType', 'occupancy'
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
        const windowCount = parseInt(lead.windowCount) || 0;
        const propertyType = String(lead.propertyType).toLowerCase();
        const occupancy = String(lead.occupancy).toLowerCase();

        if (windowCount < MIN_WINDOWS) {
            validationErrors.push(`Minimum ${MIN_WINDOWS} windows required`);
        }

        if (propertyType.includes('mobile')) {
            validationErrors.push('Mobile homes are not allowed');
        }

        if (['renter', 'renters'].includes(occupancy)) {
            validationErrors.push('Renters are not allowed');
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

        // Prepare form data
        const form = new URLSearchParams();
        const postType = (lead.postType || 'simple').toLowerCase();
        
        if (postType === 'secure') {
            if (lead.ClickID) form.append('ClickID', lead.ClickID);
        } else {
            form.append('AFID', AFID);
            if (lead.SID) form.append('SID', lead.SID);
            if (lead.ADID) form.append('ADID', lead.ADID);
            if (lead.ClickID) form.append('ClickID', lead.ClickID);
            if (lead.AffiliateReferenceID) form.append('AffiliateReferenceID', lead.AffiliateReferenceID);
        }

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
        form.append('DID', DID);

        // Determine post URL
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

        // Successful response
        return res.status(200).json({
            success: true,
            message: 'Lead processed successfully',
            postType,
            dailyCount,
            postResponse: {
                status: postResponse.status,
                statusText: postResponse.statusText
            }
        });

    } catch (err) {
        console.error('Lead processing error:', err);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to process lead',
            details: process.env.NODE_ENV === 'development'
                ? err.message
                : undefined
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