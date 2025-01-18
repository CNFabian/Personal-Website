import React, { useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Room from "../models/Room";
import * as THREE from "three";

// Helper to convert degrees to radians
const toRadians = (degrees) => degrees * (Math.PI / 180);

const Scene = ({ setCameraInfo }) => {
  const { camera } = useThree();

  useFrame(() => {
    setCameraInfo({
      position: {
        x: camera.position.x.toFixed(2),
        y: camera.position.y.toFixed(2),
        z: camera.position.z.toFixed(2),
      },
      rotation: {
        x: THREE.MathUtils.radToDeg(camera.rotation.x).toFixed(2),
        y: THREE.MathUtils.radToDeg(camera.rotation.y).toFixed(2),
        z: THREE.MathUtils.radToDeg(camera.rotation.z).toFixed(2),
      },
    });
  });

  const handleWheel = (event) => {
    const zoomSpeed = 1;

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.multiplyScalar(event.deltaY * -0.01 * zoomSpeed);
    const newPosition = camera.position.clone().add(direction);

    if (newPosition.length() > 0.1 && newPosition.length() < 5000) {
      camera.position.copy(newPosition);
    }
  };

  return (
    <group onWheel={handleWheel} tabIndex={0}>
      <hemisphereLight intensity={0.8} groundColor="white" skyColor="lightblue" />
      <pointLight position={camera.position} intensity={1} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[15, 25, 15]} intensity={2} />
      <Room position={[0, 0, 0]} />
      <OrbitControls makeDefault target={[0, 70, 0]} />
    </group>
  );
};

const Home = () => {
  const [cameraInfo, setCameraInfo] = useState({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  });

  return (
    <div
      style={{ height: "100vh", width: "100%", backgroundColor: "#d0d1d1" }}
      tabIndex={0}
    >
      <Canvas
        camera={{
          position: [325, 140, 5], // Default position
          rotation: [0, 0, 0], // Default rotation
          fov: 50,
          near: 0.1,
          far: 5000,
        }}
      >
        <Scene setCameraInfo={setCameraInfo} />
      </Canvas>

      {/* Fixed Camera Logger */}
      <div
        style={{
          position: "fixed",
          top: "10px",
          left: "10px",
          background: "rgba(0, 0, 0, 0.5)",
          color: "white",
          padding: "10px",
          borderRadius: "5px",
          fontSize: "14px",
          zIndex: 1000,
        }}
      >
        <p><strong>Camera Position:</strong></p>
        <p>{`x: ${cameraInfo.position.x}, y: ${cameraInfo.position.y}, z: ${cameraInfo.position.z}`}</p>
        <p><strong>Camera Rotation:</strong></p>
        <p>{`x: ${cameraInfo.rotation.x}°, y: ${cameraInfo.rotation.y}°, z: ${cameraInfo.rotation.z}°`}</p>
      </div>
    </div>
  );
};

export default Home;
