ONEPAY 

Every Bill. Every Subscription. One Place.

OnePay is an AI-powered personal finance and recurring payment management platform designed to help users organize bills, subscriptions, EMIs, credit card payments, insurance premiums, and recurring financial commitments from one centralized dashboard.

It combines payment tracking, intelligent bill discovery, reminders, financial analytics, and Google integration capabilities to make personal payment management simpler, smarter, and more organized.

Project Overview

Managing multiple subscriptions, utility bills, credit card payments, insurance premiums, and EMIs across different platforms can become confusing. Users may forget renewal dates, miss payment deadlines, overlook recurring expenses, or underestimate their monthly financial commitments.

OnePay addresses this problem by bringing recurring financial information into one organized platform.

Users can manage payment records, track due dates, review payment history, understand recurring expenses, and use AI-assisted capabilities to simplify financial organization.

The long-term vision is to build a unified financial management experience that combines automation, intelligent assistance, integrations, and clear financial insights.

 Problem Statement

Traditional payment management is fragmented across banking applications, subscription services, email notifications, spreadsheets, and personal reminders.

Common challenges include:

- Forgetting subscription renewal dates.
- Missing bill and EMI due dates.
- Losing track of recurring payments.
- Underestimating monthly and annual subscription costs.
- Manually entering the same payment information repeatedly.
- Finding bill information buried in email messages.
- Having limited visibility into upcoming financial commitments.
- Confusing a recorded payment with a genuinely automated payment.

OnePay aims to address these challenges through centralized tracking, intelligent assistance, reminders, and financial analytics.

 Key Features

1.  Unified Financial Dashboard
abh
A centralized dashboard designed to provide an overview of personal payment commitments.

- Upcoming bills and payment deadlines.
- Recurring subscription expenses.
- Outstanding and overdue payment records.
- Recent payment activity.
- Financial summaries and spending insights.
- Quick access to important payment-management features.

2.  Subscription Management

Organize recurring digital services and other subscription commitments.

- Record subscription names and amounts.
- Track billing frequencies and renewal dates.
- Organize subscriptions by category.
- Review subscription status.
- Identify recurring costs that may need attention.

3. Bills, EMIs, and Credit Card Tracking

Bring different payment obligations into one place.

Examples include:

- Electricity, water, internet, and mobile bills.
- Credit card payments.
- Loan installments and EMIs.
- Insurance premiums.
- Digital subscriptions.
- Other recurring financial commitments.

The platform is designed to help users monitor due dates, payment status, and recurring expenses without switching between multiple tracking systems.

4. AI-Powered Financial Assistant

OnePay includes an AI-assistant component intended to make financial information easier to understand and manage.

Potential capabilities include:

- Answering questions about recorded financial information.
- Helping users understand recurring expenses.
- Providing contextual assistance with payment records.
- Supporting financial organization and decision-making.
- Explaining upcoming payment commitments.

AI-generated insights depend on the data available to the application and the configured AI service. They are informational and should not be treated as professional financial advice.

5. Gmail Bill Discovery and Synchronization

OnePay includes a Gmail integration component intended to help discover relevant billing and subscription information from authorized email messages.

The intended workflow includes:

1. Connect a supported Google account with user consent.
2. Access the permitted email information.
3. Identify potentially relevant billing or renewal messages.
4. Extract useful payment details where supported.
5. Present discovered information for user review.
6. Allow users to confirm information before adding it to their records.
7. Track synchronization progress and relevant status information.

The integration is designed to reduce manual data entry and make email-based payment information easier to organize.

Note: Gmail authorization, API permissions, production configuration, and successful synchronization must be verified in the deployed environment before describing this integration as fully operational.

6. Google Calendar Integration

OnePay includes a calendar synchronization component intended to connect payment deadlines with a user's calendar.

The intended capabilities include:

- Representing upcoming bills and renewals as calendar events.
- Helping users visualize payment deadlines.
- Keeping relevant due dates accessible alongside other commitments.
- Supporting synchronization of payment-related calendar information.

Actual Google Calendar authorization and synchronization depend on valid configuration and successful API execution.

7.  AutoPay and Payment Automation Tracking

OnePay distinguishes between payments that users manage manually and payments that are marked as automated.

The application is designed to help users:

- Record AutoPay-related information.
- Track payment-management status.
- Review upcoming automatic debit dates where supported.
- Identify payment records requiring attention.
- Organize manual and automated payment commitments.

Important: Tracking an AutoPay arrangement is different from executing an automatic bank payment. Actual payment execution requires a supported payment provider, authorization, secure integration, and transaction verification. Do not assume that OnePay automatically transfers money unless this functionality has been implemented and tested.

8.  Reminders and Notifications

A reminder-oriented workflow designed to help users stay aware of payment deadlines.

- Upcoming payment reminders.
- Due-date visibility.
- Overdue payment awareness.
- Payment-related notifications.
- Reminder configuration and scheduling where supported.

Reliable automated delivery depends on the configured backend jobs and notification services.

9.  Financial Analytics

Make recurring expenses easier to understand through visual summaries.

- Monthly recurring expense summaries.
- Annualized recurring cost estimates.
- Category-based expense breakdowns.
- Subscription cost visibility.
- Payment trends and financial summaries.

These insights can help users identify spending patterns and make more informed decisions.

10.  Payment History and Expense Tracking

Maintain a clearer view of recorded financial activity.

- Payment history.
- Payment status updates.
- Expense records.
- Receipt-related functionality where supported.
- Outstanding payment visibility.
- Searchable financial records.

11. Templates, Search, and Export

Designed to make repeated payment management more convenient.

- Reusable payment templates.
- Search and filtering.
- Organized payment categories.
- CSV export where supported.
- Settings and privacy controls.

