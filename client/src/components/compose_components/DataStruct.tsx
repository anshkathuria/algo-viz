import React, { useEffect, useMemo, useState, useCallback } from 'react';
import store from '../../store';
import DataChild from './DataChild';
import ValDisplay from './ValDisplay';
import { observer } from 'mobx-react';
import invertColor from '../../utils/invertColor';
import { getVal } from './getVal';
import Tooltip from 'rc-tooltip';
import genId from '../../utils/genId';


type Props = {
    structure: Viz.Structure
    objectId: string
    ratio: number
    pointed: boolean
    prop?: string | number
    renderId?: string
}
type DisplayProps = {
    color: string
    size: number
    anim: Viz.anim
    objectId: string
    textDisplay: string
    textColor?: string
    highlight?: boolean
}

const getDataVal = (value: any, displayProps: DisplayProps) => {
    const { settings: { valueColors: colors } } = store
    if (typeof value === 'boolean') {
        displayProps.textDisplay = value ? 'T' : 'F'
        return <ValDisplay {...displayProps} />
    } else if (typeof value === 'string') {
        if (value in store.viz.types) {
            if (value in store.structs.objects) {
                // return <Pointer active={!!displayProps.anim[0]} id={value} color={"white"} size={displayProps.size} />
            }
        } else {
            if (value.length < 4) displayProps.textDisplay = value
        }
        return <ValDisplay {...displayProps} />
    } else if (typeof value === 'number') {
        const strVal = String(value)
        let len = strVal.length
        if (strVal[0] === '-')--len
        if (len < 4) displayProps.textDisplay = strVal
        return <ValDisplay {...displayProps} />
    }

    return <ValDisplay {...displayProps} />
}


const DataStruct: React.FC<Props> = observer(({ structure, objectId, ratio, pointed, prop, renderId }) => {

    const [node, setNode] = useState(null)
    const ref = useCallback((node) => {
        if (node) {
            setNode(node)
        }
    }, [])
    const pos = store.structs.positions[objectId]
    renderId = useMemo(() => {
        return renderId || genId(objectId.length)
    }, [objectId, renderId])


    useEffect(() => {
        if (node) {
            store.structs.setPosition(objectId, node, renderId)
        }
    })

    if (pos && pos.renderId && pos.renderId !== renderId) {
        return null
    }
    const type = store.viz.types[objectId]
    const width = store.windowWidth * .5 * ratio
    const color = store.settings.structColors[type]
    const settings = store.settings.structSettings[type]
    const isList = settings.numChildren === 1
    const styles: React.CSSProperties = {
        width,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
    }
    if (isList) {
        styles.width = Math.max(Math.min(width, 30) * ratio, .001)
        styles.justifyContent = 'space-between'
        styles.marginLeft = '10px'
    }


    const childKeys: { [key: string]: string } = {}
    const otherKeys: React.ReactNode[] = []
    for (const key in structure) {
        const value = structure[key].value
        if (typeof value === 'string' && value in store.structs.objects) {
            childKeys[value] = key
        } else {
            otherKeys.push(
                <div key={key} className="has-text-weight-bold">
                    <span style={{ fontSize: 9 }}> {key}:{' '}</span>
                    {getVal(value, true)}
                </div >
            )


        }
    }
    let children: ({
        order: Viz.order
        key: string | number
        child: string | null
        parent: Viz.Structure
    })[] = []

    const main = structure[settings.main]
    store.structs.children[objectId].forEach(child => {
        const key = childKeys[child]
        const order = settings.order[key]
        if (!key) return
        if (order && order.isMultiple) {
            const object = store.structs.objects[child]
            const type = store.viz.types[child]
            if (['Object', 'Array', 'Map'].includes(type))
                for (const key in object) {
                    const info = object[key]
                    if (typeof info.value === 'string' && info.value in store.structs.objects) {
                        children.push({
                            order,
                            key: type === 'Array' ? Number(key) : key,
                            child: info.value,
                            parent: object
                        })
                    }
                }

        } else {
            children.push(
                {
                    order: order || { pos: Infinity, isMultiple: false },
                    key,
                    child,
                    parent: structure
                }
            )
        }
    })
    if (settings.numChildren === null) {
        children.sort((a, b) => {
            if (a.order.pos === b.order.pos) {
                return a.key > b.key ? 1 : -1
            } else {
                return a.order.pos - b.order.pos
            }
        })
    } else {
        let newList = new Array(settings.numChildren)
        children.forEach(child => {
            let pos = child.order.pos === Infinity ? newList.length - 1 : child.order.pos - 1
            while (newList[pos]) {
                const current = newList[pos].order
                if (current.pos === Infinity) {
                    newList[pos] = child
                    child = newList[pos]
                }
                pos--
                if (pos < 0) pos = newList.length - 1
            }
            newList[pos] = child
        })
        children = newList
        for (let i = 0; i < children.length; i++) {
            if (!(i in children)) {
                children[i] = {
                    child: null,
                    key: null,
                    order: null,
                    parent: null
                }
            }
        }
    }
    const anim: Viz.anim = [main && main.get, main && main.set]
    const size = Math.min(30, Math.max(width - 1, 1))
    const displayProps: DisplayProps = {
        objectId,
        color: color,
        size,
        anim,
        textDisplay: "",
        textColor: invertColor(color),
        highlight: store.structs.activePointers[objectId]
    }
    return (
        <div className={'data-struct'} style={{
            display: 'flex',
            flexDirection: isList ? 'row' : 'column',
            alignItems: 'center',
        }} >
            <Tooltip overlay={() => (
                <div>
                    {otherKeys}
                </div>
            )}
                placement={'top'}
                trigger={['hover']} defaultVisible={false} >
                <div ref={ref} style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: '10px'
                }}> {getDataVal(main ? main.value : '', displayProps)} </div>
            </Tooltip>

            {node && (
                <div style={styles}>
                    {children.map(({ child, key, parent }, i) => {
                        if (!child) {
                            return <div key={i} style={{
                                width: (styles.width as number) / children.length
                            }} />

                        } else {
                            return (
                                <DataChild
                                    key={child} parent={parent}
                                    parentId={objectId}
                                    objectId={child}
                                    ratio={ratio / (settings.numChildren === null ? children.length : settings.numChildren)}
                                    prop={key} />)

                        }
                    })}
                </div>
            )}
        </div>
    )
})

export default DataStruct