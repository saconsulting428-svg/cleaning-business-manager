# STOCKFLOW — Inventory & Sales Manager

StockFlow is an inventory and sales management application for small businesses that sell physical products. It runs entirely in your web browser. There is nothing to install, no account to create and no monthly subscription.

Open `index.html` and you're ready to manage products, stock, sales, customers, suppliers and purchases, and to see how your business is performing.

---

## Features

**Dashboard**
- Key figures: Total Products, Stock Value, Today's Sales, Monthly Revenue, Monthly Profit and Low Stock Items
- Sales Overview chart (last 30 days) and Revenue vs. Profit chart (last 6 months)
- Recent Sales, Low Stock Products, Top Selling Products and Recent Customers
- Quick actions: Add Product, New Sale, Add Customer, Add Purchase

**Products**
- Add, edit, delete, search, filter (category, stock level, status) and sort
- Profit per unit and profit margin are calculated automatically
- Stock status badges: In Stock, Low Stock, Out of Stock
- Product details with sales totals and recent stock activity

**Inventory**
- Totals for inventory items, inventory value, low stock and out of stock
- Stock In, Stock Out and Adjust Stock, each with a reason, date and notes
- Full inventory history (date, product, type, quantity, previous stock, new stock, reason)

**Sales**
- Sales with several products each, plus customer, date, discount (% or fixed amount), tax, payment method and payment status
- Subtotal, discount, tax, grand total and profit are calculated automatically
- Completing a sale lowers stock, adds the sale to the customer's history and updates the dashboard and reports
- View a sale (printable receipt), edit it, update its payment, or delete it. Deleting a sale puts its stock back.

**Customers**
- Add, edit, delete, search and filter (city, outstanding balance, business or individual)
- Customer details show total purchases, total spent, outstanding balance and purchase history

**Suppliers**
- Add, edit, delete and search
- Supplier details show the supplier's products and purchase history

**Purchases**
- Record stock bought from a supplier, with several products each
- Completing a purchase raises stock and inventory value automatically
- Optionally update product cost prices to the latest purchase cost

**Reports**
- Total Revenue, Total Profit, Total Sales, Inventory Value and Outstanding Payments
- Charts: Revenue Over Time, Profit Over Time, Sales by Category and Top Selling Products
- Best selling products and category breakdown tables
- Period filters: Today, This Week, This Month, Last Month, Last 3 Months, This Year
- Export the report to CSV, or print it

**Settings**
- Business name, phone, email, address and website (shown on sale receipts)
- Currency (default USD), default tax rate and date format
- Export and restore backups
- Reset Application Data

**Also included:** CSV export for products, sales, customers, suppliers, purchases and inventory history; form validation; confirmation before every destructive action; notifications after each action; and a layout that works on desktop, tablet and phone.

---

## System Requirements

- A modern web browser: Google Chrome, Microsoft Edge, Mozilla Firefox or Safari (recent versions)
- Windows, macOS, Linux, ChromeOS, iPadOS or Android
- No internet connection is required. StockFlow works fully offline.

---

## How to Open the Application

1. Unzip the StockFlow folder somewhere on your computer, for example your Documents folder.
2. Open the folder and double-click **`index.html`**.
3. StockFlow opens in your default web browser.

Keep the files together: `index.html` needs the `css` and `js` folders next to it.

**Tip:** bookmark the page, or always open StockFlow from the same `index.html` in the same browser. Your data is saved per browser (see below).

### Folder contents

```
stockflow/
├── index.html      ← open this file
├── README.md       ← this guide
├── css/
│   └── style.css   ← visual design
└── js/
    ├── data.js     ← data storage and calculations
    ├── ui.js       ← dialogs, notifications and charts
    └── app.js      ← screens and features
```

---

## How Your Data Is Stored

StockFlow stores all of its data **locally in your web browser** using the browser's built-in storage (`localStorage`).

