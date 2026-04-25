import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AuthTransitionOverlayProps {
  active: boolean;
  reveal: boolean;
  onComplete?: () => void;
}

const BACKGROUND_IMAGE_URL = "/background.png";
const SHARPEN_DURATION_MS = 2000;
const SHARPEN_HOLD_MS = 260;
const DISSOLVE_DURATION_MS = 1800;

export function AuthTransitionOverlay({ active, reveal, onComplete }: AuthTransitionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const revealRef = useRef(reveal);
  const completeRef = useRef(onComplete);
  const [done, setDone] = useState(false);
  const [startDissolve, setStartDissolve] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    revealRef.current = reveal;
  }, [reveal]);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!active) {
      setDone(false);
      setStartDissolve(false);
      setCanvasReady(false);
    }
  }, [active]);

  useEffect(() => {
    if (!active || !reveal) {
      return;
    }

    setCanvasReady(false);

    const timeoutId = window.setTimeout(() => {
      setStartDissolve(true);
    }, SHARPEN_DURATION_MS + SHARPEN_HOLD_MS);

    return () => window.clearTimeout(timeoutId);
  }, [active, reveal]);

  useEffect(() => {
    if (!active || !startDissolve || !canvasRef.current || !overlayRef.current) {
      return;
    }

    let disposed = false;
    let frameId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let cleanup: (() => void) | undefined;

    async function setupScene() {
      try {
        const THREE = await import("three");
        if (disposed || !canvasRef.current || !overlayRef.current) {
          return;
        }

        const canvas = canvasRef.current;
        const container = overlayRef.current;
        const renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          premultipliedAlpha: false,
        });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const geometry = new THREE.PlaneGeometry(2, 2);
        const texture = await new THREE.TextureLoader().loadAsync(BACKGROUND_IMAGE_URL);

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const uniforms = {
          uTexture: { value: texture },
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uImageResolution: {
            value: new THREE.Vector2(texture.image.width || 1, texture.image.height || 1),
          },
          uProgress: { value: 0 },
        };

        const material = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms,
          vertexShader: `
            varying vec2 vUv;

            void main() {
              vUv = uv;
              gl_Position = vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec2 vUv;

            uniform sampler2D uTexture;
            uniform float uTime;
            uniform vec2 uResolution;
            uniform vec2 uImageResolution;
            uniform float uProgress;

            float random(vec2 st) {
              return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }

            float noise(vec2 st) {
              vec2 i = floor(st);
              vec2 f = fract(st);
              float a = random(i);
              float b = random(i + vec2(1.0, 0.0));
              float c = random(i + vec2(0.0, 1.0));
              float d = random(i + vec2(1.0, 1.0));
              vec2 u = f * f * (3.0 - 2.0 * f);
              return mix(a, b, u.x)
                + (c - a) * u.y * (1.0 - u.x)
                + (d - b) * u.x * u.y;
            }

            float fbm(vec2 st) {
              float value = 0.0;
              float amplitude = 0.5;
              for (int i = 0; i < 5; i++) {
                value += amplitude * noise(st);
                st *= 2.0;
                amplitude *= 0.5;
              }
              return value;
            }

            vec2 coverUv(vec2 uv, vec2 screen, vec2 image) {
              float rs = screen.x / screen.y;
              float ri = image.x / image.y;
              vec2 scaled = rs < ri
                ? vec2(image.x * screen.y / image.y, screen.y)
                : vec2(screen.x, image.y * screen.x / image.x);
              vec2 offset = (scaled - screen) / scaled * 0.5;
              return uv * (screen / scaled) + offset;
            }

            void main() {
              vec2 uv = vUv;
              float progress = smoothstep(0.0, 1.0, uProgress);
              vec2 fromCenter = uv - vec2(0.5);
              float radius = length(fromCenter);

              float flowA = fbm(uv * 3.2 + vec2(uTime * 0.18, -uTime * 0.14));
              float flowB = fbm(uv * 6.6 + vec2(-uTime * 0.11, uTime * 0.16));
              vec2 liquidWarp = vec2(flowA - 0.5, flowB - 0.5) * (0.028 + progress * 0.07);

              vec2 sampleUv = clamp(uv + liquidWarp * progress, 0.0, 1.0);
              vec3 image = texture2D(uTexture, coverUv(sampleUv, uResolution, uImageResolution)).rgb;

              float ripple = fbm(uv * 9.0 - liquidWarp * 8.0 + uTime * 0.09);
              float breakup = noise(uv * 22.0 + liquidWarp * 10.0 - uTime * 0.05);
              float threshold = progress * 0.78;
              float field = radius - threshold + (ripple - 0.5) * 0.12 + (breakup - 0.5) * 0.06;

              float dissolveMask = 1.0 - smoothstep(-0.03, 0.08, field);
              float rim = smoothstep(-0.045, -0.005, field) - smoothstep(-0.005, 0.055, field);
              vec3 rimColor = mix(vec3(0.72, 0.86, 1.0), vec3(0.98, 0.99, 1.0), ripple);

              vec3 finalColor = image + rimColor * rim * 0.85;
              float alpha = 1.0 - dissolveMask;

              gl_FragColor = vec4(finalColor, alpha);
            }
          `,
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        const resize = () => {
          if (!overlayRef.current) {
            return;
          }

          const { clientWidth, clientHeight } = overlayRef.current;
          renderer.setSize(clientWidth, clientHeight, false);
          uniforms.uResolution.value.set(clientWidth, clientHeight);
        };

        resize();
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);

        const startTime = performance.now();
        let firstFrameRendered = false;
        const render = (time: number) => {
          if (disposed) {
            return;
          }

          const progress = Math.max(0, Math.min((time - startTime) / DISSOLVE_DURATION_MS, 1));
          uniforms.uTime.value = time * 0.001;
          uniforms.uProgress.value = progress;
          renderer.render(scene, camera);

          if (!firstFrameRendered) {
            firstFrameRendered = true;
            setCanvasReady(true);
          }

          if (progress >= 1) {
            setDone(true);
            completeRef.current?.();
            return;
          }

          frameId = window.requestAnimationFrame(render);
        };

        frameId = window.requestAnimationFrame(render);

        cleanup = () => {
          window.cancelAnimationFrame(frameId);
          resizeObserver?.disconnect();
          geometry.dispose();
          material.dispose();
          texture.dispose();
          renderer.dispose();
        };
      } catch {
        setDone(true);
        completeRef.current?.();
      }
    }

    void setupScene();

    return () => {
      disposed = true;
      cleanup?.();
      resizeObserver?.disconnect();
    };
  }, [active, startDissolve]);

  if (!active || done) {
    return null;
  }

  const isSharpening = !startDissolve || !canvasReady;

  return (
    <div ref={overlayRef} className="pointer-events-none fixed inset-0 z-[120] overflow-hidden" aria-hidden="true">
      {isSharpening && (
        <>
          <div
            className={cn(
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-[filter] duration-[2000ms] ease-linear",
              reveal ? "blur-0" : "blur-2xl",
            )}
            style={{ backgroundImage: `url('${BACKGROUND_IMAGE_URL}')` }}
          />
          <div
            className={cn(
              "absolute inset-0 bg-black/28 transition-opacity duration-[2000ms] ease-linear",
              reveal ? "opacity-0" : "opacity-100",
            )}
          />
        </>
      )}
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 h-full w-full transition-opacity duration-150",
          canvasReady ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
