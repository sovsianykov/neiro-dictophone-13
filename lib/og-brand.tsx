/**
 * Разметка для `next/og` ImageResponse (ограниченный набор тегов).
 */
export function OgBrandSquare({ size }: { size: number }) {
  const r = Math.max(6, Math.round(size * 0.2));
  const fontSize = Math.round(size * 0.42);
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #fb923c 0%, #f472b6 50%, #fbbf24 100%)",
        borderRadius: r,
        boxShadow: "0 8px 32px rgba(251, 146, 60, 0.45)",
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 800,
          color: "#431407",
          letterSpacing: "-0.04em",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        D
      </span>
    </div>
  );
}

export function OgBrandBanner() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 72,
        background: "linear-gradient(125deg, #fff7ed 0%, #ffedd5 25%, #fce7f3 55%, #e0f2fe 100%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <OgBrandSquare size={112} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: "#9a3412",
              letterSpacing: "-0.03em",
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
            }}
          >
            Нейро-диктофон
          </span>
          <span
            style={{
              fontSize: 26,
              color: "#78716c",
              maxWidth: 720,
              lineHeight: 1.35,
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
            }}
          >
            Офлайн распознавание речи, локальное хранение и синхронизация с сервером — PWA на Next.js.
          </span>
        </div>
      </div>
      <span
        style={{
          marginTop: 48,
          fontSize: 18,
          color: "#ea580c",
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        }}
      >
        Dictophone · PWA
      </span>
    </div>
  );
}
