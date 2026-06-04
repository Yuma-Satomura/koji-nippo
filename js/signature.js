class SignaturePad {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.drawing = false;
    this.isEmpty = true;
    this.lineWidth = opts.lineWidth || 2.5;
    this.strokeColor = opts.strokeColor || '#1e293b';
    this._resize();
    this._bind();
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width || this.canvas.offsetWidth;
    const h = rect.height || this.canvas.offsetHeight;
    // Save current drawing
    const img = this.canvas.toDataURL();
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.scale(dpr, dpr);
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    // Restore
    if (!this.isEmpty) {
      const image = new Image();
      image.onload = () => this.ctx.drawImage(image, 0, 0, w, h);
      image.src = img;
    }
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener('mousedown', e => this._start(e));
    c.addEventListener('mousemove', e => this._move(e));
    c.addEventListener('mouseup', () => this._end());
    c.addEventListener('mouseleave', () => this._end());
    c.addEventListener('touchstart', e => { e.preventDefault(); this._start(e.touches[0]); }, { passive: false });
    c.addEventListener('touchmove', e => { e.preventDefault(); this._move(e.touches[0]); }, { passive: false });
    c.addEventListener('touchend', () => this._end());
    window.addEventListener('resize', () => this._resize());
  }

  _pos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top)
    };
  }

  _start(e) {
    this.drawing = true;
    const p = this._pos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
    this.lastPoint = p;
  }

  _move(e) {
    if (!this.drawing) return;
    const p = this._pos(e);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
    this.isEmpty = false;
    this.lastPoint = p;
  }

  _end() {
    if (!this.drawing) return;
    this.drawing = false;
    this.ctx.beginPath();
  }

  clear() {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.isEmpty = true;
  }

  toDataURL(type = 'image/png') {
    return this.isEmpty ? null : this.canvas.toDataURL(type);
  }

  fromDataURL(url) {
    if (!url) return;
    const rect = this.canvas.getBoundingClientRect();
    const img = new Image();
    img.onload = () => {
      this.ctx.drawImage(img, 0, 0, rect.width, rect.height);
      this.isEmpty = false;
    };
    img.src = url;
  }
}
