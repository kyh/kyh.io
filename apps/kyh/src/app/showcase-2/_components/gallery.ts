import * as THREE from "three";

import { fragmentShader, vertexShader } from "./shaders";

export type MediaSource = {
  type: "image" | "video";
  src: string;
};

// A single tile in the vortex: one media asset tagged with the work it belongs
// to, so the centered caption can resolve back to the right project.
export type MediaTile = {
  media: MediaSource;
  workIndex: number;
};

// The tile currently in the spotlight — drives the live HTML hero + caption.
export type CenteredTile = {
  workIndex: number;
  media: MediaSource;
};

type Drawable = {
  source: CanvasImageSource;
  width: number;
  height: number;
};

type ImageInfo = {
  // Index into the original works array — preserved even when some media fail
  // to load, so the centered caption never desyncs from the centered image.
  workIndex: number;
  media: MediaSource;
  width: number;
  height: number;
  aspectRatio: number;
  uvs: { xStart: number; xEnd: number; yStart: number; yEnd: number };
};

type ScrollState = {
  speedTarget: number;
  speedCurrent: number;
  target: number;
  current: number;
  direction: number;
};

type GalleryOptions = {
  scene: THREE.Scene;
  tiles: MediaTile[];
  reducedMotion?: boolean;
  maxAnisotropy?: number;
  onCenterChange?: (centered: CenteredTile) => void;
};

