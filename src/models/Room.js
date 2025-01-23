import React, { useRef, useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber"; // Use React Three Fiber's rendering loop
import * as THREE from "three";

import roomScene from "../assets/3d/room.glb";

const Room = ({ setCamera }) => {
  const roomRef = useRef();
  const { nodes, materials, animations } = useGLTF(roomScene); // Load the GLTF file
  const mixerRef = useRef(); // Reference for the animation mixer
  const animationActions = useRef({}); // Store animation actions
  const [isAnimationReversed, setIsAnimationReversed] = useState(false); // Track animation state
  const { invalidate } = useThree();

  useEffect(() => {
    // Access the camera named "Camera" from the GLTF nodes
    const camera = nodes.Camera;

    if (camera && camera.isCamera) {
      console.log("Camera Node:", camera);

      if (animations && animations.length > 0) {
        const mixer = new THREE.AnimationMixer(camera);
        mixerRef.current = mixer;

        // Store animations by name for later access
        animations.forEach((clip) => {
          animationActions.current[clip.name] = mixer.clipAction(clip);
        });
      }

      // Set up the camera aspect ratio and projection matrix
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      // Pass the camera to the parent component
      setCamera(camera);
    } else {
      console.error("Camera not found. Ensure the name is correct in Blender export.");
    }
  }, [nodes, setCamera, animations]);

  // Use React Three Fiber's rendering loop
  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta); // Update animation mixer with delta time
    }
  });

  const handleComputerClick = () => {
    const clipName = "CameraToDesk"; // Replace with your clip name
    const action = animationActions.current[clipName];

    if (action) {
      action.setLoop(THREE.LoopOnce, 0);
      action.clampWhenFinished = true;
      action.paused = false;

      if (isAnimationReversed) {
        action.timeScale = -1;
        action.reset();
        action.play();
        console.log("Animation reversed");
      } else {
        action.timeScale = 1;
        action.reset();
        action.play();
        console.log("Animation played forward");
      }

      // Force re-render
      invalidate();

      setIsAnimationReversed(!isAnimationReversed);
    } else {
      console.warn(`Animation clip "${clipName}" not found.`);
    }
};

  return (
    <group ref={roomRef} dispose={null}>
      {Object.entries(nodes).map(([name, node]) => {
        if (node.isMesh) {
          const isClickable = name === "computer"; // Make the "computer" mesh clickable

          return (
            <mesh
              key={name}
              geometry={node.geometry}
              material={materials[node.material.name]}
              castShadow
              receiveShadow
              onClick={isClickable ? handleComputerClick : undefined} // Handle click only for the computer
            />
          );
        }
        return null;
      })}
    </group>
  );
};

export default Room;
