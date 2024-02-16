'use client'
import { useRef, useState, useEffect } from 'react';
// import dynamic from 'next/dynamic';
// import cytoscape from 'cytoscape';

import { CircularProgress } from '@mui/material';

import { NetworkSchema } from '@/app/api/knowledge_graph/route';
import CytoscapeComponent from 'react-cytoscapejs';
import { TooltipCard } from '../client_side';
import { Legend } from '..';
import { UISchema } from '@/app/api/schema/route';
import { useQueryState, parseAsString } from 'next-usequerystate';
import HubIcon from '@mui/icons-material/Hub';
import { mdiFamilyTree,  mdiDotsCircle} from '@mdi/js';
import Icon from '@mdi/react';
export const layouts = {
    "Force-directed": {
      name: 'cose',
      quality: 'proof',
      randomize: 'false',
      animate: true,
      idealEdgeLength: edge => 150,
      icon: ()=><HubIcon/>
    },
    "Hierarchical Layout": {
      name: "breadthfirst",
      animate: true,
      spacingFactor: 1,
      padding: 15,
      avoidOverlap: true,
      icon: ()=><Icon path={mdiFamilyTree} size={0.8} />
    },
    Geometric: {
      name: 'circle',
      nodeSeparation: 150,
      icon: ()=><Icon path={mdiDotsCircle} size={0.8} />
    },
  }


