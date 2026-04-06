import React, {useState, useRef} from 'react';
import CanvasDraw from "react-canvas-draw";
import "./Home.css";



const Home = () => {

    const defaultProperties = {
        brushColor: 'lightblue',
        lazyRadius: 1,
        canvasHeight: 550,
        canvasWidth: 550,
        brushRadius: 5,
    };

    const [brushRadius, setBrushRadius] = useState(5);

    const canvasRef1 = useRef(null); 

    const undo = () => {
        if (canvasRef1.current) {
            canvasRef1.current.undo();
        }
    };

    const clear = () => {
        if (canvasRef1.current) {
            canvasRef1.current.clear();
        }
    }

    const increaseBrushSize = () => {
        setBrushRadius((prev) => Math.min(prev + 1, 50));
      };
    
      const decreaseBrushSize = () => {
        setBrushRadius((prev) => Math.max(prev - 1, 1));
      };

    return (
        <div>
            <div>
                <button id='undo'
                onClick={undo}>
                Undo</button>
                <button onClick={clear}>
                Clear</button>
                <label>Brush Size</label>
                <button onClick={decreaseBrushSize}>-</button>
                <span>{brushRadius}</span>
                <button onClick={increaseBrushSize}>+</button>
            </div>
            <div className='Canvas'>
                <CanvasDraw 
                ref={canvasRef1}
                brushColor={defaultProperties.brushColor}
                lazyRadius={defaultProperties.lazyRadius}
                canvasHeight={defaultProperties.canvasHeight}
                canvasWidth={defaultProperties.canvasWidth}
                brushRadius={brushRadius}
                />
            </div>

        </div>

    
  )
}

export default Home
