/* GAARI prototype — mock data. Everything here is fictional demo data. */

const COMMISSION_RATE = 0.10;

const CITIES = ['Lahore', 'Islamabad', 'Rawalpindi', 'Karachi'];

const OWNERS = {
  o1: { id: 'o1', name: 'Ahmed', fullName: 'Ahmed Raza', city: 'Lahore', rating: 4.9, rentals: 32, reviews: 24, response: 98, responseTime: '15 min', since: 'Mar 2024', avatar: { skin: 2, hair: 1, bg: '#FFE3A3' } },
  o2: { id: 'o2', name: 'Sana', fullName: 'Sana Malik', city: 'Lahore', rating: 4.8, rentals: 21, reviews: 17, response: 95, responseTime: '30 min', since: 'Jun 2024', avatar: { skin: 1, hair: 3, bg: '#D7E6FF' } },
  o3: { id: 'o3', name: 'Usman', fullName: 'Usman Tariq', city: 'Lahore', rating: 4.9, rentals: 44, reviews: 37, response: 99, responseTime: '10 min', since: 'Jan 2024', avatar: { skin: 3, hair: 2, bg: '#D9F2E6' } },
  o4: { id: 'o4', name: 'Fatima', fullName: 'Fatima Sheikh', city: 'Lahore', rating: 4.8, rentals: 18, reviews: 15, response: 92, responseTime: '40 min', since: 'Aug 2024', avatar: { skin: 1, hair: 4, bg: '#FFD9E4' } },
  o5: { id: 'o5', name: 'Bilal', fullName: 'Bilal Ahmed', city: 'Lahore', rating: 4.7, rentals: 12, reviews: 9, response: 90, responseTime: '1 hr', since: 'Nov 2024', avatar: { skin: 2, hair: 0, bg: '#E6E0FF' } },
  o6: { id: 'o6', name: 'Imran', fullName: 'Imran Qureshi', city: 'Lahore', rating: 4.9, rentals: 57, reviews: 49, response: 97, responseTime: '20 min', since: 'Dec 2023', avatar: { skin: 3, hair: 5, bg: '#FFE3A3' } },
  o7: { id: 'o7', name: 'Ayesha', fullName: 'Ayesha Khan', city: 'Islamabad', rating: 4.8, rentals: 26, reviews: 22, response: 96, responseTime: '25 min', since: 'Apr 2024', avatar: { skin: 1, hair: 3, bg: '#D7E6FF' } },
  o8: { id: 'o8', name: 'Zain', fullName: 'Zain Abbasi', city: 'Rawalpindi', rating: 4.6, rentals: 9, reviews: 7, response: 88, responseTime: '1 hr', since: 'Feb 2025', avatar: { skin: 2, hair: 1, bg: '#D9F2E6' } },
  o9: { id: 'o9', name: 'Hira', fullName: 'Hira Siddiqui', city: 'Karachi', rating: 4.9, rentals: 38, reviews: 31, response: 98, responseTime: '15 min', since: 'Feb 2024', avatar: { skin: 2, hair: 4, bg: '#FFD9E4' } },
  o10: { id: 'o10', name: 'Kamran', fullName: 'Kamran Baig', city: 'Karachi', rating: 4.7, rentals: 15, reviews: 11, response: 91, responseTime: '45 min', since: 'Sep 2024', avatar: { skin: 3, hair: 0, bg: '#E6E0FF' } },
  o11: { id: 'o11', name: 'Omer', fullName: 'Omer Farooq', city: 'Islamabad', rating: 4.8, rentals: 29, reviews: 23, response: 94, responseTime: '20 min', since: 'May 2024', avatar: { skin: 1, hair: 2, bg: '#FFE3A3' } },
};

/* The demo renter. Owners only ever see the protected version of this profile. */
const RENTER = {
  name: 'Hamza', fullName: 'Hamza Tariq', city: 'Lahore', trust: 4.8, rating: 4.8, rentals: 11, reviews: 9,
  since: 'Jul 2024', cnicEnd: '3', licence: 'Punjab LTV · valid till Mar 2029', age: 27,
  avatar: { skin: 2, hair: 2, bg: '#CFE0FF' },
};

