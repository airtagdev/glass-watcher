

## Stock & Crypto Tracker — Native iPhone App

### Overview
A mobile-first stock and crypto ticker tracker with a liquid glass UI aesthetic, built as a PWA-capable web app wrapped with Capacitor for native iPhone deployment. Data from free APIs (Yahoo Finance proxy + CoinGecko). Watchlist stored in localStorage.

### Pages & Navigation
- **Bottom tab bar** with 4 tabs: Home, Stocks, Crypto, Search (icons + labels, iOS-style)
- **Home** — Displays user's watchlist with live prices, daily % change, mini sparkline
- **Stocks** — Browse/search stock tickers, view details
- **Crypto** — Browse/search crypto tickers, view details  
- **Search** — Universal search across stocks & crypto

### Ticker Detail View
When tapping a ticker, show a detail card/modal with:
- Current price (USD)
- Daily change ($ and %)
- 52-week high/low
- Market cap
- Volume
- "Add to Watchlist" / "Remove from Watchlist" button

### UI Style — Liquid Glass
- Frosted glass cards with `backdrop-blur`, semi-transparent backgrounds
- Subtle gradients and soft shadows
- Green/red color coding for gains/losses
- Dark theme by default (deep navy/black background)
- Smooth animations and transitions
- SF-style rounded corners and spacing

### Data Sources
- **Stocks**: Yahoo Finance via a free proxy API (no key needed)
- **Crypto**: CoinGecko free API (no key, rate-limited)
- Polling every 30-60 seconds for watched tickers

### Watchlist
- Stored in localStorage
- Add/remove from detail view or swipe-to-delete on home
- Persists across app sessions

### Capacitor Setup
- Configure Capacitor for iOS deployment
- User will need a Mac with Xcode to build and run on their iPhone

