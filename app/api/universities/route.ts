import { NextRequest, NextResponse } from 'next/server';
import dbConnect from "@/lib/dbConnect";
import {University} from "@/models";

export async function GET() {
  await dbConnect();
  const universities = await University.find({});
  return NextResponse.json(universities);
}

export async function POST(request: NextRequest) {
  await dbConnect();
  const data = await request.json();
  const university = new University(data);
  await university.save();
  return NextResponse.json(university, { status: 201 });
}