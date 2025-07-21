import React from "react"

const AnimatedGif = ({ src, alt, className = "pixel-animation" }) => {
    return <img src={src} alt={alt} className={className} />
};

export default AnimatedGif;