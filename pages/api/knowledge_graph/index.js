import neo4j from "neo4j-driver"
import { neo4jDriver } from "../../../utils/neo4j"
import Color from 'color'
import { toNumber } from "../../../utils/helper"
import fetch from "node-fetch"
import {default_color, mui_colors} from '../../../utils/colors'
let color_map = {}
let score_fields
const get_color = ({color, darken}) => {
	if (!color_map[color]) color_map[color] = Color(color)

	if (darken) return color_map[color].darken((darken)*0.65).hex()
	else return color_map[color].hex()
}

const highlight_color = '#F8333C'

export const default_get_node_color_and_type = ({node, terms, color=default_color, aggr_scores, field, aggr_field, aggr_type, fields}) => {
	// if(terms.indexOf(node.properties.label) > -1){
	if (fields.filter(i=>i && terms.indexOf(node.properties[i]) > -1).length > 0) {
		return {color: highlight_color, node_type: 1}
	} else if (node.properties[field] && aggr_field!==undefined && aggr_type!==undefined) {
		const max = aggr_scores[`max_${field}`] || 0
		const min = aggr_scores[`min_${field}`] || 0
		const score = node.properties[field]
		// it's not neg to pos
		if ((min >= 0 && max >= 0) || (min < 0 && max <= 0)) {
			const ext_diff = Math.abs(max-min)
			const comp = aggr_type === "max" ? max: min
			const val_diff = Math.abs(score-comp)
			return {
				color: get_color({color, darken: 1-(val_diff/ext_diff)}),
				node_type: 0
			}
		} else {
			// two sided
			const comp = score > 0 ? max: min
			const val_diff = Math.abs(score-comp)
			const ext_diff = Math.abs(comp)
			return {
				color: get_color({color, darken: 1-(val_diff/ext_diff)}),
				node_type: 0
			}
		}
	}
	return {
		color: get_color({color}),
		node_type: 0
	}		
}

export const default_get_edge_color = ({relation, color, aggr_field, field, aggr_scores}) => {
	if (relation.properties[field] && aggr_field) {
		const aggr_score = aggr_scores[aggr_field]
		return {
			lineColor: get_color({color, darken: Math.abs(relation.properties[field]/aggr_score)}),
			node_type: 0
		}
	}
	return {
		lineColor: color
	}
}
const process_properties = (properties) => {
	const props = {}
	for ( const[k,v] of Object.entries(properties)) {
		if (typeof v === "object") {
			props[k] = toNumber(v)
		} else {
			props[k] = v
		}
	}
	return props
}

export const resolve_results = ({results,
	terms,
	field,
	colors,
	start_field,
	end_field,
	aggr_scores,
	get_node_color_and_type=default_get_node_color_and_type,
	get_edge_color=default_get_edge_color,
	properties = {},
	misc_props = {},
	kind_mapper = null, 
}) => {
		const color_values = {}
		let color_index = 0
		let shade_index = 0
		const shade = [400, "A100", 200, "A700", "A400"]
		const colors_func = (type) => {
			if (colors[type] && colors[type].color) {
				color_values[type] = colors[type]
			}else if (color_values[type] === undefined) {
				const c = Object.values(mui_colors)[color_index][shade[shade_index]]
				if (color_index < Object.keys(mui_colors).length) color_index = color_index + 1
				else {
					color_index = 0
					if (shade_index === shade.length) {
						shade_index = 0
					} else {
						shade_index = shade_index + 1
					}
				}
				color_values[type] = {color: c}
			}
			return {...color_values[type]}
		}
		const res = results.records.flatMap(record => {
			const relations = record.get('r')
			const nodes = record.get('n').reduce((acc, i)=>({
				...acc,
				[i.identity]: i
			}), {})
			const path = []
			for (const relation of relations) {
				const start_node = nodes[relation.start]
				const end_node = nodes[relation.end]
				const relation_type = relation.type
				const start_type = start_node.labels.filter(i=>i!=="id")[0]
				const end_type = end_node.labels.filter(i=>i!=="id")[0]
				path.push({ 
					data: {
						id: start_node.properties.id,
						kind: kind_mapper ? kind_mapper({node: start_node, type: start_type, ...misc_props})  : start_type,
						label: start_node.properties.label || start_node.properties.id,
						properties: {
							...process_properties(start_node.properties),
							...properties[start_node.properties.label || start_node.properties.id] || {}
						},
						...(get_node_color_and_type({node: {
							...start_node,
							properties: {
								...start_node.properties,
								...properties[start_node.properties.label || start_node.properties.id] || {},
							}
						}, terms, record, fields: [field, start_field, end_field], aggr_scores,
							 ...colors_func(start_type), ...misc_props}))
					} 
				})
				path.push({ 
					data: {
						source: start_node.properties.id,
						target: end_node.properties.id,
						kind: "Relation",
						relation: relation_type,
						label: relation_type,
						properties: {
							id: `${start_node.properties.label}_${relation_type}_${end_node.properties.label}`,
							label: relation_type,
							source_label: start_node.properties.label,
							target_label: end_node.properties.label,
							...properties[`${start_node.properties.label}_${end_node.properties.label}`] || {},
							...process_properties(relation.properties),
						},
						...(get_edge_color({relation, record, aggr_scores, ...colors[relation_type]})),
						directed: relation.properties.directed ? 'triangle': 'none'
					} 
				})
				path.push({ 
					data: {
						id: end_node.properties.id,
						kind: kind_mapper ? kind_mapper({node: end_node, type: end_type, ...misc_props})  : end_type,
						label: end_node.properties.label || end_node.properties.id,
						properties: {
							...process_properties(end_node.properties),
							...properties[end_node.properties.label || end_node.properties.id] || {}
						},
						...(get_node_color_and_type({node: {
							...end_node,
							properties: {
								...end_node.properties,
								...properties[end_node.properties.label || end_node.properties.id] || {}
							}
						}, terms, record, aggr_scores, fields: [field, start_field, end_field],
							...colors_func(end_type), ...misc_props}))
					} 
				})
			}
			return path
		  })
		return res
	}

