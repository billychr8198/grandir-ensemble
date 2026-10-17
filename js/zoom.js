/* ==========================================================================
   Zoomer — pan & zoom for any element inside a stage.
   Mouse wheel / trackpad, drag, pinch, double-tap, keyboard and buttons.
   ========================================================================== */
(function () {
  'use strict';
  class Zoomer {
    /**
     * @param {HTMLElement} stage   clipping container
     * @param {HTMLElement} content element to transform (img, svg wrapper…)
     * @param {{w:number,h:number,min?:number,max?:number,pad?:number,onChange?:Function}} o
     */
    constructor(stage, content, o) {
      this.stage = stage; this.el = content; this.o = Object.assign({ min: 0.5, max: 8, pad: 24 }, o);
      this.s = 1; this.x = 0; this.y = 0; this.fitS = 1;
      this.pointers = new Map(); this.last = null;
      this.el.style.transformOrigin = '0 0';
      this.el.style.position = 'absolute'; this.el.style.left = '0'; this.el.style.top = '0';
      this.el.style.width = this.o.w + 'px'; this.el.style.height = this.o.h + 'px';
      this.el.style.maxWidth = 'none'; this.el.style.maxHeight = 'none';
      this.el.draggable = false;
      this._wheel = e => this.onWheel(e);
      this._down = e => this.onDown(e);
      this._move = e => this.onMove(e);
      this._up = e => this.onUp(e);
      this._dbl = e => this.onDbl(e);
      this._resize = () => this.fit(true);
      stage.addEventListener('wheel', this._wheel, { passive: false });
      stage.addEventListener('pointerdown', this._down);
      window.addEventListener('pointermove', this._move);
      window.addEventListener('pointerup', this._up);
      window.addEventListener('pointercancel', this._up);
      stage.addEventListener('dblclick', this._dbl);
      this.ro = new ResizeObserver(this._resize); this.ro.observe(stage);
      stage.style.touchAction = 'none';
      this.fit();
    }
    destroy() {
      this.stage.removeEventListener('wheel', this._wheel);
      this.stage.removeEventListener('pointerdown', this._down);
      window.removeEventListener('pointermove', this._move);
      window.removeEventListener('pointerup', this._up);
      window.removeEventListener('pointercancel', this._up);
      this.stage.removeEventListener('dblclick', this._dbl);
      this.ro.disconnect();
    }
    rect() { return this.stage.getBoundingClientRect(); }
    fit(keepRelative) {
      const r = this.rect(); if (!r.width || !r.height) return;
      const pad = this.o.pad;
      const prevFit = this.fitS, prevS = this.s;
      this.fitS = Math.min((r.width - pad * 2) / this.o.w, (r.height - pad * 2) / this.o.h, this.o.maxFit || Infinity);
      if (keepRelative && prevS !== prevFit) { this.s = this.fitS * (prevS / prevFit); this.clampPan(); this.apply(); return; }
      this.s = this.fitS;
      this.x = (r.width - this.o.w * this.s) / 2; this.y = (r.height - this.o.h * this.s) / 2;
      this.apply();
    }
    actual() { this.zoomTo(1); }
    zoomTo(s, cx, cy) {
      const r = this.rect();
      if (cx == null) { cx = r.width / 2; cy = r.height / 2; }
      s = Math.min(this.o.max, Math.max(this.fitS * this.o.min, s));
      const k = s / this.s;
      this.x = cx - (cx - this.x) * k; this.y = cy - (cy - this.y) * k; this.s = s;
      this.clampPan(); this.apply();
    }
    zoomBy(f, cx, cy) { this.zoomTo(this.s * f, cx, cy); }
    pan(dx, dy) { this.x += dx; this.y += dy; this.clampPan(); this.apply(); }
    clampPan() {
      const r = this.rect(); const w = this.o.w * this.s, h = this.o.h * this.s;
      // keep the content covering the stage when larger, centred when smaller
      if (w <= r.width) this.x = (r.width - w) / 2; else this.x = Math.min(0, Math.max(r.width - w, this.x));
      if (h <= r.height) this.y = (r.height - h) / 2; else this.y = Math.min(0, Math.max(r.height - h, this.y));
    }
    apply() {
      this.el.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.s})`;
      this.o.onChange && this.o.onChange(this.s / this.fitS, this.s);
    }
    onWheel(e) {
      e.preventDefault();
      const r = this.rect();
      if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018));
        this.zoomBy(f, e.clientX - r.left, e.clientY - r.top);
      } else this.pan(-e.deltaX, 0);
    }
    onDown(e) {
      if (e.button !== undefined && e.button > 0) return;
      if (e.target.closest('button, a, input')) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.stage.classList.add('is-grabbing');
      this.moved = 0;
      if (this.pointers.size === 2) this.pinch = this.pinchState();
    }
    pinchState() {
      const [a, b] = [...this.pointers.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    }
    onMove(e) {
      if (!this.pointers.has(e.pointerId)) return;
      const prev = this.pointers.get(e.pointerId);
      const now = { x: e.clientX, y: e.clientY };
      this.pointers.set(e.pointerId, now);
      if (this.pointers.size === 2 && this.pinch) {
        const st = this.pinchState(); const r = this.rect();
        this.zoomBy(st.d / this.pinch.d, st.cx - r.left, st.cy - r.top);
        this.pan(st.cx - this.pinch.cx, st.cy - this.pinch.cy);
        this.pinch = st; this.moved += 10;
      } else if (this.pointers.size === 1) {
        const dx = now.x - prev.x, dy = now.y - prev.y; this.moved += Math.abs(dx) + Math.abs(dy);
        this.pan(dx, dy);
      }
    }
    onUp(e) {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (!this.pointers.size) this.stage.classList.remove('is-grabbing');
      // double-tap on touch
      if (e.pointerType === 'touch' && this.moved < 8) {
        const t = Date.now();
        if (this.lastTap && t - this.lastTap < 300) { this.onDbl(e); this.lastTap = 0; } else this.lastTap = t;
      }
    }
    onDbl(e) {
      const r = this.rect();
      if (this.s > this.fitS * 1.4) this.fit(); else this.zoomTo(this.fitS * 2.5, e.clientX - r.left, e.clientY - r.top);
    }
    key(e) {
      if (e.key === '+' || e.key === '=') { this.zoomBy(1.25); return true; }
      if (e.key === '-' || e.key === '_') { this.zoomBy(0.8); return true; }
      if (e.key === '0') { this.fit(); return true; }
      return false;
    }
  }
  window.Zoomer = Zoomer;
})();