- **No cloud database.** Your data is never uploaded to a server or shared with anyone.
- Data stays after you refresh the page, close the browser or restart the computer.
- Data belongs to **one browser on one computer**. If you open StockFlow in a different browser (for example Firefox instead of Chrome) or on another device, you start with separate data.
- On first launch, StockFlow fills in a set of starter business records (products, customers, suppliers, sales and purchases) so you can see how everything works. They are created **only once**, when no saved data exists. You can edit or delete them, or clear everything with **Settings → Reset Application Data**.

### How amounts are calculated

| Figure | Formula |
|---|---|
| Profit per unit | Selling Price − Cost Price |
| Profit margin | Profit ÷ Selling Price × 100 |
| Subtotal | Sum of (quantity × unit price) for every line |
| Discount | Percentage of the subtotal, or a fixed amount |
| Tax | (Subtotal − Discount) × tax rate |
| Grand Total | Subtotal − Discount + Tax |
| Revenue | Subtotal − Discount (tax is excluded, because it isn't income) |
| Sale profit | Revenue − (quantity × cost price) for every line |
| Inventory value | Stock quantity × cost price, summed over all products |

"Today's Sales" and the sales table show grand totals, including tax. Revenue and profit figures exclude tax.

---

## Backing Up Your Data

Back up regularly, especially before clearing browser data or changing computers.

**Create a backup**
1. Go to **Settings → Data Management**.
2. Click **Export Backup**.
3. A file named like `stockflow-backup-2026-09-28.json` downloads. Keep it somewhere safe, such as a USB drive or a cloud folder of your choice.

**Restore a backup**
1. Go to **Settings → Data Management**.
2. Click **Restore Backup** and choose your `.json` backup file.
3. Confirm. The current data is replaced with the backup's contents.

To move StockFlow to another computer, export a backup on the old one, copy the StockFlow folder and the backup file to the new one, open `index.html`, and restore the backup.

You can also export individual lists as CSV files (Products, Sales, Customers, Suppliers, Purchases, Inventory History and Reports) to open in Excel, Google Sheets or Numbers.

---

## Resetting Application Data

1. Go to **Settings**.
2. In the **Danger Zone**, click **Reset Application Data**.
3. Confirm in the dialog.

This permanently deletes all products, inventory history, sales, customers, suppliers and purchases, and restores the default settings. It cannot be undone, so export a backup first if you might need the data. After a reset StockFlow starts empty and does not re-create the starter records.

---

## Troubleshooting

**The page looks unstyled or nothing appears.**
Make sure the `css` and `js` folders are in the same folder as `index.html`, and that you unzipped the download rather than opening it from inside the ZIP file.

**My data disappeared.**
- Check that you're using the same browser (and browser profile) as before.
- Private or incognito windows delete their storage when closed. Use a normal window.
- Clearing browsing data or "cookies and site data" also deletes StockFlow's data. Restore from your latest backup.

**A message says browser storage is disabled or full.**
Your browser is blocking local storage, or it's full. Allow site data for local files in your browser settings, don't use private mode, and export a backup. If storage is full, export a backup and delete old records you no longer need.

**I can't add a product to a sale.**
Only **Active** products with stock available can be sold. Restock the product (Inventory → Stock In, or record a Purchase) or set its status to Active.

**I can't delete a purchase.**
If some of the units received on that purchase have already been sold, deleting it would make stock negative. Adjust the stock instead, or delete the related sales first.

**Changes made in another tab don't show up.**
StockFlow syncs open tabs automatically. If a tab still looks out of date, refresh it.

**Printing a receipt.**
Open a sale, click **Print**, and choose your printer or "Save as PDF".

---

## Important Limitations

- **Single user, single device.** StockFlow is designed for one person using one browser. It doesn't sync between computers or people. Use backups to move data.
- **No cloud storage.** Data exists only in your browser. If the browser's data is cleared, it's lost unless you have a backup.
- **Browser storage size.** Browsers allow roughly 5 MB of local storage, which is enough for thousands of products and sales. Very large businesses may reach this limit over time.
- **No online payments, email sending or user logins.** StockFlow is a record-keeping tool. Payments are recorded manually.
- **Tax** is one rate per sale. Complex tax rules such as multiple rates per item aren't supported.
- **Not accounting software.** Figures are for day-to-day management. Consult your accountant for official financial and tax reporting.
