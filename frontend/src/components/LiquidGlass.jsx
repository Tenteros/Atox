import React, { useEffect, useRef } from "react";

/**
 * LiquidGlassShader
 * props:
 *  - image: URL фона (по умолчанию — тот, что вы дали)
 *  - style: доп. CSS для контейнера
 *  - className: доп. класс для контейнера
 *
 * Поведение:
 *  - рендерит <images> (hidden) как источник текстуры
 *  - создаёт WebGL и выполняет фрагментный шейдер (ваш код)
 *  - отслеживает мышь, ресайз, DPR
 *  - canvas overlay имеет pointer-events: none — клики проходят к содержимому
 */
export default function LiquidGlassShader({
                                              image = "https://img3.akspic.ru/crops/4/3/9/4/7/174934/174934-priroda-prirodnyj_landshaft-peyzash-voda-oblako-3840x2160.jpg",
                                              style = {},
                                              className = "",
                                          }) {
    const canvasRef = useRef(null);
    const imgRef = useRef(null);
    const rafRef = useRef(null);
    const startRef = useRef(null);

    // shader from your snippet (slightly adapted to GLSL ES)
    const fsSource = `
precision mediump float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform sampler2D iChannel0;

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
  const float NUM_ZERO = 0.0;
  const float NUM_ONE = 1.0;
  const float NUM_HALF = 0.5;
  const float NUM_TWO = 2.0;
  const float POWER_EXPONENT = 6.0;
  const float MASK_MULTIPLIER_1 = 10000.0;
  const float MASK_MULTIPLIER_2 = 9500.0;
  const float MASK_MULTIPLIER_3 = 11000.0;
  const float LENS_MULTIPLIER = 5000.0;
  const float MASK_STRENGTH_1 = 8.0;
  const float MASK_STRENGTH_2 = 16.0;
  const float MASK_STRENGTH_3 = 2.0;
  const float MASK_THRESHOLD_1 = 0.95;
  const float MASK_THRESHOLD_2 = 0.9;
  const float MASK_THRESHOLD_3 = 1.5;
  const float SAMPLE_RANGE = 4.0;
  const float SAMPLE_OFFSET = 0.5;
  const float GRADIENT_RANGE = 0.2;
  const float GRADIENT_OFFSET = 0.1;
  const float GRADIENT_EXTREME = -1000.0;
  const float LIGHTING_INTENSITY = 0.3;

  vec2 uv = fragCoord / iResolution.xy;
  vec2 mouse = iMouse.xy;
  if (length(mouse) < NUM_ONE) {
    mouse = iResolution.xy / NUM_TWO;
  }
  vec2 m2 = (uv - mouse / iResolution.xy);

  float roundedBox = pow(abs(m2.x * iResolution.x / iResolution.y), POWER_EXPONENT) + pow(abs(m2.y), POWER_EXPONENT);
  float rb1 = clamp((NUM_ONE - roundedBox * MASK_MULTIPLIER_1) * MASK_STRENGTH_1, NUM_ZERO, NUM_ONE);
  float rb2 = clamp((MASK_THRESHOLD_1 - roundedBox * MASK_MULTIPLIER_2) * MASK_STRENGTH_2, NUM_ZERO, NUM_ONE) -
    clamp(pow(MASK_THRESHOLD_2 - roundedBox * MASK_MULTIPLIER_2, NUM_ONE) * MASK_STRENGTH_2, NUM_ZERO, NUM_ONE);
  float rb3 = clamp((MASK_THRESHOLD_3 - roundedBox * MASK_MULTIPLIER_3) * MASK_STRENGTH_3, NUM_ZERO, NUM_ONE) -
    clamp(pow(NUM_ONE - roundedBox * MASK_MULTIPLIER_3, NUM_ONE) * MASK_STRENGTH_3, NUM_ZERO, NUM_ONE);

  fragColor = vec4(NUM_ZERO);
  float transition = smoothstep(NUM_ZERO, NUM_ONE, rb1 + rb2);

  if (transition > NUM_ZERO) {
    vec2 lens = ((uv - NUM_HALF) * NUM_ONE * (NUM_ONE - roundedBox * LENS_MULTIPLIER) + NUM_HALF);
    float total = NUM_ZERO;
    for (float x = -SAMPLE_RANGE; x <= SAMPLE_RANGE; x++) {
      for (float y = -SAMPLE_RANGE; y <= SAMPLE_RANGE; y++) {
        vec2 offset = vec2(x, y) * SAMPLE_OFFSET / iResolution.xy;
        fragColor += texture2D(iChannel0, offset + lens);
        total += NUM_ONE;
      }
    }
    fragColor /= total;

    float gradient = clamp((clamp(m2.y, NUM_ZERO, GRADIENT_RANGE) + GRADIENT_OFFSET) / NUM_TWO, NUM_ZERO, NUM_ONE) +
      clamp((clamp(-m2.y, GRADIENT_EXTREME, GRADIENT_RANGE) * rb3 + GRADIENT_OFFSET) / NUM_TWO, NUM_ZERO, NUM_ONE);
    vec4 lighting = clamp(fragColor + vec4(rb1) * gradient + vec4(rb2) * LIGHTING_INTENSITY, NUM_ZERO, NUM_ONE);

    fragColor = mix(texture2D(iChannel0, uv), lighting, transition);
  } else {
    fragColor = texture2D(iChannel0, uv);
  }
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

    const vsSource = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

    useEffect(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;

        const gl = canvas.getContext("webgl");
        if (!gl) {
            console.error("WebGL not supported");
            return;
        }

        // resize with DPR
        const resize = () => {
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            const w = Math.floor(canvas.clientWidth * dpr);
            const h = Math.floor(canvas.clientHeight * dpr);
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
                gl.viewport(0, 0, w, h);
            }
        };

        // compile shader helpers
        const createShader = (type, source) => {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, source);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.error("Shader compile error:", gl.getShaderInfoLog(sh));
                gl.deleteShader(sh);
                return null;
            }
            return sh;
        };

        const vs = createShader(gl.VERTEX_SHADER, vsSource);
        const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program link error:", gl.getProgramInfoLog(program));
            return;
        }
        gl.useProgram(program);

        // buffer (full screen quad)
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
        );
        const positionLoc = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // uniforms
        const iResolutionLoc = gl.getUniformLocation(program, "iResolution");
        const iTimeLoc = gl.getUniformLocation(program, "iTime");
        const iMouseLoc = gl.getUniformLocation(program, "iMouse");
        const iChannel0Loc = gl.getUniformLocation(program, "iChannel0");

        // create texture
        const texture = gl.createTexture();
        const setupTexture = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            // upload image
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        };

        if (img.complete) setupTexture();
        else img.onload = () => setupTexture();

        // mouse handling (canvas coordinates)
        let mouseX = 0;
        let mouseY = 0;
        const onMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = (e.clientX - rect.left);
            mouseY = rect.height - (e.clientY - rect.top); // match original vertical flip
        };
        // Also support touch
        const onTouch = (e) => {
            if (e.touches.length > 0) onMove(e.touches[0]);
        };
        canvas.addEventListener("mousemove", onMove);
        canvas.addEventListener("touchmove", onTouch, { passive: true });

        // render loop
        startRef.current = performance.now();
        const render = () => {
            resize();
            const now = (performance.now() - startRef.current) / 1000.0;

            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // set uniforms (note: iResolution is screen pixels)
            gl.uniform3f(iResolutionLoc, canvas.width, canvas.height, 1.0);
            gl.uniform1f(iTimeLoc, now);
            gl.uniform4f(iMouseLoc, mouseX, mouseY, 0.0, 0.0);

            // bind texture to unit 0
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(iChannel0Loc, 0);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            rafRef.current = requestAnimationFrame(render);
        };

        rafRef.current = requestAnimationFrame(render);

        // resize observer for canvas client size changes
        const ro = new ResizeObserver(() => resize());
        ro.observe(canvas);

        // cleanup on unmount
        return () => {
            cancelAnimationFrame(rafRef.current);
            ro.disconnect();
            canvas.removeEventListener("mousemove", onMove);
            canvas.removeEventListener("touchmove", onTouch);
            try {
                gl.deleteTexture(texture);
                gl.deleteProgram(program);
                gl.deleteShader(vs);
                gl.deleteShader(fs);
            } catch (e) {}
        };
    }, [image]);

    // layout: container with children overlay is up to user;
    // here canvas covers 100% of container (user can wrap and put content underneath)
    return (
        <div
            className={`liquid-glass-shader-wrapper ${className}`}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                ...style,
            }}
        >
            {/* the actual image element used as texture (hidden) */}
            <img
                ref={imgRef}
                id="sourceImage"
                crossOrigin="anonymous"
                src={image}
                alt="source"
                style={{ display: "none" }}
            />

            {/* canvas overlay draws the distorted image */}
            <canvas
                ref={canvasRef}
                id="canvas"
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    pointerEvents: "none", // so clicks pass through to underlying content
                }}
            />
        </div>
    );
}
