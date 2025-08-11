// const AFID = '568579';
// const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
// const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
// const BUFFER_SECONDS = 120;
// const MAX_CONCURRENCY = 3;
// const MAX_PER_DAY = 10;
// const DID = '6144123532';
// const MIN_WINDOWS = 3;

// // In-memory state
// let dailyCount = 0;
// let currentDay = getPstDayString();
// const recentPhoneBuffer = new Map();
// const concurrencyQueue = [];
// let activeCount = 0;

// // PST time validation
// const OPERATING_HOURS = {
//     weekday: { start: 6, end: 17 },
//     saturday: { start: 6, end: 14 },
//     sunday: null
// };

// export default async function handler(req, res) {
//     // Set response headers
//     res.setHeader('Content-Type', 'application/json');
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
//             'windowCount', 'propertyType', 'occupancy'
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
//         const windowCount = parseInt(lead.windowCount) || 0;
//         const propertyType = String(lead.propertyType).toLowerCase();
//         const occupancy = String(lead.occupancy).toLowerCase();

//         if (windowCount < MIN_WINDOWS) {
//             validationErrors.push(`Minimum ${MIN_WINDOWS} windows required`);
//         }

//         if (propertyType.includes('mobile')) {
//             validationErrors.push('Mobile homes are not allowed');
//         }

//         if (['renter', 'renters'].includes(occupancy)) {
//             validationErrors.push('Renters are not allowed');
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
//         const postType = (lead.postType || 'simple').toLowerCase();
        
//         if (postType === 'secure') {
//             if (lead.ClickID) form.append('ClickID', lead.ClickID);
//         } else {
//             form.append('AFID', AFID);
//             if (lead.SID) form.append('SID', lead.SID);
//             if (lead.ADID) form.append('ADID', lead.ADID);
//             if (lead.ClickID) form.append('ClickID', lead.ClickID);
//             if (lead.AffiliateReferenceID) form.append('AffiliateReferenceID', lead.AffiliateReferenceID);
//         }

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

//         // Determine post URL
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

// // Helper functions
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

// const AFID = '568579';
// const SIMPLE_POST_URL = 'https://cumuluspost.com/Lead/473193/SimplePost';
// const SECURE_POST_URL = 'https://cumuluspost.com/Lead/473193/SecurePost';
// const BUFFER_SECONDS = 120;
// const MAX_CONCURRENCY = 3;
// const MAX_PER_DAY = 10;
// const DID = '6144123532';
// const MIN_WINDOWS = 3;