const resolve_two_terms = async ({session, start_term, start_field, start, end_term, end_field, end, limit, order, path_length=4, schema, relation, aggr_scores, colors, remove, expand: e}) => {
	if (!parseInt(path_length)) throw {message: "Path length is not a number"}
	let query = `MATCH p=allShortestPaths((a: \`${start}\` {${start_field}: $start_term})-[*..${path_length}]-(b: \`${end}\` {${end_field}: $end_term}))
		USING INDEX a:\`${start}\`(${start_field})
		USING INDEX b:\`${end}\`(${end_field})
	`		
	if (relation) {
		const edges = schema.edges.reduce((acc, i)=>([
			...acc,
			...i.match
		  ]), [])
		for (const i of relation.split(",")) {
			if (edges.indexOf(i) === -1) throw {message: `Invalid relationship ${i}`}
		}
		const rels = relation.split(",").map(i=>`\`${i}\``).join("|")
		query = query.replace(`[*..${path_length}]`,`[:${rels}*..${path_length}]`)
	} 
	const vars = {}
	if ((remove || []).length) {
		query = query + `
			WHERE NOT a.id in ${JSON.stringify(remove)}
			AND NOT b.id in ${JSON.stringify(remove)}
		`
	}
	query = query + `RETURN p, nodes(p) as n, relationships(p) as r LIMIT TOINTEGER($limit)`

	// remove has precedence on expand
	const expand = (e || []).filter(i=>(remove || []).indexOf(i) === -1)

	if ((expand || []).length) {
		for (const ind in expand) {
			vars[`expand_${ind}`] = expand[ind]
			query = query + `
				UNION
				MATCH p = (c)--(d)
				WHERE c.id = $expand_${ind}
				RETURN p, nodes(p) as n, relationships(p) as r
				LIMIT 10
			`   
		}
	}

	
	// if (score_fields.length) query = query + `, ${score_fields.join(", ")}`
	// query = `${query} RETURN * ORDER BY rand() LIMIT ${limit}`
	const results = await session.readTransaction(txc => txc.run(query, { start_term, end_term, limit, ...vars }))
	return resolve_results({results, terms: [start_term, end_term], schema, order, score_fields,  aggr_scores, colors, start_field, end_field})
}

const resolve_term_and_end_type = async ({session, start_term, start_field, start, end, limit, order, path_length=4, schema, relation, aggr_scores, colors, remove, expand: e}) => {
	if (!parseInt(path_length)) throw {message: "Path length is not a number"}
	let query = `MATCH p=allShortestPaths((a: \`${start}\` {${start_field}: $start_term})-[*..${path_length}]-(b: \`${end}\`))
		USING INDEX a:\`${start}\`(${start_field})
	`		
	if (relation) {
		const edges = schema.edges.reduce((acc, i)=>([
			...acc,
			...i.match
		  ]), [])
		for (const i of relation.split(",")) {
			if (edges.indexOf(i) === -1) throw {message: `Invalid relationship ${i}`}
		}
		const rels = relation.split(",").map(i=>`\`${i}\``).join("|")
		query = query.replace(`[*..${path_length}]`,`[:${rels}*..${path_length}]`)
	} 
	const vars = {}
	if ((remove || []).length) {
		query = query + `
			WHERE NOT a.id in ${JSON.stringify(remove)}
			AND NOT b.id in ${JSON.stringify(remove)}
		`
	}
	query = query + `RETURN p, nodes(p) as n, relationships(p) as r LIMIT TOINTEGER($limit)`

	// remove has precedence on expand
	const expand = (e || []).filter(i=>(remove || []).indexOf(i) === -1)

	if ((expand || []).length) {
		for (const ind in expand) {
			vars[`expand_${ind}`] = expand[ind]
			query = query + `
				UNION
				MATCH p = (c)--(d)
				WHERE c.id = $expand_${ind}
				RETURN p, nodes(p) as n, relationships(p) as r
				LIMIT 10
			`   
		}
	}

	
	// if (score_fields.length) query = query + `, ${score_fields.join(", ")}`
	// query = `${query} RETURN * ORDER BY rand() LIMIT ${limit}`
	const results = await session.readTransaction(txc => txc.run(query, { start_term, limit, ...vars }))
	return resolve_results({results, terms: [start_term], schema, order, score_fields,  aggr_scores, colors, start_field})
}


