// Slowly animated tab icon: a white plume sways inside an orange rounded square (8 second cycle).
// Skipped when the visitor asks for reduced motion; paused while the tab is hidden.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !window.Path2D) return;
  const link = document.querySelector('link[rel="icon"]');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!link || !ctx) return;
  const box = new Path2D('M22 0h56a22 22 0 0 1 22 22v56a22 22 0 0 1-22 22H22A22 22 0 0 1 0 78V22A22 22 0 0 1 22 0Z');
  const plume = new Path2D('M16 92C18 58 44 24 90 6 82 42 58 74 16 92Z');
  const shaft = new Path2D('M8 99C24 74 52 38 90 6');
  const draw = () => {
    if (document.hidden) return;
    const t = (Date.now() % 8000) / 8000 * Math.PI * 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 64, 64);
    ctx.setTransform(0.64, 0, 0, 0.64, 0, 0);
    ctx.fillStyle = '#e8893c'; ctx.fill(box);
    ctx.save(); ctx.clip(box);
    // The plume turns a few degrees around the middle of the box and drifts a little, like writing.
    ctx.translate(50 + Math.cos(t) * 3, 50 + Math.sin(t * 2) * 2); ctx.rotate(Math.sin(t) * 0.16);
    ctx.scale(0.76, 0.76); ctx.translate(-49, -52);
    ctx.fillStyle = '#fff'; ctx.fill(plume);
    ctx.strokeStyle = '#c2611c'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke(shaft);
    ctx.restore();
    link.type = 'image/png'; link.href = canvas.toDataURL('image/png');
  };
  setInterval(draw, 250);
})();
