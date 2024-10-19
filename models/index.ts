import mongoose from 'mongoose';

// Counter Schema for auto-incrementing IDs
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

// Use mongoose.models to check if the model already exists
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

// Function to get the next sequence value
async function getNextSequence(name: string) {
    const counter = await Counter.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
}

// Student Schema
const studentSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    idNumber: { type: String, required: true, unique: true },
    email: { type: String, unique: true },
    enrollmentStatus: { type: String, enum: ['active', 'inactive', 'graduated'], default: 'active' },
    walletAddress: { type: String, required: true, unique: true },
    voucherContractAddress: String,
    averageGrade: Number,
    assistancePercentage: Number,
});

studentSchema.pre('save', async function(next) {
    if (this.isNew) {
        this.id = await getNextSequence('student_id');
    }
    next();
});

// University Schema
const universitySchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    accreditationStatus: { type: Boolean, default: false },
    walletAddress: { type: String, required: true, unique: true },
    degrees: [{
        name: String,
        duration: Number, // in years
        totalCredits: Number
    }]
});

universitySchema.pre('save', async function(next) {
    if (this.isNew) {
        this.id = await getNextSequence('university_id');
    }
    next();
});

// Government Admin User Schema
const governmentSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    walletAddress: { type: String, required: true, unique: true },
    role: { type: String, default: 'admin' },
    whiteListedBlockchains: [String],
});

governmentSchema.pre('save', async function(next) {
    if (this.isNew) {
        this.id = await getNextSequence('government_id');
    }
    next();
});

// Student Application Schema
const applicationSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    studentId: { type: Number, ref: 'Student', required: true },
    universityId: { type: Number, ref: 'University', required: true },
    degreeAppliedFor: String,
    totalCreditsApplied: Number,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submissionDate: { type: Date, default: Date.now },
});

applicationSchema.pre('save', async function(next) {
    if (this.isNew) {
        this.id = await getNextSequence('application_id');
    }
    next();
});

studentSchema.index({ id: 1 });
universitySchema.index({ id: 1 });
governmentSchema.index({ id: 1 });
applicationSchema.index({ id: 1 });

// Create models
export const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
export const University = mongoose.models.University || mongoose.model('University', universitySchema);
export const Government = mongoose.models.Government || mongoose.model('Government', governmentSchema);
export const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema);