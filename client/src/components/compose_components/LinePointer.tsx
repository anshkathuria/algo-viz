import React from 'react';
import { observer } from 'mobx-react';
import store from '../../store';


type Props = {
    from: string
    to: string
    get: boolean | Promise<void>
    set: boolean | Promise<void>
}

const LinePointer: React.FC<Props> = observer(({ from, to, children, get, set }) => {
    const fromCoords = store.structs.positions[from]
    const toCoords = store.structs.positions[to]

    if (!fromCoords || !toCoords) {
        return (
            <>
                {children}
            </>
        );
    } else {
        let width = Math.abs(fromCoords.x - toCoords.x)
        let height = Math.abs(fromCoords.y - toCoords.y)
        const shiftLeft = fromCoords.x > toCoords.x
        const shiftTop = fromCoords.y < toCoords.y
        let left = shiftLeft ? fromCoords.x - width : fromCoords.x
        let top = shiftTop ? fromCoords.y : fromCoords.y + height
        const noWidth = width < 1
        const noHeight = height < 1
        if (noWidth) {
            width = 5
            left -= 2.5
        }
        if (noHeight) {
            height = 5
            top -= 2.5
        }
        const lineCoords = {
            x1: shiftLeft ? width : 0,
            y1: shiftTop ? 0 : height,
            x2: shiftLeft ? 0 : width,
            y2: shiftTop ? height : 0
        }
        if (noHeight) {
            lineCoords.y1 = 2.5
            lineCoords.y2 = 2.5
        }
        if (noWidth) {
            lineCoords.x1 = 2.5
            lineCoords.x2 = 2.5
        }
        return (
            <div>
                <svg style={{ position: 'absolute', top, left, zIndex: 0 }} height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
                    <line {...lineCoords} style={{ stroke: get ? 'green' : set ? 'purple' : 'white', strokeWidth: (get || set) ? '3px' : '1px' }}></line>
                </svg>
                {children}
            </div>
        )
    }


})

export default LinePointer;