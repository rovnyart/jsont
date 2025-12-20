import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "json't — JSON Tools for Developers";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "24px",
            color: "#fbbf24",
            letterSpacing: "20px",
            lineHeight: "40px",
          }}
        >
          {"{ } { } { } { } { } { } { } { } { } { } { } { } { } { } { } { } { } { } { } { } { } { } { } { } "}
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          {/* Logo braces */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "30px",
            }}
          >
            <span
              style={{
                fontSize: "140px",
                fontWeight: "bold",
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {"{ }"}
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "80px",
              fontWeight: "bold",
              color: "#ffffff",
              margin: "0",
              letterSpacing: "-2px",
            }}
          >
            json&apos;t
          </h1>

          {/* Tagline */}
          <p
            style={{
              fontSize: "32px",
              color: "#94a3b8",
              margin: "20px 0 0 0",
              maxWidth: "800px",
              textAlign: "center",
            }}
          >
            JSON Tools for Developers
          </p>

          {/* Features */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "40px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {["Format", "Validate", "Query", "Transform"].map((feature) => (
              <span
                key={feature}
                style={{
                  background: "rgba(251, 191, 36, 0.2)",
                  color: "#fbbf24",
                  padding: "10px 24px",
                  borderRadius: "100px",
                  fontSize: "20px",
                  fontWeight: "600",
                }}
              >
                {feature}
              </span>
            ))}
          </div>

          {/* Privacy badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "40px",
              color: "#22c55e",
              fontSize: "20px",
            }}
          >
            <span style={{ fontSize: "24px" }}>🔒</span>
            <span>100% Browser-Based • Your Data Never Leaves</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