// // Geo footprint validation (mock - replace with actual spreadsheet data)
// const GEO_FOOTPRINT = {
//     'MA': [
//         '01001', '01002', '01003', '01004', '01005', '01007', '01008', '01009',
//         '01010', '01011', '01012', '01013', '01014', '01021', '01022', '01026',
//         '01027', '01028', '01029', '01030', '01031', '01032', '01033', '01034',
//         '01035', '01036', '01037', '01038', '01039', '01040', '01041', '01050',
//         '01053', '01054', '01056', '01057', '01059', '01060', '01061', '01062',
//         '01063', '01066', '01068', '01069', '01070', '01071', '01072', '01073',
//         '01074', '01075', '01077', '01079', '01080', '01081', '01082', '01083',
//         '01084', '01085', '01086', '01088', '01089', '01090', '01092', '01093',
//         '01094', '01095', '01096', '01097', '01098', '01101', '01102', '01103',
//         '01104', '01105', '01106', '01107', '01108', '01109', '01111', '01115',
//         '01116', '01118', '01119', '01128', '01129', '01138', '01139', '01144',
//         '01151', '01152', '01199', '01201', '01202', '01203', '01220', '01222',
//         '01223', '01224', '01225', '01226', '01227', '01229', '01230', '01235',
//         '01236', '01237', '01238', '01240', '01242', '01243', '01244', '01245',
//         '01247', '01252', '01253', '01254', '01255', '01256', '01257', '01258',
//         '01259', '01260', '01262', '01263', '01264', '01266', '01267', '01270',
//         '01301', '01302', '01330', '01331', '01337', '01338', '01339', '01340',
//         '01341', '01342', '01343', '01344', '01346', '01347', '01349', '01350',
//         '01351', '01354', '01355', '01360', '01364', '01366', '01367', '01368',
//         '01370', '01373', '01375', '01376', '01378', '01379', '01380', '01420',
//         '01430', '01436', '01438', '01440', '01441', '01452', '01453', '01468',
//         '01473', '01475', '01501', '01503', '01505', '01506', '01507', '01508',
//         '01509', '01510', '01515', '01516', '01518', '01519', '01520', '01521',
//         '01522', '01524', '01525', '01526', '01527', '01529', '01531', '01532',
//         '01534', '01535', '01536', '01537', '01538', '01540', '01541', '01542',
//         '01543', '01545', '01546', '01550', '01560', '01561', '01562', '01564',
//         '01566', '01568', '01569', '01570', '01571', '01581', '01583', '01585',
//         '01586', '01588', '01590', '01601', '01602', '01603', '01604', '01605',
//         '01606', '01607', '01608', '01609', '01610', '01611', '01612', '01613',
//         '01614', '01615', '01653', '01655'
//     ],
//     'CT': [
//         '06001', '06002', '06006', '06010', '06011', '06013', '06016', '06018',
//         '06019', '06020', '06021', '06022', '06023', '06024', '06025', '06026',
//         '06027', '06028', '06029', '06030', '06031', '06032', '06033', '06034',
//         '06035', '06037', '06039', '06040', '06041', '06042', '06043', '06045',
//         '06050', '06051', '06052', '06053', '06057', '06058', '06059', '06060',
//         '06061', '06062', '06063', '06064', '06065', '06066', '06067', '06068',
//         '06069', '06070', '06071', '06072', '06073', '06074', '06075', '06076',
//         '06077', '06078', '06080', '06081', '06082', '06083', '06084', '06085',
//         '06088', '06089', '06090', '06091', '06092', '06093', '06094', '06095',
//         '06096', '06098', '06101', '06102', '06103', '06104', '06105', '06106',
//         '06107', '06108', '06109', '06110', '06111', '06112', '06114', '06115',
//         '06117', '06118', '06119', '06120', '06123', '06126', '06127', '06128',
//         '06129', '06131', '06132', '06133', '06134', '06137', '06138', '06140',
//         '06141', '06142', '06143', '06144', '06145', '06146', '06147', '06150',
//         '06151', '06152', '06153', '06154', '06155', '06156', '06160', '06161',
//         '06167', '06176', '06180', '06183', '06199', '06226', '06230', '06231',
//         '06232', '06233', '06234', '06235', '06237', '06238', '06239', '06241',
//         '06242', '06243', '06244', '06245', '06246', '06247', '06248', '06249',
//         '06250', '06251', '06254', '06255', '06256', '06258', '06259', '06260',
//         '06262', '06263', '06264', '06265', '06266', '06267', '06268', '06269',
//         '06277', '06278', '06279', '06280', '06281', '06320', '06330', '06331',
//         '06332', '06333', '06334', '06335', '06336', '06338', '06339', '06340',
//         '06349', '06350', '06351', '06353', '06354', '06355', '06357', '06359',
//         '06360', '06365', '06370', '06371', '06372', '06373', '06374', '06375',
//         '06376', '06377', '06378', '06379', '06380', '06382', '06383', '06384',
//         '06385', '06387', '06388', '06389', '06401', '06403', '06404', '06405',
//         '06408', '06409', '06410', '06411', '06412', '06413', '06414', '06415',
//         '06416', '06417', '06418', '06419', '06420', '06422', '06423', '06424',
//         '06426', '06437', '06438', '06439', '06440', '06441', '06442', '06443',
//         '06444', '06447', '06450', '06451', '06455', '06456', '06457', '06459',
//         '06460', '06461', '06467', '06468', '06469', '06470', '06471', '06472',
//         '06473', '06474', '06475', '06477', '06478', '06479', '06480', '06481',
//         '06482', '06483', '06484', '06487', '06488', '06489', '06491', '06492',
//         '06493', '06494', '06495', '06498', '06501', '06502', '06503', '06504',
//         '06505', '06506', '06507', '06508', '06509', '06510', '06511', '06512',
//         '06513', '06514', '06515', '06516', '06517', '06518', '06519', '06520',
//         '06521', '06524', '06525', '06530', '06531', '06532', '06533', '06534',
//         '06535', '06536', '06537', '06538', '06540', '06611', '06612', '06614',
//         '06673', '06701', '06702', '06703', '06704', '06705', '06706', '06708',
//         '06710', '06712', '06716', '06720', '06721', '06722', '06723', '06724',
//         '06725', '06726', '06749', '06750', '06751', '06752', '06753', '06754',
//         '06755', '06756', '06757', '06758', '06762', '06763', '06770', '06776',
//         '06777', '06778', '06779', '06781', '06782', '06783', '06784', '06785',
//         '06786', '06787', '06790', '06791', '06792', '06793', '06794', '06795',
//         '06796', '06798', '06801', '06804', '06807', '06810', '06811', '06812',
//         '06813', '06820', '06824', '06825', '06828', '06829', '06830', '06831',
//         '06836', '06838', '06840', '06850', '06851', '06852', '06853', '06854',
//         '06855', '06856', '06857', '06858', '06860', '06870', '06875', '06876',
//         '06877', '06878', '06879', '06880', '06881', '06883', '06888', '06889',
//         '06890', '06896', '06897', '06901', '06902', '06903', '06904', '06905',
//         '06906', '06907', '06910', '06911', '06912', '06913', '06914', '06926',
//         '06927'
//     ],
//     'MO': [
//         '63558', '64001', '64011', '64012', '64013', '64014', '64016', '64017',
//         '64018', '64019', '64020', '64021', '64022', '64024', '64028', '64029',
//         '64034', '64035', '64036', '64037', '64040', '64048', '64050', '64051',
//         '64052', '64053', '64054', '64055', '64058', '64060', '64061', '64062',
//         '64063', '64065', '64066', '64067', '64068', '64069', '64070', '64071',
//         '64072', '64073', '64074', '64075', '64076', '64077', '64078', '64079',
//         '64080', '64081', '64082', '64083', '64084', '64085', '64086', '64088',
//         '64089', '64090', '64092', '64093', '64096', '64097', '64098', '64108',
//         '64111', '64112', '64113', '64114', '64116', '64117', '64118', '64119',
//         '64131', '64133', '64136', '64137', '64139', '64145', '64146', '64147',
//         '64149', '64150', '64151', '64152', '64153', '64154', '64155', '64156',
//         '64157', '64158', '64161', '64163', '64164', '64165', '64166', '64167',
//         '64168', '64190', '64195', '64401', '64402', '64421', '64422', '64423',
//         '64424', '64426', '64427', '64428', '64429', '64430', '64431', '64432',
//         '64433', '64434', '64436', '64437', '64438', '64439', '64440', '64442',
//         '64443', '64444', '64445', '64446', '64448', '64449', '64451', '64453',
//         '64454', '64455', '64457', '64458', '64459', '64461', '64463', '64465',
//         '64466', '64467', '64468', '64469', '64470', '64471', '64473', '64474',
//         '64475', '64476', '64477', '64479', '64480', '64481', '64482', '64483',
//         '64484', '64485', '64487', '64489', '64490', '64491', '64492', '64493',
//         '64494', '64497', '64498', '64501', '64502', '64503', '64504', '64505',
//         '64506', '64507', '64508', '64601', '64620', '64622', '64623', '64624',
//         '64625', '64628', '64630', '64631', '64632', '64633', '64635', '64636',
//         '64637', '64638', '64639', '64640', '64641', '64642', '64643', '64644',
//         '64645', '64646', '64647', '64648', '64649', '64650', '64651', '64652',
//         '64653', '64654', '64657', '64658', '64659', '64664', '64668', '64670',
//         '64671', '64673', '64674', '64679', '64680', '64682', '64683', '64686',
//         '64688', '64689', '64701', '64720', '64722', '64723', '64725', '64728',
//         '64730', '64733', '64734', '64739', '64741', '64742', '64743', '64744',
//         '64745', '64746', '64747', '64750', '64752', '64756', '64761', '64762',
//         '64765', '64766', '64767', '64771', '64772', '64778', '64779', '64780',
//         '64783', '64784', '64790', '65025', '65068', '65081', '65230', '65233',
//         '65237', '65244', '65248', '65250', '65254', '65274', '65276', '65301',
//         '65302', '65305', '65320', '65321', '65322', '65325', '65326', '65327',
//         '65330', '65332', '65333', '65334', '65335', '65336', '65337', '65338',
//         '65339', '65340', '65344', '65345', '65347', '65348', '65349', '65350',
//         '65351', '65355', '65607', '65674', '65785'
//     ],
//     'TX': [
//         '77954', '78003', '78006', '78008', '78011', '78013', '78014', '78017',
//         '78026', '78028', '78052', '78055', '78061', '78064', '78065', '78069',
//         '78073', '78113', '78114', '78118', '78130', '78133', '78147', '78155',
//         '78201', '78202', '78203', '78204', '78207', '78208', '78209', '78210',
//         '78211', '78212', '78213', '78214', '78215', '78216', '78217', '78218',
//         '78219', '78220', '78222', '78223', '78224', '78226', '78227', '78228',
//         '78229', '78230', '78231', '78232', '78233', '78234', '78235', '78236',
//         '78237', '78238', '78239', '78240', '78242', '78244', '78245', '78247',
//         '78248', '78249', '78250', '78251', '78252', '78253', '78254', '78255',
//         '78256', '78257', '78258', '78259', '78260', '78261', '78263', '78264',
//         '78266', '78610', '78624', '78629', '78666', '78801', '78830', '78834',
//         '78861', '78872'
//     ]
// };


