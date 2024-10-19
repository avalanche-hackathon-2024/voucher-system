import { NextRequest, NextResponse } from 'next/server';
import dbConnect from "@/lib/dbConnect";
import {Application} from "@/models";

export async function GET() {
  await dbConnect();
  const applications = await Application.find({});
  return NextResponse.json(applications);
}

export async function POST(request: NextRequest) {
  await dbConnect();
  const data = await request.json();
  const application = new Application(data);
  await application.save();
  return NextResponse.json(application, { status: 201 });
}