// Cap each atlas cell so the stacked texture stays well within GPU limits.
// Higher = crisper tiles; total stacked height must stay under the GPU's max
// texture size (16384), which ~20 tiles at this cap comfortably does.
const ATLAS_MAX_SIZE = 1024;
const RADIUS = 6;
const HEIGHT = 120;
const COUNT = 600;
// Gentle perpetual drift speed when motion is allowed.
const DRIFT_SPEED = 0.002;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class Gallery {
  private readonly scene: THREE.Scene;
  private readonly tiles: MediaTile[];
  private readonly onCenterChange?: (centered: CenteredTile) => void;
  private readonly maxAnisotropy: number;
  private reducedMotion: boolean;

  private imageInfos: ImageInfo[] = [];
  private atlasTexture: THREE.Texture | null = null;
  private instancedMaterial: THREE.ShaderMaterial | null = null;
  // Typed handle on the shader uniforms. ShaderMaterial.uniforms is a string-
  // indexed map, so reading uTime back off it is `IUniform | undefined` under
  // noUncheckedIndexedAccess; holding the concrete object keeps it typed.
  private uniforms: {
    uTime: THREE.IUniform<number>;
    uAtlas: THREE.IUniform<THREE.Texture | null>;
    uScrollY: THREE.IUniform<number>;
    uZrange: THREE.IUniform<number>;
    uMaxZ: THREE.IUniform<number>;
    uSpeedY: THREE.IUniform<number>;
    uDirection: THREE.IUniform<number>;
  } | null = null;
  private instancedMesh: THREE.InstancedMesh | null = null;
  private centerIndex = -1;

  private readonly scroll: ScrollState = {
    speedTarget: 0,
    speedCurrent: 0,
    target: 0,
    current: 0,
    direction: 1,
  };

  constructor({ scene, tiles, reducedMotion, maxAnisotropy, onCenterChange }: GalleryOptions) {
    this.scene = scene;
    this.tiles = tiles;
    this.reducedMotion = reducedMotion ?? false;
    this.maxAnisotropy = maxAnisotropy ?? 1;
    this.onCenterChange = onCenterChange;
    void this.init();
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
  }

  private async init() {
    await this.loadTextureAtlas();
    if (this.imageInfos.length === 0 || !this.atlasTexture) return;
    this.createInstancedMesh();
  }

  private loadMedia(media: MediaSource): Promise<Drawable | null> {
    return media.type === "video"
      ? this.loadVideoFrame(media.src)
      : this.loadImageFrame(media.src);
  }

  private loadImageFrame(src: string): Promise<Drawable | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve({ source: img, width: img.width, height: img.height });
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  private loadVideoFrame(src: string): Promise<Drawable | null> {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      let settled = false;
      const finish = (value: Drawable | null) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      video.onloadeddata = () => {
        // Seek slightly past the start to skip a black or empty first frame.
        const duration = Number.isFinite(video.duration) ? video.duration : 1;
        video.currentTime = Math.min(0.5, duration * 0.1);
      };
      video.onseeked = () => {
        if (video.videoWidth === 0 || video.videoHeight === 0) return finish(null);
        finish({ source: video, width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = () => finish(null);

      video.src = src;
    });
  }

  private async loadTextureAtlas() {
    const loaded = await Promise.all(
      this.tiles.map((tile) =>
        this.loadMedia(tile.media).then((drawable) =>
          drawable ? { ...drawable, workIndex: tile.workIndex, media: tile.media } : null,
        ),
      ),
    );
    const drawables = loaded.filter(
      (d): d is Drawable & { workIndex: number; media: MediaSource } =>
        d !== null && d.width > 0 && d.height > 0,
    );
    if (drawables.length === 0) return;

    const cells = drawables.map((d) => {
      const scale = Math.min(1, ATLAS_MAX_SIZE / Math.max(d.width, d.height));
      return {
        source: d.source,
        workIndex: d.workIndex,
        media: d.media,
        width: Math.max(1, Math.round(d.width * scale)),
        height: Math.max(1, Math.round(d.height * scale)),
      };
    });

    const atlasWidth = Math.max(...cells.map((cell) => cell.width));
    const totalHeight = cells.reduce((sum, cell) => sum + cell.height, 0);

    const canvas = document.createElement("canvas");
    canvas.width = atlasWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let currentY = 0;
    this.imageInfos = cells.map((cell) => {
      ctx.drawImage(cell.source, 0, currentY, cell.width, cell.height);
      const info: ImageInfo = {
        workIndex: cell.workIndex,
        media: cell.media,
        width: cell.width,
        height: cell.height,
        aspectRatio: cell.width / cell.height,
        uvs: {
          xStart: 0,
          xEnd: cell.width / atlasWidth,
          yStart: 1 - currentY / totalHeight,
          yEnd: 1 - (currentY + cell.height) / totalHeight,
        },
      };
      currentY += cell.height;
      return info;
    });

    const texture = new THREE.Texture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Anisotropic filtering keeps tiles sharp when viewed at steep angles, and a
    // linear mag filter avoids hard pixelation up close.
    texture.anisotropy = this.maxAnisotropy;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    this.atlasTexture = texture;
  }

  private createInstancedMesh() {
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 0.075);

    this.uniforms = {
      uTime: new THREE.Uniform(0),
      uAtlas: new THREE.Uniform(this.atlasTexture),
      uScrollY: new THREE.Uniform(0),
      uZrange: new THREE.Uniform(HEIGHT),
      uMaxZ: new THREE.Uniform(HEIGHT * 0.5),
      uSpeedY: new THREE.Uniform(0),
      uDirection: new THREE.Uniform(this.scroll.direction),
    };

    this.instancedMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      precision: "highp",
      transparent: true,
      uniforms: this.uniforms,
    });

    const mesh = new THREE.InstancedMesh(geometry, this.instancedMaterial, COUNT);

    const aAngles = new Float32Array(COUNT);
    const aHeights = new Float32Array(COUNT);
    const aRadiuses = new Float32Array(COUNT);
    const aAspectRatios = new Float32Array(COUNT);
    const aSpeeds = new Float32Array(COUNT);
    const aImagesRes = new Float32Array(COUNT * 2);
    const aTextureCoords = new Float32Array(COUNT * 4);

    const circleCount = HEIGHT / 3;
    const circleHeight = HEIGHT / circleCount;

    const speeds = new Float32Array(circleCount);
    for (let j = 0; j < circleCount; j++) {
      speeds[j] = Math.random() * 0.2 + 0.8;
    }

    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      const imageIndex = Math.floor(Math.random() * this.imageInfos.length);
      const info = this.imageInfos[imageIndex];
      if (!info) continue;

      aTextureCoords[i * 4 + 0] = info.uvs.xStart;
      aTextureCoords[i * 4 + 1] = info.uvs.xEnd;
      aTextureCoords[i * 4 + 2] = info.uvs.yStart;
      aTextureCoords[i * 4 + 3] = info.uvs.yEnd;

      aImagesRes[i * 2 + 0] = info.width;
      aImagesRes[i * 2 + 1] = info.height;

      aAngles[i] = angle;
      aHeights[i] = (i % circleCount) * circleHeight - HEIGHT / 2;
      aRadiuses[i] = RADIUS;
      aAspectRatios[i] = info.aspectRatio;
      aSpeeds[i] = speeds[i % circleCount] ?? 1;
    }

    geometry.setAttribute("aAngle", new THREE.InstancedBufferAttribute(aAngles, 1));
    geometry.setAttribute("aHeight", new THREE.InstancedBufferAttribute(aHeights, 1));
    geometry.setAttribute("aRadius", new THREE.InstancedBufferAttribute(aRadiuses, 1));
    geometry.setAttribute("aAspectRatio", new THREE.InstancedBufferAttribute(aAspectRatios, 1));
    geometry.setAttribute("aSpeed", new THREE.InstancedBufferAttribute(aSpeeds, 1));
    geometry.setAttribute("aTextureCoords", new THREE.InstancedBufferAttribute(aTextureCoords, 4));
    geometry.setAttribute("aImageRes", new THREE.InstancedBufferAttribute(aImagesRes, 2));

    this.instancedMesh = mesh;
    this.scene.add(mesh);
  }

  updateScroll(delta: number, direction: number) {
    this.scroll.direction = direction;
    this.scroll.speedTarget += delta;
    this.scroll.target += delta;
  }

  render(time: number) {
    const uniforms = this.uniforms;
    if (!uniforms || this.imageInfos.length === 0) return;

    uniforms.uTime.value = time;

    // Gentle perpetual drift so the vortex is alive without input. Disabled when
    // the user prefers reduced motion — scrolling still drives it manually.
    if (!this.reducedMotion) {
      this.scroll.target += DRIFT_SPEED * this.scroll.direction;
      this.scroll.speedTarget += DRIFT_SPEED * this.scroll.direction;
    }

    const count = this.imageInfos.length;
    const position = Math.abs(Math.floor(this.scroll.speedTarget % count)) % count;
    const info = this.imageInfos[position];
    if (info && position !== this.centerIndex) {
      this.centerIndex = position;
      this.onCenterChange?.({ workIndex: info.workIndex, media: info.media });
    }

    this.scroll.current = lerp(this.scroll.current, this.scroll.target, 0.1);
    this.scroll.speedCurrent = lerp(this.scroll.speedCurrent, this.scroll.speedTarget, 0.1);

    uniforms.uScrollY.value = this.scroll.current;
    uniforms.uSpeedY.value = this.scroll.speedCurrent;
    uniforms.uDirection.value = this.scroll.direction;
  }

  dispose() {
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
    }
    this.instancedMaterial?.dispose();
    this.atlasTexture?.dispose();
  }
}