/* type: sedan | suv | hatch    rental: self | driver | both */
const CARS = [
  { id: 'c1', make: 'Toyota', model: 'Corolla Altis', year: 2022, price: 5500, driverRate: 2500, rating: 4.9, trips: 32, reviews: 24,
    area: 'DHA Phase 5', city: 'Lahore', rental: 'both', trans: 'Automatic', fuel: 'Petrol', seats: 5, type: 'sedan', color: '#F2F3F5', colorName: 'Super White',
    mileage: '87,000 km', engine: '1.6L', plate: 'LEB 22-4471', owner: 'o1', verified: true, instant: false,
    features: ['Air conditioning', 'Cruise control', 'Reverse camera', 'Bluetooth audio', 'USB charging', 'Airbags'], weekly: 34000, monthly: 132000 },
  { id: 'c2', make: 'Honda', model: 'City', year: 2021, price: 4800, driverRate: 2200, rating: 4.8, trips: 21, reviews: 17,
    area: 'Gulberg III', city: 'Lahore', rental: 'self', trans: 'Automatic', fuel: 'Petrol', seats: 5, type: 'sedan', color: '#9CA3AF', colorName: 'Lunar Silver',
    mileage: '64,000 km', engine: '1.5L', plate: 'LEE 21-1180', owner: 'o2', verified: true,
    features: ['Air conditioning', 'Bluetooth audio', 'Airbags', 'ABS brakes'], weekly: 30000, monthly: 115000 },
  { id: 'c3', make: 'Kia', model: 'Sportage', year: 2023, price: 8500, driverRate: 2500, rating: 4.9, trips: 44, reviews: 37,
    area: 'Johar Town', city: 'Lahore', rental: 'both', trans: 'Automatic', fuel: 'Petrol', seats: 5, type: 'suv', color: '#2B2F3A', colorName: 'Aurora Black',
    mileage: '31,000 km', engine: '2.0L', plate: 'LEF 23-9021', owner: 'o3', verified: true,
    features: ['Panoramic sunroof', 'Climate control', 'Reverse camera', 'Apple CarPlay', 'Cruise control', '6 Airbags'], weekly: 54000, monthly: 205000 },
  { id: 'c4', make: 'Toyota', model: 'Yaris', year: 2022, price: 5000, driverRate: 2200, rating: 4.8, trips: 18, reviews: 15,
    area: 'Model Town', city: 'Lahore', rental: 'both', trans: 'Automatic', fuel: 'Petrol', seats: 5, type: 'sedan', color: '#C8323C', colorName: 'Red Mica',
    mileage: '52,000 km', engine: '1.5L', plate: 'LEC 22-7735', owner: 'o4', verified: true,
    features: ['Air conditioning', 'Push start', 'Reverse camera', 'Airbags'], weekly: 31500, monthly: 120000 },
  { id: 'c5', make: 'Suzuki', model: 'Cultus', year: 2021, price: 3200, driverRate: 2000, rating: 4.7, trips: 12, reviews: 9,
    area: 'Bahria Town', city: 'Lahore', rental: 'self', trans: 'Manual', fuel: 'Petrol', seats: 4, type: 'hatch', color: '#3A63B8', colorName: 'Cerulean Blue',
    mileage: '71,000 km', engine: '1.0L', plate: 'LEA 21-5520', owner: 'o5', verified: true,
    features: ['Air conditioning', 'Power windows', 'USB charging'], weekly: 20000, monthly: 76000 },
  { id: 'c6', make: 'Toyota', model: 'Fortuner', year: 2021, price: 14000, driverRate: 3000, rating: 4.9, trips: 57, reviews: 49,
    area: 'DHA Phase 6', city: 'Lahore', rental: 'driver', trans: 'Automatic', fuel: 'Diesel', seats: 7, type: 'suv', color: '#E9E6DF', colorName: 'Pearl White',
    mileage: '98,000 km', engine: '2.8L', plate: 'LEB 21-0707', owner: 'o6', verified: true,
    features: ['7 seats', 'Climate control', '4x4', 'Leather seats', 'Reverse camera', 'Airbags'], weekly: 88000, monthly: 330000 },
  { id: 'c7', make: 'Honda', model: 'Civic', year: 2022, price: 7500, driverRate: 2500, rating: 4.8, trips: 26, reviews: 22,
    area: 'F-7 Markaz', city: 'Islamabad', rental: 'self', trans: 'Automatic', fuel: 'Petrol', seats: 5, type: 'sedan', color: '#1E2A44', colorName: 'Cosmic Blue',
    mileage: '41,000 km', engine: '1.5L Turbo', plate: 'ICT 22-3318', owner: 'o7', verified: true,
    features: ['Sunroof', 'Lane watch', 'Climate control', 'Apple CarPlay', 'Airbags'], weekly: 47000, monthly: 180000 },
  { id: 'c8', make: 'Suzuki', model: 'Alto VXL', year: 2023, price: 2800, driverRate: 1800, rating: 4.6, trips: 9, reviews: 7,
    area: 'Saddar', city: 'Rawalpindi', rental: 'self', trans: 'Manual', fuel: 'Petrol', seats: 4, type: 'hatch', color: '#E7E2D6', colorName: 'Silky Silver',
    mileage: '22,000 km', engine: '660cc', plate: 'RIR 23-4410', owner: 'o8', verified: false,
    features: ['Air conditioning', 'Power steering'], weekly: 17500, monthly: 66000 },
  { id: 'c9', make: 'Hyundai', model: 'Tucson', year: 2023, price: 9000, driverRate: 2800, rating: 4.9, trips: 38, reviews: 31,
    area: 'Clifton', city: 'Karachi', rental: 'both', trans: 'Automatic', fuel: 'Petrol', seats: 5, type: 'suv', color: '#6B7F5E', colorName: 'Amazon Grey',
    mileage: '28,000 km', engine: '2.0L', plate: 'BVR 23-6621', owner: 'o9', verified: true,
    features: ['Panoramic sunroof', 'Wireless charging', 'Climate control', 'Reverse camera', 'Airbags'], weekly: 57000, monthly: 215000 },
  { id: 'c10', make: 'Changan', model: 'Alsvin', year: 2023, price: 4200, driverRate: 2200, rating: 4.7, trips: 15, reviews: 11,
    area: 'Gulshan-e-Iqbal', city: 'Karachi', rental: 'self', trans: 'Automatic', fuel: 'Petrol', seats: 5, type: 'sedan', color: '#D9DEE6', colorName: 'Silver Grey',
    mileage: '35,000 km', engine: '1.5L', plate: 'BUZ 23-1904', owner: 'o10', verified: true,
    features: ['Sunroof', 'Touchscreen', 'Reverse camera', 'Airbags'], weekly: 26500, monthly: 100000 },
  { id: 'c11', make: 'MG', model: 'HS', year: 2022, price: 8000, driverRate: 2500, rating: 4.8, trips: 29, reviews: 23,
    area: 'Bahria Enclave', city: 'Islamabad', rental: 'both', trans: 'Automatic', fuel: 'Petrol', seats: 5, type: 'suv', color: '#9E1B32', colorName: 'Diamond Red',
    mileage: '46,000 km', engine: '1.5L Turbo', plate: 'ICT 22-8844', owner: 'o11', verified: true,
    features: ['Panoramic sunroof', '360° camera', 'Climate control', 'Leather seats', 'Airbags'], weekly: 50000, monthly: 190000 },
  { id: 'c12', make: 'Suzuki', model: 'Wagon R', year: 2022, price: 3000, driverRate: 1800, rating: 4.6, trips: 14, reviews: 10,
    area: 'Johar Town', city: 'Lahore', rental: 'self', trans: 'Manual', fuel: 'Petrol', seats: 5, type: 'hatch', color: '#EDEDED', colorName: 'Solid White',
    mileage: '58,000 km', engine: '1.0L', plate: 'LEF 22-3091', owner: 'o5', verified: true,
    features: ['Air conditioning', 'Power windows'], weekly: 19000, monthly: 72000 },
  { id: 'c13', make: 'Honda', model: 'BR-V', year: 2021, price: 6000, driverRate: 2500, rating: 4.8, trips: 23, reviews: 19,
    area: 'Wapda Town', city: 'Lahore', rental: 'driver', trans: 'Automatic', fuel: 'Petrol', seats: 7, type: 'suv', color: '#5B5F66', colorName: 'Modern Steel',
    mileage: '76,000 km', engine: '1.5L', plate: 'LEE 21-6612', owner: 'o6', verified: true,
    features: ['7 seats', 'Air conditioning', 'Reverse camera', 'Airbags'], weekly: 38000, monthly: 145000 },
];