12.  Modern User Experience

OnePay is designed around a modern fintech interface.

- Responsive layouts.
- Dashboard-oriented navigation.
- Clear payment summaries.
- Modern cards, charts, and interface components.
- Light and dark theme support where configured.
- Indian Rupee (₹) as the default currency where configured.

 How OnePay Works

Step 1 — Register or Sign In

Create an account or sign in using the authentication methods supported by the deployed application.

Step 2 — Access Your Dashboard

Review the available financial overview and upcoming payment commitments.

Step 3 — Add Bills and Subscriptions

Create payment records with relevant details, such as name, amount, category, frequency, and due date.

Step 4 — Organize Payment Schedules

Review upcoming renewals, bills, EMIs, and other recurring obligations.

Step 5 — Use AI-Assisted Features

Use the configured assistant to help understand or organize available financial information.

Step 6 — Connect Supported Integrations

Authorize Gmail or Google Calendar features if they are enabled and configured.

Step 7 — Review Your Financial Insights

Use payment history, reminders, and analytics to maintain a clearer view of recurring financial commitments.

 Technology Stack

The project source includes the following technologies and integration components.

Technology| Purpose
React| Component-based user interface
Vite| Frontend development and build tooling
JavaScript / JSX| Application logic and interface components
Tailwind CSS| Styling and responsive layouts
Base44 SDK| Application backend and data integration in the current project
Base44 Functions| Server-side functionality where configured
AI service integration| AI-assisted functionality, subject to configuration
Google APIs| Gmail and Calendar integration components, subject to authorization
Vercel| Frontend deployment and hosting, where configured
Git and GitHub| Version control and source code management

The exact production stack depends on the deployed configuration. Do not assume that a separate PostgreSQL database, Supabase backend, payment gateway, or production Google OAuth setup exists unless it is present in the actual project.

 Security and Privacy

Financial information deserves careful handling.

OnePay's security goals include:

- Authentication through supported account-access mechanisms.
- Appropriate authorization for private financial records.
- Explicit user consent for external account integrations.
- Restricting access to only the information needed for a feature.
- Secure handling of API credentials and access tokens.
- Clear handling of integration failures and disconnected accounts.
- Avoiding the exposure of sensitive financial information in public interfaces.

Production security must be verified against the actual authentication, storage, permissions, and deployment implementation. Never commit secrets, API keys, OAuth client secrets, or private environment files to GitHub.


 What Makes OnePay Different?

OnePay is designed to bring several related financial-management workflows together rather than focusing on a single type of expense.

Its differentiating direction includes:

- A unified view of bills, subscriptions, and recurring obligations.
- AI-assisted financial organization.
- Gmail-based bill discovery as an integration capability.
- Google Calendar synchronization as an integration capability.
- AutoPay status tracking alongside manually managed payments.
- Payment reminders and expense analytics.
- A modern, responsive fintech interface.
- A roadmap toward a more automated and connected payment-management experience.

The goal is to reduce fragmented financial tracking and make recurring payment management easier to understand.
 Setup and Configuration
Prerequisites
- Node.js and npm.
- Git.
- Access to the configured backend and required services.
- Appropriate API credentials for any optional integrations.

Run the Frontend Locally

Clone the repository:
git clone https://github.com/Aadhi-272007/One-Pay.git
cd One-Pay
Install dependencies:

npm install

Configure the environment variables required by the application. Use the project's environment-variable documentation and example configuration, if available.

For example, a Base44-based setup may require variables such as:

VITE_BASE44_APP_ID=your_base44_app_id
VITE_BASE44_FUNCTIONS_VERSION=preview
VITE_BASE44_SERVER_URL=https://base44.app

Only add variables required by your actual project. Do not replace real configuration values with guesses, and never publish private credentials.

Start the development server:

npm run dev

Create a production build:

npm run build

Note: Successful compilation does not guarantee that authentication, Gmail synchronization, calendar integration, AI requests, or automatic payment execution will work in production. Configure and test each integration separately.


Current Development Status

OnePay includes a frontend and application components for centralized payment management, subscription tracking, AI-assisted functionality, reminders, financial analytics, and external integrations.

Some features depend on backend configuration, permissions, external API credentials, or successful deployment.

Before a production release, verify:

- Registration and authentication.
- Persistent storage of user-specific records.
- Bill and subscription create, read, update, and delete operations.
- Dashboard and analytics calculations.
- Reminder scheduling and notification delivery.
- AI service connectivity and error handling.
- Gmail authorization and synchronization.
- Google Calendar synchronization.
- AutoPay tracking versus actual payment execution.
- Data privacy and access control.

This distinction keeps the project documentation accurate and transparent.


 Future Improvements

Potential future enhancements include:

- More reliable recurring payment automation through supported payment providers.
- Improved AI-based bill extraction and subscription insights.
- Better duplicate detection during email synchronization.
- More robust synchronization status and retry handling.
- Advanced spending trends and budget recommendations.
- Enhanced payment failure and overdue alerts.
- More comprehensive audit logs and integration controls.
- Expanded accessibility and mobile usability.
- Stronger automated testing and production monitoring.
These are proposed improvements unless already implemented and verified.


Project Objective

The objective of OnePay is to make personal payment management more organized, transparent, and convenient by combining recurring payment tracking, AI assistance, reminders, financial insights, and supported integrations into one platform.

By bringing scattered financial commitments together, OnePay aims to help users understand what they owe, when payments are due, and how recurring expenses affect their overall financial picture.

Repository

GitHub: "Aadhi-272007/One-Pay" (https://github.com/Aadhi-272007/One-Pay)

Live Application:https://one-pay-track.base44.app