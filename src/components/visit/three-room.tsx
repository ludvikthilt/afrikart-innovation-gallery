"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { artworkImageUrl } from "@/lib/images";
import type { VisitPosition } from "@/lib/visit/navigation";
import type { VisitArtwork, VisitExhibition } from "@/lib/visit/types";
import { useWide } from "@/lib/visit/use-media";
import type { WallSide } from "@/types/database";

type Props = {
  exhibition: VisitExhibition;
  position: VisitPosition;
  reducedMotion: boolean;
  onFocus: (slug: string) => void;
  onWall: (room: number, wall: number) => void;
  /** Appelé si l'appareil peine (< 24 fps) : la visite propose le mode léger, sans basculer seule. */
  onSlow: () => void;
};

const EYE = 1.6; // hauteur des yeux et du centre des œuvres (m)
const HEIGHT = 4.4;
const FOV = 58;
const ROTATION: Record<WallSide, number> = { north: 0, east: -Math.PI / 2, south: Math.PI, west: Math.PI / 2 };

// « Musée blanc » d'après la photo de référence ; « nuit » en variante.
const THEME = {
  museum: {
    wall: "#f8f2e5",
    floor: "#dacfb9",
    ceiling: "#fcf7ec",
    slat: "#efe5d0",
    light: "#fffdf4",
    skirting: "#7d6c4c",
    fog: "#f5eddc",
    hemi: 1.25,
    ambient: 1.15,
    sun: 1.0,
    frame: "#1f4d2a",
    mat: "#fffcf3",
  },
  dark: {
    wall: "#1d3326",
    floor: "#122119",
    ceiling: "#0e1a13",
    slat: "#173024",
    light: "#d9dcff",
    skirting: "#0b0b0e",
    fog: "#0f1d15",
    hemi: 0.9,
    ambient: 0.6,
    sun: 0.8,
    frame: "#b08d57",
    mat: "#f4f1ea",
  },
};

type Placed = { artwork: VisitArtwork; wallIndex: number; spot: number; center: THREE.Vector3; normal: THREE.Vector3; w: number; h: number };

/** Géométrie de la salle : carrée, dimensionnée sur le mur le plus chargé. */
function useRoomLayout(exhibition: VisitExhibition, roomIndex: number) {
  return useMemo(() => {
    const room = exhibition.rooms[roomIndex];
    const busiest = Math.max(1, ...room.walls.map((w) => w.artworks.length));
    const size = Math.max(11, busiest * 4.2 + 3);
    const placed: Placed[] = [];
    const walls = room.walls.map((wall, wallIndex) => {
      const rot = ROTATION[wall.side];
      const normal = new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot));
      const wallCenter = normal.clone().multiplyScalar(-size / 2).setY(EYE);
      const tangent = new THREE.Vector3(Math.cos(rot), 0, -Math.sin(rot));
      const spacing = Math.min(4.2, (size - 2) / wall.artworks.length);
      wall.artworks.forEach((artwork, spot) => {
        const ratio = artwork.image_width / artwork.image_height;
        const h = Math.min(2.3, (spacing * 0.7) / ratio);
        const offset = (spot - (wall.artworks.length - 1) / 2) * spacing;
        const center = wallCenter.clone().add(tangent.clone().multiplyScalar(offset)).add(normal.clone().multiplyScalar(0.05));
        center.y = EYE + 0.15;
        placed.push({ artwork, wallIndex, spot, center, normal, w: h * ratio, h });
      });
      return { side: wall.side, rot, wallCenter, normal };
    });
    return { size, walls, placed };
  }, [exhibition, roomIndex]);
}

export default function ThreeRoom(props: Props) {
  const theme = THEME[props.exhibition.room_theme];
  return (
    <div className="absolute inset-0" aria-hidden={props.position.focus !== null}>
      <Canvas
        flat
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ fov: FOV, near: 0.1, far: 80, position: [0, EYE, 3] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color(theme.fog);
        }}
      >
        <hemisphereLight args={["#ffffff", "#bfbfbf", theme.hemi]} />
        <ambientLight intensity={theme.ambient} />
        {/* Lumière zénithale oblique : chaque mur reçoit une intensité différente → profondeur */}
        <directionalLight position={[4, 9, 6]} intensity={theme.sun} />
        <Scene {...props} />
      </Canvas>
    </div>
  );
}

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

