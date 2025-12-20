import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "40px",
        }}
      >
        <span
          style={{
            fontSize: "100px",
            fontWeight: "bold",
            background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            backgroundClip: "text",
            color: "transparent",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {"{ }"}
        </span>
      </div>
    ),
    {
      ...size,
    }
  );
}