// // In-memory state
// let dailyCount = 0;
// let currentDay = getPstDayString();
// const recentPhoneBuffer = new Map();
// const concurrencyQueue = [];
// let activeCount = 0;

// // PST time validation
// const OPERATING_HOURS = {
//     weekday: { start: 6, end: 17 }, // M-F 6am-5pm PST
//     saturday: { start: 6, end: 14 }, // Sat 6am-2pm PST
//     sunday: null // Closed
// };

// export default async function handler(req, res) {
//     // Set response headers
//     res.setHeader('Content-Type', 'application/json');
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
//                 message: 'Service available M-F 6am-5pm PST, Sat 6am-2pm PST'
//             });
//         }

//         // Reset daily counter
//         const today = getPstDayString();
//         if (today !== currentDay) {
//             currentDay = today;
//             dailyCount = 0;
//             recentPhoneBuffer.clear();
//         }

//         // Parse JSON body
//         let lead;
//         try {
//             lead = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
//         } catch (e) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Invalid request body',
//                 message: 'Could not parse JSON body'
//             });
//         }

//         // Validate required fields
//         const requiredFields = [
//             'FirstName', 'LastName', 'Phone',
//             'Address', 'City', 'State', 'Zip',
//             'windowCount', 'propertyType', 'occupancy'
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
//         const windowCount = parseInt(lead.windowCount) || 0;
//         const propertyType = String(lead.propertyType).toLowerCase();
//         const occupancy = String(lead.occupancy).toLowerCase();

