"use client"

import { useState, useRef, useEffect } from "react"
import { Play, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"

export default function FlipbookEditor() {
  const [currentFrame, setCurrentFrame] = useState(1)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushColor, setBrushColor] = useState("#4AA3DF")
  const [brushSize, setBrushSize] = useState(8)
  const [onionSkinEnabled, setOnionSkinEnabled] = useState(true)
  const [loopEnabled, setLoopEnabled] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

  const frames = Array.from({ length: 12 }, (_, i) => i + 1)
  const recentPosts = [1, 2, 3, 4, 5]

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      const context = canvas.getContext("2d")
      if (context) {
        context.scale(2, 2)
        context.lineCap = "round"
        context.strokeStyle = brushColor
        context.lineWidth = brushSize
        contextRef.current = context
      }
    }
  }, [])

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = brushColor
      contextRef.current.lineWidth = brushSize
    }
  }, [brushColor, brushSize])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !contextRef.current) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    contextRef.current.beginPath()
    contextRef.current.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    contextRef.current.lineTo(x, y)
    contextRef.current.stroke()
  }

  const stopDrawing = () => {
    if (contextRef.current) {
      contextRef.current.closePath()
    }
    setIsDrawing(false)
  }

  return (
    <div className="flex h-screen bg-[#e8e8e8] overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-44 bg-[#e0e0e0] border-r border-[#c0c0c0] flex flex-col p-2 gap-2">
        {/* Brush Type Dropdown */}
        <div className="bg-[#d0d0d0] border border-[#a0a0a0] rounded p-1 flex items-center justify-between cursor-pointer">
          <span className="text-xs text-[#333]">Brush</span>
          <ChevronDown className="w-3 h-3 text-[#666]" />
        </div>

        {/* Color Preview */}
        <div className="bg-[#f5f5f5] border border-[#a0a0a0] p-2 rounded">
          <div 
            className="w-12 h-12 rounded border border-[#888]"
            style={{ backgroundColor: brushColor }}
          />
        </div>

        {/* Color Picker Gradient */}
        <div className="flex gap-1">
          <div className="w-4 h-20 bg-gradient-to-b from-white via-[#4AA3DF] to-[#1a6aa5] rounded border border-[#a0a0a0]" />
          <div 
            className="flex-1 h-20 rounded border border-[#a0a0a0]"
            style={{ backgroundColor: brushColor }}
          />
        </div>

        {/* Frame Range */}
        <div className="flex items-center gap-2 text-xs text-[#333]">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L12 22M2 12L22 12" />
          </svg>
          <span>1</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#333]">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L12 22M2 12L22 12" />
          </svg>
          <span>31</span>
        </div>

        {/* Layer Buttons */}
        <div className="flex gap-1">
          <button className="flex-1 h-8 bg-[#f0f0f0] border border-[#a0a0a0] rounded text-xs hover:bg-[#e0e0e0]" />
          <button className="flex-1 h-8 bg-[#f0f0f0] border border-[#a0a0a0] rounded text-xs hover:bg-[#e0e0e0]" />
        </div>

        {/* Checkboxes */}
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-xs text-[#333] cursor-pointer">
            <input 
              type="checkbox" 
              checked={onionSkinEnabled}
              onChange={(e) => setOnionSkinEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#4AA3DF]"
            />
            <span>Onion Skin</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-[#333] cursor-pointer">
            <input 
              type="checkbox" 
              checked={loopEnabled}
              onChange={(e) => setLoopEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#4AA3DF]"
            />
            <span>Loop</span>
          </label>
        </div>

        {/* Text Inputs */}
        <input 
          type="text" 
          className="h-6 bg-white border border-[#a0a0a0] rounded px-2 text-xs"
          placeholder="Title"
        />
        <div className="flex gap-1">
          <input 
            type="text" 
            className="flex-1 h-6 bg-white border border-[#a0a0a0] rounded px-2 text-xs"
          />
          <input 
            type="text" 
            className="flex-1 h-6 bg-white border border-[#a0a0a0] rounded px-2 text-xs"
          />
        </div>

        {/* Description Box */}
        <textarea 
          className="flex-1 min-h-16 bg-white border border-[#a0a0a0] rounded px-2 py-1 text-xs resize-none"
          placeholder="Description..."
        />

        {/* Bottom Dropdown */}
        <div className="bg-[#f0f0f0] border border-[#a0a0a0] rounded p-1 flex items-center justify-between cursor-pointer">
          <span className="text-xs text-[#333]">Export</span>
          <ChevronDown className="w-3 h-3 text-[#666]" />
        </div>
        <div className="h-8 bg-white border border-[#a0a0a0] rounded" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Timeline */}
        <div className="bg-gradient-to-b from-[#d8d8d8] to-[#c8c8c8] border-b border-[#a0a0a0]">
          {/* Frame Thumbnails */}
          <div className="flex items-end px-2 pt-2 gap-0.5 overflow-x-auto">
            {frames.map((frame) => (
              <button
                key={frame}
                onClick={() => setCurrentFrame(frame)}
                className={`flex flex-col items-center min-w-14 ${
                  currentFrame === frame ? "relative" : ""
                }`}
              >
                <div 
                  className={`w-14 h-10 border ${
                    currentFrame === frame 
                      ? "border-[#4AA3DF] bg-[#4AA3DF]/20" 
                      : "border-[#a0a0a0] bg-[#f5f5f5]"
                  } rounded-t flex items-center justify-center`}
                >
                  {frame === 1 && (
                    <svg className="w-6 h-6 text-[#4AA3DF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M12 12v8M8 16h8" />
                    </svg>
                  )}
                </div>
                <span className={`text-xs py-0.5 px-2 ${
                  currentFrame === frame 
                    ? "bg-[#6a6a6a] text-white" 
                    : "bg-[#d0d0d0] text-[#333]"
                }`}>
                  {frame}
                </span>
              </button>
            ))}
          </div>

          {/* Timeline Scrollbar */}
          <div className="h-4 bg-[#e8e8e8] border-y border-[#a0a0a0] flex items-center px-1">
            <button className="w-4 h-3 bg-[#d0d0d0] border border-[#a0a0a0] flex items-center justify-center">
              <ChevronLeft className="w-2 h-2" />
            </button>
            <div className="flex-1 h-2 bg-[#c0c0c0] mx-1 rounded relative">
              <div className="absolute left-0 top-0 h-full w-8 bg-[#888] rounded" />
            </div>
            <button className="w-4 h-3 bg-[#d0d0d0] border border-[#a0a0a0] flex items-center justify-center">
              <ChevronRight className="w-2 h-2" />
            </button>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="h-10 bg-gradient-to-b from-[#e8e8e8] to-[#d8d8d8] border-b border-[#a0a0a0] flex items-center gap-2 px-2">
          {/* Play Button */}
          <button className="w-8 h-7 bg-gradient-to-b from-[#6a6a6a] to-[#4a4a4a] rounded flex items-center justify-center hover:from-[#7a7a7a] hover:to-[#5a5a5a]">
            <Play className="w-4 h-4 text-white fill-white" />
          </button>

          {/* Navigation Buttons */}
          <button className="w-7 h-7 bg-[#e0e0e0] border border-[#a0a0a0] rounded flex items-center justify-center hover:bg-[#d0d0d0]">
            <ChevronLeft className="w-4 h-4 text-[#666]" />
          </button>
          <button className="w-7 h-7 bg-[#e0e0e0] border border-[#a0a0a0] rounded flex items-center justify-center hover:bg-[#d0d0d0]">
            <ChevronRight className="w-4 h-4 text-[#666]" />
          </button>

          {/* Speed Control */}
          <div className="flex items-center gap-1 ml-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className={`w-1 h-2 ${i <= 4 ? 'bg-[#888]' : 'bg-[#ccc]'} rounded-sm`} />
              ))}
            </div>
            <svg className="w-4 h-4 text-[#666]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L12 22M2 12L22 12" />
            </svg>
            <span className="text-xs text-[#333]">2</span>
          </div>

          {/* Slider */}
          <div className="flex-1 max-w-32 h-2 bg-[#c0c0c0] rounded border border-[#a0a0a0] mx-4">
            <div className="h-full w-1/3 bg-[#888] rounded-l" />
          </div>

          {/* Recording Indicator */}
          <div className="w-3 h-3 rounded-full bg-[#333] border border-[#666]" />

          {/* Language */}
          <div className="flex items-center gap-1 ml-2">
            <div className="w-3 h-3 rounded-full border border-[#888]" />
            <span className="text-xs text-[#333]">English</span>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-[#f0f0f0] p-2 flex items-center justify-center">
          <div className="bg-white border border-[#a0a0a0] shadow-md w-full h-full max-w-4xl max-h-[600px] relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-20 bg-[#e8e8e8] border-l border-[#c0c0c0] flex flex-col">
        <div className="p-2 text-xs text-[#333] font-medium">Recent Posts</div>
        <div className="flex flex-col gap-1 p-1 overflow-y-auto">
          {recentPosts.map((post) => (
            <div 
              key={post}
              className="w-full h-12 bg-gradient-to-br from-[#4AA3DF] to-[#2a7ab5] border border-[#a0a0a0] rounded cursor-pointer hover:opacity-80"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
