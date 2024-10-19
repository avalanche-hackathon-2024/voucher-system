import { NextRequest, NextResponse } from 'next/server';
import dbConnect from "@/lib/dbConnect";
import {Student} from "@/models";

export async function GET() {
  await dbConnect();
  const students = await Student.find({});
  return NextResponse.json(students);
}

export async function POST(request: NextRequest) {
  await dbConnect();
  const data = await request.json();
  const student = new Student(data);
  await student.save();
  return NextResponse.json(student, { status: 201 });
}