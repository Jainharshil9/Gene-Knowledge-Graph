import cache from "memory-cache";
import { NextResponse } from "next/server";
import {initialize} from './helper'

export interface Initialize_Type {
    aggr_scores?: {[key:string]: {max: number, min: number}},
    colors?: {[key:string]: {color?: string, aggr_field?: string, field?: string, aggr_type?: string}},
    edges?: Array<string>
}

export async function GET() {
    const cached = cache.get("initialize")
    // const cached = false
    if (cached) {
        return NextResponse.json(cached, {status: 200})
    } else {
        try {
            const val = await initialize()
            cache.put("initialize", val);
            return NextResponse.json(val, {status: 200})
        } catch (error) {
            console.log(error)
            return NextResponse.error()
        }
    }
}

