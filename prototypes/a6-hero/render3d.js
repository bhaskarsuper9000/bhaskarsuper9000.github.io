/* render3d.js: draws Sim items with three.js. Classic script; THREE is passed in after the
   ES module has been imported from the CDN, so the page works from file:// as well. */
(function () {
  'use strict';
  window.Render3D = function (THREE, canvas, Sim) {
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, 0.02, 800);
    var C = {}, pool = {}, used = {}, fade = 1, isLight = false;

    /* ---------- ground: one displaced plane, grid / planks / contours drawn in the shader ---------- */
    var gU = {
      uColor: { value: new THREE.Color() }, uAccent: { value: new THREE.Color() }, uMinor: { value: 2 }, uMajor: { value: 10 }, uFade: { value: 120 },
      uCenter: { value: new THREE.Vector2() }, uRing: { value: new THREE.Vector4(0, 0, 0, 0) }, uRingW: { value: 1.5 }, uPtr: { value: new THREE.Vector3(0, 0, 0) },
      uGlowR: { value: 8 }, uMode: { value: 0 }, uAmp: { value: 0 }, uContour: { value: 0.2 }, uAlpha: { value: 1 }, uGain: { value: 1 }
    };
    var BATHY = 'float bathy(vec2 p){return 0.55*sin(p.x*0.21+0.3)*cos(p.y*0.17)+0.35*sin((p.x+p.y)*0.11+1.2)+0.2*sin(p.x*0.5-p.y*0.37);}';
    var groundMat = new THREE.ShaderMaterial({
      uniforms: gU, transparent: true, depthWrite: false,
      vertexShader: [
        'uniform float uAmp; uniform vec4 uRing; uniform float uRingW; uniform float uMinor; varying vec2 vP; varying float vRip;', BATHY,
        'void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xz;',
        ' float d = abs(length(w.xz-uRing.xy)-uRing.z); vRip = exp(-d*d/(uRingW*uRingW))*uRing.w;',
        ' w.y += uAmp*bathy(w.xz) + vRip*uMinor*0.05;',
        ' gl_Position = projectionMatrix * viewMatrix * w; }'].join('\n'),
      fragmentShader: [
        'uniform vec3 uColor; uniform vec3 uAccent; uniform float uMinor; uniform float uMajor; uniform float uFade; uniform vec2 uCenter;',
        'uniform vec3 uPtr; uniform float uGlowR; uniform float uMode; uniform float uContour; uniform float uAlpha; uniform float uGain; varying vec2 vP; varying float vRip;', BATHY,
        'float ln(float v, float w){ float f = abs(fract(v-0.5)-0.5)/fwidth(v); return 1.0-min(f/w,1.0); }',
        'void main(){',
        ' float minor = max(ln(vP.x/uMinor,1.0), ln(vP.y/uMinor,1.0));',
        ' float major = max(ln(vP.x/uMajor,1.1), ln(vP.y/uMajor,1.1));',
        ' float g = minor*0.45 + major*0.85;',
        ' if (uMode > 0.5 && uMode < 1.5) { float row = floor(vP.y/uMinor); float off = fract(row*0.37)*uMajor; g = ln(vP.y/uMinor,1.0)*0.9 + ln((vP.x+off)/uMajor,1.0)*0.7 + ln(vP.y/(uMinor*0.25),0.6)*0.1; }',
        ' if (uMode > 1.5) { float h = bathy(vP)/uContour; g = minor*0.22 + ln(h,1.0)*0.85 + ln(h/5.0,1.3)*0.6; }',
        ' float pd = length(vP-uPtr.xy); float glow = exp(-pd*pd/(uGlowR*uGlowR))*uPtr.z;',
        ' float dist = length(vP-uCenter); float fadeK = 1.0 - smoothstep(uFade*0.3, uFade, dist);',
        ' float k = g*(0.75 + 1.5*vRip + 1.3*glow)*uGain + vRip*0.035 + glow*0.025;',
        ' vec3 col = mix(uColor, uAccent, clamp(vRip*0.9+glow*0.8,0.0,1.0));',
        ' gl_FragColor = vec4(col, clamp(k,0.0,1.0)*fadeK*uAlpha); }'].join('\n')
    });
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 96, 96), groundMat);
    ground.rotation.x = -Math.PI / 2; ground.renderOrder = -10; ground.frustumCulled = false; scene.add(ground);

    /* ---------- per-class styling ---------- */
    function lineStyle(cls) {
      switch (cls) {
        case 'ego': return [C.accent, 1];
        case 'agent': return [C.agent, 0.95];
        case 'static': return [C.static, isLight ? 0.6 : 0.5];
        case 'world': return [C.world, isLight ? 0.7 : 0.75];
        case 'bbox': return [C.accent, 0.9];
        case 'warn': return [C.warn, 1];
        case 'path': return [C.accent, 0.95];
        case 'ring': return [C.accent, 1];
        case 'active': return [C.accent, 1];
        case 'screen': return [C.accent, 0.6];
      }
      return [C.agent, 1];
    }
    function fillStyle(cls) {
      if (cls === 'world') return [C.road, isLight ? 0.55 : 0.6];
      if (cls === 'active') return [C.accent, 0.35];
      if (cls === 'screen') return [C.accent, isLight ? 0.12 : 0.16];
      if (cls === 'ego') return [C.fillEgo, 0.94];
      return [C.fill, 0.9];
    }
    function geom(arr) { var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); return g; }
    function make(it) {
      var o = { cls: it.cls, m: it.m, group: new THREE.Group() };
      if (it.strip || it.seg) {
        var cap = it.strip ? 512 * 3 : 4096 * 6, g = geom(new Float32Array(cap));
        o.line = it.strip ? new THREE.Line(g, new THREE.LineBasicMaterial({ transparent: true, depthWrite: false })) : new THREE.LineSegments(g, new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }));
        o.line.frustumCulled = false; o.dyn = true; o.cap = cap; o.group.add(o.line);
      } else {
        var M = Sim.getModel(it.m);
        if (M.tri.length && it.cls !== 'bbox' && it.cls !== 'warn' && it.cls !== 'ring') {
          o.fill = new THREE.Mesh(geom(M.tri), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
          o.fill.renderOrder = it.cls === 'world' ? -5 : 0; o.group.add(o.fill);
        }
        o.line = new THREE.LineSegments(geom(M.seg), new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }));
        o.line.renderOrder = it.cls === 'world' ? -4 : 1; o.group.add(o.line);
        o.group.rotation.order = 'YXZ';
      }
      scene.add(o.group);
      return o;
    }
    function style(o, cls, a) {
      var ls = lineStyle(cls); o.line.material.color.copy(ls[0]); o.line.material.opacity = ls[1] * a * fade;
      if (o.fill) { var fs = fillStyle(cls); o.fill.material.color.copy(fs[0]); o.fill.material.opacity = fs[1] * Math.min(1, a * 1.2) * fade; o.fill.material.depthWrite = cls !== 'world' && cls !== 'active' && cls !== 'screen'; }
    }

    var tris = 0;
    function sync(items) {
      used = {};
      items.forEach(function (it) {
        var o = pool[it.id];
        if (o && (o.m !== it.m || (!!o.dyn) !== !!(it.strip || it.seg))) { scene.remove(o.group); o = null; }
        if (!o) o = pool[it.id] = make(it);
        used[it.id] = 1; o.group.visible = true;
        var a = it.a == null ? 1 : it.a;
        style(o, it.cls, a);
        o.group.visible = a * fade > 0.004;
        if (o.dyn) {
          var arr = it.strip || it.seg, attr = o.line.geometry.attributes.position, n = Math.min(arr.length, o.cap);
          attr.array.set(arr.subarray(0, n)); attr.needsUpdate = true; o.line.geometry.setDrawRange(0, n / 3);
          o.line.renderOrder = 2;
        } else {
          var p = it.p || [0, 0, 0], s = it.s == null ? 1 : it.s;
          o.group.position.set(p[0], p[1], p[2]); o.group.rotation.set(it.pitch || 0, it.yaw || 0, it.roll || 0); o.group.scale.setScalar(s);
        }
      });
      for (var id in pool) if (!used[id]) pool[id].group.visible = false;
    }

    var ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
    var W = 1, H = 1;
    return {
      renderer: renderer,
      setSize: function (w, h) { W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); },
      setColors: function (col, light) {
        isLight = !!light;
        ['accent', 'agent', 'static', 'world', 'grid', 'fill', 'fillEgo', 'road', 'warn'].forEach(function (k) { C[k] = new THREE.Color(col[k]); });
        gU.uColor.value.copy(C.grid); gU.uAccent.value.copy(C.accent); gU.uGain.value = light ? 1.15 : 1;
      },
      clear: function () { for (var id in pool) { scene.remove(pool[id].group); } pool = {}; },
      pointerToGround: function (nx, ny, y) {
        ndc.set(nx, ny); ray.setFromCamera(ndc, camera); plane.constant = -(y || 0);
        return ray.ray.intersectPlane(plane, hit) ? [hit.x, hit.z] : null;
      },
      render: function (frame) {
        fade = frame.fade;
        var cam = frame.cam;
        camera.fov = cam.fov; camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]); camera.lookAt(cam.target[0], cam.target[1], cam.target[2]); camera.updateProjectionMatrix();
        var g = frame.ground, f = frame.focus, size = g.fade * 2.2;
        ground.scale.set(size, size, 1);
        var snap = g.major; ground.position.set(Math.round(f[0] / snap) * snap, 0, Math.round(f[2] / snap) * snap);
        gU.uMinor.value = g.minor; gU.uMajor.value = g.major; gU.uFade.value = g.fade; gU.uMode.value = g.mode; gU.uAmp.value = g.amp; gU.uContour.value = g.contour || 0.2; gU.uGlowR.value = g.glowR;
        gU.uCenter.value.set(f[0], f[2]); gU.uAlpha.value = fade;
        var r = frame.ring; if (r) { gU.uRing.value.set(r.x, r.z, r.r, r.a * 0.9); gU.uRingW.value = r.w; } else gU.uRing.value.set(0, 0, -1e3, 0);
        var p = frame.ptr; if (p) gU.uPtr.value.set(p[0], p[1], p[2]); else gU.uPtr.value.z = 0;
        sync(frame.items);
        renderer.render(scene, camera);
        return renderer.info.render;
      }
    };
  };
})();
