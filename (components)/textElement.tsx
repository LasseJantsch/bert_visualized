import React from "react";

interface Props {
    data: string[],
    color?: number[]
}

const TextElement = (props: Props) => {

    const color_mapping: any = {
        0: '#ababab',
        1: '#00D416',
        2: '#FEC600',
        3: '#CC00FF',
    }

    return(
        <div className="text_element">
            {props.data.map((s:string, i:number)=> {
                const color = props.color ? color_mapping[props.color[i]]: '#ababab'
                return(
                    <div key={i} className="text_element_atom" style={{backgroundColor: color}}>{String(s)}</div>
                )
            })}
        </div>
    )
}

export default TextElement