<div align="center">
  <h1>💤 Adjust Sleep Calculator</h1>
  <p><strong>A science-backed jet lag calculator to help you master your circadian rhythm.</strong></p>

  <a href="https://adjustsleep.dpdns.org">
    <img src="https://img.shields.io/badge/Live-Site-success?style=for-the-badge&logo=vercel" alt="Live Site">
  </a>
  <a href="https://astro.build/">
    <img src="https://img.shields.io/badge/Built_with-Astro-ff5a03?style=for-the-badge&logo=astro&logoColor=white" alt="Built with Astro">
  </a>
  <a href="https://pages.cloudflare.com/">
    <img src="https://img.shields.io/badge/Deployed_on-Cloudflare_Pages-f38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Deployed on Cloudflare Pages">
  </a>
</div>

<br />

## 📸 Preview

![Screenshot Placeholder](public/og-image.jpg) *(Replace this path with your actual application screenshot)*

## ✨ Features

Adjust Sleep is a completely local, zero-API application designed to help travelers beat jet lag using Phase Response Curve science and melatonin timing protocols.

- 🌍 **12,000+ Global Cities:** Instantly calculate time differences and local zones with offline support.
- 🕒 **Core Body Temp (CBTmin) Tracking:** Calculates the precise window your body is most receptive to light/dark exposure.
- ☀️ **Light & Melatonin Protocols:** Generates exact daily windows for when to seek light, avoid light, and take melatonin based on eastward or westward travel algorithms.
- 📊 **Interactive Gantt Timeline:** A visually stunning, mathematically perfect 24-hour horizontal timeline that dynamically visualizes your phase shifting over a 4-day period.
- 📱 **Fully Responsive:** Vercel-inspired stark, minimalist aesthetic that scales perfectly across mobile and desktop viewports.
- 🔒 **Privacy-First:** Zero external APIs. Your travel and sleep data never leaves your browser.

## 🛠 Tech Stack

- **[Astro](https://astro.build/)** - Extremely fast static site generation
- **TypeScript** - Strongly-typed, bug-free circadian algorithms
- **Vanilla CSS (Tailwind v4)** - Utility-first styling for complex, responsive UI components
- **[Cloudflare Pages](https://pages.cloudflare.com/)** - High-performance edge deployment

## 🚀 Getting Started

To run the Adjust Sleep Calculator locally on your machine, follow these steps:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tafsir99-gg/adjustsleep.git
   cd adjustsleep
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:4321`.

## ☁️ Deployment

This project is configured to automatically deploy via Cloudflare Pages:

1. Push your changes to the `main` branch on GitHub.
2. Cloudflare Pages will automatically detect the push, execute `npm run build`, and serve the compiled static output from the `/dist` directory.
3. Your updates will be live almost instantly at [adjustsleep.dpdns.org](https://adjustsleep.dpdns.org).

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
