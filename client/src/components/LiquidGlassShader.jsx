import { useEffect, useRef } from 'react';

const vertexSource = `
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision mediump float;
  varying vec2 uv;
  uniform vec2 iResolution;
  uniform float iTime;
  uniform vec2 iMouse;
  uniform sampler2D iChannel0;

  void main() {
    vec2 mouse = iMouse / iResolution;
    vec2 delta = uv - mouse;
    float influence = exp(-dot(delta, delta) * 10.0);
    vec2 lensUv = clamp(uv + delta * influence * 0.025, 0.002, 0.998);
    vec4 sampleColor = texture2D(iChannel0, lensUv);

    float edgeShape = pow(abs(uv.x * 2.0 - 1.0), 8.0) + pow(abs(uv.y * 2.0 - 1.0), 8.0);
    float edge = exp(-abs(edgeShape - 1.0) * 22.0);
    float topLight = (1.0 - smoothstep(0.0, 0.62, uv.y)) * 0.24;
    float glintX = 0.22 + 0.18 * sin(iTime * 0.42);
    float glint = exp(-pow((uv.x - glintX) * 30.0, 2.0)) *
      (1.0 - smoothstep(0.12, 0.65, uv.y)) * 0.13;

    vec3 lighting = vec3(topLight + glint + edge * 0.12);
    float alpha = 0.12 + topLight * 0.42 + glint + edge * 0.13;
    gl_FragColor = vec4(sampleColor.rgb + lighting, alpha);
  }
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Efek liquid glass tidak dapat dikompilasi:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function makeTexture() {
  const source = document.createElement('canvas');
  source.width = 256;
  source.height = 64;
  const context = source.getContext('2d');
  if (!context) return null;

  const rootStyle = getComputedStyle(document.documentElement);
  const gradient = context.createLinearGradient(0, 0, source.width, source.height);
  gradient.addColorStop(0, rootStyle.getPropertyValue('--primary').trim());
  gradient.addColorStop(0.48, rootStyle.getPropertyValue('--accent').trim());
  gradient.addColorStop(1, rootStyle.getPropertyValue('--primary').trim());
  context.fillStyle = gradient;
  context.fillRect(0, 0, source.width, source.height);
  context.fillStyle = 'rgba(255,255,255,.35)';
  context.fillRect(0, 0, source.width, 12);
  return source;
}

export default function LiquidGlassShader() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = canvas?.parentElement;
    const gl = canvas?.getContext('webgl', {
      alpha: true,
      antialias: false,
      powerPreference: 'low-power'
    });
    if (!canvas || !surface || !gl) {
      if (canvas && !gl) console.warn('WebGL tidak tersedia; efek liquid glass menggunakan fallback CSS.');
      return undefined;
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return undefined;

    const program = gl.createProgram();
    if (!program) return undefined;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Efek liquid glass tidak dapat dihubungkan:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return undefined;
    }

    const textureSource = makeTexture();
    const texture = gl.createTexture();
    const buffer = gl.createBuffer();
    if (!textureSource || !texture || !buffer) return undefined;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureSource);
    gl.uniform1i(gl.getUniformLocation(program, 'iChannel0'), 0);

    const resolution = gl.getUniformLocation(program, 'iResolution');
    const time = gl.getUniformLocation(program, 'iTime');
    const mouse = gl.getUniformLocation(program, 'iMouse');
    const pointer = { x: 0, y: 0 };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let lastRender = 0;
    let startTime = performance.now();

    const render = now => {
      frame = 0;
      const bounds = surface.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));
      if (!width || !height || !bounds.width || !bounds.height) return;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      gl.uniform2f(resolution, width, height);
      gl.uniform1f(time, (now - startTime) / 1000);
      gl.uniform2f(mouse, pointer.x * pixelRatio, (bounds.height - pointer.y) * pixelRatio);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const requestRender = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    const onPointerMove = event => {
      const bounds = surface.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      requestRender();
    };
    const onPointerLeave = () => {
      pointer.x = surface.clientWidth / 2;
      pointer.y = surface.clientHeight / 2;
      requestRender();
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        startTime = performance.now();
        if (reducedMotion) requestRender();
        else frame = requestAnimationFrame(animate);
      }
    };
    const animate = now => {
      frame = 0;
      if (now - lastRender >= 40) {
        render(now);
        lastRender = now;
      }
      if (!reducedMotion && !document.hidden) frame = requestAnimationFrame(animate);
    };
    const observer = new ResizeObserver(requestRender);

    surface.addEventListener('pointermove', onPointerMove);
    surface.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    observer.observe(surface);
    if (reducedMotion) requestRender();
    else frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      surface.removeEventListener('pointermove', onPointerMove);
      surface.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} className="liquid-glass-shader" aria-hidden="true"/>;
}
