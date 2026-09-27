import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  NoColorSpace,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";

// Solver ported from Pavel Dobryakov's WebGL-Fluid-Simulation (MIT).
// https://github.com/PavelDoGreat/WebGL-Fluid-Simulation
// Tuned to the ink trail in the Codegrid walkthrough of that repo:
// sim 256, dye 1024, dissipation 0.95, threshold 1, white ink.

const config = {
  curl: 12,
  pressureDecay: 0.8,
  velocityDissipation: 0.95,
  dyeDissipation: 0.95,
  splatRadius: 0.25,
  splatForce: 6000,
  threshold: 1,
  softness: 0.12,
  edgeBlur: 20,
  inkColor: new Vector3(1, 1, 1),
  // Threshold keeps only dye above 1, so the splat is brighter than the white ink.
  dyeStrength: 2.5,
};

const qualityTiers = {
  high: {
    simResolution: 256,
    dyeResolution: 1024,
    pressureIterations: 50,
    dprCap: 2,
  },
  medium: {
    simResolution: 192,
    dyeResolution: 768,
    pressureIterations: 35,
    dprCap: 1.5,
  },
  low: {
    simResolution: 128,
    dyeResolution: 512,
    pressureIterations: 24,
    dprCap: 1,
  },
} as const;

type QualitySettings = (typeof qualityTiers)[keyof typeof qualityTiers];

const IDLE_TAIL_MS = 3000;
const RESIZE_DEBOUNCE_MS = 150;