const CAR_REVIEWS = [
  { who: 'Saad', city: 'Lahore', stars: 5, when: 'Sep 2026', text: 'Car was spotless and exactly like the photos. Handover took 10 minutes, everything recorded in the app.' },
  { who: 'Maryam', city: 'Lahore', stars: 5, when: 'Aug 2026', text: 'Ahmed bhai was on time and very cooperative. Paid on JazzCash, no hassle at all.' },
  { who: 'Faizan', city: 'Islamabad', stars: 4, when: 'Aug 2026', text: 'Smooth drive to Murree and back. AC works great. Would rent again.' },
];

const RENTER_REVIEWS = [
  { who: 'Usman (owner)', stars: 5, when: 'Sep 2026', text: 'Returned the Sportage on time with a full tank. Very respectful renter.' },
  { who: 'Fatima (owner)', stars: 5, when: 'Jul 2026', text: 'Clean car, clear communication through the app. Recommended.' },
];

/* Owner's past rental history for the Corolla (identity details already removed). */
const PAST_OWNER_RENTALS = [
  { id: 'GR-10247', renter: 'Saad K.', dates: '21–23 Sep', days: 2, amount: 11000, commission: 1100, stars: 5 },
  { id: 'GR-10219', renter: 'Maryam A.', dates: '12–15 Sep', days: 3, amount: 16500, commission: 1650, stars: 5 },
  { id: 'GR-10188', renter: 'Faizan R.', dates: '28–31 Aug', days: 3, amount: 16500, commission: 1650, stars: 4 },
];

