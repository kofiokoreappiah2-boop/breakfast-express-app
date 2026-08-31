# Einyornose Morning Bites

Build a modern, mobile-first food ordering web app called Einyornose, a breakfast business and subsidiary of Neighbourhood Pulse.

BUSINESS

Business name: Einyornose
Parent/subsidiary: Neighbourhood Pulse
Business type: Breakfast food delivery service.

The website should primarily serve students and people within the listed delivery locations. The experience should be fast, simple, friendly and optimized for ordering from a smartphone.

The brand should feel youthful, clean, warm, trustworthy and appetizing. Do not make it look like a large corporate restaurant.

PRODUCTS AND PRICES

Create these menu items:

Hausa Porridge — GH₵5.00

Puff Puff / Bofloat — Small — GH₵4.00

Puff Puff / Bofloat — Large — GH₵6.00

Koose — GH₵1.50

Roasted Groundnut — GH₵1.00

Sachet Milk — GH₵3.00

Customers must be able to select quantities for every item.

Use Ghana cedi (GH₵) throughout the application.

ORDERING FLOW

The customer journey should be:

HOME/MENU → CART → CHECKOUT → ORDER CONFIRMATION

HOME / MENU

Create an attractive mobile-first homepage.

Header:

Einyornose logo/name

Simple navigation

Cart icon showing number of items

Hero section:
"Einyornose"
"Fresh breakfast. Delivered to you."
"Your neighbourhood breakfast, made easy."

Display the available breakfast items as attractive food cards.

Each food card should contain:

Product name

Short description

Price

Quantity selector

Add-to-cart button

Display the current cart total prominently.

Include a clear CTA:
"Order Now"

DELIVERY LOCATIONS

Customers must select ONE delivery location from a dropdown.

Available locations:

PSI Hall

Medical Hall

CTC Hall

SRC Hall

Superannuation

H. S. Amouno Kuofi Medical Village

Do not allow customers to enter arbitrary delivery locations.

DELIVERY WINDOWS

Customers must select ONE delivery period:

6:30 AM – 7:15 AM

9:30 AM – 10:15 AM

4:30 PM – 5:30 PM

The selected delivery window must be stored with the order.

CHECKOUT

Create a simple checkout form containing:

Customer name

Phone number

Delivery location

Delivery window

Additional delivery instructions

Payment method

Payment methods:

Mobile Money

Payment on Delivery

For Mobile Money display:

MoMo Number: 0598473398
Account Name: Appiah Kofi Okore

For Version 1, do NOT attempt to automatically process the MoMo transaction. Simply display the payment details and allow the customer to select Mobile Money as their payment method.

Show a complete order summary before submission.

Calculate the order subtotal and total automatically.

ORDER VALIDATION

Before an order can be submitted:

Customer name is required.

Phone number is required.

Delivery location is required.

Delivery window is required.

Payment method is required.

At least one product must be in the cart.

Display friendly validation messages.

ORDER CONFIRMATION

After successful submission display:

"Order Received! 🎉"

Generate a unique order number such as:

EN-1001

Show:

Order number

Customer name

Items ordered

Total amount

Delivery location

Delivery window

Payment method

Message:

"Thank you for ordering from Einyornose. Your breakfast will be delivered during your selected delivery period."

Add a button:
"Back to Menu"

DATABASE

Use Supabase as the backend.

Create appropriate database tables for:

products

Fields:

id

name

description

size

price

available

created_at

orders

Fields:

id

order_number

customer_name

customer_phone

delivery_location

delivery_window

payment_method

additional_instructions

subtotal

total

status

created_at

order_items

Fields:

id

order_id

product_id

quantity

unit_price

subtotal

Use proper foreign-key relationships.

Store the price at the time of ordering in order_items so that historical orders do not change if the product price is changed later.

ORDER STATUS

Orders should support these statuses:

New

Confirmed

Preparing

Out for Delivery

Delivered

Cancelled

Default status for a new order should be "New".

ADMIN DASHBOARD

Create a protected admin dashboard.

The dashboard should allow the business owner to:

View all orders

View today's orders

View individual order details

Change order status

Filter orders by delivery window

Filter orders by delivery location

Filter orders by status

View total sales

View number of orders

Display orders in an easy-to-read table on desktop and cards on mobile.

Example:

Order #EN-1001
Customer: Kofi
Location: Medical Hall
Delivery: 6:30 AM – 7:15 AM
Total: GH₵20
Status: New

Allow the administrator to update the status using a dropdown.

ADMIN SECURITY

The admin dashboard must NOT be publicly accessible.

Implement Supabase authentication for the administrator.

Customers should NOT need to create an account to place an order.

Use appropriate Row Level Security policies so customers cannot access other customers' orders.

WHATSAPP NOTIFICATION PREPARATION

Structure the application so that WhatsApp notifications can be integrated later.

When a new order is created, prepare a formatted notification containing:

🔔 NEW EINYORNOSE ORDER

Order: #EN-XXXX

Customer: [name]
Phone: [phone]
Location: [location]
Delivery: [delivery window]

ORDER:
[item] × [quantity] — GH₵[subtotal]

TOTAL: GH₵[total]

Payment: [payment method]

Instructions: [instructions]

For Version 1, do not use an unofficial WhatsApp automation method. Build the application so a proper WhatsApp Business API integration can be added later.

BUSINESS PHONE

Business WhatsApp/contact number:

0555992497

Display this appropriately on the website as the business contact number.

DESIGN

Use a clean, modern food-ordering interface.

Prioritize:

Mobile responsiveness

Large readable text

Attractive food imagery/placeholders

Clear pricing

Large touch-friendly buttons

Simple navigation

Minimal checkout friction

Fast loading

Use Ghana cedi formatting consistently.

Do not overwhelm the homepage with unnecessary sections.

Suggested homepage structure:

Header

Hero

Breakfast menu

How ordering works

Delivery locations

Contact/WhatsApp

Footer

IMPORTANT

Build the application as a functional working web app, not merely a static mockup.

Use reusable components.

Keep the code clean and maintainable.

Do not hard-code orders or totals.

Products, prices, availability and orders should be stored in Supabase.

Ensure all calculations are performed reliably.

Before considering the project complete, test:

Adding products to cart

Changing quantities

Removing products

Correct subtotal calculation

Correct total calculation

Checkout validation

Successful order creation

Unique order number generation

Admin order visibility

Admin status changes

Mobile responsiveness

Unauthorized access to admin pages

Start by creating the complete Version 1 application and Supabase database structure.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6c5a0bdf-a2b1-46a7-994b-a7755a7305b9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
