export async function fetchFinnhubQuotes(
  tickers: string[],
  token: string
): Promise<Record<string, number>> {
  const resultados: Record<string, number> = {};

  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
          ticker
        )}&token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const price = Number(data?.c ?? data?.current);
        if (Number.isFinite(price) && price > 0) {
          resultados[ticker.toUpperCase()] = price;
        }
      } catch (err) {
        // Ignorar errores individuales para no detener el resto
      }
    })
  );

  return resultados;
}