function Scene({ exhibition, position, reducedMotion, onFocus, onWall, onSlow }: Props) {
  const { size, walls, placed } = useRoomLayout(exhibition, position.room);
  const theme = THEME[exhibition.room_theme];
  const wide = useWide();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const viewport = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  // ---------------------------------------------------- caméra sur rails
  const goal = useMemo(() => {
    const aspect = viewport.width / Math.max(1, viewport.height);
    const vHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const hHalf = vHalf * aspect;
    const focused = placed.find((p) => p.artwork.slug === position.focus);

    if (focused) {
      // Face à l'œuvre, décalée pour laisser la place au panneau d'information.
      const right = new THREE.Vector3(focused.normal.z, 0, -focused.normal.x);
      const dist = wide
        ? Math.max((focused.h * 1.3) / (2 * vHalf), (focused.w * 1.3) / (2 * hHalf * 0.62))
        : Math.max((focused.h * 1.2) / (2 * vHalf * 0.45), (focused.w * 1.2) / (2 * hHalf));
      const shift = wide ? right.multiplyScalar(0.38 * hHalf * dist) : new THREE.Vector3(0, -0.55 * vHalf * dist, 0);
      const target = focused.center.clone().add(shift);
      return { pos: target.clone().add(focused.normal.clone().multiplyScalar(dist)), target, crossRoom: false };
    }

    const wall = walls[position.wall];
    if (!wide) {
      // Mobile : une œuvre à la fois, cadrée verticalement, le mur et le sol visibles autour.
      const spot = placed.find((p) => p.wallIndex === position.wall && p.spot === position.spot) ?? placed.find((p) => p.wallIndex === position.wall);
      if (spot) {
        const dist = Math.min(size - 1, Math.max((spot.h * 1.9) / (2 * vHalf), (spot.w * 1.5) / (2 * hHalf)));
        const target = spot.center.clone().setY(EYE + 0.05);
        return { pos: target.clone().add(spot.normal.clone().multiplyScalar(dist)).setY(EYE), target, crossRoom: true };
      }
    }
    // Ordinateur : recul suffisant pour voir le mur entier, les murs latéraux, le sol et le plafond.
    const dist = Math.min(size * 0.64, size - 0.8);
    return {
      pos: wall.wallCenter.clone().add(wall.normal.clone().multiplyScalar(dist)).setY(EYE),
      target: wall.wallCenter.clone().setY(EYE + 0.1),
      crossRoom: true,
    };
  }, [walls, placed, position.wall, position.spot, position.focus, size, viewport, wide]);

  const anim = useRef<{ from: THREE.Vector3; fromTarget: THREE.Vector3; via: THREE.Vector3 | null; start: number; duration: number } | null>(null);
  const lookAt = useRef(new THREE.Vector3(0, EYE, -size / 2));
  const fps = useRef({ frames: 0, time: 0, slowRuns: 0, warned: false });

  useEffect(() => {
    const from = camera.position.clone();
    // Changer de mur = traverser la salle : on passe près du centre, en tournant la tête.
    const turning = goal.crossRoom && from.distanceTo(goal.pos) > 1.5;
    anim.current = {
      from,
      fromTarget: lookAt.current.clone(),
      via: turning ? new THREE.Vector3(0, EYE, 0).lerp(from.clone().add(goal.pos).multiplyScalar(0.5), 0.4) : null,
      start: performance.now(),
      duration: reducedMotion ? 0 : turning ? 1600 : 1100,
    };
    invalidate();
  }, [goal, camera, invalidate, reducedMotion]);

  useFrame((_, delta) => {
    const a = anim.current;
    if (!a) return;
    const k = a.duration === 0 ? 1 : Math.min(1, (performance.now() - a.start) / a.duration);
    const e = easeInOut(k);
    if (a.via) {
      // Bézier quadratique : départ → centre de la salle → arrivée.
      const p0 = a.from.clone().multiplyScalar((1 - e) * (1 - e));
      const p1 = a.via.clone().multiplyScalar(2 * (1 - e) * e);
      const p2 = goal.pos.clone().multiplyScalar(e * e);
      camera.position.copy(p0.add(p1).add(p2));
    } else {
      camera.position.lerpVectors(a.from, goal.pos, e);
    }
    lookAt.current.lerpVectors(a.fromTarget, goal.target, e);
    camera.lookAt(lookAt.current);

    fps.current.frames++;
    fps.current.time += delta;
    if (k < 1) {
      invalidate();
      return;
    }
    anim.current = null;
    const f = fps.current;
    if (f.frames >= 20 && f.frames / f.time < 24) {
      f.slowRuns++;
      if (f.slowRuns >= 2 && !f.warned) {
        f.warned = true;
        onSlow();
      }
    }
    f.frames = 0;
    f.time = 0;
  });

  // Textures moyennes : mur courant (ordinateur) ou œuvre courante ± 1 (mobile), et l'œuvre regardée.
  const nearSlugs = useMemo(() => {
    const onWall = placed.filter((p) => p.wallIndex === position.wall && (wide || Math.abs(p.spot - position.spot) <= 1));
    const set = new Set(onWall.map((p) => p.artwork.slug));
    if (position.focus) set.add(position.focus);
    return set;
  }, [placed, position.wall, position.spot, position.focus, wide]);

  return (
    <group>
      {/* Brume légère : les murs lointains pâlissent, la salle gagne en profondeur */}
      <fog attach="fog" args={[theme.fog, size * 0.9, size * 3]} />
      <Architecture size={size} theme={theme} />
      {(["north", "east", "south", "west"] as WallSide[]).map((side) => {
        const rot = ROTATION[side];
        const index = walls.findIndex((w) => w.side === side);
        return (
          <group key={side} position={[-Math.sin(rot) * (size / 2), 0, -Math.cos(rot) * (size / 2)]} rotation-y={rot}>
            <mesh
              position={[0, HEIGHT / 2, 0]}
              onClick={(e) => {
                if (index >= 0 && index !== position.wall && !position.focus) {
                  e.stopPropagation();
                  onWall(position.room, index);
                }
              }}
            >
              <planeGeometry args={[size, HEIGHT]} />
              <meshStandardMaterial color={theme.wall} roughness={0.92} />
            </mesh>
            {/* Plinthe en creux : la ligne d'ombre au pied du mur donne la perspective */}
            <mesh position={[0, 0.04, 0.005]}>
              <planeGeometry args={[size, 0.08]} />
              <meshBasicMaterial color={theme.skirting} />
            </mesh>
          </group>
        );
      })}
      {placed.map((p) => (
        <Artwork3D
          key={p.artwork.id}
          placed={p}
          near={nearSlugs.has(p.artwork.slug)}
          frame={theme.frame}
          mat={theme.mat}
          onClick={() => !position.focus && onFocus(p.artwork.slug)}
        />
      ))}
    </group>
  );
}

