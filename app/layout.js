export const metadata = {
  title: "Free PDF Merger & Splitter — Combine or Split PDFs Online",
  description:
    "Merge multiple PDFs into one, or split a PDF into pages — free, right in your browser. No upload, no signup.",
};

const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('pdf-tool-theme');
    var theme = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