export default function Cytoscape ({
	elements,
	schema,
	tooltip_templates_edges,
	tooltip_templates_nodes,
	search
}: {
	elements: null | NetworkSchema, 
	search?:boolean,
	schema: UISchema,
	tooltip_templates_edges: {[key: string]: Array<{[key: string]: string}>}, 
	tooltip_templates_nodes: {[key: string]: Array<{[key: string]: string}>}, 
}) {
	const cyref = useRef(null);
	const networkRef = useRef(null);
	const [ready, setReady] = useState<boolean>(false)
	const [id, setId] = useState<number>(0)
	const [node, setNode] = useState(null)
    const [edge, setEdge] = useState(null)
    const [focused, setFocused] = useState(null)
    // const searchParams = useSearchParams()
	// const edge_labels = searchParams.get('edge_labels')
	// const legend = searchParams.get('legend')
	// const legend_size = parseInt(searchParams.get('legend_size') || '0')
	// const layout = searchParams.get('layout') || 'Hierarchical Layout'
	
	const [edge_labels, setEdgeLabels] = useQueryState('edge_labels')
	const [tooltip, setTooltip] = useQueryState('tooltip')
	const [layout, setLayout] = useQueryState('layout', parseAsString.withDefault('Force-directed'))
	const [legend, setLegend] = useQueryState('legend')
	const [legend_size, setLegendSize] = useQueryState('legend_size')
	const edgeStyle = edge_labels ? {label: 'data(label)'} : {}
	

	// useEffect(()=>{
	// 	const useFunctions = async () => {
	// 		if (window !== undefined) {
	// 			// const cytoscape = require('cytoscape')
	// 			// const fcose = require('cytoscape-fcose')
	// 			// const avsdf = require('cytoscape-avsdf')
	// 			// const svg = require('cytoscape-svg')
	// 			// cytoscape.use(svg);
	// 			// cytoscape.use(fcose);
	// 			// cytoscape.use(avsdf);
	// 			setReady(true)	
	// 		}
	// 	}
    //     useFunctions()
    // },[])

	useEffect(()=>{
		setId(id+1)
	},[elements, layout])
	// if (!ready) return <CircularProgress/>
	return (
		<div id="kg-network" style={{minHeight: 500, position: "relative"}} ref={networkRef}>
			{(elements === null) ? (
				// <Backdrop
				//     sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
				//     open={elements === null}
				// >
				//     <CircularProgress/>
				// </Backdrop> 
				null
			) : elements.nodes.length === 0 ? (
				<div>No results</div>
			) : 
				<CytoscapeComponent
					key={id}
					wheelSensitivity={0.1}
					style={{
						width: '100%',
						height: 700,
					}}
					stylesheet={[
						{
						selector: 'node',
						style: {
							'background-color': 'data(color)',
							'border-color': 'data(borderColor)',
							'border-width': 'data(borderWidth)',
							'label': 'data(label)',
							"text-valign": "center",
							"text-halign": "center",
							'width': `mapData(node_type, 0, 1, 70, 150)`,
							'height': `mapData(node_type, 0, 1, 70, 150)`,
						}
						},
						{
						selector: 'edge',
						style: {
							'curve-style': 'straight',
							// 'opacity': '0.5',
							'line-color': 'data(lineColor)',
							'width': '3',
							// 'label': 'data(label)',
							"text-rotation": "autorotate",
							"text-margin-x": 0,
							"text-margin-y": 0,
							'font-size': '12px',
							// 'target-arrow-shape': `data(directed)`,
							'target-endpoint': 'outside-to-node',
							'source-endpoint': 'outside-to-node',
							'target-arrow-color': 'data(lineColor)',
							...edgeStyle
						}
						},
						{
						selector: 'node.highlight',
						style: {
							'border-color': 'gray',
							'border-width': '2px',
							'font-weight': 'bold',
							'font-size': '18px',
							'width': `mapData(node_type, 0, 1, 90, 170)`,
							'height': `mapData(node_type, 0, 1, 90, 170)`,
						}
						},
						{
						selector: 'node.focused',
						style: {
							'border-color': 'gray',
							'border-width': '2px',
							'font-weight': 'bold',
							'font-size': '18px',
							'width': `mapData(node_type, 0, 1, 90, 170)`,
							'height': `mapData(node_type, 0, 1, 90, 170)`,
						}
						},
						{
						selector: 'edge.focusedColored',
						style: {
							'line-color': '#F8333C',
							'width': '6'
						}
						},
						{
						selector: 'node.semitransp',
						style:{ 'opacity': 0.5 }
						},
						{
						selector: 'node.focusedSemitransp',
						style:{ 'opacity': 0.5 }
						},
						{
						selector: 'edge.colored',
						style: {
							'line-color': '#F8333C',
							'target-arrow-color': '#F8333C',
							'width': '6'
						}
						},
						{
						selector: 'edge.semitransp',
						style:{ 'opacity': 0.5 }
						},
						{
						selector: 'edge.focusedSemitransp',
						style:{ 'opacity': 0.5 }
						}
					]}
					elements={[...elements.nodes, ...elements.edges]}
					layout={layouts[layout]}
					cy={(cy:cytoscape.Core):void => {
						cyref.current = cy
						cy.on('click', 'node', function (evt) {
						// setAnchorEl(null)
						const node = evt.target.data()

						if (focused && node.id === focused.id) {
							const sel = evt.target;
							cy.elements().removeClass('focusedSemitransp');
							sel.removeClass('focused').outgoers().removeClass('focusedColored')
							sel.incomers().removeClass('focusedColored')
							setFocused(null)
						} else{
							const sel = evt.target;
							cy.elements().removeClass('focused');
							cy.elements().removeClass('focusedSemitransp');
							cy.elements().removeClass('focusedColored');
							cy.elements().not(sel).addClass('focusedSemitransp');
							sel.addClass('focused').outgoers().addClass('focusedColored')
							sel.incomers().addClass('focusedColored')
							sel.incomers().removeClass('focusedSemitransp')
							sel.outgoers().removeClass('focusedSemitransp')
							setEdge(null)
							setNode(null)
							setFocused(node)
							setTimeout(()=>{
								const sel = evt.target;
								cy.elements().removeClass('focusedSemitransp');
								sel.removeClass('focused').outgoers().removeClass('focusedColored')
								sel.incomers().removeClass('focusedColored')
								setFocused(null)
							}, 3000)
						}
						})

						cy.nodes().on('mouseover', (evt) => {
							const n = evt.target.data()
							const sel = evt.target;
							cy.elements().not(sel).addClass('semitransp');
							sel.addClass('highlight').outgoers().addClass('colored')
							sel.incomers().addClass('colored')
							sel.incomers().removeClass('semitransp')
							sel.outgoers().removeClass('semitransp')
							if (focused === null && n.id !== (node || {}).id) {
								setEdge(null)
								setNode(n)
							}
						});

						cy.nodes().on('mouseout', (evt) => {
							const sel = evt.target;
							cy.elements().removeClass('semitransp');
							sel.removeClass('highlight').outgoers().removeClass('colored')
							sel.incomers().removeClass('colored')
							// setAnchorEl(null)
							// setNode({node: null})
							setNode(null)
						});
						cy.edges().on('mouseover', (evt) => {
							const e = evt.target.data()
							const sel = evt.target;
							cy.elements().not(sel).addClass('semitransp');
							sel.addClass('colored').connectedNodes().addClass('highlight')
							sel.connectedNodes().removeClass('semitransp')
							if (focused === null && e.id !== (edge || {}).id) {
								// setAnchorEl(evt.target.popperRef())
								// setNode({node: n})
								setNode(null)
								setEdge(e)
							}
						});
						cy.edges().on('mouseout', (evt) => {
							const sel = evt.target;
							cy.elements().removeClass('semitransp');
							sel.removeClass('colored').connectedNodes().removeClass('highlight')
							// setAnchorEl(null)
							// setNode({node: null})
							setEdge(null)
						});
					}}
				/> 
			}
			{ (elements && legend) &&
				<Legend search={search} elements={elements} legendSize={parseInt(legend_size || "0")}/>
			}
                    { (focused === null && tooltip && node) && 
						<TooltipCard 
							node={node}
							schema={schema}
							tooltip_templates={tooltip_templates_nodes}
							setFocused={setFocused}
							expand={false}
							reset={()=>{
								setEdge(null)
								setNode(null)
								setFocused(null)
							}}
						/>
                    }
                    {(focused === null && tooltip && edge) && 
						<TooltipCard 
							node={edge}
							schema={schema}
							tooltip_templates={tooltip_templates_edges}
							setFocused={setFocused}
							expand={false}
							reset={()=>{
								setEdge(null)
								setNode(null)
								setFocused(null)
							}}
						/>
                }
		</div>
	)
}