/** Sol et plafond à lattes avec bandes lumineuses. */
function Architecture({ size, theme }: { size: number; theme: (typeof THEME)["museum"] }) {
  const slats = useMemo(() => {
    const count = Math.floor(size / 0.55);
    return Array.from({ length: count }, (_, i) => -size / 2 + 0.3 + i * 0.55);
  }, [size]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={theme.floor} roughness={0.38} metalness={0.05} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, HEIGHT, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={theme.ceiling} roughness={1} />
      </mesh>
      {/* Lattes du plafond, une sur quatre est une bande lumineuse */}
      {slats.map((x, i) =>
        i % 4 === 0 ? (
          <mesh key={x} position={[x, HEIGHT - 0.02, 0]} rotation-x={Math.PI / 2}>
            <planeGeometry args={[0.16, size]} />
            <meshBasicMaterial color={theme.light} toneMapped={false} />
          </mesh>
        ) : (
          <mesh key={x} position={[x, HEIGHT - 0.08, 0]}>
            <boxGeometry args={[0.05, 0.14, size]} />
            <meshStandardMaterial color={theme.slat} roughness={0.9} />
          </mesh>
        ),
      )}
    </group>
  );
}

/** Texture chargée à la demande et libérée au démontage. */
function useArtTexture(url: string | null) {
  const invalidate = useThree((s) => s.invalidate);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    let loaded: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(url, (t) => {
      if (!alive) return t.dispose();
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      loaded = t;
      setTexture(t);
      invalidate();
    });
    return () => {
      alive = false;
      loaded?.dispose();
      setTexture(null);
    };
  }, [url, invalidate]);
  return url ? texture : null;
}

