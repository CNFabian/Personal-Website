import React, { useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import Room from "../models/Room";
import './Home.css';

const Home = () => {
  const [camera, setCamera] = useState(null); // Store the Blender camera

  const UpdateCamera = () => {
    const { set } = useThree();

    useEffect(() => {
      if (camera) {
        // Set the imported camera as the default for the Canvas
        set({ camera });

        // Update camera aspect ratio on resize
        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
        };

        window.addEventListener("resize", handleResize);

        // Cleanup the event listener
        return () => {
          window.removeEventListener("resize", handleResize);
        };
      }
    }, [camera, set]);

    return null;
  };

  return (
    <div
      style={{ height: "100vh", width: "100%", backgroundColor: "#c1c2c2" }}
      tabIndex={0}
    >
      <Canvas>
        {/* Dynamically update the camera */}
        {camera && <UpdateCamera />}

        {/* Render Room and pass handleSetCamera */}
        <Room setCamera={setCamera} />

        {/* Lights */}
        <ambientLight intensity={1.5} />
        <directionalLight position={[15, 25, 15]} intensity={2} />
      </Canvas>

      {/* Centered Top Overlay */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0, 0, 0, 0.6)",
          color: "white",
          padding: "10px 20px",
          borderRadius: "5px",
          fontSize: "20px",
          fontWeight: "bold",
          zIndex: 1000,
          textAlign: "center",
        }}
      >
        Hello and Welcome to my Website
      </div>
    </div>
  );
};

export default Home;
