import React, {useState, useEffect} from "react";
function Resize() {
    const [windowWidth, setWindowWidth, windowHeight, setWindowHeight] = useState(0);
    const updateDimension = () => {
        setWindowWidth(window.innerWidth);
        setWindowHeight(window.innerHeight);
    };
    useEffect(() => {
        updateDimension();
        window.addEventListener('resize', updateDimension);

        return () => window.removeEventListener('resize', updateDimension);
    }, []);
}