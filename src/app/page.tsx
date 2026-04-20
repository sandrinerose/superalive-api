export default function Home() {
  return (
    <div style={{ fontFamily: "system-ui", padding: 40, maxWidth: 600 }}>
      <h1>SuperAlive Studio API</h1>
      <p>SuperAlive Studio — 11 AI image generation workflows.</p>
      <p style={{ color: "#999" }}>This is an API backend. Connect your frontend to the endpoints below.</p>
      <hr />
      <pre style={{ fontSize: 13, lineHeight: 1.8 }}>{`
POST /api/face-grid
POST /api/body-grid
POST /api/faceswap
POST /api/image-generation
POST /api/edit-image
POST /api/sketch-to-render
POST /api/product-integration
POST /api/upscaler
POST /api/aspect-ratio
POST /api/fashion-master
POST /api/variations
      `.trim()}</pre>
    </div>
  );
}