//         if (windowCount < MIN_WINDOWS) {
//             validationErrors.push(`Minimum ${MIN_WINDOWS} windows required`);
//         }

//         if (propertyType.includes('mobile') || propertyType.includes('trailer')) {
//             validationErrors.push('Mobile homes are not allowed');
//         }

//         if (occupancy.includes('rent') || occupancy === 'tenant') {
//             validationErrors.push('Renters are not allowed');
//         }

//         // Validate geo footprint
//         const state = lead.State.toUpperCase();
//         const zip = lead.Zip;
//         if (!GEO_FOOTPRINT[state] || !GEO_FOOTPRINT[state].includes(zip)) {
//             validationErrors.push('Location not in service area');
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

//         try {
//             // Register in buffer
//             recentPhoneBuffer.set(phoneKey, nowTs);
//             setTimeout(() => {
//                 recentPhoneBuffer.delete(phoneKey);
//             }, BUFFER_SECONDS * 1000);

//             // Prepare form data
//             const form = new URLSearchParams();
//             const postType = (lead.postType || 'simple').toLowerCase();
            
//             if (postType === 'secure') {
//                 if (lead.ClickID) form.append('ClickID', lead.ClickID);
//             } else {
//                 form.append('AFID', AFID);
//                 if (lead.SID) form.append('SID', lead.SID);
//                 if (lead.ADID) form.append('ADID', lead.ADID);
//                 if (lead.ClickID) form.append('ClickID', lead.ClickID);
//                 if (lead.AffiliateReferenceID) form.append('AffiliateReferenceID', lead.AffiliateReferenceID);
//             }

