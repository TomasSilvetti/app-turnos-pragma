"use client";

import { useEffect, useRef } from "react";

interface SilkProps {
  speed?: number;
  className?: string;
}

const vertexShader = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const fragmentShader = `
  precision highp float;
  uniform vec2  u_res;
  uniform float u_time;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1,0)), u.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * smoothNoise(p);
      p *= 2.1;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
    float aspect = u_res.x / u_res.y;
    uv.x *= aspect;

    float t = u_time * 0.18;

    /* Diagonal base coordinate — drives the main silk bands */
    float diag = uv.x * 0.72 + uv.y * 1.0;

    /* Warp the diagonal with FBM for organic folds */
    float warp = fbm(vec2(diag * 1.4 + t, uv.y * 1.2 - t * 0.6)) - 0.5;
    float band  = diag + warp * 0.55;

    /* Main silk sheen: sharp highlight + soft shadow */
    float sheen = sin(band * 5.5 - t) * 0.5 + 0.5;
    sheen = pow(sheen, 1.8);

    /* Secondary micro-folds */
    float micro = sin(band * 13.0 + t * 1.4) * 0.12 + 0.12;

    float lum = clamp(sheen + micro, 0.0, 1.0);

    /* Color: shadow = medium blue, highlight = near-white */
    vec3 shadow    = vec3(0.55, 0.75, 0.92);   /* #8BBFEB */
    vec3 highlight = vec3(0.96, 0.98, 1.00);   /* near white */

    vec3 col = mix(shadow, highlight, lum);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  return sh;
}

export default function Silk({ speed = 1, className = "" }: SilkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vertexShader));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fragmentShader));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes  = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const start = performance.now();
    const render = () => {
      const t = ((performance.now() - start) / 1000) * speed;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ display: "block" }}
    />
  );
}
