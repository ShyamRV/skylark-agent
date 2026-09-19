"use client";

import { RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group, Mesh } from "three";

export type RobotAction =
  | "idle"
  | "sleep"
  | "wave"
  | "dance"
  | "nod"
  | "think"
  | "work"
  | "happy";

function Robot({ action }: { action: RobotAction }) {
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const leftEye = useRef<Mesh>(null);
  const rightEye = useRef<Mesh>(null);
  const mouth = useRef<Mesh>(null);
  const leftTypingHand = useRef<Mesh>(null);
  const rightTypingHand = useRef<Mesh>(null);
  const { pointer } = useThree();

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (
      !root.current ||
      !head.current ||
      !rightArm.current ||
      !leftArm.current ||
      !rightLeg.current ||
      !leftLeg.current
    )
      return;

    root.current.position.y = -0.1 + Math.sin(time * 1.7) * 0.035;
    root.current.rotation.y +=
      (pointer.x * 0.22 - root.current.rotation.y) * 0.06;
    root.current.rotation.z *= 0.88;
    head.current.rotation.x +=
      (-pointer.y * 0.08 - head.current.rotation.x) * 0.07;
    head.current.rotation.y *= 0.86;
    head.current.rotation.z *= 0.86;
    rightArm.current.rotation.z +=
      (0.16 - rightArm.current.rotation.z) * 0.12;
    leftArm.current.rotation.z +=
      (-0.16 - leftArm.current.rotation.z) * 0.12;
    rightArm.current.rotation.x *= 0.86;
    leftArm.current.rotation.x *= 0.86;
    rightArm.current.rotation.y *= 0.86;
    leftArm.current.rotation.y *= 0.86;
    rightLeg.current.rotation.z *= 0.82;
    leftLeg.current.rotation.z *= 0.82;

    const blink =
      action === "sleep" ? 0.07 : time % 3.8 > 3.68 ? 0.08 : 1;
    if (leftEye.current && rightEye.current) {
      const focus = action === "work" ? 0.62 : 1;
      leftEye.current.scale.y = blink * focus;
      rightEye.current.scale.y = blink * focus;
      leftEye.current.rotation.z = action === "sleep" ? 0.08 : 0;
      rightEye.current.rotation.z = action === "sleep" ? -0.08 : 0;
    }
    if (mouth.current) {
      const smiling = ["happy", "dance", "wave"].includes(action);
      mouth.current.visible = action !== "work";
      mouth.current.scale.x = smiling ? 1.2 : 0.78;
      mouth.current.scale.y = action === "sleep" ? 0.2 : smiling ? 1 : 0.55;
    }

    if (action === "wave") {
      const waveTarget = 2.25 + Math.sin(time * 9) * 0.28;
      rightArm.current.rotation.z +=
        (waveTarget - rightArm.current.rotation.z) * 0.22;
      head.current.rotation.z +=
        (Math.sin(time * 3) * 0.05 - head.current.rotation.z) * 0.12;
    } else if (action === "dance") {
      root.current.rotation.z +=
        (Math.sin(time * 5) * 0.07 - root.current.rotation.z) * 0.2;
      root.current.position.y += Math.abs(Math.sin(time * 5)) * 0.055;
      const armSwing = Math.sin(time * 5) * 0.38;
      rightArm.current.rotation.z +=
        (0.55 + armSwing - rightArm.current.rotation.z) * 0.2;
      leftArm.current.rotation.z +=
        (-0.55 + armSwing - leftArm.current.rotation.z) * 0.2;
      rightLeg.current.rotation.z +=
        (Math.sin(time * 5) * 0.16 - rightLeg.current.rotation.z) * 0.2;
      leftLeg.current.rotation.z +=
        (-Math.sin(time * 5) * 0.16 - leftLeg.current.rotation.z) * 0.2;
    } else if (action === "nod") {
      const nodTarget = -0.03 + Math.sin(time * 6) * 0.13;
      head.current.rotation.x +=
        (nodTarget - head.current.rotation.x) * 0.25;
    } else if (action === "sleep") {
      head.current.rotation.z +=
        (-0.09 + Math.sin(time * 1.2) * 0.015 - head.current.rotation.z) *
        0.08;
      head.current.rotation.x +=
        (0.05 - head.current.rotation.x) * 0.08;
      root.current.position.y += Math.sin(time * 1.1) * 0.012;
    } else if (action === "work") {
      root.current.rotation.y +=
        (-0.58 - root.current.rotation.y) * 0.12;
      head.current.rotation.x +=
        (0.13 + Math.sin(time * 3) * 0.012 - head.current.rotation.x) * 0.14;
      head.current.rotation.y +=
        (0.08 - head.current.rotation.y) * 0.12;
      rightArm.current.rotation.x +=
        (-0.62 + Math.sin(time * 12) * 0.025 - rightArm.current.rotation.x) *
        0.2;
      leftArm.current.rotation.x +=
        (-0.62 - Math.sin(time * 12) * 0.025 - leftArm.current.rotation.x) *
        0.2;
      rightArm.current.rotation.z +=
        (-0.25 - rightArm.current.rotation.z) * 0.16;
      leftArm.current.rotation.z +=
        (0.25 - leftArm.current.rotation.z) * 0.16;
      if (leftTypingHand.current && rightTypingHand.current) {
        leftTypingHand.current.position.y =
          -0.105 + Math.abs(Math.sin(time * 13)) * 0.018;
        rightTypingHand.current.position.y =
          -0.105 + Math.abs(Math.sin(time * 13 + Math.PI)) * 0.018;
      }
    } else if (action === "think") {
      head.current.rotation.z +=
        (-0.12 + Math.sin(time * 2) * 0.03 - head.current.rotation.z) * 0.12;
      rightArm.current.rotation.z +=
        (-1.35 - rightArm.current.rotation.z) * 0.16;
    } else if (action === "happy") {
      root.current.position.y += Math.abs(Math.sin(time * 4)) * 0.045;
      head.current.rotation.z = Math.sin(time * 3) * 0.06;
    }
  });

  const blue = "#78b7cb";
  const blueDark = "#477d90";
  const joint = "#12191e";
  const glow = "#9ff7ff";

  return (
    <group ref={root} scale={0.95}>
      <group ref={head} position={[0, 0.61, 0]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.18, 0.2, 0.22, 20]} />
          <meshStandardMaterial color={joint} metalness={0.25} roughness={0.4} />
        </mesh>
        <group position={[0, 0.54, 0]}>
          <RoundedBox args={[1.78, 1.14, 0.8]} radius={0.34} smoothness={6}>
            <meshStandardMaterial color={blue} metalness={0.35} roughness={0.3} />
          </RoundedBox>
          <RoundedBox args={[1.48, 0.78, 0.08]} radius={0.25} smoothness={6} position={[0, 0, 0.42]}>
            <meshStandardMaterial color="#071014" metalness={0.15} roughness={0.42} />
          </RoundedBox>
          {Array.from({ length: 9 }, (_, index) => (
            <mesh
              key={index}
              position={[0, -0.3 + index * 0.075, 0.466]}
            >
              <boxGeometry args={[1.18, 0.012, 0.012]} />
              <meshStandardMaterial color="#26343a" transparent opacity={0.55} />
            </mesh>
          ))}
          <mesh ref={leftEye} position={[-0.37, 0.13, 0.475]} scale={[1, 1, 0.35]}>
            <sphereGeometry args={[0.13, 24, 24]} />
            <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} />
          </mesh>
          <mesh ref={rightEye} position={[0.37, 0.13, 0.475]} scale={[1, 1, 0.35]}>
            <sphereGeometry args={[0.13, 24, 24]} />
            <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.5} />
          </mesh>
          <mesh
            ref={mouth}
            position={[0, -0.18, 0.49]}
            rotation={[0, 0, Math.PI]}
          >
            <torusGeometry args={[0.11, 0.025, 8, 24, Math.PI]} />
            <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} />
          </mesh>
          <group visible={action === "work"}>
            <mesh position={[-0.37, 0.31, 0.492]} rotation={[0, 0, -0.14]}>
              <boxGeometry args={[0.27, 0.035, 0.018]} />
              <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.7} />
            </mesh>
            <mesh position={[0.37, 0.31, 0.492]} rotation={[0, 0, 0.14]}>
              <boxGeometry args={[0.27, 0.035, 0.018]} />
              <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.7} />
            </mesh>
            <mesh position={[0, -0.2, 0.495]}>
              <boxGeometry args={[0.18, 0.03, 0.018]} />
              <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.8} />
            </mesh>
          </group>
          <mesh position={[-0.95, 0, 0]}>
            <sphereGeometry args={[0.22, 24, 24]} />
            <meshStandardMaterial color={blueDark} metalness={0.45} roughness={0.3} />
          </mesh>
          <mesh position={[0.95, 0, 0]}>
            <sphereGeometry args={[0.22, 24, 24]} />
            <meshStandardMaterial color={blueDark} metalness={0.45} roughness={0.3} />
          </mesh>
        </group>
      </group>

      <RoundedBox args={[0.94, 1.02, 0.72]} radius={0.4} smoothness={6} position={[0, 0.06, 0]}>
        <meshStandardMaterial color={blue} metalness={0.35} roughness={0.32} />
      </RoundedBox>
      <RoundedBox args={[0.4, 0.13, 0.05]} radius={0.05} position={[0, 0.24, 0.38]}>
        <meshStandardMaterial color={blueDark} metalness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.9, 0.1, 0.7]} radius={0.04} position={[0, -0.08, 0]}>
        <meshStandardMaterial color={joint} metalness={0.2} roughness={0.38} />
      </RoundedBox>
      <RoundedBox args={[0.64, 0.23, 0.54]} radius={0.11} position={[0, -0.46, 0]}>
        <meshStandardMaterial color={blueDark} metalness={0.4} roughness={0.34} />
      </RoundedBox>

      <group visible={action === "work"} position={[0, -0.08, 0.62]}>
        <RoundedBox
          args={[1.03, 0.62, 0.07]}
          radius={0.06}
          position={[0, 0.25, 0]}
        >
          <meshStandardMaterial color="#17232c" metalness={0.45} roughness={0.28} />
        </RoundedBox>
        <RoundedBox
          args={[0.88, 0.48, 0.018]}
          radius={0.04}
          position={[0, 0.25, -0.041]}
        >
          <meshStandardMaterial color="#102d39" emissive="#174b5d" emissiveIntensity={0.75} />
        </RoundedBox>
        {[0.1, 0.23, 0.36].map((width, index) => (
          <mesh
            key={width}
            position={[-0.3 + width / 2, 0.38 - index * 0.1, -0.056]}
          >
            <boxGeometry args={[width * 2.2, 0.018, 0.012]} />
            <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.4} />
          </mesh>
        ))}
        <mesh position={[0, 0.25, 0.041]}>
          <circleGeometry args={[0.075, 24]} />
          <meshStandardMaterial color={blue} metalness={0.45} roughness={0.3} />
        </mesh>
        <mesh position={[-0.39, -0.07, -0.015]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.2, 18]} />
          <meshStandardMaterial color={joint} metalness={0.5} roughness={0.28} />
        </mesh>
        <mesh position={[0.39, -0.07, -0.015]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.2, 18]} />
          <meshStandardMaterial color={joint} metalness={0.5} roughness={0.28} />
        </mesh>
        <RoundedBox
          args={[1.04, 0.08, 0.58]}
          radius={0.04}
          position={[0, -0.13, -0.27]}
          rotation={[0.08, 0, 0]}
        >
          <meshStandardMaterial color={blueDark} metalness={0.5} roughness={0.28} />
        </RoundedBox>
        <mesh position={[0, -0.085, -0.37]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.18, 0.012, 0.1]} />
          <meshStandardMaterial color="#91bfd0" metalness={0.3} />
        </mesh>
        <mesh ref={leftTypingHand} position={[-0.28, -0.105, -0.29]} scale={[1.2, 0.65, 1]}>
          <sphereGeometry args={[0.12, 20, 20]} />
          <meshStandardMaterial color={blue} metalness={0.3} roughness={0.34} />
        </mesh>
        <mesh ref={rightTypingHand} position={[0.28, -0.105, -0.29]} scale={[1.2, 0.65, 1]}>
          <sphereGeometry args={[0.12, 20, 20]} />
          <meshStandardMaterial color={blue} metalness={0.3} roughness={0.34} />
        </mesh>
      </group>

      <group ref={leftArm} position={[-0.57, 0.38, 0]}>
        <mesh><sphereGeometry args={[0.15, 20, 20]} /><meshStandardMaterial color={joint} /></mesh>
        <mesh position={[0, -0.08, 0]}>
          <sphereGeometry args={[0.17, 22, 22]} />
          <meshStandardMaterial color={blue} metalness={0.35} roughness={0.32} />
        </mesh>
        <RoundedBox args={[0.28, 0.42, 0.29]} radius={0.13} position={[0, -0.28, 0]}>
          <meshStandardMaterial color={blue} metalness={0.3} roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, -0.51, 0]}><sphereGeometry args={[0.11, 18, 18]} /><meshStandardMaterial color={joint} /></mesh>
        <RoundedBox args={[0.3, 0.48, 0.31]} radius={0.14} position={[0, -0.75, 0]}>
          <meshStandardMaterial color={blue} metalness={0.3} roughness={0.35} />
        </RoundedBox>
      </group>
      <group ref={rightArm} position={[0.57, 0.38, 0]}>
        <mesh><sphereGeometry args={[0.15, 20, 20]} /><meshStandardMaterial color={joint} /></mesh>
        <mesh position={[0, -0.08, 0]}>
          <sphereGeometry args={[0.17, 22, 22]} />
          <meshStandardMaterial color={blue} metalness={0.35} roughness={0.32} />
        </mesh>
        <RoundedBox args={[0.28, 0.42, 0.29]} radius={0.13} position={[0, -0.28, 0]}>
          <meshStandardMaterial color={blue} metalness={0.3} roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, -0.51, 0]}><sphereGeometry args={[0.11, 18, 18]} /><meshStandardMaterial color={joint} /></mesh>
        <RoundedBox args={[0.3, 0.48, 0.31]} radius={0.14} position={[0, -0.75, 0]}>
          <meshStandardMaterial color={blue} metalness={0.3} roughness={0.35} />
        </RoundedBox>
      </group>

      <group ref={leftLeg} position={[-0.24, -0.5, 0]}>
        <mesh><sphereGeometry args={[0.13, 18, 18]} /><meshStandardMaterial color={joint} /></mesh>
        <RoundedBox args={[0.32, 0.38, 0.34]} radius={0.12} position={[0, -0.2, 0]}>
          <meshStandardMaterial color={blue} metalness={0.3} roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, -0.42, 0]}><sphereGeometry args={[0.115, 18, 18]} /><meshStandardMaterial color={joint} /></mesh>
        <RoundedBox args={[0.34, 0.46, 0.37]} radius={0.15} position={[0, -0.65, 0]}>
          <meshStandardMaterial color={blue} metalness={0.3} roughness={0.35} />
        </RoundedBox>
        <RoundedBox args={[0.39, 0.16, 0.5]} radius={0.08} position={[0, -0.89, 0.07]}>
          <meshStandardMaterial color={blueDark} metalness={0.3} />
        </RoundedBox>
      </group>
      <group ref={rightLeg} position={[0.24, -0.5, 0]}>
        <mesh><sphereGeometry args={[0.13, 18, 18]} /><meshStandardMaterial color={joint} /></mesh>
        <RoundedBox args={[0.32, 0.38, 0.34]} radius={0.12} position={[0, -0.2, 0]}>
          <meshStandardMaterial color={blue} metalness={0.3} roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, -0.42, 0]}><sphereGeometry args={[0.115, 18, 18]} /><meshStandardMaterial color={joint} /></mesh>
        <RoundedBox args={[0.34, 0.46, 0.37]} radius={0.15} position={[0, -0.65, 0]}>
          <meshStandardMaterial color={blue} metalness={0.3} roughness={0.35} />
        </RoundedBox>
        <RoundedBox args={[0.39, 0.16, 0.5]} radius={0.08} position={[0, -0.89, 0.07]}>
          <meshStandardMaterial color={blueDark} metalness={0.3} />
        </RoundedBox>
      </group>
    </group>
  );
}

export default function RobotScene({
  action,
  active = true,
}: {
  action: RobotAction;
  active?: boolean;
}) {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [visible, setVisible] = useState(() =>
    typeof document === "undefined" ? true : document.visibilityState === "visible",
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(query.matches);
    const updateVisibility = () => setVisible(document.visibilityState === "visible");
    query.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      query.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const animate = active && visible && !reducedMotion;
  return (
    <Canvas
      camera={{ position: [0, 0.15, 5.8], fov: 34 }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true }}
      frameloop={animate ? "always" : "demand"}
    >
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 4, 5]} intensity={2.3} color="#e9fbff" />
      <pointLight position={[-3, 1, 3]} intensity={1.8} color="#55dfff" />
      <Robot action={reducedMotion ? "idle" : action} />
    </Canvas>
  );
}
