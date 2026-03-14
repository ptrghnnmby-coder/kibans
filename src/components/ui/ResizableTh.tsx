'use client'

import React, { useState, useEffect, useRef } from 'react'

interface ResizableThProps extends React.ThHTMLAttributes<HTMLTableHeaderCellElement> {
    tableKey: string
    columnKey: string
    initialWidth?: number
    minWidth?: number
}

export function ResizableTh({
    tableKey,
    columnKey,
    initialWidth = 150,
    minWidth = 50,
    children,
    className,
    style,
    ...props
}: ResizableThProps) {
    const [width, setWidth] = useState(initialWidth)
    const [isDragging, setIsDragging] = useState(false)
    const thRef = useRef<HTMLTableHeaderCellElement>(null)

    const storageKey = `th-width-v3-${tableKey}-${columnKey}`

    useEffect(() => {
        const savedWidth = localStorage.getItem(storageKey)
        if (savedWidth) {
            setWidth(parseInt(savedWidth, 10))
        }
    }, [storageKey])

    const onMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        const startX = e.pageX
        const startWidth = thRef.current?.offsetWidth || width

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.pageX - startX
            const newWidth = Math.max(minWidth, startWidth + deltaX)
            setWidth(newWidth)

            if (thRef.current) {
                thRef.current.style.width = `${newWidth}px`
            }
        }

        const onMouseUp = () => {
            setIsDragging(false)
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)

            if (thRef.current) {
                localStorage.setItem(storageKey, thRef.current.offsetWidth.toString())
            }
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }

    return (
        <th
            ref={thRef}
            className={`${className || ''} ${isDragging ? 'resizing' : ''}`}
            style={{
                ...style,
                width: `${width}px`,
                minWidth: `${minWidth}px`,
                position: 'relative',
                userSelect: isDragging ? 'none' : 'auto'
            }}
            {...props}
        >
            <div className="flex items-center w-full overflow-hidden">
                <span className="truncate flex-1">{children}</span>
            </div>
            <div
                className={`resizer-handle ${isDragging ? 'is-dragging' : ''}`}
                onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    onMouseDown(e)
                }}
            />
        </th>
    )
}
