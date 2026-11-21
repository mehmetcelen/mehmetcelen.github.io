// Slowly animated tab icon: the plume sways like a pen writing (one cycle takes 8 seconds).
// Skipped when the visitor asks for reduced motion; paused while the tab is hidden.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !window.Path2D) return;
  const link = document.querySelector('link[rel="icon"]');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!link || !ctx) return;
  const plume = new Path2D('M16 92C18 58 44 24 90 6 82 42 58 74 16 92Z');
  const shaft = new Path2D('M8 99C24 74 52 38 90 6');
  const draw = () => {
    if (document.hidden) return;
    const t = (Date.now() % 8000) / 8000 * Math.PI * 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 64, 64);
    ctx.setTransform(0.54, 0, 0, 0.54, 4, 9);
    // Turn around the pen tip (bottom left), a few degrees each way.
    ctx.translate(8, 99); ctx.rotate(Math.sin(t) * 0.1); ctx.translate(-8, -99);
    ctx.fillStyle = '#e8893c'; ctx.fill(plume);
    ctx.strokeStyle = '#c2611c'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke(shaft);
    link.type = 'image/png'; link.href = canvas.toDataURL('image/png');
  };
  setInterval(draw, 250);
})();