let shadowTexture: THREE.Texture | null = null;
/** Ombre portée douce sous l'œuvre (précalculée, pas d'ombre temps réel). */
function getShadow(): THREE.Texture {
  if (shadowTexture) return shadowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  shadowTexture = new THREE.CanvasTexture(canvas);
  return shadowTexture;
}

function Artwork3D({ placed, near, frame, mat, onClick }: { placed: Placed; near: boolean; frame: string; mat: string; onClick: () => void }) {
  const { artwork, center, normal, w, h } = placed;
  // Miniature d'abord, moyenne quand l'œuvre est proche ou regardée.
  const thumb = useArtTexture(artworkImageUrl(artwork, "thumb"));
  const medium = useArtTexture(near ? artworkImageUrl(artwork, "medium") : null);
  const map = medium ?? thumb;
  const rotation = Math.atan2(normal.x, normal.z);
  const shadow = useMemo(() => getShadow(), []);

  // Encadrement : passe-partout blanc + baguette en relief sur les 4 côtés.
  const M = Math.max(0.07, Math.min(w, h) * 0.08); // largeur du passe-partout
  const B = 0.055; // largeur de la baguette
  const D = 0.06; // profondeur de la baguette (relief visible de biais)
  const outerW = w + 2 * M + 2 * B;
  const outerH = h + 2 * M + 2 * B;

  return (
    <group position={center} rotation-y={rotation}>
      <mesh position={[0.1, -0.12, -0.035]}>
        <planeGeometry args={[outerW * 1.3, outerH * 1.25]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
      {/* Fond du cadre et passe-partout */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[w + 2 * M, h + 2 * M, 0.02]} />
        <meshStandardMaterial color={mat} roughness={0.9} />
      </mesh>
      {/* Baguette : haut, bas, gauche, droite */}
      {[
        { pos: [0, h / 2 + M + B / 2, D / 2 - 0.02], size: [outerW, B, D] },
        { pos: [0, -(h / 2 + M + B / 2), D / 2 - 0.02], size: [outerW, B, D] },
        { pos: [-(w / 2 + M + B / 2), 0, D / 2 - 0.02], size: [B, h + 2 * M, D] },
        { pos: [w / 2 + M + B / 2, 0, D / 2 - 0.02], size: [B, h + 2 * M, D] },
      ].map((bar, i) => (
        <mesh key={i} position={bar.pos as [number, number, number]}>
          <boxGeometry args={bar.size as [number, number, number]} />
          <meshStandardMaterial color={frame} roughness={0.45} metalness={0.15} />
        </mesh>
      ))}
      <mesh
        position={[0, 0, 0.002]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => (document.body.style.cursor = "zoom-in")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial key={map ? map.uuid : "placeholder"} map={map} color={map ? "#ffffff" : (artwork.dominant_color ?? "#999")} toneMapped={false} />
      </mesh>
      {/* Cartel blanc à droite de l'œuvre */}
      <mesh position={[outerW / 2 + 0.25, -outerH / 2 + 0.12, 0.004]}>
        <planeGeometry args={[0.3, 0.16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
    </group>
  );
}