const EARNINGS_MONTHS = [
  { m: 'Apr', v: 22000 }, { m: 'May', v: 38500 }, { m: 'Jun', v: 27500 },
  { m: 'Jul', v: 49500 }, { m: 'Aug', v: 55000 }, { m: 'Sep', v: 65000 },
];

/* ---------- Admin mock data ---------- */
const ADMIN = {
  kpis: { users: 12480, cars: 1846, active: 142, bookings: 3912, gmv: 21450000, commission: 2145000 },
  kyc: [
    { id: 'U-8812', name: 'Rizwan Haider', city: 'Lahore', role: 'Renter', submitted: '2 hrs ago', checks: { cnic: true, licence: true, face: 0.97, phone: true }, status: 'pending' },
    { id: 'U-8809', name: 'Nimra Aslam', city: 'Karachi', role: 'Owner', submitted: '3 hrs ago', checks: { cnic: true, licence: true, face: 0.94, phone: true }, status: 'pending' },
    { id: 'U-8801', name: 'Shahzaib Ali', city: 'Rawalpindi', role: 'Renter', submitted: '5 hrs ago', checks: { cnic: true, licence: false, face: 0.61, phone: true }, status: 'pending', flag: 'Face match below threshold' },
    { id: 'U-8795', name: 'Mehwish Noor', city: 'Islamabad', role: 'Renter', submitted: 'Yesterday', checks: { cnic: true, licence: true, face: 0.98, phone: true }, status: 'pending' },
    { id: 'U-7710', name: 'Hamza Tariq', city: 'Lahore', role: 'Renter', submitted: 'Jul 2024', checks: { cnic: true, licence: true, face: 0.99, phone: true }, status: 'verified' },
    { id: 'U-5102', name: 'Ahmed Raza', city: 'Lahore', role: 'Owner', submitted: 'Mar 2024', checks: { cnic: true, licence: true, face: 0.98, phone: true }, status: 'verified' },
    { id: 'U-6630', name: 'Sana Malik', city: 'Lahore', role: 'Owner', submitted: 'Jun 2024', checks: { cnic: true, licence: true, face: 0.96, phone: true }, status: 'verified' },
    { id: 'U-8420', name: 'Adeel Butt', city: 'Lahore', role: 'Renter', submitted: 'Aug 2026', checks: { cnic: true, licence: true, face: 0.95, phone: true }, status: 'suspended', flag: 'Two unpaid rentals reported' },
  ],
  vehicles: [
    { id: 'V-3310', car: 'Toyota Corolla GLi 2019', owner: 'Nimra Aslam', city: 'Karachi', plate: 'BKX 19-2231', submitted: '1 hr ago', status: 'pending', docs: 'Registration, token tax 2026' },
    { id: 'V-3307', car: 'Suzuki Swift 2023', owner: 'Tahir Mehmood', city: 'Lahore', plate: 'LEF 23-1001', submitted: '4 hrs ago', status: 'pending', docs: 'Registration, token tax 2026' },
    { id: 'V-3301', car: 'Honda Civic 2017', owner: 'Junaid Iqbal', city: 'Islamabad', plate: 'ICT 17-5540', submitted: 'Yesterday', status: 'pending', docs: 'Registration only', flag: 'Token tax receipt missing' },
    { id: 'V-2012', car: 'Toyota Corolla Altis 2022', owner: 'Ahmed Raza', city: 'Lahore', plate: 'LEB 22-4471', submitted: 'Mar 2024', status: 'verified', docs: 'All documents' },
    { id: 'V-2240', car: 'Kia Sportage 2023', owner: 'Usman Tariq', city: 'Lahore', plate: 'LEF 23-9021', submitted: 'Jan 2024', status: 'verified', docs: 'All documents' },
    { id: 'V-2988', car: 'Suzuki Mehran 2012', owner: 'Nadeem Akhtar', city: 'Lahore', plate: 'LZK 12-8080', submitted: 'Sep 2026', status: 'rejected', docs: 'Registration', flag: 'Ownership name mismatch' },
  ],
  bookings: [
    { id: 'GR-10291', car: 'Toyota Corolla 2022', renter: 'Maha S.', owner: 'Ahmed R.', city: 'Lahore', dates: '20–22 Oct', amount: 11000, status: 'upcoming' },
    { id: 'GR-10288', car: 'Kia Sportage 2023', renter: 'Talha M.', owner: 'Usman T.', city: 'Lahore', dates: '1–4 Oct', amount: 25500, status: 'upcoming' },
    { id: 'GR-10280', car: 'Hyundai Tucson 2023', renter: 'Areeba K.', owner: 'Hira S.', city: 'Karachi', dates: '28 Sep–2 Oct', amount: 36000, status: 'active' },
    { id: 'GR-10277', car: 'Honda Civic 2022', renter: 'Danish A.', owner: 'Ayesha K.', city: 'Islamabad', dates: '29 Sep–1 Oct', amount: 15000, status: 'active' },
    { id: 'GR-10247', car: 'Toyota Corolla 2022', renter: 'Saad K.', owner: 'Ahmed R.', city: 'Lahore', dates: '21–23 Sep', amount: 11000, status: 'completed' },
    { id: 'GR-10239', car: 'Honda City 2021', renter: 'Rabia F.', owner: 'Sana M.', city: 'Lahore', dates: '19–20 Sep', amount: 4800, status: 'completed' },
    { id: 'GR-10233', car: 'Suzuki Cultus 2021', renter: 'Ali H.', owner: 'Bilal A.', city: 'Lahore', dates: '18 Sep', amount: 3200, status: 'cancelled' },
    { id: 'GR-10226', car: 'MG HS 2022', renter: 'Adeel B.', owner: 'Omer F.', city: 'Islamabad', dates: '14–17 Sep', amount: 24000, status: 'disputed' },
  ],
  wallets: [
    { owner: 'Imran Qureshi', cars: 2, balance: 12400, pending: 4200 },
    { owner: 'Usman Tariq', cars: 1, balance: 8900, pending: 2550 },
    { owner: 'Hira Siddiqui', cars: 1, balance: 6100, pending: 3600 },
    { owner: 'Sana Malik', cars: 1, balance: 2300, pending: 480 },
    { owner: 'Omer Farooq', cars: 1, balance: 450, pending: 2400, low: true },
  ],
  disputes: [
    { id: 'D-541', type: 'Damage', booking: 'GR-10226', title: 'Rear door dent after return', parties: 'Omer F. vs Adeel B.', opened: '14 Sep', status: 'open', priority: 'High' },
    { id: 'D-538', type: 'Payment', booking: 'GR-10210', title: 'Renter says JazzCash sent, owner not received', parties: 'Kamran B. vs Sobia R.', opened: '11 Sep', status: 'open', priority: 'Medium' },
    { id: 'D-533', type: 'Fraud', booking: '—', title: 'Owner asked renter to pay outside the app', parties: 'Report by renter', opened: '9 Sep', status: 'investigating', priority: 'High' },
    { id: 'D-529', type: 'Cancellation', booking: 'GR-10198', title: 'Owner cancelled 2 hrs before pickup', parties: 'Zain A. vs Hamid L.', opened: '6 Sep', status: 'resolved', priority: 'Low' },
  ],
  weekly: [
    { w: 'W32', v: 212 }, { w: 'W33', v: 238 }, { w: 'W34', v: 251 }, { w: 'W35', v: 244 },
    { w: 'W36', v: 279 }, { w: 'W37', v: 301 }, { w: 'W38', v: 326 }, { w: 'W39', v: 348 },
  ],
  cities: [ { c: 'Lahore', v: 1684 }, { c: 'Karachi', v: 1022 }, { c: 'Islamabad', v: 704 }, { c: 'Rawalpindi', v: 358 }, { c: 'Faisalabad', v: 144 } ],
  popular: [ { car: 'Toyota Corolla', v: 612 }, { car: 'Honda City', v: 488 }, { car: 'Suzuki Cultus', v: 401 }, { car: 'Kia Sportage', v: 297 }, { car: 'Toyota Yaris', v: 263 } ],
  revenue: [ { m: 'Apr', v: 1.12 }, { m: 'May', v: 1.38 }, { m: 'Jun', v: 1.51 }, { m: 'Jul', v: 1.79 }, { m: 'Aug', v: 1.96 }, { m: 'Sep', v: 2.15 } ],
};
