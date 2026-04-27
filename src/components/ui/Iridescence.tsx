"use client";

import { useEffect, useRef } from "react";

interface IridescenceProps {
  color?: [number, number, number];
  mouseReactive?: boolean;
  amplitude?: number;
  speed?: number;
  className?: string;
}

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform vec3 u_color;
  uniform float u_amplitude;

  vec3 palette(float t) {
    vec3 dark  = vec3(0.0, 0.0, 0.02);
    vec3 mid   = u_color;
    vec3 light = vec3(0.88, 0.92, 1.0);

    if (t < 0.5) return mix(dark, mid, t * 2.0);
    return mix(mid, light, (t - 0.5) * 2.0);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 mouse = u_mouse / u_resolution;

    /* Diagonal flow: Y + slight X tilt, mouse adds subtle vertical offset */
    float mouseInfluence = (mouse.y - 0.5) * 0.25;

    float p = uv.y + uv.x * 0.18 + mouseInfluence;

    /* Three overlapping diagonal waves → smooth horizontal bands */
    float w  = sin(p * 5.0        - u_time * 0.55) * u_amplitude;
    w       += sin(p * 9.0  + 1.3 - u_time * 0.38) * u_amplitude * 0.55;
    w       += sin(p * 14.0 - 0.7 + u_time * 0.28) * u_amplitude * 0.30;

    float t = clamp((w + u_amplitude * 1.85) / (u_amplitude * 3.7), 0.0, 1.0);
    gl_FragColor = vec4(palette(t), 1.0);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

export default function Iridescence({
  color = [0.05, 0.12, 0.35],
  mouseReactive = true,
  amplitude = 0.18,
  speed = 1.0,
  className = "",
}: IridescenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<[number, number]>([0, 0]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uColor = gl.getUniformLocation(program, "u_color");
    const uAmp = gl.getUniformLocation(program, "u_amplitude");

    gl.uniform3fv(uColor, color);
    gl.uniform1f(uAmp, amplitude);

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = [e.clientX - rect.left, canvas.height - (e.clientY - rect.top)];
    };

    if (mouseReactive) window.addEventListener("mousemove", handleMouseMove);

    let startTime = performance.now();

    const render = () => {
      const elapsed = ((performance.now() - startTime) / 1000) * speed;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform2fv(uMouse, mouseReactive ? mouseRef.current : [canvas.width / 2, canvas.height / 2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      if (mouseReactive) window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [color, mouseReactive, amplitude, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ display: "block" }}
    />
  );
}
