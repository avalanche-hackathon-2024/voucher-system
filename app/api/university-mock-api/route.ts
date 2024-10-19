import { NextRequest, NextResponse } from 'next/server';
import dbConnect from "@/lib/dbConnect";
import { Student } from "@/models";

export async function POST(request: NextRequest) {
    await dbConnect();

    const data = await request.json();
    const { studentId, averageGradeThreshold, assistancePercentageThreshold } = data;

    if (!studentId || typeof averageGradeThreshold !== 'number' || typeof assistancePercentageThreshold !== 'number') {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    try {
        const student = await Student.findOne({ id: studentId });

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const averageGradePassed = student.averageGrade >= averageGradeThreshold;
        const assistancePercentagePassed = student.assistancePercentage >= assistancePercentageThreshold;

        return NextResponse.json({
            averageGrade: {
                passed: averageGradePassed,
                actual: student.averageGrade
            },
            assistancePercentage: {
                passed: assistancePercentagePassed,
                actual: student.assistancePercentage
            }
        });
    } catch (error) {
        console.error('Error in university-mock-api:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}