//             // Add required fields
//             form.append('FirstName', lead.FirstName);
//             form.append('LastName', lead.LastName);
//             form.append('Phone', lead.Phone);
//             if (lead.Email) form.append('Email', lead.Email);
//             form.append('Address', lead.Address);
//             form.append('City', lead.City);
//             form.append('State', lead.State);
//             form.append('Zip', lead.Zip);
//             if (lead.SquareFootage) form.append('SquareFootage', lead.SquareFootage);
//             if (lead.RoofType) form.append('RoofType', lead.RoofType);
//             form.append('DID', DID);

//             // Determine post URL
//             const postUrl = postType === 'secure' ? SECURE_POST_URL : SIMPLE_POST_URL;

//             // Post with retry
//             let postResponse = null;
//             let attempt = 0;
//             let lastError = null;

//             while (attempt < 2) {
//                 try {
//                     const fetchRes = await fetch(postUrl, {
//                         method: 'POST',
//                         headers: {
//                             'Content-Type': 'application/x-www-form-urlencoded'
//                         },
//                         body: form.toString()
//                     });

//                     postResponse = {
//                         status: fetchRes.status,
//                         statusText: fetchRes.statusText,
//                         data: await fetchRes.text()
//                     };

//                     if (fetchRes.ok) {
//                         dailyCount += 1;
//                         break;
//                     } else {
//                         lastError = new Error(`External API responded with ${fetchRes.status}`);
//                     }
//                 } catch (err) {
//                     lastError = err;
//                     if (++attempt >= 2) break;
//                     await delay(300 * attempt);
//                 }
//             }

//             if (lastError) {
//                 throw lastError;
//             }

//             // Successful response
//             return res.status(200).json({
//                 success: true,
//                 message: 'Lead processed successfully',
//                 postType,
//                 dailyCount,
//                 postResponse: {
//                     status: postResponse.status,
//                     statusText: postResponse.statusText
//                 }
//             });
//         } finally {
//             releaseSlot();
//         }

//     } catch (err) {
//         console.error('Lead processing error:', err);
//         return res.status(500).json({
//             success: false,
//             error: 'Internal server error',
//             message: 'Failed to process lead'
//         });
//     }
// }

// // Helper functions
// function getPstDayString() {
//     try {
//         const now = new Date();
//         const options = { timeZone: 'America/Los_Angeles' };
//         return now.toLocaleDateString('en-CA', options).replace(/\//g, '-');
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
//         return false; // Fail safe - don't accept leads if we can't verify time
//     }
// }

// function normalizePhone(phone) {
//     return (phone || '').replace(/\D/g, '').slice(-10); // Keep last 10 digits
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
const DID = '6144123532';
const MIN_WINDOWS = 3;

