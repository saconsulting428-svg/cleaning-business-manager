# GAARI — Pakistan car rental marketplace (prototype)

*Apni car se kamao. Kisi ki bhi car rent karo.*

A high-fidelity, clickable HTML/CSS/vanilla-JS prototype of a peer-to-peer car rental
marketplace for Pakistan. It covers the renter app, the owner app and an admin console.
There is no backend: all data is mock data, and demo state is saved in `localStorage`.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
cd gaari
python3 -m http.server 8080
# open http://localhost:8080
```

On desktop the app shows inside a 390 × 844 Android frame, with the demo script beside it.
On a phone it runs full screen.

## Demo mode

The dashed **DEMO MODE** button (bottom right) and the side panel switch between
**Renter**, **Owner** and **Admin**, list the demo script with the next step highlighted,
set the owner wallet to Rs. 500 (to show the low-balance block) and reset the demo.
When one side does something, a small banner shows what the other side received.

## Full demo flow

**Renter:** Home → Find a car → filters → Toyota Corolla → Self drive / With driver → Book
→ Request booking (Rs. 0 platform fee, pay owner directly, no deposit)
→ *(owner accepts)* → Go to rental day → I’ve arrived → Handover mode
→ *(owner inspection)* → Accept vehicle condition → *(keys handed over)* → Vehicle received
→ Active trip (live location from the renter’s phone, emergency, contact owner, chat,
extend, report accident) → *(owner completes return)* → Rental completed → Review.

**Owner:** Dashboard → booking request with protected renter profile → Accept
(blocked with a top-up prompt if the commission wallet is too low) → temporary handover
identity → Start handover (6 photos, mileage, fuel, damage) → Vehicle handed over
→ active rental with extension request → Complete return → Before vs after → Return accepted
→ 10% commission deducted from wallet → Wallet, earnings chart, share earnings.
Also: My cars (rental type, price, pause), availability calendar, 6-step Add car wizard.

**Admin:** Dashboard, Users & KYC, Vehicles (approve the car the owner just added),
Bookings, Commission (owner wallets, transactions), Disputes (the accident the renter
reported appears here), Analytics.

## Business rules shown in the UI

- Renters pay **Rs. 0 platform fee** and pay the owner directly (cash, JazzCash, Easypaisa, bank).
- GAARI earns **10% commission from the owner**, deducted from the owner’s commission wallet after the rental.
- **No security deposit** anywhere. Trust comes from CNIC, licence, face and phone verification,
  trust score, digital agreement, before/after inspection, reviews and support.
- Owners never see the renter’s CNIC image or number before the booking. Verified handover
  details unlock only at “I’ve arrived” and disappear when the rental closes.
- Location during a trip is the **renter’s phone location**, shared with permission. No vehicle GPS.
- Phone numbers typed into chat are masked; calls go through a masked in-app line.

## Files

```
index.html        app shell, device frame, demo side panel
style.css         all styles (design tokens at the top)
script.js         state, navigation, shared components, demo controls
js/data.js        mock cars, owners, renter, admin data
js/graphics.js    icons, logo, SVG car illustrations, avatars, mock Lahore map
js/renter.js      renter screens + shared chat and profile
js/owner.js       owner screens: requests, handover, return, wallet, cars, add car
js/admin.js       admin console
assets/           logo and favicon
```