const resolve_one_term = async ({session, start, field, term, relation, limit, order, path_length=1, schema, aggr_scores, colors, expand: e, remove}) => {
	if (!parseInt(path_length)) throw {message: "Path length is not a number"}
	let query = `
		MATCH p=(st:\`${start}\` { ${field}: $term })-[*${path_length}]-(en)
		USING INDEX st:\`${start}\`(${field})
		WITH p, st, en
		`
	if (relation) {
		const edges = schema.edges.reduce((acc, i)=>([
			...acc,
			...i.match
		  ]), [])
		for (const i of relation.split(",")) {
			if (edges.indexOf(i) === -1) throw {message: `Invalid relationship ${i}`}
		}
		const rels = relation.split(",").map(i=>`\`${i}\``).join("|")
		query = query.replace(`[*${path_length}]`,`[:${rels}*${path_length}]`)
	}
	const vars = {}
	if ((remove || []).length) {
		for (const ind in remove) {
			vars[`remove_${ind}`] = remove[ind]
			if (ind === "0") {
				query = query + `
					WHERE NOT st.id = $remove_${ind}
					AND NOT en.id = $remove_${ind}
				`
			}
			else {
				query = query + `
					AND NOT st.id = $remove_${ind}
					AND NOT en.id = $remove_${ind}
				`
			}
		}
	}
	query = query + `RETURN p, nodes(p) as n, relationships(p) as r LIMIT TOINTEGER($limit)`

	// remove has precedence on expand
	const expand = (e || []).filter(i=>(remove || []).indexOf(i) === -1)
	if ((expand || []).length) {
		for (const ind in expand) {
			vars[`expand_${ind}`] = expand[ind]
			query = query + `
				UNION
				MATCH p = (c)--(d)
				WHERE c.id = $expand_${ind}
				RETURN p, nodes(p) as n, relationships(p) as r
				LIMIT 10
			`   
		}
	}
	const results = await session.readTransaction(txc => txc.run(query, { term, limit, ...vars }))
	return resolve_results({results, terms: [term], schema, order, score_fields,  aggr_scores, colors, field})
}

export default async function query(req, res) {
  const { start, start_field="label", start_term, end, end_field="label", end_term, relation, limit=25, path_length, order, remove, expand } = await req.query
  const schema = await (await fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/knowledge_graph/schema`)).json()
  const {aggr_scores, colors} = await (await fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/knowledge_graph/aggregate`)).json()
  const nodes = schema.nodes.map(i=>i.node)
  if (nodes.indexOf(start) < 0) res.status(400).send("Invalid start node")
  else if (end && nodes.indexOf(end) < 0) res.status(400).send("Invalid end node")
  else { 
  	try {
		const session = neo4jDriver.session({
			defaultAccessMode: neo4j.session.READ
		})
		try {
			if (start && end && start_term && end_term) {
				const results = await resolve_two_terms({session, start_term, start_field, start, end_term, end_field, end, relation, limit, path_length, schema, order, aggr_scores, colors, remove: remove ?  JSON.parse(remove): [], expand: expand ? JSON.parse(expand) : []})
				fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/counter/update`)
				res.status(200).send(results)
			} else if (start && end && start_term ) {
				const results = await resolve_term_and_end_type({session, start_term, start_field, start, end, relation, limit, path_length, schema, order, aggr_scores, colors, remove: remove ?  JSON.parse(remove): [], expand: expand ? JSON.parse(expand) : []})
				fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/counter/update`)
				res.status(200).send(results)
			} else if (start) {
				const results = await resolve_one_term({session, start, field: start_field, term: start_term, relation, limit, path_length, schema, order, aggr_scores, colors, remove: remove ?  JSON.parse(remove): [], expand: expand ? JSON.parse(expand) : []})
				fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX}/api/counter/update`)
				res.status(200).send(results)
			} else {
				res.status(400).send("Invalid input")
			}
		  } catch (e) {
			console.log(e.message)
			res.status(400).send(e.message)
		  } finally {
			session.close()
		  }
		} catch (e) {
			res.status(400).send(e.message)
		}
	}
}