// Geo footprint validation (mock - replace with actual spreadsheet data)
const GEO_FOOTPRINT = {
    'MA': [
        '01001', '01002', '01003', '01004', '01005', '01007', '01008', '01009',
        '01010', '01011', '01012', '01013', '01014', '01021', '01022', '01026',
        '01027', '01028', '01029', '01030', '01031', '01032', '01033', '01034',
        '01035', '01036', '01037', '01038', '01039', '01040', '01041', '01050',
        '01053', '01054', '01056', '01057', '01059', '01060', '01061', '01062',
        '01063', '01066', '01068', '01069', '01070', '01071', '01072', '01073',
        '01074', '01075', '01077', '01079', '01080', '01081', '01082', '01083',
        '01084', '01085', '01086', '01088', '01089', '01090', '01092', '01093',
        '01094', '01095', '01096', '01097', '01098', '01101', '01102', '01103',
        '01104', '01105', '01106', '01107', '01108', '01109', '01111', '01115',
        '01116', '01118', '01119', '01128', '01129', '01138', '01139', '01144',
        '01151', '01152', '01199', '01201', '01202', '01203', '01220', '01222',
        '01223', '01224', '01225', '01226', '01227', '01229', '01230', '01235',
        '01236', '01237', '01238', '01240', '01242', '01243', '01244', '01245',
        '01247', '01252', '01253', '01254', '01255', '01256', '01257', '01258',
        '01259', '01260', '01262', '01263', '01264', '01266', '01267', '01270',
        '01301', '01302', '01330', '01331', '01337', '01338', '01339', '01340',
        '01341', '01342', '01343', '01344', '01346', '01347', '01349', '01350',
        '01351', '01354', '01355', '01360', '01364', '01366', '01367', '01368',
        '01370', '01373', '01375', '01376', '01378', '01379', '01380', '01420',
        '01430', '01436', '01438', '01440', '01441', '01452', '01453', '01468',
        '01473', '01475', '01501', '01503', '01505', '01506', '01507', '01508',
        '01509', '01510', '01515', '01516', '01518', '01519', '01520', '01521',
        '01522', '01524', '01525', '01526', '01527', '01529', '01531', '01532',
        '01534', '01535', '01536', '01537', '01538', '01540', '01541', '01542',
        '01543', '01545', '01546', '01550', '01560', '01561', '01562', '01564',
        '01566', '01568', '01569', '01570', '01571', '01581', '01583', '01585',
        '01586', '01588', '01590', '01601', '01602', '01603', '01604', '01605',
        '01606', '01607', '01608', '01609', '01610', '01611', '01612', '01613',
        '01614', '01615', '01653', '01655'
    ],
    'CT': [
        '06001', '06002', '06006', '06010', '06011', '06013', '06016', '06018',
        '06019', '06020', '06021', '06022', '06023', '06024', '06025', '06026',
        '06027', '06028', '06029', '06030', '06031', '06032', '06033', '06034',
        '06035', '06037', '06039', '06040', '06041', '06042', '06043', '06045',
        '06050', '06051', '06052', '06053', '06057', '06058', '06059', '06060',
        '06061', '06062', '06063', '06064', '06065', '06066', '06067', '06068',
        '06069', '06070', '06071', '06072', '06073', '06074', '06075', '06076',
        '06077', '06078', '06080', '06081', '06082', '06083', '06084', '06085',
        '06088', '06089', '06090', '06091', '06092', '06093', '06094', '06095',
        '06096', '06098', '06101', '06102', '06103', '06104', '06105', '06106',
        '06107', '06108', '06109', '06110', '06111', '06112', '06114', '06115',
        '06117', '06118', '06119', '06120', '06123', '06126', '06127', '06128',
        '06129', '06131', '06132', '06133', '06134', '06137', '06138', '06140',
        '06141', '06142', '06143', '06144', '06145', '06146', '06147', '06150',
        '06151', '06152', '06153', '06154', '06155', '06156', '06160', '06161',
        '06167', '06176', '06180', '06183', '06199', '06226', '06230', '06231',
        '06232', '06233', '06234', '06235', '06237', '06238', '06239', '06241',
        '06242', '06243', '06244', '06245', '06246', '06247', '06248', '06249',
        '06250', '06251', '06254', '06255', '06256', '06258', '06259', '06260',
        '06262', '06263', '06264', '06265', '06266', '06267', '06268', '06269',
        '06277', '06278', '06279', '06280', '06281', '06320', '06330', '06331',
        '06332', '06333', '06334', '06335', '06336', '06338', '06339', '06340',
        '06349', '06350', '06351', '06353', '06354', '06355', '06357', '06359',
        '06360', '06365', '06370', '06371', '06372', '06373', '06374', '06375',
        '06376', '06377', '06378', '06379', '06380', '06382', '06383', '06384',
        '06385', '06387', '06388', '06389', '06401', '06403', '06404', '06405',
        '06408', '06409', '06410', '06411', '06412', '06413', '06414', '06415',
        '06416', '06417', '06418', '06419', '06420', '06422', '06423', '06424',
        '06426', '06437', '06438', '06439', '06440', '06441', '06442', '06443',
        '06444', '06447', '06450', '06451', '06455', '06456', '06457', '06459',
        '06460', '06461', '06467', '06468', '06469', '06470', '06471', '06472',
        '06473', '06474', '06475', '06477', '06478', '06479', '06480', '06481',
        '06482', '06483', '06484', '06487', '06488', '06489', '06491', '06492',
        '06493', '06494', '06495', '06498', '06501', '06502', '06503', '06504',
        '06505', '06506', '06507', '06508', '06509', '06510', '06511', '06512',
        '06513', '06514', '06515', '06516', '06517', '06518', '06519', '06520',
        '06521', '06524', '06525', '06530', '06531', '06532', '06533', '06534',
        '06535', '06536', '06537', '06538', '06540', '06611', '06612', '06614',
        '06673', '06701', '06702', '06703', '06704', '06705', '06706', '06708',
        '06710', '06712', '06716', '06720', '06721', '06722', '06723', '06724',
        '06725', '06726', '06749', '06750', '06751', '06752', '06753', '06754',
        '06755', '06756', '06757', '06758', '06762', '06763', '06770', '06776',
        '06777', '06778', '06779', '06781', '06782', '06783', '06784', '06785',
        '06786', '06787', '06790', '06791', '06792', '06793', '06794', '06795',
        '06796', '06798', '06801', '06804', '06807', '06810', '06811', '06812',
        '06813', '06820', '06824', '06825', '06828', '06829', '06830', '06831',
        '06836', '06838', '06840', '06850', '06851', '06852', '06853', '06854',
        '06855', '06856', '06857', '06858', '06860', '06870', '06875', '06876',
        '06877', '06878', '06879', '06880', '06881', '06883', '06888', '06889',
        '06890', '06896', '06897', '06901', '06902', '06903', '06904', '06905',
        '06906', '06907', '06910', '06911', '06912', '06913', '06914', '06926',
        '06927'
    ],
    'MO': [
        '63558', '64001', '64011', '64012', '64013', '64014', '64016', '64017',
        '64018', '64019', '64020', '64021', '64022', '64024', '64028', '64029',
        '64034', '64035', '64036', '64037', '64040', '64048', '64050', '64051',
        '64052', '64053', '64054', '64055', '64058', '64060', '64061', '64062',
        '64063', '64065', '64066', '64067', '64068', '64069', '64070', '64071',
        '64072', '64073', '64074', '64075', '64076', '64077', '64078', '64079',
        '64080', '64081', '64082', '64083', '64084', '64085', '64086', '64088',
        '64089', '64090', '64092', '64093', '64096', '64097', '64098', '64108',
        '64111', '64112', '64113', '64114', '64116', '64117', '64118', '64119',
        '64131', '64133', '64136', '64137', '64139', '64145', '64146', '64147',
        '64149', '64150', '64151', '64152', '64153', '64154', '64155', '64156',
        '64157', '64158', '64161', '64163', '64164', '64165', '64166', '64167',
        '64168', '64190', '64195', '64401', '64402', '64421', '64422', '64423',
        '64424', '64426', '64427', '64428', '64429', '64430', '64431', '64432',
        '64433', '64434', '64436', '64437', '64438', '64439', '64440', '64442',
        '64443', '64444', '64445', '64446', '64448', '64449', '64451', '64453',
        '64454', '64455', '64457', '64458', '64459', '64461', '64463', '64465',
        '64466', '64467', '64468', '64469', '64470', '64471', '64473', '64474',
        '64475', '64476', '64477', '64479', '64480', '64481', '64482', '64483',
        '64484', '64485', '64487', '64489', '64490', '64491', '64492', '64493',
        '64494', '64497', '64498', '64501', '64502', '64503', '64504', '64505',
        '64506', '64507', '64508', '64601', '64620', '64622', '64623', '64624',
        '64625', '64628', '64630', '64631', '64632', '64633', '64635', '64636',
        '64637', '64638', '64639', '64640', '64641', '64642', '64643', '64644',
        '64645', '64646', '64647', '64648', '64649', '64650', '64651', '64652',
        '64653', '64654', '64657', '64658', '64659', '64664', '64668', '64670',
        '64671', '64673', '64674', '64679', '64680', '64682', '64683', '64686',
        '64688', '64689', '64701', '64720', '64722', '64723', '64725', '64728',
        '64730', '64733', '64734', '64739', '64741', '64742', '64743', '64744',
        '64745', '64746', '64747', '64750', '64752', '64756', '64761', '64762',
        '64765', '64766', '64767', '64771', '64772', '64778', '64779', '64780',
        '64783', '64784', '64790', '65025', '65068', '65081', '65230', '65233',
        '65237', '65244', '65248', '65250', '65254', '65274', '65276', '65301',
        '65302', '65305', '65320', '65321', '65322', '65325', '65326', '65327',
        '65330', '65332', '65333', '65334', '65335', '65336', '65337', '65338',
        '65339', '65340', '65344', '65345', '65347', '65348', '65349', '65350',
        '65351', '65355', '65607', '65674', '65785'
    ],
    'TX': [
        '77954', '78003', '78006', '78008', '78011', '78013', '78014', '78017',
        '78026', '78028', '78052', '78055', '78061', '78064', '78065', '78069',
        '78073', '78113', '78114', '78118', '78130', '78133', '78147', '78155',
        '78201', '78202', '78203', '78204', '78207', '78208', '78209', '78210',
        '78211', '78212', '78213', '78214', '78215', '78216', '78217', '78218',
        '78219', '78220', '78222', '78223', '78224', '78226', '78227', '78228',
        '78229', '78230', '78231', '78232', '78233', '78234', '78235', '78236',
        '78237', '78238', '78239', '78240', '78242', '78244', '78245', '78247',
        '78248', '78249', '78250', '78251', '78252', '78253', '78254', '78255',
        '78256', '78257', '78258', '78259', '78260', '78261', '78263', '78264',
        '78266', '78610', '78624', '78629', '78666', '78801', '78830', '78834',
        '78861', '78872'
    ]
};

