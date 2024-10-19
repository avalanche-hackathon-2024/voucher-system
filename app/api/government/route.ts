import { NextRequest, NextResponse } from 'next/server';
import dbConnect from "@/lib/dbConnect";
import {Government} from "@/models";

export async function GET() {
  await dbConnect();
  const governmentEntities = await Government.find({});
  return NextResponse.json(governmentEntities);
}

export async function POST(request: NextRequest) {
  await dbConnect();
  const data = await request.json();
  const governmentEntity = new Government(data);
  await governmentEntity.save();
  return NextResponse.json(governmentEntity, { status: 201 });
}