function selectQuality(): QualitySettings {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory =
    typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined;
  const cores =
    typeof nav.hardwareConcurrency === "number"
      ? nav.hardwareConcurrency
      : undefined;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewportPixels =
    Math.max(window.innerWidth, 1) * Math.max(window.innerHeight, 1) * dpr * dpr;

  if (
    viewportPixels > 8_000_000 ||
    (memory !== undefined && memory <= 4) ||
    (cores !== undefined && cores <= 4)
  ) {
    return qualityTiers.low;
  }

  const knownCapabilitySignals = [
    memory === undefined ? null : memory >= 8,
    cores === undefined ? null : cores >= 8,
  ].filter((signal): signal is boolean => signal !== null);

  if (
    viewportPixels <= 4_000_000 &&
    knownCapabilitySignals.length > 0 &&
    knownCapabilitySignals.every(Boolean)
  ) {
    return qualityTiers.high;
  }

  return qualityTiers.medium;
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 texelSize;

  void main() {
    vUv = uv;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const splatShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;

  void main() {
    vec2 p = vUv - point;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
  }
`;

const advectionShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform float dt;
  uniform float dissipation;

  void main() {
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    vec4 result = texture2D(uSource, coord);
    gl_FragColor = result * pow(dissipation, dt * 60.0);
  }
`;

const divergenceShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;

  void main() {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;
    vec2 C = texture2D(uVelocity, vUv).xy;

    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }

    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

const curlShader = /* glsl */ `
  precision highp float;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;

  void main() {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
  }
`;

const vorticityShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;

  void main() {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;

    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity += force * dt;
    velocity = clamp(velocity, -1000.0, 1000.0);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

const clearShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;

  void main() {
    gl_FragColor = value * texture2D(uTexture, vUv);
  }
`;

const pressureShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;

  void main() {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float divergence = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`;

const gradientSubtractShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;

  void main() {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

const displayShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec3 uInkColor;
  uniform vec2 uTexel;
  uniform float uThreshold;
  uniform float uSoftness;
  uniform float uEdgeBlur;

  float brightnessAt(vec2 uv) {
    vec3 dye = texture2D(uTexture, uv).rgb;
    return max(dye.r, max(dye.g, dye.b));
  }

  void main() {
    vec2 offset = uTexel * uEdgeBlur;
    float brightness = brightnessAt(vUv) * 0.22;
    brightness += brightnessAt(vUv + vec2(offset.x, 0.0)) * 0.12;
    brightness += brightnessAt(vUv - vec2(offset.x, 0.0)) * 0.12;
    brightness += brightnessAt(vUv + vec2(0.0, offset.y)) * 0.12;
    brightness += brightnessAt(vUv - vec2(0.0, offset.y)) * 0.12;
    brightness += brightnessAt(vUv + offset) * 0.075;
    brightness += brightnessAt(vUv + vec2(offset.x, -offset.y)) * 0.075;
    brightness += brightnessAt(vUv - offset) * 0.075;
    brightness += brightnessAt(vUv + vec2(-offset.x, offset.y)) * 0.075;

    float edge = max(uSoftness, 0.0001);
    float alpha = smoothstep(uThreshold - edge, uThreshold + edge, brightness);
    gl_FragColor = vec4(uInkColor * alpha, alpha);
  }
`;

class DoubleTarget {
  read: WebGLRenderTarget;
  write: WebGLRenderTarget;

  constructor(width: number, height: number) {
    this.read = createTarget(width, height);
    this.write = createTarget(width, height);
  }

  swap() {
    const previous = this.read;
    this.read = this.write;
    this.write = previous;
  }

  setSize(width: number, height: number) {
    this.read.setSize(width, height);
    this.write.setSize(width, height);
  }

  dispose() {
    this.read.dispose();
    this.write.dispose();
  }
}

function createTarget(width: number, height: number) {
  const target = new WebGLRenderTarget(width, height, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  });
  target.texture.colorSpace = NoColorSpace;
  return target;
}

function createMaterial(
  fragmentShader: string,
  uniforms: ShaderMaterial["uniforms"],
  transparent = false,
) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent,
    depthTest: false,
    depthWrite: false,
  });
}

export class FluidEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly quality: QualitySettings;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly geometry = new PlaneGeometry(2, 2);
  private readonly quad: Mesh;
  private readonly splatMaterial: ShaderMaterial;
  private readonly advectionMaterial: ShaderMaterial;
  private readonly divergenceMaterial: ShaderMaterial;
  private readonly curlMaterial: ShaderMaterial;
  private readonly vorticityMaterial: ShaderMaterial;
  private readonly clearMaterial: ShaderMaterial;
  private readonly pressureMaterial: ShaderMaterial;
  private readonly gradientMaterial: ShaderMaterial;
  private readonly displayMaterial: ShaderMaterial;
  private readonly dyeColor = new Vector3(config.dyeStrength, config.dyeStrength, config.dyeStrength);
  private readonly velocityColor = new Vector3();
  private readonly velocityTexel = new Vector2();
  private readonly pointer = new Vector2(0.5, 0.5);
  private readonly previousPointer = new Vector2(0.5, 0.5);
  private velocity: DoubleTarget;
  private dye: DoubleTarget;
  private divergence: WebGLRenderTarget;
  private curl: WebGLRenderTarget;
  private pressure: DoubleTarget;
  private frameId: number | null = null;
  private resizeTimer: number | null = null;
  private lastFrame = 0;
  private activeUntil = 0;
  private moved = false;
  private inside = false;
  private hasPointer = false;
  private needsClear = false;
  private sectionVisible = true;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.quality = selectQuality();
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = LinearSRGBColorSpace;
    this.renderer.autoClear = false;
    this.renderer.setClearColor(0x000000, 0);
    this.setRendererSize();

    const sim = this.fieldSize(this.quality.simResolution);
    const dye = this.fieldSize(this.quality.dyeResolution);
    this.velocity = new DoubleTarget(sim.width, sim.height);
    this.dye = new DoubleTarget(dye.width, dye.height);
    this.divergence = createTarget(sim.width, sim.height);
    this.curl = createTarget(sim.width, sim.height);
    this.pressure = new DoubleTarget(sim.width, sim.height);

    const texelSize = new Vector2(1, 1);
    this.splatMaterial = createMaterial(splatShader, {
      uTarget: { value: null },
      aspectRatio: { value: 1 },
      color: { value: new Vector3() },
      point: { value: new Vector2() },
      radius: { value: 0.01 },
      texelSize: { value: texelSize.clone() },
    });
    this.advectionMaterial = createMaterial(advectionShader, {
      uVelocity: { value: null },
      uSource: { value: null },
      texelSize: { value: texelSize.clone() },
      dt: { value: 0.016 },
      dissipation: { value: 1 },
    });
    this.divergenceMaterial = createMaterial(divergenceShader, {
      uVelocity: { value: null },
      texelSize: { value: texelSize.clone() },
    });
    this.curlMaterial = createMaterial(curlShader, {
      uVelocity: { value: null },
      texelSize: { value: texelSize.clone() },
    });
    this.vorticityMaterial = createMaterial(vorticityShader, {
      uVelocity: { value: null },
      uCurl: { value: null },
      curl: { value: config.curl },
      dt: { value: 0.016 },
      texelSize: { value: texelSize.clone() },
    });
    this.clearMaterial = createMaterial(clearShader, {
      uTexture: { value: null },
      value: { value: config.pressureDecay },
      texelSize: { value: texelSize.clone() },
    });
    this.pressureMaterial = createMaterial(pressureShader, {
      uPressure: { value: null },
      uDivergence: { value: null },
      texelSize: { value: texelSize.clone() },
    });
    this.gradientMaterial = createMaterial(gradientSubtractShader, {
      uPressure: { value: null },
      uVelocity: { value: null },
      texelSize: { value: texelSize.clone() },
    });
    this.displayMaterial = createMaterial(
      displayShader,
      {
        uTexture: { value: null },
        uInkColor: { value: config.inkColor },
        uThreshold: { value: config.threshold },
        uSoftness: { value: config.softness },
        uEdgeBlur: { value: config.edgeBlur },
        uTexel: { value: new Vector2(1 / 1024, 1 / 1024) },
        texelSize: { value: texelSize.clone() },
      },
      true,
    );

    this.quad = new Mesh(this.geometry, this.displayMaterial);
    this.scene.add(this.quad);

    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("resize", this.scheduleResize, { passive: true });
    document.addEventListener("visibilitychange", this.syncLoop);
  }

  setVisible(visible: boolean) {
    this.sectionVisible = visible;
    this.syncLoop();
  }

  setPointerBaseline(clientX: number, clientY: number) {
    if (this.destroyed) {
      return;
    }

    const point = this.normalizedPointer(clientX, clientY);

    if (!point) {
      return;
    }

    this.pointer.set(point.x, point.y);
    this.previousPointer.copy(this.pointer);
    this.hasPointer = true;
    this.inside = true;
    this.moved = false;
  }

  dispose() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    if (this.resizeTimer !== null) {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }

    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("resize", this.scheduleResize);
    document.removeEventListener("visibilitychange", this.syncLoop);

    this.velocity.dispose();
    this.dye.dispose();
    this.divergence.dispose();
    this.curl.dispose();
    this.pressure.dispose();
    this.splatMaterial.dispose();
    this.advectionMaterial.dispose();
    this.divergenceMaterial.dispose();
    this.curlMaterial.dispose();
    this.vorticityMaterial.dispose();
    this.clearMaterial.dispose();
    this.pressureMaterial.dispose();
    this.gradientMaterial.dispose();
    this.displayMaterial.dispose();
    this.geometry.dispose();
    this.renderer.dispose();
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    const point = this.normalizedPointer(event.clientX, event.clientY);

    if (!point) {
      this.inside = false;
      this.moved = false;
      return;
    }

    // The first sample only records where the cursor already is.
    // Painting it would stamp a dot from the fake 0.5, 0.5 origin on refresh.
    if (!this.hasPointer) {
      this.setPointerBaseline(event.clientX, event.clientY);
      return;
    }

    this.previousPointer.copy(this.pointer);
    this.pointer.set(point.x, point.y);
    this.inside = true;
    this.moved = true;
    this.needsClear = true;
    this.activeUntil = performance.now() + IDLE_TAIL_MS;
    this.syncLoop();
  };

  private normalizedPointer(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    const x = (clientX - rect.left) / rect.width;
    const y = 1 - (clientY - rect.top) / rect.height;

    if (x < 0 || x > 1 || y < 0 || y > 1) {
      return null;
    }

    return { x, y };
  }

  private setRendererSize() {
    const width = Math.max(this.canvas.clientWidth, 1);
    const height = Math.max(this.canvas.clientHeight, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality.dprCap);
    this.renderer.setDrawingBufferSize(width, height, dpr);
  }

  private readonly scheduleResize = () => {
    if (this.resizeTimer !== null) {
      window.clearTimeout(this.resizeTimer);
    }

    this.resizeTimer = window.setTimeout(() => {
      this.resizeTimer = null;
      this.resize();
    }, RESIZE_DEBOUNCE_MS);
  };

  private resize() {
    const width = Math.max(this.canvas.clientWidth, 1);
    const height = Math.max(this.canvas.clientHeight, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality.dprCap);
    const bufferWidth = Math.floor(width * dpr);
    const bufferHeight = Math.floor(height * dpr);

    if (
      bufferWidth === this.renderer.domElement.width &&
      bufferHeight === this.renderer.domElement.height
    ) {
      return;
    }

    this.renderer.setDrawingBufferSize(width, height, dpr);

    const sim = this.fieldSize(this.quality.simResolution);
    const dye = this.fieldSize(this.quality.dyeResolution);
    this.velocity.setSize(sim.width, sim.height);
    this.divergence.setSize(sim.width, sim.height);
    this.curl.setSize(sim.width, sim.height);
    this.pressure.setSize(sim.width, sim.height);
    this.dye.setSize(dye.width, dye.height);
    this.moved = false;
    this.activeUntil = 0;
    this.needsClear = false;
    this.syncLoop();
  }

  private fieldSize(resolution: number) {
    const bufferWidth = Math.max(this.renderer.domElement.width, 1);
    const bufferHeight = Math.max(this.renderer.domElement.height, 1);
    let aspect = bufferWidth / bufferHeight;

    if (aspect < 1) {
      aspect = 1 / aspect;
    }

    const min = Math.round(resolution);
    const max = Math.round(resolution * aspect);

    if (bufferWidth > bufferHeight) {
      return { width: max, height: min };
    }

    return { width: min, height: max };
  }

  private readonly syncLoop = () => {
    if (this.destroyed) {
      return;
    }

    const now = performance.now();
    const hasActivity = this.moved || now < this.activeUntil;
    const shouldRun = this.sectionVisible && !document.hidden && hasActivity;

    if (!shouldRun && this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    if (shouldRun && this.frameId === null) {
      this.lastFrame = now;
      this.frameId = requestAnimationFrame(this.renderFrame);
      return;
    }

    if (
      !hasActivity &&
      this.sectionVisible &&
      !document.hidden &&
      this.needsClear
    ) {
      this.clearFluid();
    }
  };

  private readonly renderFrame = (now: number) => {
    this.frameId = null;

    if (this.destroyed || !this.sectionVisible || document.hidden) {
      return;
    }

    if (!this.moved && now >= this.activeUntil) {
      this.clearFluid();
      return;
    }

    const delta = Math.min((now - this.lastFrame) / 1000, 0.016666);
    this.lastFrame = now;

    if (this.moved && this.inside) {
      this.splatPointer();
      this.moved = false;
    }

    this.step(delta);
    this.draw();
    this.syncLoop();
  };

  private clearFluid() {
    const targets = [
      this.velocity.read,
      this.velocity.write,
      this.dye.read,
      this.dye.write,
      this.divergence,
      this.curl,
      this.pressure.read,
      this.pressure.write,
    ];

    for (const target of targets) {
      this.renderer.setRenderTarget(target);
      this.renderer.clear();
    }

    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.needsClear = false;
  }

  private splatPointer() {
    const aspect = this.aspect;
    let deltaX = this.pointer.x - this.previousPointer.x;
    let deltaY = this.pointer.y - this.previousPointer.y;

    if (aspect < 1) {
      deltaX *= aspect;
    }

    if (aspect > 1) {
      deltaY /= aspect;
    }

    const radius = this.splatRadius();
    this.velocityColor.set(deltaX * config.splatForce, deltaY * config.splatForce, 0);
    this.splat(this.pointer, this.velocityColor, radius, this.velocity);
    this.splat(this.pointer, this.dyeColor, radius, this.dye);
  }

  private splatRadius() {
    let radius = config.splatRadius / 100;

    if (this.aspect > 1) {
      radius *= this.aspect;
    }

    return radius;
  }

  private splat(
    point: Vector2,
    color: Vector3,
    radius: number,
    target: DoubleTarget,
  ) {
    const uniforms = this.splatMaterial.uniforms;
    uniforms.uTarget.value = target.read.texture;
    uniforms.aspectRatio.value = this.aspect;
    uniforms.color.value = color;
    uniforms.point.value = point;
    uniforms.radius.value = radius;
    this.pass(this.splatMaterial, target.write);
    target.swap();
  }

  private step(dt: number) {
    const velocityTexel = this.velocityTexel.set(
      1 / this.velocity.read.width,
      1 / this.velocity.read.height,
    );

    this.curlMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
    this.curlMaterial.uniforms.texelSize.value.copy(velocityTexel);
    this.pass(this.curlMaterial, this.curl);

    this.vorticityMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
    this.vorticityMaterial.uniforms.uCurl.value = this.curl.texture;
    this.vorticityMaterial.uniforms.dt.value = dt;
    this.vorticityMaterial.uniforms.texelSize.value.copy(velocityTexel);
    this.pass(this.vorticityMaterial, this.velocity.write);
    this.velocity.swap();

    this.divergenceMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
    this.divergenceMaterial.uniforms.texelSize.value.copy(velocityTexel);
    this.pass(this.divergenceMaterial, this.divergence);

    this.clearMaterial.uniforms.uTexture.value = this.pressure.read.texture;
    this.pass(this.clearMaterial, this.pressure.write);
    this.pressure.swap();

    this.pressureMaterial.uniforms.uDivergence.value = this.divergence.texture;
    this.pressureMaterial.uniforms.texelSize.value.copy(velocityTexel);

    for (let i = 0; i < this.quality.pressureIterations; i += 1) {
      this.pressureMaterial.uniforms.uPressure.value = this.pressure.read.texture;
      this.pass(this.pressureMaterial, this.pressure.write);
      this.pressure.swap();
    }

    this.gradientMaterial.uniforms.uPressure.value = this.pressure.read.texture;
    this.gradientMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
    this.gradientMaterial.uniforms.texelSize.value.copy(velocityTexel);
    this.pass(this.gradientMaterial, this.velocity.write);
    this.velocity.swap();

    this.advect(this.velocity.read.texture, this.velocity, config.velocityDissipation, dt, velocityTexel);
    this.advect(this.velocity.read.texture, this.dye, config.dyeDissipation, dt, velocityTexel);
  }

  private advect(
    velocity: WebGLRenderTarget["texture"],
    target: DoubleTarget,
    dissipation: number,
    dt: number,
    velocityTexel: Vector2,
  ) {
    const uniforms = this.advectionMaterial.uniforms;
    uniforms.uVelocity.value = velocity;
    uniforms.uSource.value = target.read.texture;
    uniforms.texelSize.value.copy(velocityTexel);
    uniforms.dt.value = dt;
    uniforms.dissipation.value = dissipation;
    this.pass(this.advectionMaterial, target.write);
    target.swap();
  }

  private draw() {
    const dye = this.dye.read;
    this.displayMaterial.uniforms.uTexture.value = dye.texture;
    this.displayMaterial.uniforms.uTexel.value.set(1 / dye.width, 1 / dye.height);
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.pass(this.displayMaterial, null);
  }

  private pass(material: ShaderMaterial, target: WebGLRenderTarget | null) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
  }

  private get aspect() {
    const width = Math.max(this.renderer.domElement.width, 1);
    const height = Math.max(this.renderer.domElement.height, 1);
    return width / height;
  }
}