// In-memory state
let dailyCount = 0;
let currentDay = getPstDayString();
const recentPhoneBuffer = new Map();
const concurrencyQueue = [];
let activeCount = 0;

// PST time validation
const OPERATING_HOURS = {
    weekday: { start: 6, end: 17 }, // M-F 6am-5pm PST
    saturday: { start: 6, end: 14 }, // Sat 6am-2pm PST
    sunday: null // Closed
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
                message: 'Service available M-F 6am-5pm PST, Sat 6am-2pm PST'
            });
        }

        // Reset daily counter
        const today = getPstDayString();
        if (today !== currentDay) {
            currentDay = today;
            dailyCount = 0;
            recentPhoneBuffer.clear();
        }

        // Parse JSON body
        let lead;
        try {
            lead = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
        } catch (e) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request body',
                message: 'Could not parse JSON body'
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

        if (propertyType.includes('mobile') || propertyType.includes('trailer')) {
            validationErrors.push('Mobile homes are not allowed');
        }

        if (occupancy.includes('rent') || occupancy === 'tenant') {
            validationErrors.push('Renters are not allowed');
        }

        // Validate geo footprint
        const state = lead.State.toUpperCase();
        const zip = lead.Zip;

        if (!GEO_FOOTPRINT[state] || !GEO_FOOTPRINT[state].includes(zip)) {
            validationErrors.push('Location not in service area');
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

        try {
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

            // Add required fields
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
        } finally {
            releaseSlot();
        }
    } catch (err) {
        console.error('Lead processing error:', err);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to process lead'
        });
    }
}

// Helper functions
function getPstDayString() {
    try {
        const now = new Date();
        const options = { timeZone: 'America/Los_Angeles' };
        return now.toLocaleDateString('en-CA', options).replace(/\//g, '-');
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
        return false; // Fail safe - don't accept leads if we can't verify time
    }
}

function normalizePhone(phone) {
    return (phone || '').replace(/\D/g, '').slice(-10); // Keep last 10 digits
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
