import mongoose from 'mongoose';

// Counter Schema for auto-incrementing IDs
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

// Function to get the next sequence value
async function getNextSequence(name : string) {
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

// Create models
const Student = mongoose.model('Student', studentSchema);
const University = mongoose.model('University', universitySchema);
const Government = mongoose.model('Government', governmentSchema);
const Application = mongoose.model('Application', applicationSchema);

studentSchema.index({ id: 1 });
universitySchema.index({ id: 1 });
governmentSchema.index({ id: 1 });
applicationSchema.index({ id: 1 });

module.exports = {
    Student, University, Government, Application
};