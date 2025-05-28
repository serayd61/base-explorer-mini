import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement } from "chart.js";
import saveAs from "file-saver";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

function App() {
  const [tokens, setTokens] = useState([]);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [volumeFilter, setVolumeFilter] = useState(0);
  const [sortByVolume, setSortByVolume] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    async function fetchTokens() {
      try {
        const response = await fetch("https://api.dexscreener.com/latest/dex/search?q=base");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const sortedPairs = data.pairs
          .filter(pair => pair.pairCreatedAt)
          .sort((a, b) => b.pairCreatedAt - a.pairCreatedAt)
          .slice(0, 30)
          .map(pair => {
            const liquidityUSD = Number(pair.liquidity?.usd || 0);
            const volume24hUSD = Number(pair.volume?.h24 || 0);
            const isScam = liquidityUSD < 1000;
            const priceHistory = Array.from({ length: 24 }, () => Math.random() * 2 + 0.5); // demo veri
            return {
              name: pair.baseToken?.name || "Unknown",
              symbol: pair.baseToken?.symbol || "N/A",
              address: pair.baseToken?.address || "N/A",
              liquidity: `$${liquidityUSD.toLocaleString()}`,
              volume24h: `$${volume24hUSD.toLocaleString()}`,
              created: new Date(pair.pairCreatedAt).toLocaleString(),
              isScam,
              rawVolume: volume24hUSD,
              priceHistory,
              url: pair.url || `https://dexscreener.com/base/${pair.pairAddress}`,
            };
          });

        setTokens(sortedPairs);
      } catch (error) {
        console.error("Error fetching token data:", error);
        setError("Failed to fetch token data.");
      }
    }

    fetchTokens();
  }, []);

  const toggleFavorite = (address) => {
    setFavorites(prev =>
      prev.includes(address) ? prev.filter(a => a !== address) : [...prev, address]
    );
  };

  const exportCSV = () => {
    const csv = [
      ["Name", "Symbol", "Address", "Liquidity", "24h Volume", "Created"],
      ...tokens.map(t => [t.name, t.symbol, t.address, t.liquidity, t.volume24h, t.created])
    ].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "tokens.csv");
  };

  const shareToFarcaster = (token) => {
    const text = `Check out ${token.name} ($${token.symbol}) on Base!\n\nLiquidity: ${token.liquidity}\nVolume: ${token.volume24h}\n${token.url}`;
    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`, "_blank");
  };

  const filtered = tokens
    .filter(t => t.rawVolume >= volumeFilter)
    .filter(t => !showOnlyFavorites || favorites.includes(t.address))
    .sort((a, b) => sortByVolume ? b.rawVolume - a.rawVolume : 0);

  return (
    <div style={{ background: darkMode ? "#111" : "#fff", color: darkMode ? "#eee" : "#111", minHeight: "100vh", padding: "2rem" }}>
      <h1>🚀 Base Explorer Mini</h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <input
          type="number"
          placeholder="Min volume"
          value={volumeFilter}
          onChange={e => setVolumeFilter(Number(e.target.value))}
        />
        <button onClick={() => setSortByVolume(!sortByVolume)}>Sort by Volume</button>
        <button onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}>Show Favorites</button>
        <button onClick={() => setDarkMode(!darkMode)}>Toggle Dark Mode</button>
        <button onClick={exportCSV}>Export CSV</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
        {filtered.map(token => (
          <div key={token.address} style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "12px" }}>
            <h2>{token.name} ({token.symbol}) <button onClick={() => toggleFavorite(token.address)}>{favorites.includes(token.address) ? "★" : "☆"}</button></h2>
            <p><strong>Address:</strong> {token.address}</p>
            <p><strong>Liquidity:</strong> {token.liquidity}</p>
            <p><strong>24h Volume:</strong> {token.volume24h}</p>
            <p><strong>Created:</strong> {token.created}</p>
            {token.isScam && <p style={{ color: "red" }}>⚠️ Potential Scam Risk</p>}
            <button onClick={() => navigator.clipboard.writeText(token.address)}>Copy Address</button>
            <button onClick={() => shareToFarcaster(token)}>📤 Share</button>
            <Line data={{
              labels: token.priceHistory.map((_, i) => `${i}h`),
              datasets: [{
                label: "Price",
                data: token.priceHistory,
                borderColor: "#4F46E5",
                fill: false,
                tension: 0.2
              }]
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
