import React, { useState } from "react";
import { Canvas, useFrame, useThree} from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Room from "../models/Room";
import * as THREE from "three";

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
        x: camera.rotation.x.toFixed(2),
        y: camera.rotation.y.toFixed(2),
        z: camera.rotation.z.toFixed(2),
      },
    });
  });

  const handleWheel = (event) => {
    const zoomSpeed = 1; // Adjust zoom speed

    // Move the camera along its forward direction
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.multiplyScalar(event.deltaY * -0.01 * zoomSpeed); // Scale movement by wheel delta
    const newPosition = camera.position.clone().add(direction);

    // Ensure the camera stays within a valid range
    if (newPosition.length() > 0.01 && newPosition.length() < 5000) {
      camera.position.copy(newPosition);
    }
  };

  return (
    <group onWheel={handleWheel}>
      {/* Lights */}
      <hemisphereLight intensity={0.8} groundColor="white" skyColor="lightblue" />
      <pointLight position={camera.position} intensity={1} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[15, 25, 15]} intensity={2} />

      {/* 3D Model */}
      <Room position={[0, 0, 0]} />

      {/* Controls */}
      <OrbitControls enableZoom={false} />
    </group>
  );
};

const Home = () => {
  const [cameraInfo, setCameraInfo] = useState({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  });

  return (
    <div style={{ height: "100vh", width: "100%", backgroundColor: "#d0d1d1" }}>
      <Canvas
        camera={{
          position: [188, 300, 162],
          fov: 50,
          near: 0.01,
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
        <p>{`x: ${cameraInfo.rotation.x}, y: ${cameraInfo.rotation.y}, z: ${cameraInfo.rotation.z}`}</p>
      </div>
    </div>
  );
};

export default Home;
