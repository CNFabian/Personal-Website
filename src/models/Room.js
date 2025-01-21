import React, { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { a } from "@react-spring/three";

import roomScene from "../assets/3d/room_test4.glb";

const Room = ({ setCamera }) => {
  const roomRef = useRef();
  const { nodes, materials } = useGLTF(roomScene); // Load the GLTF file
  const clickableMeshes = ["desk", "computer"];

  useEffect(() => {
    // Access the camera named "Camera" from the GLTF nodes
    const camera = nodes.Camera;

    if (camera && camera.isCamera) {
      // Log camera details for debugging
      console.log("Camera Node:", camera);
      console.log("Camera Position:", camera.position);
      console.log("Camera Rotation:", camera.rotation);

      // Update camera properties
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      // Pass the camera to the parent component
      setCamera(camera);

      // Disable mouse and touch interaction to lock the camera
      const preventInteraction = (event) => event.preventDefault();
      window.addEventListener("mousedown", preventInteraction);
      window.addEventListener("touchstart", preventInteraction);

      // Cleanup event listeners on unmount
      return () => {
        window.removeEventListener("mousedown", preventInteraction);
        window.removeEventListener("touchstart", preventInteraction);
      };
    } else {
      console.error("Camera not found. Ensure the name is correct in Blender export.");
    }
  }, [nodes, setCamera]);

  return (
    <a.group ref={roomRef} dispose={null}>
      {Object.entries(nodes).map(([name, node]) => {
        if (node.isMesh) {
          // Check if the current mesh is in the clickableMeshes list
          const isClickable = clickableMeshes.includes(name);

          return (
            <mesh
              castShadow
              receiveShadow
              key={name}
              geometry={node.geometry} // Access geometry correctly
              material={materials[node.material.name]} // Ensure material is applied
              scale={1}
              onClick={
                isClickable
                  ? () => alert(`${name} clicked!`) // Action for clickable meshes
                  : undefined // Non-clickable meshes have no onClick handler
              }
            />
          );
        }
        return null; // Ignore non-mesh nodes
      })}
    </a.group>
  );
};

export default Room;
